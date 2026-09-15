import { describe, expect, it } from 'vitest';

import {
  assertVariedSpines,
  bookAnchorId,
  booksOnShelf,
  groupByShelf,
  isBookId,
  isShelf,
  isSpineVariant,
  type Book,
  type Shelf,
  type SpineVariant,
} from '../src/lib/reading';
import { READING_LIST } from '../src/lib/reading-books';

// Property tests for specs/reading.spec.md "Invariants" 1-7.
//
// Invariants 8-16 are not encoded here:
//   8  adding a book touches exactly one file - a repository-shape claim.
//   9  WCAG AA contrast of every spine pair - the spec's Non-goals forbid
//      "contrast computed at runtime"; the literal ratios are review criteria.
//   10 every CSS colour is a semantic token and every length a primitive -
//      a claim about src/pages/reading.astro, which a test may not import.
//   11 each new token declared twice (light + dark) - a claim about
//      src/styles/tokens.css, which a test may not import.
//   12 one hover rule, no per-spine override - CSS, Behavior 67, review-only.
//   13 zero client-side JavaScript - Behavior 70, verified against dist/.
//   14 the rotation changes no semantics - rendered DOM, Behavior 54-58.
//   15 scrollWidth never exceeds the viewport - Behavior 69, a browser check.
//   16 NAV_ITEMS holds /reading/ once at index 6 - the spec's test contract
//      forbids importing src/consts.ts; Behavior 52 is the review criterion.
//
// Invariant 3's stronger half (every block of four on a shelf uses all four
// variants) is asserted against the shipped data in
// tests/reading-varied-spines.test.ts; the spec calls it an authoring
// convention "checked by review", so it is not generated over here.
//
// Boundaries rows deliberately left untested across the whole reading suite,
// with the spec's reason:
//   empty READING_LIST, page state - "the page state is unreachable, do not
//     test it"; only groupByShelf([]) is tested (reading-grouping.test.ts).
//   empty title/author at the page level - "Undefined at the page level".
//   zero / negative / numeric inputs - "No function in this feature takes a
//     number. Undefined, do not test."
//   max - shelf length on screen, max - title length on a spine - "Review-only".
//   null / undefined / non-array to assertUniqueBookIds, assertVariedSpines,
//     booksOnShelf, groupByShelf - "Undefined, do not test".
//   viewport minimum below 320px - "Undefined, do not test".
//   viewport maximum, prefers-reduced-motion, JavaScript disabled - browser
//     checks (Behavior 68-70), outside a Vitest unit suite under this spec's
//     test contract.
//   forced-colors, print stylesheet, RTL - "Undefined, do not test".
//   touch devices with no hover - "Undefined, do not test".
//
// fast-check is not a dependency and package.json is on this spec's
// "leave untouched" list, so, following tests/workshop-invariants.test.ts,
// generation uses a deterministic seeded PRNG over hand-written domains.

/**
 * The spec's literals, written out locally on purpose: these properties compare
 * the module's answers against the spec, not against the module's own exports.
 */
const SPEC_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SPEC_SHELVES = ['technical', 'fiction'] as const;
const SPEC_SPINE_VARIANTS = ['clay', 'teal', 'ink', 'sand'] as const;

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
const CHARS = ['a', 'b', 'z', '0', '9', '-', 'A', 'Z', ' ', '_', '.', '/', 'ö', '书', '😀'] as const;

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

const TITLES = [
  'Fire & Blood',
  'The Titan’s Curse',
  'Ω 😀',
  'A',
  'Machine Learning in Production: From Models to Products',
] as const;

function randomBook(rng: () => number, id: string): Book {
  return {
    id,
    title: pick(rng, TITLES),
    author: 'A',
    shelf: pick(rng, SPEC_SHELVES) as Shelf,
    spine: pick(rng, SPEC_SPINE_VARIANTS) as SpineVariant,
  };
}

function randomBooks(rng: () => number, size: number): Book[] {
  const out: Book[] = [];
  for (let i = 0; i < size; i += 1) out.push(randomBook(rng, `b${i}`));
  return out;
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
  ['fire'],
  { toString: () => 'fire' },
  Symbol('fire'),
  () => 'fire',
];

