# Layout & Design System

Issue: personal-website #1 — "Scaffold Astro site with layout and design system"

## Purpose

The repository already contains a working Astro minimal scaffold (`astro.config.mjs` with an empty
`defineConfig({})`, `package.json` with `astro ^7.3.2` and the `dev`/`build`/`preview`/`astro`
scripts, `tsconfig.json` extending `astro/tsconfigs/strict`, and a single standalone
`src/pages/index.astro` that hand-rolls its own `<html>` document). This feature replaces that
one-off page shell with a shared base layout and a single-source-of-truth design token layer, so
that every present and future page renders inside the same header/nav/main/footer structure and
draws every colour, type size, and spacing value from named CSS custom properties. The visual
target is professional but warm: warm-grey neutrals rather than blue-grey, a deep teal accent with
a clay counter-accent, a serif display face against a sans body face, generous line height and
vertical rhythm, and a comfortable reading measure. It must render correctly in both light and dark
colour schemes, stay readable with no horizontal scroll at a 400px viewport, and ship zero
client-side JavaScript. (Zero client JS was the contract for issue #1. Issue #18,
`specs/workshop-unlock.spec.md`, later added the site's only scripts, confined to `SiteNav` and the
`/reading/` shelf; see Invariant 10.)

## Public API

Presentation feature: the "API" is the file/component/token contract below. Everything named here
is required, with these exact paths, names, and spellings.

### Files to create

```
src/consts.ts
src/styles/tokens.css
src/styles/global.css
src/layouts/BaseLayout.astro
src/components/SiteHeader.astro
src/components/SiteNav.astro
src/components/SiteFooter.astro
```

### Files to modify

```
src/pages/index.astro   (rewrite to consume BaseLayout)
package.json            (name, "check" script, devDependencies)
README.md               (replace Astro template boilerplate)
```

### Files to leave untouched

```
astro.config.mjs
tsconfig.json
src/assets/seth-ucf-grad.jpg
.gitignore
```

The scaffold favicons were on this list for the scope of issue #1. They left it later: the site
icon is now the UCF Pegasus mark, cropped square from `src/assets/ucf-mark.png`. `public/favicon.svg`
(the Astro template logo) is deleted, `public/favicon.ico` is regenerated, and
`public/favicon-32.png`, `public/favicon-192.png` and `public/apple-touch-icon.png` are added. See
the head structure below.

### `src/consts.ts`

```ts
export interface NavItem {
  readonly href: string;
  readonly label: string;
}

export interface FooterLink {
  readonly href: string;
  readonly label: string;
}

export const SITE_TITLE: string = 'Seth Jones';
export const SITE_DESCRIPTION: string =
  'Seth Jones is a PhD student in Computer Science at the University of Central Florida, researching software engineering for AI at SAIL@UCF.';
export const SITE_AUTHOR: string = 'Seth Jones';
export const SITE_AFFILIATION: string =
  'PhD student in Computer Science, University of Central Florida';
export const TITLE_SEPARATOR: string = ' · '; // space, U+00B7 MIDDLE DOT, space

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/about/', label: 'About' },
  { href: '/research/', label: 'Research' },
  { href: '/teaching/', label: 'Teaching' },
  { href: '/projects/', label: 'Projects' },
  { href: '/blog/', label: 'Blog' },
  { href: '/contact/', label: 'Contact' },
];

export const FOOTER_LINKS: readonly FooterLink[] = [];
```

Notes:
- `NAV_ITEMS` order is the contract; rendered order must equal array order.
- Only `/` currently exists as a route. The other six are intentional dead links until later
  issues add the pages; do not create placeholder pages for them and do not add `rel="nofollow"`
  or `aria-disabled`.
- `FOOTER_LINKS` ships empty. Do not invent URLs (see Open questions).
- `NAV_ITEMS` has eight entries, `/reading/` having been added between Blog and Contact by
  `specs/reading.spec.md`. Contact stays last. `/workshop/` (`specs/workshop.spec.md`) is
  deliberately absent from it and is linked from nowhere in built HTML; that is not an omission to
  correct. The `Workshop` item an unlocked visitor sees is appended at runtime by
  `specs/workshop-unlock.spec.md`, not declared here.

### `src/layouts/BaseLayout.astro`

```ts
// frontmatter
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
```

Defaults: `description` → `SITE_DESCRIPTION`, `width` → `'prose'`, `bodyClass` → `undefined`,
`noindex` → `false`.
Children are projected through a single default `<slot />` inside `<main>`. No named slots.

Required document structure (exact attribute values; attribute order is not contracted):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content={Astro.generator} />
    <link rel="icon" href="/favicon.ico" sizes="16x16 32x32" />
    <link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32" />
    <link rel="icon" type="image/png" href="/favicon-192.png" sizes="192x192" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <title><!-- composed, see Behavior #1-#4 --></title>
    <meta name="description" content="<!-- resolved, see Behavior #5-#7 -->" />
    <!-- emitted ONLY when noindex is true; see Behavior #42-#44 -->
    <meta name="robots" content="noindex, nofollow" />
  </head>
  <body class="<!-- 'site' plus optional bodyClass -->">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader currentPath={Astro.url.pathname} />
    <main id="main-content" class="site-main container <!-- 'prose' when width==='prose' -->">
      <slot />
    </main>
    <SiteFooter />
  </body>
