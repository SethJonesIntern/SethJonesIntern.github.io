import { describe, expect, it } from 'vitest';

import {
  compareRepos,
  filterRepos,
  isShowcaseRepo,
  parseRepoList,
  rankRepos,
  repoMetaLine,
  selectShowcaseRepos,
  toShowcaseRepo,
  type RepoInput,
} from '../src/lib/github';

// Property tests for spec section "Invariants" 1-8.
//
// Invariant 9 ("src/lib/github.ts contains no import, no require, no fetch, and
// no reference to process, fs, Astro, or import.meta") is NOT tested here: the
// spec itself marks it "Review-only, not testable from the suite". Asserting it
// at runtime would need node:fs, and the module under test exports nothing that
// exposes its own source text.
//
// No fast-check: the project has no property-testing dependency and the spec's
// test setup pins the suite to "import only src/lib/github.ts and pass object
// literals". Generation therefore uses the same deterministic seeded PRNG plus
// exhaustive-small-domain style already used by tests/projects-invariants.test.ts,
// which gives reproducible counterexamples without adding a package.

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
  return values[Math.floor(rng() * values.length)];
}

const NAMES = [
  'a',
  'b',
  'x',
  'dup',
  'Zebra',
  'apple',
  'honeynet',
  'SethJonesIntern.github.io',
  'sethjonesintern.github.io',
  'github.io',
  'grid-Ω',
  '\u{1f600}',
] as const;

// NaN is excluded deliberately: the spec contracts arbitrary numeric input only
// for formatStars, and a NaN sort key cannot participate in a total order.
const STARS = [0, 1, 2, 5, 1234, -1, 1.5, Number.MAX_SAFE_INTEGER] as const;

// Only well-formed timestamps: the "malformed pushed_at" Boundaries row says the
// resulting ordering is "defined but unspecified in meaning", so feeding
// 'not-a-date' here would assert something the spec declines to define.
const PUSHED_AT = [
  '2026-01-01T00:00:00Z',
  '2026-03-04T12:00:00Z',
  '2026-05-01T00:00:00Z',
  '2026-06-01T00:00:00Z',
] as const;

// Deliberately free of U+00B7, so any separator in a meta line can only have
// come from repoMetaLine itself (invariant 6).
const LANGUAGES = [null, 'Python', 'C++', '  ', '', 'Ω'] as const;

const DESCRIPTIONS = [null, '', '   ', '  A trap.  ', 'Ω \u{1f600}'] as const;

function randomRepo(rng: () => number): RepoInput {
  const name = pick(rng, NAMES);
  return {
    name,
    html_url: `https://github.com/SethJonesIntern/${name}`,
    description: pick(rng, DESCRIPTIONS),
    language: pick(rng, LANGUAGES),
    stargazers_count: pick(rng, STARS),
    fork: rng() < 0.25,
    archived: rng() < 0.25,
    pushed_at: pick(rng, PUSHED_AT),
  };
}

function randomRepoList(rng: () => number): RepoInput[] {
  const length = Math.floor(rng() * 9);
  return Array.from({ length }, () => randomRepo(rng));
}

/** Small exhaustive sort-key domain: 3 names x 2 star counts x 2 timestamps = 12. */
const EXHAUSTIVE: RepoInput[] = [];
for (const name of ['a', 'b', 'Zebra']) {
  for (const stargazers_count of [0, 5]) {
    for (const pushed_at of ['2026-01-01T00:00:00Z', '2026-05-01T00:00:00Z']) {
      EXHAUSTIVE.push({
        name,
        html_url: `https://github.com/SethJonesIntern/${name}`,
        description: null,
        language: null,
        stargazers_count,
        fork: false,
        archived: false,
        pushed_at,
      });
    }
  }
}

function sign(value: number): number {
  return value < 0 ? -1 : value > 0 ? 1 : 0;
}

/**
 * The spec states antisymmetry as `sign(cmp(a,b)) === -sign(cmp(b,a))`. Under
 * `===` the full-tie case `0 === -0` holds, but Vitest's `.toBe` uses
 * `Object.is`, for which `Object.is(0, -0)` is false. Summing the two signs is
 * the same statement without the signed-zero hazard: for x, y in {-1, 0, 1},
 * `x === -y` iff `x + y === 0`, and `0 + 0` is `+0`.
 */
function signSum(a: RepoInput, b: RepoInput): number {
  return sign(compareRepos(a, b)) + sign(compareRepos(b, a));
}

function show(repo: RepoInput): string {
  return JSON.stringify(repo);
}

