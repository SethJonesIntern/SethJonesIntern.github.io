# personal-website

Personal site for Seth Jones. Astro 7 + TypeScript strict, static output, deployed to GitHub Pages.

## Commands

| Command | Action |
| :-- | :-- |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Build to `./dist/` |
| `npm run check` | Typecheck via `astro check` |

## Layout

- `src/styles/tokens.css` — 68 primitives and 22 semantic tokens, the semantic set remapped under
  `@media (prefers-color-scheme: dark)`. Components reference semantic tokens only; no raw colors
  or lengths anywhere in components or `global.css`.
- `src/layouts/BaseLayout.astro` — wraps every page, the only importer of `global.css`.
- `src/consts.ts` — site metadata and `NAV_ITEMS`.
- `specs/` — one behavioral spec per feature, written by the planner before implementation.
- `New folder/` — gitignored. Holds the original resume, which carries a phone number that must
  not reach the built site or git history.

## Workflow

Work is tracked as GitHub issues. `gh issue list` shows what remains; each closed issue carries its
verification record. Use `/spec-harness:epic` for a feature area, `/spec-harness:blind-tdd` for a
single change.

`adjudication` is `off` in `.spec-harness.json`, so the harness reviews with `/code-review` after
the build, typecheck and existing tests pass. Most of this site is presentation, where failure
modes are visible. Turn it to `light` or `full` only for logic whose failure would not show in the
built page: the projects content collection, the GitHub API showcase, and the blog's slugs, tags
and feed.

Scaffolding and dependency installation are main-thread work. The planner, coder and tester have no
`Bash`, so they cannot run `npm`, `astro add`, or any generator.
