import { describe, expect, it } from 'vitest';

import {
  compareProjects,
  formatStack,
  isProjectStatus,
  sortProjects,
  type ProjectSortInput,
} from '../src/lib/projects';
import { projectSchema } from '../src/lib/projects-schema';

// Property tests for spec section "Invariants" 1, 2, 3, 4, 6 and 7.
//
// Invariant 5 ("src/lib/projects.ts contains no import, no require, and no
// reference to process, fs, Astro, or import.meta") is NOT tested here. It is a
// static property of the module text, and the only ways to assert it at runtime
// are to read the source file (needs node:fs plus @types/node, which the
// Non-goals forbid) or to import something other than the two src/lib modules,
// which the spec's test-import contract forbids. It is a review-time check.
//
// The spec's Non-goals forbid new npm dependencies, so no fast-check here:
// generation uses a deterministic seeded PRNG plus exhaustive small domains,
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

const IDS = ['a', 'b', 'x', 'alpha', 'zeta', 'É', 'tsat-2a'] as const;
const TITLES = ['A', 'a', 'Alpha', 'Beta', 'Same', 'Zebra', 'Éclair', 'Grid — Ω 😀'] as const;
const ORDERS = [1, 2, 3, 10, 42, Number.MAX_SAFE_INTEGER] as const;

function randomProject(rng: () => number): ProjectSortInput {
  return { id: pick(rng, IDS), order: pick(rng, ORDERS), title: pick(rng, TITLES) };
}

function randomProjectList(rng: () => number): ProjectSortInput[] {
  const length = Math.floor(rng() * 8);
  return Array.from({ length }, () => randomProject(rng));
}

/** Small exhaustive domain: 3 ids x 2 orders x 3 titles = 18 items. */
const EXHAUSTIVE: ProjectSortInput[] = [];
for (const id of ['a', 'b', 'x']) {
  for (const order of [1, 2]) {
    for (const title of ['A', 'a', 'Same']) {
      EXHAUSTIVE.push({ id, order, title });
    }
  }
}

function sign(value: number): number {
  return value < 0 ? -1 : value > 0 ? 1 : 0;
}

/**
 * The spec states antisymmetry as `sign(cmp(a,b)) === -sign(cmp(b,a))`, and
 * under `===` the full-tie case `0 === -0` holds. Vitest's `.toBe` uses
 * `Object.is`, under which `Object.is(0, -0)` is false, so the negated form
 * cannot be compared directly. Summing the two signs is the same statement
 * without the signed-zero hazard: `x === -y` iff `x + y === 0` for x, y in
 * {-1, 0, 1}, and `0 + 0` is `+0`.
 */
function signSum(a: ProjectSortInput, b: ProjectSortInput): number {
  return sign(compareProjects(a, b)) + sign(compareProjects(b, a));
}

function describeProject(project: ProjectSortInput): string {
  return JSON.stringify(project);
}

describe('Invariant 1: compareProjects is a total order', () => {
  it('is antisymmetric over the exhaustive key domain', () => {
    for (const a of EXHAUSTIVE) {
      for (const b of EXHAUSTIVE) {
        expect(
          signSum(a, b),
          `antisymmetry failed for ${describeProject(a)} vs ${describeProject(b)}`,
        ).toBe(0);
      }
    }
  });

  it('is antisymmetric over randomly generated pairs', () => {
    const rng = makeRng(20260914);
    for (let i = 0; i < 500; i += 1) {
      const a = randomProject(rng);
      const b = randomProject(rng);
      expect(
        signSum(a, b),
        `antisymmetry failed for ${describeProject(a)} vs ${describeProject(b)}`,
      ).toBe(0);
    }
  });

  it('is transitive over the exhaustive key domain', () => {
    for (const a of EXHAUSTIVE) {
      for (const b of EXHAUSTIVE) {
        if (compareProjects(a, b) > 0) continue;
        for (const c of EXHAUSTIVE) {
          if (compareProjects(b, c) > 0) continue;
          expect(
            compareProjects(a, c),
            `transitivity failed for ${describeProject(a)} <= ${describeProject(
              b,
            )} <= ${describeProject(c)}`,
          ).toBeLessThanOrEqual(0);
        }
      }
    }
  });

  it('returns 0 exactly when id, order and title are all equal', () => {
    for (const a of EXHAUSTIVE) {
      for (const b of EXHAUSTIVE) {
        const allKeysEqual = a.id === b.id && a.order === b.order && a.title === b.title;
        expect(
          compareProjects(a, b) === 0,
          `zero-iff-equal failed for ${describeProject(a)} vs ${describeProject(b)}`,
        ).toBe(allKeysEqual);
      }
    }

    const rng = makeRng(777);
    for (let i = 0; i < 500; i += 1) {
      const a = randomProject(rng);
      const b = randomProject(rng);
      const allKeysEqual = a.id === b.id && a.order === b.order && a.title === b.title;
      expect(
        compareProjects(a, b) === 0,
        `zero-iff-equal failed for ${describeProject(a)} vs ${describeProject(b)}`,
      ).toBe(allKeysEqual);
    }
  });
});