describe('Invariant 1: the three guards are exactly a string check plus a membership test', () => {
  it('makes isBookId agree with the spec pattern on 500 generated strings', () => {
    const rng = makeRng(0x5eed);
    for (let i = 0; i < 500; i += 1) {
      const value = randomString(rng);
      expect(isBookId(value)).toBe(SPEC_PATTERN.test(value));
    }
  });

  it('makes isBookId true for 200 generated kebab-case ids', () => {
    const rng = makeRng(0xb00c);
    for (let i = 0; i < 200; i += 1) {
      expect(isBookId(randomValidId(rng))).toBe(true);
    }
  });

  it('never rescues a string by trimming, lowercasing, or normalising it', () => {
    const rng = makeRng(0x7a11);
    for (let i = 0; i < 200; i += 1) {
      const base = randomValidId(rng);
      expect(isBookId(` ${base}`)).toBe(false);
      expect(isBookId(`${base} `)).toBe(false);
      expect(isBookId(`${base}-`)).toBe(false);
      expect(isBookId(`-${base}`)).toBe(false);
      // An all-digit id is its own uppercase, so only assert the cased form
      // when uppercasing actually changes something.
      if (/[a-z]/.test(base)) {
        expect(isBookId(base.toUpperCase())).toBe(false);
      }
    }
  });

  it('makes isBookId false for every non-string, including ones that stringify to a valid id', () => {
    for (const value of NON_STRINGS) {
      expect(isBookId(value)).toBe(false);
    }
  });

  it('makes isShelf agree with membership of the spec shelf list on 400 generated strings', () => {
    const rng = makeRng(0x5be1);
    const domain = ['technical', 'fiction', 'Technical', 'poetry', '', ' technical', 'FICTION'];
    for (let i = 0; i < 400; i += 1) {
      const value = i % 2 === 0 ? pick(rng, domain) : randomString(rng);
      const expected = (SPEC_SHELVES as readonly string[]).includes(value);
      expect(isShelf(value)).toBe(expected);
    }
  });

  it('makes isShelf false for every non-string', () => {
    for (const value of NON_STRINGS) {
      expect(isShelf(value)).toBe(false);
    }
  });

  it('makes isSpineVariant agree with membership of the spec variant list on 400 strings', () => {
    const rng = makeRng(0x5217);
    const domain = ['clay', 'teal', 'ink', 'sand', 'Clay', 'gold', '', ' ink', 'SAND'];
    for (let i = 0; i < 400; i += 1) {
      const value = i % 2 === 0 ? pick(rng, domain) : randomString(rng);
      const expected = (SPEC_SPINE_VARIANTS as readonly string[]).includes(value);
      expect(isSpineVariant(value)).toBe(expected);
    }
  });

  it('makes isSpineVariant false for every non-string', () => {
    for (const value of NON_STRINGS) {
      expect(isSpineVariant(value)).toBe(false);
    }
  });
});

describe('Invariant 2: bookAnchorId either prefixes or throws, with no third outcome', () => {
  it('returns "book-" + id for accepted ids and throws TypeError otherwise', () => {
    const rng = makeRng(0xbe11);
    for (let i = 0; i < 500; i += 1) {
      const value = i % 2 === 0 ? randomString(rng) : randomValidId(rng);
      if (SPEC_PATTERN.test(value)) {
        expect(bookAnchorId(value)).toBe(`book-${value}`);
      } else {
        let caught: unknown = null;
        let returned: unknown = null;
        try {
          returned = bookAnchorId(value);
        } catch (error) {
          caught = error;
        }
        expect(returned).toBeNull();
        expect(caught).toBeInstanceOf(TypeError);
        expect((caught as Error).message).toBe(`bookAnchorId: invalid book id "${value}"`);
      }
    }
  });

  it('never returns a fallback id for a rejected value', () => {
    const rejected = ['', ' ', '-', '--', 'Harry', 'a b', 'a_b', 'a/b', 'ö', '😀'];
    for (const value of rejected) {
      expect(() => bookAnchorId(value)).toThrow(TypeError);
    }
  });
});

