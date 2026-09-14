import { describe, expect, it } from 'vitest';

import { normalizeTag, tagSlug } from '../src/lib/posts';

// Covers Behavior rows 14 and 15.

describe('normalizeTag', () => {
  it('trims the ends, collapses internal whitespace runs and keeps case', () => {
    // Behavior #14
    expect(normalizeTag('  Spec   Harness ')).toBe('Spec Harness');
  });
});

describe('tagSlug', () => {
  it('normalizes whitespace and then slugifies a multi-word tag', () => {
    // Behavior #15
    expect(tagSlug('  Spec   Harness ')).toBe('spec-harness');
  });

  it('lowercases an all-caps tag', () => {
    // Behavior #15
    expect(tagSlug('AI')).toBe('ai');
  });
});
