import { describe, expect, it } from 'vitest';
import {
  UNLOCK_SEQUENCE,
  UNLOCK_STORAGE_KEY,
  UNLOCK_STORAGE_VALUE,
  WORKSHOP_HREF,
  WORKSHOP_NAV_LABEL,
  assertUnlockSequence,
} from '../src/lib/workshop-unlock';
import { READING_LIST } from '../src/lib/reading-books';

describe('workshop-unlock constants', () => {
  // Row 1
  it('UNLOCK_SEQUENCE is Clash of Kings then Prisoner of Azkaban', () => {
    expect(UNLOCK_SEQUENCE).toEqual(['a-clash-of-kings', 'harry-potter-prisoner-of-azkaban']);
    expect(UNLOCK_SEQUENCE).toHaveLength(2);
  });

  // Row 2
  it('the storage key is workshop-unlocked', () => {
    expect(UNLOCK_STORAGE_KEY).toBe('workshop-unlocked');
  });

  // Row 2
  it('the stored unlock value is the string true', () => {
    expect(UNLOCK_STORAGE_VALUE).toBe('true');
  });

  // Row 3
  it('the workshop href is /workshop/', () => {
    expect(WORKSHOP_HREF).toBe('/workshop/');
  });

  // Row 3
  it('the workshop nav label is Workshop', () => {
    expect(WORKSHOP_NAV_LABEL).toBe('Workshop');
  });
});

describe('the shipped key books against READING_LIST', () => {
  // Row 4
  it('both key books exist, the second standing earlier on the shelf than the first', () => {
    expect(UNLOCK_SEQUENCE.map((id) => READING_LIST.findIndex((b) => b.id === id))).toEqual([11, 5]);
  });

  // Row 5
  it('both key books sit on the fiction shelf', () => {
    expect(UNLOCK_SEQUENCE.map((id) => READING_LIST.find((b) => b.id === id)?.shelf)).toEqual([
      'fiction',
      'fiction',
    ]);
  });

  // Row 37. A no-op stub also returns undefined, so the test pairs the shipped call with a
  // control proving the guard is live: the same keys against a shelf missing them must throw.
  it('assertUnlockSequence accepts the shipped keys against the shipped shelf', () => {
    expect(assertUnlockSequence(UNLOCK_SEQUENCE, READING_LIST.map((b) => b.id))).toBeUndefined();
    expect(() => assertUnlockSequence(UNLOCK_SEQUENCE, ['fire-and-blood'])).toThrow(TypeError);
  });

  // Invariant 8
  it('every shipped key id exists in READING_LIST and none repeats', () => {
    const ids = READING_LIST.map((b) => b.id);
    for (const key of UNLOCK_SEQUENCE) {
      expect(ids).toContain(key);
    }
    expect(new Set(UNLOCK_SEQUENCE).size).toBe(UNLOCK_SEQUENCE.length);
    expect(UNLOCK_SEQUENCE.length).toBeGreaterThan(0);
  });
});
