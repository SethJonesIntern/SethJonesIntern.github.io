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

export interface Book {
  /** Stable kebab-case slug, unique within READING_LIST. Matches BOOK_ID_PATTERN. */
  readonly id: string;
  /** The book's own title, as printed on its cover. One book, one entry. */
  readonly title: string;
  /** Author line as displayed, e.g. 'J. K. Rowling'. */
  readonly author: string;
  /** Which shelf the book stands on. */
  readonly shelf: Shelf;
  /** Which spine colour the book is bound in. */
  readonly spine: SpineVariant;
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

/** Throws TypeError on the first book whose `spine` equals the previous book's. Returns void. */
export function assertVariedSpines(books: readonly Book[]): void {
  // Neighbours only: reusing a variant further along the shelf is expected with
  // four variants and fifteen books. The message names the *second* book of the
  // offending pair, because that is the entry whose variant needs changing.
  // Validates `spine` alone; `id` is read only to name the offender. Neither id
  // syntax nor shelf membership is this check's job — the caller passes one shelf.
  for (let index = 1; index < books.length; index += 1) {
    const previous = books[index - 1];
    const current = books[index];
    if (previous !== undefined && current !== undefined && current.spine === previous.spine) {
      const id = String(current.id);
      const spine = String(current.spine);
      throw new TypeError(`assertVariedSpines: "${id}" repeats the spine variant "${spine}"`);
    }
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
