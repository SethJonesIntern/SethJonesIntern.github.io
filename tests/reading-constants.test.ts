import { describe, expect, it } from 'vitest';

import { BOOK_ID_PATTERN, SHELF_LABELS, SHELVES, SPINE_VARIANTS } from '../src/lib/reading';

// Covers specs/reading.spec.md Behavior rows 10 and 15-17, plus the Public API
// statement that BOOK_ID_PATTERN carries no `g`/`y` flag.

describe('SHELVES', () => {
  it('lists the two shelves in render order', () => {
    // Behavior 15
    expect(SHELVES).toEqual(['technical', 'fiction']);
  });

  it('has exactly two entries', () => {
    // Behavior 15
    expect(SHELVES).toHaveLength(2);
  });
});

describe('SPINE_VARIANTS', () => {
  it('lists the four spine variants in declaration order', () => {
    // Behavior 16
    expect(SPINE_VARIANTS).toEqual(['clay', 'teal', 'ink', 'sand']);
  });

  it('has exactly four entries', () => {
    // Behavior 16
    expect(SPINE_VARIANTS).toHaveLength(4);
  });
});

describe('SHELF_LABELS', () => {
  it('maps each shelf key to its heading text', () => {
    // Behavior 17
    expect(SHELF_LABELS).toEqual({ technical: 'Technical', fiction: 'Fiction' });
  });
});

describe('BOOK_ID_PATTERN', () => {
  it('is the kebab-case pattern the spec declares', () => {
    // Public API: BOOK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    expect(BOOK_ID_PATTERN.source).toBe('^[a-z0-9]+(?:-[a-z0-9]+)*$');
  });

  it('carries no flags, so .test() is stateless', () => {
    // Public API: "No `g` flag" / no `y` flag either
    expect(BOOK_ID_PATTERN.flags).toBe('');
  });

  it('answers true on three consecutive tests of the same id', () => {
    // Behavior 10
    expect(BOOK_ID_PATTERN.test('fire')).toBe(true);
    expect(BOOK_ID_PATTERN.test('fire')).toBe(true);
    expect(BOOK_ID_PATTERN.test('fire')).toBe(true);
  });

  it('keeps lastIndex at zero after a match', () => {
    // Behavior 10 - the statelessness that makes the row hold
    BOOK_ID_PATTERN.test('fire');
    expect(BOOK_ID_PATTERN.lastIndex).toBe(0);
  });
});