describe('Invariant 3: no two consecutive books on a shelf share a spine variant', () => {
  /**
   * The spec's rule, restated locally: the first book whose `spine` equals its
   * predecessor's, or null. Reads the generated fixture only; it never calls
   * the module under test.
   */
  function specFirstRepeat(books: readonly Book[]): Book | null {
    for (let i = 1; i < books.length; i += 1) {
      const previous = books[i - 1] as Book;
      const current = books[i] as Book;
      if (current.spine === previous.spine) return current;
    }
    return null;
  }

  it('throws exactly when a consecutive pair repeats, on 500 generated shelves', () => {
    const rng = makeRng(0x591e);
    for (let i = 0; i < 500; i += 1) {
      const xs = randomBooks(rng, Math.floor(rng() * 9));
      const offender = specFirstRepeat(xs);
      let caught: unknown = null;
      let returned: unknown = 'not-called';
      try {
        returned = assertVariedSpines(xs);
      } catch (error) {
        caught = error;
      }
      if (offender === null) {
        expect(caught).toBeNull();
        expect(returned).toBeUndefined();
      } else {
        expect(caught).toBeInstanceOf(TypeError);
        expect((caught as Error).message).toBe(
          `assertVariedSpines: "${offender.id}" repeats the spine variant "${offender.spine}"`,
        );
      }
    }
  });

  it('accepts every shelf built by cycling the four variants, up to 40 books', () => {
    for (let size = 0; size <= 40; size += 1) {
      const xs: Book[] = [];
      for (let i = 0; i < size; i += 1) {
        xs.push({
          id: `b${i}`,
          title: 'T',
          author: 'A',
          shelf: 'technical',
          spine: SPEC_SPINE_VARIANTS[i % 4] as SpineVariant,
        });
      }
      expect(assertVariedSpines(xs)).toBeUndefined();
    }
  });

  it('rejects a shelf of any length whose first two books share a variant', () => {
    for (let size = 2; size <= 20; size += 1) {
      const xs: Book[] = [];
      for (let i = 0; i < size; i += 1) {
        xs.push({
          id: `b${i}`,
          title: 'T',
          author: 'A',
          shelf: 'technical',
          spine: i < 2 ? 'clay' : (SPEC_SPINE_VARIANTS[i % 4] as SpineVariant),
        });
      }
      let caught: unknown = null;
      try {
        assertVariedSpines(xs);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(TypeError);
      expect((caught as Error).message).toBe(
        'assertVariedSpines: "b1" repeats the spine variant "clay"',
      );
    }
  });

  it('leaves every shipped shelf group free of a consecutive repeat', () => {
    for (const group of groupByShelf(READING_LIST)) {
      expect(specFirstRepeat(group.books)).toBeNull();
    }
  });
});

describe('Invariant 4: the helpers are pure and never mutate or alias their input', () => {
  it('gives booksOnShelf the same answer on repeated calls with the same input', () => {
    const rng = makeRng(0x9a11);
    for (let i = 0; i < 200; i += 1) {
      const xs = randomBooks(rng, Math.floor(rng() * 6));
      const shelf = pick(rng, SPEC_SHELVES) as Shelf;
      const first = booksOnShelf(xs, shelf);
      expect(booksOnShelf(xs, shelf)).toEqual(first);
      if (first.length > 0) {
        // A shared empty array would not prove aliasing, so only the non-empty
        // case asserts freshness here.
        expect(booksOnShelf(xs, shelf)).not.toBe(first);
      }
    }
  });

  it('leaves the input array of booksOnShelf untouched', () => {
    const rng = makeRng(0xa11a);
    for (let i = 0; i < 200; i += 1) {
      const xs = randomBooks(rng, Math.floor(rng() * 6));
      const before = [...xs];
      booksOnShelf(xs, pick(rng, SPEC_SHELVES) as Shelf);
      expect(xs).toHaveLength(before.length);
      for (let index = 0; index < before.length; index += 1) {
        expect(xs[index]).toBe(before[index]);
      }
    }
  });

  it('returns a fresh array from booksOnShelf even when every book matches', () => {
    const rng = makeRng(0xf3e5);
    for (let i = 0; i < 100; i += 1) {
      const xs = randomBooks(rng, 1 + Math.floor(rng() * 4)).map((b) => ({
        ...b,
        shelf: 'technical' as Shelf,
      }));
      expect(booksOnShelf(xs, 'technical')).not.toBe(xs);
    }
  });

  it('leaves the input array of groupByShelf untouched', () => {
    const rng = makeRng(0xd00d);
    for (let i = 0; i < 200; i += 1) {
      const xs = randomBooks(rng, Math.floor(rng() * 7));
      const before = [...xs];
      groupByShelf(xs);
      expect(xs).toHaveLength(before.length);
      for (let index = 0; index < before.length; index += 1) {
        expect(xs[index]).toBe(before[index]);
      }
    }
  });

  it('gives groupByShelf the same shape on repeated calls with the same input', () => {
    const rng = makeRng(0xc0de);
    for (let i = 0; i < 200; i += 1) {
      const xs = randomBooks(rng, Math.floor(rng() * 7));
      const first = groupByShelf(xs);
      const second = groupByShelf(xs);
      expect(second.map((g) => [g.shelf, g.label, g.books.map((b) => b.id)])).toEqual(
        first.map((g) => [g.shelf, g.label, g.books.map((b) => b.id)]),
      );
      if (first.length > 0) {
        expect(second).not.toBe(first);
      }
    }
  });

  it('leaves the input array of assertVariedSpines untouched', () => {
    const rng = makeRng(0x5a1e);
    for (let i = 0; i < 200; i += 1) {
      // Build a run-free shelf so the call returns rather than throws.
      const size = Math.floor(rng() * 6);
      const xs: Book[] = [];
      for (let j = 0; j < size; j += 1) {
        xs.push({
          id: `b${j}`,
          title: 'T',
          author: 'A',
          shelf: 'technical',
          spine: SPEC_SPINE_VARIANTS[j % 4] as SpineVariant,
        });
      }
      const before = [...xs];
      const beforeSpines = xs.map((b) => b.spine);
      assertVariedSpines(xs);
      expect(xs).toHaveLength(before.length);
      expect(xs.map((b) => b.spine)).toEqual(beforeSpines);
      for (let index = 0; index < before.length; index += 1) {
        expect(xs[index]).toBe(before[index]);
      }
    }
  });
});

describe('Invariant 5: groupByShelf partitions the input in SHELVES order', () => {
  it('emits groups in the spec shelf order', () => {
    const rng = makeRng(0x6009);
    for (let i = 0; i < 300; i += 1) {
      const xs = randomBooks(rng, Math.floor(rng() * 8));
      const shelves = groupByShelf(xs).map((g) => g.shelf);
      const expected = SPEC_SHELVES.filter((shelf) => xs.some((b) => b.shelf === shelf));
      expect(shelves).toEqual(expected);
    }
  });

  it('emits a group only when that shelf holds at least one book', () => {
    const rng = makeRng(0x7009);
    for (let i = 0; i < 300; i += 1) {
      const xs = randomBooks(rng, Math.floor(rng() * 8));
      for (const group of groupByShelf(xs)) {
        expect(group.books.length).toBeGreaterThan(0);
      }
    }
  });

  it('labels each group with the spec heading for its shelf', () => {
    const rng = makeRng(0x8009);
    const specLabels: Record<string, string> = { technical: 'Technical', fiction: 'Fiction' };
    for (let i = 0; i < 300; i += 1) {
      const xs = randomBooks(rng, Math.floor(rng() * 8));
      for (const group of groupByShelf(xs)) {
        expect(group.label).toBe(specLabels[group.shelf]);
      }
    }
  });

  it('puts every book on the group matching its own shelf', () => {
    const rng = makeRng(0x9009);
    for (let i = 0; i < 300; i += 1) {
      const xs = randomBooks(rng, Math.floor(rng() * 8));
      for (const group of groupByShelf(xs)) {
        for (const b of group.books) {
          expect(b.shelf).toBe(group.shelf);
        }
      }
    }
  });

  it('contains every input book exactly once across all groups', () => {
    const rng = makeRng(0xa009);
    for (let i = 0; i < 300; i += 1) {
      const xs = randomBooks(rng, Math.floor(rng() * 8));
      const flattened = groupByShelf(xs).flatMap((g) => [...g.books]);
      expect(flattened).toHaveLength(xs.length);
      for (const b of xs) {
        expect(flattened.filter((other) => other === b)).toHaveLength(1);
      }
    }
  });
});

describe('Invariant 6: every shipped id matches the pattern and is unique', () => {
  it('matches the spec pattern for every entry in READING_LIST', () => {
    for (const b of READING_LIST) {
      expect(SPEC_PATTERN.test(b.id)).toBe(true);
    }
  });

  it('repeats no id in READING_LIST', () => {
    const seen = READING_LIST.map((b) => b.id);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('yields a distinct DOM id per entry of READING_LIST', () => {
    const anchors = READING_LIST.map((b) => bookAnchorId(b.id));
    expect(new Set(anchors).size).toBe(18);
  });
});

describe('Invariant 7: rendered order equals declared order, with no sort anywhere', () => {
  it('keeps each shelf group in input order for 300 generated inputs', () => {
    const rng = makeRng(0xb009);
    for (let i = 0; i < 300; i += 1) {
      const xs = randomBooks(rng, Math.floor(rng() * 8));
      for (const group of groupByShelf(xs)) {
        const expected = xs.filter((b) => b.shelf === group.shelf).map((b) => b.id);
        expect(group.books.map((b) => b.id)).toEqual(expected);
      }
    }
  });

  it('keeps booksOnShelf in input order for 300 generated inputs', () => {
    const rng = makeRng(0xc009);
    for (let i = 0; i < 300; i += 1) {
      const xs = randomBooks(rng, Math.floor(rng() * 8));
      const shelf = pick(rng, SPEC_SHELVES) as Shelf;
      const expected = xs.filter((b) => b.shelf === shelf).map((b) => b.id);
      expect(booksOnShelf(xs, shelf).map((b) => b.id)).toEqual(expected);
    }
  });

  it('emits fiction after technical even when every fiction book is declared first', () => {
    const xs: Book[] = [
      { id: 'f1', title: 'T', author: 'A', shelf: 'fiction', spine: 'clay' },
      { id: 'f2', title: 'T', author: 'A', shelf: 'fiction', spine: 'teal' },
      { id: 't1', title: 'T', author: 'A', shelf: 'technical', spine: 'ink' },
    ];
    expect(groupByShelf(xs).map((g) => g.shelf)).toEqual(['technical', 'fiction']);
  });
});
