/**
 * Exhibit registry types and pure helpers.
 * Zero imports, no I/O: unit-testable without an Astro build. The registry that
 * imports `.astro` files lives in `./workshop-registry` — keep this file free of
 * module and platform references when editing.
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
export function isExhibitId(value: unknown): value is string {
  // No trimming, casing or normalisation: an id is already valid or it is not.
  return typeof value === 'string' && EXHIBIT_ID_PATTERN.test(value);
}

/** DOM id for an exhibit's list item: `exhibit-<id>`. Throws TypeError on an invalid id. */
export function exhibitAnchorId(id: string): string {
  // The guard runs before any string method, so a null or undefined id reports
  // itself instead of throwing a property-access error from somewhere else.
  if (!isExhibitId(id)) {
    throw new TypeError(`exhibitAnchorId: invalid exhibit id "${String(id)}"`);
  }
  return `exhibit-${id}`;
}

/** Throws TypeError on the first repeated `id`, scanning in declaration order. Returns void. */
export function assertUniqueExhibitIds(exhibits: readonly Exhibit[]): void {
  // Scanned in declaration order so the reported duplicate is the first repeat,
  // not the last. Nothing is sorted, copied back, or read beyond each `id`.
  const seen = new Set<unknown>();
  for (const exhibit of exhibits) {
    const id = exhibit.id;
    if (seen.has(id)) {
      throw new TypeError(`assertUniqueExhibitIds: duplicate exhibit id "${String(id)}"`);
    }
    seen.add(id);
  }
}
