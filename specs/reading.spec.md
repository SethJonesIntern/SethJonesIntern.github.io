# Reading

Issue: personal-website #16 — "/reading/: a bookshelf of what I have been reading"

## Purpose

`/reading/` lists the books Seth has read recently, drawn as a shelf of standing spines rather than
a bulleted list. One typed array — `READING_LIST` in `src/lib/reading-books.ts` — is the source of
truth: eighteen entries, each carrying a stable `id`, a `title`, an `author`, the shelf it stands
on, and a spine colour named by a typed union. **One entry is one book.** A series is not a single
spine: the seven Harry Potter novels, the two Song of Ice and Fire novels Seth has read, and the
five Percy Jackson novels each get their own spine under their own title, because that is how Seth
talks about them and because eighteen spines make a better bookcase than seven. There is no volume
range, no series field, and no volume formatting anywhere — the titles carry the identity. Adding a
book means appending one entry to that array and touching nothing else. The decision logic that can
be unit-tested (id validation, anchor derivation, shelf grouping, duplicate detection, spine-variant
adjacency) lives in `src/lib/reading.ts`, a plain TypeScript module with zero imports. The visual
treatment is CSS only: spines are real list items whose text runs down the spine via `writing-mode`,
so the page is a genuine, readable list to a screen reader and renders completely with JavaScript
disabled. Because a bookshelf wants spines of varying colour and components may not carry raw
colour, the palette is added to `src/styles/tokens.css` as eight new Layer 2 semantic tokens
remapped under `@media (prefers-color-scheme: dark)`, exactly as the UCF-mark work added
`--color-mark-plate`. The page joins the nav between Blog and Contact so Contact stays last. No
client-side JavaScript of this issue's own, no new dependency, no content collection. (Issue #18,
`specs/workshop-unlock.spec.md`, later added one pointer-click-only script to this page for the
workshop unlock: a pointer click on a spine pulls it, marked by a `data-pulled` attribute that one
CSS rule here raises, and a second click pushes it back. It changes neither the markup nor the
accessibility of the shelf.)

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

/** Throws TypeError on the first repeated `id`, scanning in declaration order. Returns void. */
export function assertUniqueBookIds(books: readonly Book[]): void;

/** Throws TypeError on the first book whose `spine` equals the previous book's. Returns void. */
export function assertVariedSpines(books: readonly Book[]): void;

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

There is deliberately **no** `spineLabel`, no `formatVolumes`, no `volumes` field and no series
field. A spine prints `book.title` and `book.author`, each in its own element, and the page reads
those two properties directly — see Open question 6 for why no title-composing helper survives.

### `src/lib/reading-books.ts` — exact contents as shipped

Apostrophes are U+2019 RIGHT SINGLE QUOTATION MARK (`’`), matching `about.astro`; the ampersand in
`Fire & Blood` is a literal `&`; `Kästner` carries U+00E4. Tests assert these byte-for-byte.

```ts
import type { Book } from './reading';

// The shelf, in render order: shelf groups follow SHELVES, books follow this array.
// One entry is one book — a series is several spines, not one. To add a book,
// append one entry here; nothing else in the repo needs editing. Pick a `spine`
// that differs from the entry above it on the same shelf (see spec Invariant 3).
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
    id: 'harry-potter-sorcerers-stone',
    title: 'Harry Potter and the Sorcerer’s Stone',
    author: 'J. K. Rowling',
    shelf: 'fiction',
    spine: 'clay',
  },
  {
    id: 'harry-potter-chamber-of-secrets',
    title: 'Harry Potter and the Chamber of Secrets',
    author: 'J. K. Rowling',
    shelf: 'fiction',
    spine: 'teal',
  },
  {
    id: 'harry-potter-prisoner-of-azkaban',
    title: 'Harry Potter and the Prisoner of Azkaban',
    author: 'J. K. Rowling',
    shelf: 'fiction',
    spine: 'ink',
  },
  {
    id: 'harry-potter-goblet-of-fire',
    title: 'Harry Potter and the Goblet of Fire',
    author: 'J. K. Rowling',
    shelf: 'fiction',
    spine: 'sand',
  },
  {
    id: 'harry-potter-order-of-the-phoenix',
    title: 'Harry Potter and the Order of the Phoenix',
    author: 'J. K. Rowling',
    shelf: 'fiction',
    spine: 'teal',
  },
  {
    id: 'harry-potter-half-blood-prince',
    title: 'Harry Potter and the Half-Blood Prince',
    author: 'J. K. Rowling',
    shelf: 'fiction',
    spine: 'clay',
  },
  {
    id: 'harry-potter-deathly-hallows',
    title: 'Harry Potter and the Deathly Hallows',
    author: 'J. K. Rowling',
    shelf: 'fiction',
    spine: 'sand',
  },
  {
    id: 'a-game-of-thrones',
    title: 'A Game of Thrones',
    author: 'George R. R. Martin',
    shelf: 'fiction',
    spine: 'ink',
  },
  {
    id: 'a-clash-of-kings',
    title: 'A Clash of Kings',
    author: 'George R. R. Martin',
    shelf: 'fiction',
    spine: 'clay',
  },
  {
    id: 'fire-and-blood',
    title: 'Fire & Blood',
    author: 'George R. R. Martin',
    shelf: 'fiction',
    spine: 'sand',
  },
  {
    id: 'the-lightning-thief',
    title: 'The Lightning Thief',
    author: 'Rick Riordan',
    shelf: 'fiction',
    spine: 'teal',
  },
  {
    id: 'the-sea-of-monsters',
    title: 'The Sea of Monsters',
    author: 'Rick Riordan',
    shelf: 'fiction',
    spine: 'ink',
  },
  {
    id: 'the-titans-curse',
    title: 'The Titan’s Curse',
    author: 'Rick Riordan',
    shelf: 'fiction',
    spine: 'sand',
  },
  {
    id: 'the-battle-of-the-labyrinth',
    title: 'The Battle of the Labyrinth',
    author: 'Rick Riordan',
    shelf: 'fiction',
    spine: 'clay',
  },
  {
    id: 'the-last-olympian',
    title: 'The Last Olympian',
    author: 'Rick Riordan',
    shelf: 'fiction',
    spine: 'teal',
  },
];
```

