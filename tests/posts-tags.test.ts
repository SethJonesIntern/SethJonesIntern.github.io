import { describe, expect, it } from 'vitest';

import { postsWithTag, tagCounts } from '../src/lib/posts';

// Covers Behavior rows 38-46, and the Boundaries rows "no posts at all"
// (tagCounts and postsWithTag halves), "post with no tags", "duplicate tags on
// one post", "tags differing only by case" (both input orders), "empty
// slugify result" (the drop-the-tag half) and "unordered input array" (the
// tagCounts half).

type Tagged = { id: string; tags: string[] };

describe('tagCounts', () => {
  it('groups case variants, counts per post and orders by count descending', () => {
    // Behavior #38 / Boundaries: tags differing only by case
    expect(tagCounts([{ tags: ['AI', 'Testing'] }, { tags: ['ai'] }])).toEqual([
      { slug: 'ai', label: 'AI', count: 2 },
      { slug: 'testing', label: 'Testing', count: 1 },
    ]);
  });

  it('chooses the same label and order when the input is reversed', () => {
    // Behavior #39 / Boundaries: tags differing only by case, other input order
    expect(tagCounts([{ tags: ['ai'] }, { tags: ['AI', 'Testing'] }])).toEqual([
      { slug: 'ai', label: 'AI', count: 2 },
      { slug: 'testing', label: 'Testing', count: 1 },
    ]);
  });

  it('counts duplicate tags within one post only once', () => {
    // Behavior #40 / Boundaries: duplicate tags on one post
    expect(tagCounts([{ tags: ['AI', 'ai', '  AI  '] }])).toEqual([
      { slug: 'ai', label: 'AI', count: 1 },
    ]);
  });

  it('breaks a count tie on slug ascending', () => {
    // Behavior #41
    expect(tagCounts([{ tags: ['b'] }, { tags: ['a'] }])).toEqual([
      { slug: 'a', label: 'a', count: 1 },
      { slug: 'b', label: 'b', count: 1 },
    ]);
  });

  it('drops posts without tags and tags that slugify to the empty string', () => {
    // Behavior #42 / Boundaries: empty slugify result (no 'post' fallback)
    expect(tagCounts([{ tags: [] }, { tags: ['🚀'] }])).toEqual([]);
  });

  it('returns an empty array when there are no posts at all', () => {
    // Behavior #43 / Boundaries: no posts at all
    expect(tagCounts([])).toEqual([]);
  });

  it('ignores a tagless post alongside a tagged one', () => {
    // Boundaries: post with no tags contributes nothing to tagCounts
    expect(tagCounts([{ tags: ['AI'] }, { tags: [] }])).toEqual([
      { slug: 'ai', label: 'AI', count: 1 },
    ]);
  });

  it('returns the same summaries for every permutation of the input', () => {
    // Boundaries: unordered input array. Expected values follow the
    // Behavior #38/#41 rules: 'AI' < 'ai' and 'Testing' < 'testing' by
    // codepoint; ai and testing tie on count 2 so slug ascending decides.
    const p = { tags: ['AI', 'Testing'] };
    const q = { tags: ['ai'] };
    const r = { tags: ['testing', 'Astro'] };
    const permutations = [
      [p, q, r],
      [p, r, q],
      [q, p, r],
      [q, r, p],
      [r, p, q],
      [r, q, p],
    ];
    for (const permutation of permutations) {
      expect(tagCounts(permutation)).toEqual([
        { slug: 'ai', label: 'AI', count: 2 },
        { slug: 'testing', label: 'Testing', count: 2 },
        { slug: 'astro', label: 'Astro', count: 1 },
      ]);
    }
  });
});

describe('postsWithTag', () => {
  it('matches a tag case-insensitively through its slug', () => {
    // Behavior #44
    const a = { id: 'a', tags: ['AI'] };
    const b = { id: 'b', tags: ['Testing'] };
    const matched = postsWithTag([a, b], 'ai');
    expect(matched).toHaveLength(1);
    expect(matched[0]).toBe(a);
  });

  it('slugifies the argument so a slug matches its multi-word label', () => {
    // Behavior #45
    const a = { id: 'a', tags: ['Spec Harness'] };
    const matched = postsWithTag([a], 'spec-harness');
    expect(matched).toHaveLength(1);
    expect(matched[0]).toBe(a);
  });

  it('returns nothing for a post without tags', () => {
    // Behavior #46 / Boundaries: post with no tags matches no tag page
    const xs: Tagged[] = [{ id: 'a', tags: [] }];
    expect(postsWithTag(xs, 'ai')).toEqual([]);
  });

  it('returns an empty array when there are no posts at all', () => {
    // Behavior #46 / Boundaries: no posts at all -> postsWithTag([], 'x')
    const xs: Tagged[] = [];
    expect(postsWithTag(xs, 'ai')).toEqual([]);
    expect(postsWithTag(xs, 'x')).toEqual([]);
  });

  it('matches nothing for a tag argument that slugifies to the empty string', () => {
    // Behavior #46 / Boundaries: empty slugify result -> tag dropped
    expect(postsWithTag([{ id: 'a', tags: ['AI'] }], '🚀')).toEqual([]);
  });

  it('preserves the relative order of matching posts', () => {
    // Public API: "Relative order preserved"
    const xs: Tagged[] = [
      { id: 'c', tags: ['AI'] },
      { id: 'b', tags: ['Testing'] },
      { id: 'a', tags: ['ai'] },
    ];
    expect(postsWithTag(xs, 'AI').map((post) => post.id)).toEqual(['c', 'a']);
  });
});
