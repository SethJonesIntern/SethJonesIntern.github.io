# Blog with Tags and RSS

Issue: personal-website #7 — "Blog with tags and RSS"

## Purpose

`/blog/` is a dead nav link (`NAV_ITEMS` in `src/consts.ts`). This feature fills it with a Markdown
content collection at `src/content/blog/`, a Zod-validated frontmatter schema, an index newest-first,
one page per post, one page per tag, and an RSS feed at `/rss.xml`. Every decision — slug generation
and collision resolution, date parsing and ordering, draft filtering, tag normalization and counting
— lives in `src/lib/posts.ts`, a module with **zero imports**, plain objects in and plain values out,
unit-testable without an Astro build. One real post ships. Pages reuse existing tokens from
`src/styles/tokens.css`; the only new dependency is `@astrojs/rss`, already installed.

## Public API

### Files to create / change

```
src/lib/posts.ts                                  (pure logic; ZERO imports of any kind)
src/lib/posts-schema.ts                           (imports only 'astro/zod' and './posts')
src/content/blog/building-a-spec-harness.md       (the one real post)
src/pages/blog/index.astro
src/pages/blog/[slug].astro
src/pages/blog/tags/[tag].astro
src/pages/rss.xml.ts                              (feed served at /rss.xml)
src/content.config.ts                             (add the `blog` collection; leave `projects` as is)
src/layouts/BaseLayout.astro                      (add ONE line, the feed autodiscovery link)
```

Leave untouched: `src/consts.ts`, `src/lib/projects*.ts`, `src/components/*`, `src/styles/*`,
`astro.config.mjs` (`site` is already set, which the feed needs), `package.json`.

### `src/lib/posts.ts` — exact exports

```ts
/** A post's identity for slug assignment. `id` is the Markdown filename stem (unique). */
export interface SlugSource {
  readonly id: string;
  readonly title: string;
}

/** The minimum shape the ordering functions need. Extra properties allowed and preserved. */
export interface PostSortInput {
  readonly id: string;
  readonly title: string;
  /** Frontmatter date: the string 'YYYY-MM-DD'. Never a Date object. */
  readonly date: string;
}

/** The minimum shape the tag functions need. */
export interface TagSource {
  readonly tags: readonly string[];
}

export interface TagSummary {
  readonly slug: string;
  readonly label: string;
  readonly count: number;
}

/** URL-safe slug for a title. Returns '' when nothing survives normalization. */
export function slugify(title: string): string;

/** Trim, then collapse every internal whitespace run to one U+0020. Case preserved. */
export function normalizeTag(tag: string): string;

/** slugify(normalizeTag(tag)). The grouping key for tags; case-insensitive by construction. */
export function tagSlug(tag: string): string;

/** Unique slug per post, keyed by `id`. Output never depends on input array order. */
export function assignSlugs(sources: readonly SlugSource[]): Record<string, string>;

/** Epoch milliseconds at UTC midnight, or null if `value` is not a strict 'YYYY-MM-DD' calendar date. */
export function parsePostDate(value: string): number | null;

/** Total order: date descending (newest first), then `title`, then `id` ascending. Exactly -1, 0, 1. */
export function comparePosts(a: PostSortInput, b: PostSortInput): -1 | 0 | 1;

/** New array sorted by `comparePosts`. Never mutates or aliases the input. */
export function sortPostsByDate<T extends PostSortInput>(posts: readonly T[]): T[];

/** New array with `draft === true` entries removed. Relative order preserved. */
export function publishedPosts<T extends { readonly draft?: boolean }>(posts: readonly T[]): T[];

/** One entry per distinct tag slug; count descending, then slug ascending. */
export function tagCounts(posts: readonly TagSource[]): TagSummary[];

/** New array of posts carrying `tag` (compared by `tagSlug`). Relative order preserved. */
export function postsWithTag<T extends TagSource>(posts: readonly T[], tag: string): T[];

/** '/blog/<slug>/'. Throws TypeError on an effectively empty slug. */
export function postHref(slug: string): string;

/** '/blog/tags/<slug>/'. Throws TypeError on an effectively empty slug. */
export function tagHref(slug: string): string;
```

String comparison is codepoint-wise (`<` / `>` on raw strings) and casing uses `toLowerCase()`, never
`localeCompare`, `toLocaleLowerCase`, or `Intl` — results must not depend on the host locale.

