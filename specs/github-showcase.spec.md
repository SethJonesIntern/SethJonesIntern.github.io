# Live GitHub Repo Showcase

Issue: personal-website #6 — "Live GitHub repo showcase"

## Purpose

`/projects/` currently renders only the three curated Markdown entries from the `projects` collection
(spec: `specs/projects-collection.spec.md`). This feature appends a second section to that page
listing public repositories for the GitHub user `SethJonesIntern`, fetched **once at build time** by
an unauthenticated request. Forks, archived repos, and the website repo itself are excluded; the rest
are ranked by an explicit, documented rule and the top six are shown with language, description, and
star count where those exist. All decision logic (filtering, ranking, display-field derivation,
response validation) lives in `src/lib/github.ts` with **zero imports**, matching the convention of
`src/lib/projects.ts`. The single network call is isolated in `src/lib/github-fetch.ts`, which the
pure module never imports, and which never throws or rejects — an unreachable or rate-limited API
degrades to a static fallback paragraph so the deploy still succeeds. No token is used or committed.

## Public API

### Files

```
src/lib/github.ts          (pure logic; ZERO imports of any kind)
src/lib/github-fetch.ts    (network; imports only types/constants from './github')
src/pages/projects/index.astro  (edited: one new section + scoped styles)
```

`src/lib/github.ts` must not import `./github-fetch`. Leave `src/lib/projects.ts`,
`src/lib/projects-schema.ts`, `src/consts.ts`, `src/layouts/**`, `src/components/**`, `src/styles/**`,
`astro.config.mjs`, and `package.json` untouched.

### `src/lib/github.ts` — exact exports

```ts
export const GITHUB_USERNAME = 'SethJonesIntern';
export const WEBSITE_REPO_NAME = 'SethJonesIntern.github.io';
export const SHOWCASE_LIMIT = 6;
export const GITHUB_PROFILE_URL = 'https://github.com/SethJonesIntern';

/** The only API fields this feature reads. Names match the GitHub REST payload exactly. */
export interface RepoInput {
  readonly name: string;
  readonly html_url: string;
  readonly description: string | null;
  readonly language: string | null;
  readonly stargazers_count: number;
  readonly fork: boolean;
  readonly archived: boolean;
  readonly pushed_at: string; // ISO 8601 UTC, e.g. '2026-03-04T12:00:00Z'
}

/** Render-ready shape. `description`/`language` are null when absent; `stars` is 0 when none. */
export interface ShowcaseRepo {
  readonly name: string;
  readonly url: string;
  readonly description: string | null;
  readonly language: string | null;
  readonly stars: number;
  readonly meta: string;
}

/** True when a repo belongs in the showcase: not a fork, not archived, not the website repo. */
export function isShowcaseRepo(repo: RepoInput): boolean;

/** New array of the repos `isShowcaseRepo` accepts, in input order. Never mutates the input. */
export function filterRepos(repos: readonly RepoInput[]): RepoInput[];

/** Total order: stars descending, then `pushed_at` descending, then `name` ascending
    (codepoint-wise; never `localeCompare`). Returns exactly -1, 0, or 1. */
export function compareRepos(a: RepoInput, b: RepoInput): -1 | 0 | 1;

/** Filter, then sort by `compareRepos`. No slicing. New array; input untouched. */
export function rankRepos(repos: readonly RepoInput[]): RepoInput[];

/** `''` when stars is 0/negative/non-integer/NaN; otherwise `'1 star'` / `'N stars'`. No grouping separator. */
export function formatStars(stars: number): string;

/** Present parts joined by `' · '` (space, U+00B7, space): language, then `formatStars`. */
export function repoMetaLine(repo: RepoInput): string;

/** Projection to `ShowcaseRepo`. Trims `description`; blank-after-trim becomes null. */
export function toShowcaseRepo(repo: RepoInput): ShowcaseRepo;

/** Drops anything that is not a structurally valid `RepoInput`. Returns `[]` for any non-array. */
export function parseRepoList(value: unknown): RepoInput[];

/** `rankRepos` then `.slice(0, limit)` then `toShowcaseRepo`. Throws on an invalid `limit`. */
export function selectShowcaseRepos(repos: readonly RepoInput[], limit?: number): ShowcaseRepo[];
```

