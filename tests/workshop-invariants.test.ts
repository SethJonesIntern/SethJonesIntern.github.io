import { describe, expect, it } from 'vitest';

import {
  assertUniqueExhibitIds,
  exhibitAnchorId,
  isExhibitId,
  type Exhibit,
  type ExhibitComponent,
} from '../src/lib/workshop';

// Property tests for specs/workshop.spec.md "Invariants" 1-4.
//
// Invariants 5-11 are not encoded here:
//   5  render order equals EXHIBITS order - a page concern; the pure module has
//      no rendering entry point and no exhibit ships.
//   6  every emitted DOM id is unique - a page concern; its precondition
//      (assertUniqueExhibitIds rejecting repeats) is covered in
//      tests/workshop-unique-ids.test.ts.
//   7  the module contains no import/require/process/fs/Astro/import.meta -
//      the spec marks it review-only: reading the module text needs node:fs,
//      which the spec's test contract forbids.
//   8  adding an exhibit touches exactly two files - a repository-shape claim.
//   9  zero client-side JavaScript - verified by `npm run build`.
//   10 every CSS value is a semantic-token var(--...) reference - review-only.
//   11 no inbound link to /workshop/ and NAV_ITEMS still has seven entries -
//      verified against dist/ by review (Behavior 29-31); a test may not read
//      dist/ or src/consts.ts under this spec's test contract.
//
// fast-check is not a dependency and package.json is on this spec's
// "leave untouched" list, so, following tests/posts-invariants.test.ts,
// generation uses a deterministic seeded PRNG over hand-written domains.

/**
 * The kebab-case pattern exactly as the spec's Public API declares it. Written
 * out locally on purpose: the invariants compare the module's answers against
 * the spec, not against the module's own exported regex.
 */
const SPEC_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const stub: ExhibitComponent = () => null;

const exhibit = (id: string): Exhibit => ({ id, title: 'T', blurb: 'B', component: stub });

function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)] as T;
}

/** Characters spanning every case the spec's Behavior rows care about. */
const CHARS = [
  'a',
  'b',
  'z',
  '0',
  '9',
  '-',
  'A',
  'Z',
  ' ',
  '_',
  '.',
  '/',
  'ö',
  '时',
  '😀',
] as const;

/** Mixed strings: mostly invalid, with valid ones falling out by chance. */
function randomString(rng: () => number): string {
  const length = Math.floor(rng() * 9);
  let out = '';
  for (let i = 0; i < length; i += 1) out += pick(rng, CHARS);
  return out;
}

/** Strings guaranteed to satisfy SPEC_PATTERN, so the accept branch is hit. */
function randomValidId(rng: () => number): string {
  const runChars = ['a', 'b', 'z', '0', '9'] as const;
  const runs = 1 + Math.floor(rng() * 4);
  const parts: string[] = [];
  for (let r = 0; r < runs; r += 1) {
    const length = 1 + Math.floor(rng() * 5);
    let part = '';
    for (let i = 0; i < length; i += 1) part += pick(rng, runChars);
    parts.push(part);
  }
  return parts.join('-');
}

const NON_STRINGS: readonly unknown[] = [
  null,
  undefined,
  42,
  0,
  Number.NaN,
  true,
  false,
  {},
  [],
  ['clock'],
  { toString: () => 'clock' },
  Symbol('clock'),
  () => 'clock',
];

describe('Invariant 1: isExhibitId is exactly a string check plus the pattern', () => {
  it('agrees with the spec pattern on 500 generated strings', () => {
    const rng = makeRng(0x5eed);
    for (let i = 0; i < 500; i += 1) {
      const value = randomString(rng);
      expect(isExhibitId(value)).toBe(SPEC_PATTERN.test(value));
    }
  });

  it('agrees with the spec pattern on 200 generated valid ids', () => {
    const rng = makeRng(0xc10c);
    for (let i = 0; i < 200; i += 1) {
      const value = randomValidId(rng);
      expect(isExhibitId(value)).toBe(true);
    }
  });

  it('is false for every non-string value, including ones that stringify to a valid id', () => {
    for (const value of NON_STRINGS) {
      expect(isExhibitId(value)).toBe(false);
    }
  });

  it('never rescues a string by trimming, lowercasing, or normalising it', () => {
    const rng = makeRng(0x7a11);
    for (let i = 0; i < 200; i += 1) {
      const base = randomValidId(rng);
      expect(isExhibitId(` ${base}`)).toBe(false);
      expect(isExhibitId(`${base} `)).toBe(false);
      expect(isExhibitId(`${base}-`)).toBe(false);
      expect(isExhibitId(`-${base}`)).toBe(false);
      // An all-digit id is its own uppercase, so only assert the cased form
      // when uppercasing actually changes something.
      if (/[a-z]/.test(base)) {
        expect(isExhibitId(base.toUpperCase())).toBe(false);
      }
    }
  });
});

