# Narrative Pages: About, Research, Teaching

Issue: personal-website #4 — "Narrative pages: About, Research, Teaching". Builds on
`specs/layout-design-system.spec.md` (#1) and `specs/home-hero.spec.md` (#3); all of their
contracts remain in force.

## Purpose

Fill three of the six dead nav routes with real prose. Each page is a single `.astro` file that
renders its content as direct children of `BaseLayout`'s default slot, so the existing
`.prose > * + *` rhythm on `<main>` owns all vertical spacing. No new component, no new token, no
scoped `<style>`, no change to `global.css`, `tokens.css`, `consts.ts`, or `astro.config.mjs` —
the nav already links all three hrefs. The voice is the hero's: first person, plain-spoken, no
buzzwords, no third-person CV phrasing.

## Public API

Files to create (exactly these three; `astro.config.mjs` is default `build.format: 'directory'`,
so they emit `dist/about/index.html`, `dist/research/index.html`, `dist/teaching/index.html`,
matching the trailing-slash hrefs in `NAV_ITEMS`):

```
src/pages/about.astro
src/pages/research.astro
src/pages/teaching.astro
```

Each has the same shape — only `title`, `description`, and the body differ:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="About" description="…see below…">
  <h1>About</h1>
  <p>…</p>
  <h2>…</h2>
  <ul><li>…</li></ul>
</BaseLayout>
```

`width` and `bodyClass` are omitted on all three, so `<main class="site-main container prose">`
and `<body class="site">`. No wrapper `<div>`/`<section>` around the content: the rhythm rule only
reaches direct children of `<main>`.

### Literal copy (ship verbatim; do not paraphrase, reorder, or add)

Every apostrophe below is U+2019 (`’`); every em dash is U+2014 (`—`) with one space each side;
`2024–2026` uses U+2013.

**`about.astro`** — `title="About"`, `description="Background and education for Seth Jones, a Computer Science PhD student at the University of Central Florida."`

- `h1`: `About`
- p1: `I’m Seth. I finished my BS in Computer Science at UCF in August 2026 and started my PhD there the same month, so my whole academic life so far has happened on one campus — and I’ve been glad to stay.`
- p2: `What I keep coming back to is software that doesn’t behave the same way twice. Agentic systems built on language models are useful and genuinely hard to test: run the same input twice and you can get two different traces. I’d like the tooling for that to be better than it is.`
- p3: `I also teach. I’ve been a teaching assistant since August 2025, and explaining a data structure a third time in a new way is still the part of the week I look forward to most.`
- `h2`: `Education`
- `ul`, four `li` in this order:
  1. `BS in Computer Science, University of Central Florida — August 2026`
  2. `4.0 GPA`
  3. `President’s List, 2024–2026`
  4. `PhD in Computer Science, University of Central Florida — began August 2026`

**`research.astro`** — `title="Research"`, `description="Seth Jones researches testing for non-deterministic agentic systems at SAIL@UCF, and has worked on prompt injection and AI agent security."`

- `h1`: `Research`
- p1: `I joined SAIL@UCF in August 2026 and work with Aashish Yadavally. The lab sits at #13 on CSRankings, which is a pleasant thing to be able to say, but the reason I’m here is the problem.`
- `h2`: `Testing non-determinism in agentic applications`
- p2: `I’m co-authoring a survey on how you test an agentic application when the system under test doesn’t repeat itself. A language-model agent can take a different path through the same task on every run, so the assumption underneath most testing — same input, same output — stops holding. The survey gathers what people do about that today, what each approach quietly assumes, and where the gaps still are.`
- `h2`: `Prompt injection and AI agents in defense settings`
- p3: `From December 2024 to January 2025 I was a research intern with the METIL Lab, doing AI and cyber security research for the Department of Energy and the Department of Defense through ORETTC. I built simulations and testing environments for nuclear energy and defense scenarios, and I wrote a paper on prompt injection and what it means for the security of an AI agent placed in a defense setting.`

**`teaching.astro`** — `title="Teaching"`, `description="Seth Jones has been a teaching assistant at UCF since August 2025 for Data Structures & Algorithms, Senior Design, and Cryptography."`

- `h1`: `Teaching`
- p1: `I’ve been a teaching assistant at UCF since August 2025. I lead weekly lab sessions for more than 150 students, and I work the problems as live code instead of slides — it’s slower, and it shows the mistakes, which is the point.`
- p2: `Office hours are the other half of it. Most of what happens there is one student, one bug, and a question they’d rather not ask in front of the room. I also grade assignments and exams, and I try hard to grade the same way across every section — a score shouldn’t depend on which TA opened the submission.`
- `h2`: `Courses I’ve supported`
- `ul`, four `li` in this order: `Data Structures & Algorithms 1`, `Data Structures & Algorithms 2`,
  `Senior Design 1`, `Cryptography`

The meta descriptions are deliberately third person — they are metadata, not page voice.

## Behavior

`html(path)` = parsed DOM of the built file at `path` under `dist/`.

| # | input | expected output | notes |
|---|---|---|---|
| 1 | `npm run build` | `dist/about/index.html`, `dist/research/index.html`, `dist/teaching/index.html` all exist | directory output format |
| 2 | each of the three | `document.title` is `About · Seth Jones`, `Research · Seth Jones`, `Teaching · Seth Jones` | separator is U+00B7 with one space each side |
| 3 | each of the three | `<meta name="description">` content equals that page's literal string above, and is not `SITE_DESCRIPTION` | |
| 4 | each of the three | exactly one `<h1>`, text `About` / `Research` / `Teaching` | layout renders none |
| 5 | `about` | `<main>`'s element children in order are `h1, p, p, p, h2, ul`; the three `<p>` texts equal p1, p2, p3 verbatim | assert on parsed text, not raw bytes |
| 6 | `about` | the `<ul>` has exactly 4 `<li>` whose texts equal the four education strings, in order | |
| 7 | `research` | `<main>`'s element children in order are `h1, p, h2, p, h2, p`; the two `<h2>` texts and three `<p>` texts equal the strings above, in order | |
| 8 | `teaching` | `<main>`'s element children in order are `h1, p, p, h2, ul`; `<p>` texts equal p1, p2; `<h2>` text is `Courses I’ve supported`; `<ul>` has exactly 4 `<li>` equal to the course names, in order | `&` round-trips as `&` in parsed text |
| 9 | each of the three | no `<h3>`–`<h6>`; heading levels are h1 then h2 only, no skips | |
| 10 | each of the three | the concatenated text of `<main>` matches none of `/lorem|ipsum/i`, `/\bTODO\b/`, `/\bTBD\b/`, `/placeholder/i`, `/coming soon/i`, `/\bLorem\b/`; contains no `…` U+2026 and no empty `<p>` | no-placeholder AC |
| 11 | `about` | nav link `/about/` has `aria-current="page"` and class `is-active`; no other nav link does | likewise `/research/` and `/teaching/` on their pages |
| 12 | each of the three | `<main>` class list is `site-main container prose`; `<body class="site">` exactly | defaults |
| 13 | each of the three | one `.skip-link`, one `<header>`, one `<nav aria-label="Main">`, one `<main id="main-content">`, one `<footer>`, in that DOM order | inherited from #1 |
| 14 | each of the three source files | contains no `<style>` block, no hex colour, no `rgb(`/`hsl(`, no `px`/`rem` literal, no `class` attribute on any element | zero new CSS |
| 15 | built output and source | none of the three pages has a `<script>` element other than the site-wide nav script `SiteNav.astro` emits (`specs/workshop-unlock.spec.md`); none of the three source files contains `<script>`; no `<main>` contains a `<script>` | no client JS of the pages' own (amended by #18; was "no `<script>`, no `.js` asset") |
| 16 | viewport 400px, each page | `documentElement.scrollWidth <= 400` | no horizontal scroll |
| 17 | `npm run build` and `npm run check` | both exit 0 | |
| 18 | `dist/index.html` | still contains the hero, unchanged; its `/about/` and `/research/` hero links now resolve to real files | #3 untouched |

## Errors

No runtime error surface: these are static pages with no props of their own.

| condition | exception type | message contract |
|---|---|---|
| `<BaseLayout>` used without `title` in any of the three | `astro check` diagnostic, exit 1 | assert exit code and the presence of `title` in output, not wording (see #1 Errors) |
| a page authored as `src/pages/about/index.astro` instead of `about.astro` | no error, route is identical | either layout satisfies Behavior #1; prefer the flat file |

## Boundaries

| boundary | answer |
|---|---|
| empty — no data-driven lists | All copy is hard-coded literals. Do not test an empty-list path. |
| zero / negative / max — no numeric inputs | Not applicable, do not test. |
| unicode | U+2019, U+2014, U+2013, U+00B7 all appear and must survive the build byte-identically and round-trip through parsed text. Test. |
| `&` in `Data Structures & Algorithms` | Raw HTML may hold `&#38;`; assert on parsed text (Behavior #8). Test. |
| null / undefined props | None introduced. Not applicable, do not test. |
| duplicate | No repeated headings or list items within a page. Do not test. |
| unordered | Element order and list order are the contract (Behavior #5–#8). Test explicitly. |
| minimum viewport | 400px is the floor (Behavior #16). Below 320px undefined, do not test. |
| maximum viewport | 1280px and 2560px: assert absence of horizontal scroll only. |
| dark scheme | Inherited entirely from tokens; no page-level colour. Assert no colour declaration exists (Behavior #14) rather than sampling pixels. |
| print / forced-colors / reduced-motion | Nothing page-specific. Undefined, do not test. |

## Invariants

1. Each page has exactly one `<h1>`, and every other heading is an `<h2>`.
2. No page introduces a CSS class, style block, token, or global rule; all spacing comes from
   `.prose > * + *`, which requires content to be direct children of the slot.
3. All #1 and #3 invariants continue to hold on `/`, `/about/`, `/research/`, `/teaching/`.
4. Every factual claim in the copy traces to the issue's acceptance criteria or the supplied source
   facts. No date, number, title, ranking, venue, or URL appears that is not in this spec.

## Non-goals

- The other three dead routes: `/projects/`, `/blog/`, `/contact/`. Do not create them.
- Any external link — SAIL@UCF, CSRankings, the advisor's page, METIL, ORETTC, a PDF of either
  paper. No URL is verified, so the page text names them without linking.
- Inline cross-links between the three pages. The nav is the contracted path (issue AC).
- A CV/résumé page or download, a formatted publication list with venues or BibTeX, a course table
  with codes/terms/enrollment numbers, a timeline component, headshots or other images.
- Content collections or Markdown. These are three `.astro` files with inline markup.
- Structured data (JSON-LD `Person`), Open Graph, canonical links, or a sitemap (excluded by #1).

## Open questions

1. **All copy on all three pages is a draft for Seth to revise.** It is written in his first-person
   voice from the supplied facts and he has not approved a word of it. Ship it verbatim; tests
   assert against the strings in this spec, and this spec is the place to edit them.
2. **CSRankings #13** is stated without a category or year because the issue gave neither. If the
   #13 is a software-engineering-area figure, that qualifier should be added — unverified.
3. **METIL Lab / ORETTC expansions** are unverified, so the copy uses the short names as given and
   spells out only "Department of Energy" and "Department of Defense".
4. **The survey's venue, status, and co-authors** beyond Aashish Yadavally are unknown; the copy
   says "co-authoring" and stops there.
5. **Whether GPA and President's List belong on the page at all** is Seth's call. They are in the
   issue's acceptance criteria, so they ship, factored into an `Education` list rather than the
   prose so removing them is a two-line edit.
6. **Closed — Behavior #15 was amended for issue #18.** `specs/workshop-unlock.spec.md` added a
   site-wide nav script; the three pages still ship no script of their own.
