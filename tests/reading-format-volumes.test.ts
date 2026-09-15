import { describe, expect, it } from 'vitest';

import { formatVolumes } from '../src/lib/reading';

// Covers specs/reading.spec.md Behavior rows 23-29, every `formatVolumes` row of
// the Errors table, and the Boundaries rows "zero / negative volume numbers",
// "max - volume number" and the `formatVolumes(undefined)` half of
// "`volumes: undefined` vs omitted".

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

describe('formatVolumes formats a range', () => {
  it('returns the empty string for an absent range', () => {
    // Behavior 23
    expect(formatVolumes(undefined)).toBe('');
  });

  it('formats a seven-volume series', () => {
    // Behavior 24 - en dash U+2013, no spaces around it
    expect(formatVolumes([1, 7])).toBe('Books 1–7');
  });

  it('separates the two numbers with U+2013 and not a hyphen', () => {
    // Behavior 24 - the dash asserted by code point
    expect(formatVolumes([1, 7]).charCodeAt(7)).toBe(0x2013);
  });

  it('formats a two-volume series', () => {
    // Behavior 25
    expect(formatVolumes([1, 2])).toBe('Books 1–2');
  });

  it('formats a five-volume series', () => {
    // Behavior 26
    expect(formatVolumes([1, 5])).toBe('Books 1–5');
  });

  it('formats a single volume in the singular with no range', () => {
    // Behavior 27
    expect(formatVolumes([3, 3])).toBe('Book 3');
  });

  it('formats multi-digit volume numbers', () => {
    // Behavior 28
    expect(formatVolumes([10, 12])).toBe('Books 10–12');
  });

  it('formats a large finite range, since volume numbers are uncapped', () => {
    // Behavior 29, Boundaries "max - volume number"
    expect(formatVolumes([1, 999])).toBe('Books 1–999');
  });
});

describe('formatVolumes rejects an invalid range with a TypeError', () => {
  it('throws on a first volume of zero, since volumes are 1-based', () => {
    // Errors: formatVolumes([0, 3])
    const error = thrownBy(() => formatVolumes([0, 3]));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('formatVolumes: invalid volume range [0, 3]');
  });

  it('throws on a negative first volume', () => {
    // Errors: formatVolumes([-1, 3])
    const error = thrownBy(() => formatVolumes([-1, 3]));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('formatVolumes: invalid volume range [-1, 3]');
  });

  it('throws when the last volume is below the first', () => {
    // Errors: formatVolumes([2, 1])
    const error = thrownBy(() => formatVolumes([2, 1]));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('formatVolumes: invalid volume range [2, 1]');
  });

  it('throws on a fractional volume number', () => {
    // Errors: formatVolumes([1.5, 3])
    const error = thrownBy(() => formatVolumes([1.5, 3]));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('formatVolumes: invalid volume range [1.5, 3]');
  });

  it('throws on NaN', () => {
    // Errors: formatVolumes([Number.NaN, 3])
    const error = thrownBy(() => formatVolumes([Number.NaN, 3]));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('formatVolumes: invalid volume range [NaN, 3]');
  });

  it('throws on an infinite last volume', () => {
    // Errors: formatVolumes([1, Number.POSITIVE_INFINITY]), Boundaries "max - volume number"
    const error = thrownBy(() => formatVolumes([1, Number.POSITIVE_INFINITY]));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('formatVolumes: invalid volume range [1, Infinity]');
  });
});
