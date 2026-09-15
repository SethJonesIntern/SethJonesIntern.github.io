# Workshop

Issue: personal-website #17 — "The Workshop: the room and the pattern for putting things in it"

## Purpose

`/workshop/` is a hidden corner of the site where Seth will later embed small things he is building.
This issue ships **the room and the registry contract only — zero exhibits**. The page builds
statically, is reachable by typing the URL, is linked from nowhere, and carries `noindex` so it stays
out of search results. Everything on the bench comes from one typed registry: an ordered array of
`Exhibit` entries, each a component plus an `id`, a `title`, and a short `blurb`, rendered in
declared order. With the registry empty the page renders a short note in Seth's voice instead of a
generic placeholder. The decision logic that can be unit-tested (id validation, anchor derivation,
duplicate detection) lives in a plain TypeScript module with zero imports; the registry, which must
import `.astro` files, is a separate module so the pure one stays importable from Vitest. The way
**in** — an easter-egg unlock from a bookshelf on `/reading/` — is issue #18 and is explicitly out of
scope here. No client-side JavaScript, no new dependency, no new design token.

## Public API

### Files to create

```
src/lib/workshop.ts                (pure logic and types; ZERO imports of any kind)
src/lib/workshop-registry.ts       (the registry; imports only './workshop' and exhibit .astro files)
src/pages/workshop/index.astro     (the room)
```

### File to modify

```
src/layouts/BaseLayout.astro       (one new optional prop + one conditional <meta>; nothing else)
```

Files to leave untouched: `src/consts.ts` (no `NAV_ITEMS` entry), `src/components/*`,
`src/styles/tokens.css`, `src/styles/global.css`, `src/pages/**` other than the new file,
`src/content*`, `astro.config.mjs`, `tsconfig.json`, `package.json`, `public/*`.

### `src/lib/workshop.ts` — exact exports

```ts
/**
 * Exhibit registry types and pure helpers.
 * Zero imports, no I/O: unit-testable without an Astro build.
 */

/**
 * An exhibit's renderable component — the default export of a `.astro` file.
 * Exhibit components take no props; `(props: any) => any` is the deliberate
 * annotation, because it accepts every shape `astro check` infers for an
 * `.astro` default export while staying usable as a JSX element.
 */
export type ExhibitComponent = (props: any) => any;

export interface Exhibit {
  /** Stable kebab-case slug, unique within the registry. Matches EXHIBIT_ID_PATTERN. */
  readonly id: string;
  /** Heading text for the exhibit, rendered as its <h2>. */
  readonly title: string;
  /** One or two sentences under the title saying what the thing is. */
  readonly blurb: string;
  /** The component that renders the exhibit itself. */
  readonly component: ExhibitComponent;
}

/** Lowercase kebab-case: ASCII alphanumeric runs joined by single hyphens. No `g` flag. */
export const EXHIBIT_ID_PATTERN: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Runtime guard for unvalidated values. True only for strings matching EXHIBIT_ID_PATTERN. */
export function isExhibitId(value: unknown): value is string;

/** DOM id for an exhibit's list item: `exhibit-<id>`. Throws TypeError on an invalid id. */
export function exhibitAnchorId(id: string): string;

/** Throws TypeError on the first repeated `id`, scanning in declaration order. Returns void. */
export function assertUniqueExhibitIds(exhibits: readonly Exhibit[]): void;
```

No trimming, no lowercasing, no normalisation anywhere: an id is either already valid or rejected.
`EXHIBIT_ID_PATTERN` carries no `g`/`y` flag, so `.test()` is stateless and may be called repeatedly.

### `src/lib/workshop-registry.ts` — exact contents as shipped

```ts
import type { Exhibit } from './workshop';

// Ships empty: issue #17 builds the room and the pattern, not the exhibits.
// To add one, import its component above and append an entry here. Render
// order is array order.
export const EXHIBITS: readonly Exhibit[] = [];
```

The `: readonly Exhibit[]` annotation is required, not optional: without it TypeScript infers
`never[]` from the empty literal and the page's `EXHIBITS.map((exhibit) => …)` loses its element
type. `EXHIBITS` is the only export. Nothing else in the repo may declare exhibits.