describe('Invariant 1: compareRepos is a total order', () => {
  it('is antisymmetric over the exhaustive sort-key domain', () => {
    for (const a of EXHAUSTIVE) {
      for (const b of EXHAUSTIVE) {
        expect(signSum(a, b), `antisymmetry failed for ${show(a)} vs ${show(b)}`).toBe(0);
      }
    }
  });

  it('is antisymmetric over randomly generated pairs', () => {
    const rng = makeRng(20260914);
    for (let i = 0; i < 500; i += 1) {
      const a = randomRepo(rng);
      const b = randomRepo(rng);
      expect(signSum(a, b), `antisymmetry failed for ${show(a)} vs ${show(b)}`).toBe(0);
    }
  });

  it('is transitive over the exhaustive sort-key domain', () => {
    for (const a of EXHAUSTIVE) {
      for (const b of EXHAUSTIVE) {
        if (compareRepos(a, b) > 0) continue;
        for (const c of EXHAUSTIVE) {
          if (compareRepos(b, c) > 0) continue;
          expect(
            compareRepos(a, c),
            `transitivity failed for ${show(a)} <= ${show(b)} <= ${show(c)}`,
          ).toBeLessThanOrEqual(0);
        }
      }
    }
  });

  it('returns 0 exactly when stars, pushed_at and name are all equal', () => {
    const rng = makeRng(777);
    const pairs: Array<readonly [RepoInput, RepoInput]> = [];
    for (const a of EXHAUSTIVE) {
      for (const b of EXHAUSTIVE) pairs.push([a, b]);
    }
    for (let i = 0; i < 500; i += 1) pairs.push([randomRepo(rng), randomRepo(rng)]);

    for (const [a, b] of pairs) {
      const keysEqual =
        a.stargazers_count === b.stargazers_count &&
        a.pushed_at === b.pushed_at &&
        a.name === b.name;
      const context = `zero-iff-equal failed for ${show(a)} vs ${show(b)}`;
      expect(compareRepos(a, b) === 0, context).toBe(keysEqual);
    }
  });

  it('returns exactly -1, 0 or 1', () => {
    const rng = makeRng(31337);
    for (let i = 0; i < 500; i += 1) {
      const a = randomRepo(rng);
      const b = randomRepo(rng);
      const result = compareRepos(a, b);
      const context = `unexpected return ${String(result)} for ${show(a)} vs ${show(b)}`;
      expect([-1, 0, 1], context).toContain(result);
    }
  });
});

describe('Invariant 2: the array-returning functions never mutate or alias their input', () => {
  it('filterRepos returns a fresh array and leaves the argument untouched', () => {
    const rng = makeRng(101);
    for (let i = 0; i < 200; i += 1) {
      const input = randomRepoList(rng);
      const references = [...input];
      const before = structuredClone(input);
      const result = filterRepos(input);
      expect(result).not.toBe(input);
      expect(input).toEqual(before);
      expect(input.every((element, index) => element === references[index])).toBe(true);
      expect(input).toHaveLength(references.length);
    }
  });

  it('rankRepos returns a fresh array and leaves the argument untouched', () => {
    const rng = makeRng(202);
    for (let i = 0; i < 200; i += 1) {
      const input = randomRepoList(rng);
      const references = [...input];
      const before = structuredClone(input);
      const result = rankRepos(input);
      expect(result).not.toBe(input);
      expect(input).toEqual(before);
      expect(input.every((element, index) => element === references[index])).toBe(true);
      expect(input).toHaveLength(references.length);
    }
  });

  it('selectShowcaseRepos returns a fresh array and leaves the argument untouched', () => {
    const rng = makeRng(303);
    for (let i = 0; i < 200; i += 1) {
      const input = randomRepoList(rng);
      const references = [...input];
      const before = structuredClone(input);
      const result = selectShowcaseRepos(input);
      expect(result).not.toBe(input);
      expect(input).toEqual(before);
      expect(input.every((element, index) => element === references[index])).toBe(true);
      expect(input).toHaveLength(references.length);
    }
  });

  it('parseRepoList returns a fresh array and leaves the argument untouched', () => {
    const rng = makeRng(404);
    const junk: readonly unknown[] = [null, 42, 'repo', {}, { name: 'x' }, []];
    for (let i = 0; i < 200; i += 1) {
      const input: unknown[] = randomRepoList(rng);
      if (rng() < 0.7) input.push(pick(rng, junk));
      const references = [...input];
      const before = structuredClone(input);
      const result = parseRepoList(input);
      expect(result).not.toBe(input);
      expect(input).toEqual(before);
      expect(input.every((element, index) => element === references[index])).toBe(true);
      expect(input).toHaveLength(references.length);
    }
  });
});