</html>
```

- `global.css` is imported exactly once, in `BaseLayout.astro` frontmatter:
  `import '../styles/global.css';`. No other file imports it.
- `BaseLayout` must not render an `<h1>`; pages own their `<h1>`.
- No `<script>` tag of any kind in `BaseLayout.astro` itself. The site's only scripts live in
  `SiteNav.astro` and `src/pages/reading.astro` (`specs/workshop-unlock.spec.md`); the nav script
  reaches every page through `SiteHeader` → `SiteNav`, not through the layout.
- The `robots` meta is written as `{noindex && <meta name="robots" content="noindex, nofollow" />}`
  and sits immediately after the description meta. Because `noindex` defaults to `false` and every
  page except `/workshop/` omits the prop, the emitted `<head>` of every other page is unchanged
  from the pre-`noindex` contract — no empty attribute, no `content="undefined"`, no element at all
  (Behavior #43). Introduced by `specs/workshop.spec.md`; that spec owns the hidden page, this one
  owns the layout prop.
- The head listing above does not enumerate the
  `<link rel="alternate" type="application/rss+xml">` that `specs/blog.spec.md` later added to the
  layout; where both are present the `robots` meta precedes it. That omission is scope, not a
  contradiction — neither element's contract is restated here.

### `src/components/SiteHeader.astro`

```ts
export interface Props {
  /** Current URL pathname, e.g. '/about/'. Required. */
  currentPath: string;
}
```

Renders `<header class="site-header">` containing a `.container` wrapper with:
1. one home link `<a class="site-header__brand" href="/">` holding exactly two element children,
   in order: `<span class="site-header__mark">` wrapping a single `astro:assets` `<Image>` of the
   UCF Pegasus mark, then `<span class="site-header__name">` whose text is `SITE_TITLE`,
2. `<SiteNav currentPath={currentPath} />`.

The brand anchor is the shipped markup below. It requires the two frontmatter imports shown; the
image asset `src/assets/ucf-mark.png` is part of the header contract, not an optional decoration —
removing the mark or splitting it into a second link is a contract violation.

```astro
---
import { Image } from 'astro:assets';
import { SITE_TITLE } from '../consts';
import SiteNav from './SiteNav.astro';
import ucfMark from '../assets/ucf-mark.png';
---
    <a class="site-header__brand" href="/">
      <span class="site-header__mark">
        <Image
          src={ucfMark}
          alt=""
          width={24}
          densities={[1, 2]}
          format="webp"
          quality={90}
          loading="eager"
          decoding="async"
        />
      </span>
      <span class="site-header__name">{SITE_TITLE}</span>
    </a>
```

The `<Image>` carries no class and no CSS targets it; `alt=""` is deliberate (the mark is
decorative, so the anchor's accessible name stays exactly `Seth Jones`). The emitted `<img>` has
`width="24" height="32"` — `astro:assets` derives the height from the 231×310 intrinsic ratio, and
those numeric attributes are required by `astro:assets`, so they are markup, not style values, and
are outside the "no literals" rules of Behavior #31 and Invariant 5. Full contract for the mark,
including the light/dark plate and its two tokens: `specs/header-ucf-mark.spec.md`.

### `src/components/SiteNav.astro`

```ts
export interface Props {
  /** Current URL pathname, e.g. '/about/'. Required. */
  currentPath: string;
}
```

Renders:

```html
<nav class="site-nav" aria-label="Main">
  <ul class="site-nav__list">
    <li class="site-nav__item">
      <a class="site-nav__link" href="/">Home</a>
    </li>
    <!-- active item additionally gets class "site-nav__link is-active" and aria-current="page" -->
  </ul>
</nav>
```

One `<li>` per entry of `NAV_ITEMS`, in array order. Exactly zero or one link carries
`aria-current="page"`. Active matching is specified in Behavior #8–#16.

`SiteNav.astro` also carries one processed `<script>` (no attributes), added by
`specs/workshop-unlock.spec.md`, which is its contract of record. The markup above is unchanged and
still fully server-rendered: the built HTML of every page holds exactly `NAV_ITEMS.length` items. At
runtime, and only when the workshop unlock flag is stored in `localStorage`, the script appends
exactly one more `li.site-nav__item > a.site-nav__link[href="/workshop/"]` as the list's last item.
With JavaScript disabled or the flag absent, nothing is appended.

### `src/components/SiteFooter.astro`

No props (`interface Props` may be omitted). Renders:

```html
<footer class="site-footer">
  <div class="container">
    <p class="site-footer__line">© 2026 Seth Jones</p>
    <p class="site-footer__line site-footer__affiliation">
      PhD student in Computer Science, University of Central Florida
    </p>
    <!-- <ul class="site-footer__links"> rendered ONLY when FOOTER_LINKS.length > 0 -->
  </div>
</footer>
```

- Year is `new Date().getFullYear()` evaluated at build time; the literal `©` character (U+00A9),
  then a single space, then `SITE_AUTHOR`.
- Second line text is `SITE_AFFILIATION` verbatim.

### `src/pages/index.astro`

Rewritten to:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Seth Jones">
  <h1>Seth Jones</h1>
  <p>…one short intro paragraph…</p>
</BaseLayout>
```

Exactly one `<h1>`. Real home-page content (photo, research summary, CTAs) is a later issue —
keep this to one heading and one paragraph, and do not reference
`src/assets/seth-ucf-grad.jpg`.

### `package.json` changes

- `"name"`: `"astro-scaffold"` → `"personal-website"`.
- Add script: `"check": "astro check"`.
- Add devDependencies `@astrojs/check` and `typescript` (version ranges resolved by npm).
- Do not change `"type"`, `"engines"`, `"allowScripts"`, or the existing four scripts.

### CSS custom properties

Two layers, both declared in `src/styles/tokens.css`, which contains **only** `:root` rules and one
`@media (prefers-color-scheme: dark)` block — no element or class selectors.

**Layer 1 — primitives.** Declared exactly once, in `:root`. Identical in light and dark; never
overridden.

