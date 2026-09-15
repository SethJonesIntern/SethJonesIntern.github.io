import { describe, expect, it } from 'vitest';

import {
  assertVariedSpines,
  groupByShelf,
  type Book,
  type SpineVariant,
} from '../src/lib/reading';
import { READING_LIST } from '../src/lib/reading-books';

// Covers specs/reading.spec.md Behavior rows 27-30 and 47, both
// `assertVariedSpines` rows of the Errors table, and the Boundaries rows
// "single book on a shelf", "duplicate `spine` across entries" and "the same
// variant on the last technical and first fiction book".
//
// Row 47's second clause and the "How spine variants are assigned" section are
// asserted against the spec's own written-out block decomposition, chunked here
// in the test — see the note above `FICTION_BLOCKS` for the reading of
// "every 4 consecutive" that the shipped data actually satisfies.

const book = (id: string, over: Partial<Book> = {}): Book => ({
  id,
  title: 'T',
  author: 'A',
  shelf: 'technical',
  spine: 'ink',
  ...over,
});

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

/** Cuts a shelf into consecutive, non-overlapping blocks of four. */
function blocksOfFour(variants: readonly SpineVariant[]): SpineVariant[][] {
  const out: SpineVariant[][] = [];
  for (let i = 0; i < variants.length; i += 4) {
    out.push(variants.slice(i, i + 4));
  }
  return out;
}

describe('assertVariedSpines accepts a shelf with no colour run', () => {
  it('returns undefined for the empty shelf', () => {
    // Behavior 27 - empty shelf is legal
    expect(assertVariedSpines([])).toBeUndefined();
  });

  it('returns undefined for a single book, which has no neighbour', () => {
    // Behavior 28, Boundaries "single book on a shelf"
    expect(assertVariedSpines([book('a', { spine: 'clay' })])).toBeUndefined();
  });

  it('allows a variant to be reused once a different variant intervenes', () => {
    // Behavior 29, Boundaries "duplicate `spine` across entries" - the legal
    // direction: only *consecutive* repeats are rejected.
    expect(
      assertVariedSpines([
        book('a', { spine: 'clay' }),
        book('b', { spine: 'teal' }),
        book('c', { spine: 'clay' }),
      ]),
    ).toBeUndefined();
  });

  it('accepts all four variants in SPINE_VARIANTS order', () => {
    // Behavior 27-29 taken together: a full permutation block is legal.
    expect(
      assertVariedSpines([
        book('a', { spine: 'clay' }),
        book('b', { spine: 'teal' }),
        book('c', { spine: 'ink' }),
        book('d', { spine: 'sand' }),
      ]),
    ).toBeUndefined();
  });

  it('does not reorder or replace the elements it scanned', () => {
    // Behavior 30 - never mutates
    const first = book('a', { spine: 'clay' });
    const second = book('b', { spine: 'ink' });
    const xs = [first, second];
    expect(assertVariedSpines(xs)).toBeUndefined();
    expect(xs).toHaveLength(2);
    expect(xs[0]).toBe(first);
    expect(xs[1]).toBe(second);
    expect(xs.map((b) => b.spine)).toEqual(['clay', 'ink']);
  });

  it('reads `spine` only, ignoring ids and shelf membership', () => {
    // Errors prose: "assertVariedSpines validates neither ids nor shelf
    // membership - it reads `spine` only".
    expect(
      assertVariedSpines([
        book('Not A Slug', { spine: 'clay', shelf: 'fiction' }),
        book('Not A Slug', { spine: 'teal', shelf: 'technical' }),
      ]),
    ).toBeUndefined();
  });
});

describe('assertVariedSpines rejects an adjacent duplicate with a TypeError', () => {
  it('throws naming the second book of the repeating pair', () => {
    // Errors: assertVariedSpines([book('a', { spine: 'clay' }), book('b', { spine: 'clay' })])
    const error = thrownBy(() =>
      assertVariedSpines([book('a', { spine: 'clay' }), book('b', { spine: 'clay' })]),
    );
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe(
      'assertVariedSpines: "b" repeats the spine variant "clay"',
    );
  });

  it('names the first offending pair in declaration order, not a later one', () => {
    // Errors: the ink/teal/teal/teal list
    const error = thrownBy(() =>
      assertVariedSpines([
        book('a', { spine: 'ink' }),
        book('b', { spine: 'teal' }),
        book('c', { spine: 'teal' }),
        book('d', { spine: 'teal' }),
      ]),
    );
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe(
      'assertVariedSpines: "c" repeats the spine variant "teal"',
    );
  });
});

