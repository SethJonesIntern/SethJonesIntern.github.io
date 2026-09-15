# Header UCF Mark

## Purpose

Place the UCF Pegasus mark immediately left of the "Seth Jones" brand text in `SiteHeader`, inside
the same `/` link, vertically centred with the name. The asset (`src/assets/ucf-mark.png`, 231×310
RGBA, fully opaque, a black block holding the gold Pegasus and white "UCF" lettering) is final: no
cropping, recolouring, or SVG conversion. Because the block is black and the dark-scheme background
is near-black (`--color-ink-900`), the mark sits on a light rounded plate in dark mode only. This is
presentation; no test suite is written, so the rows below are review criteria, not test cases.

## Public API

Files to modify: `src/components/SiteHeader.astro`, `src/styles/global.css`, `src/styles/tokens.css`.
File to commit as-is: `src/assets/ucf-mark.png`. Everything else in the repo is untouched.

`src/components/SiteHeader.astro` — add two frontmatter imports and replace the brand anchor:

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

`width={24}` with the 231/310 ratio gives a derived height of `round(24 × 310 / 231) = 32`, so the
emitted attributes are `width="24" height="32"` (2x candidate 48×64). 24×32 CSS px reads as a mark
beside a `--text-lg` (1.25rem) serif name, not a banner. `format="webp"`, `quality={90}` — higher
than the hero photo's 72 because the mark is hard-edged lettering. The `<Image>` carries no class;
no CSS targets it. `alt=""`: **decorative**. The adjacent text already names the link "Seth Jones",
the accessible name of the link must stay exactly that, and the mark is UCF's, not Seth's — naming
it "UCF logo" inside a link to `/` would both duplicate the link text and imply the link goes to UCF.

`src/styles/tokens.css` — two new tokens, both required so no literal reaches `global.css`:
Layer 1 primitive, declared once beside the neutrals: `--color-transparent: transparent;`
Layer 2 semantic, light `:root` → `--color-mark-plate: var(--color-transparent);`, dark block →
`--color-mark-plate: var(--color-ink-50);`.
Justification against Invariant 5/6/7 of `specs/layout-design-system.spec.md`: `--color-mark-plate`
is a semantic token resolving to a Layer 1 primitive in both schemes and is declared in both blocks,
so the scheme switch stays in `tokens.css` and `global.css` gains no media query and no literal.
`--color-transparent` exists because no primitive means "unpainted", and a light value of
`var(--color-bg)` would be semantic→semantic (Invariant 6). `transparent`, not a bg-matching colour,
so the plate stays absent if the header ever gains its own background.

`src/styles/global.css` — in the existing `/* ---------- Site header ---------- */` section, replace
the `.site-header__brand` rule and add one rule after it (`:visited`/`:hover` rules stay as they are):

```css
.site-header__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-heading);
  text-decoration: none;
}

/* The plate lives on this wrapper, not on the <img>: the mark is fully opaque,
   so a background on the image would be invisible, and padding on an <img>
   carrying width/height hints would shrink it under the global border-box. */
.site-header__mark {
  display: inline-flex;
  flex: none;
  padding: var(--space-3xs);
  border-radius: var(--radius-sm);
  background: var(--color-mark-plate);
}
```

The image gets no `width`/`height` CSS: the global `img { max-width: 100%; height: auto }` derives
32px from the intrinsic attributes, which is what avoids layout shift. Padding is painted or not by
the token alone, so the box is 32×40 px in both schemes — identical geometry, no scheme-dependent shift.

## Behavior

