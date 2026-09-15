# Reading

Issue: personal-website #16 — "/reading/: a bookshelf of what I have been reading"

## Purpose

`/reading/` lists the books Seth has read recently, drawn as a shelf of standing spines rather than
a bulleted list. One typed array — `READING_LIST` in `src/lib/reading-books.ts` — is the source of
truth: each entry carries a stable `id`, a `title`, an `author`, the shelf it belongs on, a spine
colour named by a typed union, and, for a multi-volume series, an inclusive volume range that is
part of the spine's printed label. Adding a book means appending one entry to that array and
touching nothing else. The decision logic that can be unit-tested (id validation, anchor derivation,
volume formatting, shelf grouping, duplicate detection) lives in `src/lib/reading.ts`, a plain
TypeScript module with zero imports. The visual treatment is CSS only: spines are real list items
whose text runs down the spine via `writing-mode`, so the page is a genuine, readable list to a
screen reader and renders completely with JavaScript disabled. Because a bookshelf wants spines of
varying colour and components may not carry raw colour, the palette is added to
`src/styles/tokens.css` as eight new Layer 2 semantic tokens remapped under
`@media (prefers-color-scheme: dark)`, exactly as the UCF-mark work added `--color-mark-plate`.
The page joins the nav between Blog and Contact so Contact stays last. No client-side JavaScript,
no new dependency, no content collection.

## Public API

### Files to create

```
src/lib/reading.ts                 (types and pure helpers; ZERO imports of any kind)
src/lib/reading-books.ts           (the book list; one type-only import from './reading')
src/pages/reading.astro            (the page; flat route, builds to dist/reading/index.html)
```

### Files to modify

```
src/consts.ts                      (one new NAV_ITEMS entry, inserted before Contact)
src/styles/tokens.css              (3 new Layer 1 primitives, 8 new Layer 2 semantic tokens)
```

Files to leave untouched: `src/layouts/BaseLayout.astro`, `src/components/*`,
`src/styles/global.css`, every other file under `src/pages/**`, `src/content*`, `astro.config.mjs`,
`tsconfig.json`, `package.json`, `public/*`.

### `src/lib/reading.ts` — exact exports

```ts
/**
 * Bookshelf types and pure helpers.
 * Zero imports, no I/O: unit-testable without an Astro build.
 */

/** Shelf keys, in the order shelves are rendered on the page. */
export const SHELVES = ['technical', 'fiction'] as const;

export type Shelf = (typeof SHELVES)[number];

/** Heading text for each shelf. */
export const SHELF_LABELS: Readonly<Record<Shelf, string>>;

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
export const BOOK_ID_PATTERN: RegExp;

/** Runtime guard for unvalidated values. True only for strings matching BOOK_ID_PATTERN. */
export function isBookId(value: unknown): value is string;

/** Runtime guard: true only for a string in SHELVES. */
export function isShelf(value: unknown): value is Shelf;

/** Runtime guard: true only for a string in SPINE_VARIANTS. */
export function isSpineVariant(value: unknown): value is SpineVariant;

/** DOM id for a book's list item: `book-<id>`. Throws TypeError on an invalid id. */
export function bookAnchorId(id: string): string;

/** DOM id for a shelf's heading: `shelf-<shelf>`. Throws TypeError on an unknown shelf. */
export function shelfHeadingId(shelf: Shelf): string;

/** CSS modifier class for a spine variant: `shelf__book--<variant>`. Throws TypeError on unknown. */
export function spineClass(variant: SpineVariant): string;

/** '' when absent, `Book 3` when [3, 3], `Books 1–7` otherwise. Throws TypeError on a bad range. */
export function formatVolumes(volumes: VolumeRange | undefined): string;

/** The spine's printed label: the title, plus `, ` and formatVolumes(book.volumes) when present. */
export function spineLabel(book: Book): string;

/** Throws TypeError on the first repeated `id`, scanning in declaration order. Returns void. */
export function assertUniqueBookIds(books: readonly Book[]): void;

/** New array of the books on one shelf, in input order. Never mutates or aliases the input. */
export function booksOnShelf(books: readonly Book[], shelf: Shelf): Book[];

/** One group per shelf that has at least one book, in SHELVES order. Empty shelves are omitted. */
export function groupByShelf(books: readonly Book[]): ShelfGroup[];
```

Exact constant values:

```ts
SHELF_LABELS = { technical: 'Technical', fiction: 'Fiction' };
BOOK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
```

`BOOK_ID_PATTERN` carries no `g`/`y` flag, so `.test()` is stateless and may be called repeatedly.
No trimming, lowercasing, or normalisation anywhere: a value is either already valid or rejected.
The en dash in a volume range is U+2013 (`–`), not a hyphen.

### `src/lib/reading-books.ts` — exact contents as shipped

```ts
import type { Book } from './reading';

// The shelf, in render order: shelf groups follow SHELVES, books follow this array.
// To add a book, append one entry here. Nothing else in the repo needs editing.
export const READING_LIST: readonly Book[] = [
  {
    id: 'mythical-man-month',
    title: 'The Mythical Man-Month',
    author: 'Frederick P. Brooks Jr.',
    shelf: 'technical',
    spine: 'ink',
  },
  {
    id: 'machine-learning-in-production',
    title: 'Machine Learning in Production: From Models to Products',
    author: 'Christian Kästner',
    shelf: 'technical',
    spine: 'teal',
  },
  {
    id: 'operating-systems-three-easy-pieces',
    title: 'Operating Systems: Three Easy Pieces',
    author: 'Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau',
    shelf: 'technical',
    spine: 'sand',
  },
  {
    id: 'harry-potter',
    title: 'Harry Potter',
    author: 'J. K. Rowling',
    shelf: 'fiction',
    spine: 'clay',
    volumes: [1, 7],
  },
  {
    id: 'fire-and-blood',
    title: 'Fire & Blood',
    author: 'George R. R. Martin',
    shelf: 'fiction',
    spine: 'ink',
  },
  {
    id: 'a-song-of-ice-and-fire',
    title: 'A Song of Ice and Fire',
    author: 'George R. R. Martin',
    shelf: 'fiction',
    spine: 'teal',
    volumes: [1, 2],
  },
  {
    id: 'percy-jackson-and-the-olympians',
    title: 'Percy Jackson and the Olympians',
    author: 'Rick Riordan',
    shelf: 'fiction',
    spine: 'sand',
    volumes: [1, 5],
  },
];
```

