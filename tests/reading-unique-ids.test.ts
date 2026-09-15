import { describe, expect, it } from 'vitest';

import { assertUniqueBookIds, type Book } from '../src/lib/reading';
import { READING_LIST } from '../src/lib/reading-books';

// Covers specs/reading.spec.md Behavior rows 23-26, both `assertUniqueBookIds`
// rows of the Errors table, and the Boundaries rows "duplicate ids" and
// "max - list length".

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

describe('assertUniqueBookIds accepts a clean list', () => {
  it('returns undefined for the empty list', () => {
    // Behavior 23
    expect(assertUniqueBookIds([])).toBeUndefined();
  });

  it('returns undefined for three distinct ids', () => {
    // Behavior 24
    expect(assertUniqueBookIds([book('a'), book('b'), book('c')])).toBeUndefined();
  });

  it('returns undefined for the shipped READING_LIST', () => {
    // Behavior 25 - all 18 ids distinct
    expect(assertUniqueBookIds(READING_LIST)).toBeUndefined();
  });

  it('returns undefined for 500 distinct ids, since list length is uncapped', () => {
    // Boundaries "max - list length"
    const many: Book[] = [];
    for (let i = 0; i < 500; i += 1) many.push(book(`book-${i}`));
    expect(assertUniqueBookIds(many)).toBeUndefined();
  });

  it('does not reorder or replace the elements it scanned', () => {
    // Behavior 26 - never sorts or mutates
    const first = book('b');
    const second = book('a');
    const xs = [first, second];
    assertUniqueBookIds(xs);
    expect(xs.map((b) => b.id)).toEqual(['b', 'a']);
    expect(xs[0]).toBe(first);
    expect(xs[1]).toBe(second);
    expect(xs).toHaveLength(2);
  });

  it('does not validate id syntax, only uniqueness', () => {
    // Errors prose: "assertUniqueBookIds does not validate id syntax"
    expect(assertUniqueBookIds([book('Not A Slug'), book('')])).toBeUndefined();
  });
});

describe('assertUniqueBookIds rejects a repeated id with a TypeError', () => {
  it('throws naming the repeated id', () => {
    // Errors: assertUniqueBookIds([book('fire'), book('fire')]),
    // Boundaries "duplicate ids"
    const error = thrownBy(() => assertUniqueBookIds([book('fire'), book('fire')]));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('assertUniqueBookIds: duplicate book id "fire"');
  });

  it('names the first repeat in declaration order, not the last', () => {
    // Errors: assertUniqueBookIds([book('a'), book('b'), book('a'), book('b')])
    const error = thrownBy(() =>
      assertUniqueBookIds([book('a'), book('b'), book('a'), book('b')]),
    );
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('assertUniqueBookIds: duplicate book id "a"');
  });
});