### `src/lib/github-fetch.ts` — exact exports

```ts
import { GITHUB_USERNAME, parseRepoList, type RepoInput } from './github';

export const GITHUB_REPOS_URL =
  'https://api.github.com/users/SethJonesIntern/repos?per_page=100&sort=pushed&type=owner';

export interface RepoFetchResult {
  readonly ok: boolean;
  readonly repos: readonly RepoInput[]; // `[]` whenever `ok` is false
  readonly reason: string | null; // null when ok; a short diagnostic otherwise
}

/** Unauthenticated GET, no `Authorization` header, ever. Resolves — never throws, never rejects.
    Any network error, non-2xx status (403/429 = rate limit), timeout, or unparseable body
    resolves to `{ ok: false, repos: [], reason: <string> }`. */
export function fetchShowcaseRepos(options?: {
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number; // default 5000
}): Promise<RepoFetchResult>;
```

### Test setup

Vitest 5 via `npm test`; files in `tests/` named `*.test.ts`. Tests **must not** touch the network:
import only `src/lib/github.ts` and pass object literals. Do not import `src/lib/github-fetch.ts`,
do not mock `fetch`, do not run `astro build`.

```ts
import {
  GITHUB_PROFILE_URL, GITHUB_USERNAME, SHOWCASE_LIMIT, WEBSITE_REPO_NAME,
  compareRepos, filterRepos, formatStars, isShowcaseRepo, parseRepoList,
  rankRepos, repoMetaLine, selectShowcaseRepos, toShowcaseRepo, type RepoInput,
} from '../src/lib/github';
```

Test fixtures are built from this base, overriding only the fields under test:

```ts
const base: RepoInput = {
  name: 'repo', html_url: 'https://github.com/SethJonesIntern/repo',
  description: null, language: null, stargazers_count: 0,
  fork: false, archived: false, pushed_at: '2026-01-01T00:00:00Z',
};
```

## Behavior

