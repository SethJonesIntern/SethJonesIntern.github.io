import { describe, expect, it } from 'vitest';
import { UNLOCK_SEQUENCE, isUnlockOrder, togglePull } from '../src/lib/workshop-unlock';
import { READING_LIST } from '../src/lib/reading-books';

const K = 'a-clash-of-kings';
const P = 'harry-potter-prisoner-of-azkaban';
const C = 'harry-potter-chamber-of-secrets';

/** Clicks `ids` in order on an empty shelf; returns the unlock test after each click and the final order. */
const run = (ids: readonly unknown[], sequence?: readonly string[]) => {
  let pulled: string[] = [];
  const unlocked = ids.map((id) => {
    pulled = togglePull(pulled, id);
    return isUnlockOrder(pulled, sequence);
  });
  return { unlocked, pulled };
};

describe('togglePull — pulls', () => {
  // Row 6 / Boundary: empty pull order
  it('appends a pulled book to an empty order', () => {
    expect(togglePull([], K)).toEqual([K]);
  });

  // Row 7
  it('appends a second pulled book after the first', () => {
    expect(togglePull([K], P)).toEqual([K, P]);
  });

  // Row 10
  it('appends a pull after wrong books already pulled', () => {
    expect(togglePull([P, C], K)).toEqual([P, C, K]);
  });

  // Row 10
  it('appends the second key after a single wrong book', () => {
    expect(togglePull([C], P)).toEqual([C, P]);
  });

  // Row 11 / Boundary: unordered
  it('keeps pull order rather than sequence order', () => {
    expect(togglePull([P], K)).toEqual([P, K]);
  });

  // Row 12
  it.each<[string]>([[C], ['the-last-olympian'], ['mythical-man-month']])(
    'keeps a wrong book (%s) pulled without resetting the order',
    (id) => {
      expect(togglePull([K], id)).toEqual([K, id]);
    },
  );

  // Row 13 / Boundary: near-miss and padded ids
  it.each<[string]>([['A-Clash-Of-Kings'], [' a-clash-of-kings'], ['a-clash-of-kings '], ['book-a-clash-of-kings']])(
    'appends near-miss id %j instead of pushing back Clash of Kings',
    (id) => {
      expect(togglePull([K], id)).toEqual([K, id]);
    },
  );

  // Row 18 / Boundary: unknown and whitespace-only ids
  it('treats an unknown non-empty string as an id and appends it', () => {
    expect(togglePull([], 'not-a-spine')).toEqual(['not-a-spine']);
  });

  // Row 18
  it('treats a whitespace-only string as an id and appends it', () => {
    expect(togglePull([], ' ')).toEqual([' ']);
  });
});

describe('togglePull — pushes', () => {
  // Row 8 / Boundary: the same spine clicked twice
  it('pushes back a book that is already pulled', () => {
    expect(togglePull([K], K)).toEqual([]);
  });

  // Row 9
  it('pushes back the first of two pulled books, keeping the other', () => {
    expect(togglePull([K, P], K)).toEqual([P]);
  });

  // Row 9
  it('pushes back a book from the middle, keeping the rest in order', () => {
    expect(togglePull([K, C, P], C)).toEqual([K, P]);
  });

  // Row 17 / Boundary: duplicate ids in the input order
  it('removes every occurrence of a pushed id from an order with duplicates', () => {
    expect(togglePull([K, C, K], K)).toEqual([C]);
  });

  // Row 17
  it('appends a new id to an order with duplicates without touching them', () => {
    expect(togglePull([K, C, K], P)).toEqual([K, C, K, P]);
  });
});

describe('togglePull — unreadable ids', () => {
  // Row 14 / Boundary: empty string, null, undefined, non-string bookId
  it.each<[string, unknown]>([
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
    ['the empty string', ''],
    ['an array holding a key id', [K]],
    ['an empty object', {}],
  ])('leaves the order unchanged for %s', (_label, id) => {
    expect(togglePull([K], id)).toEqual([K]);
  });

  // Row 15
  it('leaves an empty order empty for null', () => {
    expect(togglePull([], null)).toEqual([]);
  });

  // Row 15
  it('leaves an empty order empty for the empty string', () => {
    expect(togglePull([], '')).toEqual([]);
  });
});

