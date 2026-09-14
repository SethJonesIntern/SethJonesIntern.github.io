# Home Page Hero

Issue: personal-website #3 — "Home page with hero". Builds on `specs/layout-design-system.spec.md`
(issue #1), which is already implemented; all of its contracts remain in force.

## Purpose

Replace the placeholder body of `src/pages/index.astro` (currently one `<h1>` and one paragraph)
with a real hero: name, a one-line statement of current work, a short warm second paragraph, the
UCF graduation photo, and four clear routes into About, Research, Projects, and Contact. The photo
is emitted through `astro:assets` so it is compressed and carries intrinsic `width`/`height`
attributes at build time, which is what prevents layout shift. Everything is styled with the
existing semantic tokens; no new global token is introduced.

## Public API

Only `src/pages/index.astro` changes. No new component, no `consts.ts` change, no
`global.css`/`tokens.css` change, no `astro.config.mjs` change.

```astro
---
import { Image } from 'astro:assets';
import BaseLayout from '../layouts/BaseLayout.astro';
import gradPhoto from '../assets/seth-ucf-grad.jpg';
---

<BaseLayout title="Seth Jones" bodyClass="home">
  <section class="hero">
    <Image
      class="hero__photo"
      src={gradPhoto}
      alt="Seth Jones in cap and gown at his UCF graduation"
      width={220}
      densities={[1, 2]}
      format="webp"
      quality={72}
      loading="eager"
      decoding="async"
    />
    <div class="hero__body">
      <h1>Seth Jones</h1>
      <p class="hero__lead"><!-- LEAD --></p>
      <p><!-- BIO --></p>
      <ul class="hero__links"><!-- 4 li > a.hero__link --></ul>
    </div>
  </section>
</BaseLayout>
```

`title` is `"Seth Jones"` so `document.title` stays bare `Seth Jones` (issue #1 Behavior #2).
`description` is omitted, so the meta description is `SITE_DESCRIPTION`. `width` is omitted, so
`<main>` keeps `site-main container prose`.

### Literal copy (copy verbatim; do not paraphrase)

- `h1`: `Seth Jones`
- `.hero__lead`: `I'm a Computer Science PhD student at UCF, studying software engineering for AI — right now, how you test agentic systems that don't behave the same way twice.`
- Bio paragraph: `I started at SAIL@UCF in August 2026, working with Aashish Yadavally, and I'm co-authoring a survey on testing non-determinism in agentic applications. I finished my BS in Computer Science at UCF the same month, and I've been a teaching assistant since 2025 for Data Structures & Algorithms, Senior Design, and Cryptography.`
- `.hero__links` items, in this order: `About me` → `/about/`, `Research` → `/research/`,
  `Projects` → `/projects/`, `Get in touch` → `/contact/`.

The apostrophes are U+2019 (`’`) and the dash in the lead is U+2014 (`—`) with one space each side.

### Styling

Scoped `<style>` in `index.astro`. Every colour/space value is a `var(--…)` reference to an
existing token. Two permitted literals, both unavoidable and both scoped to this page:
`--hero-photo-width: 13.75rem` declared on `.hero` (a component-local custom property, not a
global token — 220px at 1x), and the breakpoint `@media (min-width: 40em)`.

- `.hero` — below 40em: single column, `display: flex; flex-direction: column; gap: var(--space-md)`.
  At/above 40em: two columns, photo first, `align-items: start`, same gap.
- `.hero__photo` — `width: 100%; max-width: var(--hero-photo-width); border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm)`. Height is left to the global `img { height: auto }` rule so the
  browser derives it from the intrinsic attributes.
- `.hero__lead` — `font-size: var(--text-lg); line-height: var(--leading-snug);
  color: var(--color-text)`.
- `.hero__links` — `list-style: none; padding: 0; display: flex; flex-wrap: wrap;
  gap: var(--space-2xs) var(--space-md)`.
- `.hero__link` — `font-weight: var(--weight-medium)`; visited state must not recolour it
  (`.hero__link:visited { color: var(--color-link) }`), per issue #1 Open question 8.

## Behavior

`html()` = parsed DOM of built `dist/index.html`.

| # | input | expected output | notes |
|---|---|---|---|
| 1 | built page | exactly one `<h1>`, text `Seth Jones` | inside `.hero__body` |
| 2 | built page | `.hero__lead` text equals the lead string above, character for character | assert on parsed text |
| 3 | built page | `.hero` contains exactly two `<p>`: `.hero__lead` then the bio paragraph, bio text equals the bio string above | |
| 4 | built page | `.hero__links` has exactly 4 `<li>`, hrefs in order `/about/`, `/research/`, `/projects/`, `/contact/`, link texts `About me`, `Research`, `Projects`, `Get in touch` | |
| 5 | built page | exactly one `<img>` inside `.hero`, `alt="Seth Jones in cap and gown at his UCF graduation"` | non-empty, meaningful |
| 6 | built page | that `<img>` has `width="220"` and `height="330"` attributes | 220 × 1600/1067 = 329.8 → 330; this is the anti-CLS contract |
| 7 | built page | that `<img>` `src` ends in `.webp` and matches `/^\/_astro\/seth-ucf-grad\.[\w-]+\.webp$/` | hashed emitted asset |
| 8 | built page | that `<img>` has a `srcset` with exactly two candidates, ending `1x` and `2x`, both `.webp` | from `densities={[1, 2]}` |
| 9 | built page | that `<img>` has `loading="eager"` and `decoding="async"`, and no `fetchpriority` requirement | above the fold; do not add `loading="lazy"` |
| 10 | `dist/_astro/` | contains exactly two `seth-ucf-grad.*.webp` files; each is < 60 KB; neither is a `.jpg` | compression AC |
| 11 | built page | `document.title === 'Seth Jones'`; `<meta name="description">` content `=== SITE_DESCRIPTION` | inherited from layout |
| 12 | built page | `<main>` class list contains `site-main`, `container`, `prose`; `<body>` class list is exactly `site home` | |
| 13 | built page | nav link `/` has `aria-current="page"`; no other link does | unchanged from issue #1 |
| 14 | built page | no `<script>` element; `dist/` contains no `.js` asset | zero client JS |
| 15 | viewport 400px | `documentElement.scrollWidth <= 400`; `.hero` is single-column (photo box above text); photo rendered width ≤ 364px | 400px AC |
| 16 | viewport 1280px | `.hero` is two-column; photo occupies the left column at 220px wide | |
| 17 | `prefers-color-scheme: dark` | hero renders with `--color-bg`/`--color-text` dark mapping; no hero-specific colour override | |
| 18 | `npm run build` / `npm run check` | both exit 0 | |

## Errors

| condition | exception type | message contract |
|---|---|---|
| `src/assets/seth-ucf-grad.jpg` missing or renamed | Astro build error, exit 1 | Vite unresolved-import error naming `seth-ucf-grad.jpg`; assert exit code + filename, not wording |
| `<Image>` used without `alt` | `astro check` diagnostic, exit 1 | `alt` is required on Astro's `ImageProps`; assert exit code + the token `alt` |
| `<Image>` given both `width` and `height` inconsistent with the source ratio | Astro build error about aspect ratio | do not pass `height`; let it be derived |
| `<Image>` with `densities` **and** `widths` together | Astro build error, exit 1 | pass `densities` only |
| plain `<img src="/src/assets/…">` instead of `<Image>` | no error, but violates Behavior #6–#10 | caught by tests, not the compiler |

## Boundaries

| boundary | answer |
|---|---|
| empty — no hero link list variant | The 4 links are hard-coded literals, not data-driven. Do not test an empty list. |
| empty `alt` | Forbidden: the photo is meaningful content, not decoration. Assert `alt` is non-empty. |
| zero / negative | No numeric inputs. Not applicable, do not test. |
| minimum viewport | 400px is the contracted floor (Behavior #15). Below 320px undefined, do not test. |
| maximum viewport | 1280px and 2560px: no horizontal scroll, content centred, photo stays 220px. Test scroll width only. |
| unicode | The lead and bio contain U+2019 and U+2014; both must survive the build byte-identically and round-trip through parsed text. Test. |
| null / undefined | No optional props are introduced. Not applicable, do not test. |
| duplicate | No duplicate hrefs among the 4 hero links. Do not test. |
| unordered | Hero link order is the contract (Behavior #4). Test explicitly. |
| JS disabled | Page is fully functional; identical to JS enabled. Assert only via Behavior #14. |
| `prefers-reduced-motion` | No hero animation exists, so nothing to disable. Do not test. |
| images blocked / `srcset` unsupported | `src` alone renders the 1x webp. Do not test. |
| print / forced-colors | Undefined, do not test. |

## Invariants

1. The photo's rendered box reserves space before the bitmap loads: the `<img>` always carries both
   `width` and `height` attributes whose ratio equals 1067/1600 within 1px of rounding. No layout
   shift at any viewport.
2. Every colour, spacing, radius, and shadow value in `index.astro` is a `var(--…)` reference to a
   token already defined in `tokens.css`. The only literals are `--hero-photo-width: 13.75rem` and
   the `40em` breakpoint.
3. Exactly one `<h1>` on the page; `BaseLayout` still renders none.
4. Every hero link href is a member of the `NAV_ITEMS` href set from `src/consts.ts`.
5. All issue #1 invariants still hold on `/`: one skip link, one header, one `nav aria-label="Main"`,
   one `main#main-content`, one footer, in that DOM order; zero client JS; no horizontal overflow.
6. The build emits no copy of the original JPEG to `dist/`.

## Non-goals

- Any page other than `/`. `/about/`, `/research/`, `/projects/`, `/contact/` stay dead links (issue
  #1 already contracts this); do not scaffold them to satisfy the "clear routes" criterion.
- A new component (`Hero.astro`) or new global CSS classes in `global.css`. The hero is page-scoped.
- New design tokens, a button component, or CTA button styling. The routes are plain text links.
- Open Graph / social image use of the photo, `<picture>` art direction, multiple crops, AVIF, LQIP
  blur-up placeholders, or `image/*` config in `astro.config.mjs`.
- A CV block, publication list, GPA, course tables, timeline, or news feed. Those belong to
  About/Research/Teaching.
- Lighthouse/CLS field measurement. Invariant 1 is verified from the emitted attributes, not by
  rendering-performance instrumentation.

## Open questions

1. **The copy is a draft for Seth to revise.** The lead and bio are written in his first-person
   voice and he has not approved them. The implementer must ship them verbatim as specified, but
   expect a follow-up commit that rewrites the prose; tests should assert against the strings in
   this spec, and this spec is the place to update them.
2. **GPA and "4.0"** were deliberately left out of the hero as CV phrasing. If Seth wants them
   surfaced, About is the likelier home.
3. **Photo display size (220px)** is a judgement call, not a measured one. If it reads too small
   beside the 672px prose column, bump `--hero-photo-width` and the `width={220}` prop together —
   they must stay in sync or Behavior #6 breaks.
4. **Photo crop.** The source is a full 1067×1600 portrait; it is displayed uncropped. Whether a
   tighter head-and-shoulders crop looks better is unverified and would be a new asset, not a
   code change.
