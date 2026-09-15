import { describe, expect, it } from 'vitest';

import { spineLabel, type Book } from '../src/lib/reading';

// Covers specs/reading.spec.md Behavior rows 30-34, the `spineLabel` row of the
// Errors table, and the Boundaries rows "empty string `title` or `author`"
// (the function half only - the render is marked undefined) and
// "`volumes: undefined` vs omitted".

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

describe('spineLabel', () => {
  it('returns the title verbatim when the book has no volumes', () => {
    // Behavior 30 - ampersand untouched
    expect(spineLabel(book('x', { title: 'Fire & Blood' }))).toBe('Fire & Blood');
  });

  it('appends a comma, a space and the plural volume range', () => {
    // Behavior 31
    expect(spineLabel(book('x', { title: 'Harry Potter', volumes: [1, 7] }))).toBe(
      'Harry Potter, Books 1–7',
    );
  });

  it('appends a two-volume range', () => {
    // Behavior 32
    expect(spineLabel(book('x', { title: 'A Song of Ice and Fire', volumes: [1, 2] }))).toBe(
      'A Song of Ice and Fire, Books 1–2',
    );
  });

  it('appends a singular volume for a one-volume range', () => {
    // Behavior 33
    expect(spineLabel(book('x', { title: 'X', volumes: [4, 4] }))).toBe('X, Book 4');
  });

  it('leaves a non-ASCII title untouched', () => {
    // Behavior 34, Boundaries "unicode in title / author"
    expect(spineLabel(book('x', { title: 'Ω 😀' }))).toBe('Ω 😀');
  });

  it('returns the empty string for an empty title with no volumes', () => {
    // Boundaries "empty string `title` or `author`"
    expect(spineLabel(book('x', { title: '' }))).toBe('');
  });

  it('treats an explicit volumes: undefined exactly like an omitted volumes', () => {
    // Boundaries "`volumes: undefined` vs omitted"
    const omitted: Book = {
      id: 'x',
      title: 'Fire & Blood',
      author: 'A',
      shelf: 'technical',
      spine: 'ink',
    };
    const explicit: Book = {
      id: 'x',
      title: 'Fire & Blood',
      author: 'A',
      shelf: 'technical',
      spine: 'ink',
      volumes: undefined,
    };
    expect(spineLabel(explicit)).toBe('Fire & Blood');
    expect(spineLabel(omitted)).toBe('Fire & Blood');
  });

  it('propagates the formatVolumes TypeError unchanged for a reversed range', () => {
    // Errors: spineLabel(book('x', { volumes: [2, 1] })) - neither caught nor rewrapped
    const error = thrownBy(() => spineLabel(book('x', { volumes: [2, 1] })));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('formatVolumes: invalid volume range [2, 1]');
  });
});
