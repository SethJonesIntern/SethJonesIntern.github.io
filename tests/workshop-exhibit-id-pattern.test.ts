import { describe, expect, it } from 'vitest';

import { EXHIBIT_ID_PATTERN } from '../src/lib/workshop';

// Covers specs/workshop.spec.md Behavior row 15 and the Public API statement
// that EXHIBIT_ID_PATTERN carries no `g`/`y` flag, so `.test()` is stateless.

describe('EXHIBIT_ID_PATTERN is stateless', () => {
  it('returns true on three consecutive tests of the same id', () => {
    // Behavior 15: with a `g` flag the second call would return false.
    expect(EXHIBIT_ID_PATTERN.test('clock')).toBe(true);
    expect(EXHIBIT_ID_PATTERN.test('clock')).toBe(true);
    expect(EXHIBIT_ID_PATTERN.test('clock')).toBe(true);
  });

  it('carries no regular expression flags', () => {
    expect(EXHIBIT_ID_PATTERN.flags).toBe('');
  });

  it('leaves lastIndex at zero after a successful test', () => {
    EXHIBIT_ID_PATTERN.test('sorting-visualizer');
    expect(EXHIBIT_ID_PATTERN.lastIndex).toBe(0);
  });
});

describe('EXHIBIT_ID_PATTERN is anchored at both ends', () => {
  it('rejects a valid id with a prefix', () => {
    expect(EXHIBIT_ID_PATTERN.test('Xclock')).toBe(false);
  });

  it('rejects a valid id with a suffix', () => {
    expect(EXHIBIT_ID_PATTERN.test('clock!')).toBe(false);
  });

  it('rejects an embedded newline around a valid id', () => {
    expect(EXHIBIT_ID_PATTERN.test('clock\nnope')).toBe(false);
  });
});
