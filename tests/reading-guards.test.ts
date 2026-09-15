import { describe, expect, it } from 'vitest';

import { isBookId, isShelf, isSpineVariant } from '../src/lib/reading';

// Covers specs/reading.spec.md Behavior rows 1-9 and 11-14, and the Boundaries
// rows "empty string id" (the guard half), "unicode in ids" and
// "null / undefined to the three guards".

describe('isBookId', () => {
  it('accepts a hyphenated kebab-case id', () => {
    // Behavior 1
    expect(isBookId('the-last-olympian')).toBe(true);
  });

  it('accepts a single alphanumeric run', () => {
    // Behavior 2
    expect(isBookId('fire')).toBe(true);
  });

  it('accepts an id whose first run is digits', () => {
    // Behavior 3
    expect(isBookId('9-lives')).toBe(true);
  });

  it('rejects an uppercase id rather than lowercasing it', () => {
    // Behavior 4
    expect(isBookId('The-Last-Olympian')).toBe(false);
  });

  it('rejects an id containing a space', () => {
    // Behavior 5
    expect(isBookId('two words')).toBe(false);
  });

  it('rejects a trailing hyphen', () => {
    // Behavior 5
    expect(isBookId('trailing-')).toBe(false);
  });

  it('rejects a leading hyphen', () => {
    // Behavior 5
    expect(isBookId('-leading')).toBe(false);
  });

  it('rejects a doubled hyphen', () => {
    // Behavior 5
    expect(isBookId('double--hyphen')).toBe(false);
  });

  it('rejects the empty string', () => {
    // Behavior 5, Boundaries "empty string id"
    expect(isBookId('')).toBe(false);
  });

  it('rejects a padded id rather than trimming it', () => {
    // Behavior 6
    expect(isBookId(' fire ')).toBe(false);
  });

  it('rejects an underscore separator', () => {
    // Behavior 7
    expect(isBookId('fire_blood')).toBe(false);
  });

  it('rejects a dot separator', () => {
    // Behavior 7
    expect(isBookId('fire.blood')).toBe(false);
  });

  it('rejects a slash separator', () => {
    // Behavior 7
    expect(isBookId('fire/blood')).toBe(false);
  });

  it('rejects a curly apostrophe rather than encoding it', () => {
    // Behavior 7, Boundaries "unicode in ids": the apostrophe in
    // `The Titan’s Curse` is dropped to form `the-titans-curse`, never encoded.
    expect(isBookId('titan’s-curse')).toBe(false);
  });

  it('rejects a latin letter with a diaeresis', () => {
    // Behavior 8, Boundaries "unicode in ids"
    expect(isBookId('kästner')).toBe(false);
  });

  it('rejects a CJK character', () => {
    // Behavior 8
    expect(isBookId('书')).toBe(false);
  });

  it('rejects an emoji', () => {
    // Behavior 8
    expect(isBookId('fire-😀')).toBe(false);
  });

  it('is false for null', () => {
    // Behavior 9
    expect(isBookId(null)).toBe(false);
  });

  it('is false for undefined', () => {
    // Behavior 9
    expect(isBookId(undefined)).toBe(false);
  });

  it('is false for a number', () => {
    // Behavior 9
    expect(isBookId(42)).toBe(false);
  });

  it('is false for a plain object', () => {
    // Behavior 9
    expect(isBookId({})).toBe(false);
  });

  it('is false for an array holding a valid id', () => {
    // Behavior 9 - no coercion to string
    expect(isBookId(['fire'])).toBe(false);
  });
});

describe('isShelf', () => {
  it('accepts the technical shelf', () => {
    // Behavior 11
    expect(isShelf('technical')).toBe(true);
  });

  it('accepts the fiction shelf', () => {
    // Behavior 11
    expect(isShelf('fiction')).toBe(true);
  });

  it('rejects a shelf name outside SHELVES', () => {
    // Behavior 12
    expect(isShelf('poetry')).toBe(false);
  });

  it('rejects a capitalised shelf name', () => {
    // Behavior 12
    expect(isShelf('Technical')).toBe(false);
  });

  it('rejects the empty string', () => {
    // Behavior 12
    expect(isShelf('')).toBe(false);
  });

  it('is false for null', () => {
    // Behavior 12
    expect(isShelf(null)).toBe(false);
  });

  it('is false for the number zero', () => {
    // Behavior 12
    expect(isShelf(0)).toBe(false);
  });
});

describe('isSpineVariant', () => {
  it('accepts clay', () => {
    // Behavior 13
    expect(isSpineVariant('clay')).toBe(true);
  });

  it('accepts teal', () => {
    // Behavior 13
    expect(isSpineVariant('teal')).toBe(true);
  });

  it('accepts ink', () => {
    // Behavior 13
    expect(isSpineVariant('ink')).toBe(true);
  });

  it('accepts sand', () => {
    // Behavior 13
    expect(isSpineVariant('sand')).toBe(true);
  });

  it('rejects a variant outside SPINE_VARIANTS', () => {
    // Behavior 14
    expect(isSpineVariant('gold')).toBe(false);
  });

  it('rejects a capitalised variant name', () => {
    // Behavior 14
    expect(isSpineVariant('Clay')).toBe(false);
  });

  it('is false for null', () => {
    // Behavior 14
    expect(isSpineVariant(null)).toBe(false);
  });

  it('is false for undefined', () => {
    // Behavior 14
    expect(isSpineVariant(undefined)).toBe(false);
  });
});