describe('togglePull — new arrays, no mutation', () => {
  // Row 16 / Boundary: readonly input
  it('returns a new array for an unreadable id without mutating the input', () => {
    const xs = [K];
    const a = togglePull(xs, null);
    expect(a).not.toBe(xs);
    expect(a).toEqual([K]);
    expect(xs).toEqual([K]);
  });

  // Row 16
  it('returns a new array for a pull without mutating the input', () => {
    const xs = [K];
    const b = togglePull(xs, P);
    expect(b).not.toBe(xs);
    expect(b).toEqual([K, P]);
    expect(xs).toEqual([K]);
  });

  // Row 16
  it('returns a new array for a push without mutating the input', () => {
    const xs = [K];
    const c = togglePull(xs, K);
    expect(c).not.toBe(xs);
    expect(c).toEqual([]);
    expect(xs).toEqual([K]);
  });

  // Row 19 / Boundary: frozen input
  it('pulls onto a frozen order without throwing', () => {
    expect(togglePull(Object.freeze([K]), P)).toEqual([K, P]);
  });

  // Row 19
  it('pushes back from a frozen order without throwing', () => {
    expect(togglePull(Object.freeze([K]), K)).toEqual([]);
  });
});

describe('isUnlockOrder — the shipped sequence', () => {
  // Row 20
  it('is true for Clash of Kings then Prisoner of Azkaban', () => {
    expect(isUnlockOrder([K, P])).toBe(true);
  });

  // Row 21 / Boundary: unordered
  it('is false for the keys in reversed order', () => {
    expect(isUnlockOrder([P, K])).toBe(false);
  });

  // Row 22 / Boundary: empty order, order shorter than the sequence
  it.each<[string, string[]]>([
    ['an empty order', []],
    ['only Clash of Kings', [K]],
    ['only Prisoner of Azkaban', [P]],
  ])('is false for %s', (_label, order) => {
    expect(isUnlockOrder(order)).toBe(false);
  });

  // Row 23 / Boundary: order longer than the sequence
  it.each<[string, string[]]>([
    ['an extra book after', [K, P, C]],
    ['an extra book before', [C, K, P]],
    ['an extra book between', [K, C, P]],
    ['a repeated first key', [K, K, P]],
  ])('is false with %s', (_label, order) => {
    expect(isUnlockOrder(order)).toBe(false);
  });

  // Row 24 / Boundary: near-miss ids never match
  it.each<[string[]]>([
    [['A-Clash-Of-Kings', P]],
    [[K, 'harry-potter-prisoner-of-azkaban ']],
    [['book-a-clash-of-kings', 'book-harry-potter-prisoner-of-azkaban']],
  ])('is false for near-miss order %j', (order) => {
    expect(isUnlockOrder(order)).toBe(false);
  });

  // Row 25
  it('is true for the combination with UNLOCK_SEQUENCE passed explicitly', () => {
    expect(isUnlockOrder([K, P], UNLOCK_SEQUENCE)).toBe(true);
  });

  // Row 25
  it('selects the default sequence when passed undefined, accepting the combination', () => {
    expect(isUnlockOrder([K, P], undefined)).toBe(true);
  });

  // Row 25
  it('selects the default sequence when passed undefined, rejecting the reversed order', () => {
    expect(isUnlockOrder([P, K], undefined)).toBe(false);
  });
});