| # | input | expected output | notes |
|---|---|---|---|
| 1 | `isShowcaseRepo({...base, name:'honeynet'})` | `true` | plain owned repo |
| 2 | `isShowcaseRepo({...base, fork:true})` | `false` | forks excluded |
| 3 | `isShowcaseRepo({...base, archived:true})` | `false` | archived excluded |
| 4 | `isShowcaseRepo({...base, name:'SethJonesIntern.github.io'})` | `false` | website repo excluded by `name` |
| 5 | `isShowcaseRepo({...base, name:'sethjonesintern.github.io'})` | `false` | name match is case-insensitive |
| 6 | `isShowcaseRepo({...base, name:'github.io'})` | `true` | only the exact repo name is excluded |
| 7 | `filterRepos([{...base,name:'a'},{...base,name:'b',fork:true},{...base,name:'c',archived:true},{...base,name:'SethJonesIntern.github.io'},{...base,name:'d'}])` | names `['a','d']` | input order preserved |
| 8 | `compareRepos({...base,name:'a',stargazers_count:9}, {...base,name:'b',stargazers_count:2})` | `-1` | more stars first |
| 9 | `compareRepos({...base,name:'b',stargazers_count:2}, {...base,name:'a',stargazers_count:9})` | `1` | antisymmetric |
| 10 | `compareRepos({...base,name:'a',stargazers_count:3,pushed_at:'2026-05-01T00:00:00Z'}, {...base,name:'b',stargazers_count:3,pushed_at:'2026-01-01T00:00:00Z'})` | `-1` | star tie → newer `pushed_at` first |
| 11 | `compareRepos({...base,name:'alpha',stargazers_count:3}, {...base,name:'beta',stargazers_count:3})` | `-1` | stars + `pushed_at` tie → `name` ascending |
| 12 | `compareRepos({...base,name:'Zebra'}, {...base,name:'apple'})` | `-1` | codepoint compare: `'Z'`(90) < `'a'`(97) |
| 13 | `compareRepos({...base,name:'x'}, {...base,name:'x'})` | `0` | full tie |
| 14 | `rankRepos([{...base,name:'c',stargazers_count:1},{...base,name:'a',stargazers_count:5},{...base,name:'b',stargazers_count:5,fork:true},{...base,name:'d',stargazers_count:5,pushed_at:'2026-06-01T00:00:00Z'}])` | names `['d','a','c']` | fork dropped; `d` outranks `a` on recency at equal stars |
| 15 | `formatStars(0)` / `(1)` / `(2)` / `(1234)` | `''` / `'1 star'` / `'2 stars'` / `'1234 stars'` | no thousands separator (locale-independent) |
| 16 | `formatStars(-1)` / `(1.5)` / `(NaN)` | `''` / `''` / `''` | treated as absent |
| 17 | `repoMetaLine({...base, language:'Python', stargazers_count:3})` | `'Python · 3 stars'` | separator is space + U+00B7 + space |
| 18 | `repoMetaLine({...base, language:'Python', stargazers_count:0})` | `'Python'` | zero stars omitted, no dangling separator |
| 19 | `repoMetaLine({...base, language:null, stargazers_count:4})` | `'4 stars'` | missing language omitted |
| 20 | `repoMetaLine({...base, language:null, stargazers_count:0})` | `''` | nothing to show |
| 21 | `repoMetaLine({...base, language:'  ', stargazers_count:1})` | `'1 star'` | blank-after-trim language treated as absent |
| 22 | `toShowcaseRepo({...base, name:'honeynet', html_url:'https://github.com/SethJonesIntern/honeynet', description:'  A trap.  ', language:'Python', stargazers_count:2})` | `{name:'honeynet', url:'https://github.com/SethJonesIntern/honeynet', description:'A trap.', language:'Python', stars:2, meta:'Python · 2 stars'}` | description trimmed |
| 23 | `toShowcaseRepo({...base, description:''}).description` / `({...base, description:'   '}).description` / `({...base, description:null}).description` | `null` / `null` / `null` | blank normalises to null |
| 24 | `toShowcaseRepo({...base, language:'  '}).language` | `null` | same normalisation |
| 25 | `selectShowcaseRepos([])` | `[]` | |
| 26 | `selectShowcaseRepos(seven repos with `stargazers_count` 7..1 and names 'r7'..'r1')` | 6 items, names `['r7','r6','r5','r4','r3','r2']` | default limit is `SHOWCASE_LIMIT` |
| 27 | `selectShowcaseRepos([{...base,name:'a'},{...base,name:'b'}], 1)` | 1 item, `name === 'a'` | explicit limit |
| 28 | `selectShowcaseRepos([{...base,name:'a'}], 0)` | `[]` | zero is legal |
| 29 | `parseRepoList([base])` | `[base]` (deep-equal, all eight fields) | valid entry kept |
| 30 | `parseRepoList([base, {name:'x'}, null, 42, 'repo', {...base, stargazers_count:'3'}])` | `[base]` | structurally invalid entries dropped, not thrown |
| 31 | `parseRepoList(null)` / `(undefined)` / `({message:'Not Found'})` / `('')` | `[]` / `[]` / `[]` / `[]` | non-array input, e.g. a GitHub error object |
| 32 | `parseRepoList([{...base, description:undefined}])` | `[]` | `description` must be present as `string` or `null` |
| 33 | `parseRepoList([{...base, extra:true}])[0]` | deep-equals `base` plus `extra: true` | unknown API fields tolerated and carried |
| 34 | `GITHUB_USERNAME` / `WEBSITE_REPO_NAME` / `SHOWCASE_LIMIT` / `GITHUB_PROFILE_URL` | `'SethJonesIntern'` / `'SethJonesIntern.github.io'` / `6` / `'https://github.com/SethJonesIntern'` | exact values |

## Errors

