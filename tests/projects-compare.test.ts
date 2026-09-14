import { describe, expect, it } from 'vitest';

import { compareProjects } from '../src/lib/projects';

// Covers Behavior rows 1-7, and the Boundaries rows
// "single item" (compareProjects(x, x) === 0) and
// "very large order (Number.MAX_SAFE_INTEGER) ... compares numerically".

describe('compareProjects', () => {
  it('orders the lower order value first', () => {
    // Behavior #1
    expect(
      compareProjects({ id: 'a', order: 1, title: 'Alpha' }, { id: 'b', order: 2, title: 'Beta' }),
    ).toBe(-1);
  });

  it('is antisymmetric for differing order values', () => {
    // Behavior #2
    expect(
      compareProjects({ id: 'b', order: 2, title: 'Beta' }, { id: 'a', order: 1, title: 'Alpha' }),
    ).toBe(1);
  });

  it('breaks an order tie on title and ignores id while titles differ', () => {
    // Behavior #3
    expect(
      compareProjects(
        { id: 'zeta', order: 2, title: 'Alpha' },
        { id: 'alpha', order: 2, title: 'Beta' },
      ),
    ).toBe(-1);
  });

  it('breaks an order and title tie on id', () => {
    // Behavior #4
    expect(
      compareProjects(
        { id: 'alpha', order: 2, title: 'Same' },
        { id: 'beta', order: 2, title: 'Same' },
      ),
    ).toBe(-1);
  });

  it('returns 0 when order, title and id are all equal', () => {
    // Behavior #5
    expect(
      compareProjects({ id: 'x', order: 2, title: 'Same' }, { id: 'x', order: 2, title: 'Same' }),
    ).toBe(0);
  });

  it('compares titles by codepoint rather than case-insensitively', () => {
    // Behavior #6: 'Z' (U+005A) < 'a' (U+0061)
    expect(
      compareProjects({ id: 'a', order: 1, title: 'Zebra' }, { id: 'b', order: 1, title: 'apple' }),
    ).toBe(-1);
  });

  it('compares non-ASCII titles by codepoint without locale collation', () => {
    // Behavior #7: 'É' (U+00C9) > 'Z' (U+005A)
    expect(
      compareProjects({ id: 'a', order: 1, title: 'Éclair' }, { id: 'b', order: 1, title: 'Zebra' }),
    ).toBe(1);
  });

  it('returns 0 when handed the very same object twice', () => {
    // Boundaries: "single item" -> compareProjects(x, x) === 0
    const only = { id: 'tsat-2a', order: 2, title: 'TSAT 2A' };
    expect(compareProjects(only, only)).toBe(0);
  });

  it('compares a very large order numerically rather than as a string', () => {
    // Boundaries: "very large order (Number.MAX_SAFE_INTEGER) ... compares numerically".
    // String comparison would put '9007199254740991' before '10'.
    expect(
      compareProjects(
        { id: 'a', order: 10, title: 'A' },
        { id: 'b', order: Number.MAX_SAFE_INTEGER, title: 'B' },
      ),
    ).toBe(-1);
  });
});
