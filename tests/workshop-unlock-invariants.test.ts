/**
 * Property tests for the Invariants of specs/workshop-unlock.spec.md.
 *
 * The spec forbids new dependencies and no property-testing library is installed, so inputs come from
 * a small seeded PRNG (mulberry32) defined here. Each property runs RUNS generated cases with a fixed
 * seed, so failures reproduce. Oracles are written from the spec's wording, never from the module.
 */
import { describe, expect, it } from 'vitest';
import {
  UNLOCK_STORAGE_KEY,
  UNLOCK_STORAGE_VALUE,
  WORKSHOP_HREF,
  WORKSHOP_NAV_LABEL,
  isPointerClick,
  isUnlockOrder,
  isWorkshopPath,
  openStorage,
  parseUnlockFlag,
  readUnlocked,
  recordUnlock,
  togglePull,
  workshopNavLink,
  type UnlockStorage,
} from '../src/lib/workshop-unlock';

const K = 'a-clash-of-kings';
const P = 'harry-potter-prisoner-of-azkaban';
const C = 'harry-potter-chamber-of-secrets';

const RUNS = 1000;

type Gen = {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  bool: () => boolean;
};

const gen = (seed: number): Gen => {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => Math.floor(next() * (max - min + 1)) + min;
  const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)] as T;
  const bool = (): boolean => next() < 0.5;
  return { next, int, pick, bool };
};

const ID_POOL: readonly string[] = ['a', 'b', 'c', 'd', 'e', K, P, C, 'fire-and-blood', 'mythical-man-month'];

const anyString = (g: Gen): string => {
  if (g.bool()) {
    return g.pick([...ID_POOL, 'true', 'TRUE', ' true', 'true ', '', ' ', 'workshop', '/workshop/']);
  }
  const alphabet = 'abtrueTRUE -/_.1';
  return Array.from({ length: g.int(0, 8) }, () => g.pick(alphabet.split(''))).join('');
};

const anyNumber = (g: Gen): number =>
  g.pick([
    () => g.int(-5, 10),
    () => g.next() * 10 - 3,
    () => NaN,
    () => Infinity,
    () => -Infinity,
    () => -0,
    () => Number.MAX_SAFE_INTEGER,
    () => g.int(0, 3),
  ])();

const anyValue = (g: Gen): unknown =>
  g.pick<() => unknown>([
    () => anyString(g),
    () => anyNumber(g),
    () => null,
    () => undefined,
    () => g.bool(),
    () => [anyString(g)],
    () => ({}),
    () => ({ toString: () => K }),
  ])();

const shuffle = <T>(g: Gen, items: readonly T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = g.int(0, i);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
};

/** Distinct ids from the pool, length in [minLen, maxLen]. */
const distinctIds = (g: Gen, minLen: number, maxLen: number): string[] =>
  shuffle(g, ID_POOL).slice(0, g.int(minLen, maxLen));

/** Ids from the pool, repeats allowed, length in [0, maxLen]. */
const anyIds = (g: Gen, maxLen: number): string[] =>
  Array.from({ length: g.int(0, maxLen) }, () => (g.int(0, 4) === 0 ? anyString(g) : g.pick(ID_POOL)));

/** A bookId that is often already in `pulled`, otherwise anything. */
const anyBookId = (g: Gen, pulled: readonly string[]): unknown =>
  pulled.length > 0 && g.bool() ? g.pick(pulled) : g.bool() ? g.pick(ID_POOL) : anyValue(g);

/** Map-backed UnlockStorage that records every call. */
const fakeStorage = (seed: Record<string, string> = {}) => {
  const data = new Map(Object.entries(seed));
  const calls: Array<[method: 'getItem' | 'setItem', ...args: string[]]> = [];
  const storage: UnlockStorage = {
    getItem: (key) => (calls.push(['getItem', key]), data.get(key) ?? null),
    setItem: (key, value) => void (calls.push(['setItem', key, value]), data.set(key, value)),
  };
  return { storage, data, calls };
};

