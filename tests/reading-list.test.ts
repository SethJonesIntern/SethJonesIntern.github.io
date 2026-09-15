import { describe, expect, it } from 'vitest';

import { groupByShelf, isBookId, isShelf, isSpineVariant } from '../src/lib/reading';
import { READING_LIST } from '../src/lib/reading-books';

// Covers specs/reading.spec.md Behavior rows 39-46, the Public API's "exact
// contents as shipped" block for src/lib/reading-books.ts, and the Boundaries
// rows "duplicate `title` or `author` across entries" and "unicode in
// `title` / `author`" (the data half).
//
// Behavior 47 and the spine-assignment block rule live in
// tests/reading-varied-spines.test.ts.

describe('READING_LIST is the shipped shelf', () => {
  it('has eighteen entries', () => {
    // Behavior 39
    expect(READING_LIST).toHaveLength(18);
  });

  it('carries the eighteen ids in declaration order', () => {
    // Behavior 40 - these ids are permanent (Invariant 6)
    expect(READING_LIST.map((b) => b.id)).toEqual([
      'mythical-man-month',
      'machine-learning-in-production',
      'operating-systems-three-easy-pieces',
      'harry-potter-sorcerers-stone',
      'harry-potter-chamber-of-secrets',
      'harry-potter-prisoner-of-azkaban',
      'harry-potter-goblet-of-fire',
      'harry-potter-order-of-the-phoenix',
      'harry-potter-half-blood-prince',
      'harry-potter-deathly-hallows',
      'a-game-of-thrones',
      'a-clash-of-kings',
      'fire-and-blood',
      'the-lightning-thief',
      'the-sea-of-monsters',
      'the-titans-curse',
      'the-battle-of-the-labyrinth',
      'the-last-olympian',
    ]);
  });

  it('carries the eighteen titles verbatim, ampersand and diaeresis included', () => {
    // Behavior 41, Boundaries "unicode in `title` / `author`"
    expect(READING_LIST.map((b) => b.title)).toEqual([
      'The Mythical Man-Month',
      'Machine Learning in Production: From Models to Products',
      'Operating Systems: Three Easy Pieces',
      'Harry Potter and the Sorcerer’s Stone',
      'Harry Potter and the Chamber of Secrets',
      'Harry Potter and the Prisoner of Azkaban',
      'Harry Potter and the Goblet of Fire',
      'Harry Potter and the Order of the Phoenix',
      'Harry Potter and the Half-Blood Prince',
      'Harry Potter and the Deathly Hallows',
      'A Game of Thrones',
      'A Clash of Kings',
      'Fire & Blood',
      'The Lightning Thief',
      'The Sea of Monsters',
      'The Titan’s Curse',
      'The Battle of the Labyrinth',
      'The Last Olympian',
    ]);
  });

  it('spells the Sorcerer’s Stone apostrophe as U+2019, not U+0027', () => {
    // Behavior 42
    expect(READING_LIST[3]?.title).toBe('Harry Potter and the Sorcerer’s Stone');
    expect(READING_LIST[3]?.title).toContain('’');
    expect(READING_LIST[3]?.title).not.toContain("'");
  });

  it('spells the Titan’s Curse apostrophe as U+2019, not U+0027', () => {
    // Behavior 42
    expect(READING_LIST[15]?.title).toBe('The Titan’s Curse');
    expect(READING_LIST[15]?.title).toContain('’');
    expect(READING_LIST[15]?.title).not.toContain("'");
  });

  it('carries the eighteen authors, repeating authors across entries', () => {
    // Behavior 43, Boundaries "duplicate `title` or `author` across entries"
    expect(READING_LIST.map((b) => b.author)).toEqual([
      'Frederick P. Brooks Jr.',
      'Christian Kästner',
      'Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau',
      'J. K. Rowling',
      'J. K. Rowling',
      'J. K. Rowling',
      'J. K. Rowling',
      'J. K. Rowling',
      'J. K. Rowling',
      'J. K. Rowling',
      'George R. R. Martin',
      'George R. R. Martin',
      'George R. R. Martin',
      'Rick Riordan',
      'Rick Riordan',
      'Rick Riordan',
      'Rick Riordan',
      'Rick Riordan',
    ]);
  });

  it('places three books on technical then fifteen on fiction', () => {
    // Public API: "Eighteen entries: three on `technical`, fifteen on
    // `fiction`, in exactly this order."
    expect(READING_LIST.map((b) => b.shelf)).toEqual([
      'technical',
      'technical',
      'technical',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
      'fiction',
    ]);
  });

  it('binds the eighteen spines in the assignment rule’s order', () => {
    // Behavior 44
    expect(READING_LIST.map((b) => b.spine)).toEqual([
      'ink',
      'teal',
      'sand',
      'clay',
      'teal',
      'ink',
      'sand',
      'teal',
      'clay',
      'sand',
      'ink',
      'clay',
      'sand',
      'teal',
      'ink',
      'sand',
      'clay',
      'teal',
    ]);
  });
});

describe('READING_LIST is self-consistent', () => {
  it('gives every entry an id that passes isBookId', () => {
    // Behavior 45
    for (const b of READING_LIST) {
      expect(isBookId(b.id)).toBe(true);
    }
  });

  it('gives every entry a shelf that passes isShelf', () => {
    // Behavior 45
    for (const b of READING_LIST) {
      expect(isShelf(b.shelf)).toBe(true);
    }
  });

  it('gives every entry a spine that passes isSpineVariant', () => {
    // Behavior 45
    for (const b of READING_LIST) {
      expect(isSpineVariant(b.spine)).toBe(true);
    }
  });

  it('gives every entry a non-blank title', () => {
    // Behavior 45
    for (const b of READING_LIST) {
      expect(b.title.trim()).not.toBe('');
    }
  });

  it('gives every entry a non-blank author', () => {
    // Behavior 45
    for (const b of READING_LIST) {
      expect(b.author.trim()).not.toBe('');
    }
  });
});

describe('the shipped shelf grouped and labelled', () => {
  it('groups into technical then fiction', () => {
    // Behavior 46
    const groups = groupByShelf(READING_LIST);
    expect(groups.map((g) => [g.shelf, g.label])).toEqual([
      ['technical', 'Technical'],
      ['fiction', 'Fiction'],
    ]);
  });

  it('puts three books on technical and fifteen on fiction', () => {
    // Behavior 46
    const groups = groupByShelf(READING_LIST);
    expect(groups.map((g) => g.books.length)).toEqual([3, 15]);
  });
});