Eighteen entries: three on `technical`, fifteen on `fiction`, in exactly this order. The
`: readonly Book[]` annotation is required so the element type survives `.map()` on the page.
`READING_LIST` is the only export. Nothing else in the repo may declare books.

**How spine variants are assigned.** Not by chance and not by `index % 4`, which would paint the
shelf in visible four-colour stripes. The rule, applied per shelf:

> Read the shelf in declaration order and cut it into blocks of four. Each block is a *permutation*
> of `SPINE_VARIANTS` — all four colours, each once — and the first colour of a block differs from
> the last colour of the block before it. A trailing partial block just has to keep those two
> properties (all distinct, no repeat across the seam).

That gives an even colour count with no run, no stripe and no two neighbours alike, at any shelf
length. The fiction shelf above is `[clay teal ink sand]`, `[teal clay sand ink]`,
`[clay sand teal ink]`, `[sand clay teal]` — clay ×4, teal ×4, ink ×3, sand ×4. The technical shelf
is the partial block `[ink teal sand]`. The block rule is an authoring convention checked by review;
its weaker consequence — no two consecutive books on a shelf share a variant — is enforced at build
time by `assertVariedSpines` and is Invariant 3.

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

Counts after this feature: 72 Layer 1 primitives (69 today + 3) and 30 Layer 2 semantic tokens
(22 + 8). These match the amended `specs/layout-design-system.spec.md`; expanding the book list
changed neither number, nor the eight-entry nav.

### `src/pages/reading.astro` — contract

Flat route, so the default `directory` build format emits `dist/reading/index.html` at `/reading/`.

This contract is the page as it stands after issue #18. The `workshop-unlock` import, the
`assertUnlockSequence` call, the `<script>`, and two changes to the scoped `<style>` — the
`.shelf__book[data-pulled]` rule and the `:not([data-pulled])` narrowing of the reduced-motion hover
selector — were added by `specs/workshop-unlock.spec.md`, which is the contract of record for them.
Everything else, including all of the shelf's markup and accessibility semantics, is #16's and is
unchanged.

Frontmatter:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import {
  assertUniqueBookIds,
  assertVariedSpines,
  bookAnchorId,
  groupByShelf,
  shelfHeadingId,
  spineClass,
} from '../lib/reading';
import { READING_LIST } from '../lib/reading-books';
import { UNLOCK_SEQUENCE, assertUnlockSequence } from '../lib/workshop-unlock';

// A duplicate id would emit duplicate DOM ids; fail the build instead.
assertUniqueBookIds(READING_LIST);

// A key book renamed or removed would make the combination unreachable; fail the build.
assertUnlockSequence(UNLOCK_SEQUENCE, READING_LIST.map((book) => book.id));

const shelves = groupByShelf(READING_LIST);

// Two neighbouring spines in the same colour read as one fat book; fail the build.
shelves.forEach((group) => assertVariedSpines(group.books));
---
```

Body (no `width` attribute — the column stays `'prose'`):

```astro
<BaseLayout
  title="Reading"
  description="Books Seth Jones has read recently, from software engineering to fantasy."
>
  <h1>Reading</h1>
  <p>A shelf of what I have read lately — some of it for work, most of it not.</p>
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
              <span class="shelf__title">{book.title}</span>
              <span class="shelf__author">{book.author}</span>
            </li>
          ))}
        </ul>
      </section>
    ))
  }
  <script>
    /* the workshop unlock — contracted by specs/workshop-unlock.spec.md */
  </script>
</BaseLayout>
```

Notes the coder must honour:
- `role="list"` is deliberate: `list-style: none` strips list semantics in Safari/VoiceOver, and this
  shelf must stay a real list.
- No `aria-hidden`, no `role="presentation"`, no `tabindex`, no `title` attribute, no visually-hidden
  duplicate of any title or author, no decorative element for the shelf board — the board is a
  border. The visible text *is* the accessible text.
- `data-book-id` and the `book-<id>` DOM id are the book's stable identity: they make a single book
  addressable (a permalink such as `/reading/#book-the-last-olympian`, or a later per-book
  annotation) without renaming anything. The only script that reads `data-book-id` is the
  pointer-click-only unlock of `specs/workshop-unlock.spec.md`, and it treats every spine
  identically. That script is also the only thing that sets or removes `data-pulled` on a spine; the
  built HTML never contains `data-pulled`.
- The page's one `<script>` is #18's unlock, a plain processed `<script>`. No other `<script>`, no
  `on*` attribute, no `client:*` directive.

Scoped `<style>` in this page only, exactly these rules (every colour a semantic token, every length
a primitive token or a `calc()` over one):

