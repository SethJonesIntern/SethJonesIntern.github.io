/* Pure decision logic for the projects collection: no dependencies, no I/O, and
   the same output for the same input, so it can be unit-tested on its own. The
   file is deliberately free of module and platform references — keep it that
   way when editing. */

export const PROJECT_STATUSES = ['in-progress', 'completed', 'archived'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** The minimum shape the ordering functions need. Extra properties are allowed and preserved. */
export interface ProjectSortInput {
  readonly id: string;
  readonly order: number;
  readonly title: string;
}

const STATUS_LABELS: Readonly<Record<ProjectStatus, string>> = {
  'in-progress': 'In progress',
  completed: 'Completed',
  archived: 'Archived',
};

/** Space, U+00B7 MIDDLE DOT, space — the same separator the site uses for title parts. */
const STACK_SEPARATOR = ' · ';

/** `order` is schema-validated as a positive integer, but a NaN arriving from
    unvalidated data would make every `<`/`>` false and so make the order
    intransitive. Sorting NaN last keeps the comparator a total order. */
function compareOrder(a: number, b: number): -1 | 0 | 1 {
  const aInvalid = Number.isNaN(a);
  const bInvalid = Number.isNaN(b);
  if (aInvalid || bInvalid) {
    if (aInvalid && bInvalid) return 0;
    return aInvalid ? 1 : -1;
  }
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Codepoint-wise, never locale-aware: results must not depend on the host locale. */
function compareStrings(a: string, b: string): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Total order: `order` ascending, then `title`, then `id`. Returns exactly -1, 0, or 1. */
export function compareProjects(a: ProjectSortInput, b: ProjectSortInput): -1 | 0 | 1 {
  const byOrder = compareOrder(a.order, b.order);
  if (byOrder !== 0) return byOrder;

  const byTitle = compareStrings(a.title, b.title);
  if (byTitle !== 0) return byTitle;

  return compareStrings(a.id, b.id);
}

/** New array, sorted by `compareProjects`. Never mutates or aliases the input array. */
export function sortProjects<T extends ProjectSortInput>(projects: readonly T[]): T[] {
  // Array.prototype.sort is stable, so a full tie preserves input order.
  return [...projects].sort(compareProjects);
}

/** Human label for a status value. */
export function statusLabel(status: ProjectStatus): string {
  return STATUS_LABELS[status];
}

/** Runtime guard for unvalidated values (e.g. a raw frontmatter field). */
export function isProjectStatus(value: unknown): value is ProjectStatus {
  return (
    typeof value === 'string' && (PROJECT_STATUSES as readonly string[]).indexOf(value) !== -1
  );
}

/** Display string for a stack list. */
export function formatStack(stack: readonly string[]): string {
  return stack
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
    .join(STACK_SEPARATOR);
}

/** Detail-page path for a collection entry id. Throws on an effectively empty id. */
export function projectHref(id: string): string {
  const slug = typeof id === 'string' ? id.trim().replace(/^\/+|\/+$/g, '').trim() : '';
  if (slug === '') {
    throw new TypeError('projectHref: id must be a non-empty string');
  }
  return `/projects/${slug}/`;
}
