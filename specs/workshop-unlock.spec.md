# Workshop Unlock

Issue: personal-website #18 — "The two-book combination that unlocks the workshop". Builds on
`specs/reading.spec.md` (#16, the shelf) and `specs/workshop.spec.md` (#17, the room). Where this spec
changes a contract of theirs, those specs have been amended to agree; see Open questions 12–14.

**Amended — the pull/push model (Seth's decision, closed Open question 16).** Pulled books stay up
and the shelf's visible state is the lock. This replaces the earlier progress/re-arm model:
`pullBook` and `PullResult` are removed, a wrong pull no longer resets anything, and the shelf script
now sets one data attribute on the spine a pointer clicks.

## Purpose

The way into `/workshop/`. A pointer click on a spine on the `/reading/` shelf toggles it: an
unpulled book is pulled and stays raised, a pulled book is pushed back down. The workshop unlocks at
the moment the pulled books, in the order they were pulled, are exactly `a-clash-of-kings` then
`harry-potter-prisoner-of-azkaban`; the browser then records an unlock flag in `localStorage` and
navigates to `/workshop/`. From then on, every page's nav carries a `Workshop` item, on every later
visit, until site data is cleared. **What the user sees is the whole state.** A wrong book stays
pulled until the user pushes it back; nothing resets silently; there is no hidden progress. Pushing
a book back removes it from the pull order, so pulling Azkaban, then Clash, pushing Azkaban back and
pulling it again gives [Clash, Azkaban], which unlocks. Every spine behaves identically when pulled
or pushed, and the two key books carry no marker in markup, style or behaviour. This is the site's
first client-side JavaScript and it is confined to exactly two processed `<script>` blocks — one in
`src/components/SiteNav.astro` (reveals the nav item), one in `src/pages/reading.astro` (toggles
spines and tests for the combination). Every branch of the logic — the pull/push state transition,
the unlock test, the pointer-click test, the build-time check that the key books exist, the
stored-flag parsing, the guarded storage access, and the nav item's active state — lives in
`src/lib/workshop-unlock.ts`, a plain TypeScript module with zero imports that takes state, storage,
event details and pathnames as arguments, so Vitest covers it without a DOM. The two scripts are thin
wiring. **The shelf's markup and accessibility semantics do not change**: it stays a real, readable
`role="list"` of spines, exactly as `specs/reading.spec.md` contracts. The pulled state is a
`data-pulled` attribute that only the script sets and only CSS reads; it is not an ARIA state. The
unlock is reachable by mouse, pen or touch clicks only. Spines get no `tabindex`, no `role="button"`,
no `aria-pressed`, no key handler and no cursor change. Clicks synthesised by the keyboard, by
assistive technology or by `element.click()` are ignored, so a keyboard or screen-reader user reads
an ordinary list and never pulls a book. With JavaScript disabled the shelf renders exactly as
before, is inert, nothing looks pulled, and no nav item ever appears. No new dependency and no new
token. The only CSS change is one pulled-state rule and one narrowed reduced-motion selector in
`reading.astro`'s scoped style.

## Public API

### Files to create

```
src/lib/workshop-unlock.ts         (pure logic, constants and types; ZERO imports of any kind)
```

### Files to modify

```
src/components/SiteNav.astro       (append one <script>; frontmatter and markup byte-identical)
src/pages/reading.astro            (one import, one build-time assertion, one <script>, and the two
                                    scoped-<style> changes below; the shelf markup byte-identical)
```

Files to leave untouched: `src/consts.ts` (no `NAV_ITEMS` entry — the Workshop item is never in
the static nav), `src/layouts/BaseLayout.astro`, `src/components/SiteHeader.astro`,
`src/components/SiteFooter.astro`, `src/lib/reading.ts`, `src/lib/reading-books.ts`,
`src/lib/workshop.ts`, `src/lib/workshop-registry.ts`, `src/pages/workshop/index.astro`, every other
file under `src/pages/**`, `src/styles/*`, `src/content*`, `astro.config.mjs`, `tsconfig.json`,
`package.json`, `public/*`.

### `src/lib/workshop-unlock.ts` — exact exports

```ts
/**
 * Workshop unlock: the two-book combination on the reading shelf.
 * Zero imports, no DOM, no globals: state, storage, event details and pathnames are passed in,
 * so every branch is unit-testable without a browser or an Astro build.
 */

/** The key books, by stable READING_LIST id, in the order they must be pulled. */
export const UNLOCK_SEQUENCE: readonly string[] = [
  'a-clash-of-kings',
  'harry-potter-prisoner-of-azkaban',
];

/** Storage key holding the unlock flag. */
export const UNLOCK_STORAGE_KEY: string = 'workshop-unlocked';

/** The only stored value that counts as unlocked. */
export const UNLOCK_STORAGE_VALUE: string = 'true';

/** Where a completed combination navigates, and the nav item's href. */
export const WORKSHOP_HREF: string = '/workshop/';

/** Link text of the runtime nav item. */
export const WORKSHOP_NAV_LABEL: string = 'Workshop';

/**
 * One pointer click on one spine. `pulled` is the current pull order, oldest pull first (start at []);
 * `bookId` is the clicked spine's `data-book-id`, unvalidated.
 * Returns a NEW array:
 *  - `bookId` not a non-empty string  -> a copy of `pulled`, unchanged;
 *  - `bookId` present in `pulled`      -> `pulled` with every occurrence of `bookId` removed (pushed back),
 *                                         the remaining ids in their existing relative order;
 *  - otherwise                          -> `pulled` with `bookId` appended at the end (pulled).
 * Never mutates `pulled`, never returns `pulled` itself, never throws.
 */
export function togglePull(pulled: readonly string[], bookId: unknown): string[];

/**
 * The unlock test. True exactly when `sequence.length > 0`, `pulled.length === sequence.length`, and
 * `pulled[i] === sequence[i]` for every index. False for an empty `sequence`. Never mutates, never throws.
 */
export function isUnlockOrder(
  pulled: readonly string[],
  sequence: readonly string[] = UNLOCK_SEQUENCE,
): boolean;

/**
 * True only for a `MouseEvent.detail` that is an integer >= 1, i.e. a click produced by a real
 * pointer press (mouse, pen, touch tap). Keyboard activation, assistive-technology activation and
 * `element.click()` dispatch `click` with detail 0 and return false. Never throws.
 */
export function isPointerClick(detail: unknown): boolean;

/**
 * Build-time guard. Throws TypeError if `sequence` is empty, names an id absent from `knownIds`,
 * or repeats an id. Membership is exact string equality. Returns void.
 */
export function assertUnlockSequence(sequence: readonly string[], knownIds: readonly string[]): void;

/** The two Storage methods this feature uses. The browser's Storage object satisfies it. */
export interface UnlockStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Reads the `localStorage` property of `host` defensively. Returns that object when it has callable
 * `getItem` and `setItem`; returns null when the read throws (blocked site data, null/undefined
 * host) or the value is not such an object. Never throws.
 */
export function openStorage(host: unknown): UnlockStorage | null;

/** True only when `raw` is exactly the string UNLOCK_STORAGE_VALUE. No trimming, no casing. */
export function parseUnlockFlag(raw: unknown): boolean;

/** parseUnlockFlag(storage.getItem(UNLOCK_STORAGE_KEY)); false for null storage or a throwing read. Never throws. */
export function readUnlocked(storage: UnlockStorage | null): boolean;

/**
 * storage.setItem(UNLOCK_STORAGE_KEY, UNLOCK_STORAGE_VALUE). Returns true if the write did not throw;
 * false for null storage or any exception raised while writing. Never throws.
 */
export function recordUnlock(storage: UnlockStorage | null): boolean;

/** True for `/workshop/`, `/workshop`, and descendants. Same matching rule as SiteNav: case-sensitive, segment-bounded. */
export function isWorkshopPath(pathname: unknown): boolean;

export interface WorkshopNavLink {
  /** WORKSHOP_HREF. */
  readonly href: string;
  /** WORKSHOP_NAV_LABEL. */
  readonly label: string;
  /** 'site-nav__link is-active' when isWorkshopPath(pathname), else 'site-nav__link'. */
  readonly className: string;
  /** 'page' when isWorkshopPath(pathname), else null. */
  readonly ariaCurrent: 'page' | null;
}

/** The runtime nav item's attributes for the current pathname. Never throws. */
export function workshopNavLink(pathname: unknown): WorkshopNavLink;
```

**Removed exports.** `pullBook` and `PullResult` no longer exist. The module exports exactly the
names above and nothing else: five constants, `togglePull`, `isUnlockOrder`, `isPointerClick`,
`assertUnlockSequence`, `openStorage`, `parseUnlockFlag`, `readUnlocked`, `recordUnlock`,
`isWorkshopPath`, `workshopNavLink`, and the types `UnlockStorage` and `WorkshopNavLink`.

**The pull/push rule, as a contract** (the Behavior rows pin every case). The state is one array:
the ids of the pulled spines, oldest pull first. A click toggles exactly one id: present → removed,
absent → appended. The unlock test is run on the new array after **every** toggle, pull or push, and
is exact equality with `UNLOCK_SEQUENCE`, in order, with nothing extra pulled. So a wrong book blocks
the unlock until it is pushed back, and pushing a wrong book back can itself be the click that
unlocks (row 33). There is no timeout, no reset, no re-arm, and no memory beyond the array.

### `src/pages/reading.astro` — the permitted edits

**Frontmatter.** One import line after the `reading-books` import, and one assertion after the
existing `assertUniqueBookIds` call. Everything else byte-identical:

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

**Body.** The shelf markup is byte-identical to `specs/reading.spec.md` as shipped by #16 —
`ul.shelf__list[role="list"]`, spines with `id` and `data-book-id`, no `aria-hidden`, no
`tabindex`, no visually-hidden duplicate, and **no `data-pulled` in the built HTML**. The only
addition is one `<script>` as the last child of `<BaseLayout>`, after the `shelves.map(…)`
expression:

```astro
  <script>
    /* wiring contract below */
  </script>
</BaseLayout>
```

**Scoped `<style>`.** Exactly the block in `specs/reading.spec.md`, which carries this feature's two
changes relative to #16 and nothing else:
1. A new rule, with the comment shown in `specs/reading.spec.md`, placed immediately after the
   `.shelf__book:hover` rule and before the `@media (prefers-reduced-motion: reduce)` block:
   ```css
     .shelf__book[data-pulled],
     .shelf__book[data-pulled]:hover {
       transform: translateY(calc(-1 * var(--space-sm)));
       box-shadow: var(--shadow-md);
     }
   ```
2. Inside the reduced-motion block, the selector `.shelf__book:hover` becomes
   `.shelf__book:hover:not([data-pulled])` (with the comment shown in `specs/reading.spec.md`); its
   declaration, `transform: none;`, is unchanged.

The pulled raise is `--space-sm` (16px), twice the hover lift of `--space-2xs` (8px), so a pulled
spine is distinguishable from a hovered one (Open question 6). Resulting states:

| spine state | no motion preference | `prefers-reduced-motion: reduce` |
|---|---|---|
| at rest | `transform: none`, `--shadow-sm` | same |
| hovered, not pulled | `translateY(-8px)`, `--shadow-md`, 0.2s transition | `transform: none`, `--shadow-md`, no transition |
| pulled, not hovered | `translateY(-16px)`, `--shadow-md`, 0.2s transition | `translateY(-16px)`, `--shadow-md`, no transition |
| pulled and hovered | identical to pulled, not hovered — hovering a pulled spine changes nothing | same |

**Wiring contract — the `reading.astro` script.** A plain `<script>` (no attributes: not
`is:inline`, no `define:vars`, no `type`), so Astro processes and bundles it. It:
1. Imports exactly `WORKSHOP_HREF`, `isPointerClick`, `isUnlockOrder`, `openStorage`, `recordUnlock`,
   `togglePull` from `'../lib/workshop-unlock'`, and nothing else from anywhere.
2. Holds one page-level pull order, starting as the empty array, shared by both shelves. It is never
   persisted anywhere and never read back from the DOM.
3. Attaches exactly one `click` listener, on `document`, and no other listener anywhere (no
   `pageshow`, no key, pointer or mouse listener). It is not attached to the shelf lists, the spines,
   the sections or `main`, so no shelf element carries an event listener that a browser could expose
   to assistive technology as "clickable".
4. On a click: if `isPointerClick(event.detail)` is `false`, does nothing. Otherwise finds the
   nearest ancestor-or-self `li.shelf__book` of the event target that sits inside a
   `ul.shelf__list`. If there is none (any click anywhere else on the page, including the gaps
   between spines), does nothing. Otherwise, with `id` = that spine's `data-book-id` attribute value
   (`null` if absent):
   a. replaces the pull order with `togglePull(order, id)`;
   b. if `id` is now in the order, sets `data-pulled` on that spine with the value `""`; otherwise
      removes `data-pulled` from that spine (a no-op when it is absent);
   c. if `isUnlockOrder(order)` is `true`, calls `recordUnlock(openStorage(window))`, then
      `window.location.assign(WORKSHOP_HREF)` — **whether or not** the write succeeded, with no
      delay. The pull order and every `data-pulled` attribute are left exactly as they are.
5. Never calls `preventDefault` or `stopPropagation`; never reads storage; never mutates the DOM
   except the one `data-pulled` attribute on the clicked spine in step 4b — no other element, no
   class, no inline style, no other attribute, no `aria-*`; never focuses anything; never writes to
   the console; never sets a timer or requests an animation frame; never touches `history` other than
   through the `location.assign` in step 4c.

Consequence for the back/forward cache: because nothing is reset before navigating and no
`pageshow` listener exists on this page, a `/reading/` document restored from the back/forward cache
comes back exactly as it was left — after an unlock, with `a-clash-of-kings` and
`harry-potter-prisoner-of-azkaban` still raised and the in-memory order still `[K, P]` (row 85). A
page that is loaded fresh rather than restored starts with nothing pulled (row 75). See Open
question 7.

### `src/components/SiteNav.astro` — the permitted edit

Append one plain `<script>` after `</nav>`. The frontmatter and the `<nav>` markup stay
byte-identical, so the built HTML of every page still holds exactly `NAV_ITEMS.length` (eight) nav
items and no `/workshop/` link.

**Wiring contract — the `SiteNav.astro` script.** Plain `<script>`, same restrictions as above. It:
1. Imports exactly `openStorage`, `readUnlocked`, `workshopNavLink` from
   `'../lib/workshop-unlock'`, and nothing else.
2. When it first runs, and again on every `window` `pageshow` event whose `persisted` is `true`
   (a back/forward-cache restore), performs the reveal below. That one `pageshow` listener is the
   only listener it adds.
3. **The reveal:** if `readUnlocked(openStorage(window))` is `false`, do nothing. If `true`, and the
   `ul.site-nav__list` inside `nav.site-nav` does not already contain an `a[href="/workshop/"]`,
   append to that list, as its last child, one `<li class="site-nav__item">` holding one `<a>` whose
   `class` is `workshopNavLink(window.location.pathname).className`, whose `href` is its `href`,
   whose text is its `label`, and which carries `aria-current="page"` only when its `ariaCurrent` is
   `'page'` (the attribute is absent otherwise, never `"null"`). The text is set as text, not parsed
   as HTML. The created elements carry no other attribute.
4. Never removes a nav item, never alters an existing one, never touches the shelf, never writes
   storage, never logs.

The runtime item therefore sits **after Contact** (see Open question 1). `SiteNav`'s build-time
active-link logic is untouched: `/workshop/` matches no `NAV_ITEMS` href, so on `/workshop/` the
runtime item is the only active link and the "zero or one active" invariant holds. The nav item is
an ordinary link, reachable by keyboard and screen reader like every other nav link, once unlocked.

### Test setup

Runner is the existing Vitest 5 via `npm test`, Node environment (no jsdom). Tests live in
`tests/workshop-unlock-*.test.ts`. A test file imports exactly this and nothing else from the repo:

```ts
import {
  UNLOCK_SEQUENCE,
  UNLOCK_STORAGE_KEY,
  UNLOCK_STORAGE_VALUE,
  WORKSHOP_HREF,
  WORKSHOP_NAV_LABEL,
  assertUnlockSequence,
  isPointerClick,
  isUnlockOrder,
  isWorkshopPath,
  openStorage,
  parseUnlockFlag,
  readUnlocked,
  recordUnlock,
  togglePull,
  workshopNavLink,
  type UnlockStorage,
  type WorkshopNavLink,
} from '../src/lib/workshop-unlock';
import { READING_LIST } from '../src/lib/reading-books';
```

**Superseded tests.** Any existing test that imports or calls `pullBook` or names `PullResult`
(the pull-rule and invariant suites written for the earlier model) tests removed API and must be
deleted or rewritten against `togglePull`/`isUnlockOrder`; left in place it fails `npm test` and
`npm run check`. Tests for the constants, `assertUnlockSequence`, storage, `isPointerClick` and the
nav link (rows 1–5, 37–53) are unaffected.

`src/lib/reading-books.ts` is importable (its only import is type-only). Suggested fixtures:

```ts
const K = 'a-clash-of-kings';
const P = 'harry-potter-prisoner-of-azkaban';
const C = 'harry-potter-chamber-of-secrets';

/** Clicks `ids` in order on an empty shelf; returns the unlock test after each click and the final order. */
const run = (ids: readonly unknown[], sequence?: readonly string[]) => {
  let pulled: string[] = [];
  const unlocked = ids.map((id) => {
    pulled = togglePull(pulled, id);
    return isUnlockOrder(pulled, sequence);
  });
  return { unlocked, pulled };
};

/** Map-backed UnlockStorage that records every call. */
const fakeStorage = (seed: Record<string, string> = {}) => {
  const data = new Map(Object.entries(seed));
  const calls: Array<[method: 'getItem' | 'setItem', ...args: string[]]> = [];
  const storage: UnlockStorage = {
    getItem: (key) => (calls.push(['getItem', key]), data.get(key) ?? null),
    setItem: (key, value) => void (calls.push(['setItem', key, value]), data.set(key, value)),
  };
  return { storage, data, calls };
};
```

Passing `sequence` as `undefined` selects the default, per ordinary JavaScript default-parameter
semantics. Do **not** import any `.astro` file, `astro:*`, `src/consts.ts`, `dist/**`, or the CSS,
and do not install or configure a DOM environment.

## Behavior

`K` = `'a-clash-of-kings'`, `P` = `'harry-potter-prisoner-of-azkaban'`,
`C` = `'harry-potter-chamber-of-secrets'`. Rows 1–53 are Vitest cases against
`src/lib/workshop-unlock.ts`. Rows 54–96 are review criteria verified by `npm run build`,
`npm run check`, the built HTML, and a real browser — per `CLAUDE.md` adjudication is off. A
"fresh profile" means `localStorage` for the origin is empty before the page loads. "Click" in a
review row means a real pointer click unless the row says otherwise. In review rows, "pulled" means
the spine carries the attribute `data-pulled=""`; "raised" means its computed `transform` is
`matrix(1, 0, 0, 1, 0, -16)` once any transition has finished; "at rest" means its computed
`transform` is `none`. Rows that read computed style move the pointer off the shelf first unless
they say otherwise.

| # | input | expected output | notes |
|---|---|---|---|
| 1 | `UNLOCK_SEQUENCE` | `['a-clash-of-kings', 'harry-potter-prisoner-of-azkaban']` | deep-equal; length 2 |
| 2 | `UNLOCK_STORAGE_KEY`, `UNLOCK_STORAGE_VALUE` | `'workshop-unlocked'`, `'true'` | |
| 3 | `WORKSHOP_HREF`, `WORKSHOP_NAV_LABEL` | `'/workshop/'`, `'Workshop'` | |
| 4 | `UNLOCK_SEQUENCE.map((id) => READING_LIST.findIndex((b) => b.id === id))` | `[11, 5]` | both key books exist; the second key stands earlier on the shelf than the first |
| 5 | `UNLOCK_SEQUENCE.map((id) => READING_LIST.find((b) => b.id === id)?.shelf)` | `['fiction', 'fiction']` | |
| 6 | `togglePull([], K)` | `[K]` | a pull appends |
| 7 | `togglePull([K], P)` | `[K, P]` | |
| 8 | `togglePull([K], K)` | `[]` | a pulled book is pushed back |
| 9 | `togglePull([K, P], K)` / `togglePull([K, C, P], C)` | `[P]` / `[K, P]` | a push removes from anywhere; the rest keep their order |
| 10 | `togglePull([P, C], K)` / `togglePull([C], P)` | `[P, C, K]` / `[C, P]` | a pull always goes to the end, after wrong books |
| 11 | `togglePull([P], K)` | `[P, K]` | order is pull order, not shelf or sequence order |
| 12 | `togglePull([K], C)` / `togglePull([K], 'the-last-olympian')` / `togglePull([K], 'mythical-man-month')` | `[K, C]` / `[K, 'the-last-olympian']` / `[K, 'mythical-man-month']` | a wrong book stays pulled; nothing resets |
| 13 | `togglePull([K], 'A-Clash-Of-Kings')` / `([K], ' a-clash-of-kings')` / `([K], 'a-clash-of-kings ')` / `([K], 'book-a-clash-of-kings')` | `[K, 'A-Clash-Of-Kings']` / `[K, ' a-clash-of-kings']` / `[K, 'a-clash-of-kings ']` / `[K, 'book-a-clash-of-kings']` | no normalisation: a near-miss is a different id, appended, never a push of `K`; the `book-` DOM id is not a book id |
| 14 | `togglePull([K], undefined)` / `([K], null)` / `([K], 42)` / `([K], '')` / `([K], [K])` / `([K], {})` | `[K]` × 6 | no readable id: the order is unchanged |
| 15 | `togglePull([], null)` / `togglePull([], '')` | `[]` × 2 | |
| 16 | `const xs = [K]; const a = togglePull(xs, null); const b = togglePull(xs, P); const c = togglePull(xs, K)` | `a !== xs`, `b !== xs`, `c !== xs`; `a` deep-equals `[K]`, `b` `[K, P]`, `c` `[]`; `xs` still deep-equals `[K]` | always a new array; never mutates |
| 17 | `togglePull([K, C, K], K)` / `togglePull([K, C, K], P)` | `[C]` / `[K, C, K, P]` | an input with duplicates (unreachable from `togglePull`) loses every occurrence on a push |
| 18 | `togglePull([], 'not-a-spine')` / `togglePull([], ' ')` | `['not-a-spine']` / `[' ']` | any non-empty string is an id to the function; the page only ever passes real ids |
| 19 | `togglePull(Object.freeze([K]), P)` / `togglePull(Object.freeze([K]), K)` | `[K, P]` / `[]`, nothing thrown | readonly input is fine |
| 20 | `isUnlockOrder([K, P])` | `true` | the combination |
| 21 | `isUnlockOrder([P, K])` | `false` | order matters |
| 22 | `isUnlockOrder([])` / `([K])` / `([P])` | `false` × 3 | |
| 23 | `isUnlockOrder([K, P, C])` / `([C, K, P])` / `([K, C, P])` / `([K, K, P])` | `false` × 4 | nothing extra may be pulled, before, between or after |
| 24 | `isUnlockOrder(['A-Clash-Of-Kings', P])` / `([K, 'harry-potter-prisoner-of-azkaban '])` / `(['book-a-clash-of-kings', 'book-harry-potter-prisoner-of-azkaban'])` | `false` × 3 | exact strict equality |
| 25 | `isUnlockOrder([K, P], UNLOCK_SEQUENCE)` / `isUnlockOrder([K, P], undefined)` / `isUnlockOrder([P, K], undefined)` | `true` / `true` / `false` | default parameter |
| 26 | `isUnlockOrder(['a', 'b', 'c'], ['a', 'b', 'c'])` / `(['a', 'b'], ['a', 'b', 'c'])` / `(['a', 'c', 'b'], ['a', 'b', 'c'])`; `run(['a', 'b', 'c'], ['a', 'b', 'c'])` | `true` / `false` / `false`; `{ unlocked: [false, false, true], pulled: ['a', 'b', 'c'] }` | three-key sequence |
| 27 | `isUnlockOrder(['a'], ['a'])` / `([], ['a'])` / `(['a', 'a'], ['a'])` | `true` / `false` / `false` | one-key sequence |
| 28 | `isUnlockOrder([], [])` / `(['a'], [])` | `false` × 2 | an empty sequence never unlocks |
| 29 | `const o = [K, P], s = [K, P]; isUnlockOrder(o, s)` | `true`; `o` and `s` still deep-equal `[K, P]`; `UNLOCK_SEQUENCE` still deep-equals row 1 after rows 6–36 | never mutates |
| 30 | `run([K, P])` | `{ unlocked: [false, true], pulled: [K, P] }` | the combination |
| 31 | `run([P, K])` | `{ unlocked: [false, false], pulled: [P, K] }` | reversed: both stay pulled |
| 32 | `run([K, C, P])` | `{ unlocked: [false, false, false], pulled: [K, C, P] }` | a wrong book in the middle blocks the unlock and stays |
| 33 | `run([K, C, P, C])` | `{ unlocked: [false, false, false, true], pulled: [K, P] }` | pushing the wrong book back is the click that unlocks |
| 34 | `run([P, K, P, P])` | `{ unlocked: [false, false, false, true], pulled: [K, P] }` | Seth's example: pull Azkaban, pull Clash, push Azkaban, pull it again |
| 35 | `run([K, K, P])` / `run([K, K, K, P])` | `{ unlocked: [false, false, false], pulled: [P] }` / `{ unlocked: [false, false, false, true], pulled: [K, P] }` | a double-click is a pull then a push |
| 36 | `run([K, P, P])` / `run([K, null, '', P])` / `run([])` | `{ unlocked: [false, true, false], pulled: [K] }` / `{ unlocked: [false, false, false, true], pulled: [K, P] }` / `{ unlocked: [], pulled: [] }` | a click after completion is an ordinary toggle; unreadable ids change nothing |
| 37 | `assertUnlockSequence(UNLOCK_SEQUENCE, READING_LIST.map((b) => b.id))` | returns `undefined` | the shipped keys are valid |
| 38 | `assertUnlockSequence(['a'], ['a'])` / `(['b', 'a'], ['a', 'b', 'c'])` / `(['a'], ['a', 'a'])` | returns `undefined` × 3 | order of `knownIds` irrelevant; duplicates in `knownIds` are fine |
| 39 | `const s = ['b', 'a'], k = ['c', 'a', 'b']; assertUnlockSequence(s, k)` | `s` and `k` unchanged, same order | never mutates |
| 40 | `parseUnlockFlag('true')` | `true` | |
| 41 | `parseUnlockFlag('TRUE')` / `('True')` / `(' true')` / `('true ')` / `('1')` / `('yes')` / `('false')` / `('')` / `('"true"')` | `false` × 9 | exact string only |
| 42 | `parseUnlockFlag(null)` / `(undefined)` / `(true)` / `(1)` / `({})` | `false` × 5 | a missing key reads as `null` |
| 43 | `const { storage } = fakeStorage(); openStorage({ localStorage: storage })` | returns `storage` itself (`===`) | |
| 44 | `openStorage(null)` / `(undefined)` / `(42)` / `('x')` / `({})` | `null` × 5, nothing thrown | |
| 45 | `openStorage({ get localStorage() { throw new Error('SecurityError'); } })` | `null`, nothing thrown | blocked site data throws on property access |
| 46 | `openStorage({ localStorage: null })` / `({ localStorage: {} })` / `({ localStorage: { getItem: () => null } })` / `({ localStorage: { getItem: 1, setItem: 2 } })` | `null` × 4 | both methods must be callable |
| 47 | `readUnlocked(null)`; `const f = fakeStorage(); readUnlocked(f.storage)` | `false`; `false`, and `f.calls` deep-equals `[['getItem', 'workshop-unlocked']]` | one read, the one key |
| 48 | `readUnlocked(fakeStorage({ 'workshop-unlocked': 'true' }).storage)` / seed value `'false'` / `'1'` / `'TRUE'` / seed `{ workshop: 'true' }` | `true` / `false` / `false` / `false` / `false` | parse is exact; other keys ignored |
| 49 | `readUnlocked({ getItem() { throw new Error('x'); }, setItem() {} })` | `false`, nothing thrown | |
| 50 | `recordUnlock(null)`; `const f = fakeStorage({ other: 'x' }); recordUnlock(f.storage)` | `false`; `true`, `f.calls` deep-equals `[['setItem', 'workshop-unlocked', 'true']]`, `f.data.get('other') === 'x'` | one write, other keys untouched, no read-back |
| 51 | `recordUnlock({ getItem: () => null, setItem() { throw new Error('QuotaExceededError'); } })` | `false`, nothing thrown | |
| 52 | `isWorkshopPath('/workshop/')` / `('/workshop')` / `('/workshop/clock/')` / `('/workshop/index.html')`; `isWorkshopPath('/')` / `('/reading/')` / `('/workshop-annex/')` / `('/workshops/')` / `('/Workshop/')` / `('workshop/')` / `('')` / `('/blog/workshop/')` / `(null)` / `(undefined)` / `(42)`; `workshopNavLink('/workshop/')`; `workshopNavLink('/reading/')`; `workshopNavLink('/workshop')`; `workshopNavLink(undefined)` | `true` × 4; `false` × 11; `{ href: '/workshop/', label: 'Workshop', className: 'site-nav__link is-active', ariaCurrent: 'page' }`; `{ href: '/workshop/', label: 'Workshop', className: 'site-nav__link', ariaCurrent: null }`; same as the `/workshop/` object; same as the `/reading/` object | segment-bounded, case-sensitive; mirrors `SiteNav`'s `matchesPath` for a section href. Split across test cases freely |
| 53 | `isPointerClick(1)` / `(2)` / `(3)`; `isPointerClick(0)` / `(-1)` / `(1.5)` / `(NaN)` / `(Infinity)` / `('1')` / `(null)` / `(undefined)` / `(true)` | `true` × 3; `false` × 9 | the second click of a double-click has detail 2 and counts; keyboard/AT/`element.click()` detail 0 does not |
| 54 | `npm run build` | exit 0 | `assertUnlockSequence` passes against the shipped shelf |
| 55 | `npm run check` | exit 0, zero errors and zero warnings | the two scripts type-check under strict |
| 56 | `npm test` | exit 0; every pre-existing suite still passes, and no test file references `pullBook` or `PullResult` | `reading.ts` and `reading-books.ts` are untouched |
| 57 | source grep `<script` over `src/**/*.astro` | matches exactly two files, `src/components/SiteNav.astro` and `src/pages/reading.astro`, once each, and each tag is exactly `<script>` with no attribute | JS confined to nav and shelf |
| 58 | source of `src/lib/workshop-unlock.ts`, comments excluded | no `import` or `require`; no free reference to the globals `window`, `document`, `location`, `globalThis`, `self`, `navigator`, `console` or `localStorage` — the word `localStorage` may appear only as a property read on `openStorage`'s `host` parameter; no `pullBook`, `PullResult` or `data-pulled` | zero imports, no globals, no dead API. Review-only |
| 59 | every `dist/**/*.html` | every `<script>` element has `type="module"`; no element has an `on[a-z]+=` attribute; any emitted `.js` file is under `dist/_astro/` | processed scripts only; inline-vs-external is not contracted (Open question 3) |
| 60 | parsed static DOM of every `dist/**/*.html` | `nav.site-nav li` count is `8`; `document.querySelector('a[href="/workshop/"]') === null` | no crawler-visible link, on any page including `/workshop/` |
| 61 | `dist/reading/index.html` | `specs/reading.spec.md` rows 54–62 hold unchanged: two `ul.shelf__list[role="list"]` with 3 and 15 `li.shelf__book`, each spine exactly `span.shelf__title` then `span.shelf__author`; the page contains no `aria-hidden` attribute and no `.visually-hidden` element inside `main` | the shelf stays a real list |
| 62 | every element inside either `ul.shelf__list` | none is `a`, `button`, `input`, or `summary`; none has `tabindex`, `href`, `role`, `title`, `contenteditable`, or any `aria-*` attribute | nothing focusable, nothing button-like |
| 63 | the `li#book-a-clash-of-kings` and `li#book-harry-potter-prisoner-of-azkaban` elements in `dist/reading/index.html` | each has exactly the same set of attribute names as every other `li.shelf__book`; each `class` is `shelf__book` plus one `shelf__book--<variant>` modifier, like all 18; neither is distinguished by any attribute value other than its own `id`, `data-book-id` and variant; no element in any `dist/**/*.html` carries `data-pulled` | markup gives the keys away nowhere, and nothing ships pulled |
| 64 | the scoped `<style>` block of `src/pages/reading.astro` | byte-identical to the block in `specs/reading.spec.md`; no selector contains `#book-`, `[data-book-id`, `:nth-child`, `:nth-of-type`, `a-clash-of-kings`, or `prisoner-of-azkaban`; every attribute selector in the block is `[data-pulled]` | no per-spine styling; one state rule for all spines |
| 65 | fresh profile, `/reading/`, click spine K then spine P | K is pulled and raised after the first click; the second click navigates to `/workshop/`; there `localStorage.getItem('workshop-unlocked') === 'true'` and `localStorage.length === 1`; pressing Back returns to `/reading/` | the unlock; `assign`, not `replace` |
| 66 | after row 65, on `/workshop/` | nav has 9 `li`; the 9th is `li.site-nav__item > a.site-nav__link.is-active[href="/workshop/"][aria-current="page"]` with text `Workshop`; it is the only nav link with `aria-current` or `is-active` | active on its own room |
| 67 | after row 65, load `/`, `/about/`, `/research/`, `/teaching/`, `/projects/`, one `/projects/<id>/`, `/blog/`, one `/blog/<slug>/`, `/reading/`, `/contact/` | each nav has 9 `li`, the 9th an `a` with `class="site-nav__link"`, `href="/workshop/"`, text `Workshop`, no `aria-current`; the page's static active link is unchanged; the Workshop link's computed `color` and `font-size` equal those of an inactive static nav link on the same page | every page, styled like its siblings |
| 68 | row 67's pages after a reload, and after closing and reopening the browser | still 9 items, exactly one `a[href="/workshop/"]` in the nav | survives reload and later visits |
| 69 | after row 65, clear site data for the origin (DevTools → Application → Clear site data, or `localStorage.clear()`), then reload any page | nav has 8 `li` and no `a[href="/workshop/"]` | re-locks |
| 70 | fresh profile, `/reading/`, click K, then C, then P; then click C | after the P click: no navigation; `localStorage.length === 0`; exactly K, C and P are pulled and raised; `nav` `outerHTML` is identical to before the clicks, and `main` `outerHTML` is identical once the three `data-pulled=""` attributes are removed; console empty. The final C click navigates to `/workshop/` | a wrong book stays pulled until pushed back; pushing it back unlocks |
| 71 | fresh profile, click P, then K; then click P; then click P again | after K: no navigation, storage empty, P and K both pulled and raised, console empty. After the third click: P not pulled and at rest, K still raised, no navigation. The fourth click navigates to `/workshop/` | reversed order, then Seth's example |
| 72 | fresh profile, click K, then C, then K; then click C; then click K, then P | after the third click: only C is pulled and raised, no navigation. After the fourth click: no spine is pulled or raised, no navigation, storage empty. The final P click navigates to `/workshop/` | pushing back the key and the wrong book leaves an empty shelf that unlocks normally |
| 73 | fresh profile, double-click K, then click P | no navigation; after the double-click K is not pulled and at rest; after the click P is the only pulled spine; storage empty | a double-click is a pull and a push (row 35) |
| 74 | fresh profile, click K; then click the `<h1>`, the intro paragraph, the `Fiction` heading, the footer, and the empty row gap inside a `ul.shelf__list` (not on a spine); then click P | K stays pulled and raised through every non-spine click, and no other spine becomes pulled; the P click navigates to `/workshop/` | non-spine clicks change nothing |
| 75 | fresh profile, click K, reload (a real reload, not a back/forward restore), click P | after the reload no spine is pulled or raised; after clicking P, P is the only pulled spine; no navigation, storage empty | the pull order lives in memory only; a fresh load starts with the shelf at rest |
| 76 | fresh profile, click K only | `location.href`, `history.length`, `document.title`, `localStorage.length` and `nav` `outerHTML` identical to before the click; the only DOM difference in `main` is `data-pulled=""` on `li#book-a-clash-of-kings`; console empty | a pull changes exactly one attribute |
| 77 | fresh profile, `/reading/`: for each of the 18 spines in turn, click it, move the pointer off the shelf, record; click it again, move off, record | every spine gives the identical result: after the first click that spine alone is pulled and raised, with `box-shadow` equal to the computed `box-shadow` of a hovered unpulled spine; after the second click it is not pulled and at rest; no navigation, storage or console change at either step; `event.defaultPrevented === false` (checked via a bubbling listener on `window` added in DevTools); computed `cursor` is `auto` on every spine throughout | behaviourally identical for all 18; no key book is special |
| 78 | fresh profile, `/reading/`: (a) Tab from page load to the end of the page, pressing Enter and Space at each stop; (b) in the DevTools console, `document.querySelector('#book-a-clash-of-kings').click(); document.querySelector('#book-harry-potter-prisoner-of-azkaban').click();`; (c) with NVDA browse mode (Enter) or VoiceOver (VO-Space), activate the K list item then the P list item | (a) focus visits the skip link, the brand and the nav links and never lands inside a `section.shelf`; (a), (b) and (c) each leave the page on `/reading/` with `localStorage.length === 0` and no element carrying `data-pulled` | detail-0 clicks are ignored; nothing is pulled |
| 79 | screen reader (VoiceOver or NVDA) reading `/reading/` top to bottom, once at rest and once after pointer-clicking K and C | both passes announce the same: `Reading`, the intro, `Technical`, a list of 3 items, `Fiction`, a list of 15 items, each item its title then its author; no spine is announced as a button, link, clickable, pressed, selected or checked | an ordinary list; `data-pulled` is invisible to AT. "Clickable" exposure is browser-dependent (Open question 4) |
| 80 | JavaScript disabled, `/reading/` | the shelf renders exactly as with JavaScript enabled before any click; clicking K then P does nothing: no spine becomes pulled or raised (the hover lift still works); `specs/reading.spec.md` rows 54–69 hold | inert, not broken |
| 81 | JavaScript disabled with `workshop-unlocked` already `'true'` in storage, any page | nav has 8 `li`, no Workshop link | the item is runtime-only |
| 82 | site data blocked for the origin (Chrome "Sites can't save data on your device" for this site, or Firefox cookies blocked for it), `/reading/`, click K then P | navigates to `/workshop/`; no uncaught exception in the console; nav there has 8 `li` | unlock degrades to plain navigation |
| 83 | storage manually set to `workshop-unlocked` = `'false'`, `'1'`, `'TRUE'`, or `' true'`; reload any page | nav has 8 `li` | only the exact value unlocks |
| 84 | already unlocked, `/reading/`, click K then P | navigates to `/workshop/` again; storage still holds exactly one key, `workshop-unlocked` = `'true'`; nav there has exactly one Workshop item | idempotent |
| 85 | after row 65, press Back to `/reading/`, confirmed restored from the back/forward cache (DevTools → Application → Back/forward cache reports a restore, or a `pageshow` listener added in DevTools sees `persisted === true`); then click C; then click C again | on restore: the nav shows the Workshop item as its 9th `li` without a reload, exactly once; K and P are still pulled and raised and no other spine is. After the first C click: C is pulled and raised, no navigation. The second C click navigates to `/workshop/` | the restored shelf is exactly as left, and its visible state is still the lock. If the browser did not use the cache, row 75 applies instead (Open question 7) |
| 86 | fresh profile, type `/workshop/` into the address bar | page renders; nav has 8 `li`; `localStorage.length === 0` | visiting the room does not unlock it |
| 87 | fresh profile, `/reading/` at 400px and 1280px, light and dark, before any click | visually identical to the pre-feature page; `specs/reading.spec.md` row 69 holds | no visual change at rest |
| 88 | touch emulation (or a phone), fresh profile, tap K then tap P | K is pulled after the first tap; the second tap navigates to `/workshop/` | a tap is a pointer click (detail 1) |
| 89 | fresh profile, no reduced-motion preference, click K, move the pointer off the shelf | K computes `transform: matrix(1, 0, 0, 1, 0, -16)`, `transition-duration: 0.2s, 0.2s`, and `box-shadow` equal to a hovered unpulled spine's; every other spine computes `transform: none` and has the same `getBoundingClientRect()` as before the click | the raise is `--space-sm`, animated, and moves no neighbour |
| 90 | after row 89, hover K; then hover K's unpulled neighbour | while hovering K: K stays at `matrix(1, 0, 0, 1, 0, -16)` with the same `box-shadow` — no visible change; while hovering the neighbour: it computes `matrix(1, 0, 0, 1, 0, -8)` and K stays at `-16` | hovering a pulled book changes nothing; hover and pulled differ |
| 91 | fresh profile, rest the pointer on spine C without moving it, then click C, then click C again, then move the pointer off | before the first click C is at `-8` (hover); after the first click it moves to `-16` while still hovered; after the second click it returns to `-8` while still hovered; after moving off it is at rest | a pull and a push are visible under the pointer |
| 92 | `prefers-reduced-motion: reduce` (DevTools rendering emulation), fresh profile: hover C; click C and move off; hover C again | hovered, unpulled: `transform: none`, `box-shadow` equal to row 89's; pulled, not hovered: `transform: matrix(1, 0, 0, 1, 0, -16)` with `transition-duration: 0s`, reached with no intermediate frame; pulled and hovered: still `matrix(1, 0, 0, 1, 0, -16)` | a pulled book reads as pulled without animation |
| 93 | viewport 400px and 1280px, light and dark: pull the first technical spine, the first spine of each wrapped fiction row, and the last fiction spine; move the pointer off | each pulled spine is fully visible, overlaps no heading and no spine of the row above, and its thick bottom border stays visible; `document.documentElement.scrollWidth <= viewport width` | the 16px raise fits inside the 32px row gap and the list's 24px top margin |
| 94 | fresh profile, click all 18 spines once each, in shelf order; then click every spine except K and P, in shelf order; then click P; then click P again | after the first 18 clicks: all 18 pulled and raised, no navigation. After the next 16: only K and P are pulled, no navigation at any of those clicks (P was pulled before K). After the first P click: only K is pulled, no navigation. The last click navigates to `/workshop/` | a crowded shelf follows the same rule |
| 95 | touch emulation (or a phone), fresh profile: tap C; tap C again; tap an empty area of the page | after the first tap C is pulled and at `-16`; after the second tap C is not pulled and at `-8` or at rest (a browser's sticky hover may hold the lift); after the empty-area tap C is at rest | a push by tap is visible even with sticky hover |
| 96 | source grep `data-pulled` over `src/` | matches only `src/pages/reading.astro`: the scoped `<style>` (the pulled rule's two selectors and the `:not([data-pulled])` selector) and the `<script>` | the marker is set in one place and read in one place |

## Errors

| condition | exception type | message contract |
|---|---|---|
| `assertUnlockSequence([], ['a'])` / `assertUnlockSequence([], [])` | `TypeError` | exactly `assertUnlockSequence: the sequence is empty` — checked before anything else |
| `assertUnlockSequence(['a', 'nope'], ['a', 'b'])` | `TypeError` | exactly `assertUnlockSequence: unknown book id "nope"` |
| `assertUnlockSequence(['a-storm-of-swords', P], READING_LIST.map((b) => b.id))` | `TypeError` | exactly `assertUnlockSequence: unknown book id "a-storm-of-swords"` |
| `assertUnlockSequence(['A'], ['a'])` | `TypeError` | exactly `assertUnlockSequence: unknown book id "A"` — exact equality, no casing |
| `assertUnlockSequence(['a', 'a'], ['a'])` | `TypeError` | exactly `assertUnlockSequence: duplicate book id "a"` |
| `assertUnlockSequence(['zz', 'zz'], [])` | `TypeError` | exactly `assertUnlockSequence: unknown book id "zz"` — elements are checked left to right, and for each element "unknown" is checked before "duplicate" |
| `assertUnlockSequence(['a', 'x', 'a'], ['a'])` | `TypeError` | exactly `assertUnlockSequence: unknown book id "x"` — the first failing element wins |
| `assertUnlockSequence(['a', 'b', 'a', 'x'], ['a', 'b'])` | `TypeError` | exactly `assertUnlockSequence: duplicate book id "a"` — index 2 fails before index 3 |
| `assertUnlockSequence([null as unknown as string], ['a'])` | `TypeError` | exactly `assertUnlockSequence: unknown book id "null"` — interpolated via `String(id)` |
| `UNLOCK_SEQUENCE` names an id absent from `READING_LIST` (a key book renamed or removed) | `npm run build` exits non-zero with the `assertUnlockSequence` `TypeError`, raised in the `reading.astro` frontmatter | the combination can never ship unreachable. Review-only |
| `togglePull`, `isUnlockOrder`, `isPointerClick`, `parseUnlockFlag`, `openStorage`, `readUnlocked`, `recordUnlock`, `isWorkshopPath`, `workshopNavLink` given any argument covered by Behavior rows 6–53 | **no error** | storage exceptions become `false`/`null`; every other input has a defined result. These functions never throw for those inputs |
| storage blocked or full at runtime | **no error** surfaces | unlock still navigates (row 82); the nav reveal simply does nothing |
| a spine with no `data-book-id` at runtime | **no error** | `togglePull` returns the order unchanged (row 14), so no `data-pulled` is set and nothing unlocks. Unreachable with the shipped markup |

## Boundaries

| boundary | answer |
|---|---|
| empty pull order | The start state. A click appends (row 6); `isUnlockOrder([])` is `false` (row 22). Test. |
| empty sequence | `isUnlockOrder` is `false` for every order (row 28); `assertUnlockSequence` throws (Errors). It cannot ship. Test both. |
| one-key sequence | `isUnlockOrder(['a'], ['a'])` is `true` (row 27). Legal to the function; not shipped. Test. |
| sequence with repeated ids | Rejected by `assertUnlockSequence` (Errors). `isUnlockOrder` still compares element-wise (Invariant 3), but `togglePull` can never produce a matching order. Undefined beyond Invariant 3, do not test. |
| order longer or shorter than the sequence | `false` (rows 22–23). Test. |
| unordered | Order is pull order, and it matters: `[P, K]` is not the combination (rows 11, 21, 31). Test. |
| duplicate ids in the input order | Unreachable from `togglePull`; a push removes every occurrence, a pull appends (row 17). Test row 17. |
| the same spine clicked twice | A pull then a push (rows 8, 35). Test. |
| max — number of clicks | Unbounded; state size is bounded by the number of distinct ids pulled. `run` over 1000 clicks on `C` followed by `[K, P]` gives a last `unlocked` of `true` and `pulled` of `[K, P]`. Test if convenient. |
| max — order length | Uncapped. Pulling all 18 shipped ids in `READING_LIST` order yields those 18 ids in that order, and `isUnlockOrder` is `false`. Test if convenient; review row 94. |
| empty string / `null` / `undefined` / non-string `bookId` | No-op: a new array equal to the input (rows 14–15). Test. |
| near-miss, padded, whitespace-only or unknown string ids | Treated as distinct ids and appended; never normalised, never matched to a key (rows 13, 18, 24). Test. |
| frozen / readonly input order | Works; never mutated (rows 16, 19). Test. |
| `null` / `undefined` / non-array `pulled`; non-string elements in `pulled` | Typed `readonly string[]`. Undefined, do not test. |
| `undefined` / non-array `sequence` | `undefined` selects the default (row 25). Any other non-array: undefined, do not test. |
| `null` / `undefined` / non-array `sequence` or `knownIds` to `assertUnlockSequence` | Typed. Undefined, do not test. |
| duplicate ids in `knownIds` | Legal (row 38). Test. |
| unordered `knownIds` | Order irrelevant (row 38). Test. |
| click `detail`: 0, negative, fractional, non-number | Not a pointer click (row 53); no toggle, no marker (row 78). Test the function; review the page. |
| click `detail` above 2 (triple-click) | A pointer click; each `click` event is one toggle, so a triple-click on an unpulled spine leaves it pulled. Test `isPointerClick(3)`; the page behaviour beyond row 73 is undefined, do not test. |
| both key books on the same shelf, in reverse shelf order | They are (rows 4–5); the order is page-level and shared across shelves; shelf position is irrelevant (row 94). Review. |
| clicks outside any spine, including gaps inside `ul.shelf__list` | Change nothing (row 74). Review. |
| double-click | A pull then a push (row 73). Browsers may also select a word of the spine's text; not suppressed (Open question 8). Review the toggle only. |
| a drag that starts on one spine and ends elsewhere | Browsers dispatch `click` on the common ancestor or not at all, so normally no toggle. Undefined, do not test. |
| middle-click, right-click, modifier-clicks | Right-click and middle-click emit no `click` event, so no toggle. Ctrl/Shift/Meta-click on a spine emits a pointer `click` and toggles like any click. Undefined beyond that, do not test. |
| keyboard, screen-reader or `element.click()` activation of a spine | `click` with detail 0 — ignored; no marker, no state change (row 78). Review. |
| hover on a pulled spine | No visible change (row 90). Review. |
| hover on an unpulled spine, then click | Moves from the hover lift to the pulled raise under the pointer, and back on a second click (row 91). Review. |
| touch sticky hover | A pushed-back spine may sit at the 8px hover lift until the next tap elsewhere; it never sits at the 16px pulled raise (row 95). Review. |
| `prefers-reduced-motion: reduce` | No transitions; the hover lift is dropped and its shadow kept; a pulled spine is still raised 16px, placed without animation (row 92). Review. |
| the pulled raise at the top of a shelf or of a wrapped row | Fits within the 32px row gap and the list's 24px top margin; no overlap, no horizontal scroll (row 93). Review at 400px and 1280px. |
| a click after the unlock but before navigation finishes | An ordinary toggle on a page that is being left. Undefined, do not test. |
| back/forward-cache restore of `/reading/` after unlocking | Restored exactly as left: K and P pulled and raised, order `[K, P]`; further clicks toggle as usual and re-unlock by the same rule (row 85). Review. |
| back/forward-cache restore of `/reading/` mid-attempt | Restored exactly as left, by the same mechanism. Review if convenient; not separately contracted. |
| a fresh load (reload, typed URL, new tab) of `/reading/` | Nothing pulled, order empty (row 75). Review. |
| back/forward-cache restore of any page after unlocking | The nav re-reveals (row 85). Review. |
| site data cleared while a page is open | The already-appended item stays until the next load; the next load shows 8 items (row 69). Only the reload is contracted. |
| unlock in one tab while another tab is open | The other tab shows the item on its next load or back/forward restore. No `storage`-event sync. Pulled state is per document and never shared. Undefined beyond that, do not test. |
| already unlocked | Completing again re-records and navigates (row 84); the nav never shows two items (rows 68, 84). Review. |
| JavaScript disabled | Shelf renders identically, is inert, nothing looks pulled; nav never shows the item (rows 80–81). Review. |
| storage blocked | Unlock navigates, nothing persists (row 82). Review. |
| voice control ("click Clash of Kings") | Voice-control software typically dispatches a synthesised click; whether its `detail` is 0 or 1 varies by product. Undefined, do not test. |
| touch | A tap is a pointer click (rows 88, 95). Review. |
| viewport | Unchanged from `specs/reading.spec.md`: 400px floor, no horizontal scroll (rows 87, 93). Review. |
| forced-colors, print, RTL | Undefined, do not test. |

## Invariants

1. For every `pulled` array of strings and every `bookId`, `togglePull(pulled, bookId)` returns a new
   array (`!== pulled`), leaves `pulled` unchanged, and never throws. If `bookId` is not a non-empty
   string the result deep-equals `pulled`; else if `pulled.includes(bookId)` the result deep-equals
   `pulled.filter((x) => x !== bookId)`; otherwise it deep-equals `[...pulled, bookId]`.
2. `togglePull` preserves distinctness: if `pulled` has no duplicates, neither does the result. For a
   non-empty string `id` absent from `pulled`, `togglePull(togglePull(pulled, id), id)` deep-equals
   `pulled`.
3. `isUnlockOrder(o, s) === (s.length > 0 && o.length === s.length && o.every((x, i) => x === s[i]))`
   for every `o` and `s`. It never mutates and never throws. In particular `isUnlockOrder(o)` is true
   only when `o` deep-equals `UNLOCK_SEQUENCE`.
4. **The unlock is reachable from every state.** For every duplicate-free order `o` of strings and
   every sequence `s` of distinct strings, clicking each id of `o` once (in any order) and then each
   id of `s` in order ends with `isUnlockOrder` `true`.
5. `isPointerClick(d) === (Number.isInteger(d) && d >= 1)` for every `d`, with non-numbers false.
6. Every function in `src/lib/workshop-unlock.ts` is pure over its arguments: same input, same
   output, no module-level state, no mutation of any argument, no access to any global. The only
   side effects are the `getItem`/`setItem` calls `readUnlocked`/`recordUnlock` make on the storage
   they are given — one call each, always to `UNLOCK_STORAGE_KEY`.
7. `parseUnlockFlag(x) === (x === UNLOCK_STORAGE_VALUE)` for every `x`. On a working storage,
   `recordUnlock(s) === true` implies `readUnlocked(s) === true` afterwards.
8. `workshopNavLink(p).ariaCurrent === 'page'` ⇔ `workshopNavLink(p).className === 'site-nav__link is-active'`
   ⇔ `isWorkshopPath(p)`; `href` and `label` are always `WORKSHOP_HREF` and `WORKSHOP_NAV_LABEL`.
9. Every shipped `UNLOCK_SEQUENCE` id exists in `READING_LIST` and none repeats — enforced at build
   time, so a retitle is safe (ids are permanent, `specs/reading.spec.md` Invariant 6) and a removed
   key book fails the build.
10. The pull order is never persisted: the only thing ever written to any storage is
    `UNLOCK_STORAGE_KEY` = `UNLOCK_STORAGE_VALUE`, and only on a click after which `isUnlockOrder` is
    `true`.
11. **What the user sees is the whole state.** On `/reading/`, at every moment, a spine carries
    `data-pulled` if and only if its `data-book-id` is in the page's pull order, and a spine is raised
    by the pulled rule if and only if it carries `data-pulled`. Nothing changes the order or a marker
    except a pointer click on a spine, and that click changes only the clicked spine's id in the
    order and that spine's marker. No click resets another spine, and there is no state beyond which
    spines are raised and the order in which the user raised them.
12. **Every spine is the same.** For every order `o` and two ids `a`, `b` both absent from `o` (or
    both present in it), a click on `a` and a click on `b` make the same kind of change — that
    spine's marker toggles and its raise follows — and differ only in which spine, except that a
    click after which the order equals `UNLOCK_SEQUENCE` also records the flag and navigates. The two
    key spines are indistinguishable from the other sixteen in markup and CSS.
13. **The unlock is pointer-click only, and the shelf stays an ordinary list.** Only `click` events
    with `detail >= 1` on a spine can toggle it. Spines have no `tabindex`, no `role`, no `aria-*`
    (including `aria-pressed`), no key handler, no `cursor` change, and no event listener of their
    own; the shelf keeps `role="list"`, no `aria-hidden`, and no visually-hidden duplicate.
    `data-pulled` changes no role, name or state in the accessibility tree. A keyboard user never
    focuses a spine, and a screen-reader user reads an ordinary list whose activations arrive as
    detail-0 clicks and are ignored — neither ever pulls a book. This is how issue #18's "decorative
    to assistive technology" criterion is met (Open question 11).
14. The built HTML of every page contains no `a[href="/workshop/"]`, no `data-pulled`, and exactly
    `NAV_ITEMS.length` nav items. A Workshop nav item exists only at runtime, only when the stored
    flag parses as unlocked, at most once per nav, always as the list's last item.
15. Client-side JavaScript lives in exactly two processed `<script>` blocks, in
    `src/components/SiteNav.astro` and `src/pages/reading.astro`. The shelf script adds one `click`
    listener on `document`, acts only on pointer clicks that land on a spine, and mutates only the
    `data-pulled` attribute of the clicked spine; the nav script listens only to `window` `pageshow`
    and mutates only by appending the one nav item.
16. With JavaScript disabled, every page renders exactly its built HTML: the full shelf with nothing
    pulled, and an eight-item nav.
17. The markup and accessibility tree of `/reading/` are unchanged by this feature at every viewport
    and in both colour schemes. Its visual rendering with no spine pulled is unchanged; the only
    visual addition is the raise of a pulled spine, declared once for all spines.

## Non-goals

- **Secrecy against inspection.** The key ids, the storage key and `/workshop/` are readable in the
  shipped JavaScript and in DevTools. This is an easter egg, not access control: no obfuscation,
  hashing, encoding of the ids, or server check.
- **Gating the room.** `/workshop/` stays reachable by typed URL for anyone (`specs/workshop.spec.md`).
  No redirect for visitors without the flag, and visiting it does not unlock (row 86).
- **Any change to the shelf's markup or accessibility semantics.** No `aria-hidden`, no removal of
  `role="list"`, no visually-hidden index or duplicate text, no `aria-*` or `role` on spines, no
  `aria-pressed` or other announced state for pulled books.
- Any feedback that distinguishes a key book from any other, a correct pull from a wrong one, or
  how close the order is to the combination. No hint, sound, toast, confetti, colour change, focus
  change, or delay; completion is a plain navigation.
- Any automatic reset: no timeout, no reset after a wrong pull, no lowering of spines before
  navigating or on a back/forward restore, and no "reset shelf" control.
- A keyboard, screen-reader, or voice-control route to pulling or unlocking; a `tabindex`,
  `role="button"`, or key handler on spines; a "skip the puzzle" link.
- Distinguishing mouse from pen from touch. Every real pointer click counts the same.
- Persistence of the pull order or pulled markers in `localStorage`, `sessionStorage`, cookies, the
  URL, or `history.state`.
- Cross-tab sync via the `storage` event; removing the nav item live when storage is cleared.
- A re-lock button, a settings UI, or a way to change the key books other than editing
  `UNLOCK_SEQUENCE`.
- A `NAV_ITEMS` entry, a static (hidden or `display: none`) Workshop link in any built page, an
  inline `<head>` script to avoid the late reveal, or any `BaseLayout` change.
- View transitions, a client-side router, a framework integration, `client:*` directives, or any new
  dependency.
- Any change to `src/lib/reading.ts`, `src/lib/reading-books.ts`, the tokens, or `global.css`, and
  any spine CSS change beyond the pulled rule and the reduced-motion selector above. No
  `cursor: pointer`, `:active`, `:focus` or `user-select` style for spines, and no per-variant or
  per-book variation of the pulled raise.
- Tests that import `.astro` files, `astro:*`, `src/consts.ts` or `dist/**`, run a build, or use
  jsdom/happy-dom. The wiring is verified by the review rows, not by Vitest.
- Analytics or logging of pulls, pushes or unlocks.

## Open questions

1. **Position of the runtime nav item — decided, flag to Seth.** It is appended **after Contact**,
   so the static nav is never touched and the discovered room reads as a door at the end of the hall.
   If Seth wants it before Contact (keeping `Contact` last, as `specs/reading.spec.md` Invariant 16
   does for `NAV_ITEMS`), the reveal inserts before the last item instead; rows 66–67 and Invariant
   14 change from "9th/last" to "8th/second-to-last". Nothing else moves.
2. **The item appears after first paint — accepted, flag to Seth.** Processed Astro scripts are
   deferred modules, so for unlocked visitors the Workshop link can appear a frame after the rest of
   the nav, and at narrow widths where the nav wraps that may nudge the header. Locked visitors see
   no change. Avoiding it would need either a static hidden link on every page (a crawler-visible
   `/workshop/` link, forbidden by row 60) or a blocking inline `<head>` script in `BaseLayout`
   (forbidden by Non-goals). Unverified how visible the nudge is in practice.
3. **Script emission form under `astro ^7.3.2` is unverified.** Astro may inline a small processed
   script as `<script type="module">…</script>` or emit it as `dist/_astro/*.js` with a `src`, and
   may split the shared `workshop-unlock` code into a chunk. This spec asserts neither (row 59). If
   the scripts are inlined, the strings `/workshop/` and the key ids appear inside `<script>` text in
   the built HTML; that is consistent with row 60, which checks parsed elements, and with the
   "secrecy" non-goal. Record which form shipped in the verification record.
4. **Screen-reader "clickable" exposure and detail-0 activation are browser behaviour, unverified.**
   Chromium can expose an element carrying its own `click` listener as "clickable", which NVDA
   announces; that is why the listener sits on `document` and not on the shelf. Likewise, row 78(c)
   relies on NVDA and VoiceOver activation producing `click` events with `detail === 0`, which is
   the observed behaviour of synthesised clicks but is not verified here for every browser/screen
   reader pair. If a pair produces `detail >= 1`, a screen-reader user who activates list items would
   pull books (and could unlock) — a leak of the egg, not a breakage, and the pulled state would
   still not be announced. Record the pairs checked.
5. **Source placement of the `reading.astro` script.** It is contracted as the last child of
   `<BaseLayout>` so it is guaranteed to land inside the document body. Its emitted position in the
   HTML is not contracted. If `astro check` or the build objects to that placement, moving it after
   `</BaseLayout>` is acceptable and changes no row.
6. **The pulled raise is 16px (`--space-sm`), not the 8px hover lift — decided, flag to Seth.** The
   coordinator suggested a raise equal to the hover lift. With equal raises, clicking the spine under
   the pointer shows no change until the pointer leaves (hover already holds it at 8px), pushing a
   hovered book back likewise shows nothing, and on touch a browser's sticky hover would make a
   pushed-back book still look pulled — each breaks "what the user sees is the whole state". A
   higher raise keeps rest, hover and pulled visibly distinct. If Seth prefers the equal raise, the
   pulled rule uses `--space-2xs`, rows 89–93 and 95 change `-16` to `-8`, and rows 90, 91 and 95 lose
   the distinction they test.
7. **Back/forward-cache restore keeps the pulled state — decided, flag to Seth.** After an unlock,
   Back shows K and P still raised (row 85). This follows from "nothing resets silently" and needs no
   extra listener. The alternatives each conflict with a constraint: lowering every spine before
   `location.assign` is a silent reset (and the final pull would never visibly rise), and a
   `pageshow` listener on the shelf breaks the single-listener rule. Unverified: whether GitHub
   Pages' response headers leave `/reading/` eligible for the back/forward cache in Chrome, Firefox
   and Safari. If not, Back reloads the page with nothing pulled, which is row 75's behaviour and
   equally consistent. Record which browsers restored from the cache.
8. **Double-click text selection is not suppressed — flag to Seth.** A double-click (a pull and a
   push) also selects a word of the spine's title in most browsers. Suppressing it needs
   `user-select: none` (a further CSS change that also blocks deliberate copying of a title) or
   `preventDefault` on `mousedown` (a second listener). Neither is specified.
9. **Reduced motion keeps an instant raise — judgement, unverified with Seth.** Under
   `prefers-reduced-motion: reduce` a pulled spine jumps 16px with no transition. That is a
   user-initiated position change with no animation, and position is the only thing that reads as
   "pulled" without adding a colour or border change. If Seth wants no displacement at all under
   reduced motion, a non-motion marker needs its own design decision.
10. **A push can be the unlocking click — decided from Seth's wording, flag to him.** "The workshop
    unlocks at the moment the pulled books … are exactly `UNLOCK_SEQUENCE`" is read literally: the
    test runs after every toggle, so with [K, C, P] pulled, pushing C back unlocks (rows 33, 70).
    The alternative — test only after a pull — would leave a shelf showing exactly Clash then
    Azkaban raised but still locked until one is pushed and pulled again, which is hidden state.

Settled — recorded here so the decisions are not relitigated:

11. **Closed — the issue's "decorative to assistive technology" wording was superseded by Seth's
    decision.** Issue #18 asked for the shelf to be decorative to assistive technology. Seth decided
    instead that the shelf stays a real, readable list (`specs/reading.spec.md` Invariant 14 stands
    unamended) and that the criterion is met by making the unlock pointer-click only (Invariant 13):
    keyboard and screen-reader users are not routed through the egg because they cannot pull a book,
    not because the shelf is hidden from them. An earlier draft of this spec hid the drawn shelf with
    `aria-hidden` and added a visually-hidden index list; that design is withdrawn.
12. **Closed — `specs/reading.spec.md` amended.** For #18's JavaScript: Purpose (one sentence on the
    script), the page contract (the frontmatter import and assertion, the `<script>`, the
    `data-book-id` and no-script notes), Behavior 70, one Errors row, the "JavaScript disabled"
    boundary, Invariant 13, the "Anything interactive" non-goal, and closed open question 12. For the
    pull/push model: the Purpose sentence, the page-contract preamble and `data-book-id` note, the
    scoped `<style>` (the pulled rule and the reduced-motion selector) and the paragraph after it,
    Behavior 67–70, the reduced-motion, JavaScript-disabled and touch boundaries, Invariants 12, 13
    and 15, the "Anything interactive" non-goal, and closed open question 13. Its accessibility
    contract — `role="list"`, no `aria-hidden`, no visually-hidden duplicate, Behavior 56 and 58,
    Invariant 14 — is exactly as #16 shipped it.
13. **Closed — `specs/workshop.spec.md` amended.** Its Purpose, Behavior 29–30, Invariants 9 and 11,
    three non-goals, and a new closed open question 7 now allow the site-wide nav script and the
    runtime-only nav item, while still forbidding any `/workshop/` link in built HTML and any script
    of the room's own. The pull/push model changed nothing there.
14. **Closed — the "zero client JS" rows elsewhere amended.** `specs/layout-design-system.spec.md`
    (Purpose, a `NAV_ITEMS` note, the `BaseLayout` no-script note, the `SiteNav` section, Behavior
    #27, Invariants 2, 3, 4 and 10, the theme-persistence non-goal, closed open question 10),
    `specs/home-hero.spec.md` (Behavior #14, the JS-disabled boundary, Invariant 5, closed open
    question 5), `specs/narrative-pages.spec.md` (Behavior #15, closed open question 6) and
    `specs/contact.spec.md` (header line, Behavior 14, closed open question 4) now say "no script of
    the page's own; the site-wide nav script is `specs/workshop-unlock.spec.md`'s". No other row in
    those specs changed, and none of them depends on the pull model.
    `specs/header-ucf-mark.spec.md` needed no change: its "not touching `SiteNav`" non-goal is
    scoped to its own issue.
15. **Closed — the key books are `a-clash-of-kings` then `harry-potter-prisoner-of-azkaban`**, by
    Seth's decision, replacing an earlier Sorcerer's Stone → Deathly Hallows pair. They are
    referenced by id, so a retitle of either book changes nothing here.
16. **Closed — pulled books stay up, and the shelf's visible state is the lock (Seth's decision).**
    Replaces the progress/re-arm model, in which a correct first pull gave no feedback, a wrong pull
    silently reset progress, clicking Clash of Kings again re-armed, and the script never mutated the
    DOM. `pullBook` and `PullResult` are removed, not deprecated; `togglePull` and `isUnlockOrder`
    replace them. Unchanged by this decision: pointer-click only, the single `document` `click`
    listener, the ordinary `role="list"`, the storage flag and nav reveal, and an inert shelf with
    JavaScript disabled.