```css
  .shelf + .shelf {
    margin-block-start: var(--space-xl);
  }

  .shelf__list {
    list-style: none;
    padding: 0;
    margin-block-start: var(--space-md);
    display: flex;
    flex-wrap: wrap;
    /* `align-items` applies per flex line, so each wrapped row of spines stands
       on its own baseline. With fifteen fiction spines that is the normal case
       at every viewport width, not a phone-only fallback. */
    align-items: flex-end;
    align-content: flex-start;
    /* No column gap: books on a shelf touch. Each spine's own foot then joins
       its neighbours' into one continuous board line under every row, without a
       wrapper element per row. */
    column-gap: 0;
    row-gap: var(--space-lg);
  }

  /* The spine's own writing mode swaps the logical axes, so its geometry and its
     foot are stated in PHYSICAL properties on purpose: in `vertical-rl`,
     `border-block-end` would paint the left edge, not the bottom one. `max-height`
     caps the length of the vertical text line, and a title too long for it wraps
     to a second line, which widens the spine instead of lengthening it — which is
     what a thick book looks like. `flex: none` makes a spine wrap to the next row
     rather than be squashed below its natural width. */
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
    border-bottom: var(--border-thick) solid var(--color-border-strong);
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

  /* A pulled book stays up until it is pushed back. It stands higher than the
     hover lift, so pulling or pushing the book under the pointer still visibly
     moves it, and hovering a pulled book changes nothing. */
  .shelf__book[data-pulled],
  .shelf__book[data-pulled]:hover {
    transform: translateY(calc(-1 * var(--space-sm)));
    box-shadow: var(--shadow-md);
  }

  @media (prefers-reduced-motion: reduce) {
    .shelf__book {
      transition: none;
    }

    /* Only the hover lift goes. A pulled book still stands raised, placed
       without a transition, so it reads as pulled without animating. */
    .shelf__book:hover:not([data-pulled]) {
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
per-book override of the transition, the transform, the geometry, or the typography. The
`[data-pulled]` rule is the one state rule, it applies to every spine alike, and it belongs to
`specs/workshop-unlock.spec.md`, which pins its behaviour in its Behavior rows 89–95.

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
  assertVariedSpines,
  bookAnchorId,
  booksOnShelf,
  groupByShelf,
  isBookId,
  isShelf,
  isSpineVariant,
  shelfHeadingId,
  spineClass,
  type Book,
  type Shelf,
  type ShelfGroup,
  type SpineVariant,
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

Rows 1–47 are Vitest cases against the two `src/lib` modules. Rows 48–71 are review criteria
verified by `npm run build`, `npm run check` and loading the page — this is presentation, and per
`CLAUDE.md` adjudication is off. Unless a row says otherwise, review rows are read with no spine
pulled (a fresh load, no spine clicked).

| # | input | expected output | notes |
|---|---|---|---|
| 1 | `isBookId('the-last-olympian')` | `true` | kebab-case |
| 2 | `isBookId('fire')` | `true` | single run |
| 3 | `isBookId('9-lives')` | `true` | digits allowed, may lead |
| 4 | `isBookId('The-Last-Olympian')` | `false` | uppercase rejected, no lowercasing |
| 5 | `isBookId('two words')` / `('trailing-')` / `('-leading')` / `('double--hyphen')` / `('')` | `false` × 5 | |
| 6 | `isBookId(' fire ')` | `false` | no trimming |
| 7 | `isBookId('fire_blood')` / `('fire.blood')` / `('fire/blood')` / `('titan’s-curse')` | `false` × 4 | only `[a-z0-9-]`; the apostrophe is dropped from ids, never encoded |
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
| 18 | `bookAnchorId('the-last-olympian')` | `'book-the-last-olympian'` | |
| 19 | `bookAnchorId('harry-potter-goblet-of-fire')` | `'book-harry-potter-goblet-of-fire'` | |
| 20 | `bookAnchorId('a'.repeat(200))` | `'book-' + 'a'.repeat(200)` | id length uncapped |
| 21 | `shelfHeadingId('technical')` / `('fiction')` | `'shelf-technical'`, `'shelf-fiction'` | |
| 22 | `spineClass('clay')` / `('teal')` / `('ink')` / `('sand')` | `'shelf__book--clay'`, `'shelf__book--teal'`, `'shelf__book--ink'`, `'shelf__book--sand'` | |
| 23 | `assertUniqueBookIds([])` | returns `undefined`, throws nothing | |
| 24 | `assertUniqueBookIds([book('a'), book('b'), book('c')])` | returns `undefined` | |
| 25 | `assertUniqueBookIds(READING_LIST)` | returns `undefined` | all 18 ids distinct |
| 26 | `const xs = [book('b'), book('a')]; assertUniqueBookIds(xs)` | `xs` still has ids `['b','a']` and the same element references | never sorts or mutates |
| 27 | `assertVariedSpines([])` | returns `undefined` | empty shelf is legal |
| 28 | `assertVariedSpines([book('a', { spine: 'clay' })])` | returns `undefined` | a single spine has no neighbour |
| 29 | `assertVariedSpines([book('a', { spine: 'clay' }), book('b', { spine: 'teal' }), book('c', { spine: 'clay' })])` | returns `undefined` | only *consecutive* repeats are rejected; reuse further along is fine |
| 30 | `const xs = [book('a', { spine: 'clay' }), book('b', { spine: 'ink' })]; assertVariedSpines(xs)` | returns `undefined`; `xs` unchanged, same element references | never mutates |
| 31 | `booksOnShelf([book('a'), book('b', { shelf: 'fiction' }), book('c')], 'technical')` | ids `['a','c']` | filter, input order |
| 32 | `booksOnShelf([...], 'fiction')` for the same input | ids `['b']` | |
| 33 | `booksOnShelf(xs, 'fiction')` where no book is on it | `[]` | empty array, not `undefined` |
| 34 | `const xs = [book('a')]; booksOnShelf(xs, 'technical') !== xs` | `true`, and `xs` is unchanged | new array, no aliasing |
| 35 | `groupByShelf([])` | `[]` | no groups |
| 36 | `groupByShelf([book('a'), book('b')])` | one group: `{ shelf: 'technical', label: 'Technical', books: [a, b] }` | empty `fiction` shelf omitted |
| 37 | `groupByShelf([book('f', { shelf: 'fiction' }), book('t')])` | two groups, in order `['technical', 'fiction']` with ids `[['t'], ['f']]` | SHELVES order, not input order |
| 38 | `groupByShelf([book('a'), book('c'), book('b')])` | the single group's ids are `['a','c','b']` | never sorts within a shelf |
| 39 | `READING_LIST.length` | `18` | three technical, fifteen fiction |
| 40 | `READING_LIST.map((b) => b.id)` | `['mythical-man-month','machine-learning-in-production','operating-systems-three-easy-pieces','harry-potter-sorcerers-stone','harry-potter-chamber-of-secrets','harry-potter-prisoner-of-azkaban','harry-potter-goblet-of-fire','harry-potter-order-of-the-phoenix','harry-potter-half-blood-prince','harry-potter-deathly-hallows','a-game-of-thrones','a-clash-of-kings','fire-and-blood','the-lightning-thief','the-sea-of-monsters','the-titans-curse','the-battle-of-the-labyrinth','the-last-olympian']` | declaration order; these ids are permanent (Invariant 6) |
| 41 | `READING_LIST.map((b) => b.title)` | the eighteen `title` literals from the module block above, in that order | assert the array verbatim; the three traps are `Fire & Blood`, `Christian Kästner`'s book, and the two U+2019 apostrophes |
| 42 | `READING_LIST[3].title` and `READING_LIST[15].title` | `'Harry Potter and the Sorcerer’s Stone'` and `'The Titan’s Curse'`, each containing `'’'` and **not** `"'"` (U+0027) | curly apostrophe, house style |
| 43 | `READING_LIST.map((b) => b.author)` | `['Frederick P. Brooks Jr.','Christian Kästner','Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau','J. K. Rowling','J. K. Rowling','J. K. Rowling','J. K. Rowling','J. K. Rowling','J. K. Rowling','J. K. Rowling','George R. R. Martin','George R. R. Martin','George R. R. Martin','Rick Riordan','Rick Riordan','Rick Riordan','Rick Riordan','Rick Riordan']` | repeated authors are legal and expected |
| 44 | `READING_LIST.map((b) => b.spine)` | `['ink','teal','sand','clay','teal','ink','sand','teal','clay','sand','ink','clay','sand','teal','ink','sand','clay','teal']` | the assignment rule's output |
| 45 | every `b` in `READING_LIST` | `isBookId(b.id)`, `isShelf(b.shelf)`, `isSpineVariant(b.spine)` all `true`; `b.title.trim() !== ''`; `b.author.trim() !== ''` | data is self-consistent |
| 46 | `groupByShelf(READING_LIST)` | 2 groups: `technical`/`Technical` with 3 books, then `fiction`/`Fiction` with 15 | |
| 47 | `groupByShelf(READING_LIST).forEach((g) => assertVariedSpines(g.books))` | throws nothing; additionally, for each group, cut into non-overlapping blocks of 4 from the start, each block's `spine` values are all distinct | the block rule holds on the shipped shelf |
| 48 | `npm run build` | exit 0; `dist/reading/index.html` exists | static route at `/reading/` |
| 49 | `npm run check` | exit 0, zero errors and zero warnings | TypeScript strict clean |
| 50 | `dist/reading/index.html` `<title>` | `Reading · Seth Jones` | separator is space + U+00B7 + space |
| 51 | `dist/reading/index.html` meta description | `Books Seth Jones has read recently, from software engineering to fantasy.` | |
| 52 | any built page's nav | 8 `<li>`, link text in order `Home, About, Research, Teaching, Projects, Blog, Reading, Contact`; hrefs `/`, `/about/`, `/research/`, `/teaching/`, `/projects/`, `/blog/`, `/reading/`, `/contact/` | Contact stays last |
| 53 | `dist/reading/index.html` nav | the `/reading/` link carries `aria-current="page"` and `is-active`; no other link does | existing `SiteNav` logic, unchanged |
| 54 | `dist/reading/index.html` body | exactly one `<h1>`, text `Reading`; exactly two `<h2>`, texts `Technical` then `Fiction` | |
| 55 | `dist/reading/index.html` | two `section.shelf`, each `aria-labelledby` pointing at its own `h2` id (`shelf-technical`, `shelf-fiction`) | labelled regions |
| 56 | `dist/reading/index.html` | two `ul.shelf__list[role="list"]`; the first has 3 `li.shelf__book`, the second 15; 18 in total | list semantics survive `list-style: none` |
| 57 | the 18 `li.shelf__book` in DOM order | `id` attributes are `book-` + Behavior 40's ids in the same order, and each `data-book-id` equals that id without the prefix | stable identity, declaration order |
| 58 | each `li.shelf__book` | exactly two element children: `span.shelf__title` then `span.shelf__author`; their texts are that book's `title` and `author` | the visible text is the accessible text |
| 59 | `li#book-fire-and-blood .shelf__title` | parsed text content is exactly `Fire & Blood` (source HTML contains `Fire &amp; Blood`) | Astro escapes; text round-trips |
| 60 | `li#book-the-titans-curse .shelf__title` and `li#book-machine-learning-in-production .shelf__author` | parsed text exactly `The Titan’s Curse` and `Christian Kästner` | U+2019 and U+00E4 survive the build |
| 61 | the 18 `li.shelf__book` class attributes | each contains `shelf__book` plus exactly one `shelf__book--<variant>`, the variants in Behavior 44's order | one modifier per spine |
| 62 | any two adjacent `li.shelf__book` within the same `ul` | their `shelf__book--*` modifiers differ | no colour runs on a shelf |
| 63 | computed style of any `li.shelf__book` | `writing-mode` is `vertical-rl`; `text-orientation` is `mixed` | rotated by writing mode, not `transform` |
| 64 | computed style of any `ul.shelf__list` | `column-gap` is `0px`(or `normal`), `row-gap` is `32px`, `align-items` is `flex-end`, `flex-wrap` is `wrap` | spines touch; rows are separated by `--space-lg` |
| 65 | `prefers-color-scheme: light`, computed backgrounds of a clay/teal/ink/sand spine | `rgb(95, 38, 25)`, `rgb(12, 58, 63)`, `rgb(64, 58, 50)`, `rgb(168, 158, 142)`; computed colour is `rgb(250, 248, 245)` on the first three and `rgb(18, 16, 13)` on sand | light token mapping |
| 66 | `prefers-color-scheme: dark`, same four | `rgb(154, 63, 43)`, `rgb(20, 92, 99)`, `rgb(92, 84, 73)`, `rgb(207, 199, 185)`; text colours unchanged from row 65 | dark token mapping |
| 67 | hover over each of the 18 spines, none pulled, no reduced-motion preference | every one computes `transform: matrix(1, 0, 0, 1, 0, -8)` (translateY(-8px), i.e. `--space-2xs`) with `transition-duration: 0.2s` and `transition-timing-function: cubic-bezier(0.2, 0, 0.2, 1)` — identical for all eighteen, and no neighbouring spine moves | one rule, no per-spine variation. A pulled spine stays at its pulled raise under hover (`specs/workshop-unlock.spec.md` row 90) |
| 68 | `prefers-reduced-motion: reduce`, hover a spine that is not pulled | computed `transform` is `none` and `transition` is `none`; the `box-shadow` change still applies | motion honoured, affordance kept. A pulled spine keeps its raise without a transition (`specs/workshop-unlock.spec.md` row 92) |
| 69 | viewport 400px, 768px and 1280px, no spine pulled and none hovered | `document.documentElement.scrollWidth <= viewport width` at each; the fiction shelf wraps to at least two rows at all three; within every row, all spines share one bottom edge (their `getBoundingClientRect().bottom` values are equal) and their thick bottom borders meet to form a continuous board line | multi-row is the normal case; no horizontal scroll ever. A pulled or hovered spine is transformed and is excluded by design |
| 70 | `dist/reading/index.html` | contains no `on[a-z]+=` handler attribute, no `style=` attribute and no `data-pulled` attribute; every `<script>` element is an Astro-processed `type="module"` script from `SiteNav.astro` or this page (`specs/workshop-unlock.spec.md`); with JavaScript disabled the page renders identically to the JavaScript-enabled page before any spine is clicked | the presentation is CSS-only; the only visible script effect is a pulled spine's raise (amended; was "no `<script`", then "the scripts change nothing visible") |
| 71 | `dist/rss.xml` | contains no `/reading/` link | the feed stays blog-only |

