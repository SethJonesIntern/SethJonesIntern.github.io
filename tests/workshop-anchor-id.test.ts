import { describe, expect, it } from 'vitest';

import { exhibitAnchorId } from '../src/lib/workshop';

// Covers specs/workshop.spec.md Behavior rows 16-18, every `exhibitAnchorId`
// row of the Errors table, and the Boundaries rows "empty string id" (the
// throwing half), "max - id length" and "null / undefined to exhibitAnchorId".

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

describe('exhibitAnchorId prefixes a valid id', () => {
  it('prefixes a simple slug', () => {
    // Behavior 16
    expect(exhibitAnchorId('clock')).toBe('exhibit-clock');
  });

  it('prefixes a hyphenated slug without collapsing its hyphens', () => {
    // Behavior 17
    expect(exhibitAnchorId('sorting-visualizer')).toBe('exhibit-sorting-visualizer');
  });

  it('prefixes a slug that starts with a digit', () => {
    // Behavior 18
    expect(exhibitAnchorId('9-lives')).toBe('exhibit-9-lives');
  });

  it('prefixes an uncapped 200-character id', () => {
    // Boundaries: "max - id length" is uncapped.
    expect(exhibitAnchorId('a'.repeat(200))).toBe(`exhibit-${'a'.repeat(200)}`);
  });
});

describe('exhibitAnchorId rejects invalid ids with a TypeError', () => {
  it('throws on the empty string', () => {
    const error = thrownBy(() => exhibitAnchorId(''));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('exhibitAnchorId: invalid exhibit id ""');
  });

  it('throws on an uppercase id', () => {
    const error = thrownBy(() => exhibitAnchorId('Clock'));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('exhibitAnchorId: invalid exhibit id "Clock"');
  });

  it('throws on a padded id rather than trimming it', () => {
    const error = thrownBy(() => exhibitAnchorId(' clock '));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('exhibitAnchorId: invalid exhibit id " clock "');
  });

  it('throws on a doubled hyphen', () => {
    const error = thrownBy(() => exhibitAnchorId('double--hyphen'));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('exhibitAnchorId: invalid exhibit id "double--hyphen"');
  });

  it('throws on null, interpolating the value via String()', () => {
    const error = thrownBy(() => exhibitAnchorId(null as unknown as string));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('exhibitAnchorId: invalid exhibit id "null"');
  });

  it('throws on undefined, interpolating the value via String()', () => {
    const error = thrownBy(() => exhibitAnchorId(undefined as unknown as string));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('exhibitAnchorId: invalid exhibit id "undefined"');
  });
});
