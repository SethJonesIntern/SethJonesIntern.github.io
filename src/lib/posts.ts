/* Pure decision logic for the blog collection: no dependencies, no I/O, and the
   same output for the same input, so it can be unit-tested on its own. The file
   is deliberately free of module and platform references — keep it that way
   when editing. Casing and comparisons are codepoint-wise, never locale-aware,
   so a slug or an ordering can never depend on the host locale. */

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

/** Base slug for a post whose title leaves nothing behind after slugification. */
const EMPTY_SLUG_FALLBACK = 'post';

/** Year floor: `Date.UTC` remaps years 0–99 into the 1900s, so reject anything below 1000. */
const MIN_YEAR = 1000;

const DAYS_IN_MONTH: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Codepoint-wise, never locale-aware: results must not depend on the host locale. */
function compareStrings(a: string, b: string): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Proleptic Gregorian leap rule, matching the calendar `Date.UTC` uses. */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** `month` is 1-based. */
function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1] ?? 0;
}

/** URL-safe slug for a title. Returns '' when nothing survives normalization. */
export function slugify(title: string): string {
  if (typeof title !== 'string') return '';
  return (
    title
      .normalize('NFD')
      // Drop the combining marks NFD just exposed, so accents fold into ASCII.
      .replace(/[̀-ͯ]/g, '')
      // Apostrophes vanish outright: "Seth’s" must slug as `seths`, not `seth-s`.
      .replace(/['’]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

/** Trim, then collapse every internal whitespace run to one U+0020. Case preserved. */
export function normalizeTag(tag: string): string {
  if (typeof tag !== 'string') return '';
  return tag.trim().replace(/\s+/g, ' ');
}

/** slugify(normalizeTag(tag)). The grouping key for tags; case-insensitive by construction. */
export function tagSlug(tag: string): string {
  return slugify(normalizeTag(tag));
}

/** Unique slug per post, keyed by `id`. Output never depends on input array order. */
export function assignSlugs(sources: readonly SlugSource[]): Record<string, string> {
  const seenIds = new Set<string>();
  for (const source of sources) {
    const id = typeof source.id === 'string' ? source.id : '';
    if (id.trim() === '') {
      throw new TypeError('assignSlugs: id must be a non-empty string');
    }
    if (seenIds.has(id)) {
      throw new TypeError(`assignSlugs: duplicate id "${id}"`);
    }
    seenIds.add(id);
  }

  const baseOf = (source: SlugSource): string => {
    const base = slugify(source.title);
    return base === '' ? EMPTY_SLUG_FALLBACK : base;
  };

  // Every base is reserved up front, so a `-2` suffix can never steal the base
  // slug of a post that comes later in id order.
  const bases = new Set<string>(sources.map(baseOf));

  // id-ascending, not input order: the assignment must not depend on position.
  const ordered = [...sources].sort((a, b) => compareStrings(a.id, b.id));

  const assigned = new Set<string>();
  const slugs: Record<string, string> = {};

  for (const source of ordered) {
    const base = baseOf(source);
    let slug = base;
    if (assigned.has(base)) {
      let suffix = 2;
      while (bases.has(`${base}-${suffix}`) || assigned.has(`${base}-${suffix}`)) {
        suffix += 1;
      }
      slug = `${base}-${suffix}`;
    }
    assigned.add(slug);
    slugs[source.id] = slug;
  }

  return slugs;
}

/** Epoch milliseconds at UTC midnight, or null if `value` is not a strict 'YYYY-MM-DD' calendar date. */
export function parsePostDate(value: string): number | null {
  if (typeof value !== 'string') return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < MIN_YEAR) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return Date.UTC(year, month - 1, day);
}

/** Total order: date descending (newest first), then `title`, then `id` ascending. Exactly -1, 0, 1. */
export function comparePosts(a: PostSortInput, b: PostSortInput): -1 | 0 | 1 {
  const aTime = parsePostDate(a.date);
  const bTime = parsePostDate(b.date);

  // An unparseable date sorts last in both directions; ordering it against a
  // real date by `<`/`>` would otherwise make the comparator intransitive.
  if (aTime === null || bTime === null) {
    if (aTime !== null) return -1;
    if (bTime !== null) return 1;
  } else {
    if (aTime > bTime) return -1;
    if (aTime < bTime) return 1;
  }

  const byTitle = compareStrings(a.title, b.title);
  if (byTitle !== 0) return byTitle;

  const byId = compareStrings(a.id, b.id);
  if (byId !== 0) return byId;

  // Only reachable with two distinct unparseable dates (valid ones are equal
  // strings once their times match); without it they would tie at 0.
  return compareStrings(a.date, b.date);
}

/** New array sorted by `comparePosts`. Never mutates or aliases the input. */
export function sortPostsByDate<T extends PostSortInput>(posts: readonly T[]): T[] {
  // Array.prototype.sort is stable, so a full tie preserves input order.
  return [...posts].sort(comparePosts);
}

/** New array with `draft === true` entries removed. Relative order preserved. */
export function publishedPosts<T extends { readonly draft?: boolean }>(posts: readonly T[]): T[] {
  // Only an explicit `true` hides a post: an absent `draft` means published.
  return posts.filter((post) => post.draft !== true);
}

/** One entry per distinct tag slug; count descending, then slug ascending. */
export function tagCounts(posts: readonly TagSource[]): TagSummary[] {
  const bySlug = new Map<string, { slug: string; label: string; count: number }>();

  for (const post of posts) {
    // Duplicate tags on one post count once, however they are cased or spaced.
    const countedHere = new Set<string>();

    for (const tag of post.tags) {
      const label = normalizeTag(tag);
      const slug = slugify(label);
      // A tag that slugifies to '' has no page and no key, so drop it entirely:
      // the `'post'` fallback belongs to slug assignment, not to tags.
      if (slug === '') continue;

      const existing = bySlug.get(slug);
      if (existing === undefined) {
        bySlug.set(slug, { slug, label, count: 1 });
        countedHere.add(slug);
        continue;
      }

      // The display label is the codepoint-smallest variant, so it does not
      // depend on which post happened to be read first.
      if (label < existing.label) existing.label = label;
      if (!countedHere.has(slug)) {
        existing.count += 1;
        countedHere.add(slug);
      }
    }
  }

  return [...bySlug.values()].sort((a, b) => {
    if (a.count > b.count) return -1;
    if (a.count < b.count) return 1;
    return compareStrings(a.slug, b.slug);
  });
}

/** New array of posts carrying `tag` (compared by `tagSlug`). Relative order preserved. */
export function postsWithTag<T extends TagSource>(posts: readonly T[], tag: string): T[] {
  const wanted = tagSlug(tag);
  // No post carries a tag that slugifies to '', so nothing can match it.
  if (wanted === '') return [];
  return posts.filter((post) => post.tags.some((candidate) => tagSlug(candidate) === wanted));
}

/** Strip surrounding slashes and whitespace, the shared front half of both href builders. */
function hrefSlug(slug: string): string {
  return typeof slug === 'string' ? slug.trim().replace(/^\/+|\/+$/g, '').trim() : '';
}

/** '/blog/<slug>/'. Throws TypeError on an effectively empty slug. */
export function postHref(slug: string): string {
  const safe = hrefSlug(slug);
  if (safe === '') {
    throw new TypeError('postHref: slug must be a non-empty string');
  }
  return `/blog/${safe}/`;
}

/** '/blog/tags/<slug>/'. Throws TypeError on an effectively empty slug. */
export function tagHref(slug: string): string {
  const safe = hrefSlug(slug);
  if (safe === '') {
    throw new TypeError('tagHref: slug must be a non-empty string');
  }
  return `/blog/tags/${safe}/`;
}