**`slugify` contract**, in order: (1) `normalize('NFD')`; (2) delete combining marks `U+0300`–`U+036F`;
(3) delete `'` U+0027 and `’` U+2019 outright (no separator left behind); (4) `toLowerCase()`;
(5) replace every remaining character outside `[a-z0-9]` with `-`; (6) collapse `-` runs to one;
(7) strip leading and trailing `-`. No length cap.

**`assignSlugs` contract**: base slug is `slugify(title)`, or `'post'` when that is `''`. Sources are
processed in `id`-ascending codepoint order (**not** input order). The first source to claim a base
keeps it; each later one takes `<base>-2`, `-3`, … choosing the lowest integer ≥ 2 whose candidate is
in neither the set of all base slugs nor the set of already-assigned slugs.

**Date handling**: the frontmatter date is a **string**, always `'YYYY-MM-DD'`, interpreted as UTC
midnight, so no host timezone can shift a post's date or ordering. Ties on date break by `title`, then
`id`, both codepoint-ascending. Unparseable dates sort **last** regardless of direction, which keeps
the comparator a total order.

### `src/lib/posts-schema.ts` — exact exports

```ts
import { z } from 'astro/zod';
import { parsePostDate } from './posts';

export const postSchema = z
  .object({
    title: z.string().min(1),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be a quoted YYYY-MM-DD string')
      .refine((value) => parsePostDate(value) !== null, {
        message: 'date must be a real calendar date',
      }),
    description: z.string().min(1).max(300),
    tags: z.array(z.string().min(1)).default([]),
    draft: z.boolean().default(false),
  })
  .strict();

export type PostFrontmatter = z.infer<typeof postSchema>;
```

Exported with its inferred type (no `: z.ZodTypeAny` widening) so `.safeParse()` and `z.infer` work.
`src/content.config.ts` gains:

```ts
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: postSchema,
});
export const collections = { projects, blog };
```

### Test setup

Vitest 5 via `npm test`; files `tests/posts-*.test.ts`. Imports from a test file are exactly:

```ts
import {
  assignSlugs, comparePosts, normalizeTag, parsePostDate, postHref, postsWithTag,
  publishedPosts, slugify, sortPostsByDate, tagCounts, tagHref, tagSlug,
} from '../src/lib/posts';
import { postSchema } from '../src/lib/posts-schema';
```

## Behavior

