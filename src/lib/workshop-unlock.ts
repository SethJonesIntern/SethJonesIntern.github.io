/**
 * Workshop unlock: the two-book combination on the reading shelf.
 * Zero imports, no DOM, no globals: storage, event details and pathnames are passed in,
 * so every branch is unit-testable without a browser or an Astro build.
 */

/** The key books, by stable READING_LIST id, in the order they must be pulled. */
export const UNLOCK_SEQUENCE: readonly string[] = [
  'a-clash-of-kings',
  'harry-potter-prisoner-of-azkaban',
];

/** Storage key holding the unlock flag. */
export const UNLOCK_STORAGE_KEY: string = 'workshop-unlocked';

/** The only stored value that counts as unlocked. */
export const UNLOCK_STORAGE_VALUE: string = 'true';

/** Where a completed combination navigates, and the nav item's href. */
export const WORKSHOP_HREF: string = '/workshop/';

/** Link text of the runtime nav item. */
export const WORKSHOP_NAV_LABEL: string = 'Workshop';

export interface PullResult {
  /** Correct pulls held after this one. Always an integer, 0 <= progress < max(sequence.length, 1). */
  readonly progress: number;
  /** True exactly when this pull completed the sequence. When true, progress is 0. */
  readonly unlocked: boolean;
}

/**
 * One pointer click on one spine. `progress` is the value returned by the previous pull (start at 0);
 * `bookId` is the clicked spine's `data-book-id`, unvalidated. Never throws.
 */
export function pullBook(
  progress: number,
  bookId: unknown,
  sequence: readonly string[] = UNLOCK_SEQUENCE,
): PullResult {
  const length = sequence.length;
  if (length === 0) return { progress: 0, unlocked: false };
  const held = Number.isInteger(progress) && progress >= 0 && progress < length ? progress : 0;
  if (bookId === sequence[held]) {
    const next = held + 1;
    return next === length ? { progress: 0, unlocked: true } : { progress: next, unlocked: false };
  }
  // Re-arm on the first key so a double-click, or a retry after a stray pull, still holds one pull.
  // Length is >= 2 here: with one key, a match on sequence[0] was taken above.
  if (bookId === sequence[0]) return { progress: 1, unlocked: false };
  return { progress: 0, unlocked: false };
}

/**
 * True only for a `MouseEvent.detail` that is an integer >= 1, i.e. a click produced by a real
 * pointer press (mouse, pen, touch tap). Keyboard activation, assistive-technology activation and
 * `element.click()` dispatch `click` with detail 0 and return false. Never throws.
 */
export function isPointerClick(detail: unknown): boolean {
  return typeof detail === 'number' && Number.isInteger(detail) && detail >= 1;
}

/**
 * Build-time guard. Throws TypeError if `sequence` is empty, names an id absent from `knownIds`,
 * or repeats an id. Membership is exact string equality. Returns void.
 */
export function assertUnlockSequence(sequence: readonly string[], knownIds: readonly string[]): void {
  if (sequence.length === 0) {
    throw new TypeError('assertUnlockSequence: the sequence is empty');
  }
  // Left to right, unknown before duplicate, so the first failing element is the one reported.
  const seen = new Set<unknown>();
  for (const id of sequence) {
    if (!knownIds.includes(id)) {
      throw new TypeError(`assertUnlockSequence: unknown book id "${String(id)}"`);
    }
    if (seen.has(id)) {
      throw new TypeError(`assertUnlockSequence: duplicate book id "${String(id)}"`);
    }
    seen.add(id);
  }
}

/** The two Storage methods this feature uses. The browser's Storage object satisfies it. */
export interface UnlockStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Reads the `localStorage` property of `host` defensively. Returns that object when it has callable
 * `getItem` and `setItem`; returns null when the read throws (blocked site data, null/undefined
 * host) or the value is not such an object. Never throws.
 */
export function openStorage(host: unknown): UnlockStorage | null {
  if (typeof host !== 'object' || host === null) return null;
  try {
    // Blocked site data throws on this property read, not later.
    const candidate = (host as Record<string, unknown>).localStorage;
    if (typeof candidate !== 'object' || candidate === null) return null;
    const methods = candidate as Record<string, unknown>;
    if (typeof methods.getItem !== 'function' || typeof methods.setItem !== 'function') return null;
    return candidate as UnlockStorage;
  } catch {
    return null;
  }
}

/** True only when `raw` is exactly the string UNLOCK_STORAGE_VALUE. No trimming, no casing. */
export function parseUnlockFlag(raw: unknown): boolean {
  return raw === UNLOCK_STORAGE_VALUE;
}

/** parseUnlockFlag(storage.getItem(UNLOCK_STORAGE_KEY)); false for null storage or a throwing read. Never throws. */
export function readUnlocked(storage: UnlockStorage | null): boolean {
  if (storage === null) return false;
  try {
    return parseUnlockFlag(storage.getItem(UNLOCK_STORAGE_KEY));
  } catch {
    return false;
  }
}

/**
 * storage.setItem(UNLOCK_STORAGE_KEY, UNLOCK_STORAGE_VALUE). Returns true if the write did not throw;
 * false for null storage or any exception raised while writing. Never throws.
 */
export function recordUnlock(storage: UnlockStorage | null): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(UNLOCK_STORAGE_KEY, UNLOCK_STORAGE_VALUE);
    return true;
  } catch {
    return false;
  }
}

/** True for `/workshop/`, `/workshop`, and descendants. Same matching rule as SiteNav: case-sensitive, segment-bounded. */
export function isWorkshopPath(pathname: unknown): boolean {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return false;
  // Slash-terminating both sides keeps the prefix test on segment boundaries, as SiteNav does.
  const current = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return current.startsWith(WORKSHOP_HREF);
}

export interface WorkshopNavLink {
  /** WORKSHOP_HREF. */
  readonly href: string;
  /** WORKSHOP_NAV_LABEL. */
  readonly label: string;
  /** 'site-nav__link is-active' when isWorkshopPath(pathname), else 'site-nav__link'. */
  readonly className: string;
  /** 'page' when isWorkshopPath(pathname), else null. */
  readonly ariaCurrent: 'page' | null;
}

/** The runtime nav item's attributes for the current pathname. Never throws. */
export function workshopNavLink(pathname: unknown): WorkshopNavLink {
  const active = isWorkshopPath(pathname);
  return {
    href: WORKSHOP_HREF,
    label: WORKSHOP_NAV_LABEL,
    className: active ? 'site-nav__link is-active' : 'site-nav__link',
    ariaCurrent: active ? 'page' : null,
  };
}
