import { describe, expect, it } from 'vitest';

import {
  assignSlugs,
  comparePosts,
  postsWithTag,
  publishedPosts,
  slugify,
  sortPostsByDate,
  tagCounts,
  tagSlug,
} from '../src/lib/posts';

// Property tests for spec section "Invariants" 1-7.
//
// Invariant 8 ("src/lib/posts.ts contains no import, no require, ...") is NOT
// tested: the spec marks it review-only, since reading the module text needs
// node:fs, which the test contract forbids.
//
// fast-check is not a dependency and package.json is on the spec's "Leave
// untouched" list, so, following tests/projects-invariants.test.ts, generation
// uses a deterministic seeded PRNG plus exhaustive small domains.

type Post = { id: string; title: string; date: string };

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

function shuffle<T>(rng: () => number, values: readonly T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------------
// Invariant 1
// ---------------------------------------------------------------------------

const SLUG_ALPHABET = [
  'a', 'Z', 'q', '7', '0', ' ', '  ', '\t', '-', '--', '_', "'", '’', ',', '!', '&', ':',
  'é', 'é', 'İ', 'ß', 'Ω', '🚀', '日', 'Café', 'Hello', 'World',
] as const;

/** Inputs from Behavior rows 1-13, several of which have non-empty slugs. */
const SLUG_SEEDS = [
  'Hello World', 'Building a Spec Harness', 'Tags, RSS & Drafts!', 'a  --  b', '  -Hello-  ',
  'Café Déjà Vu', 'İstanbul', 'Straße', 'Seth’s Site', "don't", 'Issue 7: Blog with Tags',
  'Ship it 🚀', '日本語', '!!!', '', '   ', 'hello-world',
];

function slugCorpus(): string[] {
  const rng = makeRng(20260914);
  const corpus = [...SLUG_SEEDS];
  for (let i = 0; i < 500; i += 1) {
    const length = Math.floor(rng() * 10);
    corpus.push(Array.from({ length }, () => pick(rng, SLUG_ALPHABET)).join(''));
  }
  return corpus;
}

describe('Invariant 1: slugify output shape and idempotence', () => {
  it('returns a string that is empty or matches the slug pattern', () => {
    const failures: string[] = [];
    let nonEmpty = 0;
    for (const input of slugCorpus()) {
      const slug: unknown = slugify(input);
      if (typeof slug !== 'string') {
        failures.push(`slugify(${JSON.stringify(input)}) returned non-string ${String(slug)}`);
        continue;
      }
      if (slug === '') continue;
      nonEmpty += 1;
      if (!SLUG_PATTERN.test(slug)) {
        failures.push(`slugify(${JSON.stringify(input)}) === ${JSON.stringify(slug)}`);
      }
    }
    expect(failures).toEqual([]);
    // Behavior #1 alone guarantees a non-empty result exists in the corpus.
    expect(nonEmpty).toBeGreaterThan(0);
  });

  it('is idempotent on its own non-empty output', () => {
    const failures: string[] = [];
    let checked = 0;
    for (const input of slugCorpus()) {
      const once: unknown = slugify(input);
      if (typeof once !== 'string') {
        failures.push(`slugify(${JSON.stringify(input)}) returned non-string ${String(once)}`);
        continue;
      }
      if (once === '') continue;
      checked += 1;
      const twice = slugify(once);
      if (twice !== once) {
        failures.push(`slugify(${JSON.stringify(once)}) === ${JSON.stringify(twice)}`);
      }
    }
    expect(failures).toEqual([]);
    expect(checked).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Invariant 2
// ---------------------------------------------------------------------------

const SOURCE_IDS = ['a', 'b', 'c', 'x', 'y', 'Z', 'a-post', 'b-post', 'post', 'É'] as const;
const SOURCE_TITLES = [
  'Hello World', 'Tags RSS', 'Tags, RSS', 'Tags & RSS', 'Tags RSS 2', 'Tags RSS 3', 'tags-rss-2',
  '日本語', '!!!', '', 'Post', 'Post 2', 'post-2', 'Café', 'Cafe', 'Ship it 🚀',
] as const;

function randomSources(rng: () => number): { id: string; title: string }[] {
  const ids = shuffle(rng, SOURCE_IDS).slice(0, Math.floor(rng() * (SOURCE_IDS.length + 1)));
  return ids.map((id) => ({ id, title: pick(rng, SOURCE_TITLES) }));
}

describe('Invariant 2: assignSlugs yields one distinct valid slug per id, order-independently', () => {
  it('has exactly one key per input id', () => {
    const rng = makeRng(4242);
    for (let i = 0; i < 300; i += 1) {
      const sources = randomSources(rng);
      const result = assignSlugs(sources);
      const expectedIds = sources.map((source) => source.id).sort();
      expect(Object.keys(result).sort(), JSON.stringify(sources)).toEqual(expectedIds);
    }
  });

  it('assigns distinct values', () => {
    const rng = makeRng(4343);
    for (let i = 0; i < 300; i += 1) {
      const sources = randomSources(rng);
      const values = Object.values(assignSlugs(sources));
      expect(new Set(values).size, JSON.stringify(sources)).toBe(sources.length);
    }
  });

  it('assigns only non-empty valid slugs', () => {
    const rng = makeRng(4444);
    for (let i = 0; i < 300; i += 1) {
      const sources = randomSources(rng);
      const result = assignSlugs(sources);
      for (const source of sources) {
        const value: unknown = result[source.id];
        expect(
          typeof value === 'string' && SLUG_PATTERN.test(value),
          `${JSON.stringify(sources)} -> ${source.id}: ${JSON.stringify(value)}`,
        ).toBe(true);
      }
    }
  });

  it('returns a deep-equal object for a shuffled input', () => {
    const rng = makeRng(4545);
    let nonEmptyRuns = 0;
    for (let i = 0; i < 300; i += 1) {
      const sources = randomSources(rng);
      if (sources.length > 0) nonEmptyRuns += 1;
      const original = assignSlugs(sources);
      expect(original, JSON.stringify(sources)).toBeTypeOf('object');
      expect(assignSlugs(shuffle(rng, sources)), JSON.stringify(sources)).toEqual(original);
    }
    expect(nonEmptyRuns).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Invariant 3
// ---------------------------------------------------------------------------

const VALID_DATES = ['2026-09-14', '2026-01-01', '2024-02-29'] as const;
const INVALID_DATES = ['nope', 'also-nope', '2026-02-29', '0999-12-31'] as const;

function buildDomain(dates: readonly string[]): Post[] {
  const domain: Post[] = [];
  for (const id of ['a', 'b', 'Z']) {
    for (const title of ['S', 'A', 'a']) {
      for (const date of dates) {
        domain.push({ id, title, date });
      }
    }
  }
  return domain;
}

/** 3 ids x 3 titles x 5 dates (3 valid, 2 unparseable) = 45 posts. */
const FULL_DOMAIN = buildDomain(['2026-09-14', '2026-01-01', '2024-02-29', 'nope', 'also-nope']);
/** Valid dates only, see the zero-iff-equal test for why. */
const VALID_DOMAIN = buildDomain(VALID_DATES);

function randomPost(rng: () => number): Post {
  return {
    id: pick(rng, ['a', 'b', 'Z', 'É', 'alpha']),
    title: pick(rng, ['S', 'A', 'a', 'Éclair', 'Zebra', 'Ship it 🚀']),
    date: pick(rng, [...VALID_DATES, ...INVALID_DATES]),
  };
}

describe('Invariant 3: comparePosts is a total order', () => {
  it('returns exactly -1, 0 or 1', () => {
    const rng = makeRng(31337);
    for (let i = 0; i < 500; i += 1) {
      const a = randomPost(rng);
      const b = randomPost(rng);
      const result = comparePosts(a, b);
      expect([-1, 0, 1], `${JSON.stringify(a)} vs ${JSON.stringify(b)} -> ${String(result)}`).toContain(result);
    }
  });

  it('is antisymmetric over the exhaustive domain, including unparseable dates', () => {
    // cmp(a,b) === -cmp(b,a), written as a sum to avoid Object.is(0, -0) and
    // so that a non-numeric return cannot pass (NaN !== 0).
    const failures: string[] = [];
    for (const a of FULL_DOMAIN) {
      for (const b of FULL_DOMAIN) {
        const sum = comparePosts(a, b) + comparePosts(b, a);
        if (sum !== 0) failures.push(`${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('is antisymmetric over randomly generated pairs', () => {
    const rng = makeRng(20260914);
    const failures: string[] = [];
    for (let i = 0; i < 1000; i += 1) {
      const a = randomPost(rng);
      const b = randomPost(rng);
      if (comparePosts(a, b) + comparePosts(b, a) !== 0) {
        failures.push(`${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('is transitive over the exhaustive domain, including unparseable dates', () => {
    const failures: string[] = [];
    let checked = 0;
    for (const a of FULL_DOMAIN) {
      for (const b of FULL_DOMAIN) {
        if (!(comparePosts(a, b) <= 0)) continue;
        for (const c of FULL_DOMAIN) {
          if (!(comparePosts(b, c) <= 0)) continue;
          checked += 1;
          if (!(comparePosts(a, c) <= 0)) {
            failures.push(`${JSON.stringify(a)} <= ${JSON.stringify(b)} <= ${JSON.stringify(c)}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
    // Reflexive triples (a, a, a) alone guarantee checks ran for a valid order.
    expect(checked).toBeGreaterThan(0);
  });

  it('returns 0 exactly when date, title and id are all equal (parseable dates)', () => {
    // Restricted to parseable dates. For two DIFFERENT unparseable date strings
    // with equal title and id, Behavior #33 ("both invalid -> title, then id")
    // implies 0, while Invariant 3 says 0 only when date is equal too. The spec
    // is inconsistent there, so that case is left untested.
    const failures: string[] = [];
    for (const a of VALID_DOMAIN) {
      for (const b of VALID_DOMAIN) {
        const allEqual = a.id === b.id && a.title === b.title && a.date === b.date;
        if ((comparePosts(a, b) === 0) !== allEqual) {
          failures.push(`${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Invariant 4
// ---------------------------------------------------------------------------

function randomPostList(rng: () => number): Post[] {
  const length = Math.floor(rng() * 9);
  return Array.from({ length }, () => randomPost(rng));
}

describe('Invariant 4: sortPostsByDate preserves length and identity and is idempotent', () => {
  it('returns as many elements as the input', () => {
    const rng = makeRng(12345);
    for (let i = 0; i < 300; i += 1) {
      const xs = randomPostList(rng);
      expect(sortPostsByDate(xs)).toHaveLength(xs.length);
    }
  });

  it('returns the very same object references as the input', () => {
    const rng = makeRng(54321);
    for (let i = 0; i < 300; i += 1) {
      const xs = randomPostList(rng);
      const sorted = sortPostsByDate(xs);
      expect(sorted).toHaveLength(xs.length);
      for (const element of sorted) {
        expect(xs.includes(element)).toBe(true);
      }
      for (const element of xs) {
        expect(sorted.includes(element)).toBe(true);
      }
    }
  });

  it('is idempotent, element by element', () => {
    const rng = makeRng(2468);
    for (let i = 0; i < 300; i += 1) {
      const once = sortPostsByDate(randomPostList(rng));
      const twice = sortPostsByDate(once);
      expect(twice).toHaveLength(once.length);
      twice.forEach((element, index) => {
        expect(element).toBe(once[index]);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Invariant 5
// ---------------------------------------------------------------------------

describe('Invariant 5: publishedPosts is a subsequence of its input', () => {
  it('keeps only input references, in input order', () => {
    const rng = makeRng(13579);
    const draftValues = ['absent', false, true] as const;
    for (let i = 0; i < 300; i += 1) {
      const xs = Array.from({ length: Math.floor(rng() * 9) }, (_, index): { id: string; draft?: boolean } => {
        const draft = pick(rng, draftValues);
        return draft === 'absent' ? { id: `p${index}` } : { id: `p${index}`, draft };
      });
      const published = publishedPosts(xs);
      expect(Array.isArray(published)).toBe(true);
      let cursor = 0;
      for (const element of published) {
        while (cursor < xs.length && xs[cursor] !== element) cursor += 1;
        expect(cursor < xs.length, `${JSON.stringify(published)} not a subsequence of ${JSON.stringify(xs)}`).toBe(true);
        cursor += 1;
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Invariants 6 and 7
// ---------------------------------------------------------------------------

/** Tag domain with hand-derived slugs (slugify contract + normalizeTag). */
const TAG_DOMAIN: readonly { tag: string; slug: string }[] = [
  { tag: 'AI', slug: 'ai' },
  { tag: 'ai', slug: 'ai' },
  { tag: '  AI  ', slug: 'ai' },
  { tag: 'Testing', slug: 'testing' },
  { tag: 'testing', slug: 'testing' },
  { tag: 'Spec   Harness', slug: 'spec-harness' },
  { tag: 'spec-harness', slug: 'spec-harness' },
  { tag: 'Astro', slug: 'astro' },
  { tag: 'Café', slug: 'cafe' },
  { tag: 'Cafe', slug: 'cafe' },
  { tag: 'Process', slug: 'process' },
  { tag: '🚀', slug: '' },
  { tag: '!!!', slug: '' },
];

function randomTaggedPosts(rng: () => number): { tags: string[]; slugs: string[] }[] {
  return Array.from({ length: Math.floor(rng() * 7) }, () => {
    const entries = Array.from({ length: Math.floor(rng() * 5) }, () => pick(rng, TAG_DOMAIN));
    return { tags: entries.map((entry) => entry.tag), slugs: entries.map((entry) => entry.slug) };
  });
}

describe('Invariant 6: tagCounts counts are bounded and slugs are distinct and complete', () => {
  it('reports every count between 1 and the number of posts', () => {
    const rng = makeRng(6006);
    for (let i = 0; i < 300; i += 1) {
      const generated = randomTaggedPosts(rng);
      const posts = generated.map(({ tags }) => ({ tags }));
      const summaries = tagCounts(posts);
      expect(Array.isArray(summaries)).toBe(true);
      for (const summary of summaries) {
        expect(summary.count, JSON.stringify(posts)).toBeGreaterThanOrEqual(1);
        expect(summary.count, JSON.stringify(posts)).toBeLessThanOrEqual(posts.length);
      }
    }
  });

  it('has one entry per distinct non-empty tag slug', () => {
    const rng = makeRng(6116);
    let nonEmptyRuns = 0;
    for (let i = 0; i < 300; i += 1) {
      const generated = randomTaggedPosts(rng);
      const posts = generated.map(({ tags }) => ({ tags }));
      const expectedSlugs = new Set(generated.flatMap(({ slugs }) => slugs).filter((slug) => slug !== ''));
      if (expectedSlugs.size > 0) nonEmptyRuns += 1;
      expect(tagCounts(posts), JSON.stringify(posts)).toHaveLength(expectedSlugs.size);
    }
    expect(nonEmptyRuns).toBeGreaterThan(0);
  });

  it('never repeats a slug in its result', () => {
    const rng = makeRng(6226);
    for (let i = 0; i < 300; i += 1) {
      const posts = randomTaggedPosts(rng).map(({ tags }) => ({ tags }));
      const slugs = tagCounts(posts).map((summary) => summary.slug);
      expect(new Set(slugs).size, JSON.stringify(posts)).toBe(slugs.length);
    }
  });
});

describe('Invariant 7: tagCounts agrees with postsWithTag and tagSlug', () => {
  it('counts exactly the posts that postsWithTag returns for each slug', () => {
    const rng = makeRng(7007);
    for (let i = 0; i < 300; i += 1) {
      const posts = randomTaggedPosts(rng).map(({ tags }) => ({ tags }));
      const summaries = tagCounts(posts);
      expect(Array.isArray(summaries)).toBe(true);
      for (const summary of summaries) {
        expect(postsWithTag(posts, summary.slug), `${JSON.stringify(posts)} / ${summary.slug}`).toHaveLength(
          summary.count,
        );
      }
    }
  });

  it('labels every summary with a tag whose slug is the summary slug', () => {
    const rng = makeRng(7117);
    for (let i = 0; i < 300; i += 1) {
      const posts = randomTaggedPosts(rng).map(({ tags }) => ({ tags }));
      const summaries = tagCounts(posts);
      expect(Array.isArray(summaries)).toBe(true);
      for (const summary of summaries) {
        expect(tagSlug(summary.label), `${JSON.stringify(posts)} / ${summary.label}`).toBe(summary.slug);
      }
    }
  });
});