const anySeed = (g: Gen): Record<string, string> => {
  const seed: Record<string, string> = {};
  for (let i = g.int(0, 3); i > 0; i -= 1) {
    seed[g.pick(['workshop-unlocked', 'workshop', 'other', 'theme'])] = anyString(g);
  }
  return seed;
};

const describeCase = (value: unknown): string =>
  JSON.stringify(value, (_key, v: unknown) => (v === undefined ? '<undefined>' : v));

describe('Invariant 1: togglePull result', () => {
  it('returns a new array equal to the spec oracle and leaves a frozen input unchanged', () => {
    const g = gen(1);
    for (let i = 0; i < RUNS; i += 1) {
      const original = anyIds(g, 6);
      const pulled = Object.freeze([...original]);
      const bookId = anyBookId(g, original);
      const expected =
        typeof bookId !== 'string' || bookId === ''
          ? [...original]
          : original.includes(bookId)
            ? original.filter((x) => x !== bookId)
            : [...original, bookId];
      const result = togglePull(pulled, bookId);
      const context = describeCase({ original, bookId, result });
      expect(result, context).not.toBe(pulled);
      expect(result, context).toEqual(expected);
      expect(pulled, context).toEqual(original);
    }
  });
});

describe('Invariant 2: togglePull preserves distinctness and round-trips', () => {
  it('a duplicate-free order stays duplicate-free after any click', () => {
    const g = gen(2);
    for (let i = 0; i < RUNS; i += 1) {
      const pulled = distinctIds(g, 0, 8);
      const result = togglePull(pulled, anyBookId(g, pulled));
      expect(new Set(result).size, describeCase({ pulled, result })).toBe(result.length);
    }
  });

  it('pulling an absent non-empty id and then pushing it back restores the order', () => {
    const g = gen(3);
    for (let i = 0; i < RUNS; i += 1) {
      const pulled = distinctIds(g, 0, 8);
      const id = g.bool() ? g.pick(ID_POOL) : anyString(g);
      if (id === '' || pulled.includes(id)) continue;
      expect(togglePull(togglePull(pulled, id), id), describeCase({ pulled, id })).toEqual(pulled);
    }
  });
});

describe('Invariant 3: isUnlockOrder is exact, ordered equality with a non-empty sequence', () => {
  it('matches the spec formula for any order and sequence, without mutating either', () => {
    const g = gen(4);
    for (let i = 0; i < RUNS; i += 1) {
      const seqOriginal = anyIds(g, 4);
      const orderOriginal = g.pick<() => string[]>([
        () => [...seqOriginal],
        () => shuffle(g, seqOriginal),
        () => [...seqOriginal, g.pick(ID_POOL)],
        () => seqOriginal.slice(1),
        () => anyIds(g, 4),
      ])();
      const s = Object.freeze([...seqOriginal]);
      const o = Object.freeze([...orderOriginal]);
      const expected = s.length > 0 && o.length === s.length && o.every((x, index) => x === s[index]);
      const context = describeCase({ o: orderOriginal, s: seqOriginal });
      expect(isUnlockOrder(o, s), context).toBe(expected);
      expect(o, context).toEqual(orderOriginal);
      expect(s, context).toEqual(seqOriginal);
    }
  });

  it('with the default sequence, is true only for Clash of Kings then Prisoner of Azkaban', () => {
    const g = gen(5);
    for (let i = 0; i < RUNS; i += 1) {
      const o = g.pick<() => string[]>([
        () => [K, P],
        () => shuffle(g, [K, P]),
        () => Array.from({ length: g.int(0, 4) }, () => g.pick([K, P, C])),
        () => anyIds(g, 4),
      ])();
      const expected = o.length === 2 && o[0] === 'a-clash-of-kings' && o[1] === 'harry-potter-prisoner-of-azkaban';
      expect(isUnlockOrder(o), describeCase(o)).toBe(expected);
    }
  });
});