## Errors

| condition | exception type | message contract |
|---|---|---|
| `bookAnchorId('')` | `TypeError` | exactly `bookAnchorId: invalid book id ""` |
| `bookAnchorId('The-Last-Olympian')` | `TypeError` | exactly `bookAnchorId: invalid book id "The-Last-Olympian"` |
| `bookAnchorId(' fire ')` | `TypeError` | exactly `bookAnchorId: invalid book id " fire "` |
| `bookAnchorId('double--hyphen')` | `TypeError` | exactly `bookAnchorId: invalid book id "double--hyphen"` |
| `bookAnchorId(null as unknown as string)` | `TypeError` | exactly `bookAnchorId: invalid book id "null"` — the guard runs before any string method and the value is interpolated via `String(id)` |
| `bookAnchorId(undefined as unknown as string)` | `TypeError` | exactly `bookAnchorId: invalid book id "undefined"` |
| `shelfHeadingId('poetry' as Shelf)` | `TypeError` | exactly `shelfHeadingId: unknown shelf "poetry"` |
| `shelfHeadingId(null as unknown as Shelf)` | `TypeError` | exactly `shelfHeadingId: unknown shelf "null"` |
| `spineClass('gold' as SpineVariant)` | `TypeError` | exactly `spineClass: unknown spine variant "gold"` |
| `spineClass(undefined as unknown as SpineVariant)` | `TypeError` | exactly `spineClass: unknown spine variant "undefined"` |
| `assertUniqueBookIds([book('fire'), book('fire')])` | `TypeError` | exactly `assertUniqueBookIds: duplicate book id "fire"` |
| `assertUniqueBookIds([book('a'), book('b'), book('a'), book('b')])` | `TypeError` | exactly `assertUniqueBookIds: duplicate book id "a"` — first repeat in declaration order, not the last |
| `assertVariedSpines([book('a', { spine: 'clay' }), book('b', { spine: 'clay' })])` | `TypeError` | exactly `assertVariedSpines: "b" repeats the spine variant "clay"` — the message names the *second* book of the pair |
| `assertVariedSpines([book('a', { spine: 'ink' }), book('b', { spine: 'teal' }), book('c', { spine: 'teal' }), book('d', { spine: 'teal' })])` | `TypeError` | exactly `assertVariedSpines: "c" repeats the spine variant "teal"` — first offending pair in declaration order |
| a `READING_LIST` entry whose `id` fails `BOOK_ID_PATTERN` | `npm run build` exits non-zero with the `bookAnchorId` `TypeError`, raised while rendering | no silent fallback id. Review-only |
| a `READING_LIST` entry with a duplicate `id` | `npm run build` exits non-zero with the `assertUniqueBookIds` `TypeError`, before any markup is emitted | duplicate DOM ids can never ship. Review-only |
| a `READING_LIST` entry whose `spine` equals that of the entry before it on the same shelf | `npm run build` exits non-zero with the `assertVariedSpines` `TypeError` | the fix is to pick another variant; the check runs per shelf group, so the last technical and first fiction book may share a variant. Review-only |
| a `READING_LIST` entry missing `id`/`title`/`author`/`shelf`/`spine`, or with a `shelf`/`spine` outside its union, or carrying a stray `volumes` property | `astro check` diagnostic, `npm run check` exits 1 | assert on exit code and the offending property name, not on TypeScript's wording. Review-only |
| removing or renaming the `id` of a workshop key book (`a-clash-of-kings`, `harry-potter-prisoner-of-azkaban`) | `npm run build` exits non-zero with the `assertUnlockSequence` `TypeError` | contracted by `specs/workshop-unlock.spec.md`. Review-only |