| # | input | expected output | notes |
|---|---|---|---|
| 1 | `slugify('Hello World')` | `'hello-world'` | space → `-` |
| 2 | `slugify('Building a Spec Harness')` | `'building-a-spec-harness'` | mixed case lowered |
| 3 | `slugify('Tags, RSS & Drafts!')` | `'tags-rss-drafts'` | punctuation → separators, then collapsed and trimmed |
| 4 | `slugify('a  --  b')` | `'a-b'` | consecutive separators collapse |
| 5 | `slugify('  -Hello-  ')` | `'hello'` | leading/trailing separators stripped |
| 6 | `slugify('Café Déjà Vu')` | `'cafe-deja-vu'` | NFD + combining marks dropped |
| 7 | `slugify('İstanbul')` | `'istanbul'` | NFD(U+0130) = `I` + U+0307; mark dropped, then lowered |
| 8 | `slugify('Straße')` | `'stra-e'` | `ß` has no decomposition and is not `[a-z0-9]` → separator |
| 9 | `slugify('Seth’s Site')` / `slugify("don't")` | `'seths-site'` / `'dont'` | both apostrophes deleted, not replaced |
| 10 | `slugify('Issue 7: Blog with Tags')` | `'issue-7-blog-with-tags'` | digits kept |
| 11 | `slugify('Ship it 🚀')` | `'ship-it'` | emoji → separator, then trimmed |
| 12 | `slugify('日本語')` / `slugify('!!!')` / `slugify('')` / `slugify('   ')` | `''` for all four | nothing survives |
| 13 | `slugify('hello-world')` | `'hello-world'` | idempotent |
| 14 | `normalizeTag('  Spec   Harness ')` | `'Spec Harness'` | trimmed, runs collapsed, case kept |
| 15 | `tagSlug('  Spec   Harness ')` / `tagSlug('AI')` | `'spec-harness'` / `'ai'` | |
| 16 | `assignSlugs([{id:'a',title:'Hello World'}])` | `{ a: 'hello-world' }` | keyed by id |
| 17 | `assignSlugs([{id:'b-post',title:'Tags & RSS'},{id:'a-post',title:'Tags, RSS'}])` | `{ 'a-post':'tags-rss', 'b-post':'tags-rss-2' }` | collision: id-ascending wins the base |
| 18 | row 17's array reversed | identical object to row 17 | order-independent |
| 19 | `assignSlugs([{id:'a',title:'Tags RSS'},{id:'b',title:'Tags, RSS'},{id:'c',title:'Tags RSS 2'}])` | `{ a:'tags-rss', b:'tags-rss-3', c:'tags-rss-2' }` | `-2` is reserved as `c`'s base, so `b` skips to `-3` |
| 20 | `assignSlugs([{id:'x',title:'日本語'},{id:'y',title:'!!!'}])` | `{ x:'post', y:'post-2' }` | empty base → `'post'`, then normal collision rules |
| 21 | `assignSlugs([])` | `{}` | |
| 22 | `parsePostDate('2026-09-14')` | `Date.UTC(2026, 8, 14)` | UTC midnight, month is 0-based in the expectation |
| 23 | `parsePostDate('2024-02-29')` / `parsePostDate('2026-02-29')` | `Date.UTC(2024, 1, 29)` / `null` | real leap day accepted, fake one rejected |
| 24 | `parsePostDate('2026-13-01')` / `'2026-00-10'` / `'2026-09-31'` / `'2026-09-00'` | `null` for all four | calendar range checked, not just the regex |
| 25 | `parsePostDate('2026-9-14')` / `'14/09/2026'` / `'2026-09-14T00:00:00Z'` / `'2026-09-14 '` / `''` / `'nope'` | `null` for all six | strict format, no trimming, no time component |
| 26 | `parsePostDate('0001-01-01')` / `'0999-12-31'` | `null` / `null` | year must be ≥ 1000, dodging `Date.UTC`'s two-digit-year remap |
| 27 | `comparePosts({id:'a',title:'A',date:'2026-09-14'}, {id:'b',title:'B',date:'2026-01-01'})` | `-1` | newer first |
| 28 | row 27's arguments swapped | `1` | antisymmetric |
| 29 | `comparePosts({id:'z',title:'Alpha',date:'2026-09-14'}, {id:'a',title:'Beta',date:'2026-09-14'})` | `-1` | date tie → title; id ignored until titles tie |
| 30 | `comparePosts({id:'a',title:'S',date:'2026-09-14'}, {id:'b',title:'S',date:'2026-09-14'})` | `-1` | date+title tie → id |
| 31 | `comparePosts({id:'a',title:'S',date:'2026-09-14'}, {id:'a',title:'S',date:'2026-09-14'})` | `0` | full tie |
| 32 | `comparePosts({id:'a',title:'A',date:'nope'}, {id:'b',title:'B',date:'2026-01-01'})` | `1` | unparseable sorts last |
| 33 | `comparePosts({id:'a',title:'A',date:'nope'}, {id:'b',title:'B',date:'also-nope'})` | `-1` | both invalid → title, then id |
| 34 | `sortPostsByDate([{id:'a',title:'A',date:'2025-01-01'},{id:'b',title:'B',date:'2026-09-14'},{id:'c',title:'C',date:'2026-01-02'}])` | ids `['b','c','a']` | newest first |
| 35 | `const xs = [three unsorted posts]; sortPostsByDate(xs)` | returns an array `!==` `xs`; `xs`'s own order unchanged | non-mutating |
| 36 | `publishedPosts([{id:'a',draft:false},{id:'b',draft:true},{id:'c'}])` | ids `['a','c']` | `draft === true` removed; absent `draft` is published |
| 37 | `publishedPosts([{draft:true},{draft:true}])` | `[]` | |
| 38 | `tagCounts([{tags:['AI','Testing']},{tags:['ai']}])` | `[{slug:'ai',label:'AI',count:2},{slug:'testing',label:'Testing',count:1}]` | count desc; label is the codepoint-smallest normalized variant (`'AI'` < `'ai'`) |
| 39 | row 38's array reversed | identical array to row 38 | label and order independent of input order |
| 40 | `tagCounts([{tags:['AI','ai','  AI  ']}])` | `[{slug:'ai',label:'AI',count:1}]` | duplicates within one post count once |
| 41 | `tagCounts([{tags:['b']},{tags:['a']}])` | `[{slug:'a',label:'a',count:1},{slug:'b',label:'b',count:1}]` | count tie → slug ascending |
| 42 | `tagCounts([{tags:[]},{tags:['🚀']}])` | `[]` | no tags, and tags that slugify to `''`, are dropped — no `'post'` fallback here |
| 43 | `tagCounts([])` | `[]` | |
| 44 | `postsWithTag([{id:'a',tags:['AI']},{id:'b',tags:['Testing']}], 'ai')` | the `id:'a'` element only | case-insensitive via slug |
| 45 | `postsWithTag([{id:'a',tags:['Spec Harness']}], 'spec-harness')` | the one element | the argument is slugified too, so a slug matches its label |
| 46 | `postsWithTag([{id:'a',tags:[]}], 'ai')` / `postsWithTag([], 'ai')` / `postsWithTag([{id:'a',tags:['AI']}], '🚀')` | `[]` for all three | |
| 47 | `postHref('building-a-spec-harness')` | `'/blog/building-a-spec-harness/'` | leading and trailing slash |
| 48 | `tagHref('ai')` | `'/blog/tags/ai/'` | |
| 49 | `postHref('/x/')` / `tagHref('/x/')` | `'/blog/x/'` / `'/blog/tags/x/'` | surrounding slashes stripped first |
| 50 | `postSchema.safeParse(§Content frontmatter)` | `.success === true`, `.data.tags` deep-equals `['Testing','Process','Astro']`, `.data.draft === false` | the shipped post is valid |
| 51 | `postSchema.safeParse({title:'T',date:'2026-09-14',description:'D'})` | `.success === true`, `.data.tags` deep-equals `[]`, `.data.draft === false` | both defaults applied |
| 52 | `postSchema.safeParse({title:'T',date:'2026-09-14',description:'D',tags:['a'],draft:true}).data.draft` | `true` | |