Seven entries, three on `technical` and four on `fiction`, in exactly this order. A multi-volume
series is **one** entry; its range lives in `volumes` and reaches the spine through `spineLabel`.
The `: readonly Book[]` annotation is required so the element type survives `.map()` on the page.
`READING_LIST` is the only export. Nothing else in the repo may declare books.

### `src/consts.ts` — the only permitted edit

Insert one entry into `NAV_ITEMS`, between Blog and Contact, so Contact stays last:

```ts
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/about/', label: 'About' },
  { href: '/research/', label: 'Research' },
  { href: '/teaching/', label: 'Teaching' },
  { href: '/projects/', label: 'Projects' },
  { href: '/blog/', label: 'Blog' },
  { href: '/reading/', label: 'Reading' },
  { href: '/contact/', label: 'Contact' },
];
```

`NAV_ITEMS` becomes eight entries. Nothing else in `consts.ts` changes. `SiteNav` needs no edit: it
already renders one `<li>` per entry and activates the longest matching href.

### `src/styles/tokens.css` — the two additions

**Layer 1 primitives.** Three new lengths, declared once, in a new commented group placed after
`/* Stacking */` and before `/* Warm-grey neutrals */`:

```css
  /* Bookshelf spine geometry */
  --shelf-spine-height-min: clamp(8rem, 5rem + 10vw, 10.5rem);
  --shelf-spine-height-max: clamp(11rem, 6rem + 16vw, 16rem);
  --shelf-spine-width-min: 2.5rem;
```

These are raw lengths, and Layer 1 is the only place a raw length may live (Invariant 5 of
`specs/layout-design-system.spec.md`). They are `clamp()`ed on `vw` like `--layout-gutter` and
`--text-xl`, so spines shorten on a phone with no media query. `height-max` exceeds `height-min` at
every viewport width (at 400px: 176px vs 128px; at 1280px: 256px vs 168px).

**Layer 2 semantic.** Eight new tokens, each a background/text pair for one spine variant, declared
in the light `:root` and re-declared in the dark media block:

| Token | Light value | Dark value |
|---|---|---|
| `--color-spine-clay-bg` | `var(--color-clay-900)` | `var(--color-clay-700)` |
| `--color-spine-clay-text` | `var(--color-ink-50)` | `var(--color-ink-50)` |
| `--color-spine-teal-bg` | `var(--color-teal-900)` | `var(--color-teal-700)` |
| `--color-spine-teal-text` | `var(--color-ink-50)` | `var(--color-ink-50)` |
| `--color-spine-ink-bg` | `var(--color-ink-700)` | `var(--color-ink-600)` |
| `--color-spine-ink-text` | `var(--color-ink-50)` | `var(--color-ink-50)` |
| `--color-spine-sand-bg` | `var(--color-ink-400)` | `var(--color-ink-300)` |
| `--color-spine-sand-text` | `var(--color-ink-950)` | `var(--color-ink-950)` |

Every value is a `var()` reference to a Layer 1 primitive, so no semantic token is defined in terms
of another (Invariant 6 of the layout spec) and the whole scheme switch stays inside `tokens.css`.
A token whose light and dark values are the same primitive is permitted and has precedent
(`--color-border-strong`); what the layout spec requires is that the *name set* declared in the two
blocks is identical. The dark values run one step lighter than the light ones so spines separate
from the near-black `--color-bg`. Resulting text-on-spine contrast, computed from the literal
primitive values:

| Variant | Light | Dark |
|---|---|---|
| clay | 11.1:1 | 6.4:1 |
| teal | 11.7:1 | 7.2:1 |
| ink | 10.6:1 | 7.0:1 |
| sand | 7.2:1 | 11.3:1 |

The semantic token count goes 22 → 30 and the primitive count 68 → 71; the enumerations in
`specs/layout-design-system.spec.md` must be extended to match — see Open question 6, which lists
the exact amendments.

### `src/pages/reading.astro` — contract

Flat route, so the default `directory` build format emits `dist/reading/index.html` at `/reading/`.

Frontmatter:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import {
  assertUniqueBookIds,
  bookAnchorId,
  groupByShelf,
  shelfHeadingId,
  spineClass,
  spineLabel,
} from '../lib/reading';
import { READING_LIST } from '../lib/reading-books';

// A duplicate id would emit duplicate DOM ids; fail the build instead.
assertUniqueBookIds(READING_LIST);

const shelves = groupByShelf(READING_LIST);
---
```

Body (no `width` attribute — the column stays `'prose'`):

```astro
<BaseLayout
  title="Reading"
  description="Books Seth Jones has read recently, from software engineering to fantasy."
>
  <h1>Reading</h1>
  <p>A shelf of what I have read lately — some of it for work, most of it not. It is not a review page: if a book is here, it earned a spine.</p>
  {
    shelves.map((group) => (
      <section class="shelf" aria-labelledby={shelfHeadingId(group.shelf)}>
        <h2 id={shelfHeadingId(group.shelf)}>{group.label}</h2>
        <ul class="shelf__list" role="list">
          {group.books.map((book) => (
            <li
              class={`shelf__book ${spineClass(book.spine)}`}
              id={bookAnchorId(book.id)}
              data-book-id={book.id}
            >
              <span class="shelf__title">{spineLabel(book)}</span>
              <span class="shelf__author">{book.author}</span>
            </li>
          ))}
        </ul>
      </section>
    ))
  }
