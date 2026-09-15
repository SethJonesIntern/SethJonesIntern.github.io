import { describe, expect, it } from 'vitest';

import { isExhibitId } from '../src/lib/workshop';

// Covers specs/workshop.spec.md Behavior rows 1-14, plus the Boundaries rows
// "empty string id" (the isExhibitId half), "max - id length", "unicode in ids"
// and "null / undefined to isExhibitId".

describe('isExhibitId accepts valid kebab-case ids', () => {
  it('accepts a simple single-run slug', () => {
    // Behavior 1
    expect(isExhibitId('clock')).toBe(true);
  });

  it('accepts two runs joined by a single hyphen', () => {
    // Behavior 2
    expect(isExhibitId('sorting-visualizer')).toBe(true);
  });

  it('accepts any number of hyphen-joined segments', () => {
    // Behavior 3
    expect(isExhibitId('a-b-c-d')).toBe(true);
  });

  it('accepts digits, including a leading digit', () => {
    // Behavior 4
    expect(isExhibitId('9-lives')).toBe(true);
  });

  it('accepts an uncapped 200-character id', () => {
    // Boundaries: "max - id length" is uncapped.
    expect(isExhibitId('a'.repeat(200))).toBe(true);
  });
});

describe('isExhibitId rejects malformed ids', () => {
  it('rejects an uppercase letter rather than lowercasing it', () => {
    // Behavior 5
    expect(isExhibitId('Clock')).toBe(false);
  });

  it('rejects a space between words', () => {
    // Behavior 6
    expect(isExhibitId('two words')).toBe(false);
  });

  it('rejects a trailing hyphen', () => {
    // Behavior 7
    expect(isExhibitId('trailing-')).toBe(false);
  });

  it('rejects a leading hyphen', () => {
    // Behavior 8
    expect(isExhibitId('-leading')).toBe(false);
  });

  it('rejects a doubled hyphen', () => {
    // Behavior 9
    expect(isExhibitId('double--hyphen')).toBe(false);
  });

  it('rejects the empty string', () => {
    // Behavior 10, and the Boundaries row "empty string id".
    expect(isExhibitId('')).toBe(false);
  });

  it('rejects surrounding whitespace rather than trimming it', () => {
    // Behavior 11
    expect(isExhibitId(' clock ')).toBe(false);
  });

  it('rejects an underscore', () => {
    // Behavior 12
    expect(isExhibitId('clock_two')).toBe(false);
  });

  it('rejects a dot', () => {
    // Behavior 12
    expect(isExhibitId('clock.two')).toBe(false);
  });

  it('rejects a slash', () => {
    // Behavior 12
    expect(isExhibitId('clock/two')).toBe(false);
  });

  it('rejects a Latin-1 accented letter', () => {
    // Behavior 13, and the Boundaries row "unicode in ids".
    expect(isExhibitId('clöck')).toBe(false);
  });

  it('rejects CJK characters', () => {
    // Behavior 13
    expect(isExhibitId('时钟')).toBe(false);
  });

  it('rejects an emoji', () => {
    // Behavior 13
    expect(isExhibitId('clock-😀')).toBe(false);
  });
});

describe('isExhibitId rejects non-string values', () => {
  it('rejects null', () => {
    // Behavior 14, and the Boundaries row "null / undefined to isExhibitId".
    expect(isExhibitId(null)).toBe(false);
  });

  it('rejects undefined', () => {
    // Behavior 14
    expect(isExhibitId(undefined)).toBe(false);
  });

  it('rejects a number', () => {
    // Behavior 14
    expect(isExhibitId(42)).toBe(false);
  });

  it('rejects a plain object', () => {
    // Behavior 14
    expect(isExhibitId({})).toBe(false);
  });

  it('rejects an array wrapping a valid id', () => {
    // Behavior 14
    expect(isExhibitId(['clock'])).toBe(false);
  });
});