describe('Invariant 2: compareProjects returns only -1, 0 or 1', () => {
  it('returns one of exactly -1, 0 or 1 for random pairs', () => {
    const rng = makeRng(31337);
    for (let i = 0; i < 500; i += 1) {
      const a = randomProject(rng);
      const b = randomProject(rng);
      const result = compareProjects(a, b);
      expect(
        [-1, 0, 1],
        `unexpected return ${String(result)} for ${describeProject(a)} vs ${describeProject(b)}`,
      ).toContain(result);
    }
  });
});

describe('Invariant 3: sortProjects preserves length and element identity', () => {
  it('returns the same number of elements as the input', () => {
    const rng = makeRng(12345);
    for (let i = 0; i < 300; i += 1) {
      const input = randomProjectList(rng);
      expect(sortProjects(input)).toHaveLength(input.length);
    }
  });

  it('returns the very same object references as the input', () => {
    const rng = makeRng(54321);
    for (let i = 0; i < 300; i += 1) {
      const input = randomProjectList(rng);
      const sorted = sortProjects(input);
      for (const element of sorted) {
        expect(input.some((candidate) => candidate === element)).toBe(true);
      }
      for (const element of input) {
        expect(sorted.some((candidate) => candidate === element)).toBe(true);
      }
    }
  });
});

describe('Invariant 4: sortProjects is idempotent', () => {
  it('sorting an already sorted list leaves it unchanged', () => {
    const rng = makeRng(2468);
    for (let i = 0; i < 300; i += 1) {
      const once = sortProjects(randomProjectList(rng));
      expect(sortProjects(once)).toEqual(once);
    }
  });
});

describe('Invariant 6: every object projectSchema accepts has a recognised status', () => {
  it('isProjectStatus is true for the status of every accepted object', () => {
    const rng = makeRng(8642);
    const statuses = ['in-progress', 'completed', 'archived'] as const;
    for (let i = 0; i < 200; i += 1) {
      const candidate = {
        title: pick(rng, TITLES),
        role: pick(rng, ['Backend developer', 'Team lead', 'Ω']),
        stack: [pick(rng, ['Python', 'C++', 'Socket.IO'])],
        status: pick(rng, statuses),
        summary: 'a'.repeat(1 + Math.floor(rng() * 300)),
        order: pick(rng, [1, 2, 3, 10, Number.MAX_SAFE_INTEGER]),
      };
      const result = projectSchema.safeParse(candidate);
      expect(result.success, `expected ${JSON.stringify(candidate)} to parse`).toBe(true);
      if (result.success) {
        expect(isProjectStatus(result.data.status)).toBe(true);
      }
    }
  });
});

describe('Invariant 7: formatStack output is tidy', () => {
  it('has no leading or trailing whitespace and no doubled separator', () => {
    const rng = makeRng(99991);
    // Entries deliberately exclude U+00B7 so that any separator run in the
    // output can only have come from formatStack itself.
    const entries = ['Python', ' React ', '', '   ', 'Node.js', 'C++', 'Ω', '😀', 'Socket.IO'];
    for (let i = 0; i < 300; i += 1) {
      const stack = Array.from({ length: Math.floor(rng() * 6) }, () => pick(rng, entries));
      const formatted = formatStack(stack);
      const context = `formatStack(${JSON.stringify(stack)}) === ${JSON.stringify(formatted)}`;
      expect(formatted, context).toBe(formatted.trim());
      expect(/·\s*·/.test(formatted), context).toBe(false);
      expect(formatted.startsWith('·'), context).toBe(false);
      expect(formatted.endsWith('·'), context).toBe(false);
    }
  });
});