</BaseLayout>
```

Notes the coder must honour:
- `role="list"` is deliberate: `list-style: none` strips list semantics in Safari/VoiceOver, and this
  shelf must stay a real list.
- No `aria-hidden`, no `role="presentation"`, no `tabindex`, no `title` attribute, no visually-hidden
  duplicate of any title or author, no decorative element for the shelf board — the board is a
  border. The visible text *is* the accessible text.
- `data-book-id` and the `book-<id>` DOM id are the book's stable identity: they make a single book
  addressable (a permalink such as `/reading/#book-fire-and-blood`, or a later per-book annotation)
  without renaming anything. They are not read by any script in this issue.
- No `<script>`, no `on*` attribute, no `client:*` directive.

Scoped `<style>` in this page only, exactly these rules (every colour a semantic token, every length
a primitive token or a `calc()` over one):

```css
  .shelf + .shelf {
    margin-block-start: var(--space-xl);
  }

  .shelf__list {
    list-style: none;
    padding: 0;
    padding-block-end: var(--space-2xs);
    margin-block-start: var(--space-md);
    display: flex;
    flex-wrap: wrap;
    /* Spines of differing height stand on one baseline: the shelf board. */
    align-items: flex-end;
    gap: var(--space-sm) var(--space-2xs);
    border-block-end: var(--border-thick) solid var(--color-border-strong);
  }

  /* The spine's own writing mode swaps the logical axes, so its geometry is
     stated in physical properties on purpose: `max-height` caps the length of
     the vertical text line, and a title too long for it wraps to a second line,
     which widens the spine instead of lengthening it — which is what a thick
     book looks like. `flex: none` makes a spine wrap to the next row rather
     than be squashed below its natural width. */
  .shelf__book {
    writing-mode: vertical-rl;
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3xs);
    min-height: var(--shelf-spine-height-min);
    max-height: var(--shelf-spine-height-max);
    min-width: var(--shelf-spine-width-min);
    max-width: 100%;
    padding: var(--space-2xs) var(--space-3xs);
    border: var(--border-thin) solid var(--color-border-strong);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
    transition:
      transform var(--duration-base) var(--ease-standard),
      box-shadow var(--duration-base) var(--ease-standard);
  }

  .shelf__book:hover {
    transform: translateY(calc(-1 * var(--space-2xs)));
    box-shadow: var(--shadow-md);
  }

  @media (prefers-reduced-motion: reduce) {
    .shelf__book {
      transition: none;
    }

    .shelf__book:hover {
      transform: none;
    }
  }

  .shelf__title {
    font-family: var(--font-serif);
    font-size: var(--text-sm);
    font-weight: var(--weight-semibold);
    line-height: var(--leading-snug);
  }

  .shelf__author {
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-wide);
  }

  .shelf__book--clay {
    background: var(--color-spine-clay-bg);
    color: var(--color-spine-clay-text);
  }

  .shelf__book--teal {
    background: var(--color-spine-teal-bg);
    color: var(--color-spine-teal-text);
  }

  .shelf__book--ink {
    background: var(--color-spine-ink-bg);
    color: var(--color-spine-ink-text);
  }

  .shelf__book--sand {
    background: var(--color-spine-sand-bg);
    color: var(--color-spine-sand-text);
  }
```

`text-orientation` is left at its default `mixed`, which rotates the Latin run 90° clockwise so the
title reads top-to-bottom — the US/UK spine convention. Do **not** use `transform: rotate()` (it
would not reserve layout space and would break text selection) and do **not** use
`text-orientation: upright`. Do not add `cursor: pointer`, a `:focus` style, or any per-variant or
per-book override of the transition, the transform, the geometry, or the typography.

### Test setup

Runner is the existing Vitest 5 via `npm test`; tests live in `tests/*.test.ts`, named
`tests/reading-*.test.ts`. A test file imports exactly this and nothing else from the repo:

```ts
import {
  BOOK_ID_PATTERN,
  SHELF_LABELS,
  SHELVES,
  SPINE_VARIANTS,
  assertUniqueBookIds,
  bookAnchorId,
  booksOnShelf,
  formatVolumes,
  groupByShelf,
  isBookId,
  isShelf,
  isSpineVariant,
  shelfHeadingId,
  spineClass,
  spineLabel,
  type Book,
  type Shelf,
  type ShelfGroup,
  type SpineVariant,
  type VolumeRange,
} from '../src/lib/reading';
import { READING_LIST } from '../src/lib/reading-books';
```

`src/lib/reading-books.ts` is importable from a test: its only import is type-only and erased at
runtime, so no Astro machinery is pulled in. Build `Book` fixtures with a helper, e.g.

```ts
const book = (id: string, over: Partial<Book> = {}): Book => ({
  id,
  title: 'T',
  author: 'A',
  shelf: 'technical',
  spine: 'ink',
  ...over,
});
```

Do **not** import any `.astro` file, `astro:*`, `src/consts.ts`, `dist/**`, or the CSS from a test.

## Behavior

Rows 1–52 are Vitest cases against the two `src/lib` modules. Rows 53–74 are review criteria
verified by `npm run build`, `npm run check` and loading the page — this is presentation, and per
`CLAUDE.md` adjudication is off.

