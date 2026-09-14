import { describe, expect, it } from 'vitest';

import { projectSchema } from '../src/lib/projects-schema';

// Covers Behavior rows 20-23, every schema row of the Errors table, and the
// Boundaries rows "missing optional repo", "repo: ''", "unicode in titles",
// "negative / zero order", "very large order", "order: NaN", and
// "summary of exactly 300 characters".

type ParseResult = ReturnType<typeof projectSchema.safeParse>;

/** Frontmatter object from Behavior row 21 — the minimal valid entry. */
function baseFrontmatter(): Record<string, unknown> {
  return {
    title: 'T',
    role: 'R',
    stack: ['S'],
    status: 'completed',
    summary: 'S',
    order: 1,
  };
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

// Frontmatter literals transcribed from spec section "Content (exact literals)".
const SHIPPED_FRONTMATTER: Record<string, Record<string, unknown>> = {
  'sentinel-grid-honeynet': {
    title: 'Sentinel Grid Honeynet',
    role: 'Backend engineer and technical lead',
    stack: ['Python'],
    status: 'completed',
    summary:
      'A honeynet whose Python backend I built and whose technical direction I led — logging APIs that record what an attacker does once they are inside.',
    order: 1,
  },
  'tsat-2a': {
    title: 'TSAT 2A',
    role: 'Software engineering team lead',
    stack: ['C++', 'ESP32'],
    status: 'completed',
    summary:
      'The embedded C++ for the UCF Knights Satellite Club’s T-SAT 2A payload, designed end to end as software team lead.',
    order: 2,
  },
  'typeracer-web-game': {
    title: 'TypeRacer Web Game',
    role: 'Backend developer',
    stack: ['MongoDB', 'Express', 'React', 'Node.js', 'Socket.IO'],
    status: 'completed',
    summary:
      'A 1v1 real-time typing game built at KnightHacks 8 — live lobbies, matchmaking, and performance tracking over Socket.IO.',
    order: 3,
  },
};

describe('projectSchema accepts valid frontmatter', () => {
  it.each(Object.keys(SHIPPED_FRONTMATTER))('accepts the shipped %s frontmatter', (stem) => {
    // Behavior #20
    expect(projectSchema.safeParse(SHIPPED_FRONTMATTER[stem]).success).toBe(true);
  });

  it('accepts an entry with no repo key and leaves repo undefined', () => {
    // Behavior #21 / Boundaries: missing optional repo
    const result = projectSchema.safeParse(baseFrontmatter());
    expect(result.success).toBe(true);
    expect(dataOf(result).repo).toBe(undefined);
  });

  it('accepts and preserves an https repo URL', () => {
    // Behavior #22
    const result = projectSchema.safeParse({
      ...baseFrontmatter(),
      repo: 'https://github.com/example/repo',
    });
    expect(result.success).toBe(true);
    expect(dataOf(result).repo).toBe('https://github.com/example/repo');
  });

  it('accepts an http repo URL', () => {
    // Public API: refine permits http:// as well as https://
    const result = projectSchema.safeParse({
      ...baseFrontmatter(),
      repo: 'http://example.com/repo',
    });
    expect(result.success).toBe(true);
    expect(dataOf(result).repo).toBe('http://example.com/repo');
  });

  it('accepts a non-ASCII title unchanged', () => {
    // Boundaries: unicode in titles
    const result = projectSchema.safeParse({ ...baseFrontmatter(), title: 'Grid — Ω 😀' });
    expect(result.success).toBe(true);
    expect(dataOf(result).title).toBe('Grid — Ω 😀');
  });

  it('accepts a summary of exactly 300 characters', () => {
    // Boundaries: summary of exactly 300 characters
    const result = projectSchema.safeParse({ ...baseFrontmatter(), summary: 'a'.repeat(300) });
    expect(result.success).toBe(true);
  });

  it('accepts Number.MAX_SAFE_INTEGER as order', () => {
    // Boundaries: very large order
    const result = projectSchema.safeParse({
      ...baseFrontmatter(),
      order: Number.MAX_SAFE_INTEGER,
    });
    expect(result.success).toBe(true);
    expect(dataOf(result).order).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('projectSchema rejects missing required fields', () => {
  it.each([['title'], ['role'], ['stack'], ['status'], ['summary'], ['order']])(
    'rejects frontmatter missing %s and reports that field path',
    (key) => {
      // Errors: missing title (likewise role, stack, status, summary, order)
      const result = projectSchema.safeParse(withoutKey(key));
      expect(result.success).toBe(false);
      expect(firstIssue(result).path).toEqual([key]);
    },
  );
});

describe('projectSchema rejects empty strings', () => {
  it('rejects an empty title', () => {
    // Errors: title: ''
    const result = projectSchema.safeParse({ ...baseFrontmatter(), title: '' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['title']);
  });

  it('rejects an empty role', () => {
    // Errors: role: ''
    const result = projectSchema.safeParse({ ...baseFrontmatter(), role: '' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['role']);
  });

  it('rejects an empty summary', () => {
    // Errors: summary: ''
    const result = projectSchema.safeParse({ ...baseFrontmatter(), summary: '' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['summary']);
  });
});

describe('projectSchema validates stack', () => {
  it('rejects an empty stack array', () => {
    // Errors: stack: []
    const result = projectSchema.safeParse({ ...baseFrontmatter(), stack: [] });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['stack']);
  });

  it('rejects a stack given as a bare string', () => {
    // Errors: stack: 'Python'
    const result = projectSchema.safeParse({ ...baseFrontmatter(), stack: 'Python' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['stack']);
  });

  it('rejects an empty stack entry and reports its index', () => {
    // Errors: stack: ['Python','']
    const result = projectSchema.safeParse({ ...baseFrontmatter(), stack: ['Python', ''] });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['stack', 1]);
  });
});

describe('projectSchema validates status', () => {
  it('rejects a status outside the enum', () => {
    // Errors / Behavior #23: status: 'shipped'
    const result = projectSchema.safeParse({ ...baseFrontmatter(), status: 'shipped' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['status']);
  });
});

describe('projectSchema validates order', () => {
  it('rejects order 0', () => {
    // Errors / Boundaries: zero order
    const result = projectSchema.safeParse({ ...baseFrontmatter(), order: 0 });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['order']);
  });

  it('rejects a negative order', () => {
    // Errors / Boundaries: negative order
    const result = projectSchema.safeParse({ ...baseFrontmatter(), order: -1 });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['order']);
  });

  it('rejects a fractional order', () => {
    // Errors: order: 1.5
    const result = projectSchema.safeParse({ ...baseFrontmatter(), order: 1.5 });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['order']);
  });

  it('rejects a numeric string order', () => {
    // Errors: order: '1'
    const result = projectSchema.safeParse({ ...baseFrontmatter(), order: '1' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['order']);
  });

  it('rejects NaN as order', () => {
    // Boundaries: order: NaN
    const result = projectSchema.safeParse({ ...baseFrontmatter(), order: Number.NaN });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['order']);
  });
});

describe('projectSchema validates summary length', () => {
  it('rejects a summary of 301 characters', () => {
    // Errors: summary of 301 characters
    const result = projectSchema.safeParse({ ...baseFrontmatter(), summary: 'a'.repeat(301) });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['summary']);
  });
});

describe('projectSchema validates repo', () => {
  it('rejects a repo that is not a URL', () => {
    // Errors: repo: 'not-a-url'
    const result = projectSchema.safeParse({ ...baseFrontmatter(), repo: 'not-a-url' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['repo']);
  });

  it('rejects a non-http(s) repo URL with the contracted message', () => {
    // Errors: repo: 'ftp://example.com/x'
    const result = projectSchema.safeParse({ ...baseFrontmatter(), repo: 'ftp://example.com/x' });
    expect(result.success).toBe(false);
    const issue = firstIssue(result);
    expect(issue.path).toEqual(['repo']);
    expect(issue.message).toBe('repo must be an http(s) URL');
  });

  it('rejects a null repo because optional does not mean nullable', () => {
    // Errors: repo: null
    const result = projectSchema.safeParse({ ...baseFrontmatter(), repo: null });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['repo']);
  });

  it('rejects an empty repo string', () => {
    // Boundaries: repo: ''
    const result = projectSchema.safeParse({ ...baseFrontmatter(), repo: '' });
    expect(result.success).toBe(false);
    expect(firstIssue(result).path).toEqual(['repo']);
  });
});

describe('projectSchema is strict about unknown keys', () => {
  it('rejects an unrecognised frontmatter key', () => {
    // Errors: unknown key, e.g. featured: true
    const result = projectSchema.safeParse({ ...baseFrontmatter(), featured: true });
    expect(result.success).toBe(false);
    expect(firstIssue(result).code).toBe('unrecognized_keys');
  });
});

// Not covered here (see Non-goals): "any invalid frontmatter in src/content/projects/*.md
// makes npm run build exit non-zero". That needs an Astro build, which this suite must not run.
