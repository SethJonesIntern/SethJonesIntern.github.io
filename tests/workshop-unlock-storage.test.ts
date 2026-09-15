import { describe, expect, it } from 'vitest';
import {
  openStorage,
  parseUnlockFlag,
  readUnlocked,
  recordUnlock,
  type UnlockStorage,
} from '../src/lib/workshop-unlock';

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

describe('parseUnlockFlag', () => {
  // Row 40
  it('parses the exact string true as unlocked', () => {
    expect(parseUnlockFlag('true')).toBe(true);
  });

  // Row 41
  it.each<[string]>([['TRUE'], ['True'], [' true'], ['true '], ['1'], ['yes'], ['false'], [''], ['"true"']])(
    'treats the string %j as locked',
    (raw) => {
      expect(parseUnlockFlag(raw)).toBe(false);
    },
  );

  // Row 42
  it.each<[unknown]>([[null], [undefined], [true], [1], [{}]])('treats the non-string %j as locked', (raw) => {
    expect(parseUnlockFlag(raw)).toBe(false);
  });
});

describe('openStorage', () => {
  // Row 43
  it('returns the host localStorage object itself when it has getItem and setItem', () => {
    const { storage } = fakeStorage();
    expect(openStorage({ localStorage: storage })).toBe(storage);
  });

  // Row 44
  it.each<[unknown]>([[null], [undefined], [42], ['x'], [{}]])(
    'returns null for a host (%j) without a localStorage object',
    (host) => {
      expect(openStorage(host)).toBeNull();
    },
  );

  // Row 45
  it('returns null when reading localStorage throws', () => {
    const host = {
      get localStorage(): never {
        throw new Error('SecurityError');
      },
    };
    expect(openStorage(host)).toBeNull();
  });

  // Row 46
  it.each<[string, unknown]>([
    ['null', null],
    ['an empty object', {}],
    ['an object with only getItem', { getItem: () => null }],
    ['non-callable methods', { getItem: 1, setItem: 2 }],
  ])('returns null when localStorage is %s', (_label, localStorage) => {
    expect(openStorage({ localStorage })).toBeNull();
  });
});

describe('readUnlocked', () => {
  // Row 47
  it('returns false for null storage', () => {
    expect(readUnlocked(null)).toBe(false);
  });

  // Row 47
  it('reads the unlock key exactly once and returns false when it is absent', () => {
    const f = fakeStorage();
    expect(readUnlocked(f.storage)).toBe(false);
    expect(f.calls).toEqual([['getItem', 'workshop-unlocked']]);
  });

  // Row 48
  it('returns true when the unlock key holds the string true', () => {
    expect(readUnlocked(fakeStorage({ 'workshop-unlocked': 'true' }).storage)).toBe(true);
  });

  // Row 48
  it.each<[string]>([['false'], ['1'], ['TRUE']])('returns false when the unlock key holds %j', (value) => {
    expect(readUnlocked(fakeStorage({ 'workshop-unlocked': value }).storage)).toBe(false);
  });

  // Row 48
  it('ignores other keys holding true', () => {
    expect(readUnlocked(fakeStorage({ workshop: 'true' }).storage)).toBe(false);
  });

  // Row 49
  it('returns false when getItem throws', () => {
    expect(
      readUnlocked({
        getItem() {
          throw new Error('x');
        },
        setItem() {},
      }),
    ).toBe(false);
  });

  // readUnlocked is parseUnlockFlag(getItem(...)); Invariant 7: parseUnlockFlag(x) === (x === 'true').
  it.each<[unknown]>([[true], [1]])('returns false when getItem returns the non-string %j', (value) => {
    expect(readUnlocked({ getItem: () => value as string, setItem: () => undefined })).toBe(false);
  });
});

describe('recordUnlock', () => {
  // Row 50
  it('returns false for null storage', () => {
    expect(recordUnlock(null)).toBe(false);
  });

  // Row 50
  it('writes the flag once, leaves other keys, does not read back, and returns true', () => {
    const f = fakeStorage({ other: 'x' });
    expect(recordUnlock(f.storage)).toBe(true);
    expect(f.calls).toEqual([['setItem', 'workshop-unlocked', 'true']]);
    expect(f.data.get('other')).toBe('x');
  });

  // Row 51
  it('returns false when setItem throws', () => {
    expect(
      recordUnlock({
        getItem: () => null,
        setItem() {
          throw new Error('QuotaExceededError');
        },
      }),
    ).toBe(false);
  });
});
