import { describe, expect, it } from 'vitest';

import { comparePosts } from '../src/lib/posts';

// Covers Behavior rows 27-33, the Public API contract "String comparison is
// codepoint-wise ... results must not depend on the host locale", and the
// comparePosts halves of the Boundaries rows "single post", "all-equal sort
// keys" and "date that fails to parse".

describe('comparePosts', () => {
  it('orders the newer date first', () => {
    // Behavior #27
    expect(
      comparePosts(
        { id: 'a', title: 'A', date: '2026-09-14' },
        { id: 'b', title: 'B', date: '2026-01-01' },
      ),
    ).toBe(-1);
  });

  it('is antisymmetric for differing dates', () => {
    // Behavior #28: row 27's arguments swapped
    expect(
      comparePosts(
        { id: 'b', title: 'B', date: '2026-01-01' },
        { id: 'a', title: 'A', date: '2026-09-14' },
      ),
    ).toBe(1);
  });

  it('breaks a date tie on title and ignores id while titles differ', () => {
    // Behavior #29
    expect(
      comparePosts(
        { id: 'z', title: 'Alpha', date: '2026-09-14' },
        { id: 'a', title: 'Beta', date: '2026-09-14' },
      ),
    ).toBe(-1);
  });

  it('breaks a date and title tie on id', () => {
    // Behavior #30
    expect(
      comparePosts(
        { id: 'a', title: 'S', date: '2026-09-14' },
        { id: 'b', title: 'S', date: '2026-09-14' },
      ),
    ).toBe(-1);
  });

  it('returns 0 when date, title and id are all equal', () => {
    // Behavior #31 / Boundaries: all-equal sort keys
    expect(
      comparePosts(
        { id: 'a', title: 'S', date: '2026-09-14' },
        { id: 'a', title: 'S', date: '2026-09-14' },
      ),
    ).toBe(0);
  });

  it('sorts an unparseable date after a parseable one', () => {
    // Behavior #32
    expect(
      comparePosts(
        { id: 'a', title: 'A', date: 'nope' },
        { id: 'b', title: 'B', date: '2026-01-01' },
      ),
    ).toBe(1);
  });

  it('falls through to title when both dates are unparseable', () => {
    // Behavior #33
    expect(
      comparePosts(
        { id: 'a', title: 'A', date: 'nope' },
        { id: 'b', title: 'B', date: 'also-nope' },
      ),
    ).toBe(-1);
  });

  it('returns 0 when handed the very same object twice', () => {
    // Boundaries: single post -> comparePosts(p, p) === 0
    const only = { id: 'building-a-spec-harness', title: 'Building a Spec Harness for This Site', date: '2026-09-14' };
    expect(comparePosts(only, only)).toBe(0);
  });

  it('compares titles by codepoint rather than case-insensitively', () => {
    // Public API: codepoint-wise comparison, no localeCompare.
    // 'Z' (U+005A) < 'a' (U+0061).
    expect(
      comparePosts(
        { id: 'a', title: 'Zebra', date: '2026-09-14' },
        { id: 'b', title: 'apple', date: '2026-09-14' },
      ),
    ).toBe(-1);
  });

  it('compares non-ASCII titles by codepoint without locale collation', () => {
    // Public API: codepoint-wise comparison.
    // 'É' (U+00C9) > 'Z' (U+005A).
    expect(
      comparePosts(
        { id: 'a', title: 'Éclair', date: '2026-09-14' },
        { id: 'b', title: 'Zebra', date: '2026-09-14' },
      ),
    ).toBe(1);
  });

  it('compares ids by codepoint once date and title tie', () => {
    // Public API: codepoint-wise comparison.
    // 'Z' (U+005A) < 'a' (U+0061).
    expect(
      comparePosts(
        { id: 'Z', title: 'S', date: '2026-09-14' },
        { id: 'a', title: 'S', date: '2026-09-14' },
      ),
    ).toBe(-1);
  });
});