| Token | Value |
|---|---|
| `--font-sans` | `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` |
| `--font-serif` | `'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, 'Times New Roman', serif` |
| `--font-mono` | `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace` |
| `--text-xs` | `0.8125rem` |
| `--text-sm` | `0.9375rem` |
| `--text-base` | `1.0625rem` |
| `--text-lg` | `1.25rem` |
| `--text-xl` | `clamp(1.5rem, 1.2rem + 1.2vw, 1.875rem)` |
| `--text-2xl` | `clamp(1.875rem, 1.4rem + 2vw, 2.5rem)` |
| `--text-3xl` | `clamp(2.25rem, 1.6rem + 3vw, 3.25rem)` |
| `--leading-tight` | `1.15` |
| `--leading-snug` | `1.3` |
| `--leading-normal` | `1.65` |
| `--leading-loose` | `1.8` |
| `--weight-regular` | `400` |
| `--weight-medium` | `500` |
| `--weight-semibold` | `600` |
| `--weight-bold` | `700` |
| `--tracking-tight` | `-0.015em` |
| `--tracking-normal` | `0em` |
| `--tracking-wide` | `0.06em` |
| `--space-3xs` | `0.25rem` |
| `--space-2xs` | `0.5rem` |
| `--space-xs` | `0.75rem` |
| `--space-sm` | `1rem` |
| `--space-md` | `1.5rem` |
| `--space-lg` | `2rem` |
| `--space-xl` | `3rem` |
| `--space-2xl` | `4.5rem` |
| `--space-3xl` | `6rem` |
| `--layout-max-width` | `72rem` |
| `--layout-prose-width` | `42rem` |
| `--layout-gutter` | `clamp(1rem, 0.5rem + 2.5vw, 2rem)` |
| `--radius-sm` | `0.25rem` |
| `--radius-md` | `0.5rem` |
| `--radius-lg` | `1rem` |
| `--radius-pill` | `999px` |
| `--border-thin` | `1px` |
| `--border-thick` | `2px` |
| `--duration-fast` | `120ms` |
| `--duration-base` | `200ms` |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0.2, 1)` |
| `--focus-ring-width` | `2px` |
| `--focus-ring-offset` | `3px` |
| `--z-header` | `10` |
| `--z-skip-link` | `100` |
| `--color-transparent` | `transparent` |
| `--color-white` | `#ffffff` |
| `--color-ink-50` | `#faf8f5` |
| `--color-ink-100` | `#f3efe8` |
| `--color-ink-200` | `#e6e0d5` |
| `--color-ink-300` | `#cfc7b9` |
| `--color-ink-400` | `#a89e8e` |
| `--color-ink-500` | `#80776a` |
| `--color-ink-600` | `#5c5449` |
| `--color-ink-700` | `#403a32` |
| `--color-ink-800` | `#2b2721` |
| `--color-ink-900` | `#1b1814` |
| `--color-ink-950` | `#12100d` |
| `--color-teal-100` | `#d7eef1` |
| `--color-teal-300` | `#6fc9d3` |
| `--color-teal-500` | `#2a8b97` |
| `--color-teal-700` | `#145c63` |
| `--color-teal-900` | `#0c3a3f` |
| `--color-clay-100` | `#f7e0d5` |
| `--color-clay-300` | `#e8a58c` |
| `--color-clay-500` | `#c4643f` |
| `--color-clay-700` | `#9a3f2b` |
| `--color-clay-900` | `#5f2619` |

**Layer 2 — semantic.** Every value is a `var()` reference to a Layer 1 token (the two shadow
tokens are the sole exception, see below). These are the only tokens components may reference for
colour. Light values live in `:root`; dark values live in the dark block.

| Token | Light value | Dark value |
|---|---|---|
| `--color-bg` | `var(--color-ink-50)` | `var(--color-ink-900)` |
| `--color-bg-subtle` | `var(--color-ink-100)` | `var(--color-ink-950)` |
| `--color-surface` | `var(--color-white)` | `var(--color-ink-800)` |
| `--color-text` | `var(--color-ink-800)` | `var(--color-ink-100)` |
| `--color-text-muted` | `var(--color-ink-600)` | `var(--color-ink-300)` |
| `--color-heading` | `var(--color-ink-900)` | `var(--color-ink-50)` |
| `--color-accent` | `var(--color-teal-700)` | `var(--color-teal-300)` |
| `--color-accent-strong` | `var(--color-teal-900)` | `var(--color-teal-100)` |
| `--color-text-on-accent` | `var(--color-ink-50)` | `var(--color-ink-950)` |
| `--color-highlight` | `var(--color-clay-700)` | `var(--color-clay-300)` |
| `--color-link` | `var(--color-teal-700)` | `var(--color-teal-300)` |
| `--color-link-hover` | `var(--color-clay-700)` | `var(--color-clay-300)` |
| `--color-link-visited` | `var(--color-teal-900)` | `var(--color-teal-100)` |
| `--color-border` | `var(--color-ink-200)` | `var(--color-ink-700)` |
| `--color-border-strong` | `var(--color-ink-500)` | `var(--color-ink-500)` |
| `--color-focus-ring` | `var(--color-clay-700)` | `var(--color-clay-300)` |
| `--color-code-bg` | `var(--color-ink-100)` | `var(--color-ink-800)` |
| `--color-selection-bg` | `var(--color-teal-100)` | `var(--color-teal-900)` |
| `--color-selection-text` | `var(--color-ink-900)` | `var(--color-ink-50)` |
| `--color-mark-plate` | `var(--color-transparent)` | `var(--color-ink-50)` |
| `--shadow-sm` | `0 1px 2px rgba(28, 25, 20, 0.06), 0 1px 3px rgba(28, 25, 20, 0.08)` | `0 1px 2px rgba(0, 0, 0, 0.5)` |
| `--shadow-md` | `0 2px 4px rgba(28, 25, 20, 0.06), 0 8px 24px rgba(28, 25, 20, 0.1)` | `0 8px 24px rgba(0, 0, 0, 0.6)` |

**Dark scheme mechanism.** Exactly this shape:

```css
:root {
  color-scheme: light dark;
  /* primitives + light semantic values */
}

@media (prefers-color-scheme: dark) {
  :root {
    /* the 30 semantic tokens above, re-declared with their dark values */
  }
}
```

Only the 30 semantic tokens appear inside the dark block. Re-declaring the semantic *mapping* in
that one media block is required and is not a violation of "tokens defined once" — the primitive
values and the token names each exist in exactly one place. There is no `data-theme` attribute, no
theme toggle, and no JavaScript colour-scheme handling in this issue.

### Global stylesheet contract — `src/styles/global.css`