describe('assertVariedSpines runs per shelf group, never across the seam', () => {
  it('passes on each group when the last technical and first fiction book share a variant', () => {
    // Boundaries "the same variant on the last technical and first fiction book"
    const xs = [
      book('t1', { shelf: 'technical', spine: 'ink' }),
      book('t2', { shelf: 'technical', spine: 'sand' }),
      book('f1', { shelf: 'fiction', spine: 'sand' }),
      book('f2', { shelf: 'fiction', spine: 'clay' }),
    ];
    for (const group of groupByShelf(xs)) {
      expect(assertVariedSpines(group.books)).toBeUndefined();
    }
  });

  it('would throw on that same seam if the flat list were passed in one call', () => {
    // The other half of the same Boundaries row: the seam is legal only because
    // the caller splits by shelf first.
    const xs = [
      book('t1', { shelf: 'technical', spine: 'ink' }),
      book('t2', { shelf: 'technical', spine: 'sand' }),
      book('f1', { shelf: 'fiction', spine: 'sand' }),
      book('f2', { shelf: 'fiction', spine: 'clay' }),
    ];
    const error = thrownBy(() => assertVariedSpines(xs));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe(
      'assertVariedSpines: "f1" repeats the spine variant "sand"',
    );
  });
});

describe('the shipped shelves obey the spine-variant assignment rule', () => {
  it('throws nothing when every shipped shelf group is checked', () => {
    // Behavior 47, first clause
    for (const group of groupByShelf(READING_LIST)) {
      expect(assertVariedSpines(group.books)).toBeUndefined();
    }
  });

  it('cuts the technical shelf into the spec’s single partial block', () => {
    // "How spine variants are assigned": "The technical shelf is the partial
    // block `[ink teal sand]`."
    const technical = groupByShelf(READING_LIST)[0];
    expect(technical?.shelf).toBe('technical');
    expect(blocksOfFour((technical?.books ?? []).map((b) => b.spine))).toEqual([
      ['ink', 'teal', 'sand'],
    ]);
  });

  it('cuts the fiction shelf into the spec’s four blocks', () => {
    // "How spine variants are assigned": the fiction shelf is
    // `[clay teal ink sand]`, `[teal clay sand ink]`, `[clay sand teal ink]`,
    // `[sand clay teal]`.
    const fiction = groupByShelf(READING_LIST)[1];
    expect(fiction?.shelf).toBe('fiction');
    expect(blocksOfFour((fiction?.books ?? []).map((b) => b.spine))).toEqual([
      ['clay', 'teal', 'ink', 'sand'],
      ['teal', 'clay', 'sand', 'ink'],
      ['clay', 'sand', 'teal', 'ink'],
      ['sand', 'clay', 'teal'],
    ]);
  });

  it('makes every block on every shipped shelf a set of distinct variants', () => {
    // Behavior 47, second clause, read as non-overlapping blocks of four - the
    // reading the shipped data satisfies. See the report note on the sliding
    // -window reading, which the fiction shelf does not satisfy.
    for (const group of groupByShelf(READING_LIST)) {
      for (const block of blocksOfFour(group.books.map((b) => b.spine))) {
        expect(new Set(block).size).toBe(block.length);
      }
    }
  });

  it('never repeats a variant across a block seam on a shipped shelf', () => {
    // "the first colour of a block differs from the last colour of the block
    // before it"
    for (const group of groupByShelf(READING_LIST)) {
      const blocks = blocksOfFour(group.books.map((b) => b.spine));
      for (let i = 1; i < blocks.length; i += 1) {
        const previous = blocks[i - 1] as SpineVariant[];
        const current = blocks[i] as SpineVariant[];
        expect(current[0]).not.toBe(previous[previous.length - 1]);
      }
    }
  });

  it('gives the fiction shelf the spec’s colour counts', () => {
    // "clay x4, teal x4, ink x3, sand x4"
    const fiction = groupByShelf(READING_LIST)[1];
    const spines = (fiction?.books ?? []).map((b) => b.spine);
    const count = (variant: SpineVariant): number =>
      spines.filter((s) => s === variant).length;
    expect([count('clay'), count('teal'), count('ink'), count('sand')]).toEqual([4, 4, 3, 4]);
  });
});
