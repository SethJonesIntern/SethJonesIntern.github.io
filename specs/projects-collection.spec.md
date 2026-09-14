# Projects as a Typed Content Collection

Issue: personal-website #5 — "Projects as a typed content collection"

## Purpose

`/projects/` is a dead nav link (`NAV_ITEMS` in `src/consts.ts`). This feature fills it with a real
Astro content collection: three Markdown entries under `src/content/projects/`, validated by a Zod
schema so malformed or incomplete frontmatter fails `npm run build` instead of rendering a broken
card, an index page of project cards, and one detail page per project. All decision logic — sort
order, status labels, stack formatting, detail-page hrefs — lives in a plain TypeScript module with
no Astro imports and no filesystem access, so it is unit-testable without an Astro build. Pages
reuse the existing semantic tokens from `src/styles/tokens.css`; no new tokens, no new dependencies.

## Public API

### Files to create

```
src/lib/projects.ts                       (pure logic; ZERO imports of any kind)
src/lib/projects-schema.ts                (Zod schema; imports only from 'astro/zod' and './projects')
src/content.config.ts
src/content/projects/sentinel-grid-honeynet.md
src/content/projects/tsat-2a.md
src/content/projects/typeracer-web-game.md
src/pages/projects/index.astro
src/pages/projects/[id].astro
```

Files to leave untouched: `src/consts.ts`, `src/layouts/BaseLayout.astro`, `src/components/*`,
`src/styles/*`, `astro.config.mjs`, `tsconfig.json`, `package.json` — except the `test` and
`test:watch` scripts and the `vitest` devDependency, which this spec's test contract requires.

### `src/lib/projects.ts` — exact exports

```ts
export const PROJECT_STATUSES = ['in-progress', 'completed', 'archived'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** The minimum shape the ordering functions need. Extra properties are allowed and preserved. */
export interface ProjectSortInput {
  readonly id: string;
  readonly order: number;
  readonly title: string;
}

/** Total order: `order` ascending, then `title`, then `id`. Returns exactly -1, 0, or 1. */
export function compareProjects(a: ProjectSortInput, b: ProjectSortInput): -1 | 0 | 1;

/** New array, sorted by `compareProjects`. Never mutates or aliases the input array. */
export function sortProjects<T extends ProjectSortInput>(projects: readonly T[]): T[];

/** Human label for a status value. */
export function statusLabel(status: ProjectStatus): string;

/** Runtime guard for unvalidated values (e.g. a raw frontmatter field). */
export function isProjectStatus(value: unknown): value is ProjectStatus;

/** Display string for a stack list. */
export function formatStack(stack: readonly string[]): string;

/** Detail-page path for a collection entry id. Throws on an effectively empty id. */
export function projectHref(id: string): string;
```

String comparison in `compareProjects` is codepoint-wise (`<` / `>` on the raw strings). Do **not**
use `localeCompare`, `toLowerCase`, or `Intl.Collator` — results must not depend on the host locale.

### `src/lib/projects-schema.ts` — exact exports

```ts
import { z } from 'astro/zod';
import { PROJECT_STATUSES } from './projects';

export const projectSchema = z
  .object({
    title: z.string().min(1),
    role: z.string().min(1),
    stack: z.array(z.string().min(1)).min(1),
    status: z.enum(PROJECT_STATUSES),
    summary: z.string().min(1).max(300),
    order: z.number().int().positive(),
    repo: z
      .string()
      .url()
      .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
        message: 'repo must be an http(s) URL',
      })
      .optional(),
  })
  .strict();

export type ProjectFrontmatter = z.infer<typeof projectSchema>;
```

`projectSchema` must be exported with its inferred type (no widening annotation such as
`: z.ZodTypeAny`) so `.safeParse()` and `z.infer` work for callers. `src/content.config.ts` imports
it and passes it to `defineCollection` with the `glob` loader over `./src/content/projects` and
pattern `**/*.md`, exporting `export const collections = { projects };`.

### Test setup

Runner is Vitest 5 via `npm test`; tests live in `tests/*.test.ts`. No Vitest config file is
required — the default include picks up `tests/`. Imports from a test file are exactly:

```ts
import {
  PROJECT_STATUSES, compareProjects, formatStack, isProjectStatus,
  projectHref, sortProjects, statusLabel,
} from '../src/lib/projects';
import { projectSchema } from '../src/lib/projects-schema';
```

## Behavior

