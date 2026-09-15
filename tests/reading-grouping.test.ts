import { describe, expect, it } from 'vitest';

import { booksOnShelf, groupByShelf, type Book } from '../src/lib/reading';

// Covers specs/reading.spec.md Behavior rows 31-38 and the Boundaries rows
// "a shelf with zero books", "empty READING_LIST" (the function half) and
// "unordered input".

const book = (id: string, over: Partial<Book> = {}): Book => ({
  id,
  title: 'T',
  author: 'A',
  shelf: 'technical',
  spine: 'ink',
  ...over,
});

const ids = (books: readonly Book[]): string[] => books.map((b) => b.id);

describe('booksOnShelf', () => {
  it('keeps only the technical books, in input order', () => {
    // Behavior 31
    const xs = [book('a'), book('b', { shelf: 'fiction' }), book('c')];
    expect(ids(booksOnShelf(xs, 'technical'))).toEqual(['a', 'c']);
  });

  it('keeps only the fiction books for the same input', () => {
    // Behavior 32
    const xs = [book('a'), book('b', { shelf: 'fiction' }), book('c')];
    expect(ids(booksOnShelf(xs, 'fiction'))).toEqual(['b']);
  });

  it('returns an empty array when no book stands on the shelf', () => {
    // Behavior 33, Boundaries "a shelf with zero books"
    const xs = [book('a', { shelf: 'fiction' }), book('b', { shelf: 'fiction' })];
    expect(booksOnShelf(xs, 'technical')).toEqual([]);
  });

  it('returns a new array rather than the input array', () => {
    // Behavior 34
    const xs = [book('a')];
    expect(booksOnShelf(xs, 'technical')).not.toBe(xs);
  });

  it('leaves the input array unchanged', () => {
    // Behavior 34
    const only = book('a');
    const xs = [only];
    booksOnShelf(xs, 'technical');
    expect(xs).toHaveLength(1);
    expect(xs[0]).toBe(only);
  });

  it('returns the same book objects it was given', () => {
    // Behavior 31 - a filter, not a copy of each book
    const target = book('a');
    const result = booksOnShelf([target, book('b', { shelf: 'fiction' })], 'technical');
    expect(result[0]).toBe(target);
  });
});

describe('groupByShelf', () => {
  it('returns no groups for an empty list', () => {
    // Behavior 35, Boundaries "empty READING_LIST" (the function half; the page
    // state is unreachable and the spec says not to test it)
    expect(groupByShelf([])).toEqual([]);
  });

  it('omits a shelf that has no books', () => {
    // Behavior 36
    const groups = groupByShelf([book('a'), book('b')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.shelf).toBe('technical');
  });

  it('labels the group with SHELF_LABELS text', () => {
    // Behavior 36
    const groups = groupByShelf([book('a'), book('b')]);
    expect(groups[0]?.label).toBe('Technical');
  });

  it('puts the shelf books in the group in input order', () => {
    // Behavior 36
    const groups = groupByShelf([book('a'), book('b')]);
    expect(ids(groups[0]?.books ?? [])).toEqual(['a', 'b']);
  });

  it('emits groups in SHELVES order, not input order', () => {
    // Behavior 37
    const groups = groupByShelf([book('f', { shelf: 'fiction' }), book('t')]);
    expect(groups.map((g) => g.shelf)).toEqual(['technical', 'fiction']);
  });

  it('assigns each book to its own shelf group when both shelves are used', () => {
    // Behavior 37
    const groups = groupByShelf([book('f', { shelf: 'fiction' }), book('t')]);
    expect(groups.map((g) => ids(g.books))).toEqual([['t'], ['f']]);
  });

  it('labels both groups from SHELF_LABELS', () => {
    // Behavior 37
    const groups = groupByShelf([book('f', { shelf: 'fiction' }), book('t')]);
    expect(groups.map((g) => g.label)).toEqual(['Technical', 'Fiction']);
  });

  it('never sorts the books within a shelf', () => {
    // Behavior 38, Boundaries "unordered input"
    const groups = groupByShelf([book('a'), book('c'), book('b')]);
    expect(ids(groups[0]?.books ?? [])).toEqual(['a', 'c', 'b']);
  });

  it('leaves the input array unchanged', () => {
    // Invariant 4 - groupByShelf never mutates its argument
    const a = book('a');
    const f = book('f', { shelf: 'fiction' });
    const xs = [a, f];
    groupByShelf(xs);
    expect(xs).toHaveLength(2);
    expect(xs[0]).toBe(a);
    expect(xs[1]).toBe(f);
  });
});