| # | input | expected output | notes |
|---|---|---|---|
| 1 | `isBookId('harry-potter')` | `true` | kebab-case |
| 2 | `isBookId('fire')` | `true` | single run |
| 3 | `isBookId('9-lives')` | `true` | digits allowed, may lead |
| 4 | `isBookId('Harry-Potter')` | `false` | uppercase rejected, no lowercasing |
| 5 | `isBookId('two words')` / `('trailing-')` / `('-leading')` / `('double--hyphen')` / `('')` | `false` × 5 | |
| 6 | `isBookId(' fire ')` | `false` | no trimming |
| 7 | `isBookId('fire_blood')` / `('fire.blood')` / `('fire/blood')` | `false` × 3 | only `[a-z0-9-]` |
| 8 | `isBookId('kästner')` / `('书')` / `('fire-😀')` | `false` × 3 | ASCII only |
| 9 | `isBookId(null)` / `(undefined)` / `(42)` / `({})` / `(['fire'])` | `false` × 5 | guard takes `unknown` |
| 10 | `BOOK_ID_PATTERN.test('fire')` three times in a row | `true`, `true`, `true` | no `g` flag |
| 11 | `isShelf('technical')` / `('fiction')` | `true`, `true` | |
| 12 | `isShelf('poetry')` / `('Technical')` / `('')` / `(null)` / `(0)` | `false` × 5 | |
| 13 | `isSpineVariant('clay')` / `('teal')` / `('ink')` / `('sand')` | `true` × 4 | the whole union |
| 14 | `isSpineVariant('gold')` / `('Clay')` / `(null)` / `(undefined)` | `false` × 4 | |
| 15 | `SHELVES` | `['technical', 'fiction']` | render order; length 2 |
| 16 | `SPINE_VARIANTS` | `['clay', 'teal', 'ink', 'sand']` | length 4 |
| 17 | `SHELF_LABELS` | `{ technical: 'Technical', fiction: 'Fiction' }` | |
| 18 | `bookAnchorId('harry-potter')` | `'book-harry-potter'` | |
| 19 | `bookAnchorId('fire-and-blood')` | `'book-fire-and-blood'` | |
| 20 | `bookAnchorId('a'.repeat(200))` | `'book-' + 'a'.repeat(200)` | id length uncapped |
| 21 | `shelfHeadingId('technical')` / `('fiction')` | `'shelf-technical'`, `'shelf-fiction'` | |
| 22 | `spineClass('clay')` / `('teal')` / `('ink')` / `('sand')` | `'shelf__book--clay'`, `'shelf__book--teal'`, `'shelf__book--ink'`, `'shelf__book--sand'` | |
| 23 | `formatVolumes(undefined)` | `''` | empty string, never `undefined` |
| 24 | `formatVolumes([1, 7])` | `'Books 1–7'` | en dash U+2013, no spaces around it |
| 25 | `formatVolumes([1, 2])` | `'Books 1–2'` | |
| 26 | `formatVolumes([1, 5])` | `'Books 1–5'` | |
| 27 | `formatVolumes([3, 3])` | `'Book 3'` | singular, no range |
| 28 | `formatVolumes([10, 12])` | `'Books 10–12'` | multi-digit |
| 29 | `formatVolumes([1, 999])` | `'Books 1–999'` | no upper cap |
| 30 | `spineLabel(book('x', { title: 'Fire & Blood' }))` | `'Fire & Blood'` | no volumes → title verbatim, ampersand untouched |
| 31 | `spineLabel(book('x', { title: 'Harry Potter', volumes: [1, 7] }))` | `'Harry Potter, Books 1–7'` | comma + space + formatVolumes |
| 32 | `spineLabel(book('x', { title: 'A Song of Ice and Fire', volumes: [1, 2] }))` | `'A Song of Ice and Fire, Books 1–2'` | |
| 33 | `spineLabel(book('x', { title: 'X', volumes: [4, 4] }))` | `'X, Book 4'` | |
| 34 | `spineLabel(book('x', { title: 'Ω 😀' }))` | `'Ω 😀'` | titles are not ASCII-restricted |
| 35 | `assertUniqueBookIds([])` | returns `undefined`, throws nothing | |
| 36 | `assertUniqueBookIds([book('a'), book('b'), book('c')])` | returns `undefined` | |
| 37 | `assertUniqueBookIds(READING_LIST)` | returns `undefined` | the shipped list is clean |
| 38 | `const xs = [book('b'), book('a')]; assertUniqueBookIds(xs)` | `xs` still has ids `['b','a']` and the same element references | never sorts or mutates |
| 39 | `booksOnShelf([book('a'), book('b', { shelf: 'fiction' }), book('c')], 'technical')` | ids `['a','c']` | filter, input order |
| 40 | `booksOnShelf([...], 'fiction')` for the same input | ids `['b']` | |
| 41 | `booksOnShelf(xs, 'technical')` where no book is on it | `[]` | empty array, not `undefined` |
| 42 | `const xs = [book('a')]; booksOnShelf(xs, 'technical') !== xs` | `true`, and `xs` is unchanged | new array, no aliasing |
| 43 | `groupByShelf([])` | `[]` | no groups |
| 44 | `groupByShelf([book('a'), book('b')])` | one group: `{ shelf: 'technical', label: 'Technical', books: [a, b] }` | empty `fiction` shelf omitted |
| 45 | `groupByShelf([book('f', { shelf: 'fiction' }), book('t')])` | two groups, in order `['technical', 'fiction']` with ids `[['t'], ['f']]` | SHELVES order, not input order |
| 46 | `groupByShelf([book('a'), book('c'), book('b')])` | the single group's ids are `['a','c','b']` | never sorts within a shelf |
| 47 | `READING_LIST` | length `7`; ids in order `['mythical-man-month','machine-learning-in-production','operating-systems-three-easy-pieces','harry-potter','fire-and-blood','a-song-of-ice-and-fire','percy-jackson-and-the-olympians']` | the shipped shelf |
| 48 | `READING_LIST.map((b) => b.title)` | `['The Mythical Man-Month','Machine Learning in Production: From Models to Products','Operating Systems: Three Easy Pieces','Harry Potter','Fire & Blood','A Song of Ice and Fire','Percy Jackson and the Olympians']` | exact strings, `&` and `ä` verbatim |
| 49 | `READING_LIST.map((b) => b.author)` | `['Frederick P. Brooks Jr.','Christian Kästner','Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau','J. K. Rowling','George R. R. Martin','George R. R. Martin','Rick Riordan']` | duplicate author is legal |
| 50 | every `b` in `READING_LIST` | `isBookId(b.id)`, `isShelf(b.shelf)`, `isSpineVariant(b.spine)` all `true`; `b.title.trim() !== ''`; `b.author.trim() !== ''` | data is self-consistent |
| 51 | `groupByShelf(READING_LIST)` | 2 groups: `technical`/`Technical` with 3 books, then `fiction`/`Fiction` with 4 | |
| 52 | `READING_LIST.map(spineLabel)` | `['The Mythical Man-Month','Machine Learning in Production: From Models to Products','Operating Systems: Three Easy Pieces','Harry Potter, Books 1–7','Fire & Blood','A Song of Ice and Fire, Books 1–2','Percy Jackson and the Olympians, Books 1–5']` | the seven printed spines |
| 53 | `npm run build` | exit 0; `dist/reading/index.html` exists | static route at `/reading/` |
| 54 | `npm run check` | exit 0, zero errors and zero warnings | TypeScript strict clean |
| 55 | `dist/reading/index.html` `<title>` | `Reading · Seth Jones` | separator is space + U+00B7 + space |
| 56 | `dist/reading/index.html` meta description | `Books Seth Jones has read recently, from software engineering to fantasy.` | |
| 57 | any built page's nav | 8 `<li>`, link text in order `Home, About, Research, Teaching, Projects, Blog, Reading, Contact`; hrefs `/`, `/about/`, `/research/`, `/teaching/`, `/projects/`, `/blog/`, `/reading/`, `/contact/` | Contact stays last |
| 58 | `dist/reading/index.html` nav | the `/reading/` link carries `aria-current="page"` and `is-active`; no other link does | existing `SiteNav` logic, unchanged |
| 59 | `dist/reading/index.html` body | exactly one `<h1>`, text `Reading`; exactly two `<h2>`, texts `Technical` then `Fiction` | |
| 60 | `dist/reading/index.html` | two `section.shelf`, each `aria-labelledby` pointing at its own `h2` id (`shelf-technical`, `shelf-fiction`) | labelled regions |
| 61 | `dist/reading/index.html` | two `ul.shelf__list[role="list"]`; the first has 3 `li.shelf__book`, the second 4; 7 in total | list semantics survive `list-style: none` |
| 62 | the 7 `li.shelf__book` in DOM order | `id` attributes `book-mythical-man-month`, `book-machine-learning-in-production`, `book-operating-systems-three-easy-pieces`, `book-harry-potter`, `book-fire-and-blood`, `book-a-song-of-ice-and-fire`, `book-percy-jackson-and-the-olympians`, and `data-book-id` equal to each id without the prefix | stable identity, declaration order |
| 63 | each `li.shelf__book` | exactly two element children: `span.shelf__title` then `span.shelf__author`; their texts are Behavior 52's label and Behavior 49's author for that book | the visible text is the accessible text |
| 64 | `li#book-fire-and-blood .shelf__title` | parsed text content is exactly `Fire & Blood` (source HTML contains `Fire &amp; Blood`) | Astro escapes; text round-trips |
| 65 | `li#book-machine-learning-in-production .shelf__author` | parsed text content is exactly `Christian Kästner` | UTF-8 survives the build |
| 66 | the 7 `li.shelf__book` class attributes | each contains `shelf__book` plus exactly one of `shelf__book--clay`/`--teal`/`--ink`/`--sand`, in order `ink, teal, sand, clay, ink, teal, sand` | variant per entry |
| 67 | computed style of any `li.shelf__book` | `writing-mode` is `vertical-rl`; `text-orientation` is `mixed` | rotated by writing mode, not `transform` |
| 68 | `prefers-color-scheme: light`, computed backgrounds of the clay/teal/ink/sand spines | `rgb(95, 38, 25)`, `rgb(12, 58, 63)`, `rgb(64, 58, 50)`, `rgb(168, 158, 142)`; computed colour is `rgb(250, 248, 245)` on the first three and `rgb(18, 16, 13)` on sand | light token mapping |
| 69 | `prefers-color-scheme: dark`, same four | `rgb(154, 63, 43)`, `rgb(20, 92, 99)`, `rgb(92, 84, 73)`, `rgb(207, 199, 185)`; text colours unchanged from row 68 | dark token mapping |
| 70 | hover over each of the 7 spines, no reduced-motion preference | every one computes `transform: matrix(1, 0, 0, 1, 0, -8)` (translateY(-8px), i.e. `--space-2xs`) with `transition-duration: 0.2s` and `transition-timing-function: cubic-bezier(0.2, 0, 0.2, 1)` — identical for all seven | one rule, no per-spine variation |
| 71 | `prefers-reduced-motion: reduce`, hover a spine | computed `transform` is `none` and `transition` is `none`; the `box-shadow` change still applies | motion honoured, affordance kept |
| 72 | viewport 400px and 1280px | `document.documentElement.scrollWidth <= viewport width`; spines wrap onto further rows at 400px; every spine's bottom edge aligns with the others in its row | no horizontal scroll ever |
| 73 | `dist/reading/index.html` | contains no `<script`, no `on[a-z]+=` handler attribute and no `style=` attribute; the page renders identically with JavaScript disabled | CSS-only feature |
| 74 | `dist/rss.xml` | contains no `/reading/` link | the feed stays blog-only |