## Errors

Schema failures are `safeParse` results, never thrown exceptions: assert `result.success === false`
and `result.error.issues[0].path`. Do not assert Zod's own wording except where contracted.

| condition | exception type / result | message contract |
|---|---|---|
| missing `title` / `date` / `description` | `success: false`, `issues[0].path === ['title']` etc. | any Zod required/invalid-type message |
| `title: ''` or `description: ''` | `success: false`, path `['title']` / `['description']` | `min(1)` violation |
| `description` of 301 characters | `success: false`, path `['description']` | 300 accepted |
| `date: '2026-9-14'` or `'14/09/2026'` | `success: false`, path `['date']`, `issues[0].message === 'date must be a quoted YYYY-MM-DD string'` | contracted wording |
| `date: '2026-02-30'` | `success: false`, path `['date']`, `issues[0].message === 'date must be a real calendar date'` | regex passes, refine fails |
| `date: new Date('2026-09-14')` | `success: false`, path `['date']` | a Date is not a string — frontmatter **must quote** the date, or YAML yields a Date and the build fails |
| `tags: 'ai'` (string, not array) | `success: false`, path `['tags']` | |
| `tags: ['ai','']` | `success: false`, path `['tags', 1]` | per-element `min(1)` |
| `tags: null` / `draft: null` | `success: false`, path `['tags']` / `['draft']` | defaulted means "absent", not nullable |
| `draft: 'true'` | `success: false`, path `['draft']` | boolean only |
| unknown key, e.g. `author: 'Seth'` | `success: false`, `issues[0].code === 'unrecognized_keys'` | `.strict()` catches typos |
| `postHref('')`, `postHref('   ')`, `postHref('/')` | throws `TypeError` | message exactly `'postHref: slug must be a non-empty string'` |
| `tagHref('')`, `tagHref('   ')`, `tagHref('/')` | throws `TypeError` | message exactly `'tagHref: slug must be a non-empty string'` |
| `assignSlugs([{id:'a',title:'X'},{id:'a',title:'Y'}])` | throws `TypeError` | message exactly `'assignSlugs: duplicate id "a"'` |
| `assignSlugs([{id:'',title:'X'}])` or an all-whitespace id | throws `TypeError` | message exactly `'assignSlugs: id must be a non-empty string'` |
| invalid frontmatter in `src/content/blog/*.md` | `npm run build` exits non-zero | Astro's collection error naming `blog`, the file, and the field path. Not covered by Vitest — see Non-goals |

## Boundaries

