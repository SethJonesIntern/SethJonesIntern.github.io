import { describe, expect, it } from 'vitest';

import {
  bookAnchorId,
  shelfHeadingId,
  spineClass,
  type Shelf,
  type SpineVariant,
} from '../src/lib/reading';

// Covers specs/reading.spec.md Behavior rows 18-22, every `bookAnchorId`,
// `shelfHeadingId` and `spineClass` row of the Errors table, and the Boundaries
// rows "empty string id" (the throwing half), "max - id length" and
// "null / undefined to bookAnchorId, shelfHeadingId, spineClass".
//
// The Errors table spells the bad-union cases `'poetry' as Shelf` and
// `'gold' as SpineVariant`. A single `as` between disjoint string-literal types
// is a TS2352 error under `astro/tsconfigs/strict`, so these tests widen through
// `unknown` first. The runtime value passed is exactly the spec's.

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

describe('bookAnchorId', () => {
  it('prefixes a hyphenated id', () => {
    // Behavior 18
    expect(bookAnchorId('the-last-olympian')).toBe('book-the-last-olympian');
  });

  it('prefixes a five-run id without collapsing its hyphens', () => {
    // Behavior 19
    expect(bookAnchorId('harry-potter-goblet-of-fire')).toBe('book-harry-potter-goblet-of-fire');
  });

  it('prefixes a 200-character id, since id length is uncapped', () => {
    // Behavior 20, Boundaries "max - id length"
    expect(bookAnchorId('a'.repeat(200))).toBe(`book-${'a'.repeat(200)}`);
  });

  it('throws a TypeError on the empty string', () => {
    // Errors: bookAnchorId('')
    const error = thrownBy(() => bookAnchorId(''));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('bookAnchorId: invalid book id ""');
  });

  it('throws a TypeError on an uppercase id', () => {
    // Errors: bookAnchorId('The-Last-Olympian')
    const error = thrownBy(() => bookAnchorId('The-Last-Olympian'));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('bookAnchorId: invalid book id "The-Last-Olympian"');
  });

  it('throws a TypeError on a padded id rather than trimming it', () => {
    // Errors: bookAnchorId(' fire ')
    const error = thrownBy(() => bookAnchorId(' fire '));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('bookAnchorId: invalid book id " fire "');
  });

  it('throws a TypeError on a doubled hyphen', () => {
    // Errors: bookAnchorId('double--hyphen')
    const error = thrownBy(() => bookAnchorId('double--hyphen'));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('bookAnchorId: invalid book id "double--hyphen"');
  });

  it('throws a TypeError on null, interpolating the value via String()', () => {
    // Errors: bookAnchorId(null as unknown as string)
    const error = thrownBy(() => bookAnchorId(null as unknown as string));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('bookAnchorId: invalid book id "null"');
  });

  it('throws a TypeError on undefined, interpolating the value via String()', () => {
    // Errors: bookAnchorId(undefined as unknown as string)
    const error = thrownBy(() => bookAnchorId(undefined as unknown as string));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('bookAnchorId: invalid book id "undefined"');
  });
});

describe('shelfHeadingId', () => {
  it('prefixes the technical shelf key', () => {
    // Behavior 21
    expect(shelfHeadingId('technical')).toBe('shelf-technical');
  });

  it('prefixes the fiction shelf key', () => {
    // Behavior 21
    expect(shelfHeadingId('fiction')).toBe('shelf-fiction');
  });

  it('throws a TypeError on a shelf key outside SHELVES', () => {
    // Errors: shelfHeadingId('poetry' as Shelf)
    const error = thrownBy(() => shelfHeadingId('poetry' as unknown as Shelf));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('shelfHeadingId: unknown shelf "poetry"');
  });

  it('throws a TypeError on null, interpolating the value via String()', () => {
    // Errors: shelfHeadingId(null as unknown as Shelf)
    const error = thrownBy(() => shelfHeadingId(null as unknown as Shelf));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('shelfHeadingId: unknown shelf "null"');
  });
});

describe('spineClass', () => {
  it('builds the clay modifier class', () => {
    // Behavior 22
    expect(spineClass('clay')).toBe('shelf__book--clay');
  });

  it('builds the teal modifier class', () => {
    // Behavior 22
    expect(spineClass('teal')).toBe('shelf__book--teal');
  });

  it('builds the ink modifier class', () => {
    // Behavior 22
    expect(spineClass('ink')).toBe('shelf__book--ink');
  });

  it('builds the sand modifier class', () => {
    // Behavior 22
    expect(spineClass('sand')).toBe('shelf__book--sand');
  });

  it('throws a TypeError on a variant outside SPINE_VARIANTS', () => {
    // Errors: spineClass('gold' as SpineVariant)
    const error = thrownBy(() => spineClass('gold' as unknown as SpineVariant));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('spineClass: unknown spine variant "gold"');
  });

  it('throws a TypeError on undefined, interpolating the value via String()', () => {
    // Errors: spineClass(undefined as unknown as SpineVariant)
    const error = thrownBy(() => spineClass(undefined as unknown as SpineVariant));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('spineClass: unknown spine variant "undefined"');
  });
});
