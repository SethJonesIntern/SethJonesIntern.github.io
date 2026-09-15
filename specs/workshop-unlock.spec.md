# Workshop Unlock

Issue: personal-website #18 — "The two-book combination that unlocks the workshop". Builds on
`specs/reading.spec.md` (#16, the shelf) and `specs/workshop.spec.md` (#17, the room). Where this spec
changes a contract of theirs, those specs have been amended to agree; see Open questions 7–9.

## Purpose

The way into `/workshop/`. Two spines on the `/reading/` shelf, clicked in order — first
`a-clash-of-kings`, then `harry-potter-prisoner-of-azkaban` — record an unlock flag in
`localStorage` and send the browser to `/workshop/`. From then on, every page's nav carries a
`Workshop` item, on every later visit, until site data is cleared. The shelf must keep looking like
decoration: the two key books carry no marker in markup, style or behaviour, a correct first pull
gives no feedback, and a wrong pull silently resets without revealing that a sequence exists. This
is the site's first client-side JavaScript and it is confined to exactly two processed `<script>`
blocks — one in `src/components/SiteNav.astro` (reveals the nav item), one in
`src/pages/reading.astro` (watches for pulls on the shelf). Every branch of the logic — the sequence
state transition, the pointer-click test, the build-time check that the key books exist, the
stored-flag parsing, the guarded storage access, and the nav item's active state — lives in
`src/lib/workshop-unlock.ts`, a plain TypeScript module with zero imports that takes storage, event
details and pathnames as arguments, so Vitest covers it without a DOM. The two scripts are thin
wiring. **The shelf's markup and accessibility semantics do not change**: it stays a real,
readable `role="list"` of spines, exactly as `specs/reading.spec.md` contracts. The unlock is
reachable by mouse, pen or touch clicks only. Spines get no `tabindex`, no `role="button"`, no key
handler and no cursor change. Clicks synthesised by the keyboard, by assistive technology or by
`element.click()` are ignored, so a keyboard or screen-reader user reads an ordinary list and never
enters the sequence. With JavaScript disabled the shelf renders exactly as before and is inert, and
no nav item ever appears. No new dependency, no new token, no CSS or markup change to the shelf.

## Public API

### Files to create

```
src/lib/workshop-unlock.ts         (pure logic, constants and types; ZERO imports of any kind)
```

### Files to modify

```
src/components/SiteNav.astro       (append one <script>; frontmatter and markup byte-identical)
src/pages/reading.astro            (one import, one build-time assertion, one <script>; the shelf
                                    markup and the scoped <style> byte-identical)
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
 * Zero imports, no DOM, no globals: storage, event details and pathnames are passed in,
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

export interface PullResult {
  /** Correct pulls held after this one. Always an integer, 0 <= progress < max(sequence.length, 1). */
  readonly progress: number;
  /** True exactly when this pull completed the sequence. When true, progress is 0. */
  readonly unlocked: boolean;
}

/**
 * One pointer click on one spine. `progress` is the value returned by the previous pull (start at 0);
 * `bookId` is the clicked spine's `data-book-id`, unvalidated. Never throws.
 */
export function pullBook(
  progress: number,
  bookId: unknown,
  sequence: readonly string[] = UNLOCK_SEQUENCE,
): PullResult;

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

**The pull rule, as a contract** (the Behavior rows pin every case): the incoming `progress` is
used only if it is an integer in `[0, sequence.length)`; any other value counts as `0`. If `bookId`
equals `sequence[progress]`, the pull advances — to `progress + 1`, or, if that completes the
sequence, to `{ progress: 0, unlocked: true }`. Otherwise the pull is a mismatch: if `bookId` equals
`sequence[0]` it re-arms at `progress: 1`, and anything else resets to `progress: 0`. An empty
sequence never advances and never unlocks. There is no timeout and no memory beyond the single
`progress` number.

The re-arm clause is what makes a double-click on `a-clash-of-kings`, or clicking it again after a
stray pull, still leave one correct pull held. Because `assertUnlockSequence` forbids repeated ids,
this rule is exact for every sequence that can ship.

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
`tabindex`, no visually-hidden duplicate. The only addition is one `<script>` as the last child of
`<BaseLayout>`, after the `shelves.map(…)` expression:

```astro
  <script>
    /* wiring contract below */
  </script>
</BaseLayout>
```

**Wiring contract — the `reading.astro` script.** A plain `<script>` (no attributes: not
`is:inline`, no `define:vars`, no `type`), so Astro processes and bundles it. It:
1. Imports exactly `WORKSHOP_HREF`, `isPointerClick`, `openStorage`, `pullBook`, `recordUnlock`
   from `'../lib/workshop-unlock'`, and nothing else from anywhere.
2. Holds one page-level `progress` number, starting at `0`, shared by both shelves. It is never
   persisted anywhere.
3. Attaches exactly one `click` listener, on `document`, and no other listener anywhere. It is not
   attached to the shelf lists, the spines, the sections or `main`, so no shelf element carries an
   event listener that a browser could expose to assistive technology as "clickable".
4. On a click: if `isPointerClick(event.detail)` is `false`, does nothing. Otherwise finds the
   nearest ancestor-or-self `li.shelf__book` of the event target that sits inside a
   `ul.shelf__list`. If there is none (any click anywhere else on the page, including the gaps
   between spines), does nothing — the click neither advances nor resets. Otherwise passes that
   spine's `data-book-id` to `pullBook` and stores the returned `progress`.
5. When the result has `unlocked: true`, calls `recordUnlock(openStorage(window))`, then
   `window.location.assign(WORKSHOP_HREF)` — **whether or not** the write succeeded, with no delay.
6. Never calls `preventDefault` or `stopPropagation`; never reads storage; never mutates the DOM,
   classes, attributes or styles; never focuses anything; never writes to the console; never sets a
   timer; never touches `history` other than through the `location.assign` in step 5.

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
4. Never removes a nav item, never alters an existing one, never writes storage, never logs.

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
  isWorkshopPath,
  openStorage,
  parseUnlockFlag,
  pullBook,
  readUnlocked,
  recordUnlock,
  workshopNavLink,
  type PullResult,
  type UnlockStorage,
  type WorkshopNavLink,
} from '../src/lib/workshop-unlock';
import { READING_LIST } from '../src/lib/reading-books';
```

`src/lib/reading-books.ts` is importable (its only import is type-only). Suggested fixtures:

```ts
const K = 'a-clash-of-kings';
const P = 'harry-potter-prisoner-of-azkaban';
const C = 'harry-potter-chamber-of-secrets';

/** Pulls `ids` in order from a fresh state; returns each pull's `unlocked`. */
const run = (ids: readonly unknown[], sequence?: readonly string[]): boolean[] => {
  let progress = 0;
  return ids.map((id) => {
    const result = pullBook(progress, id, sequence);
    progress = result.progress;
    return result.unlocked;
  });
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
`src/lib/workshop-unlock.ts`. Rows 54–88 are review criteria verified by `npm run build`,
`npm run check`, the built HTML, and a real browser — per `CLAUDE.md` adjudication is off. A
"fresh profile" means `localStorage` for the origin is empty before the page loads. "Click" in a
review row means a real pointer click unless the row says otherwise.

| # | input | expected output | notes |
|---|---|---|---|
| 1 | `UNLOCK_SEQUENCE` | `['a-clash-of-kings', 'harry-potter-prisoner-of-azkaban']` | deep-equal; length 2 |
| 2 | `UNLOCK_STORAGE_KEY`, `UNLOCK_STORAGE_VALUE` | `'workshop-unlocked'`, `'true'` | |
| 3 | `WORKSHOP_HREF`, `WORKSHOP_NAV_LABEL` | `'/workshop/'`, `'Workshop'` | |
| 4 | `UNLOCK_SEQUENCE.map((id) => READING_LIST.findIndex((b) => b.id === id))` | `[11, 5]` | both key books exist; the second key stands earlier on the shelf than the first |
| 5 | `UNLOCK_SEQUENCE.map((id) => READING_LIST.find((b) => b.id === id)?.shelf)` | `['fiction', 'fiction']` | |
| 6 | `pullBook(0, K)` | `{ progress: 1, unlocked: false }` | first key held |
| 7 | `pullBook(1, P)` | `{ progress: 0, unlocked: true }` | completes; state resets |
| 8 | `pullBook(0, P)` | `{ progress: 0, unlocked: false }` | order matters |
| 9 | `pullBook(1, K)` | `{ progress: 1, unlocked: false }` | a repeat of Clash of Kings re-arms, not a reset to 0 |
| 10 | `pullBook(1, C)` / `pullBook(1, 'the-last-olympian')` / `pullBook(1, 'mythical-man-month')` | `{ progress: 0, unlocked: false }` × 3 | any other book resets |
| 11 | `pullBook(0, C)` / `pullBook(0, 'fire-and-blood')` | `{ progress: 0, unlocked: false }` × 2 | |
| 12 | `pullBook(1, 'Harry-Potter-Prisoner-Of-Azkaban')` / `(1, ' harry-potter-prisoner-of-azkaban')` / `(1, 'harry-potter-prisoner-of-azkaban ')` / `(1, 'book-harry-potter-prisoner-of-azkaban')` | `{ progress: 0, unlocked: false }` × 4 | no normalisation; the `book-` DOM id is not a book id |
| 13 | `pullBook(1, undefined)` / `(1, null)` / `(1, 42)` / `(1, '')` / `(0, [K])` | `{ progress: 0, unlocked: false }` × 5 | a spine with no readable id is a mismatch, not an error |
| 14 | `pullBook(2, K)` / `pullBook(99, K)` | `{ progress: 1, unlocked: false }` × 2 | out-of-range progress counts as 0 |
| 15 | `pullBook(2, P)` / `pullBook(99, P)` | `{ progress: 0, unlocked: false }` × 2 | |
| 16 | `pullBook(-1, K)` / `pullBook(0.5, K)` / `pullBook(NaN, K)` / `pullBook(Infinity, K)` | `{ progress: 1, unlocked: false }` × 4 | non-integer or negative counts as 0 |
| 17 | `pullBook(-1, P)` / `pullBook(1.5, P)` / `pullBook(NaN, P)` / `pullBook(Infinity, P)` | `{ progress: 0, unlocked: false }` × 4 | 1.5 is not 1 |
| 18 | `pullBook(0, K)` and `pullBook(0, K, UNLOCK_SEQUENCE)` and `pullBook(0, K, undefined)` | all deep-equal `{ progress: 1, unlocked: false }` | default parameter |
| 19 | `Object.keys(pullBook(0, K)).sort()` | `['progress', 'unlocked']` | no extra fields |
| 20 | `run([K, P])` | `[false, true]` | the combination |
| 21 | `run([P, K])` | `[false, false]` | reversed |
| 22 | `run([K, C, P])` | `[false, false, false]` | a wrong pull in the middle kills the attempt |
| 23 | `run([K, K, P])` | `[false, false, true]` | double-click on Clash of Kings still unlocks |
| 24 | `run([P, K, P])` | `[false, false, true]` | a reset followed by the combination |
| 25 | `run([C, K, P])` / `run(['mythical-man-month', K, P])` | `[false, false, true]` × 2 | |
| 26 | `run([K, P, P])` | `[false, true, false]` | a pull after completion starts from 0 |
| 27 | `run([K, P, K, P])` | `[false, true, false, true]` | repeatable |
| 28 | `run([K, 'not-a-spine', P])` | `[false, false, false]` | |
| 29 | `run([])` | `[]` | |
| 30 | `pullBook(0, 'a', ['a', 'b', 'c'])` / `(1, 'b', …)` / `(2, 'c', …)` | `{ progress: 1, unlocked: false }` / `{ progress: 2, unlocked: false }` / `{ progress: 0, unlocked: true }` | three-key sequence |
| 31 | `pullBook(2, 'a', ['a', 'b', 'c'])` / `(1, 'a', …)` | `{ progress: 1, unlocked: false }` × 2 | first key re-arms from any depth |
| 32 | `pullBook(2, 'b', ['a', 'b', 'c'])` / `(1, 'c', …)` / `(0, 'b', …)` | `{ progress: 0, unlocked: false }` × 3 | a later key out of turn resets |
| 33 | `pullBook(3, 'a', ['a', 'b', 'c'])` / `(3, 'c', …)` | `{ progress: 1, unlocked: false }` / `{ progress: 0, unlocked: false }` | progress 3 is out of range for length 3 |
| 34 | `pullBook(0, 'a', ['a'])` / `(1, 'a', ['a'])` / `(0, 'b', ['a'])` | `{ progress: 0, unlocked: true }` / `{ progress: 0, unlocked: true }` / `{ progress: 0, unlocked: false }` | one-key sequence unlocks on its only pull |
| 35 | `pullBook(0, 'a', [])` / `(0, undefined, [])` / `(5, 'a', [])` | `{ progress: 0, unlocked: false }` × 3 | empty sequence never unlocks |
| 36 | `const seq = ['a', 'b']; pullBook(0, 'a', seq); pullBook(1, 'b', seq)` | `seq` still deep-equals `['a', 'b']`; `UNLOCK_SEQUENCE` still deep-equals row 1 after rows 6–35 | never mutates |
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
| 56 | `npm test` | exit 0; every pre-existing suite still passes | `reading.ts` and `reading-books.ts` are untouched |
| 57 | source grep `<script` over `src/**/*.astro` | matches exactly two files, `src/components/SiteNav.astro` and `src/pages/reading.astro`, once each, and each tag is exactly `<script>` with no attribute | JS confined to nav and shelf |
| 58 | source of `src/lib/workshop-unlock.ts`, comments excluded | no `import` or `require`; no free reference to the globals `window`, `document`, `location`, `globalThis`, `self`, `navigator`, `console` or `localStorage` — the word `localStorage` may appear only as a property read on `openStorage`'s `host` parameter | zero imports, no globals. Review-only |
| 59 | every `dist/**/*.html` | every `<script>` element has `type="module"`; no element has an `on[a-z]+=` attribute; any emitted `.js` file is under `dist/_astro/` | processed scripts only; inline-vs-external is not contracted (Open question 3) |
| 60 | parsed static DOM of every `dist/**/*.html` | `nav.site-nav li` count is `8`; `document.querySelector('a[href="/workshop/"]') === null` | no crawler-visible link, on any page including `/workshop/` |
| 61 | `dist/reading/index.html` | `specs/reading.spec.md` rows 54–62 hold unchanged: two `ul.shelf__list[role="list"]` with 3 and 15 `li.shelf__book`, each spine exactly `span.shelf__title` then `span.shelf__author`; the page contains no `aria-hidden` attribute and no `.visually-hidden` element inside `main` | the shelf stays a real list |
| 62 | every element inside either `ul.shelf__list` | none is `a`, `button`, `input`, or `summary`; none has `tabindex`, `href`, `role`, `title`, or `contenteditable` | nothing focusable, nothing button-like |
| 63 | the `li#book-a-clash-of-kings` and `li#book-harry-potter-prisoner-of-azkaban` elements in `dist/reading/index.html` | each has exactly the same set of attribute names as every other `li.shelf__book`; each `class` is `shelf__book` plus one `shelf__book--<variant>` modifier, like all 18; neither is distinguished by any attribute value other than its own `id`, `data-book-id` and variant | markup gives the keys away nowhere |
| 64 | the scoped `<style>` block of `src/pages/reading.astro` | byte-identical to the block in `specs/reading.spec.md`; no selector contains `#book-`, `[data-book-id`, `:nth-child`, `:nth-of-type`, `a-clash-of-kings`, or `prisoner-of-azkaban` | no per-spine styling |
| 65 | fresh profile, `/reading/`, click spine K then spine P | the browser navigates to `/workshop/`; there `localStorage.getItem('workshop-unlocked') === 'true'` and `localStorage.length === 1`; pressing Back returns to `/reading/` | the unlock; `assign`, not `replace` |
| 66 | after row 65, on `/workshop/` | nav has 9 `li`; the 9th is `li.site-nav__item > a.site-nav__link.is-active[href="/workshop/"][aria-current="page"]` with text `Workshop`; it is the only nav link with `aria-current` or `is-active` | active on its own room |
| 67 | after row 65, load `/`, `/about/`, `/research/`, `/teaching/`, `/projects/`, one `/projects/<id>/`, `/blog/`, one `/blog/<slug>/`, `/reading/`, `/contact/` | each nav has 9 `li`, the 9th an `a` with `class="site-nav__link"`, `href="/workshop/"`, text `Workshop`, no `aria-current`; the page's static active link is unchanged; the Workshop link's computed `color` and `font-size` equal those of an inactive static nav link on the same page | every page, styled like its siblings |
| 68 | row 67's pages after a reload, and after closing and reopening the browser | still 9 items, exactly one `a[href="/workshop/"]` in the nav | survives reload and later visits |
| 69 | after row 65, clear site data for the origin (DevTools → Application → Clear site data, or `localStorage.clear()`), then reload any page | nav has 8 `li` and no `a[href="/workshop/"]` | re-locks |
| 70 | fresh profile, `/reading/`, click K, then C, then P | no navigation; `localStorage.length === 0`; `main` and `nav` `outerHTML` identical to before the clicks; console empty | wrong middle pull silently resets |
| 71 | fresh profile, click P then K | no navigation, storage empty, DOM unchanged, console empty | reversed order does nothing |
| 72 | fresh profile, click P, K, P | navigates to `/workshop/` on the third click | a reset does not poison the next attempt |
| 73 | fresh profile, double-click K, then click P | navigates to `/workshop/` | row 23 in the browser |
| 74 | fresh profile, click K; then click the `<h1>`, the intro paragraph, the `Fiction` heading, the footer, and the empty row gap inside a `ul.shelf__list` (not on a spine); then click P | navigates to `/workshop/` on the P click | non-spine clicks neither advance nor reset |
| 75 | fresh profile, click K, reload, click P | no navigation, storage empty | partial progress lives in memory only |
| 76 | fresh profile, click K only | `location.href`, `history.length`, `document.title`, `localStorage.length`, `main`/`nav` `outerHTML`, and the computed style of every `li.shelf__book` are identical to before the click; console empty | a correct pull gives no feedback |
| 77 | fresh profile, one click on each of the 18 spines in turn, reloading between clicks | every click produces the identical observable result: nothing — no navigation, no DOM, style, storage or console change, and `event.defaultPrevented === false` (checked via a bubbling listener on `window` added in DevTools); computed `cursor` is `auto` on every spine; hover lift is row 67 of `specs/reading.spec.md`, identical for all 18 | behaviourally identical until completion |
| 78 | fresh profile, `/reading/`: (a) Tab from page load to the end of the page, pressing Enter and Space at each stop; (b) in the DevTools console, `document.querySelector('#book-a-clash-of-kings').click(); document.querySelector('#book-harry-potter-prisoner-of-azkaban').click();`; (c) with NVDA browse mode (Enter) or VoiceOver (VO-Space), activate the K list item then the P list item | (a) focus visits the skip link, the brand and the nav links and never lands inside a `section.shelf`; (a), (b) and (c) each leave the page on `/reading/` with `localStorage.length === 0` | detail-0 clicks are ignored; the sequence is pointer-only |
| 79 | screen reader (VoiceOver or NVDA) reading `/reading/` top to bottom | hears `Reading`, the intro, `Technical`, a list of 3 items, `Fiction`, a list of 15 items, each item its title then its author; no spine is announced as a button, link, or clickable | an ordinary list. "Clickable" exposure is browser-dependent (Open question 4) |
| 80 | JavaScript disabled, `/reading/` | the shelf renders exactly as with JavaScript enabled; clicking K then P does nothing; `specs/reading.spec.md` rows 54–69 hold | inert, not broken |
| 81 | JavaScript disabled with `workshop-unlocked` already `'true'` in storage, any page | nav has 8 `li`, no Workshop link | the item is runtime-only |
| 82 | site data blocked for the origin (Chrome "Sites can't save data on your device" for this site, or Firefox cookies blocked for it), `/reading/`, click K then P | navigates to `/workshop/`; no uncaught exception in the console; nav there has 8 `li` | unlock degrades to plain navigation |
| 83 | storage manually set to `workshop-unlocked` = `'false'`, `'1'`, `'TRUE'`, or `' true'`; reload any page | nav has 8 `li` | only the exact value unlocks |
| 84 | already unlocked, `/reading/`, click K then P | navigates to `/workshop/` again; storage still holds exactly one key, `workshop-unlocked` = `'true'`; nav there has exactly one Workshop item | idempotent |
| 85 | after row 65, press Back to `/reading/` (restored from the back/forward cache) | the nav shows the Workshop item as its 9th `li` without a reload, exactly once | `pageshow` re-reveal |
| 86 | fresh profile, type `/workshop/` into the address bar | page renders; nav has 8 `li`; `localStorage.length === 0` | visiting the room does not unlock it |
| 87 | fresh profile, `/reading/` at 400px and 1280px, light and dark | visually identical to the pre-feature page; `specs/reading.spec.md` row 69 holds | no visual change |
| 88 | touch emulation (or a phone), fresh profile, tap K then tap P | navigates to `/workshop/` | a tap is a pointer click (detail 1) |

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
| `pullBook`, `isPointerClick`, `parseUnlockFlag`, `openStorage`, `readUnlocked`, `recordUnlock`, `isWorkshopPath`, `workshopNavLink` given any argument covered by Behavior rows 6–53 | **no error** | storage exceptions become `false`/`null`; every other input has a defined result. These functions never throw for those inputs |
| storage blocked or full at runtime | **no error** surfaces | unlock still navigates (row 82); the nav reveal simply does nothing |
| a spine with no `data-book-id` at runtime | **no error** | `pullBook` treats `undefined` as a mismatch (row 13). Unreachable with the shipped markup |

## Boundaries

| boundary | answer |
|---|---|
| empty sequence | `pullBook` never advances or unlocks (row 35); `assertUnlockSequence` throws (Errors). It cannot ship. Test both. |
| one-key sequence | Unlocks on the single pull from any state (row 34). Legal to the function; not shipped. Test. |
| sequence with repeated ids | Rejected by `assertUnlockSequence` (Errors). `pullBook`'s result for such a sequence is whatever the pull rule gives; not contracted beyond that. Undefined, do not test. |
| zero progress | The start state (rows 6, 8). Test. |
| negative / fractional / `NaN` / `Infinity` progress | Counts as 0 (rows 16–17). Test. |
| progress at or above `sequence.length` | Counts as 0 (rows 14–15, 33). Test. |
| max — sequence length | Uncapped. A 3-key sequence is covered (rows 30–33); longer ones follow the same rule. Test up to 3. |
| max — number of pulls | Unbounded; state is one number. `run` over 1000 non-key ids followed by `[K, P]` ends in `true`. Test if convenient. |
| empty string book id | Mismatch → `{ progress: 0, unlocked: false }` (row 13). Test. |
| near-miss ids (uppercase, padded, `book-`-prefixed) | Mismatch; no normalisation (row 12). Test the listed ones. |
| null / undefined / non-string `bookId` | Mismatch (row 13). Test. |
| null / undefined / non-array `sequence` or `knownIds` | Typed `readonly string[]`; passing `undefined` as `sequence` selects the default (row 18). Any other non-array: undefined, do not test. |
| duplicate ids in `knownIds` | Legal (row 38). Test. |
| unordered `knownIds` | Order irrelevant (row 38). Test. |
| click `detail`: 0, negative, fractional, non-number | Not a pointer click (row 53). Test. |
| click `detail` above 2 (triple-click) | A pointer click; each `click` event is one pull (row 53). Test `3`. |
| stored flag: exact `'true'` / anything else / absent | Unlocked / locked / locked (rows 40–42, 48). Test. |
| storage getter throws, storage is `null`, storage lacks methods | `openStorage` → `null` (rows 44–46). Test. |
| `getItem` or `setItem` throws | `readUnlocked` → `false`, `recordUnlock` → `false` (rows 49, 51). Test. |
| `getItem` returns a non-string (a broken shim) | `readUnlocked` → `false`, via `parseUnlockFlag`. Test if convenient. |
| pathname: `/workshop` without slash, descendants, `/workshop/index.html` | Active (row 52). Test. |
| pathname: prefix look-alikes (`/workshop-annex/`, `/workshops/`), different case, relative, empty | Inactive (row 52). Test. |
| pathname with a site `base` prefix | The site has no `base` (`astro.config.mjs` sets only `site`). Undefined, do not test. |
| both key books on the same shelf, in reverse shelf order | They are (rows 4–5); state is page-level and shared across shelves, and shelf position is irrelevant. Review-only. |
| clicks outside any spine, including gaps inside `ul.shelf__list` | Ignored — neither advance nor reset (row 74). Review. |
| double-click, rapid clicks, text-selecting drags on a spine | Each pointer `click` event is one pull; a double-click is two (row 73). A drag that emits no `click` is no pull. Review. |
| middle-click, right-click, modifier-clicks | Right-click and middle-click emit no `click` event, so they are no pull. Ctrl/Shift/Meta-click on a spine emits a pointer `click` and counts like any click. Undefined beyond that, do not test. |
| keyboard, screen-reader or `element.click()` activation of a spine | `click` with detail 0 — ignored entirely, neither advance nor reset (row 78). Review. |
| a pull after completion but before navigation finishes | Progress was reset to 0 (row 26); a stray click is an ordinary pull. Undefined, do not test. |
| back/forward-cache restore of `/reading/` mid-attempt | The same document is restored with its in-memory progress. Undefined, do not test. |
| back/forward-cache restore of any page after unlocking | The nav re-reveals (row 85). Review. |
| site data cleared while a page is open | The already-appended item stays until the next load; the next load shows 8 items (row 69). Only the reload is contracted. |
| unlock in one tab while another tab is open | The other tab shows the item on its next load or back/forward restore. No `storage`-event sync. Undefined beyond that, do not test. |
| already unlocked | Completing again re-records and navigates (row 84); the nav never shows two items (rows 68, 84). Review. |
| JavaScript disabled | Shelf renders identically and is inert; nav never shows the item (rows 80–81). Review. |
| storage blocked | Unlock navigates, nothing persists (row 82). Review. |
| voice control ("click Clash of Kings") | Voice-control software typically dispatches a synthesised click; whether its `detail` is 0 or 1 varies by product. Undefined, do not test. |
| touch | A tap is a pointer click (row 88). Review. |
| viewport | Unchanged from `specs/reading.spec.md`: 400px floor, no horizontal scroll (row 87). Review. |
| forced-colors, print, RTL | Undefined, do not test. |

## Invariants

1. For every `progress`, `bookId` and string-array `sequence`, `pullBook` returns an object with
   exactly `progress` and `unlocked`, where `progress` is an integer with
   `0 <= progress < Math.max(sequence.length, 1)`, and `unlocked === true` implies `progress === 0`.
   It never throws.
2. `pullBook(p, id, seq).unlocked` is `true` only if `seq.length > 0` and
   `id === seq[seq.length - 1]`. A `bookId` not in `sequence` always yields
   `{ progress: 0, unlocked: false }`.
3. For every sequence of distinct ids and **every** starting `progress`, pulling the whole sequence
   in order unlocks on its last pull and on no earlier pull. In particular, Clash of Kings then
   Prisoner of Azkaban unlocks from any state, and nothing short of a pointer click on Clash of Kings
   immediately followed by a pointer click on Prisoner of Azkaban (ignoring non-spine and
   non-pointer clicks) ever unlocks.
4. `isPointerClick(d) === (Number.isInteger(d) && d >= 1)` for every `d`, with non-numbers false.
5. Every function in `src/lib/workshop-unlock.ts` is pure over its arguments: same input, same
   output, no module-level state, no mutation of any argument, no access to any global. The only
   side effects are the `getItem`/`setItem` calls `readUnlocked`/`recordUnlock` make on the storage
   they are given — one call each, always to `UNLOCK_STORAGE_KEY`.
6. `parseUnlockFlag(x) === (x === UNLOCK_STORAGE_VALUE)` for every `x`. On a working storage,
   `recordUnlock(s) === true` implies `readUnlocked(s) === true` afterwards.
7. `workshopNavLink(p).ariaCurrent === 'page'` ⇔ `workshopNavLink(p).className === 'site-nav__link is-active'`
   ⇔ `isWorkshopPath(p)`; `href` and `label` are always `WORKSHOP_HREF` and `WORKSHOP_NAV_LABEL`.
8. Every shipped `UNLOCK_SEQUENCE` id exists in `READING_LIST` and none repeats — enforced at build
   time, so a retitle is safe (ids are permanent, `specs/reading.spec.md` Invariant 6) and a removed
   key book fails the build.
9. Partial progress is never persisted: the only thing ever written to any storage is
   `UNLOCK_STORAGE_KEY` = `UNLOCK_STORAGE_VALUE`, and only when the sequence completes.
10. Until the combination completes, no click on any spine produces any observable difference from a
    click on any other spine — no DOM, attribute, class, style, cursor, focus, storage, console,
    history or navigation change. The two key spines are indistinguishable from the other sixteen in
    markup and CSS.
11. **The unlock is pointer-click only, and the shelf stays an ordinary list.** Only `click` events
    with `detail >= 1` on a spine can advance the sequence. Spines have no `tabindex`, no
    `role="button"` or other role, no key handler, no `cursor` change, and no event listener of their
    own; the shelf keeps `role="list"`, no `aria-hidden`, and no visually-hidden duplicate. A keyboard
    user never focuses a spine, and a screen-reader user reads an ordinary list whose activations
    arrive as detail-0 clicks and are ignored — neither ever enters the sequence. This is how issue
    #18's "decorative to assistive technology" criterion is met (Open question 6).
12. The built HTML of every page contains no `a[href="/workshop/"]` and exactly `NAV_ITEMS.length`
    nav items. A Workshop nav item exists only at runtime, only when the stored flag parses as
    unlocked, at most once per nav, always as the list's last item.
13. Client-side JavaScript lives in exactly two processed `<script>` blocks, in
    `src/components/SiteNav.astro` and `src/pages/reading.astro`. The shelf script adds one `click`
    listener on `document`, acts only on pointer clicks that land on a spine, and mutates no DOM; the
    nav script listens only to `window` `pageshow` and mutates only by appending the one nav item.
14. With JavaScript disabled, every page renders exactly its built HTML: the full shelf and an
    eight-item nav.
15. The markup, accessibility tree and visual rendering of `/reading/` are unchanged by this feature
    at every viewport and in both colour schemes; the only addition to the page is the `<script>`.

## Non-goals

- **Secrecy against inspection.** The key ids, the storage key and `/workshop/` are readable in the
  shipped JavaScript and in DevTools. This is an easter egg, not access control: no obfuscation,
  hashing, encoding of the ids, or server check.
- **Gating the room.** `/workshop/` stays reachable by typed URL for anyone (`specs/workshop.spec.md`).
  No redirect for visitors without the flag, and visiting it does not unlock (row 86).
- **Any change to the shelf's markup or accessibility semantics.** No `aria-hidden`, no removal of
  `role="list"`, no visually-hidden index or duplicate text, no `aria-*` or `role` on spines.
- Any hint, feedback, animation, sound, toast, confetti, focus change, or delay on a correct pull,
  a wrong pull, or completion. Completion is a plain navigation.
- A keyboard, screen-reader, or voice-control route to the unlock; a `tabindex`, `role="button"`, or
  key handler on spines; a "skip the puzzle" link.
- Distinguishing mouse from pen from touch. Every real pointer click counts the same.
- A timeout between pulls, a cap on attempts, or persistence of partial progress in `localStorage`,
  `sessionStorage`, cookies, the URL, or `history.state`.
- Cross-tab sync via the `storage` event; removing the nav item live when storage is cleared.
- A re-lock button, a settings UI, or a way to change the key books other than editing
  `UNLOCK_SEQUENCE`.
- A `NAV_ITEMS` entry, a static (hidden or `display: none`) Workshop link in any built page, an
  inline `<head>` script to avoid the late reveal, or any `BaseLayout` change.
- View transitions, a client-side router, a framework integration, `client:*` directives, or any new
  dependency.
- Any change to `src/lib/reading.ts`, `src/lib/reading-books.ts`, the spine CSS, the tokens, or
  `global.css`. No `cursor: pointer`, `:active` or `:focus` style for spines.
- Tests that import `.astro` files, `astro:*`, `src/consts.ts` or `dist/**`, run a build, or use
  jsdom/happy-dom. The wiring is verified by the review rows, not by Vitest.
- Analytics or logging of pulls or unlocks.

## Open questions

1. **Position of the runtime nav item — decided, flag to Seth.** It is appended **after Contact**,
   so the static nav is never touched and the discovered room reads as a door at the end of the hall.
   If Seth wants it before Contact (keeping `Contact` last, as `specs/reading.spec.md` Invariant 16
   does for `NAV_ITEMS`), the reveal inserts before the last item instead; rows 66–67 and Invariant
   12 change from "9th/last" to "8th/second-to-last". Nothing else moves.
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
   reader pair. If a pair produces `detail >= 1`, a screen-reader user who activates the two list
   items in order would unlock — a leak of the egg, not a breakage. Record the pairs checked.
5. **Source placement of the `reading.astro` script.** It is contracted as the last child of
   `<BaseLayout>` so it is guaranteed to land inside the document body. Its emitted position in the
   HTML is not contracted. If `astro check` or the build objects to that placement, moving it after
   `</BaseLayout>` is acceptable and changes no row.

Settled — recorded here so the decisions are not relitigated:

6. **Closed — the issue's "decorative to assistive technology" wording was superseded by Seth's
   decision.** Issue #18 asked for the shelf to be decorative to assistive technology. Seth decided
   instead that the shelf stays a real, readable list (`specs/reading.spec.md` Invariant 14 stands
   unamended) and that the criterion is met by making the unlock pointer-click only (Invariant 11):
   keyboard and screen-reader users are not routed through the egg because they cannot enter the
   sequence, not because the shelf is hidden from them. An earlier draft of this spec hid the drawn
   shelf with `aria-hidden` and added a visually-hidden index list; that design is withdrawn.
7. **Closed — `specs/reading.spec.md` amended, for JavaScript only.** Purpose (one sentence on the
   script), the page contract (the frontmatter import and assertion, the `<script>`, the
   `data-book-id` and no-script notes), Behavior 70, one Errors row, the "JavaScript disabled"
   boundary, Invariant 13, the "Anything interactive" non-goal, and closed open question 12. Its
   accessibility contract — `role="list"`, no `aria-hidden`, no visually-hidden duplicate, Behavior
   56 and 58, Invariant 14 — is exactly as #16 shipped it.
8. **Closed — `specs/workshop.spec.md` amended.** Its Purpose, Behavior 29–30, Invariants 9 and 11,
   three non-goals, and a new closed open question 7 now allow the site-wide nav script and the
   runtime-only nav item, while still forbidding any `/workshop/` link in built HTML and any script
   of the room's own.
9. **Closed — the "zero client JS" rows elsewhere amended.** `specs/layout-design-system.spec.md`
   (Purpose, a `NAV_ITEMS` note, the `BaseLayout` no-script note, the `SiteNav` section, Behavior
   #27, Invariants 2, 3, 4 and 10, the theme-persistence non-goal, closed open question 10),
   `specs/home-hero.spec.md` (Behavior #14, the JS-disabled boundary, Invariant 5, closed open
   question 5), `specs/narrative-pages.spec.md` (Behavior #15, closed open question 6) and
   `specs/contact.spec.md` (header line, Behavior 14, closed open question 4) now say "no script of
   the page's own; the site-wide nav script is `specs/workshop-unlock.spec.md`'s". No other row in
   those specs changed. `specs/header-ucf-mark.spec.md` needed no change: its "not touching
   `SiteNav`" non-goal is scoped to its own issue.
10. **Closed — the key books are `a-clash-of-kings` then `harry-potter-prisoner-of-azkaban`**, by
    Seth's decision, replacing an earlier Sorcerer's Stone → Deathly Hallows pair. The re-arm rule
    applies to Clash of Kings. They are referenced by id, so a retitle of either book changes nothing
    here.
