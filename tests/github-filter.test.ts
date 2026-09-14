import { describe, expect, it } from 'vitest';

import { filterRepos, isShowcaseRepo, type RepoInput } from '../src/lib/github';

// Covers Behavior rows 1-7 and the "empty repo list" Boundaries row as it
// applies to filterRepos.
//
// NOT covered: the Boundaries row "null/undefined passed to isShowcaseRepo,
// compareRepos, filterRepos, rankRepos, toShowcaseRepo, repoMetaLine,
// selectShowcaseRepos". The spec answers it "Undefined, do not test", so there
// is no contracted result to assert for those inputs.

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

describe('isShowcaseRepo', () => {
  it('accepts a plain owned repo', () => {
    // Behavior #1
    expect(isShowcaseRepo({ ...base, name: 'honeynet' })).toBe(true);
  });

  it('rejects a fork', () => {
    // Behavior #2
    expect(isShowcaseRepo({ ...base, fork: true })).toBe(false);
  });

  it('rejects an archived repo', () => {
    // Behavior #3
    expect(isShowcaseRepo({ ...base, archived: true })).toBe(false);
  });

  it('rejects the website repo by name', () => {
    // Behavior #4
    expect(isShowcaseRepo({ ...base, name: 'SethJonesIntern.github.io' })).toBe(false);
  });

  it('rejects the website repo name case-insensitively', () => {
    // Behavior #5
    expect(isShowcaseRepo({ ...base, name: 'sethjonesintern.github.io' })).toBe(false);
  });

  it('accepts a repo whose name merely ends with github.io', () => {
    // Behavior #6: only the exact website repo name is excluded
    expect(isShowcaseRepo({ ...base, name: 'github.io' })).toBe(true);
  });
});

describe('filterRepos', () => {
  it('keeps only accepted repos and preserves input order', () => {
    // Behavior #7
    const result = filterRepos([
      { ...base, name: 'a' },
      { ...base, name: 'b', fork: true },
      { ...base, name: 'c', archived: true },
      { ...base, name: 'SethJonesIntern.github.io' },
      { ...base, name: 'd' },
    ]);
    expect(result.map((repo) => repo.name)).toEqual(['a', 'd']);
  });

  it('returns an empty array for an empty input', () => {
    // Boundaries: "empty repo list" -> filterRepos([]) === []
    expect(filterRepos([])).toEqual([]);
  });

  it('returns a new array rather than the empty input array itself', () => {
    // Boundaries: "empty repo list" -> "(new array)"
    const input: readonly RepoInput[] = [];
    expect(filterRepos(input)).not.toBe(input);
  });
});
