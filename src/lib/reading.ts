/**
 * Bookshelf types and pure helpers.
 * Zero imports, no I/O: unit-testable without an Astro build. The book list
 * lives in `./reading-books` — keep this file free of module and platform
 * references, and free of book data, when editing.
 */

/** Shelf keys, in the order shelves are rendered on the page. */
export const SHELVES = ['technical', 'fiction'] as const;

export type Shelf = (typeof SHELVES)[number];

/** Heading text for each shelf. */
export const SHELF_LABELS: Readonly<Record<Shelf, string>> = {
  technical: 'Technical',
  fiction: 'Fiction',
};

/** Spine colour variants. A book names one; it never names a colour. */
export const SPINE_VARIANTS = ['clay', 'teal', 'ink', 'sand'] as const;

export type SpineVariant = (typeof SPINE_VARIANTS)[number];

/** Inclusive volume range for a multi-volume series: [first, last], 1-based integers. */
export type VolumeRange = readonly [number, number];

export interface Book {
  /** Stable kebab-case slug, unique within READING_LIST. Matches BOOK_ID_PATTERN. */
  readonly id: string;
  /** Title as printed, without any volume range. */
  readonly title: string;
  /** Author line as displayed, e.g. 'J. K. Rowling'. */
  readonly author: string;
  /** Which shelf the book stands on. */
  readonly shelf: Shelf;
  /** Which spine colour the book is bound in. */
  readonly spine: SpineVariant;
  /** Present only for a multi-volume series read as one entry. Omit for a single book. */
  readonly volumes?: VolumeRange;
}

export interface ShelfGroup {
  readonly shelf: Shelf;
  /** SHELF_LABELS[shelf]. */
  readonly label: string;
  /** The shelf's books, in READING_LIST order. */
  readonly books: readonly Book[];
}

/** Lowercase kebab-case: ASCII alphanumeric runs joined by single hyphens. No `g` flag. */
export const BOOK_ID_PATTERN: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A volume number: a finite, 1-based integer. Rejects NaN and Infinity by construction. */
function isVolumeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

/** Runtime guard for unvalidated values. True only for strings matching BOOK_ID_PATTERN. */
export function isBookId(value: unknown): value is string {
  // No trimming, casing or normalisation: an id is already valid or it is not.
  return typeof value === 'string' && BOOK_ID_PATTERN.test(value);
}

/** Runtime guard: true only for a string in SHELVES. */
export function isShelf(value: unknown): value is Shelf {
  return typeof value === 'string' && (SHELVES as readonly string[]).includes(value);
}

/** Runtime guard: true only for a string in SPINE_VARIANTS. */
export function isSpineVariant(value: unknown): value is SpineVariant {
  return typeof value === 'string' && (SPINE_VARIANTS as readonly string[]).includes(value);
}

/** DOM id for a book's list item: `book-<id>`. Throws TypeError on an invalid id. */
export function bookAnchorId(id: string): string {
  // The guard runs before any string method, so a null or undefined id reports
  // itself instead of throwing a property-access error from somewhere else.
  if (!isBookId(id)) {
    throw new TypeError(`bookAnchorId: invalid book id "${String(id)}"`);
  }
  return `book-${id}`;
}

/** DOM id for a shelf's heading: `shelf-<shelf>`. Throws TypeError on an unknown shelf. */
export function shelfHeadingId(shelf: Shelf): string {
  if (!isShelf(shelf)) {
    throw new TypeError(`shelfHeadingId: unknown shelf "${String(shelf)}"`);
  }
  return `shelf-${shelf}`;
}

/** CSS modifier class for a spine variant: `shelf__book--<variant>`. Throws TypeError on unknown. */
export function spineClass(variant: SpineVariant): string {
  if (!isSpineVariant(variant)) {
    throw new TypeError(`spineClass: unknown spine variant "${String(variant)}"`);
  }
  return `shelf__book--${variant}`;
}

/** '' when absent, `Book 3` when [3, 3], `Books 1–7` otherwise. Throws TypeError on a bad range. */
export function formatVolumes(volumes: VolumeRange | undefined): string {
  if (volumes === undefined) return '';

  // Read through `unknown` so a value that is not really a [number, number]
  // reports itself in the message rather than throwing from somewhere else.
  const range = volumes as readonly unknown[] | null | undefined;
  const first: unknown = range ? range[0] : undefined;
  const last: unknown = range ? range[1] : undefined;

  if (!isVolumeNumber(first) || !isVolumeNumber(last) || last < first) {
    throw new TypeError(`formatVolumes: invalid volume range [${String(first)}, ${String(last)}]`);
  }

  // The separator is U+2013 EN DASH, not a hyphen.
  return first === last ? `Book ${first}` : `Books ${first}–${last}`;
}

/** The spine's printed label: the title, plus `, ` and formatVolumes(book.volumes) when present. */
export function spineLabel(book: Book): string {
  if (book.volumes === undefined) return book.title;
  // A bad range propagates unchanged: neither caught nor rewrapped.
  return `${book.title}, ${formatVolumes(book.volumes)}`;
}

/** Throws TypeError on the first repeated `id`, scanning in declaration order. Returns void. */
export function assertUniqueBookIds(books: readonly Book[]): void {
  // Scanned in declaration order so the reported duplicate is the first repeat,
  // not the last. Nothing is sorted, copied back, or read beyond each `id`.
  // Uniqueness only: id syntax is enforced by `bookAnchorId` during render.
  const seen = new Set<unknown>();
  for (const book of books) {
    const id = book.id;
    if (seen.has(id)) {
      throw new TypeError(`assertUniqueBookIds: duplicate book id "${String(id)}"`);
    }
    seen.add(id);
  }
}

/** New array of the books on one shelf, in input order. Never mutates or aliases the input. */
export function booksOnShelf(books: readonly Book[], shelf: Shelf): Book[] {
  return books.filter((book) => book.shelf === shelf);
}

/** One group per shelf that has at least one book, in SHELVES order. Empty shelves are omitted. */
export function groupByShelf(books: readonly Book[]): ShelfGroup[] {
  const groups: ShelfGroup[] = [];
  // SHELVES order, not input order; within a shelf, input order is preserved.
  for (const shelf of SHELVES) {
    const onShelf = booksOnShelf(books, shelf);
    if (onShelf.length === 0) continue;
    groups.push({ shelf, label: SHELF_LABELS[shelf], books: onShelf });
  }
  return groups;
}