describe('Invariant 4: the unlock is reachable from every state', () => {
  // Assumption: `s` is non-empty. Invariant 3 and Behavior row 28 make an empty sequence never unlock.
  it('pushing back every pulled book in any order and then pulling the sequence unlocks', () => {
    const g = gen(6);
    for (let i = 0; i < RUNS; i += 1) {
      const o = distinctIds(g, 0, 8);
      const s = distinctIds(g, 1, 5);
      let pulled: string[] = [...o];
      for (const id of [...shuffle(g, o), ...s]) {
        pulled = togglePull(pulled, id);
      }
      expect(isUnlockOrder(pulled, s), describeCase({ o, s, pulled })).toBe(true);
    }
  });

  it('from any shelf state, pushing everything back and pulling Clash then Azkaban unlocks the shipped sequence', () => {
    const g = gen(7);
    for (let i = 0; i < RUNS; i += 1) {
      const o = distinctIds(g, 0, 8);
      let pulled: string[] = [...o];
      for (const id of [...shuffle(g, o), K, P]) {
        pulled = togglePull(pulled, id);
      }
      expect(isUnlockOrder(pulled), describeCase({ o, pulled })).toBe(true);
    }
  });
});

describe('Invariant 5: isPointerClick', () => {
  it('is true exactly for integers >= 1 and false for every non-number', () => {
    const g = gen(8);
    for (let i = 0; i < RUNS; i += 1) {
      const detail = g.bool() ? anyNumber(g) : anyValue(g);
      const expected = typeof detail === 'number' && Number.isInteger(detail) && detail >= 1;
      expect(isPointerClick(detail), String(detail)).toBe(expected);
    }
  });
});

describe('Invariant 6: purity', () => {
  it('togglePull and isUnlockOrder give the same result for the same input, interleaved with other calls', () => {
    const g = gen(9);
    for (let i = 0; i < RUNS; i += 1) {
      const pulled = Object.freeze(anyIds(g, 6));
      const seq = Object.freeze(anyIds(g, 4));
      const bookId = anyBookId(g, pulled);
      const firstToggle = togglePull(pulled, bookId);
      const firstUnlock = isUnlockOrder(pulled, seq);
      togglePull(anyIds(g, 6), anyValue(g));
      isUnlockOrder(anyIds(g, 4), anyIds(g, 4));
      togglePull([K], P);
      expect(togglePull(pulled, bookId)).toEqual(firstToggle);
      expect(isUnlockOrder(pulled, seq)).toBe(firstUnlock);
    }
  });

  it('readUnlocked makes exactly one getItem call, for the unlock key, and writes nothing', () => {
    const g = gen(10);
    for (let i = 0; i < RUNS; i += 1) {
      const seed = anySeed(g);
      const f = fakeStorage(seed);
      readUnlocked(f.storage);
      expect(f.calls).toEqual([['getItem', 'workshop-unlocked']]);
      expect(Object.fromEntries(f.data)).toEqual(seed);
    }
  });

  it('recordUnlock makes exactly one setItem call, for the unlock key', () => {
    const g = gen(11);
    for (let i = 0; i < RUNS; i += 1) {
      const f = fakeStorage(anySeed(g));
      recordUnlock(f.storage);
      expect(f.calls).toEqual([['setItem', 'workshop-unlocked', 'true']]);
    }
  });

  it('openStorage calls neither getItem nor setItem and returns the storage it was given', () => {
    const g = gen(12);
    for (let i = 0; i < 200; i += 1) {
      const f = fakeStorage(anySeed(g));
      expect(openStorage({ localStorage: f.storage })).toBe(f.storage);
      expect(f.calls).toEqual([]);
    }
  });

  it('isWorkshopPath, workshopNavLink and parseUnlockFlag give the same result on repeated calls', () => {
    const g = gen(13);
    for (let i = 0; i < RUNS; i += 1) {
      const value = anyValue(g);
      expect(typeof isWorkshopPath(value)).toBe('boolean');
      expect(isWorkshopPath(value)).toBe(isWorkshopPath(value));
      expect(workshopNavLink(value)).toEqual(workshopNavLink(value));
      expect(parseUnlockFlag(value)).toBe(parseUnlockFlag(value));
    }
  });
});

