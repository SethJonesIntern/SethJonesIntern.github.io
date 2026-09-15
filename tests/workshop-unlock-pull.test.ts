import { describe, expect, it } from 'vitest';
import { UNLOCK_SEQUENCE, pullBook, type PullResult } from '../src/lib/workshop-unlock';

const K = 'a-clash-of-kings';
const P = 'harry-potter-prisoner-of-azkaban';
const C = 'harry-potter-chamber-of-secrets';

const ABC: readonly string[] = ['a', 'b', 'c'];

const HELD_ONE: PullResult = { progress: 1, unlocked: false };
const HELD_TWO: PullResult = { progress: 2, unlocked: false };
const RESET: PullResult = { progress: 0, unlocked: false };
const UNLOCKED: PullResult = { progress: 0, unlocked: true };

/** Pulls `ids` in order from a fresh state; returns each pull's `unlocked`. */
const run = (ids: readonly unknown[], sequence?: readonly string[]): boolean[] => {
  let progress = 0;
  return ids.map((id) => {
    const result = pullBook(progress, id, sequence);
    progress = result.progress;
    return result.unlocked;
  });
};

describe('pullBook — single pulls on the shipped sequence', () => {
  // Row 6
  it('holds the first key after pulling Clash of Kings from 0', () => {
    expect(pullBook(0, K)).toEqual(HELD_ONE);
  });

  // Row 7
  it('unlocks and resets when Prisoner of Azkaban is pulled at progress 1', () => {
    expect(pullBook(1, P)).toEqual(UNLOCKED);
  });

  // Row 8
  it('does not advance when the second key is pulled first', () => {
    expect(pullBook(0, P)).toEqual(RESET);
  });

  // Row 9
  it('re-arms at 1 when Clash of Kings is pulled again at progress 1', () => {
    expect(pullBook(1, K)).toEqual(HELD_ONE);
  });

  // Row 10
  it.each<[string]>([[C], ['the-last-olympian'], ['mythical-man-month']])(
    'resets to 0 when another book (%s) is pulled at progress 1',
    (id) => {
      expect(pullBook(1, id)).toEqual(RESET);
    },
  );

  // Row 11
  it.each<[string]>([[C], ['fire-and-blood']])('stays at 0 when a non-key book (%s) is pulled at 0', (id) => {
    expect(pullBook(0, id)).toEqual(RESET);
  });

  // Row 12
  it.each<[string]>([
    ['Harry-Potter-Prisoner-Of-Azkaban'],
    [' harry-potter-prisoner-of-azkaban'],
    ['harry-potter-prisoner-of-azkaban '],
    ['book-harry-potter-prisoner-of-azkaban'],
  ])('treats near-miss id %j as a mismatch without normalisation', (id) => {
    expect(pullBook(1, id)).toEqual(RESET);
  });

  // Row 13
  it.each<[number, unknown]>([
    [1, undefined],
    [1, null],
    [1, 42],
    [1, ''],
    [0, [K]],
  ])('treats an unreadable book id at progress %s (%j) as a mismatch', (progress, id) => {
    expect(pullBook(progress, id)).toEqual(RESET);
  });

  // Row 14
  it.each<[number]>([[2], [99]])('counts out-of-range progress %s as 0 when pulling Clash of Kings', (progress) => {
    expect(pullBook(progress, K)).toEqual(HELD_ONE);
  });

  // Row 15
  it.each<[number]>([[2], [99]])(
    'counts out-of-range progress %s as 0 when pulling Prisoner of Azkaban',
    (progress) => {
      expect(pullBook(progress, P)).toEqual(RESET);
    },
  );

  // Row 16
  it.each<[number]>([[-1], [0.5], [NaN], [Infinity]])(
    'counts negative or non-integer progress %s as 0 when pulling Clash of Kings',
    (progress) => {
      expect(pullBook(progress, K)).toEqual(HELD_ONE);
    },
  );

  // Row 17
  it.each<[number]>([[-1], [1.5], [NaN], [Infinity]])(
    'counts negative or non-integer progress %s as 0 when pulling Prisoner of Azkaban',
    (progress) => {
      expect(pullBook(progress, P)).toEqual(RESET);
    },
  );

  // Row 18
  it('uses UNLOCK_SEQUENCE when sequence is omitted or undefined', () => {
    expect(pullBook(0, K)).toEqual(HELD_ONE);
    expect(pullBook(0, K, UNLOCK_SEQUENCE)).toEqual(HELD_ONE);
    expect(pullBook(0, K, undefined)).toEqual(HELD_ONE);
  });

  // Row 19
  it('returns an object with exactly progress and unlocked', () => {
    expect(Object.keys(pullBook(0, K)).sort()).toEqual(['progress', 'unlocked']);
  });
});