| # | input | expected output | notes |
|---|---|---|---|
| 1 | `compareProjects({id:'a',order:1,title:'Alpha'}, {id:'b',order:2,title:'Beta'})` | `-1` | lower `order` first |
| 2 | `compareProjects({id:'b',order:2,title:'Beta'}, {id:'a',order:1,title:'Alpha'})` | `1` | antisymmetric |
| 3 | `compareProjects({id:'zeta',order:2,title:'Alpha'}, {id:'alpha',order:2,title:'Beta'})` | `-1` | `order` tie → `title`; `id` ignored until titles tie |
| 4 | `compareProjects({id:'alpha',order:2,title:'Same'}, {id:'beta',order:2,title:'Same'})` | `-1` | `order`+`title` tie → `id` |
| 5 | `compareProjects({id:'x',order:2,title:'Same'}, {id:'x',order:2,title:'Same'})` | `0` | full tie |
| 6 | `compareProjects({id:'a',order:1,title:'Zebra'}, {id:'b',order:1,title:'apple'})` | `-1` | codepoint compare: `'Z'` (90) < `'a'` (97); not case-insensitive |
| 7 | `compareProjects({id:'a',order:1,title:'Éclair'}, {id:'b',order:1,title:'Zebra'})` | `1` | `'É'` (U+00C9) > `'Z'`; no locale collation |
| 8 | `sortProjects([{id:'c',order:3,title:'C'},{id:'a',order:1,title:'A'},{id:'b',order:2,title:'B'}])` | array whose ids are `['a','b','c']` | |
| 9 | `sortProjects` over the three shipped frontmatter objects (§Content), each given its filename stem as `id` | ids `['sentinel-grid-honeynet','tsat-2a','typeracer-web-game']` | `order` 1, 2, 3 |
| 10 | `const input = [three unsorted items]; sortProjects(input)` | returns an array `!==` `input`; `input`'s own element order is unchanged | non-mutating |
| 11 | `sortProjects([{id:'a',order:1,title:'A',repo:'https://example.com'}])[0].repo` | `'https://example.com'` | extra properties preserved by identity |
| 12 | `statusLabel('in-progress')` / `statusLabel('completed')` / `statusLabel('archived')` | `'In progress'` / `'Completed'` / `'Archived'` | exact casing |
| 13 | `isProjectStatus('completed')` / `('done')` / `(undefined)` / `(1)` / `('Completed')` | `true` / `false` / `false` / `false` / `false` | case-sensitive |
| 14 | `formatStack(['C++','ESP32'])` | `'C++ · ESP32'` | separator is space + U+00B7 + space |
| 15 | `formatStack(['Python'])` | `'Python'` | no separator |
| 16 | `formatStack([])` | `''` | |
| 17 | `formatStack([' React ','','Node.js'])` | `'React · Node.js'` | each entry trimmed; entries empty after trim dropped |
| 18 | `projectHref('tsat-2a')` | `'/projects/tsat-2a/'` | leading and trailing slash |
| 19 | `projectHref('/tsat-2a/')` | `'/projects/tsat-2a/'` | surrounding slashes stripped first |
| 20 | `projectSchema.safeParse(o).success` for each of the three §Content frontmatter objects `o` | `true` | shipped data is valid |
| 21 | `projectSchema.safeParse({title:'T',role:'R',stack:['S'],status:'completed',summary:'S',order:1})` | `.success === true` and `.data.repo === undefined` | `repo` optional; absent key is legal |
| 22 | row 21's object plus `repo:'https://github.com/example/repo'` | `.success === true` and `.data.repo === 'https://github.com/example/repo'` | |
| 23 | row 21's object with `status:'shipped'` | `.success === false` | not in the enum |
| 24 | `PROJECT_STATUSES` | `['in-progress','completed','archived']` | exact values and order |

## Errors

All schema failures are `safeParse` results, not thrown exceptions: assert `result.success === false`
and that `result.error.issues[0].path` equals the listed path. Do not assert Zod's own message
wording except where a message contract is given.

| condition | exception type / result | message contract |
|---|---|---|
| missing `title` (likewise `role`, `stack`, `status`, `summary`, `order`) | `safeParse` → `success: false`, `issues[0].path === ['title']` | any Zod required/invalid-type message |
| `title: ''`, `role: ''`, or `summary: ''` | `success: false`, path `['title']` / `['role']` / `['summary']` | `min(1)` violation |
| `stack: []` | `success: false`, path `['stack']` | at least one entry required |
| `stack: 'Python'` (string, not array) | `success: false`, path `['stack']` | |
| `stack: ['Python','']` | `success: false`, path `['stack', 1]` | per-element `min(1)` |
| `status: 'shipped'` | `success: false`, path `['status']` | |
| `order: 0`, `-1`, `1.5`, or `'1'` | `success: false`, path `['order']` | positive integer |
| `summary` of 301 characters | `success: false`, path `['summary']` | |
| `repo: 'not-a-url'` | `success: false`, path `['repo']` | |
| `repo: 'ftp://example.com/x'` | `success: false`, path `['repo']`, `issues[0].message === 'repo must be an http(s) URL'` | the one contracted wording |
| `repo: null` | `success: false`, path `['repo']` | optional means "absent", not nullable |
| unknown key, e.g. `featured: true` | `success: false`, `issues[0].code === 'unrecognized_keys'` | `.strict()` catches typo'd field names |
| `projectHref('')`, `projectHref('   ')`, `projectHref('/')` | throws `TypeError` | message exactly `'projectHref: id must be a non-empty string'` |
| any invalid frontmatter in `src/content/projects/*.md` | `npm run build` exits non-zero | Astro's own collection error, naming the collection (`projects`), the entry file, and the failing field path. Not covered by the Vitest suite — see Non-goals |