First line, exactly: `@import './tokens.css';`

Must define, using `var()` tokens for every colour, size, and space value:
- `*, *::before, *::after { box-sizing: border-box; }`
- Reset of default margins on `body, h1, h2, h3, h4, p, ul, ol, figure, blockquote, dl, dd`.
- `html { -webkit-text-size-adjust: 100%; }`
- `body` — `background: var(--color-bg)`, `color: var(--color-text)`,
  `font-family: var(--font-sans)`, `font-size: var(--text-base)`,
  `line-height: var(--leading-normal)`, `overflow-wrap: break-word`, and
  `min-height: 100vh` with `display: flex; flex-direction: column` so the footer sits at the
  bottom of short pages. `body { overflow-x: hidden }` is forbidden.
- `h1, h2, h3, h4` — `font-family: var(--font-serif)`, `color: var(--color-heading)`,
  `line-height: var(--leading-tight)`, `letter-spacing: var(--tracking-tight)`,
  `font-weight: var(--weight-semibold)`. Sizes: `h1` → `--text-3xl`, `h2` → `--text-2xl`,
  `h3` → `--text-xl`, `h4` → `--text-lg`.
- `a` — `color: var(--color-link)`; `a:visited` → `--color-link-visited`; `a:hover` →
  `--color-link-hover`.
- `img, svg, video, canvas { max-width: 100%; height: auto; display: block; }`
- `pre { overflow-x: auto; }`, `code, pre, kbd, samp { font-family: var(--font-mono); }`,
  `code` background `var(--color-code-bg)`.
- `::selection { background: var(--color-selection-bg); color: var(--color-selection-text); }`
- `:focus-visible { outline: var(--focus-ring-width) solid var(--color-focus-ring); outline-offset: var(--focus-ring-offset); }`
- `@media (prefers-reduced-motion: reduce)` block forcing
  `animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;`
- `.container { width: 100%; max-width: var(--layout-max-width); margin-inline: auto; padding-inline: var(--layout-gutter); }`
- `.prose { max-width: var(--layout-prose-width); }` — when applied together with `.container`
  the narrower max-width wins (`.prose` declared after `.container`).
- `.site-main { flex: 1; padding-block: var(--space-xl) var(--space-2xl); }` and
  `.prose > * + * { margin-block-start: var(--space-md); }` for vertical rhythm.
- `.visually-hidden` — the standard 1px-clip pattern.
- `.skip-link` — visually hidden until `:focus`/`:focus-visible`, then positioned at the top-left
  of the viewport with `z-index: var(--z-skip-link)`, `background: var(--color-surface)`,
  `color: var(--color-text)`.
- `.site-header` — `position: static`, bottom border `var(--border-thin) solid var(--color-border)`,
  `padding-block: var(--space-sm)`; its `.container` is `display: flex; flex-wrap: wrap;
  align-items: center; justify-content: space-between; gap: var(--space-xs) var(--space-md)`.
- `.site-header__brand` — `display: inline-flex`, `align-items: center`, `gap: var(--space-2xs)`
  (the flex row that sets the mark beside the name and centres them on each other),
  `font-family: var(--font-serif)`, `font-size: var(--text-lg)`,
  `font-weight: var(--weight-semibold)`, `color: var(--color-heading)`, `text-decoration: none`.
  `.site-header__brand:visited` → `color: var(--color-heading)` and `.site-header__brand:hover` →
  `color: var(--color-link-hover)`, declared after the base rule (see Open question 8).
- `.site-header__mark` — `display: inline-flex`, `flex: none`, `padding: var(--space-3xs)`,
  `border-radius: var(--radius-sm)`, `background: var(--color-mark-plate)` (transparent in light,
  an `--color-ink-50` plate in dark). The plate lives on this wrapper, not on the `<img>`: the mark
  is fully opaque, and padding on an `<img>` carrying width/height hints would shrink it under the
  global border-box. No rule targets the `<img>` inside it — the global `img` rule derives its
  32px height from the intrinsic attributes. Contract: `specs/header-ucf-mark.spec.md`.
- `.site-nav__list` — `list-style: none; padding: 0; display: flex; flex-wrap: wrap;
  gap: var(--space-2xs) var(--space-sm)`.
- `.site-nav__link` — `font-size: var(--text-sm)`, `color: var(--color-text-muted)`,
  `text-decoration: none`; `:hover` → `var(--color-link-hover)`; `.is-active` →
  `color: var(--color-heading)` plus a visible indicator drawn with `--color-accent`.
- `.site-footer` — `background: var(--color-bg-subtle)`, top border
  `var(--border-thin) solid var(--color-border)`, `padding-block: var(--space-lg)`,
  `font-size: var(--text-sm)`, `color: var(--color-text-muted)`.

Scoped `<style>` blocks inside the four `.astro` components are permitted for component-local
tweaks, but every colour/size/space value in them must also be a `var(--…)` token reference.

## Behavior

`html(...)` = rendered HTML of the built page. Assertions are on the **parsed DOM** unless a row
says "raw"; Astro HTML-escapes interpolated values, so raw bytes may contain entities
(`&#38;`) where the parsed text has the character (`&`).

