/**
 * Property tests for the Invariants of specs/workshop-unlock.spec.md.
 *
 * The spec forbids new dependencies and names no property-testing library, so inputs come from a
 * small seeded PRNG (mulberry32) defined here. Each property runs RUNS generated cases with a fixed
 * seed, so failures reproduce. Oracles are written from the spec's wording, never from the module.
 */
import { describe, expect, it } from 'vitest';
import {
  UNLOCK_STORAGE_KEY,
  UNLOCK_STORAGE_VALUE,
  WORKSHOP_HREF,
  WORKSHOP_NAV_LABEL,
  isPointerClick,
  isWorkshopPath,
  openStorage,
  parseUnlockFlag,
  pullBook,
  readUnlocked,
  recordUnlock,
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

const ID_POOL = ['a', 'b', 'c', 'd', 'e', K, P, C, 'fire-and-blood', 'mythical-man-month'] as const;

const anyString = (g: Gen): string => {
  if (g.bool()) {
    return g.pick([...ID_POOL, 'true', 'TRUE', ' true', 'true ', '', 'workshop', '/workshop/']);
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

/** A sequence of distinct ids, length in [minLen, maxLen]. */
const distinctSequence = (g: Gen, minLen: number, maxLen: number): string[] => {
  const pool = [...ID_POOL];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = g.int(0, i);
    [pool[i], pool[j]] = [pool[j] as (typeof ID_POOL)[number], pool[i] as (typeof ID_POOL)[number]];
  }
  return pool.slice(0, g.int(minLen, maxLen));
};

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

/** Pulls `ids` in order from `start`; returns each pull's `unlocked`. */
const run = (ids: readonly unknown[], sequence?: readonly string[], start = 0): boolean[] => {
  let progress = start;
  return ids.map((id) => {
    const result = pullBook(progress, id, sequence);
    progress = result.progress;
    return result.unlocked;
  });
};

describe('Invariant 1: pullBook result shape and progress range', () => {
  it('returns exactly progress and unlocked, an in-range integer progress, and progress 0 when unlocked', () => {
    const g = gen(1);
    for (let i = 0; i < RUNS; i += 1) {
      const seq = distinctSequence(g, 0, 5);
      const progress = anyNumber(g);
      const bookId = seq.length > 0 && g.bool() ? g.pick(seq) : anyValue(g);
      const result = pullBook(progress, bookId, seq);
      const context = { seq, progress, bookId, result };
      expect(Object.keys(result).sort(), JSON.stringify(context)).toEqual(['progress', 'unlocked']);
      expect(Number.isInteger(result.progress), JSON.stringify(context)).toBe(true);
      expect(result.progress, JSON.stringify(context)).toBeGreaterThanOrEqual(0);
      expect(result.progress, JSON.stringify(context)).toBeLessThan(Math.max(seq.length, 1));
      expect(typeof result.unlocked, JSON.stringify(context)).toBe('boolean');
      if (result.unlocked) {
        expect(result.progress, JSON.stringify(context)).toBe(0);
      }
    }
  });

  // Boundary "sequence with repeated ids" is undefined, so generated sequences are always distinct.
});

describe('Invariant 2: what can unlock', () => {
  it('unlocks only on a non-empty sequence and only when the pulled id is its last key', () => {
    const g = gen(2);
    for (let i = 0; i < RUNS; i += 1) {
      const seq = distinctSequence(g, 0, 5);
      const progress = anyNumber(g);
      const bookId = seq.length > 0 && g.bool() ? g.pick(seq) : anyValue(g);
      if (pullBook(progress, bookId, seq).unlocked) {
        expect(seq.length).toBeGreaterThan(0);
        expect(bookId).toBe(seq[seq.length - 1]);
      }
    }
  });

  it('a book id not in the sequence always yields progress 0, locked', () => {
    const g = gen(3);
    for (let i = 0; i < RUNS; i += 1) {
      const seq = distinctSequence(g, 0, 5);
      const bookId = anyValue(g);
      if ((seq as readonly unknown[]).includes(bookId)) continue;
      expect(pullBook(anyNumber(g), bookId, seq), JSON.stringify({ seq, bookId })).toEqual({
        progress: 0,
        unlocked: false,
      });
    }
  });
});

describe('Invariant 3: the whole sequence in order unlocks from any state', () => {
  it('pulling a distinct sequence in order unlocks on its last pull and no earlier one, from any starting progress', () => {
    const g = gen(4);
    for (let i = 0; i < RUNS; i += 1) {
      const seq = distinctSequence(g, 1, 5);
      const start = anyNumber(g);
      const expected = seq.map((_, index) => index === seq.length - 1);
      expect(run(seq, seq, start), JSON.stringify({ seq, start })).toEqual(expected);
    }
  });

  it('on the shipped sequence, a pull unlocks exactly when it is Prisoner of Azkaban immediately after Clash of Kings', () => {
    const g = gen(5);
    const clicks: readonly unknown[] = [K, P, C, 'fire-and-blood', 'not-a-spine', undefined, K, P];
    for (let i = 0; i < RUNS; i += 1) {
      const ids = Array.from({ length: g.int(0, 12) }, () => g.pick(clicks));
      const expected = ids.map((id, index) => index > 0 && ids[index - 1] === K && id === P);
      expect(run(ids), JSON.stringify(ids)).toEqual(expected);
    }
  });
});

describe('Invariant 4: isPointerClick', () => {
  it('is true exactly for integers >= 1 and false for every non-number', () => {
    const g = gen(6);
    for (let i = 0; i < RUNS; i += 1) {
      const detail = g.bool() ? anyNumber(g) : anyValue(g);
      const expected = typeof detail === 'number' && Number.isInteger(detail) && detail >= 1;
      expect(isPointerClick(detail), String(detail)).toBe(expected);
    }
  });
});

describe('Invariant 5: purity', () => {
  it('pullBook gives the same result for the same input, interleaved with other pulls, without mutating a frozen sequence', () => {
    const g = gen(7);
    for (let i = 0; i < RUNS; i += 1) {
      const original = distinctSequence(g, 0, 5);
      const seq = Object.freeze([...original]);
      const progress = anyNumber(g);
      const bookId = seq.length > 0 && g.bool() ? g.pick(seq) : anyValue(g);
      const first = pullBook(progress, bookId, seq);
      pullBook(anyNumber(g), g.pick(ID_POOL), distinctSequence(g, 0, 5));
      pullBook(0, K);
      const second = pullBook(progress, bookId, seq);
      expect(second).toEqual(first);
      expect(seq).toEqual(original);
    }
  });

  it('pullBook is deterministic on the shipped combination regardless of earlier calls', () => {
    const g = gen(8);
    for (let i = 0; i < 200; i += 1) {
      pullBook(anyNumber(g), anyValue(g), distinctSequence(g, 0, 5));
      expect(pullBook(1, P)).toEqual({ progress: 0, unlocked: true });
      expect(pullBook(0, K)).toEqual({ progress: 1, unlocked: false });
    }
  });

  it('readUnlocked makes exactly one getItem call, for the unlock key, and writes nothing', () => {
    const g = gen(9);
    for (let i = 0; i < RUNS; i += 1) {
      const seed = anySeed(g);
      const f = fakeStorage(seed);
      readUnlocked(f.storage);
      expect(f.calls).toEqual([['getItem', UNLOCK_STORAGE_KEY]]);
      expect(Object.fromEntries(f.data)).toEqual(seed);
    }
  });

  it('openStorage calls neither getItem nor setItem and returns the storage it was given', () => {
    const g = gen(10);
    for (let i = 0; i < 200; i += 1) {
      const f = fakeStorage(anySeed(g));
      expect(openStorage({ localStorage: f.storage })).toBe(f.storage);
      expect(f.calls).toEqual([]);
    }
  });

  it('isWorkshopPath, workshopNavLink and parseUnlockFlag give the same result on repeated calls', () => {
    const g = gen(11);
    for (let i = 0; i < RUNS; i += 1) {
      const value = anyValue(g);
      expect(isWorkshopPath(value)).toBe(isWorkshopPath(value));
      expect(workshopNavLink(value)).toEqual(workshopNavLink(value));
      expect(parseUnlockFlag(value)).toBe(parseUnlockFlag(value));
      expect(typeof isWorkshopPath(value)).toBe('boolean');
    }
  });
});

describe('Invariant 6: the stored flag', () => {
  it('parseUnlockFlag(x) is exactly x === UNLOCK_STORAGE_VALUE', () => {
    const g = gen(12);
    for (let i = 0; i < RUNS; i += 1) {
      const raw = g.bool() ? anyString(g) : anyValue(g);
      expect(parseUnlockFlag(raw), JSON.stringify(raw)).toBe(raw === 'true');
    }
  });

  it('on a working storage, a successful recordUnlock makes readUnlocked true afterwards', () => {
    const g = gen(13);
    for (let i = 0; i < RUNS; i += 1) {
      const f = fakeStorage(anySeed(g));
      expect(recordUnlock(f.storage)).toBe(true);
      expect(readUnlocked(f.storage)).toBe(true);
    }
  });
});

describe('Invariant 7: the runtime nav link', () => {
  it('aria-current page, the active class and isWorkshopPath agree, and href and label never change', () => {
    const g = gen(14);
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

  it('every descendant of /workshop/ matches and every other first segment does not', () => {
    const g = gen(15);
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

describe('Invariant 9: only the completed flag is ever written', () => {
  it('recordUnlock writes exactly UNLOCK_STORAGE_KEY = UNLOCK_STORAGE_VALUE once and touches no other key', () => {
    const g = gen(16);
    for (let i = 0; i < RUNS; i += 1) {
      const seed = anySeed(g);
      const f = fakeStorage(seed);
      recordUnlock(f.storage);
      expect(f.calls).toEqual([['setItem', UNLOCK_STORAGE_KEY, UNLOCK_STORAGE_VALUE]]);
      expect(Object.fromEntries(f.data)).toEqual({ ...seed, 'workshop-unlocked': 'true' });
    }
  });
});

// Invariants 8 is in workshop-unlock-constants.test.ts. Invariants 10–15 (DOM, CSS, listeners, built
// HTML, no-JS rendering, accessibility tree) and the "no access to any global" clause of Invariant 5
// are review-only per the spec: tests may not import .astro files, build, or use a DOM environment.