## Boundaries

| boundary | answer |
|---|---|
| empty collection / `sortProjects([])` | returns `[]` (a new array). Test the function. The index page's empty state is specified below but **not** tested (needs a build). |
| single item | `sortProjects([one])` returns a 1-element array holding that same object; `compareProjects(x, x) === 0`. Test. |
| all-equal sort keys | Behavior #5 → `0`; `sortProjects` of three objects with identical `id`/`order`/`title` returns them in input order (`Array.prototype.sort` is stable). Test. |
| missing optional `repo` | Behavior #21 — parses, `data.repo === undefined`. `tsat-2a` ships without it. Test. |
| `repo: ''` | `success: false`, path `['repo']`. Test. |
| unicode in titles | Behavior #7 and #14 — codepoint ordering, and titles/stack entries round-trip non-ASCII unchanged. `projectSchema.safeParse({...row 21, title:'Grid — Ω 😀'}).success === true`. Test. |
| negative / zero `order` | Rejected (Errors table). Test. |
| very large `order` (`Number.MAX_SAFE_INTEGER`) | Accepted; compares numerically. Test if convenient. |
| `order: NaN` / `Infinity` | Rejected by `int()`. Test `NaN`. |
| `null` / `undefined` passed to `compareProjects`, `statusLabel`, `formatStack`, `sortProjects` | Undefined, do not test. Those parameters are typed; only `isProjectStatus` is contracted for arbitrary input. |
| duplicate `order` values across real entries | Legal — tie-broken by `title`, then `id` (Behavior #3, #4). |
| duplicate ids | Impossible; ids come from filenames. Undefined, do not test. |
| unordered input array | Behavior #8 — output depends only on sort keys, never on input position, except under a full tie. |
| `summary` of exactly 300 characters | Accepted; 301 rejected. Test both. |

## Invariants

1. `compareProjects` is a total order: antisymmetric (`sign(cmp(a,b)) === -sign(cmp(b,a))`),
   transitive, and returns `0` only when `id`, `order`, and `title` are all equal.
2. Return values are exactly `-1`, `0`, or `1` — never any other number.
3. `sortProjects(xs).length === xs.length`, and its elements are the same object references as `xs`.
4. `sortProjects` is idempotent: `sortProjects(sortProjects(xs))` deep-equals `sortProjects(xs)`.
5. `src/lib/projects.ts` contains no `import`, no `require`, and no reference to `process`, `fs`,
   `Astro`, or `import.meta`. Same inputs → same outputs, no I/O.
   **Review-only, not testable from the suite.** This is a property of the module text; reading
   it needs `node:fs` and therefore `@types/node`, which Non-goals forbid, and any such import
   violates this spec's own rule that a test file imports exactly the two `src/lib` modules.
6. Every object `projectSchema` accepts satisfies `isProjectStatus(data.status) === true`.
7. `formatStack(stack)` has no leading or trailing whitespace and no doubled separator.

## Content (exact literals)

`src/content/projects/sentinel-grid-honeynet.md`:

```markdown
---
title: 'Sentinel Grid Honeynet'
role: 'Backend engineer and technical lead'
stack: ['Python']
status: 'completed'
summary: 'A honeynet whose Python backend I built and whose technical direction I led — logging APIs that record what an attacker does once they are inside.'
order: 1
---

The interesting half of a honeynet is not the trap, it is the record. I wrote the Python backend
behind Sentinel Grid: the logging APIs that capture attacker activity and hand it to the people who
have to make sense of it afterwards. I also led the project's technical development, which mostly
meant deciding what we were and were not going to build, and keeping the logging contract stable
while everything above it changed.
```

`src/content/projects/tsat-2a.md` (no `repo` key — the deliberate absent-link case):

```markdown
---
title: 'TSAT 2A'
role: 'Software engineering team lead'
stack: ['C++', 'ESP32']
status: 'completed'
summary: 'The embedded C++ for the UCF Knights Satellite Club’s T-SAT 2A payload, designed end to end as software team lead.'
order: 2
---

TSAT 2A is a UCF Knights Satellite Club project, and I led its software team. I designed the
embedded C++ for the ESP32 flight code in full — not a module of it, the whole thing. Embedded work
is a good teacher of humility: there is no debugger waiting for you at altitude, so the code has to
be readable enough that the next person can reason about it on the ground.
```

`src/content/projects/typeracer-web-game.md`:

```markdown
---
title: 'TypeRacer Web Game'
role: 'Backend developer'
stack: ['MongoDB', 'Express', 'React', 'Node.js', 'Socket.IO']
status: 'completed'
summary: 'A 1v1 real-time typing game built at KnightHacks 8 — live lobbies, matchmaking, and performance tracking over Socket.IO.'
order: 3
---

Built over a weekend at KnightHacks 8. Two players race through the same passage in real time, which
means live lobbies, matchmaking, and per-keystroke performance tracking, all carried over Socket.IO.
I worked on the backend: JWT auth, a REST API over Express, and MongoDB for accounts and match
history. Hackathon code, but the matchmaking held up under a room full of people trying to break it.
```

### Page contract (verified by `npm run build` and by eye, not by the Vitest suite)

- `src/pages/projects/index.astro` — `<BaseLayout title="Projects" description="Software projects by
  Seth Jones: a Python honeynet backend, embedded C++ for the T-SAT 2A satellite payload, and a
  real-time multiplayer typing game.">`, one `<h1>Projects</h1>`, one intro paragraph, then
  `sortProjects((await getCollection('projects')).map((entry) => ({ id: entry.id, order: entry.data.order, title: entry.data.title, entry })))` rendered as one `<article class="project-card">`
  per entry containing `<h2><a href={projectHref(entry.id)}>{title}</a></h2>`, a
  `<p class="project-card__meta">` holding `role`, `statusLabel(status)` and `formatStack(stack)`,
  and `<p>{summary}</p>`. If the collection is empty, render one paragraph and no `<article>`.
- `src/pages/projects/[id].astro` — `getStaticPaths` from the collection; `<BaseLayout>` with
  `title={data.title}` and `description={data.summary}`; one `<h1>{data.title}</h1>`; the same meta
  line; the rendered Markdown body; and, **only when `data.repo` is a non-empty string**, an
  `<a class="project-repo" href={data.repo} rel="noopener">View the repository</a>`. When `repo` is
  absent, emit no link, no empty `<a>`, no placeholder text, and no `href="undefined"`.
- Styling: scoped `<style>` blocks in those two pages only, every colour/space/size via existing
  semantic tokens (`--color-surface`, `--color-border`, `--color-text-muted`, `--radius-md`,
  `--shadow-sm`, `--space-*`, `--text-sm`). No new tokens, no edits to `global.css`.

## Non-goals

- No new npm dependency. Zod comes from `astro/zod`, the same instance `defineCollection` validates
  with.
- The Vitest suite must not run `astro build`, import `astro:content`, read `src/content/**`, read
  `dist/**`, or render `.astro` files. Every test imports only the two `src/lib` modules and passes
  plain object literals.
- No blog collection, tags, images, filtering, search, pagination, RSS, or `featured` flag.
- No repo URLs invented for any entry (see Open questions). The `repo` rendering path is specified,
  and schema-tested with synthetic URLs only.
- No changes to `NAV_ITEMS`, the header, the footer, or the design tokens.

## Open questions

1. **Repo URLs are unknown.** All three entries ship with no `repo` key, so no repo link renders
   anywhere yet. Do not invent GitHub URLs. Seth supplies them later; adding one frontmatter line is
   the whole change.
2. **Page copy is a draft for Seth to revise.** The summaries and body paragraphs above are written
   in the voice of the existing About/Research pages, but the facts are second-hand. Treat the
   wording as placeholder-quality and the facts as needing confirmation.
3. **`astro/zod` export path.** Taken as the documented way to reach Astro's bundled Zod, but not
   executed against the installed `astro ^7.3.2`. If it does not resolve, add `zod` to
   `dependencies` at the version Astro depends on and import from there — keep the module path
   `src/lib/projects-schema.ts` and the export name `projectSchema` identical either way, since the
   test suite imports those names blind.
4. **`z.enum(PROJECT_STATUSES)` with a `readonly` tuple.** If the installed Zod rejects a readonly
   tuple, use `z.enum([...PROJECT_STATUSES])`; the accepted values must not change.
5. **Unused statuses.** `'in-progress'` and `'archived'` are defined but unused by the shipped three
   (all `'completed'`), so a future entry needs no schema change.
