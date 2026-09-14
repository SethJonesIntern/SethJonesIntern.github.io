import { describe, expect, it } from 'vitest';

import { sortPostsByDate } from '../src/lib/posts';

// Covers Behavior rows 34 and 35, and the Boundaries rows "no posts at all"
// (the sortPostsByDate half), "single post", "all-equal sort keys" (stability),
// "unordered input array" (the sortPostsByDate half) and "date that fails to
// parse" (sorts last, per the Date handling paragraph and Behavior #32).

type Post = { id: string; title: string; date: string };

describe('sortPostsByDate', () => {
  it('orders posts newest first', () => {
    // Behavior #34
    const sorted = sortPostsByDate([
      { id: 'a', title: 'A', date: '2025-01-01' },
      { id: 'b', title: 'B', date: '2026-09-14' },
      { id: 'c', title: 'C', date: '2026-01-02' },
    ]);
    expect(sorted.map((post) => post.id)).toEqual(['b', 'c', 'a']);
  });

  it('returns a new array and leaves the input array order unchanged', () => {
    // Behavior #35
    const xs: Post[] = [
      { id: 'a', title: 'A', date: '2025-01-01' },
      { id: 'b', title: 'B', date: '2026-09-14' },
      { id: 'c', title: 'C', date: '2026-01-02' },
    ];
    const sorted = sortPostsByDate(xs);
    expect(sorted).not.toBe(xs);
    expect(xs.map((post) => post.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns a new empty array when there are no posts at all', () => {
    // Boundaries: no posts at all
    const xs: Post[] = [];
    const sorted = sortPostsByDate(xs);
    expect(sorted).toEqual([]);
    expect(sorted).not.toBe(xs);
  });

  it('returns a one-element array holding the same object for a single post', () => {
    // Boundaries: single post
    const only = {
      id: 'building-a-spec-harness',
      title: 'Building a Spec Harness for This Site',
      date: '2026-09-14',
    };
    const sorted = sortPostsByDate([only]);
    expect(sorted).toHaveLength(1);
    expect(sorted[0]).toBe(only);
  });

  it('keeps input order for posts whose sort keys are all equal', () => {
    // Boundaries: all-equal sort keys (Array.prototype.sort is stable)
    const first = { id: 'x', title: 'S', date: '2026-09-14', marker: 'first' };
    const second = { id: 'x', title: 'S', date: '2026-09-14', marker: 'second' };
    const third = { id: 'x', title: 'S', date: '2026-09-14', marker: 'third' };
    const sorted = sortPostsByDate([first, second, third]);
    expect(sorted.map((post) => post.marker)).toEqual(['first', 'second', 'third']);
  });

  it('produces the same order for every permutation of distinct sort keys', () => {
    // Boundaries: unordered input array
    const a = { id: 'a', title: 'A', date: '2025-01-01' };
    const b = { id: 'b', title: 'B', date: '2026-09-14' };
    const c = { id: 'c', title: 'C', date: '2026-01-02' };
    const permutations = [
      [a, b, c],
      [a, c, b],
      [b, a, c],
      [b, c, a],
      [c, a, b],
      [c, b, a],
    ];
    for (const permutation of permutations) {
      expect(sortPostsByDate(permutation).map((post) => post.id)).toEqual(['b', 'c', 'a']);
    }
  });

  it('places a post with an unparseable date last', () => {
    // Boundaries: date that fails to parse (Date handling: "Unparseable dates
    // sort last regardless of direction"); consistent with Behavior #32.
    const sorted = sortPostsByDate([
      { id: 'bad', title: 'A', date: 'nope' },
      { id: 'old', title: 'B', date: '2025-01-01' },
      { id: 'new', title: 'C', date: '2026-09-14' },
    ]);
    expect(sorted.map((post) => post.id)).toEqual(['new', 'old', 'bad']);
  });

  it('preserves extra properties on the sorted posts', () => {
    // Public API: "Extra properties allowed and preserved" (PostSortInput)
    const sorted = sortPostsByDate([
      { id: 'a', title: 'A', date: '2026-09-14', description: 'D' },
    ]);
    expect(sorted[0].description).toBe('D');
  });
});
