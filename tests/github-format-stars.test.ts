import { describe, expect, it } from 'vitest';

import { formatStars } from '../src/lib/github';

// Covers Behavior rows 15 and 16, the "zero stars" Boundaries row as it applies
// to formatStars, the "negative stargazers_count" Boundaries row
// (formatStars(-1) -> '') and the "Number.MAX_SAFE_INTEGER stars" Boundaries row.

describe('formatStars', () => {
  it('returns an empty string for zero stars', () => {
    // Behavior #15, and Boundaries: "zero stars | omitted from meta"
    expect(formatStars(0)).toBe('');
  });

  it('uses the singular noun for exactly one star', () => {
    // Behavior #15
    expect(formatStars(1)).toBe('1 star');
  });

  it('uses the plural noun for two stars', () => {
    // Behavior #15
    expect(formatStars(2)).toBe('2 stars');
  });

  it('emits four-digit counts without a thousands separator', () => {
    // Behavior #15: locale-independent, so no '1,234' and no '1 234'
    expect(formatStars(1234)).toBe('1234 stars');
  });

  it('returns an empty string for a negative count', () => {
    // Behavior #16, and Boundaries: "negative stargazers_count"
    expect(formatStars(-1)).toBe('');
  });

  it('returns an empty string for a non-integer count', () => {
    // Behavior #16
    expect(formatStars(1.5)).toBe('');
  });

  it('returns an empty string for NaN', () => {
    // Behavior #16
    expect(formatStars(NaN)).toBe('');
  });

  it('returns an empty string for Infinity', () => {
    // Derived from the formatStars contract: "'' when stars is
    // 0/negative/non-integer/NaN". Infinity is not an integer.
    expect(formatStars(Infinity)).toBe('');
  });

  it('formats Number.MAX_SAFE_INTEGER stars in full', () => {
    // Boundaries: "Number.MAX_SAFE_INTEGER stars | ... formatStars yields
    // '9007199254740991 stars'"
    expect(formatStars(Number.MAX_SAFE_INTEGER)).toBe('9007199254740991 stars');
  });
});