`assertUniqueBookIds` does **not** validate id syntax — only uniqueness; syntax is enforced by
`bookAnchorId` during render. `assertVariedSpines` validates neither ids nor shelf membership — it
reads `spine` only, and it is the caller's job to pass one shelf's books. All three failures stop
the build, which is the point.

## Boundaries

| boundary | answer |
|---|---|
| empty `READING_LIST` | `groupByShelf([])` is `[]` (Behavior 35) and the page would render the `h1` and intro paragraph with zero `section.shelf`. There is **no** empty-state copy and no conditional branch to write. Test the function; the page state is unreachable — do not test it. |
| a shelf with zero books | Omitted from `groupByShelf` output entirely — no empty `<section>`, no empty `<ul>` (Behavior 36). Test. |
| single book on a shelf | One `<li>`; `assertVariedSpines` passes vacuously (Behavior 28). Test the function. |
| empty string id | `isBookId('') === false`; `bookAnchorId('')` throws. Test both. |
| empty string `title` or `author` | Type-legal, no runtime check, no warning. Undefined at the page level, do not test the render. |
| zero / negative / numeric inputs | No function in this feature takes a number. Undefined, do not test. |
| max — id length | Uncapped: `bookAnchorId('a'.repeat(200))` works (Behavior 20). Test. |
| max — list length | Uncapped, no pagination, no "show more", no lazy rendering. `assertUniqueBookIds` over 500 distinct ids returns `undefined`. Test if convenient. |
| max — shelf length on screen | Fifteen spines is the shipped fiction shelf and it wraps to several rows at every width; that is the designed normal case, not a degradation (Behavior 69). A shelf of 100 would simply wrap further. Review-only above 18. |
| max — title length on a spine | Handled by CSS, not by code: `max-height` caps the vertical line and the title wraps into a second line, widening the spine. No truncation, no ellipsis, no short-title field. Review-only, at `machine-learning-in-production` and the longer Harry Potter spines. |
| unicode in ids | Rejected — Behavior 7 and 8. The apostrophe in `The Titan’s Curse` is **dropped** when forming `the-titans-curse`, never encoded or replaced by a hyphen. Test. |
| unicode in `title` / `author` | Accepted and rendered verbatim (`’`, `&`, `ä`). Test at the data level (Behavior 41–43) and in the built HTML (Behavior 59–60). |
| null / undefined to the three guards | `false` — Behavior 9, 12, 14. Test. |
| null / undefined to `bookAnchorId`, `shelfHeadingId`, `spineClass` | `TypeError` with the `String(value)` message. Test. |
| null / undefined / non-array to `assertUniqueBookIds`, `assertVariedSpines`, `booksOnShelf`, `groupByShelf` | The parameters are typed `readonly Book[]`. Undefined, do not test. |
| duplicate ids | `TypeError` naming the first repeat. Test. |
| duplicate `title` or `author` across entries | Legal, no check, no warning — seven entries share `J. K. Rowling` and five share `Rick Riordan`. Test that it does not throw (Behavior 43). |
| duplicate `spine` across entries | Legal and unavoidable with 18 books and 4 variants; only *consecutive* duplicates on one shelf throw (Behavior 29). Test both directions. |
| the same variant on the last technical and first fiction book | Legal — the check runs per shelf group, and the two shelves are visually separated by a heading. Test that `assertVariedSpines` is never called across the seam. |
| unordered input | There is no sort anywhere. Books render in `READING_LIST` order within a shelf (Behavior 38) and shelves in `SHELVES` order regardless of input order (Behavior 37). Test both. |
| viewport minimum | 400px is the contracted floor (Behavior 69). Below 320px undefined, do not test. |
| viewport maximum | ≥1280px: spines cap at `--shelf-spine-height-max`'s 16rem ceiling, the column stays `.prose`, and the fiction shelf still wraps. Test scrollWidth and row count only. |
| `prefers-reduced-motion: reduce` | Behavior 68 — on a spine that is not pulled, `transform: none`, `transition: none`, shadow change retained. A pulled spine stays raised with no transition; that case is `specs/workshop-unlock.spec.md` row 92. Test. |
| JavaScript disabled | Fully rendered and fully readable, identical to JavaScript enabled before any spine is clicked; the shelf is simply inert and no spine can be pulled (the unlock of `specs/workshop-unlock.spec.md` does not run). Behavior 70. Test. |
| forced-colors mode, print stylesheet, RTL (`dir="rtl"`) | Undefined, do not test. The site is `lang="en"` with no RTL support and no print sheet. |
| touch devices with no hover | The hover lift never fires, and nothing in #16 depends on it. A tap still pulls a spine through the unlock script; that behaviour, including sticky hover, is `specs/workshop-unlock.spec.md` rows 88 and 95. Do not test here. |