| # | input | expected output | notes |
|---|---|---|---|
| 1 | `<BaseLayout title="About">` | `document.title === 'About · Seth Jones'` | `title + TITLE_SEPARATOR + SITE_TITLE`; separator is U+00B7 with one space each side |
| 2 | `<BaseLayout title="Seth Jones">` | `document.title === 'Seth Jones'` | when `title.trim() === SITE_TITLE`, no separator, no duplication |
| 3 | `<BaseLayout title="">` | `document.title === 'Seth Jones'` | blank → bare `SITE_TITLE` |
| 4 | `<BaseLayout title="   ">` | `document.title === 'Seth Jones'` | whitespace-only treated as blank; composed titles use `title.trim()` |
| 5 | `<BaseLayout title="About">` (no `description`) | `<meta name="description">` content is exactly `SITE_DESCRIPTION` | the full sentence in `consts.ts` |
| 6 | `<BaseLayout title="About" description="Who I am.">` | meta description content `=== 'Who I am.'` | |
| 7 | `<BaseLayout title="About" description="  ">` | meta description content `=== SITE_DESCRIPTION` | blank falls back |
| 8 | `SiteNav currentPath="/"` | `/` link has `aria-current="page"` and class list containing `is-active`; the other 6 links have no `aria-current` | exactly one active |
| 9 | `SiteNav currentPath="/about/"` | `/about/` link active; `/` link not active | root never matches a sub-path |
| 10 | `SiteNav currentPath="/about"` | `/about/` link active | trailing slash normalised on both sides before comparing |
| 11 | `SiteNav currentPath="/blog/hello-world/"` | `/blog/` link active | descendant paths activate their section |
| 12 | `SiteNav currentPath="/blog-archive/"` | no link active | prefix match must respect segment boundaries, not raw `startsWith('/blog')` |
| 13 | `SiteNav currentPath="/nonexistent/"` | no link has `aria-current`; all 7 links still render | unknown route is not an error |
| 14 | `SiteNav currentPath=""` | no link has `aria-current`; all 7 links render | see Boundaries |
| 15 | `SiteNav currentPath="/About/"` | no link active | matching is case-sensitive |
| 16 | any `currentPath` | nav renders exactly 7 `<li>` with link text, in order: `Home, About, Research, Teaching, Projects, Blog, Contact`, and `href`s `/`, `/about/`, `/research/`, `/teaching/`, `/projects/`, `/blog/`, `/contact/` | order == `NAV_ITEMS` order |
| 17 | any page | exactly one `<header>`, one `<nav aria-label="Main">`, one `<main id="main-content">`, one `<footer>` in the document | landmark uniqueness |
| 18 | any page | first focusable element in DOM order is `a.skip-link` with `href="#main-content"` and text `Skip to content` | it precedes `<header>` |
| 19 | any page | `<html lang="en">` present; no `data-theme` attribute anywhere | |
| 20 | `<BaseLayout title="X">` (no `width`) | `<main>` class list contains `site-main`, `container`, and `prose` | default `width='prose'` |
| 21 | `<BaseLayout title="X" width="wide">` | `<main>` class list contains `site-main` and `container` but **not** `prose` | |
| 22 | `<BaseLayout title="X" bodyClass="home">` | `<body class>` contains both `site` and `home` | space-separated, `site` first |
| 23 | `<BaseLayout title="X">` (no `bodyClass`) | `<body class="site">` exactly | no trailing space, no `undefined` in the attribute |
| 24 | built `dist/index.html` | contains `<h1>` exactly once, and its text is `Seth Jones` | pages own the h1 |
| 25 | built `dist/index.html` | footer contains a `<p>` whose text matches `/^© \d{4} Seth Jones$/` and a `<p>` with text `PhD student in Computer Science, University of Central Florida` | year from build time |
| 26 | `FOOTER_LINKS` is `[]` | no `ul.site-footer__links` element in the footer | list is conditional |
| 27 | built output | every `<script>` element in emitted HTML is an Astro-processed `type="module"` script originating from `SiteNav.astro` (every page) or `src/pages/reading.astro` (`/reading/` only); any emitted `.js` asset is under `dist/_astro/`; no element carries an `on*=` handler attribute | client JS confined to the nav and the shelf (amended by `specs/workshop-unlock.spec.md`; was "no `<script>`, no `.js` asset") |
| 28 | built output | `dist/index.html` has exactly one stylesheet path — a single `<link rel="stylesheet">` and no `<style>` element — and no element carries an inline `style=` attribute; following that `href` (an emitted file under `dist/_astro/*.css`) yields a stylesheet whose text contains the `--color-` token declarations, e.g. `--color-bg:` | the bundle is ~7.3 kB, above Astro's inline threshold, so it is emitted as a linked stylesheet and `dist/index.html` itself contains **zero** occurrences of `--color-`. Do not assert `--color-` against the HTML; resolve the link and assert against the CSS file |
| 29 | `src/pages/index.astro` source | imports `../layouts/BaseLayout.astro` and its root element is `<BaseLayout>` | "applied by every page" — currently one page |
| 30 | `src/styles/tokens.css` source | every token name listed in Public API appears as a declaration; the 30 semantic names appear exactly twice (light `:root`, dark media block) and every primitive name appears exactly once as a declaration | grep-level check; the Layer 1 and Layer 2 tables above are the complete enumeration, including `--color-transparent` (primitive, once), `--color-mark-plate` (semantic, twice), the three `--shelf-spine-*` geometry primitives (once each) and the eight `--color-spine-*` tokens (semantic, twice each) from `specs/reading.spec.md` |
| 31 | any `src/components/*.astro`, `src/layouts/*.astro`, `src/pages/*.astro` source | no hex colour literal (`/#[0-9a-fA-F]{3,8}\b/`), no `rgb(`/`hsl(`, no `px` length except `1px`/`2px` borders already tokenised — i.e. colour and spacing only via `var(--…)` | tokens used, not duplicated. The `<Image>` intrinsic-size props in `SiteHeader.astro` (`width={24}`, and the `width`/`height` attributes `astro:assets` emits from it) are markup required by the image pipeline, not style values, and are exempt |
| 32 | `src/styles/global.css` source | contains no hex colour literal and no `rgb(`/`rgba(`/`hsl(` — all colour via `var(--color-…)` | the only raw `rgba()` in the project is inside the two shadow tokens in `tokens.css` |
| 33 | viewport 400px wide | `--layout-gutter` computes to `18px` (`0.5rem + 2.5vw` = 8px + 10px, inside the clamp range), leaving a 364px content box; nav wraps to multiple rows; `document.documentElement.scrollWidth <= 400` | no horizontal scroll |
| 34 | viewport 1280px wide | `--layout-gutter` clamps to its `2rem` maximum; `.prose` main column is 672px wide and horizontally centred | |
| 35 | `prefers-color-scheme: dark` | computed `--color-bg` resolves to `#1b1814` and `--color-text` to `#f3efe8` | dark mapping applied |
| 36 | `prefers-color-scheme: light` or no preference | computed `--color-bg` resolves to `#faf8f5` and `--color-text` to `#2b2721` | light is the default in `:root` |
| 37 | `npm run build` | exit code 0, no warnings about missing props or unresolved imports, `dist/index.html` emitted | |
| 38 | `npm run check` | exit code 0, `0 errors` reported | strict-mode TypeScript gate |
| 39 | `README.md` | contains the literal strings `npm run dev`, `npm run build`, `npm install`, `npm run preview`, and `localhost:4321`; contains no Astro-template text (`Astro Starter Kit`, `Seasoned astronaut`) | AC: commands documented |
| 40 | `package.json` | `name === 'personal-website'`; `scripts.check === 'astro check'`; `scripts.dev`, `scripts.build`, `scripts.preview`, `scripts.astro` unchanged | |
| 41 | `<BaseLayout title="Research & AI">` | parsed `document.title === 'Research & AI · Seth Jones'` | raw HTML may contain `&#38;`; assert on parsed text |
| 42 | `<BaseLayout title="X" noindex>` (or `noindex={true}`) | `<head>` contains exactly one `meta[name="robots"]`, and its `content` is exactly `noindex, nofollow` | the shorthand attribute is `true`; added by `specs/workshop.spec.md` |
| 43 | `<BaseLayout title="X">` (no `noindex`) and `<BaseLayout title="X" noindex={false}>` | `document.querySelector('meta[name="robots"]') === null`; the raw HTML contains no `robots` substring | the element is absent, not empty — every page except `/workshop/` is byte-identical to the pre-`noindex` head |
| 44 | built output | `dist/workshop/index.html` contains the row-42 meta; `dist/index.html`, `dist/about/index.html`, `dist/research/index.html`, `dist/teaching/index.html`, `dist/projects/index.html`, `dist/blog/index.html`, `dist/contact/index.html` contain no `name="robots"` | one opted-in page, and only by passing the prop |