### `src/pages/workshop/index.astro` — contract

Frontmatter:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { assertUniqueExhibitIds, exhibitAnchorId } from '../../lib/workshop';
import { EXHIBITS } from '../../lib/workshop-registry';

// A duplicate id would emit duplicate DOM ids; fail the build instead.
assertUniqueExhibitIds(EXHIBITS);
---
```

Body:

```astro
<BaseLayout
  title="Workshop"
  description="A quiet corner of Seth Jones’s site for small things still under construction."
  noindex
>
  <h1>Workshop</h1>
  <p>The workshop is where I keep the small things I’m building — the ones too unfinished to be projects and too alive to throw away.</p>
  {
    EXHIBITS.length === 0 ? (
      <div class="workshop-note">
        <p>There’s nothing on the bench right now. I built the room first, on purpose: it’s easier to finish a small thing when it already has somewhere to sit.</p>
        <p>Whatever lands here next will be little, self-contained, and probably not done. That’s the point of a bench.</p>
        <p class="workshop-note__signature">— Seth</p>
      </div>
    ) : (
      <ol class="exhibit-list">
        {EXHIBITS.map((exhibit) => {
          const Exhibit = exhibit.component;
          return (
            <li class="exhibit" id={exhibitAnchorId(exhibit.id)}>
              <h2>{exhibit.title}</h2>
              <p class="exhibit__blurb">{exhibit.blurb}</p>
              <div class="exhibit__stage">
                <Exhibit />
              </div>
            </li>
          );
        })}
      </ol>
    )
  }
</BaseLayout>
```

`width` is left at its `'prose'` default (no `width` attribute). Scoped `<style>` in this page only,
every value a `var(--…)` reference to an existing semantic token — `.workshop-note` and `.exhibit`
as cards (`--color-surface`, `--border-thin` + `--color-border`, `--radius-md`, `--shadow-sm`,
`--space-md` padding), `.workshop-note__signature` and `.exhibit__blurb` in `--color-text-muted` at
`--text-sm`, `.exhibit-list` a `list-style: none; padding: 0` flex column with `gap: var(--space-md)`,
`.exhibit h2` at `--text-lg`, `.exhibit__stage` separated by `border-block-start: var(--border-thin)
solid var(--color-border)` and `padding-block-start: var(--space-sm)`. No new token, no edit to
`global.css` or `tokens.css`, no raw colour or length anywhere.

### `src/layouts/BaseLayout.astro` — the only permitted edit

Add one optional prop, one destructured default, and one conditional element. Three lines total;
everything else in the file stays byte-identical.

```ts
export interface Props {
  /** Page-specific title. Composed with SITE_TITLE for <title>. Required. */
  title: string;
  /** Meta description. Falls back to SITE_DESCRIPTION when omitted/blank. */
  description?: string;
  /** Main content column width. 'prose' = --layout-prose-width, 'wide' = --layout-max-width. */
  width?: 'prose' | 'wide';
  /** Extra class names appended to the <body> class attribute. */
  bodyClass?: string;
  /** When true, emit a robots meta tag keeping the page out of search results. Default false. */
  noindex?: boolean;
}