## Invariants

1. `isBookId(x)` is exactly `typeof x === 'string' && BOOK_ID_PATTERN.test(x)` for every input — no
   trimming, casing, or normalisation ever changes the answer. The same holds for `isShelf` and
   `isSpineVariant` against their arrays.
2. For every `id` where `isBookId(id)` is `true`, `bookAnchorId(id) === 'book-' + id`; for every
   other value it throws `TypeError`. There is no third outcome and no fallback id.
3. Within each shelf, no two consecutive books share a `spine` variant — enforced at build time by
   `assertVariedSpines`, so a shelf can never ship with a colour run. The stronger authoring
   convention (each non-overlapping block of four entries on a shelf uses all four variants, so the shelf neither
   stripes nor clumps) holds for the shipped data and is checked by review.
4. Every helper in `src/lib/reading.ts` is pure: same input, same output, no I/O, no state, no
   mutation of any argument. `booksOnShelf` and `groupByShelf` return fresh arrays and never alias
   or reorder their input; the two `assert*` functions return `undefined` or throw, and read nothing
   beyond each element's `id` or `spine`.
5. `groupByShelf(books)` emits groups in `SHELVES` order, emits a group only when it has at least
   one book, preserves each shelf's books in input order, and its groups' books together contain
   every input book exactly once.