| condition | exception type / result | message contract |
|---|---|---|
| `selectShowcaseRepos(repos, -1)` / `(repos, 1.5)` / `(repos, NaN)` | throws `RangeError` | exactly `'selectShowcaseRepos: limit must be a non-negative integer'` |
| `parseRepoList` given any malformed value | never throws; returns `[]` or the valid subset | rows 30–32 |
| `fetchShowcaseRepos` — network error, DNS failure, timeout | resolves `{ok:false, repos:[], reason:<non-empty string>}` | never throws/rejects. Not covered by the suite (network) |
| `fetchShowcaseRepos` — HTTP 403/429 (unauthenticated limit is **60 requests/hour per IP**) | same shape; `reason` names the status | a rate-limited CI run must still build |
| `fetchShowcaseRepos` — 2xx with non-JSON or non-array body | `{ok:false, repos:[], reason:<string>}` via `parseRepoList` returning `[]` | |
| build-time failure of any kind | `npm run build` still exits `0`; the page renders the fallback and logs one `console.warn` line containing `reason` | a failed fetch must never fail the deploy |

## Boundaries

| boundary | answer |
|---|---|
| empty repo list | `filterRepos([]) === []` (new array), `rankRepos([]) === []`, `selectShowcaseRepos([]) === []`. Test. |
| all repos filtered out | `selectShowcaseRepos([{...base,fork:true},{...base,archived:true},{...base,name:WEBSITE_REPO_NAME}])` → `[]`. Page renders the empty/fallback paragraph. Test the function only. |
| missing description | `description: null` or blank → `ShowcaseRepo.description === null`; the page emits no `<p>` at all (rows 22–23). Test. |
| missing language | `language: null` or blank → omitted from `meta` and from `ShowcaseRepo` (rows 19, 21, 24). Test. |
| zero stars | omitted from `meta`; `ShowcaseRepo.stars === 0` (rows 15, 18). Test. |
| fetch failure | `{ok:false, repos:[], reason}`; page renders the fallback paragraph. **Do not test** — needs the network or a `fetch` mock, both forbidden. |
| malformed API response | `parseRepoList` rows 30–32. Test with plain literals. |
| unicode names/descriptions/languages | Round-trip unchanged; ordering is codepoint-wise (row 12). `toShowcaseRepo({...base,name:'grid-Ω',description:'Ω 😀'})` preserves both. Test. |
| negative `stargazers_count` | `formatStars` → `''`; still sorts numerically. Test `formatStars(-1)`. |
| `Number.MAX_SAFE_INTEGER` stars | Accepted; compares numerically, `formatStars` yields `'9007199254740991 stars'`. Test if convenient. |
| duplicate repo names | Legal input; full ties give `compareRepos → 0` and `Array.prototype.sort` stability preserves input order. Test. |
| unordered input array | Output depends only on the sort keys, never input position, except under a full tie (rows 14, 26). |
| `null`/`undefined` passed to `isShowcaseRepo`, `compareRepos`, `filterRepos`, `rankRepos`, `toShowcaseRepo`, `repoMetaLine`, `selectShowcaseRepos` | Undefined, do not test. Those params are typed; only `parseRepoList` and `formatStars` are contracted for arbitrary input. |
| malformed `pushed_at` (e.g. `'not-a-date'`) | Compared as a raw string, never `Date`-parsed; ordering is defined but unspecified in meaning. Do not assert an order for it. |

## Invariants

1. `compareRepos` is a total order: `sign(cmp(a,b)) === -sign(cmp(b,a))`, transitive, and returns `0`
   only when stars, `pushed_at`, and `name` are all equal. Return values are exactly `-1`, `0`, `1`.
2. `filterRepos`/`rankRepos`/`parseRepoList`/`selectShowcaseRepos` never mutate or alias their input:
   the returned array is `!==` the argument and the argument's element order is unchanged.
3. `rankRepos(xs).length <= xs.length`; every element of `rankRepos(xs)` is an element of `xs` and
   satisfies `isShowcaseRepo`.
4. `selectShowcaseRepos(xs, n).length === Math.min(n, rankRepos(xs).length)`.
5. `rankRepos` is idempotent: `rankRepos(rankRepos(xs))` deep-equals `rankRepos(xs)`.
6. `repoMetaLine(r)` has no leading/trailing whitespace and no doubled or dangling `' · '`.
7. `toShowcaseRepo(r).meta === repoMetaLine(r)` for every `r`.
8. Every element of `parseRepoList(v)` satisfies the `RepoInput` field types.
9. `src/lib/github.ts` contains no `import`, no `require`, no `fetch`, and no reference to `process`,
   `fs`, `Astro`, or `import.meta`. **Review-only, not testable from the suite** (same reasoning as
   invariant 5 of `specs/projects-collection.spec.md`).