## Errors

No component in this feature throws at runtime — all inputs either render or are prevented by the
type system. The error surface is compile-time.

| condition | exception type | message contract |
|---|---|---|
| `<BaseLayout />` with no `title` | `astro check` / `tsc` diagnostic, TypeScript error code `ts(2322)`, of the form `Property 'title' is missing in type '{}' but required in type 'Props'`; `npm run check` exits 1 | verified against `astro check` 0.9.10 with TypeScript 6.0.3; code and wording are toolchain-version-dependent (other TypeScript versions report `TS2741`/`TS2739` for this condition) — assert on exit code and the presence of the property name `title` in the output, not on exact wording |
| `<BaseLayout title={42} />` | `astro check` diagnostic `TS2322` | as above; `number`/`string` mention only |
| `<BaseLayout title="X" width="narrow" />` | `astro check` diagnostic `TS2322` | `width` is the literal union `'prose' \| 'wide'` |
| `<SiteNav />` or `<SiteHeader />` with no `currentPath` | `astro check` diagnostic `ts(2322)` (`Property 'currentPath' is missing … but required in type 'Props'`); exits 1 | same escape hatch as the missing-`title` row: assert on exit code and the property name `currentPath`, not on exact wording or code |
| `<BaseLayout title="X" description={null} />` | `astro check` diagnostic `TS2322` | `description` is `string \| undefined`, not nullable |
| unknown extra prop, e.g. `<BaseLayout title="X" foo="bar" />` | `astro check` diagnostic `TS2322`/`TS2559` | excess property check; do not add an index signature to silence it |
| `<BaseLayout title="X" noindex="yes" />` or `noindex={null}` | `astro check` diagnostic `TS2322`; `npm run check` exits 1 | `noindex` is `boolean \| undefined` — no string, no `null`, no `0`/`1`. Assert on exit code and the property name `noindex` |
| `<BaseLayout title="X" />` with `noindex` omitted | **no error** | defaults to `false`, no `robots` meta (Behavior #43) |
| `currentPath` is `''` or an unmatched path | **no error** | renders full nav with nothing active (Behavior #13, #14) |
| `FOOTER_LINKS` empty | **no error** | section omitted (Behavior #26) |
| import of a non-existent token, e.g. `var(--color-primary)` | **no build error** (CSS is not type-checked) | prevented by Behavior #30–#32 source checks instead |

## Boundaries

| boundary | answer |
|---|---|
| empty string `title=""` | Behavior #3 — renders bare `SITE_TITLE`. Test it. |
| whitespace-only `title="   "` | Behavior #4 — same as empty. Test it. |
| empty string `description=""` / `"  "` | Behavior #7 — falls back to `SITE_DESCRIPTION`. Test it. |
| empty `currentPath=""` | Behavior #14 — nav renders, nothing active. Test it. |
| empty `bodyClass=""` | Treated as absent: `<body class="site">`, no trailing space. Test it. |
| empty `FOOTER_LINKS` | Behavior #26 — no `ul` emitted. Test it (it is the shipped default). |
| empty page body (`<BaseLayout title="X" />` with no children) | Renders `<main id="main-content">` with no element children and no error. Test it. |
| empty `NAV_ITEMS` | Undefined, do not test. The array is a compile-time constant with 7 entries; an empty nav is not a supported configuration. |
| zero — no numeric inputs exist | Not applicable, do not test. |
| negative — no numeric inputs exist | Not applicable, do not test. |
| `noindex` omitted / `false` / `true` | All three answered by Behavior #43 and #42 — absent element, absent element, one `noindex, nofollow` meta. Test all three. There is no fourth state; the prop is a plain boolean with no string form. |
| `noindex` combined with any other prop (`width="wide"`, `bodyClass`, blank `description`) | Independent, no interaction: the robots meta neither changes nor is changed by them. Undefined, do not test. |
| minimum viewport | 400px is the contracted floor: Behavior #33. Below 320px, undefined, do not test. |
| maximum viewport | ≥ 1152px (`72rem`): `.container` stops growing, `.prose` stays 672px, content stays centred. Test at 1280px and 2560px for absence of horizontal scroll only. |
| very long unbroken token in content (e.g. a 200-character URL) | Must not cause horizontal scroll — `overflow-wrap: break-word` on `body`. Test at 400px. |
| unicode | Two cases, both testable: `TITLE_SEPARATOR` is U+00B7 and the footer uses U+00A9, and both must survive the build byte-identically (files are UTF-8, `<meta charset="utf-8">` present). A `title` containing non-ASCII or `&`/`<` must round-trip through parsed text (Behavior #41). |
| null / undefined props | `description`, `width`, `bodyClass`, `noindex` accept `undefined` (omission) and apply their defaults — test. Explicit `null` is a type error, not a runtime path — do not test runtime `null`. |
| duplicate `href` in `NAV_ITEMS` | Undefined, do not test — `NAV_ITEMS` has 7 distinct hrefs. If hrefs were duplicated, more than one link could go active; the "exactly one active" invariant is scoped to the shipped array. |
| unordered / reordered `NAV_ITEMS` | Render order must equal array order (Behavior #16). No alphabetical or other sort. Test order explicitly. |
| duplicate class names on `<body>` (`bodyClass="site"`) | Undefined, do not test. |
| missing route target (nav links to pages that do not exist yet) | Expected and correct for 6 of 7 links. Do not assert on HTTP status or link reachability for `/about/`, `/research/`, `/teaching/`, `/projects/`, `/blog/`, `/contact/`. |
| `prefers-reduced-motion: reduce` | Transitions/animations effectively disabled. Assert the media block exists; do not measure timing. |
| forced-colors / high-contrast mode | Undefined, do not test. |
| print stylesheet | Undefined, do not test. |

## Invariants

1. Every rendered page is produced by `BaseLayout`, and therefore contains exactly one
   `.skip-link`, one `<header>`, one `<nav aria-label="Main">`, one `<main id="main-content">`,
   and one `<footer>`, in that DOM order.
2. Exactly zero or one nav link carries `aria-current="page"`, for any `currentPath` string.
   `aria-current` and the `is-active` class always co-occur on the same element. This still holds
   after the runtime Workshop item of `specs/workshop-unlock.spec.md` is appended, because
   `/workshop/` matches no `NAV_ITEMS` href.
3. The number of rendered nav `<li>` elements in the built HTML equals `NAV_ITEMS.length` for every
   input. At runtime the workshop unlock (`specs/workshop-unlock.spec.md`) may append exactly one
   further item, never more, and never with JavaScript disabled.
4. `SiteNav` is pure in `currentPath`: same string in → byte-identical server-rendered markup out.
   The runtime Workshop item is not part of that markup.
5. No colour, font-size, spacing, radius, shadow, or duration value appears as a literal anywhere
   outside the Layer 1 primitive block in `tokens.css`. Components and `global.css` reference
   `var(--…)` only. (Three exceptions, all mandated by the contracts above: the `rgba()` literals
   inside `--shadow-sm`/`--shadow-md`; the `animation-duration: 0.01ms !important` /
   `transition-duration: 0.01ms !important` literals inside the
   `@media (prefers-reduced-motion: reduce)` block of `global.css`, which the global stylesheet
   contract requires verbatim — a token would defeat the purpose, since the point is to defeat the
   tokenised durations; and the `<Image>` intrinsic-size props in `SiteHeader.astro`, which are
   image-pipeline markup rather than style values, per Behavior #31.)
6. Every Layer 2 semantic token resolves to a Layer 1 primitive, in both schemes. No semantic token
   is defined in terms of another semantic token.
7. The set of semantic token names declared in the light `:root` is exactly equal to the set
   declared in the dark media block — no token is light-only or dark-only.
8. Contrast, computed from the literal token values, holds in both schemes:
   `--color-text` on `--color-bg` ≥ 7:1 (light 14.0:1, dark 15.4:1);
   `--color-text-muted` on `--color-bg` ≥ 4.5:1 (light 7.0:1, dark 10.6:1);
   `--color-link` on `--color-bg` ≥ 4.5:1 (light 7.2:1, dark 9.2:1);
   `--color-link-hover` on `--color-bg` ≥ 4.5:1 (light 6.4:1, dark 8.6:1);
   `--color-text-on-accent` on `--color-accent` ≥ 4.5:1 (light 7.2:1, dark 9.9:1);
   `--color-text-muted` on `--color-bg-subtle` ≥ 4.5:1 (light 6.5:1, dark 11.3:1);
   `--color-border-strong` and `--color-focus-ring` on `--color-bg` ≥ 3:1 (light 4.2:1 / 6.4:1,
   dark 4.0:1 / 8.6:1).
   `--color-teal-500` and `--color-clay-500` are decorative only and are **not** bound to any text
   token — they fail 4.5:1 on both backgrounds by design.
9. No horizontal overflow: `documentElement.scrollWidth <= viewportWidth` at 400, 768, 1280, and
   2560px, in both schemes.
10. Client-side JavaScript is confined to the two processed scripts contracted by
    `specs/workshop-unlock.spec.md` — one in `SiteNav.astro`, one in `src/pages/reading.astro`. No
    other component, layout or page ships a `<script>`, and every page renders its full content
    with JavaScript disabled. (Amended by #18; issue #1 emitted zero bytes of client-side
    JavaScript.)
11. Heading levels within a page descend without skipping, and each page has exactly one `<h1>`,
    rendered by the page and never by the layout.
12. `npm run build` and `npm run check` both exit 0 on a clean checkout after `npm install`.
13. All authored source files are UTF-8 without BOM, and `astro.config.mjs` / `tsconfig.json`
    are byte-identical to their pre-feature state.
14. The `robots` meta is emitted if and only if a page passes `noindex` as `true`. No other prop,
    route, or build mode can produce or suppress it, and its `content` value is the single literal
    `noindex, nofollow` — there is no per-page variant.

## Non-goals

- Re-specifying or modifying the existing scaffold: `astro.config.mjs` stays an empty
  `defineConfig({})` (no `site`, no integrations), `tsconfig.json` stays as-is (already
  `astro/tsconfigs/strict` — the strict-mode acceptance criterion is met by verification plus the
  new `check` script, not by editing the file).
- Any page other than `/`. Do not create `about.astro`, `research.astro`, `teaching.astro`,
  `projects.astro`, `blog/`, or `contact.astro`; do not create content collections or a blog index.
- Real home-page content: photo, bio, publication list, research description, CTAs. `index.astro`
  gets one `<h1>` and one placeholder paragraph.
- A theme toggle, a `data-theme` attribute, `localStorage` persistence, or any colour-scheme
  JavaScript. Dark mode is `prefers-color-scheme` only. (The workshop unlock flag that
  `specs/workshop-unlock.spec.md` stores in `localStorage` has nothing to do with colour scheme;
  this bullet still forbids theme persistence.)
- A hamburger/drawer mobile menu, dropdowns, or sticky/scroll-aware header. Nav wraps with flexbox.
- Web fonts, font subsetting, `@font-face`, or Google Fonts. System stacks only.
- Tailwind, UNO, CSS-in-JS, Sass, PostCSS plugins, or any styling dependency. Plain CSS with
  custom properties.
- SEO/social metadata beyond `<title>` and `<meta name="description">`: no canonical link, no
  Open Graph, no Twitter cards, no JSON-LD, no sitemap, no `robots.txt`. (Scope of issue #1 only.
  The single opt-in `<meta name="robots" content="noindex, nofollow">` shipped later under
  `specs/workshop.spec.md` and is now part of the `BaseLayout` contract above; it is emitted only
  when a page passes `noindex`, and this bullet still forbids every other metadata element,
  including a `robots.txt` file.)
- Icons, logos, avatars, favicon replacement, or images of any kind. (Scope of issue #1 only. The
  UCF Pegasus mark in the header shipped later under `specs/header-ucf-mark.spec.md` and is now
  part of the `SiteHeader.astro` contract above; this bullet does not license removing it.)
- Buttons, cards, badges, tables, forms, or any component beyond the four specified. `--radius-*`,
  `--shadow-*`, `--color-surface`, and `--space-3xl` are defined for future use and may legitimately
  be unreferenced by this issue's CSS — do not test for their usage, only their definition.
- Analytics, deployment config, CI, or hosting.
- Visual-regression/screenshot testing, Lighthouse scores, or bundle-size budgets.
- Contrast assertions by rendered-pixel sampling; invariant 8 is checked by computing WCAG ratios
  from the literal hex values in `tokens.css`.

## Open questions

1. **Footer links.** `FOOTER_LINKS` ships empty because the real GitHub, Google Scholar, ORCID, and
   SAIL@UCF URLs are unverified. The rendering path for a non-empty list is specified but unused;
   populating it is a follow-up.
2. **Email in footer.** Deliberately excluded. Publishing an address is the user's call, and
   `/contact/` is a planned route — do not add a `mailto:` anywhere.
3. **`site` URL.** No production domain is known, so `astro.config.mjs` gets no `site` value and
   there is no canonical URL. Revisit when deploying.
4. **`@astrojs/check` + `typescript` install.** If the environment cannot reach the npm registry,
   add the `"check": "astro check"` script and the devDependency entries anyway, and treat
   `npm run build` (Behavior #37) as the passing gate; note the skip rather than dropping the
   script.
5. **Astro version.** `package.json` pins `astro ^7.3.2`. This spec uses only long-stable APIs
   (`interface Props` + `Astro.props`, default `<slot />`, `Astro.url.pathname`,
   `Astro.generator`, CSS import from frontmatter). If any of these has changed in Astro 7, follow
   the installed version's behaviour and flag the deviation rather than pinning an older Astro.
6. **`h3` size collision.** `--text-xl` is used for both `h3` and any future large body lead text.
   If that proves visually ambiguous once real content lands, add a distinct `--text-lead` then —
   not now.
7. **Serif stack availability.** `'Iowan Old Style'`/Palatino are absent on most Linux and Android
   systems, which will fall back to Georgia or the generic serif. Accepted; a web font is a later
   decision (see Non-goals).
8. **`:visited` on non-prose links.** This spec contracts `a:visited` globally but is silent on
   visited state for `.site-header__brand` and `.skip-link`. Both required explicit `:visited`
   rules in `global.css`, because the global `a:visited` selector outranks a bare class selector and
   would otherwise recolour them (the brand is a self-link on `/`, so it always matches `:visited`
   there). No Behavior row covers visited state, which is why none caught the omission; if visited
   styling is contracted per component later, add rows for it.
9. **Closed — the `noindex` prop was folded in, not left stale.** `specs/workshop.spec.md` added a
   fifth `BaseLayout` prop and a conditional head element. Both now appear above: `noindex?: boolean`
   in the Props block with its `false` default, the conditional `<meta name="robots">` in the
   required document structure, Behavior #42–#44, one Errors row, two Boundaries rows, and
   Invariant 14. No existing row was weakened — the head contract for every page that omits the prop
   is exactly what it was, which Behavior #43 now asserts explicitly rather than leaving implied.
   The head listing here still does not enumerate the RSS `<link rel="alternate">` that
   `specs/blog.spec.md` added; that remains that spec's to fold in.
10. **Closed — the "zero client JS" contract was amended for issue #18.**
    `specs/workshop-unlock.spec.md` added the site's first scripts: one in `SiteNav.astro` that
    appends a runtime-only `Workshop` nav item for visitors who have unlocked the room, and one on
    `/reading/` that listens to the shelf. Changed here: Purpose, the `BaseLayout` no-script note,
    the `SiteNav` section, a `NAV_ITEMS` note, Behavior #27, Invariants 2, 3, 4 and 10, and the
    theme-persistence non-goal. The server-rendered nav, `BaseLayout`, the tokens and every other
    row are unchanged, and every page still renders its full content with JavaScript disabled.
