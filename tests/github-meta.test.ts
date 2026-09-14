import { describe, expect, it } from 'vitest';

import { repoMetaLine, type RepoInput } from '../src/lib/github';

// Covers Behavior rows 17-21, plus the "missing language" and "zero stars"
// Boundaries rows as they apply to the meta line.

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

describe('repoMetaLine', () => {
  it('joins language and stars with a space, U+00B7 and a space', () => {
    // Behavior #17
    expect(repoMetaLine({ ...base, language: 'Python', stargazers_count: 3 })).toBe(
      'Python · 3 stars',
    );
  });

  it('omits zero stars and leaves no dangling separator', () => {
    // Behavior #18, and Boundaries: "zero stars | omitted from meta"
    expect(repoMetaLine({ ...base, language: 'Python', stargazers_count: 0 })).toBe('Python');
  });

  it('omits a missing language and keeps the star count alone', () => {
    // Behavior #19, and Boundaries: "missing language"
    expect(repoMetaLine({ ...base, language: null, stargazers_count: 4 })).toBe('4 stars');
  });

  it('returns an empty string when there is no language and no star count', () => {
    // Behavior #20
    expect(repoMetaLine({ ...base, language: null, stargazers_count: 0 })).toBe('');
  });

  it('treats a whitespace-only language as absent', () => {
    // Behavior #21, and Boundaries: "missing language | ... blank"
    expect(repoMetaLine({ ...base, language: '  ', stargazers_count: 1 })).toBe('1 star');
  });
});