describe('Invariant 2: exhibitAnchorId either prefixes or throws, with no third outcome', () => {
  it('returns "exhibit-" + id for accepted ids and throws TypeError otherwise', () => {
    const rng = makeRng(0xbe11);
    for (let i = 0; i < 500; i += 1) {
      const value = i % 2 === 0 ? randomString(rng) : randomValidId(rng);
      if (SPEC_PATTERN.test(value)) {
        expect(exhibitAnchorId(value)).toBe(`exhibit-${value}`);
      } else {
        let caught: unknown = null;
        let returned: unknown = null;
        try {
          returned = exhibitAnchorId(value);
        } catch (error) {
          caught = error;
        }
        expect(returned).toBeNull();
        expect(caught).toBeInstanceOf(TypeError);
        expect((caught as Error).message).toBe(`exhibitAnchorId: invalid exhibit id "${value}"`);
      }
    }
  });

  it('never returns a fallback id for a rejected value', () => {
    const rejected = ['', ' ', '-', '--', 'Clock', 'a b', 'a_b', 'a/b', 'ö', '😀'];
    for (const value of rejected) {
      expect(() => exhibitAnchorId(value)).toThrow(TypeError);
    }
  });
});

describe('Invariant 3: isExhibitId and exhibitAnchorId are pure', () => {
  it('gives isExhibitId the same answer on repeated calls with the same input', () => {
    const rng = makeRng(0x9111);
    for (let i = 0; i < 300; i += 1) {
      const value = randomString(rng);
      const first = isExhibitId(value);
      expect(isExhibitId(value)).toBe(first);
      expect(isExhibitId(value)).toBe(first);
    }
  });

  it('gives exhibitAnchorId the same answer on repeated calls with the same valid id', () => {
    const rng = makeRng(0xa11e);
    for (let i = 0; i < 300; i += 1) {
      const value = randomValidId(rng);
      const first = exhibitAnchorId(value);
      expect(exhibitAnchorId(value)).toBe(first);
      expect(exhibitAnchorId(value)).toBe(`exhibit-${value}`);
    }
  });

  it('keeps throwing on a rejected id no matter how many times it is called', () => {
    for (let i = 0; i < 3; i += 1) {
      expect(() => exhibitAnchorId('Clock')).toThrow(TypeError);
    }
  });
});

describe('Invariant 4: assertUniqueExhibitIds returns undefined or throws, and never mutates', () => {
  it('leaves length, order and element identity untouched on 300 generated registries', () => {
    const rng = makeRng(0xd00d);
    const idPool = ['a', 'b', 'c', 'd'] as const;
    for (let i = 0; i < 300; i += 1) {
      const size = Math.floor(rng() * 7);
      const entries: Exhibit[] = [];
      for (let e = 0; e < size; e += 1) entries.push(exhibit(pick(rng, idPool)));
      const before = [...entries];
      const beforeIds = entries.map((entry) => entry.id);

      let caught: unknown = null;
      let returned: unknown = 'not-called';
      try {
        returned = assertUniqueExhibitIds(entries);
      } catch (error) {
        caught = error;
      }

      expect(entries).toHaveLength(before.length);
      expect(entries.map((entry) => entry.id)).toEqual(beforeIds);
      for (let index = 0; index < before.length; index += 1) {
        expect(entries[index]).toBe(before[index]);
      }
      if (caught === null) {
        expect(returned).toBeUndefined();
      } else {
        expect(caught).toBeInstanceOf(TypeError);
      }
    }
  });

  it('throws exactly when the generated registry repeats an id', () => {
    const rng = makeRng(0xfeed);
    const idPool = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 300; i += 1) {
      const size = Math.floor(rng() * 6);
      const ids: string[] = [];
      for (let e = 0; e < size; e += 1) ids.push(pick(rng, idPool));
      const entries = ids.map((id) => exhibit(id));

      const firstRepeat = ids.find((id, index) => ids.indexOf(id) !== index) ?? null;

      if (firstRepeat === null) {
        expect(assertUniqueExhibitIds(entries)).toBeUndefined();
      } else {
        let caught: unknown = null;
        try {
          assertUniqueExhibitIds(entries);
        } catch (error) {
          caught = error;
        }
        expect(caught).toBeInstanceOf(TypeError);
        expect((caught as Error).message).toBe(
          `assertUniqueExhibitIds: duplicate exhibit id "${firstRepeat}"`,
        );
      }
    }
  });

  it('reads nothing on an entry beyond its id', () => {
    const trap = (id: string): Exhibit => ({
      id,
      get title(): string {
        throw new Error('assertUniqueExhibitIds read `title`');
      },
      get blurb(): string {
        throw new Error('assertUniqueExhibitIds read `blurb`');
      },
      get component(): ExhibitComponent {
        throw new Error('assertUniqueExhibitIds read `component`');
      },
    });

    expect(assertUniqueExhibitIds([trap('a'), trap('b'), trap('c')])).toBeUndefined();
  });
});