## Errors

| condition | exception type | message contract |
|---|---|---|
| `bookAnchorId('')` | `TypeError` | exactly `bookAnchorId: invalid book id ""` |
| `bookAnchorId('Harry-Potter')` | `TypeError` | exactly `bookAnchorId: invalid book id "Harry-Potter"` |
| `bookAnchorId(' fire ')` | `TypeError` | exactly `bookAnchorId: invalid book id " fire "` |
| `bookAnchorId('double--hyphen')` | `TypeError` | exactly `bookAnchorId: invalid book id "double--hyphen"` |
| `bookAnchorId(null as unknown as string)` | `TypeError` | exactly `bookAnchorId: invalid book id "null"` — the guard runs before any string method and the value is interpolated via `String(id)` |
| `bookAnchorId(undefined as unknown as string)` | `TypeError` | exactly `bookAnchorId: invalid book id "undefined"` |
| `shelfHeadingId('poetry' as Shelf)` | `TypeError` | exactly `shelfHeadingId: unknown shelf "poetry"` |
| `shelfHeadingId(null as unknown as Shelf)` | `TypeError` | exactly `shelfHeadingId: unknown shelf "null"` |
| `spineClass('gold' as SpineVariant)` | `TypeError` | exactly `spineClass: unknown spine variant "gold"` |
| `spineClass(undefined as unknown as SpineVariant)` | `TypeError` | exactly `spineClass: unknown spine variant "undefined"` |
| `formatVolumes([0, 3])` | `TypeError` | exactly `formatVolumes: invalid volume range [0, 3]` — volumes are 1-based |
| `formatVolumes([-1, 3])` | `TypeError` | exactly `formatVolumes: invalid volume range [-1, 3]` |
| `formatVolumes([2, 1])` | `TypeError` | exactly `formatVolumes: invalid volume range [2, 1]` — last must be ≥ first |
| `formatVolumes([1.5, 3])` | `TypeError` | exactly `formatVolumes: invalid volume range [1.5, 3]` — integers only |
| `formatVolumes([Number.NaN, 3])` | `TypeError` | exactly `formatVolumes: invalid volume range [NaN, 3]` |
| `formatVolumes([1, Number.POSITIVE_INFINITY])` | `TypeError` | exactly `formatVolumes: invalid volume range [1, Infinity]` |
| `spineLabel(book('x', { volumes: [2, 1] }))` | `TypeError` | the `formatVolumes` message above, propagated unchanged — `spineLabel` neither catches nor rewraps |
| `assertUniqueBookIds([book('fire'), book('fire')])` | `TypeError` | exactly `assertUniqueBookIds: duplicate book id "fire"` |
| `assertUniqueBookIds([book('a'), book('b'), book('a'), book('b')])` | `TypeError` | exactly `assertUniqueBookIds: duplicate book id "a"` — first repeat in declaration order, not the last |
| a `READING_LIST` entry whose `id` fails `BOOK_ID_PATTERN` | `npm run build` exits non-zero with the `bookAnchorId` `TypeError`, raised while rendering | no silent fallback id. Review-only |
| a `READING_LIST` entry with a duplicate `id` | `npm run build` exits non-zero with the `assertUniqueBookIds` `TypeError`, before any markup is emitted | duplicate DOM ids can never ship. Review-only |
| a `READING_LIST` entry missing `id`/`title`/`author`/`shelf`/`spine`, or with a `shelf`/`spine` outside its union | `astro check` diagnostic, `npm run check` exits 1 | assert on exit code and the offending property name, not on TypeScript's wording. Review-only |

