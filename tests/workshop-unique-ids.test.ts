import { describe, expect, it } from 'vitest';

import {
  assertUniqueExhibitIds,
  type Exhibit,
  type ExhibitComponent,
} from '../src/lib/workshop';

// Covers specs/workshop.spec.md Behavior rows 19-22, the two
// `assertUniqueExhibitIds` rows of the Errors table, and the Boundaries rows
// "empty registry", "single entry", "max - registry size", "duplicate ids",
// "duplicate title or blurb across entries" and "unordered input".
//
// Boundaries rows deliberately not encoded anywhere in this suite:
//   "zero / negative / numeric inputs"                  - spec: undefined, do not test.
//   "unicode in title / blurb"                          - spec: type-level only, do not test.
//   "null / undefined / non-array to assertUniqueExhibitIds"
//                                                       - spec: undefined, do not test.
//   "noindex passed explicitly as false"                - review-only, and lives in
//                                                         BaseLayout.astro, which the test
//                                                         contract forbids importing.
//   "a page passing both noindex and width='wide'"      - spec: undefined, do not test.
// The page-render halves of "empty registry" and "single entry" are likewise
// review-only: no exhibit ships, so the list branch is unexercised.

const stub: ExhibitComponent = () => null;

const exhibit = (id: string): Exhibit => ({ id, title: 'T', blurb: 'B', component: stub });

/**
 * Runs `fn` and hands back whatever it threw. Fails the test if `fn` returns
 * normally. Captures only: it computes no expected value.
 */
function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to throw, but it returned normally');
}

describe('assertUniqueExhibitIds accepts distinct ids', () => {
  it('accepts the empty registry', () => {
    // Behavior 19, and the Boundaries row "empty registry".
    expect(() => assertUniqueExhibitIds([])).not.toThrow();
    expect(assertUniqueExhibitIds([])).toBeUndefined();
  });

  it('accepts a single entry', () => {
    // Behavior 20, and the Boundaries row "single entry".
    expect(assertUniqueExhibitIds([exhibit('a')])).toBeUndefined();
  });

  it('accepts three distinct ids', () => {
    // Behavior 21
    expect(assertUniqueExhibitIds([exhibit('a'), exhibit('b'), exhibit('c')])).toBeUndefined();
  });

  it('accepts 500 distinct ids, since registry size is uncapped', () => {
    // Boundaries: "max - registry size".
    const many = Array.from({ length: 500 }, (_, index) => exhibit(`exhibit-${index}`));
    expect(assertUniqueExhibitIds(many)).toBeUndefined();
  });

  it('accepts entries that share a title and a blurb but not an id', () => {
    // Boundaries: "duplicate title or blurb across entries" is legal, unchecked.
    const entries: readonly Exhibit[] = [
      { id: 'a', title: 'Same Title', blurb: 'Same blurb.', component: stub },
      { id: 'b', title: 'Same Title', blurb: 'Same blurb.', component: stub },
    ];
    expect(assertUniqueExhibitIds(entries)).toBeUndefined();
  });

  it('accepts ids whose syntax is invalid, because it checks uniqueness only', () => {
    // Errors table note: "assertUniqueExhibitIds does not validate id syntax -
    // only uniqueness. Syntax is enforced by exhibitAnchorId during render."
    expect(assertUniqueExhibitIds([exhibit('Clock'), exhibit('two words')])).toBeUndefined();
  });
});

describe('assertUniqueExhibitIds rejects repeated ids', () => {
  it('throws a TypeError naming the repeated id', () => {
    const error = thrownBy(() => assertUniqueExhibitIds([exhibit('clock'), exhibit('clock')]));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('assertUniqueExhibitIds: duplicate exhibit id "clock"');
  });

  it('names the first repeat in declaration order, not the last', () => {
    const error = thrownBy(() =>
      assertUniqueExhibitIds([exhibit('a'), exhibit('b'), exhibit('a'), exhibit('b')]),
    );
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('assertUniqueExhibitIds: duplicate exhibit id "a"');
  });
});

describe('assertUniqueExhibitIds leaves its argument alone', () => {
  it('does not reorder the entries', () => {
    // Behavior 22, and the Boundaries row "unordered input".
    const xs = [exhibit('b'), exhibit('a')];
    assertUniqueExhibitIds(xs);
    expect(xs.map((entry) => entry.id)).toEqual(['b', 'a']);
  });

  it('keeps the same element references', () => {
    // Behavior 22
    const first = exhibit('b');
    const second = exhibit('a');
    const xs = [first, second];
    assertUniqueExhibitIds(xs);
    expect(xs).toHaveLength(2);
    expect(xs[0]).toBe(first);
    expect(xs[1]).toBe(second);
  });
});
