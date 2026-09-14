# Deploy to GitHub Pages via Actions

## Purpose
Publish the Astro site to GitHub Pages on every push to `main`. The repo is named `SethJonesIntern.github.io`, so it is a user site served from the root of `https://sethjonesintern.github.io` — no subpath. Astro needs `site` set for absolute/canonical URLs and for the RSS feed added in a later issue; `base` stays unset because the site is root-served. Build and deploy are separate jobs so a failed build cannot publish a broken site.

## Files
| path | action |
|---|---|
| `astro.config.mjs` | replace contents (exact text below) |
| `.github/workflows/deploy-pages.yml` | create |
| `.github/workflows/ci-python.yml` | leave untouched |

`astro.config.mjs` — exact contents:

```js
// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://sethjonesintern.github.io',
});
```

## Workflow contract — `.github/workflows/deploy-pages.yml`
| # | requirement | value |
|---|---|---|
| 1 | trigger | `on.push.branches: [main]`, plus `on.workflow_dispatch` |
| 2 | top-level `permissions` | `contents: read`, `pages: write`, `id-token: write` |
| 3 | `concurrency` | `group: pages`, `cancel-in-progress: false` (never abort an in-flight deploy) |
| 4 | job `build` | `runs-on: ubuntu-latest`; no `environment` key |
| 5 | build steps, in order | `actions/checkout@v4`; `actions/setup-node@v4` with `node-version: '22'` and `cache: 'npm'`; `npm ci`; `actions/configure-pages@v5`; `npm run build`; `actions/upload-pages-artifact@v3` with `path: ./dist` |
| 6 | job `deploy` | `needs: build`; `runs-on: ubuntu-latest`; `environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }`; single step `actions/deploy-pages@v4` with `id: deployment` |
| 7 | no `base` or `PUBLIC_*` path env vars anywhere | — |

`npm ci` is required (not `npm install`) — `package-lock.json` is committed. Node 22 satisfies `engines.node: >=22.12.0` in `package.json`.

## Behavior
| # | input | expected output | notes |
|---|---|---|---|
| 1 | push to `main`, build succeeds | `build` then `deploy` run; site live at `https://sethjonesintern.github.io` | deploy job summary shows `page_url` |
| 2 | push to `main`, `npm run build` exits non-zero | `build` fails, no artifact uploaded, `deploy` skipped, previously deployed site unchanged | acceptance criterion: failed build blocks deploy |
| 3 | push to a non-`main` branch or a PR | workflow does not run | |
| 4 | manual `workflow_dispatch` on `main` | same as #1 | |
| 5 | two pushes in quick succession | second run queues behind the first; neither deploy is cancelled | from `cancel-in-progress: false` |

## Invariants
- Every emitted asset and internal link is a root-relative path (`/…`) or a URL under `https://sethjonesintern.github.io`; no `/SethJonesIntern.github.io/` or other repo-name prefix appears in `dist`.
- The deployed artifact is exactly the `./dist` produced by the same commit's `build` job.
- `deploy` never runs without a successful `build`.

## Manual step (not implementable in code)
Repo Settings → Pages → Source must be set to **GitHub Actions** (`build_type: workflow`). Until then the workflow's `configure-pages`/`deploy-pages` steps fail. Note this in the PR description.

## Non-goals
- No `base` path, no custom domain / `CNAME`, no `astro check` or lint gate in this workflow, no preview/PR deployments, no changes to `ci-python.yml`, no sitemap or RSS integration (later issues).
- Do not unit-test the YAML. Verification is: workflow run green, and `https://sethjonesintern.github.io` loads with working CSS and internal navigation.

## Open questions
- Pages has never been enabled on this repo, so the first run's outcome is unverified until the manual setting is applied.