| boundary | answer |
|---|---|
| no posts at all | `sortPostsByDate([])`, `publishedPosts([])`, `tagCounts([])`, `postsWithTag([], 'x')` all return `[]`; `assignSlugs([])` returns `{}`. Test all five. The index's empty state is specified below but not tested (needs a build). |
| every post a draft | `publishedPosts` → `[]`, so `tagCounts(publishedPosts(xs))` → `[]` and the feed has zero items. Test the composition. |
| post with no tags | `tags: []` parses (Behavior #51); contributes nothing to `tagCounts` and matches no tag page (#42, #46). Test. |
| duplicate tags on one post | Counted once (#40). Legal, not an error. Test. |
| tags differing only by case | Same tag: one slug, one page, one count; display label is the codepoint-smallest normalized variant, so `['AI','ai']` → `'AI'` (#38, #39). Test both input orders. |
| slug collision | Resolved by `-2`, `-3`, … in `id`-ascending order, skipping candidates that are any post's base slug (#17–#19). Test, including the reversed-input equality. |
| date that fails to parse | `parsePostDate` → `null` (#23–#26); `comparePosts` sorts it last (#32, #33). The schema rejects it, so no such post can ship. Test both the pure functions and `safeParse`. |
| empty slugify result | `''` from `slugify` (#12); `assignSlugs` substitutes `'post'` (#20); `tagCounts`/`postsWithTag` drop the tag instead (#42). Test all three. |
| unicode / accents / emoji / non-Latin titles | #6–#8, #11, #12. Test. |
| single post | `sortPostsByDate([p])` returns a 1-element array holding that same object; `comparePosts(p, p) === 0`. Test. |
| all-equal sort keys | `comparePosts` → `0` and `sortPostsByDate` preserves input order (`Array.prototype.sort` is stable). Test. |
| unordered input array | Output of `sortPostsByDate`, `tagCounts`, and `assignSlugs` depends only on content, never on position — except a full `comparePosts` tie, which is stable. Test with a shuffled input. |
| `null` / `undefined` passed to any exported function | Undefined, do not test. Parameters are typed; only the schema is contracted for arbitrary input. |
| `description` of exactly 300 characters | Accepted; 301 rejected. Test both. |
| very long title (500+ chars) | Accepted; slug is not truncated. Do not test. |
| a tag page for a tag no post carries | No page generated (`getStaticPaths` derives paths from `tagCounts`), so 404. Not tested (needs a build). |

## Invariants

1. Every non-empty `slugify` result matches `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, and `slugify` is
   idempotent on its own non-empty output.
2. `assignSlugs(xs)` has exactly one key per input `id`, all values are distinct, every value is a
   non-empty valid slug, and shuffling `xs` yields a deep-equal object.
3. `comparePosts` is a total order — antisymmetric, transitive, returning exactly `-1`, `0`, or `1`,
   and `0` only when `date`, `title`, and `id` are all equal. When both dates are unparseable and
   title and id tie, the raw date strings are compared codepoint-wise as a final key, so two
   different invalid dates never compare `0`.
4. `sortPostsByDate(xs).length === xs.length`, elements are the same object references, and the
   function is idempotent.
5. `publishedPosts(xs)` is a subsequence of `xs` holding the same object references.
6. Every `TagSummary.count` is ≥ 1 and ≤ `posts.length`; `tagCounts(posts).length` equals the number
   of distinct non-empty tag slugs across `posts`; slugs in the result are unique.
7. For every `t` in `tagCounts(posts)`, `postsWithTag(posts, t.slug).length === t.count`, and
   `tagSlug(t.label) === t.slug`.
8. `src/lib/posts.ts` contains no `import`, no `require`, and no reference to `process`, `fs`,
   `Astro`, or `import.meta`. **Review-only, not testable from the suite** — reading the module text
   needs `node:fs`, which the test contract forbids.

## Content (exact literal)

`src/content/blog/building-a-spec-harness.md` — note the **quoted** date:

```markdown
---
title: 'Building a Spec Harness for This Site'
date: '2026-09-14'
description: 'Why every feature on this site starts as a written spec, and what changed once the specs came before the code.'
tags: ['Testing', 'Process', 'Astro']
---

I build this site feature by feature, and every feature starts as a document rather than a file of
code. The spec names the exact module path, the exact exported functions, and a table of inputs with
the literal values they should return. Only then does anything get written.

The reason is narrower than it sounds. A spec that says “returns a list” is worth very little, but a
spec that says `slugify('Café Déjà Vu')` returns `'cafe-deja-vu'` is worth a lot, because someone who
has never seen my implementation can write a test from that line alone. That is the whole trick: the
person writing the tests works from the document, not from the code, so the tests check what I said I
would build instead of what I happened to build.

It has already caught things. Writing the slug rules down forced me to decide what happens to an
apostrophe, to an accent, to a title that is nothing but emoji, and to two different titles that
normalize to the same slug — questions I would otherwise have answered by accident, whichever way the
first implementation fell out.

The habit comes straight out of what I study. Agentic systems built on language models are hard to
test because they do not behave the same way twice, and the thing that survives that is a contract:
say what must be true, then check it. A personal site is a low-stakes place to practise.
```

### Page contract (verified by `npm run build` and by eye, not by Vitest)

- Every page derives slugs once via `assignSlugs(entries.map(e => ({ id: e.id, title: e.data.title })))`
  so the index, detail pages, tag pages, and feed agree on every URL.
- `src/pages/blog/index.astro` — `<BaseLayout title="Blog" description="Notes from Seth Jones on
  software engineering for AI, testing, and building things.">`, one `<h1>Blog</h1>`, an intro
  paragraph, then `sortPostsByDate(publishedPosts(entries))` as one `<article>` per post with
  `<h2><a href={postHref(slug)}>{title}</a></h2>`, a `<time datetime={date}>` line, `{description}`,
  and links to each of its tags via `tagHref(tagSlug(tag))`. A tag list from `tagCounts(published)`
  renders as `label (count)` links. Empty collection → one paragraph, no `<article>`.
- `src/pages/blog/[slug].astro` — `getStaticPaths` over `publishedPosts(entries)` only, so drafts get
  no page anywhere, not even by direct URL. `<BaseLayout title={data.title} description={data.description}>`,
  one `<h1>`, the `<time>` line, tag links, then the rendered Markdown body.
- `src/pages/blog/tags/[tag].astro` — one path per entry of `tagCounts(publishedPosts(entries))`,
  param `tag` = the tag slug. `<h1>Posts tagged “{label}”</h1>` and the same post cards as the index,
  from `sortPostsByDate(postsWithTag(publishedPosts(entries), slug))`.
- `src/pages/rss.xml.ts` — `export const GET: APIRoute = (context) => rss({ title: SITE_TITLE,
  description: SITE_DESCRIPTION, site: context.site!, items, trailingSlash: true })` with `items`
  built from `sortPostsByDate(publishedPosts(entries))`: `title`, `description`,
  `link: postHref(slug)`, `pubDate: new Date(parsePostDate(date)!)`, `categories: tags`. Drafts
  excluded. Feed path is **`/rss.xml`**.
- `src/layouts/BaseLayout.astro` — add exactly one line inside `<head>`:
  `<link rel="alternate" type="application/rss+xml" title={SITE_TITLE} href="/rss.xml" />`.
- Styling: scoped `<style>` in the new pages only, every value via existing semantic tokens
  (`--color-surface`, `--color-border`, `--color-text-muted`, `--radius-md`, `--shadow-sm`,
  `--space-*`, `--text-sm`). No new tokens, no edits to `global.css`.

## Non-goals

- The Vitest suite must not run `astro build`, import `astro:content` or `@astrojs/rss`, read
  `src/content/**` or `dist/**`, or render `.astro` files. Tests import only the two `src/lib`
  modules and pass plain object literals.
- No feed-XML assertions, no RSS validator in CI, no Atom or JSON feed.
- No pagination, search, related posts, reading time, author field, per-post images, series, comments,
  or tag-page pagination. No `updated` date. No `MDX`.
- No edits to `NAV_ITEMS` (`/blog/` is already listed), the header, the footer, or the tokens.
- No second post to pad the index, and no placeholder post.

## Open questions

1. **The post copy is a draft for Seth to revise.** Voice matches `src/pages/about.astro`, but the
   wording and the tag choices (`Testing`, `Process`, `Astro`) are mine, not his. The `date`
   `'2026-09-14'` is today's date and should be set to the real publication day.
2. **`astro/zod` export path** — same assumption as `specs/projects-collection.spec.md` §Open
   questions 3. If it does not resolve, add `zod` at Astro's version and keep the module path
   `src/lib/posts-schema.ts` and the export name `postSchema` identical, since tests import them blind.
3. **`trailingSlash: true` in `rss()`** — assumed available in `@astrojs/rss` 4.0.19. If not, `link`
   values already carry a trailing slash from `postHref`, so drop the option; the emitted URLs must
   still end in `/`.
4. **Draft visibility in `astro dev`** is not special-cased: drafts are invisible in dev too. If Seth
   wants to preview them, gate `publishedPosts` on `import.meta.env.DEV` in the pages only — never in
   `src/lib/posts.ts`, which must stay import-free.
