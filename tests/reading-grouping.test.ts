import { describe, expect, it } from 'vitest';

import { booksOnShelf, groupByShelf, type Book } from '../src/lib/reading';

// Covers specs/reading.spec.md Behavior rows 39-46 and the Boundaries rows
// "a shelf with zero books", "single book on a shelf" and "unordered input".

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
    // Behavior 39
    const xs = [book('a'), book('b', { shelf: 'fiction' }), book('c')];
    expect(ids(booksOnShelf(xs, 'technical'))).toEqual(['a', 'c']);
  });

  it('keeps only the fiction books for the same input', () => {
    // Behavior 40
    const xs = [book('a'), book('b', { shelf: 'fiction' }), book('c')];
    expect(ids(booksOnShelf(xs, 'fiction'))).toEqual(['b']);
  });

  it('returns an empty array when no book stands on the shelf', () => {
    // Behavior 41, Boundaries "a shelf with zero books"
    const xs = [book('a', { shelf: 'fiction' }), book('b', { shelf: 'fiction' })];
    expect(booksOnShelf(xs, 'technical')).toEqual([]);
  });

  it('returns a new array rather than the input array', () => {
    // Behavior 42
    const xs = [book('a')];
    expect(booksOnShelf(xs, 'technical')).not.toBe(xs);
  });

  it('leaves the input array unchanged', () => {
    // Behavior 42
    const only = book('a');
    const xs = [only];
    booksOnShelf(xs, 'technical');
    expect(xs).toHaveLength(1);
    expect(xs[0]).toBe(only);
  });

  it('returns the same book objects it was given', () => {
    // Behavior 39 - filter, not copy-of-book
    const target = book('a');
    const result = booksOnShelf([target, book('b', { shelf: 'fiction' })], 'technical');
    expect(result[0]).toBe(target);
  });
});

describe('groupByShelf', () => {
  it('returns no groups for an empty list', () => {
    // Behavior 43, Boundaries "empty READING_LIST" (the function half)
    expect(groupByShelf([])).toEqual([]);
  });

  it('omits a shelf that has no books', () => {
    // Behavior 44
    const groups = groupByShelf([book('a'), book('b')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.shelf).toBe('technical');
  });

  it('labels the group with SHELF_LABELS text', () => {
    // Behavior 44
    const groups = groupByShelf([book('a'), book('b')]);
    expect(groups[0]?.label).toBe('Technical');
  });

  it('puts the shelf books in the group in input order', () => {
    // Behavior 44
    const groups = groupByShelf([book('a'), book('b')]);
    expect(ids(groups[0]?.books ?? [])).toEqual(['a', 'b']);
  });

  it('emits groups in SHELVES order, not input order', () => {
    // Behavior 45
    const groups = groupByShelf([book('f', { shelf: 'fiction' }), book('t')]);
    expect(groups.map((g) => g.shelf)).toEqual(['technical', 'fiction']);
  });

  it('assigns each book to its own shelf group when both shelves are used', () => {
    // Behavior 45, Boundaries "single book on a shelf"
    const groups = groupByShelf([book('f', { shelf: 'fiction' }), book('t')]);
    expect(groups.map((g) => ids(g.books))).toEqual([['t'], ['f']]);
  });

  it('labels both groups from SHELF_LABELS', () => {
    // Behavior 45
    const groups = groupByShelf([book('f', { shelf: 'fiction' }), book('t')]);
    expect(groups.map((g) => g.label)).toEqual(['Technical', 'Fiction']);
  });

  it('never sorts the books within a shelf', () => {
    // Behavior 46, Boundaries "unordered input"
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