describe('Invariant 7: the stored flag', () => {
  it('parseUnlockFlag(x) is exactly x === "true"', () => {
    const g = gen(14);
    for (let i = 0; i < RUNS; i += 1) {
      const raw = g.bool() ? anyString(g) : anyValue(g);
      expect(parseUnlockFlag(raw), describeCase(raw)).toBe(raw === 'true');
    }
  });

  it('on a working storage, a successful recordUnlock makes readUnlocked true afterwards', () => {
    const g = gen(15);
    for (let i = 0; i < RUNS; i += 1) {
      const f = fakeStorage(anySeed(g));
      expect(recordUnlock(f.storage)).toBe(true);
      expect(readUnlocked(f.storage)).toBe(true);
    }
  });
});

describe('Invariant 8: the runtime nav link', () => {
  it('aria-current page, the active class and isWorkshopPath agree, and href and label never change', () => {
    const g = gen(16);
    const segments = ['workshop', 'Workshop', 'workshops', 'workshop-annex', 'reading', 'blog', 'clock', ''];
    for (let i = 0; i < RUNS; i += 1) {
      const pathname = g.pick<() => unknown>([
        () => anyValue(g),
        () => `/${g.pick(segments)}`,
        () => `/${g.pick(segments)}/`,
        () => `/${g.pick(segments)}/${g.pick(segments)}/`,
      ])();
      const link = workshopNavLink(pathname);
      const matched = isWorkshopPath(pathname);
      expect(link.href).toBe(WORKSHOP_HREF);
      expect(link.label).toBe(WORKSHOP_NAV_LABEL);
      expect(link.ariaCurrent === 'page', String(pathname)).toBe(matched);
      expect(link.className === 'site-nav__link is-active', String(pathname)).toBe(matched);
      expect(link.className === 'site-nav__link' || link.className === 'site-nav__link is-active').toBe(true);
      expect(link.ariaCurrent === 'page' || link.ariaCurrent === null).toBe(true);
    }
  });

  // isWorkshopPath doc: "/workshop/, /workshop, and descendants", case-sensitive, segment-bounded.
  it('every descendant of /workshop/ matches and every other first segment does not', () => {
    const g = gen(17);
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789-'.split('');
    for (let i = 0; i < RUNS; i += 1) {
      const segment = Array.from({ length: g.int(1, 10) }, () => g.pick(chars)).join('');
      const trailing = g.bool() ? '/' : '';
      expect(isWorkshopPath(`/workshop/${segment}${trailing}`), segment).toBe(true);
      if (segment !== 'workshop') {
        expect(isWorkshopPath(`/${segment}${trailing}`), segment).toBe(false);
      }
    }
  });
});

describe('Invariant 10: only the unlock flag is ever written', () => {
  it('recordUnlock writes exactly workshop-unlocked = true and touches no other key', () => {
    const g = gen(18);
    for (let i = 0; i < RUNS; i += 1) {
      const seed = anySeed(g);
      const f = fakeStorage(seed);
      recordUnlock(f.storage);
      expect(f.calls).toEqual([['setItem', UNLOCK_STORAGE_KEY, UNLOCK_STORAGE_VALUE]]);
      expect(Object.fromEntries(f.data)).toEqual({ ...seed, 'workshop-unlocked': 'true' });
    }
  });
});

// Invariant 9 is in workshop-unlock-constants.test.ts. Invariants 11–17 (DOM, CSS, listeners, built
// HTML, no-JS rendering, accessibility tree), the "only on a click after which isUnlockOrder is true"
// clause of Invariant 10, and the "no access to any global" clause of Invariant 6 are review-only per
// the spec: tests may not import .astro files, build, or use a DOM environment.