6. Every `id` in `READING_LIST` matches `BOOK_ID_PATTERN` and is unique, so every DOM id the page
   emits is unique within the document. **An id is permanent once shipped**: it is a book's stable
   identity, renaming one breaks that book's anchor, and it is a deliberate breaking change rather
   than a refactor. Retitling a book does not change its id.
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
12. The hover treatment and the pulled treatment are each declared once, on `.shelf__book` and
    `.shelf__book[data-pulled]`, with no per-variant, per-shelf, per-book or per-index override,
    delay, or stagger — so the motion is identical for all eighteen spines, and lifting or pulling
    one never moves another. A pulled spine stands higher than a hovered one, and hovering it
    changes nothing.
13. The shelf's presentation needs no JavaScript: the page renders identically with scripts
    disabled, has no `on*` attribute, no hydration directive, and no new dependency. Its only
    `<script>` is the pointer-click-only unlock contracted by `specs/workshop-unlock.spec.md`, which
    changes nothing in the accessibility tree and whose only visible effect is toggling
    `data-pulled` on a spine a pointer clicks. (Amended by #18; #16 shipped no script.)
14. The visual rotation changes no semantics: DOM order is reading order, the shelf is a `<ul>` of
    `<li>` with `role="list"`, each `<section>` is labelled by its own `<h2>`, and no element on the
    page carries `aria-hidden`, `role="presentation"`, `tabindex`, or a visually-hidden duplicate of
    text that is already visible.
15. `document.documentElement.scrollWidth` never exceeds the viewport width, at any width from
    400px up. Spines wrap; a shelf never scrolls sideways and never gets its own scroll container.
    Every wrapped row is itself a shelf: its spines share one bottom edge, because `align-items`
    resolves per flex line, and their feet form a continuous board under that row. The hover lift
    and the pulled raise are both `transform`s, which do not affect layout.
16. `NAV_ITEMS` is the only list of pages; `/reading/` appears in it exactly once, at index 6, with
    Contact still last.

## Non-goals

- **Anything interactive, in this issue.** No click handler, no keyboard shortcut, no `localStorage`,
  no `cursor: pointer`, no focus styling, no link out of a spine. The spines are decoration around
  text; the only dynamic behaviour #16 ships is a CSS hover lift. The pointer-click pull/push of
  spines that unlocks the workshop was added later by `specs/workshop-unlock.spec.md`, which owns it:
  a clicked spine stays raised until clicked again, and nothing becomes focusable, clickable-looking
  or announced.
- **Any series machinery.** No `volumes` range, no `series` field, no `seriesOrder`, no grouping of
  a series under a sub-heading, no "Books 1–7" label, no collapsing of the seven Harry Potter
  spines back into one. One entry is one book, and the title is the whole identity.
- Ratings, star scores, review text, finish dates, "currently reading" state, page counts, ISBNs,
  cover images, or links to Goodreads, Amazon, or a publisher.
- A content collection, a Markdown file per book, frontmatter, `astro:content`, or MDX. The list is
  a TypeScript array, deliberately.
- Per-book pages (`/reading/<id>/`), filtering, sorting controls, search, tags, or an RSS feed for
  books. `dist/rss.xml` stays blog-only (Behavior 71).
- More shelves, a third spine axis (thickness, texture, worn edges), a 3D perspective transform, a
  wood-grain background image, or any raster asset.
- A short-title override field, truncation, or an ellipsis. A long title wraps.
- Horizontal scrolling, a carousel, a per-shelf scroll container, or pagination as an answer to
  fifteen spines. They wrap.
- Changing `BaseLayout`, `SiteHeader`, `SiteNav`, `SiteFooter`, `global.css`, or any existing page
  or token. The only edits outside the three new files are the one `NAV_ITEMS` entry and the eleven
  new token declarations.
- Tests that import `.astro` files, `astro:*` modules, `src/consts.ts`, `dist/**`, or that run a
  build. The nav-order and rendered-DOM rows are review criteria, not Vitest cases.
- Visual-regression snapshots, contrast computed at runtime, or bundle-size assertions.

## Open questions

1. **Authors are unverified — needs Seth's confirmation.** He supplied titles only; the planner
   filled in every `author` string. Confirm: `Frederick P. Brooks Jr.`, `Christian Kästner`,
   `Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau`, `J. K. Rowling` (×7),
   `George R. R. Martin` (×3), `Rick Riordan` (×5). Spacing and punctuation of the initials
   (`J. K.` vs `J.K.`, `George R. R.` vs `George R.R.`) is part of what needs confirming, since
   Behavior 43 and 58 assert the strings byte-for-byte.
2. **Percy Jackson was expanded on the coordinator's judgement, not Seth's instruction.** Seth named
   individual Harry Potter and Martin volumes, so leaving Percy Jackson as one lumped spine would
   have been inconsistent; it is now five spines under their own titles. Flag it to him. If he wants
   it back as one entry, that is five entries collapsing to one — Behavior 39, 40, 41, 43, 44, 46,
   56 and 57 all move, so settle it before implementation rather than after.
3. **`Harry Potter and the Sorcerer’s Stone` is the US title**, per instruction. If Seth read the
   UK edition and wants `Harry Potter and the Philosopher’s Stone`, the `title` literal changes and
   the id should **not** — `harry-potter-sorcerers-stone` is already the stable identity, and
   Invariant 6 says retitling does not renumber. Confirm the title, not the id.
4. **The Kästner subtitle stays on the spine.** `Machine Learning in Production: From Models to
   Products` is the longest label by a wide margin and will render as a visibly thicker two-line
   spine. That is intended (a thick book looks thick), but if Seth would rather the spine read just
   `Machine Learning in Production`, that is a one-literal change. Unverified.
5. **Page copy — open, with Seth.** The `<h1>`, the intro sentence, the `description`, and the two
   shelf headings (`Technical`, `Fiction`) are drafted in the voice of the About page and await his
   approval. Ship them exactly as written so the build stays verifiable; expect a wording pass that
   changes nothing but those literals and Behavior rows 50, 51 and 54.
6. **`spineLabel` was removed rather than redefined — flagging the deviation.** The instruction was
   that it "becomes title plus author". With the volume branch gone, any such helper is either the
   identity on `title` or a single string the DOM never contains: the spine prints the title and the
   author in two separate elements, at two sizes, so a concatenating helper would be an export the
   page cannot use and only tests would call. The spine still shows title plus author — that part is
   implemented, in `.shelf__title` and `.shelf__author`. Say the word if a combined string is wanted
   for some other purpose and it comes back with a concrete caller.

Settled — recorded here so the decisions are not relitigated:

7. **Closed — the palette is four variants built from existing primitives**, and eighteen books do
   not need a fifth. `clay`, `teal`, `ink`, `sand` are all the existing ink/teal/clay ramps can
   supply while every pair clears 4.5:1 in both schemes; the block-permutation rule above is what
   keeps four colours from reading as stripes across a long shelf. A fifth variant would need a new
   primitive ramp and a fresh contrast check, which is a separate decision.
8. **Closed — the page stays at the `'prose'` column.** Fifteen fiction spines wrap to two or three
   rows inside 42rem, which is what a bookcase looks like; a 72rem column would fit more spines per
   row but stretch the intro paragraph past a readable measure. No `width` attribute is passed.
9. **Closed — geometry lives in Layer 1, not Layer 2.** Spine heights and the minimum width are
   lengths, not colours; the "semantic tokens only" rule in `CLAUDE.md` governs colour, and
   components already reference primitives such as `--space-md` and `--radius-md` directly. The
   three new primitives are grouped and commented as bookshelf geometry and referenced only by
   `src/pages/reading.astro`.
10. **Closed — `writing-mode: vertical-rl`, never `transform: rotate()`.** Rotation by transform
    reserves the wrong layout box, breaks text selection, and would force a manual height for every
    spine. Writing mode keeps the text real, selectable, and self-sizing — which is also why a long
    title thickens a spine instead of overflowing it. The same flip is why the spine's foot is
    `border-bottom` and not `border-block-end`, which would paint its left edge.
11. **Closed — the shelf board is each spine's own foot, and there is no column gap.** Books on a
    shelf touch. A thick `border-bottom` per spine joins into a continuous board line under every
    wrapped row, which a single border on the `<ul>` could not do once the shelf wraps — and
    wrapping is now the normal case, not the phone case.
12. **Closed — amended for issue #18 (`specs/workshop-unlock.spec.md`), JavaScript only.** Changed
    here: one sentence of Purpose, the page contract (the frontmatter import and assertion, the
    `<script>`, and the `data-book-id` and no-script notes), Behavior 70, one Errors row naming the
    key books `a-clash-of-kings` and `harry-potter-prisoner-of-azkaban`, the "JavaScript disabled"
    boundary, Invariant 13, and the "Anything interactive" non-goal. The shelf's accessibility
    contract — `role="list"`, no `aria-hidden`, no visually-hidden duplicate, Behavior 56 and 58,
    Invariant 14 — is unchanged: Seth decided the shelf stays a real list, and the unlock is
    pointer-click only.
13. **Closed — amended again for #18's pull/push model (Seth's decision: pulled books stay up, and
    the shelf's visible state is the lock).** The unlock script now sets `data-pulled` on a clicked
    spine, so the "byte-identical style" and "changes nothing visible" claims no longer hold.
    Changed here: the Purpose parenthetical; the page-contract preamble and the `data-book-id` note;
    the scoped `<style>` (the new `.shelf__book[data-pulled]` rule raising a pulled spine by
    `--space-sm`, and the reduced-motion hover selector narrowed to `:not([data-pulled])`) and the
    paragraph after it; the Behavior preamble and rows 67–70; the reduced-motion,
    JavaScript-disabled and touch boundaries; Invariants 12, 13 and 15; and the "Anything
    interactive" non-goal. The markup, the accessibility contract, the tokens and every Vitest row
    are unchanged. `specs/workshop-unlock.spec.md` owns the pulled behaviour and its review rows.
