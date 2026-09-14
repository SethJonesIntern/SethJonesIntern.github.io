/* Pure decision logic for the GitHub repo showcase: no dependencies, no I/O,
   and the same output for the same input, so it can be unit-tested on its own.
   The single network call lives in a sibling module that this file must never
   reach for. Keep the file deliberately free of module and platform
   references when editing. */

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

/** Space, U+00B7 MIDDLE DOT, space — the same separator the site uses for meta lines. */
const META_SEPARATOR = ' · ';

/** Codepoint-wise, never locale-aware: results must not depend on the host locale. */
function compareStrings(a: string, b: string): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Descending numeric compare. A NaN arriving from unvalidated data would make
    every `<`/`>` false and so make the order intransitive, so NaN sorts last
    regardless of direction, keeping the comparator a total order. */
function compareStarsDescending(a: number, b: number): -1 | 0 | 1 {
  const aInvalid = typeof a !== 'number' || Number.isNaN(a);
  const bInvalid = typeof b !== 'number' || Number.isNaN(b);
  if (aInvalid || bInvalid) {
    if (aInvalid && bInvalid) return 0;
    return aInvalid ? 1 : -1;
  }
  if (a > b) return -1;
  if (a < b) return 1;
  return 0;
}

/** The parameters below are typed, so an absent repo is out of contract; every
    function still stays total rather than throwing on one. */
function isObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}

/** Trimmed text, or `null` when the value is absent or blank after trimming. */
function normaliseText(value: string | null): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** True when a repo belongs in the showcase: not a fork, not archived, not the website repo. */
export function isShowcaseRepo(repo: RepoInput): boolean {
  if (!isObject(repo)) return false;
  if (repo.fork === true || repo.archived === true) return false;
  // The website repo is excluded by name, case-insensitively: GitHub treats
  // repository names as case-insensitive, and only this exact name is dropped.
  const name = typeof repo.name === 'string' ? repo.name.trim() : '';
  return name.toLowerCase() !== WEBSITE_REPO_NAME.toLowerCase();
}

/** New array of the repos `isShowcaseRepo` accepts, in input order. Never mutates the input. */
export function filterRepos(repos: readonly RepoInput[]): RepoInput[] {
  if (!Array.isArray(repos)) return [];
  return repos.filter(isShowcaseRepo);
}

/** Total order: stars descending, then `pushed_at` descending, then `name` ascending
    (codepoint-wise; never `localeCompare`). Returns exactly -1, 0, or 1. */
export function compareRepos(a: RepoInput, b: RepoInput): -1 | 0 | 1 {
  if (!isObject(a) || !isObject(b)) return 0;

  const byStars = compareStarsDescending(a.stargazers_count, b.stargazers_count);
  if (byStars !== 0) return byStars;

  // `pushed_at` is compared as a raw string, never Date-parsed: ISO 8601 UTC
  // sorts correctly lexicographically, and a malformed value still yields a
  // defined (if meaningless) order instead of a NaN timestamp.
  const byPushed = compareStrings(b.pushed_at, a.pushed_at);
  if (byPushed !== 0) return byPushed;

  return compareStrings(a.name, b.name);
}

/** Filter, then sort by `compareRepos`. No slicing. New array; input untouched. */
export function rankRepos(repos: readonly RepoInput[]): RepoInput[] {
  // filterRepos already returned a new array, so sorting it in place is safe.
  // Array.prototype.sort is stable, so a full tie preserves input order.
  return filterRepos(repos).sort(compareRepos);
}

/** `''` when stars is 0/negative/non-integer/NaN; otherwise `'1 star'` / `'N stars'`. No grouping separator. */
export function formatStars(stars: number): string {
  if (typeof stars !== 'number' || !Number.isInteger(stars) || stars <= 0) return '';
  // String(), not toLocaleString(): no thousands separator, no locale dependence.
  return stars === 1 ? '1 star' : `${String(stars)} stars`;
}

/** Present parts joined by `' · '` (space, U+00B7, space): language, then `formatStars`. */
export function repoMetaLine(repo: RepoInput): string {
  if (!isObject(repo)) return '';
  // Filtering the empty parts is what keeps the separator from doubling or
  // dangling when a language or a star count is absent.
  return [normaliseText(repo.language) ?? '', formatStars(repo.stargazers_count)]
    .filter((part) => part !== '')
    .join(META_SEPARATOR);
}

/** Projection to `ShowcaseRepo`. Trims `description`; blank-after-trim becomes null. */
export function toShowcaseRepo(repo: RepoInput): ShowcaseRepo {
  if (!isObject(repo)) {
    return { name: '', url: '', description: null, language: null, stars: 0, meta: '' };
  }
  const stars = repo.stargazers_count;
  return {
    name: typeof repo.name === 'string' ? repo.name : '',
    url: typeof repo.html_url === 'string' ? repo.html_url : '',
    description: normaliseText(repo.description),
    language: normaliseText(repo.language),
    // Preserved as given — `meta` is where an unusable count is dropped — but
    // never a NaN or an Infinity that could reach the page.
    stars: typeof stars === 'number' && Number.isFinite(stars) ? stars : 0,
    meta: repoMetaLine(repo),
  };
}

/** Structural guard for one entry of an unvalidated API payload. */
function isRepoInput(value: unknown): value is RepoInput {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['name'] === 'string' &&
    typeof candidate['html_url'] === 'string' &&
    (typeof candidate['description'] === 'string' || candidate['description'] === null) &&
    (typeof candidate['language'] === 'string' || candidate['language'] === null) &&
    typeof candidate['stargazers_count'] === 'number' &&
    typeof candidate['fork'] === 'boolean' &&
    typeof candidate['archived'] === 'boolean' &&
    typeof candidate['pushed_at'] === 'string'
  );
}

/** Drops anything that is not a structurally valid `RepoInput`. Returns `[]` for any non-array. */
export function parseRepoList(value: unknown): RepoInput[] {
  if (!Array.isArray(value)) return [];
  // Entries are carried through as-is so unknown API fields survive; the array
  // itself is new, so the caller's array is never aliased.
  return (value as readonly unknown[]).filter(isRepoInput);
}

/** `rankRepos` then `.slice(0, limit)` then `toShowcaseRepo`. Throws on an invalid `limit`. */
export function selectShowcaseRepos(
  repos: readonly RepoInput[],
  limit: number = SHOWCASE_LIMIT,
): ShowcaseRepo[] {
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 0) {
    throw new RangeError('selectShowcaseRepos: limit must be a non-negative integer');
  }
  return rankRepos(repos).slice(0, limit).map(toShowcaseRepo);
}