The message format for a volume range is `[` + `String(first)` + `, ` + `String(last)` + `]`.
`assertUniqueBookIds` does **not** validate id syntax — only uniqueness; syntax is enforced by
`bookAnchorId` during render. Both failures stop the build, which is the point.

## Boundaries

| boundary | answer |
|---|---|
| empty `READING_LIST` | `groupByShelf([])` is `[]` (Behavior 43) and the page would render the `h1` and intro paragraph with zero `section.shelf`. There is **no** empty-state copy and no conditional branch to write. Test the function; the page state is unreachable — do not test it. |
| a shelf with zero books | Omitted from `groupByShelf` output entirely — no empty `<section>`, no empty `<ul>` (Behavior 44). Test. |
| single book on a shelf | One `<li>`; nothing special. Behavior 45 covers it. Test. |
| empty string id | `isBookId('') === false`; `bookAnchorId('')` throws. Test both. |
| empty string `title` or `author` | Type-legal, no runtime check, no warning. `spineLabel(book('x', { title: '' }))` is `''`. Undefined at the page level, do not test the render. |
| zero / negative volume numbers | `TypeError` per the Errors table — volumes are 1-based. Test `[0, 3]` and `[-1, 3]`. |
| max — volume number | Uncapped for finite integers: `formatVolumes([1, 999]) === 'Books 1–999'` (Behavior 29). `Infinity` throws. Test both. |
| max — id length | Uncapped: `bookAnchorId('a'.repeat(200))` works (Behavior 20). Test. |
| max — list length | Uncapped, no pagination, no "show more". `assertUniqueBookIds` over 500 distinct ids returns `undefined`. Test if convenient. |
| max — title length on a spine | Handled by CSS, not by code: `max-height` caps the vertical line and the title wraps into a second line, widening the spine. No truncation, no ellipsis, no short-title override field. Review-only, at the `machine-learning-in-production` spine. |
| unicode in ids | Rejected — Behavior 8. Test. |
| unicode in `title` / `author` | Accepted and rendered verbatim (`Kästner`, `&`, `Ω 😀`). Test at the function level (Behavior 34) and in the built HTML (Behavior 64–65). |
| null / undefined to the three guards | `false` — Behavior 9, 12, 14. Test. |
| null / undefined to `bookAnchorId`, `shelfHeadingId`, `spineClass` | `TypeError` with the `String(value)` message. Test. |
| `volumes: undefined` vs omitted | Identical: `formatVolumes(undefined) === ''` and `spineLabel` returns the bare title. Test both spellings. |
| null / undefined / non-array to `assertUniqueBookIds`, `booksOnShelf`, `groupByShelf` | The parameters are typed `readonly Book[]`. Undefined, do not test. |
| duplicate ids | `TypeError` naming the first repeat. Test. |
| duplicate `title`, `author`, or `spine` across entries | Legal, no check, no warning — two entries share `George R. R. Martin` and each variant repeats across shelves. Test that it does not throw (Behavior 49). |
| unordered input | There is no sort anywhere. Books render in `READING_LIST` order within a shelf (Behavior 46) and shelves in `SHELVES` order regardless of input order (Behavior 45). Test both. |
| viewport minimum | 400px is the contracted floor (Behavior 72). Below 320px undefined, do not test. |
| viewport maximum | ≥1280px: spines cap at `--shelf-spine-height-max`'s 16rem ceiling and the column stays `.prose`. Test scrollWidth only. |
| `prefers-reduced-motion: reduce` | Behavior 71 — `transform: none`, `transition: none`, shadow change retained. Test. |
| JavaScript disabled | Fully rendered and fully readable; this feature ships no script. Behavior 73 is the grep. Test. |
| forced-colors mode, print stylesheet, RTL (`dir="rtl"`) | Undefined, do not test. The site is `lang="en"` with no RTL support and no print sheet. |
| touch devices with no hover | The lift simply never fires; nothing depends on it. Undefined, do not test. |