describe('pullBook — click streams on the shipped sequence', () => {
  // Row 20
  it('unlocks on Clash of Kings then Prisoner of Azkaban', () => {
    expect(run([K, P])).toEqual([false, true]);
  });

  // Row 21
  it('does not unlock in reversed order', () => {
    expect(run([P, K])).toEqual([false, false]);
  });

  // Row 22
  it('a wrong pull in the middle kills the attempt', () => {
    expect(run([K, C, P])).toEqual([false, false, false]);
  });

  // Row 23
  it('a double-click on Clash of Kings still unlocks', () => {
    expect(run([K, K, P])).toEqual([false, false, true]);
  });

  // Row 24
  it('a reset followed by the combination unlocks', () => {
    expect(run([P, K, P])).toEqual([false, false, true]);
  });

  // Row 25
  it.each<[string]>([[C], ['mythical-man-month']])('a stray %s before the combination does not poison it', (id) => {
    expect(run([id, K, P])).toEqual([false, false, true]);
  });

  // Row 26
  it('a pull after completion starts from 0', () => {
    expect(run([K, P, P])).toEqual([false, true, false]);
  });

  // Row 27
  it('the combination is repeatable', () => {
    expect(run([K, P, K, P])).toEqual([false, true, false, true]);
  });

  // Row 28
  it('an unknown id between the keys kills the attempt', () => {
    expect(run([K, 'not-a-spine', P])).toEqual([false, false, false]);
  });

  // Row 29 (`run([])` -> `[]`) is not tested: `run` never calls pullBook on an empty list, so the
  // assertion cannot fail against any implementation.

  // Boundary: max number of pulls
  it('unlocks after 1000 non-key pulls followed by the combination', () => {
    const noise = ['fire-and-blood', C, 'mythical-man-month', 'not-a-spine'];
    const ids = [...Array.from({ length: 1000 }, (_, i) => noise[i % noise.length]), K, P];
    const result = run(ids);
    expect(result).toHaveLength(1002);
    expect(result.indexOf(true)).toBe(1001);
    expect(result[1001]).toBe(true);
  });
});

describe('pullBook — custom sequences', () => {
  // Row 30
  it('advances through a three-key sequence to 1', () => {
    expect(pullBook(0, 'a', ABC)).toEqual(HELD_ONE);
  });

  // Row 30
  it('advances through a three-key sequence to 2', () => {
    expect(pullBook(1, 'b', ABC)).toEqual(HELD_TWO);
  });

  // Row 30
  it('unlocks on the last key of a three-key sequence', () => {
    expect(pullBook(2, 'c', ABC)).toEqual(UNLOCKED);
  });

  // Row 31
  it.each<[number]>([[2], [1]])('re-arms at 1 when the first key is pulled at depth %s', (progress) => {
    expect(pullBook(progress, 'a', ABC)).toEqual(HELD_ONE);
  });

  // Row 32
  it.each<[number, string]>([
    [2, 'b'],
    [1, 'c'],
    [0, 'b'],
  ])('resets when a later key is pulled out of turn (progress %s, id %s)', (progress, id) => {
    expect(pullBook(progress, id, ABC)).toEqual(RESET);
  });

  // Row 33
  it('treats progress equal to the sequence length as 0 when pulling the first key', () => {
    expect(pullBook(3, 'a', ABC)).toEqual(HELD_ONE);
  });

  // Row 33
  it('treats progress equal to the sequence length as 0 when pulling the last key', () => {
    expect(pullBook(3, 'c', ABC)).toEqual(RESET);
  });

  // Row 34 / Boundary: one-key sequence
  it('a one-key sequence unlocks on its only pull from progress 0', () => {
    expect(pullBook(0, 'a', ['a'])).toEqual(UNLOCKED);
  });

  // Row 34
  it('a one-key sequence unlocks from out-of-range progress 1', () => {
    expect(pullBook(1, 'a', ['a'])).toEqual(UNLOCKED);
  });

  // Row 34
  it('a one-key sequence does not unlock on another id', () => {
    expect(pullBook(0, 'b', ['a'])).toEqual(RESET);
  });

  // Row 35 / Boundary: empty sequence
  it.each<[number, unknown]>([
    [0, 'a'],
    [0, undefined],
    [5, 'a'],
  ])('an empty sequence never advances or unlocks (progress %s, id %j)', (progress, id) => {
    expect(pullBook(progress, id, [])).toEqual(RESET);
  });

  // Boundary "sequence with repeated ids": undefined by the spec, not tested.
});

describe('pullBook — never mutates', () => {
  // Row 36. Kept last in the file so UNLOCK_SEQUENCE is checked after rows 6–35 ran.
  it('leaves a caller sequence untouched while advancing through it', () => {
    const seq = ['a', 'b'];
    expect(pullBook(0, 'a', seq)).toEqual(HELD_ONE);
    expect(pullBook(1, 'b', seq)).toEqual(UNLOCKED);
    expect(seq).toEqual(['a', 'b']);
  });

  // Row 36
  it('leaves UNLOCK_SEQUENCE equal to its shipped value after every earlier pull', () => {
    expect(run([K, P, P, K, K, C, P])).toEqual([false, true, false, false, false, false, false]);
    expect(UNLOCK_SEQUENCE).toEqual(['a-clash-of-kings', 'harry-potter-prisoner-of-azkaban']);
  });
});