## Page contract (verified by `npm run build` and by eye, not by Vitest)

In `src/pages/projects/index.astro`, after the existing curated `.project-list`, add:

- Frontmatter: `const { ok, repos, reason } = await fetchShowcaseRepos();` then
  `const showcase = selectShowcaseRepos(repos);`. Wrap nothing in `try`/`catch` for control flow —
  `fetchShowcaseRepos` already absorbs failures — and `console.warn` once when `!ok`, including `reason`.
- `<h2>From GitHub</h2>` plus one sentence of framing that states the list is built at deploy time.
- When `showcase.length > 0`: `<ul class="repo-list">`, one `<li class="repo-card">` each, containing
  `<h3><a href={repo.url} rel="noopener">{repo.name}</a></h3>`, then
  `{repo.meta !== '' && <p class="repo-card__meta">{repo.meta}</p>}`, then
  `{repo.description && <p>{repo.description}</p>}`. Never emit an empty `<p>`, the string
  `'null'`, or `href="undefined"`.
- When `showcase.length === 0` (fetch failed, rate-limited, or everything filtered out): exactly one
  paragraph, no `<ul>`, no error detail — `Live repository data is not available right now. My work is
  on <a href={GITHUB_PROFILE_URL} rel="noopener">GitHub</a>.`
- Styling: scoped `<style>` in this page only, reusing existing semantic tokens
  (`--color-surface`, `--color-border`, `--color-text-muted`, `--radius-md`, `--shadow-sm`,
  `--space-*`, `--text-sm`, `--text-lg`, `--color-link`, `--color-link-hover`). Mirror the
  `.project-card` treatment; add the same `h3 a:visited { color: var(--color-link); }` guard the
  existing card titles use. No new tokens, no edits to `global.css` or `tokens.css`.

## Non-goals

- No token, no `Authorization` header, no `.env` file, no GitHub Actions secret, no `GITHUB_TOKEN`
  read from `process.env`. The request is unauthenticated by design.
- No runtime/client-side fetching, no ISR, no caching layer, no committed JSON snapshot of the API.
- No pagination beyond the single `per_page=100` request; no topics, owner avatars, commit activity,
  language-colour dots, contribution graphs, or per-repo detail pages.
- The Vitest suite must not mock `fetch`, import `src/lib/github-fetch.ts`, run `astro build`,
  import `astro:content`, or render `.astro` files.
- No changes to the `projects` collection, its schema, `NAV_ITEMS`, the header, or the footer.

## Open questions

1. **The GitHub account is unverified.** I could not confirm that `SethJonesIntern` exists, is the
   right account, or has public non-fork repos. If it is wrong, only `GITHUB_USERNAME`,
   `WEBSITE_REPO_NAME`, `GITHUB_PROFILE_URL`, and `GITHUB_REPOS_URL` change; every exported name and
   signature stays identical, so the suite is unaffected.
2. **Display count 6 is a judgement call**, chosen to fill two rows without dwarfing the three
   curated entries. `SHOWCASE_LIMIT` is a one-line change.
3. **Ranking rule is a judgement call**: stars, then recency, then name. If the account has few stars
   the list is effectively recency-ordered, which is the intended fallback behaviour.
4. **Node 22 global `fetch` + `AbortSignal.timeout`** is assumed available in the Astro build process
   (`engines.node >= 22.12.0`); not executed. If unavailable, keep the signature and implement the
   timeout with `AbortController` + `setTimeout`.
5. **Section placement and copy** (curated projects first, GitHub second) is my call; Seth may prefer
   the showcase on the home page instead. Moving it means moving the two frontmatter lines and the
   markup — no change to `src/lib/github.ts`.
6. **`type=owner` in the query** should already exclude repos owned by others but not forks the user
   owns; `isShowcaseRepo` filters forks regardless, so correctness does not depend on the parameter.