const { title, description, width = 'prose', bodyClass, noindex = false } = Astro.props;
```

In `<head>`, immediately after the existing `<meta name="description" … />` and before the RSS
`<link rel="alternate" …>`:

```astro
{noindex && <meta name="robots" content="noindex, nofollow" />}
```

Because `noindex` defaults to `false` and every existing caller omits it, the rendered `<head>` of
`/`, `/about/`, `/research/`, `/teaching/`, `/projects/**`, `/blog/**` and `/contact/` is unchanged.
This extension is now folded into `specs/layout-design-system.spec.md` — Props block, required
document structure, Behavior #42–#44, one Errors row, two Boundaries rows, Invariant 14 — so that
document describes what `BaseLayout` actually is. Where the two specs describe the same element they
must agree; that one is the layout's contract of record, this one is the hidden page's.

### Adding an exhibit later — the exact steps

1. Create `src/components/workshop/<kebab-name>.astro`. It takes **no props** (declare no `Props`
   interface), ships no `<script>`, and styles itself in a scoped `<style>` using semantic tokens.
2. In `src/lib/workshop-registry.ts`, add one import line and one array entry:

```ts
import type { Exhibit } from './workshop';
import KebabName from '../components/workshop/<kebab-name>.astro';

export const EXHIBITS: readonly Exhibit[] = [
  {
    id: 'kebab-name',
    title: 'Kebab Name',
    blurb: 'One or two sentences about what it is.',
    component: KebabName,
  },
];
```

No third file is touched — not the page, not the layout, not `consts.ts`, not the styles. The new
exhibit renders last, after any entries declared above it.

### Test setup

Runner is the existing Vitest 5 via `npm test`; tests live in `tests/*.test.ts`. A test file imports
exactly this and nothing else from the repo:

```ts
import {
  EXHIBIT_ID_PATTERN,
  assertUniqueExhibitIds,
  exhibitAnchorId,
  isExhibitId,
  type Exhibit,
  type ExhibitComponent,
} from '../src/lib/workshop';
```

Build `Exhibit` fixtures from a stub component, e.g.
`const stub: ExhibitComponent = () => null;` then
`const exhibit = (id: string): Exhibit => ({ id, title: 'T', blurb: 'B', component: stub });`.
Do **not** import `src/lib/workshop-registry.ts`, any `.astro` file, or `astro:*` from a test: the
registry is importable today only because it is empty, and will import `.astro` the day an exhibit
lands.

## Behavior

Rows 1–22 are Vitest cases. Rows 23–33 are review criteria verified by `npm run build`, `npm run
check` and loading the page — this is presentation, and per `CLAUDE.md` adjudication is off.

| # | input | expected output | notes |
|---|---|---|---|
| 1 | `isExhibitId('clock')` | `true` | simple slug |
| 2 | `isExhibitId('sorting-visualizer')` | `true` | single hyphen joins runs |
| 3 | `isExhibitId('a-b-c-d')` | `true` | any number of segments |
| 4 | `isExhibitId('9-lives')` | `true` | digits allowed, may lead |
| 5 | `isExhibitId('Clock')` | `false` | uppercase rejected, no lowercasing |
| 6 | `isExhibitId('two words')` | `false` | space rejected |
| 7 | `isExhibitId('trailing-')` | `false` | |
| 8 | `isExhibitId('-leading')` | `false` | |
| 9 | `isExhibitId('double--hyphen')` | `false` | single hyphens only |
| 10 | `isExhibitId('')` | `false` | |
| 11 | `isExhibitId(' clock ')` | `false` | no trimming |
| 12 | `isExhibitId('clock_two')` / `isExhibitId('clock.two')` / `isExhibitId('clock/two')` | `false` / `false` / `false` | only `[a-z0-9-]` |
| 13 | `isExhibitId('clöck')` / `isExhibitId('时钟')` / `isExhibitId('clock-😀')` | `false` / `false` / `false` | ASCII only |
| 14 | `isExhibitId(null)` / `(undefined)` / `(42)` / `({})` / `(['clock'])` | `false` × 5 | guard takes `unknown` |
| 15 | `EXHIBIT_ID_PATTERN.test('clock')` called three times in a row | `true`, `true`, `true` | no `g` flag, `lastIndex` never advances |
| 16 | `exhibitAnchorId('clock')` | `'exhibit-clock'` | |
| 17 | `exhibitAnchorId('sorting-visualizer')` | `'exhibit-sorting-visualizer'` | |
| 18 | `exhibitAnchorId('9-lives')` | `'exhibit-9-lives'` | |
| 19 | `assertUniqueExhibitIds([])` | returns `undefined`, throws nothing | empty registry is legal |
| 20 | `assertUniqueExhibitIds([exhibit('a')])` | returns `undefined` | |
| 21 | `assertUniqueExhibitIds([exhibit('a'), exhibit('b'), exhibit('c')])` | returns `undefined` | distinct ids |
| 22 | `const xs = [exhibit('b'), exhibit('a')]; assertUniqueExhibitIds(xs)` | `xs` still has ids `['b','a']` and the same element references | never sorts or mutates |
| 23 | `npm run build` | exit 0; `dist/workshop/index.html` exists | static route, trailing-slash URL `/workshop/` |
| 24 | `dist/workshop/index.html` `<head>` | contains `<meta name="robots" content="noindex, nofollow">` exactly once | the hidden-room requirement |
| 25 | `dist/index.html`, `dist/about/index.html`, `dist/projects/index.html`, `dist/blog/index.html` | contain no `name="robots"` substring at all | default `false` leaves other pages untouched |
| 26 | `dist/workshop/index.html` `<title>` | `Workshop · Seth Jones` | separator is space + U+00B7 + space |
| 27 | `dist/workshop/index.html` body | exactly one `<h1>` whose text is `Workshop`; no `<h2>` | nothing on the bench |
| 28 | `dist/workshop/index.html` | contains one `div.workshop-note` holding three `<p>`, the last `p.workshop-note__signature` with text `— Seth`; contains no `ol.exhibit-list` and no `li.exhibit` | empty state is a note, not a placeholder |
| 29 | `dist/workshop/index.html` | contains no `<script` and no `href="/workshop/"` outside its own `<link rel="icon">`/nav markup — i.e. the nav renders the `NAV_ITEMS` links and no extra one | not linked, no client JS |
| 30 | grep `workshop` across `dist/**/*.html` other than `dist/workshop/` | no match | reachable only by typing the URL |
| 31 | `dist/workshop/index.html` nav | no `.site-nav__link` carries `is-active` or `aria-current` | `/workshop/` matches no `NAV_ITEMS` href, including `/` |
| 32 | `dist/rss.xml` | contains no `/workshop/` link | feed is blog-only and stays so |
| 33 | `npm run check` | exit 0, zero errors and zero warnings | TypeScript strict clean |

## Errors

| condition | exception type | message contract |
|---|---|---|
| `exhibitAnchorId('')` | `TypeError` | exactly `exhibitAnchorId: invalid exhibit id ""` |
| `exhibitAnchorId('Clock')` | `TypeError` | exactly `exhibitAnchorId: invalid exhibit id "Clock"` |
| `exhibitAnchorId(' clock ')` | `TypeError` | exactly `exhibitAnchorId: invalid exhibit id " clock "` |
| `exhibitAnchorId('double--hyphen')` | `TypeError` | exactly `exhibitAnchorId: invalid exhibit id "double--hyphen"` |
| `exhibitAnchorId(null as unknown as string)` | `TypeError` | exactly `exhibitAnchorId: invalid exhibit id "null"` — the guard runs before any string method, and the value is interpolated via `String(id)` |
| `exhibitAnchorId(undefined as unknown as string)` | `TypeError` | exactly `exhibitAnchorId: invalid exhibit id "undefined"` |
| `assertUniqueExhibitIds([exhibit('clock'), exhibit('clock')])` | `TypeError` | exactly `assertUniqueExhibitIds: duplicate exhibit id "clock"` |
| `assertUniqueExhibitIds([exhibit('a'), exhibit('b'), exhibit('a'), exhibit('b')])` | `TypeError` | exactly `assertUniqueExhibitIds: duplicate exhibit id "a"` — first repeat in declaration order, not the last |
| a registry entry missing `id`, `title`, `blurb` or `component`, or with `component` set to a non-function | `astro check` diagnostic, `npm run check` exits 1 | assert on exit code and the missing property name, not on TypeScript's wording. Review-only; not a Vitest case |
| a registry entry whose `id` fails `EXHIBIT_ID_PATTERN` | `npm run build` exits non-zero with the `exhibitAnchorId` `TypeError` above, raised while rendering the page | there is no silent fallback id. Review-only |
| an exhibit component file that does not exist | build-time Vite/Astro import failure, `npm run build` exits non-zero | message names the unresolved path. Review-only |

`assertUniqueExhibitIds` does **not** validate id syntax — only uniqueness. Syntax is enforced by
`exhibitAnchorId` during render. Both failures stop the build, which is the whole point.

## Boundaries

| boundary | answer |
|---|---|
| empty registry | The shipped state. `EXHIBITS` is `[]`, `assertUniqueExhibitIds([])` returns `undefined` (Behavior 19), and the page renders the note (Behavior 28). Test the function; verify the page by build. |
| single entry | `assertUniqueExhibitIds([one])` returns `undefined`. The page would render one `li.exhibit`. Test the function only — no exhibit ships, so the list branch is review-only and currently unexercised. |
| empty string id | `isExhibitId('') === false`; `exhibitAnchorId('')` throws. Test both. |
| zero / negative / numeric inputs | No function in this feature takes a number. Undefined, do not test. |
| max — id length | Uncapped. `isExhibitId('a'.repeat(200)) === true` and `exhibitAnchorId('a'.repeat(200)) === 'exhibit-' + 'a'.repeat(200)`. Test. |
| max — registry size | Uncapped, no pagination. `assertUniqueExhibitIds` over 500 distinct ids returns `undefined`. Test if convenient. |
| unicode in ids | Rejected — Behavior 13. Test. |
| unicode in `title` / `blurb` | Accepted and rendered verbatim (Astro escapes HTML for you); `'Ω 😀'` and `'<b>x</b>'` are legal field values. No exhibit ships, so this is a type-level statement: **do not test**. |
| null / undefined to `isExhibitId` | Behavior 14 → `false`. Test. |
| null / undefined to `exhibitAnchorId` | Errors table → `TypeError` with the `String(id)` message. Test. |
| null / undefined / non-array to `assertUniqueExhibitIds` | The parameter is typed `readonly Exhibit[]`. Undefined, do not test. |
| duplicate ids | Errors table → `TypeError` naming the first repeat. Test. |
| duplicate `title` or `blurb` across entries | Legal, no check, no warning. Nothing to test. |
| unordered input | There is no ordering step anywhere: render order is array order, and `assertUniqueExhibitIds` neither sorts nor reorders (Behavior 22). Test the non-mutation; the render order is review-only. |
| `noindex` passed explicitly as `false` | Identical to omitting it — no `robots` meta. Review-only (no page does this); contracted in `specs/layout-design-system.spec.md` Behavior #43. |
| a page passing both `noindex` and `width="wide"` | Independent props, no interaction. Undefined, do not test. |

## Invariants

1. `isExhibitId(x)` is exactly `typeof x === 'string' && EXHIBIT_ID_PATTERN.test(x)` for every
   input — no trimming, casing, or normalisation ever changes the answer.
2. For every `id` where `isExhibitId(id)` is `true`, `exhibitAnchorId(id) === 'exhibit-' + id`; for
   every other value it throws `TypeError`. There is no third outcome and no fallback id.
3. `exhibitAnchorId` and `isExhibitId` are pure: same input, same output, no I/O, no state.
4. `assertUniqueExhibitIds` returns `undefined` or throws; it never mutates, reorders, copies back
   into, or reads anything beyond each element's `id`.
5. Rendered exhibit order equals `EXHIBITS` order positionally, for any registry length. No sort
   function exists in this feature.
6. Every `id` attribute the page emits is unique within the document, because
   `assertUniqueExhibitIds` runs before any rendering.
7. `src/lib/workshop.ts` contains no `import`, no `require`, and no reference to `process`, `fs`,
   `Astro`, or `import.meta`. **Review-only** — reading the module text from a test would need
   `node:fs`, which this spec's test contract forbids.
8. Adding an exhibit touches exactly two files: one new `.astro` component and
   `src/lib/workshop-registry.ts`. Any design that requires editing the page, the layout, the
   styles, or `consts.ts` to add an exhibit fails this spec.
9. The site still ships zero client-side JavaScript: no `<script>` in the new page or in any exhibit
   component, no framework integration, no hydration directive.
10. Every colour, space, size, radius, border and shadow value in the CSS this feature adds is a
    `var(--…)` reference to an existing semantic token. No literal, no new token, no `tokens.css` or
    `global.css` edit.
11. `/workshop/` has no inbound link anywhere in `dist/`, and `NAV_ITEMS` contains no entry for it.
    The nav's length is owned by whichever spec last added a page — it is eight since
    `specs/reading.spec.md` — so this invariant counts `/workshop/` entries, not nav entries.

## Non-goals

- **The way in.** No bookshelf, no `/reading/` page, no easter-egg unlock, no keyboard sequence, no
  hover trick, no `localStorage` flag. That is issue #18, which will consume `EXHIBITS` and this
  page's URL and must not need either changed. Whether the unlock leaves a crawler-visible link is
  that issue's criterion, not this one's.
- Any actual exhibit. `src/components/workshop/` may be created empty or not at all; no demo, no
  "hello world" exhibit, no commented-out sample entry beyond the comment quoted in the registry.
- A nav entry, a footer link, a "secret" hint, or any inbound link from another page.
- `robots.txt`, a sitemap, canonical links, Open Graph, or any SEO metadata beyond the one `robots`
  meta this spec adds — consistent with the Non-goals of `specs/layout-design-system.spec.md`.
- Per-exhibit pages or permalinks (`/workshop/<id>/`), an exhibit content collection, MDX, tags,
  filtering, sorting, search, or an RSS feed for exhibits.
- Client-side JavaScript, a framework integration (`@astrojs/react` et al.), an iframe sandbox, or
  any new npm dependency.
- Runtime validation of `title`/`blurb` length or content. "Short blurb" is a convention (aim for
  ≤ 160 characters), enforced by review, not by code.
- Tests that import `.astro` files, `astro:*` modules, `src/lib/workshop-registry.ts`, or `dist/**`,
  or that run a build.
- Any change to the seven existing pages, the header, the footer, the tokens, or `global.css`.

## Open questions

1. **Page copy — open, with Seth.** The `<h1>`, the intro sentence, the two note paragraphs, the
   `— Seth` signature and the `description` string are drafted in the voice of the existing About
   page and await his approval. Ship them exactly as written above so the build stays verifiable;
   expect a wording pass later, which changes nothing but those literals and Behavior rows 26–28.

Settled — recorded here so the decisions are not relitigated:

2. **Closed — `noindex, nofollow` stands.** The whole room is meant to be invisible to crawlers,
   including whatever an exhibit eventually links out to. Note that `noindex` is a request, not
   access control: the page is public to anyone with the URL, and nothing here hides it from a
   crawler that ignores the directive.
3. **Closed — `ExhibitComponent` stays `(props: any) => any`.** It accepts every shape `astro check`
   infers for an `.astro` default export in both directions under `strictFunctionTypes`. This
   resolves at implementation time against the installed `astro ^7.3.2`: if `astro check` rejects
   `<Exhibit />` for a value of that type, the fallback is
   `import type { AstroComponentFactory } from 'astro/runtime/server/index.js';` plus
   `export type ExhibitComponent = AstroComponentFactory;` — a type-only import, erased at runtime,
   so Vitest still loads `src/lib/workshop.ts` without Astro. The module path, the export names and
   every runtime behaviour stay identical either way, which is what the blind test suite depends on.
   Flag which form shipped in the verification record.
4. **Closed — the registry stays at `src/lib/workshop-registry.ts`.** It matches the house
   `projects.ts` / `projects-schema.ts` split. It will be the first `src/lib/` module to import
   `.astro`; that is accepted, and is exactly why the pure module is separate.
5. **Closed — `specs/layout-design-system.spec.md` has been amended.** The `noindex?: boolean` prop
   with its `false` default, the conditional `<meta name="robots">` in its exact head position,
   Behavior #42–#44, one Errors row, two Boundaries rows and Invariant 14 are now in that document,
   and no existing row was weakened. Its Behavior #43 asserts explicitly that every page omitting
   the prop emits no `robots` element at all. That spec is the contract of record for `BaseLayout`.
6. **Closed — the column stays `'prose'`, with no opt-in width field.** An exhibit that genuinely
   needs the 72rem column is a decision for the first real exhibit: switch the page to
   `width="wide"` then, or add a field to `Exhibit` then. Nothing speculative now, and Invariant 8
   stands as written until that day.
