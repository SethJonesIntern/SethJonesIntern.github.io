import { describe, expect, it } from 'vitest';

import { publishedPosts, tagCounts } from '../src/lib/posts';

// Covers Behavior rows 36 and 37, and the Boundaries rows "no posts at all"
// (the publishedPosts half) and "every post a draft" (the composition
// tagCounts(publishedPosts(xs)) -> []).

type DraftFlagged = { id: string; draft?: boolean };

describe('publishedPosts', () => {
  it('removes only the posts whose draft is exactly true', () => {
    // Behavior #36: absent draft counts as published
    const xs: DraftFlagged[] = [{ id: 'a', draft: false }, { id: 'b', draft: true }, { id: 'c' }];
    expect(publishedPosts(xs).map((post) => post.id)).toEqual(['a', 'c']);
  });

  it('returns an empty array when every post is a draft', () => {
    // Behavior #37
    expect(publishedPosts([{ draft: true }, { draft: true }])).toEqual([]);
  });

  it('returns a new empty array when there are no posts at all', () => {
    // Boundaries: no posts at all
    const xs: DraftFlagged[] = [];
    const published = publishedPosts(xs);
    expect(published).toEqual([]);
    expect(published).not.toBe(xs);
  });

  it('preserves the relative order of the published posts', () => {
    // Public API: "Relative order preserved"
    const xs: DraftFlagged[] = [
      { id: 'c' },
      { id: 'b', draft: true },
      { id: 'a' },
      { id: 'd', draft: false },
    ];
    expect(publishedPosts(xs).map((post) => post.id)).toEqual(['c', 'a', 'd']);
  });

  it('returns the very same object references it kept', () => {
    // Public API: a filter, not a copy of each entry
    // Annotated so the fixture satisfies the all-optional constraint
    // T extends { readonly draft?: boolean } (TypeScript weak-type check).
    const kept: DraftFlagged = { id: 'a' };
    const dropped: DraftFlagged = { id: 'b', draft: true };
    const published = publishedPosts([kept, dropped]);
    expect(published).toHaveLength(1);
    expect(published[0]).toBe(kept);
  });

  it('yields no tags at all when every post is a draft', () => {
    // Boundaries: every post a draft -> tagCounts(publishedPosts(xs)) -> []
    const xs = [
      { id: 'a', tags: ['AI'], draft: true },
      { id: 'b', tags: ['Testing'], draft: true },
    ];
    expect(tagCounts(publishedPosts(xs))).toEqual([]);
  });
});
