import { describe, expect, it } from 'vitest';

import {
  groupByShelf,
  isBookId,
  isShelf,
  isSpineVariant,
  spineLabel,
} from '../src/lib/reading';
import { READING_LIST } from '../src/lib/reading-books';

// Covers specs/reading.spec.md Behavior rows 47-52, the Boundaries row
// "duplicate `title`, `author`, or `spine` across entries", and the literal
// `shelf`/`spine`/`volumes` values of the Public API's "exact contents as
// shipped" block for src/lib/reading-books.ts.

describe('READING_LIST is the shipped shelf', () => {
  it('has seven entries', () => {
    // Behavior 47
    expect(READING_LIST).toHaveLength(7);
  });

  it('carries the seven ids in declaration order', () => {
    // Behavior 47
    expect(READING_LIST.map((b) => b.id)).toEqual([
      'mythical-man-month',
      'machine-learning-in-production',
      'operating-systems-three-easy-pieces',
      'harry-potter',
      'fire-and-blood',
      'a-song-of-ice-and-fire',
      'percy-jackson-and-the-olympians',
    ]);
  });

  it('carries the seven titles verbatim, ampersand and diaeresis included', () => {
    // Behavior 48
    expect(READING_LIST.map((b) => b.title)).toEqual([
      'The Mythical Man-Month',
      'Machine Learning in Production: From Models to Products',
      'Operating Systems: Three Easy Pieces',
      'Harry Potter',
      'Fire & Blood',
      'A Song of Ice and Fire',
      'Percy Jackson and the Olympians',
    ]);
  });

  it('carries the seven authors, repeating one author across two entries', () => {
    // Behavior 49, Boundaries "duplicate title, author, or spine across entries"
    expect(READING_LIST.map((b) => b.author)).toEqual([
      'Frederick P. Brooks Jr.',
      'Christian Kästner',
      'Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau',
      'J. K. Rowling',
      'George R. R. Martin',
      'George R. R. Martin',
      'Rick Riordan',
    ]);
  });

  it('places three books on technical then four on fiction', () => {
    // Public API: exact contents as shipped
    expect(READING_LIST.map((b) => b.shelf)).toEqual([
      'technical',
      'technical',
      'technical',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
    ]);
  });

  it('binds the seven spines in the declared variant order', () => {
    // Public API: exact contents as shipped (the data behind review row 66)
    expect(READING_LIST.map((b) => b.spine)).toEqual([
      'ink',
      'teal',
      'sand',
      'clay',
      'ink',
      'teal',
      'sand',
    ]);
  });

  it('gives a volume range only to the three multi-volume series', () => {
    // Public API: exact contents as shipped
    expect(READING_LIST.map((b) => b.volumes ?? null)).toEqual([
      null,
      null,
      null,
      [1, 7],
      null,
      [1, 2],
      [1, 5],
    ]);
  });
});

describe('READING_LIST is self-consistent', () => {
  it('gives every entry an id that passes isBookId', () => {
    // Behavior 50
    for (const b of READING_LIST) {
      expect(isBookId(b.id)).toBe(true);
    }
  });

  it('gives every entry a shelf that passes isShelf', () => {
    // Behavior 50
    for (const b of READING_LIST) {
      expect(isShelf(b.shelf)).toBe(true);
    }
  });

  it('gives every entry a spine that passes isSpineVariant', () => {
    // Behavior 50
    for (const b of READING_LIST) {
      expect(isSpineVariant(b.spine)).toBe(true);
    }
  });

  it('gives every entry a non-blank title', () => {
    // Behavior 50
    for (const b of READING_LIST) {
      expect(b.title.trim()).not.toBe('');
    }
  });

  it('gives every entry a non-blank author', () => {
    // Behavior 50
    for (const b of READING_LIST) {
      expect(b.author.trim()).not.toBe('');
    }
  });
});

describe('the shipped shelf grouped and labelled', () => {
  it('groups into technical then fiction', () => {
    // Behavior 51
    const groups = groupByShelf(READING_LIST);
    expect(groups.map((g) => [g.shelf, g.label])).toEqual([
      ['technical', 'Technical'],
      ['fiction', 'Fiction'],
    ]);
  });

  it('puts three books on technical and four on fiction', () => {
    // Behavior 51
    const groups = groupByShelf(READING_LIST);
    expect(groups.map((g) => g.books.length)).toEqual([3, 4]);
  });

  it('prints the seven spine labels', () => {
    // Behavior 52
    expect(READING_LIST.map((b) => spineLabel(b))).toEqual([
      'The Mythical Man-Month',
      'Machine Learning in Production: From Models to Products',
      'Operating Systems: Three Easy Pieces',
      'Harry Potter, Books 1–7',
      'Fire & Blood',
      'A Song of Ice and Fire, Books 1–2',
      'Percy Jackson and the Olympians, Books 1–5',
    ]);
  });
});
