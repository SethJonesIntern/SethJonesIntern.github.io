import { describe, expect, it } from 'vitest';

import { toShowcaseRepo, type RepoInput } from '../src/lib/github';

// Covers Behavior rows 22-24, plus the "missing description", "missing
// language", "zero stars" and "unicode names/descriptions/languages"
// Boundaries rows as they apply to the projection.

const base: RepoInput = {
  name: 'repo',
  html_url: 'https://github.com/SethJonesIntern/repo',
  description: null,
  language: null,
  stargazers_count: 0,
  fork: false,
  archived: false,
  pushed_at: '2026-01-01T00:00:00Z',
};

describe('toShowcaseRepo', () => {
  it('projects a fully populated repo onto the render-ready shape', () => {
    // Behavior #22
    expect(
      toShowcaseRepo({
        ...base,
        name: 'honeynet',
        html_url: 'https://github.com/SethJonesIntern/honeynet',
        description: '  A trap.  ',
        language: 'Python',
        stargazers_count: 2,
      }),
    ).toEqual({
      name: 'honeynet',
      url: 'https://github.com/SethJonesIntern/honeynet',
      description: 'A trap.',
      language: 'Python',
      stars: 2,
      meta: 'Python · 2 stars',
    });
  });

  it('normalises an empty description to null', () => {
    // Behavior #23
    expect(toShowcaseRepo({ ...base, description: '' }).description).toBe(null);
  });

  it('normalises a whitespace-only description to null', () => {
    // Behavior #23
    expect(toShowcaseRepo({ ...base, description: '   ' }).description).toBe(null);
  });

  it('keeps a null description as null', () => {
    // Behavior #23, and Boundaries: "missing description"
    expect(toShowcaseRepo({ ...base, description: null }).description).toBe(null);
  });

  it('normalises a whitespace-only language to null', () => {
    // Behavior #24, and Boundaries: "missing language | ... omitted from
    // ShowcaseRepo"
    expect(toShowcaseRepo({ ...base, language: '  ' }).language).toBe(null);
  });

  it('reports zero stars as the number 0 while omitting them from meta', () => {
    // Boundaries: "zero stars | omitted from meta; ShowcaseRepo.stars === 0"
    const result = toShowcaseRepo({ ...base, stargazers_count: 0, language: 'Rust' });
    expect(result).toEqual({
      name: 'repo',
      url: 'https://github.com/SethJonesIntern/repo',
      description: null,
      language: 'Rust',
      stars: 0,
      meta: 'Rust',
    });
  });

  it('preserves non-ASCII names and descriptions unchanged', () => {
    // Boundaries: "unicode names/descriptions/languages | Round-trip unchanged.
    // toShowcaseRepo({...base,name:'grid-Ω',description:'Ω 😀'}) preserves both."
    const result = toShowcaseRepo({ ...base, name: 'grid-Ω', description: 'Ω \u{1f600}' });
    expect(result.name).toBe('grid-Ω');
    expect(result.description).toBe('Ω \u{1f600}');
  });
});