| # | input | expected output | notes |
|---|---|---|---|
| 1 | any page | `a.site-header__brand[href="/"]` has exactly two element children, in order: `span.site-header__mark` (containing one `<img>`) then `span.site-header__name` with text `Seth Jones` | one link, mark first |
| 2 | any page | the `<img>` has `alt=""`, `width="24"`, `height="32"`, `loading="eager"`, `decoding="async"`, a `src` ending `.webp`, and a `srcset` with `1x` and `2x` candidates | no CLS, compressed |
| 3 | any page | accessible name of that link is exactly `Seth Jones`; the image exposes no accessible name | decorative alt |
| 4 | `prefers-color-scheme: light` | computed background of `.site-header__mark` is `rgba(0, 0, 0, 0)` | no plate |
| 5 | `prefers-color-scheme: dark` | computed background of `.site-header__mark` is `rgb(250, 248, 245)` | `--color-ink-50` plate, `--radius-sm` corners |
| 6 | viewport 400px | `documentElement.scrollWidth <= 400`; brand row ≈ 158px wide (32 plate + 8 gap + name); nav still wraps as before | no horizontal scroll |
| 7 | viewport 768px, 1024px, 1280px | brand and `nav.site-nav` sit on one row, nav on a single line — the mark adds 40px to a ~118px brand against a ~732px content box at 768px | no extra nav row |
| 8 | `npm run build` | exit 0; `dist/_astro/` holds the emitted webp variants; no emitted HTML references `ucf-mark.png` | asset is processed, not copied |

## Errors

| condition | exception type | message contract |
|---|---|---|
| `src/assets/ucf-mark.png` missing or renamed | build-time Vite/Astro import failure, `npm run build` exits non-zero | message names the unresolved path `../assets/ucf-mark.png`; there is no runtime error path |

## Boundaries

Empty/zero/negative/max/unicode/null/duplicate/unordered: not applicable — this feature takes no
inputs. Minimum viewport: 400px is the contracted floor (row 6); below 320px undefined, do not test.
Maximum viewport: ≥1152px, mark stays 24×32 px (fixed intrinsic size, not fluid). `prefers-reduced-
motion`: no transition or animation is added; nothing to test. Forced-colors, print, and
JavaScript-disabled rendering: undefined, do not test. No hover, focus, or `:visited` treatment is
applied to the mark itself — no opacity shift, no filter; the existing brand-text rules are unchanged.

## Invariants

1. The mark and the name are one anchor to `/`; there is never a second link in the header brand.
2. Rendered mark geometry is identical in both schemes (32×40 px box); only the plate's paint changes.
3. No ad-hoc colour, size, space, or radius value appears in the CSS this feature adds: every such
   value in the new `global.css` rules is a `var(--…)` reference to a token (Invariant 5 of the
   design system), and `SiteHeader.astro` contributes no CSS at all — no `<style>` block, no
   `style=` attribute, no inline length or colour. The numeric literals in its markup
   (`width={24}`, `densities={[1, 2]}`, and the `width="24" height="32"` attributes Astro emits
   from them) are intrinsic-size metadata that `astro:assets` requires and that the Public API
   above mandates; they are image-pipeline markup, not style values, and this invariant does not
   reach them.
4. The header's accessible name set is unchanged from before this feature.

## Non-goals

- Editing, cropping, recolouring, or vectorising `ucf-mark.png`; shipping a second light/dark asset.
- Putting the mark in the footer, Open Graph image, or any page body. (The favicon was on this list
  for the scope of this issue. It left it later, at Seth's request: the site icon is now the Pegasus
  cropped square from the same `ucf-mark.png`, pinned in the head structure in
  `specs/layout-design-system.spec.md`. The mark is still not permitted in the footer or a page
  body, and this spec's own header contract is unchanged.)
- A link to ucf.edu, a tooltip/`title` attribute, or any UCF attribution text.
- Making the header sticky, changing its background, or touching `SiteNav`/`BaseLayout`.
- A test suite, visual-regression snapshots, or bundle-size assertions.

## Open questions

1. Trademark: UCF brand guidelines for third-party use of the Pegasus mark are unverified. Using it
   as a personal affiliation mark is the user's call; flag before publishing, do not block the build.
2. **Closed — the token enumeration was extended, not left a subset.**
   `specs/layout-design-system.spec.md` now lists `--color-transparent` in its Layer 1 primitives
   table and `--color-mark-plate` in its Layer 2 semantic table, states 22 semantic tokens in the
   dark-scheme mechanism, and its Behavior #30 names both additions (primitive declared once,
   semantic declared twice). The "semantic names appear exactly twice, primitives exactly once"
   rule holds for both, and that spec's enumeration is complete against `src/styles/tokens.css`.