describe('Invariant 3: rankRepos only ever returns admissible input elements', () => {
  it('never returns more elements than it was given', () => {
    const rng = makeRng(505);
    for (let i = 0; i < 300; i += 1) {
      const input = randomRepoList(rng);
      expect(rankRepos(input).length).toBeLessThanOrEqual(input.length);
    }
  });

  it('returns only elements of the input that satisfy isShowcaseRepo', () => {
    const rng = makeRng(606);
    for (let i = 0; i < 300; i += 1) {
      const input = randomRepoList(rng);
      for (const element of rankRepos(input)) {
        expect(
          input.some((candidate) => candidate === element),
          `${show(element)} is not an element of the input`,
        ).toBe(true);
        expect(isShowcaseRepo(element), `${show(element)} should not be in the showcase`).toBe(true);
      }
    }
  });

  it('returns every admissible input element', () => {
    const rng = makeRng(707);
    for (let i = 0; i < 300; i += 1) {
      const input = randomRepoList(rng);
      const ranked = rankRepos(input);
      for (const element of input) {
        if (!isShowcaseRepo(element)) continue;
        expect(
          ranked.some((candidate) => candidate === element),
          `${show(element)} was dropped despite being admissible`,
        ).toBe(true);
      }
    }
  });
});

describe('Invariant 4: selectShowcaseRepos length is min(limit, ranked length)', () => {
  it('holds for every legal limit', () => {
    // The spec states this invariant in terms of rankRepos, so rankRepos appears
    // on the expected side by the spec's own definition rather than as an oracle
    // invented here.
    const rng = makeRng(808);
    for (let i = 0; i < 200; i += 1) {
      const input = randomRepoList(rng);
      const rankedLength = rankRepos(input).length;
      for (const limit of [0, 1, 2, 3, 6, 10]) {
        expect(
          selectShowcaseRepos(input, limit).length,
          `limit ${limit} over ${JSON.stringify(input)}`,
        ).toBe(Math.min(limit, rankedLength));
      }
    }
  });
});

describe('Invariant 5: rankRepos is idempotent', () => {
  it('ranking an already ranked list leaves it unchanged', () => {
    const rng = makeRng(909);
    for (let i = 0; i < 300; i += 1) {
      const once = rankRepos(randomRepoList(rng));
      expect(rankRepos(once)).toEqual(once);
    }
  });
});

describe('Invariant 6: repoMetaLine output is tidy', () => {
  it('has no leading or trailing whitespace and no doubled or dangling separator', () => {
    const rng = makeRng(1010);
    for (let i = 0; i < 400; i += 1) {
      const repo = randomRepo(rng);
      const meta = repoMetaLine(repo);
      const context = `repoMetaLine(${show(repo)}) === ${JSON.stringify(meta)}`;
      expect(meta, context).toBe(meta.trim());
      expect(/·\s*·/.test(meta), context).toBe(false);
      expect(meta.startsWith('·'), context).toBe(false);
      expect(meta.endsWith('·'), context).toBe(false);
    }
  });
});

describe('Invariant 7: toShowcaseRepo.meta agrees with repoMetaLine', () => {
  it('holds for every generated repo', () => {
    const rng = makeRng(1111);
    for (let i = 0; i < 400; i += 1) {
      const repo = randomRepo(rng);
      expect(toShowcaseRepo(repo).meta, show(repo)).toBe(repoMetaLine(repo));
    }
  });
});

describe('Invariant 8: every parseRepoList result satisfies the RepoInput field types', () => {
  it('holds for arrays mixing valid repos with malformed entries', () => {
    const rng = makeRng(1212);
    const junk: readonly unknown[] = [
      null,
      undefined,
      42,
      'repo',
      true,
      {},
      [],
      { name: 'x' },
      {
        name: 42,
        html_url: 1,
        description: 2,
        language: 3,
        stargazers_count: '4',
        fork: 'no',
        archived: 'no',
        pushed_at: 5,
      },
    ];
    for (let i = 0; i < 300; i += 1) {
      const input: unknown[] = randomRepoList(rng);
      const extras = Math.floor(rng() * 4);
      for (let j = 0; j < extras; j += 1) input.push(pick(rng, junk));

      for (const repo of parseRepoList(input)) {
        const context = `bad field types in ${JSON.stringify(repo)}`;
        expect(typeof repo.name, context).toBe('string');
        expect(typeof repo.html_url, context).toBe('string');
        expect(repo.description === null || typeof repo.description === 'string', context).toBe(
          true,
        );
        expect(repo.language === null || typeof repo.language === 'string', context).toBe(true);
        expect(typeof repo.stargazers_count, context).toBe('number');
        expect(typeof repo.fork, context).toBe('boolean');
        expect(typeof repo.archived, context).toBe('boolean');
        expect(typeof repo.pushed_at, context).toBe('string');
      }
    }
  });

  it('keeps every valid repo in a well-formed array', () => {
    const rng = makeRng(1313);
    for (let i = 0; i < 200; i += 1) {
      const input = randomRepoList(rng);
      expect(parseRepoList(input)).toEqual(input);
    }
  });
});