## Invariants

1. `isBookId(x)` is exactly `typeof x === 'string' && BOOK_ID_PATTERN.test(x)` for every input — no
   trimming, casing, or normalisation ever changes the answer. The same holds for `isShelf` and
   `isSpineVariant` against their arrays.
2. For every `id` where `isBookId(id)` is `true`, `bookAnchorId(id) === 'book-' + id`; for every
   other value it throws `TypeError`. There is no third outcome and no fallback id.
3. `spineLabel(book)` always starts with `book.title`, and equals it exactly when `book.volumes` is
   absent. When present, it equals `` `${book.title}, ${formatVolumes(book.volumes)}` ``.
4. Every helper in `src/lib/reading.ts` is pure: same input, same output, no I/O, no state, no
   mutation of any argument. `booksOnShelf` and `groupByShelf` return fresh arrays and never alias
   or reorder their input.
5. `groupByShelf(books)` emits groups in `SHELVES` order, emits a group only when it has at least
   one book, preserves each shelf's books in input order, and its groups' books together contain
   every input book exactly once.
6. Every `id` in `READING_LIST` matches `BOOK_ID_PATTERN` and is unique, so every DOM id the page
   emits is unique within the document. An id is permanent once shipped: renaming one breaks that
   book's anchor and is a deliberate change, not a refactor.
7. Rendered order equals declared order — `SHELVES` for shelves, `READING_LIST` for books. No sort
   function exists in this feature.
8. Adding a book touches exactly one file, `src/lib/reading-books.ts`. Any design that requires
   editing the page, the styles, the tokens, or `consts.ts` to add a book fails this spec.
9. Every spine's text/background pair meets WCAG AA contrast (≥ 4.5:1) in both colour schemes; the
   shipped minimum is 6.4:1 (clay, dark). Any future variant must clear 4.5:1 in both schemes.
10. Every colour value in the feature's CSS is a `var(--color-…)` Layer 2 semantic token and every
    length is a `var(--…)` Layer 1 primitive or a `calc()` over one. No hex, `rgb()`, `px`, `rem`,
    or bare colour name appears in `src/pages/reading.astro`; the only new raw values in the repo
    are the three primitives added to Layer 1 of `tokens.css`.
11. Every new semantic token name is declared exactly twice (light `:root`, dark media block) and
    every new primitive exactly once; the semantic name sets of the two blocks stay identical.
12. The hover treatment is declared once, on `.shelf__book`, with no per-variant, per-shelf, or
    per-index override, delay, or stagger — so the motion is identical for all seven spines.
13. The site still ships zero client-side JavaScript: no `<script>` on this page, no `on*`
    attribute, no hydration directive, no new dependency.
14. The visual rotation changes no semantics: DOM order is reading order, the shelf is a `<ul>` of
    `<li>` with `role="list"`, each `<section>` is labelled by its own `<h2>`, and no element on the
    page carries `aria-hidden`, `role="presentation"`, `tabindex`, or a visually-hidden duplicate of
    text that is already visible.
15. `document.documentElement.scrollWidth` never exceeds the viewport width, at any width from
    400px up: spines wrap, they never scroll the page sideways, and the hover lift is a `transform`,
    which does not affect layout.
16. `NAV_ITEMS` is the only list of pages; `/reading/` appears in it exactly once, at index 6, with
    Contact still last.

## Non-goals

- **Anything interactive.** No click handler, no keyboard shortcut, no `localStorage`, no
  `cursor: pointer`, no focus styling, no link out of a spine. The spines are decoration around
  text; the only dynamic behaviour in this issue is a CSS hover lift.
- Ratings, star scores, review text, finish dates, "currently reading" state, page counts, ISBNs,
  cover images, or links to Goodreads, Amazon, or a publisher.
- A content collection, a Markdown file per book, frontmatter, `astro:content`, or MDX. The list is
  a TypeScript array, deliberately.
- Per-book pages (`/reading/<id>/`), filtering, sorting controls, search, tags, or an RSS feed for
  books. `dist/rss.xml` stays blog-only (Behavior 74).
