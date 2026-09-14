import { describe, expect, it } from 'vitest';

import { postSchema } from '../src/lib/posts-schema';

// Covers Behavior rows 50-52, every schema row of the Errors table, and the
// Boundaries rows "post with no tags" (tags: [] parses), "date that fails to
// parse" (the safeParse half) and "description of exactly 300 characters".
//
// Not covered (Errors row / Non-goals): "invalid frontmatter in
// src/content/blog/*.md -> npm run build exits non-zero". Needs an Astro build.

type ParseResult = ReturnType<typeof postSchema.safeParse>;

/** Frontmatter object from Behavior row 51, the minimal valid entry. */
function baseFrontmatter(): Record<string, unknown> {
  return { title: 'T', date: '2026-09-14', description: 'D' };
}

function withoutKey(key: string): Record<string, unknown> {
  const object = baseFrontmatter();
  delete object[key];
  return object;
}

function dataOf(result: ParseResult) {
  if (!result.success) {
    throw new Error(`expected validation to succeed but it failed: ${JSON.stringify(result.error.issues)}`);
  }
  return result.data;
}

function firstIssue(result: ParseResult) {
  if (result.success) {
    throw new Error('expected validation to fail but it succeeded');
  }
  return result.error.issues[0];
}

// Frontmatter transcribed from spec section "Content (exact literal)".
const SHIPPED_FRONTMATTER = {
  title: 'Building a Spec Harness for This Site',
  date: '2026-09-14',
  description:
    'Why every feature on this site starts as a written spec, and what changed once the specs came before the code.',
  tags: ['Testing', 'Process', 'Astro'],
};

describe('postSchema accepts valid frontmatter', () => {
  it('accepts the shipped post frontmatter with its tags and a false draft', () => {
    // Behavior #50
    const result = postSchema.safeParse(SHIPPED_FRONTMATTER);
    expect(result.success).toBe(true);
    const data = dataOf(result);
    expect(data.tags).toEqual(['Testing', 'Process', 'Astro']);
    expect(data.draft).toBe(false);
  });

  it('defaults tags to an empty array and draft to false', () => {
    // Behavior #51 / Boundaries: post with no tags
    const result = postSchema.safeParse(baseFrontmatter());
    expect(result.success).toBe(true);
    const data = dataOf(result);
    expect(data.tags).toEqual([]);
    expect(data.draft).toBe(false);
  });

  it('keeps an explicit draft: true', () => {
    // Behavior #52
    const result = postSchema.safeParse({
      ...baseFrontmatter(),
      tags: ['a'],
      draft: true,
    });
    expect(dataOf(result).draft).toBe(true);
  });

  it('accepts a description of exactly 300 characters', () => {
    // Boundaries / Errors: "300 accepted"
    const result = postSchema.safeParse({ ...baseFrontmatter(), description: 'a'.repeat(300) });
    expect(result.success).toBe(true);
  });
});

describe('postSchema rejects missing required fields', () => {
  it.each([['title'], ['date'], ['description']])(
    'rejects frontmatter missing %s and reports that field path',
    (key) => {
      // Errors: missing title / date / description
      const result = postSchema.safeParse(withoutKey(key));
      expect(result.success).toBe(false);
      expect(firstIssue(result).path).toEqual([key]);
    },
  );
});

describe('postSchema rejects empty strings', () => {
  it('rejects an empty title', () => {
    // Errors: title: ''
    const result = postSchema.safeParse({ ...baseFrontmatter(), title: '' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['title']);
  });

  it('rejects an empty description', () => {
    // Errors: description: ''
    const result = postSchema.safeParse({ ...baseFrontmatter(), description: '' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['description']);
  });
});

describe('postSchema validates description length', () => {
  it('rejects a description of 301 characters', () => {
    // Errors / Boundaries: description of 301 characters
    const result = postSchema.safeParse({ ...baseFrontmatter(), description: 'a'.repeat(301) });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['description']);
  });
});

describe('postSchema validates date', () => {
  it.each([
    ['a single-digit month', '2026-9-14'],
    ['a slash-separated date', '14/09/2026'],
  ])('rejects %s with the contracted format message', (_label, date) => {
    // Errors: date: '2026-9-14' or '14/09/2026'
    const result = postSchema.safeParse({ ...baseFrontmatter(), date });
    expect(result.success).toBe(false);
    const issue = firstIssue(result);
    expect(issue.path).toEqual(['date']);
    expect(issue.message).toBe('date must be a quoted YYYY-MM-DD string');
  });

  it('rejects a well-formed but impossible date with the contracted calendar message', () => {
    // Errors: date: '2026-02-30' (regex passes, refine fails)
    // Boundaries: date that fails to parse -> the schema rejects it
    const result = postSchema.safeParse({ ...baseFrontmatter(), date: '2026-02-30' });
    expect(result.success).toBe(false);
    const issue = firstIssue(result);
    expect(issue.path).toEqual(['date']);
    expect(issue.message).toBe('date must be a real calendar date');
  });

  it('rejects a Date object because frontmatter dates must be quoted strings', () => {
    // Errors: date: new Date('2026-09-14')
    const result = postSchema.safeParse({ ...baseFrontmatter(), date: new Date('2026-09-14') });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['date']);
  });
});

describe('postSchema validates tags', () => {
  it('rejects tags given as a bare string', () => {
    // Errors: tags: 'ai'
    const result = postSchema.safeParse({ ...baseFrontmatter(), tags: 'ai' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['tags']);
  });

  it('rejects an empty tag entry and reports its index', () => {
    // Errors: tags: ['ai','']
    const result = postSchema.safeParse({ ...baseFrontmatter(), tags: ['ai', ''] });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['tags', 1]);
  });

  it('rejects null tags because defaulted does not mean nullable', () => {
    // Errors: tags: null
    const result = postSchema.safeParse({ ...baseFrontmatter(), tags: null });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['tags']);
  });
});

describe('postSchema validates draft', () => {
  it('rejects null draft because defaulted does not mean nullable', () => {
    // Errors: draft: null
    const result = postSchema.safeParse({ ...baseFrontmatter(), draft: null });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['draft']);
  });

  it('rejects the string true as draft', () => {
    // Errors: draft: 'true'
    const result = postSchema.safeParse({ ...baseFrontmatter(), draft: 'true' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['draft']);
  });
});

describe('postSchema is strict about unknown keys', () => {
  it('rejects an unrecognised frontmatter key', () => {
    // Errors: unknown key, e.g. author: 'Seth'
    const result = postSchema.safeParse({ ...baseFrontmatter(), author: 'Seth' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).code).toBe('unrecognized_keys');
  });
});
