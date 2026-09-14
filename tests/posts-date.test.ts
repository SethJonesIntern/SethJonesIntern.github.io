import { describe, expect, it } from 'vitest';

import { parsePostDate } from '../src/lib/posts';

// Covers Behavior rows 22-26 and the pure-function half of the Boundaries row
// "date that fails to parse".

describe('parsePostDate', () => {
  it('returns the UTC midnight epoch milliseconds of a valid date', () => {
    // Behavior #22
    expect(parsePostDate('2026-09-14')).toBe(Date.UTC(2026, 8, 14));
  });

  it('returns exactly 1789344000000 for 2026-09-14', () => {
    // Behavior #22, stated as the literal constant: Date.UTC(2026, 8, 14) is
    // 1_789_344_000_000 ms, i.e. 2026-09-14T00:00:00Z. No host timezone shift.
    expect(parsePostDate('2026-09-14')).toBe(1789344000000);
  });

  it('accepts a real leap day', () => {
    // Behavior #23: Date.UTC(2024, 1, 29) === 1_709_164_800_000
    expect(parsePostDate('2024-02-29')).toBe(Date.UTC(2024, 1, 29));
  });

  it('rejects a leap day in a non-leap year', () => {
    // Behavior #23
    expect(parsePostDate('2026-02-29')).toBe(null);
  });

  it.each([
    ['month 13', '2026-13-01'],
    ['month 00', '2026-00-10'],
    ['day 31 of a 30-day month', '2026-09-31'],
    ['day 00', '2026-09-00'],
  ])('rejects %s', (_label, input) => {
    // Behavior #24: calendar range checked, not just the regex
    expect(parsePostDate(input)).toBe(null);
  });

  it.each([
    ['a single-digit month', '2026-9-14'],
    ['a slash-separated date', '14/09/2026'],
    ['an ISO date with a time component', '2026-09-14T00:00:00Z'],
    ['a date with a trailing space', '2026-09-14 '],
    ['the empty string', ''],
    ['arbitrary text', 'nope'],
  ])('rejects %s', (_label, input) => {
    // Behavior #25: strict format, no trimming, no time component
    expect(parsePostDate(input)).toBe(null);
  });

  it('rejects year 0001', () => {
    // Behavior #26: year must be >= 1000, dodging Date.UTC's two-digit-year remap
    expect(parsePostDate('0001-01-01')).toBe(null);
  });

  it('rejects year 0999', () => {
    // Behavior #26
    expect(parsePostDate('0999-12-31')).toBe(null);
  });
});