- More shelves, a third spine axis (thickness, texture, worn edges), a 3D perspective transform, a
  wood-grain background image, or any raster asset.
- A short-title override field, truncation, or an ellipsis. A long title wraps.
- Changing `BaseLayout`, `SiteHeader`, `SiteNav`, `SiteFooter`, `global.css`, or any existing page
  or token. The only edits outside the three new files are the one `NAV_ITEMS` entry and the eleven
  new token declarations.
- Tests that import `.astro` files, `astro:*` modules, `src/consts.ts`, `dist/**`, or that run a
  build. The nav-order and rendered-DOM rows are review criteria, not Vitest cases.
- Visual-regression snapshots, contrast computed at runtime, or bundle-size assertions.

## Open questions

1. **Authors are unverified — needs Seth's confirmation.** He supplied titles only; the planner
   filled in every `author` string. Confirm each: `Frederick P. Brooks Jr.`, `Christian Kästner`,
   `Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau`, `J. K. Rowling`, `George R. R. Martin`
   (twice), `Rick Riordan`. Spacing and punctuation of the initials (`J. K.` vs `J.K.`,
   `George R. R.` vs `George R.R.`) is part of what needs confirming, since Behavior 49 and 63
   assert the strings byte-for-byte. A correction changes only the literals in `reading-books.ts`
   and those two rows.
2. **`Game of Thrones 1-2` was read as `A Song of Ice and Fire`, Books 1–2.** Seth wrote the series
   by its show name; the spine prints the book-series name. If he wants the spine to read
   `Game of Thrones, Books 1–2`, only the `title` literal changes. Unverified.
3. **The Kästner subtitle stays on the spine.** `Machine Learning in Production: From Models to
   Products` is the longest label by a wide margin and will render as a visibly thicker two-line
   spine. That is intended (a thick book looks thick), but if Seth would rather the spine read just
   `Machine Learning in Production`, that is a one-literal change. Unverified.
4. **Page copy — open, with Seth.** The `<h1>`, the intro sentence, the `description`, and the two
   shelf headings (`Technical`, `Fiction`) are drafted in the voice of the About page and await his
   approval. Ship them exactly as written so the build stays verifiable; expect a wording pass that
   changes nothing but those literals and Behavior rows 55, 56 and 59.
5. **Spine variant assignment is the planner's aesthetic call.** The `spine` value on each entry was
   chosen so no two neighbouring spines share a colour; it carries no meaning. Reassigning any entry
   changes only that literal and Behavior row 66.
6. **Two sibling specs need a mechanical amendment, and it has not been made yet.** This feature
   legitimately contradicts statements that are currently written as contracts elsewhere, so those
   documents must be updated in the same PR — by hand or by the main thread, since the planner
   writes only its own spec. Nothing here weakens an existing row; every change is a count or an
   enumeration:
   - `specs/layout-design-system.spec.md`, Public API `NAV_ITEMS` block: add
     `{ href: '/reading/', label: 'Reading' }` before Contact, and replace the note "`NAV_ITEMS`
     stays at seven entries" with eight entries (the `/workshop/` half of that note stands).
   - Same file, Behavior #8 ("the other 6 links" → 7), #13, #14 ("all 7 links" → 8) and #16 (7 `<li>`
     → 8, with `Reading` between `Blog` and `Contact` in both the label list and the href list).
   - Same file, Boundaries rows for `empty NAV_ITEMS`, `duplicate href in NAV_ITEMS` and
     `missing route target`: 7 → 8 (and "6 of 7 links" is now stale for a different reason — every
     nav route exists today).
   - Same file, Layer 1 primitive table: add `--shelf-spine-height-min`, `--shelf-spine-height-max`,
     `--shelf-spine-width-min` with the values above. Layer 2 semantic table: add the eight
     `--color-spine-*` rows above. Dark-scheme mechanism prose and Behavior #30: 22 semantic tokens
     → 30.
   - `specs/workshop.spec.md`, Behavior #29 and Invariant 11: "the seven `NAV_ITEMS` links and no
     eighth" → eight links and no ninth; "`NAV_ITEMS` still has seven entries" → eight. The point of
     those rows — `/workshop/` is not in the nav and is linked from nowhere — is unchanged, and its
     Behavior #30 (no `workshop` string anywhere else in `dist/`) still holds.
   Until this is done, those two documents and this one disagree about the nav length and the token
   count, and this spec is the newer decision.

Settled — recorded here so the decisions are not relitigated:

7. **Closed — the palette is four variants built from existing primitives.** `clay`, `teal`, `ink`,
   `sand` are all the existing ink/teal/clay ramps can supply while every pair clears 4.5:1 in both
   schemes. No new colour family is added to Layer 1. If a fifth variant is ever wanted, it needs a
   new primitive ramp and a fresh contrast check, which is a separate decision.
8. **Closed — the page stays at the `'prose'` column.** Seven spines wrap comfortably inside 42rem
   at every tested width, and a 72rem column would stretch the intro paragraph past a readable
   measure. No `width` attribute is passed.
9. **Closed — geometry lives in Layer 1, not Layer 2.** Spine heights and the minimum width are
   lengths, not colours; the "semantic tokens only" rule in `CLAUDE.md` governs colour, and
   components already reference primitives such as `--space-md` and `--radius-md` directly. The
   three new primitives are grouped and commented as bookshelf geometry and referenced only by
   `src/pages/reading.astro`.
10. **Closed — `writing-mode: vertical-rl`, never `transform: rotate()`.** Rotation by transform
    reserves the wrong layout box, breaks text selection, and would force a manual height for every
    spine. Writing mode keeps the text real, selectable, and self-sizing — which is also why a long
    title thickens a spine instead of overflowing it.