describe('isUnlockOrder — custom sequences', () => {
  // Row 26
  it('is true for a three-key order matching a three-key sequence', () => {
    expect(isUnlockOrder(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
  });

  // Row 26
  it('is false for a prefix of a three-key sequence', () => {
    expect(isUnlockOrder(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
  });

  // Row 26
  it('is false for a three-key order out of sequence', () => {
    expect(isUnlockOrder(['a', 'c', 'b'], ['a', 'b', 'c'])).toBe(false);
  });

  // Row 26
  it('a three-key sequence unlocks only on its third click', () => {
    expect(run(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual({
      unlocked: [false, false, true],
      pulled: ['a', 'b', 'c'],
    });
  });

  // Row 27 / Boundary: one-key sequence
  it('is true for a one-key order matching a one-key sequence', () => {
    expect(isUnlockOrder(['a'], ['a'])).toBe(true);
  });

  // Row 27
  it('is false for an empty order against a one-key sequence', () => {
    expect(isUnlockOrder([], ['a'])).toBe(false);
  });

  // Row 27
  it('is false for a doubled id against a one-key sequence', () => {
    expect(isUnlockOrder(['a', 'a'], ['a'])).toBe(false);
  });

  // Row 28 / Boundary: empty sequence
  it('is false for an empty order against an empty sequence', () => {
    expect(isUnlockOrder([], [])).toBe(false);
  });

  // Row 28
  it('is false for a non-empty order against an empty sequence', () => {
    expect(isUnlockOrder(['a'], [])).toBe(false);
  });

  // Boundary "sequence with repeated ids": undefined beyond Invariant 3, not tested here.
});

describe('click streams on the shipped sequence', () => {
  // Row 30
  it('unlocks on Clash of Kings then Prisoner of Azkaban', () => {
    expect(run([K, P])).toEqual({ unlocked: [false, true], pulled: [K, P] });
  });

  // Row 31
  it('reversed order does not unlock and leaves both pulled', () => {
    expect(run([P, K])).toEqual({ unlocked: [false, false], pulled: [P, K] });
  });

  // Row 32
  it('a wrong book in the middle blocks the unlock and stays pulled', () => {
    expect(run([K, C, P])).toEqual({ unlocked: [false, false, false], pulled: [K, C, P] });
  });

  // Row 33
  it('pushing the wrong book back is the click that unlocks', () => {
    expect(run([K, C, P, C])).toEqual({ unlocked: [false, false, false, true], pulled: [K, P] });
  });

  // Row 34
  it('pull Azkaban, pull Clash, push Azkaban, pull Azkaban again unlocks', () => {
    expect(run([P, K, P, P])).toEqual({ unlocked: [false, false, false, true], pulled: [K, P] });
  });

  // Row 35
  it('a double-click on Clash of Kings is a pull then a push, so Azkaban alone stays pulled', () => {
    expect(run([K, K, P])).toEqual({ unlocked: [false, false, false], pulled: [P] });
  });

  // Row 35
  it('a triple click on Clash of Kings leaves it pulled, then Azkaban unlocks', () => {
    expect(run([K, K, K, P])).toEqual({ unlocked: [false, false, false, true], pulled: [K, P] });
  });

  // Row 36
  it('a click after completion is an ordinary toggle', () => {
    expect(run([K, P, P])).toEqual({ unlocked: [false, true, false], pulled: [K] });
  });

  // Row 36
  it('unreadable ids between the keys change nothing', () => {
    expect(run([K, null, '', P])).toEqual({ unlocked: [false, false, false, true], pulled: [K, P] });
  });

  // Row 36, third case (`run([])` -> `{ unlocked: [], pulled: [] }`) is not tested: `run` never calls
  // togglePull or isUnlockOrder on an empty list, so the assertion cannot fail against any implementation.

  // Boundary: max number of clicks
  it('unlocks after 1000 clicks on one wrong book followed by the combination', () => {
    const ids = [...Array.from({ length: 1000 }, () => C), K, P];
    const result = run(ids);
    expect(result.unlocked).toHaveLength(1002);
    expect(result.unlocked[1001]).toBe(true);
    expect(result.pulled).toEqual([K, P]);
  });

  // Boundary: max order length
  it('pulling all 18 shipped books in shelf order yields those ids in that order, locked', () => {
    const ids = READING_LIST.map((b) => b.id);
    expect(ids).toHaveLength(18);
    const result = run(ids);
    expect(result.pulled).toEqual(ids);
    expect(result.unlocked).toEqual(Array.from({ length: 18 }, () => false));
  });
});

describe('isUnlockOrder — never mutates', () => {
  // Row 29. Kept last in the file so UNLOCK_SEQUENCE is checked after rows 6–36 ran.
  it('leaves the order and the sequence untouched', () => {
    const o = [K, P];
    const s = [K, P];
    expect(isUnlockOrder(o, s)).toBe(true);
    expect(o).toEqual([K, P]);
    expect(s).toEqual([K, P]);
  });

  // Row 29
  it('leaves UNLOCK_SEQUENCE equal to its shipped value after every earlier call', () => {
    expect(run([K, P, P, K, C, P, C])).toEqual({
      unlocked: [false, true, false, false, false, false, false],
      pulled: [P],
    });
    expect(UNLOCK_SEQUENCE).toEqual(['a-clash-of-kings', 'harry-potter-prisoner-of-azkaban']);
  });
});
