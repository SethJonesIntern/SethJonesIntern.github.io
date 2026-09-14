import { describe, expect, it } from 'vitest';

import { rankRepos, type RepoInput } from '../src/lib/github';

// Covers Behavior row 14, the "empty repo list" Boundaries row as it applies to
// rankRepos, the "duplicate repo names ... Array.prototype.sort stability
// preserves input order" Boundaries row, and the "unordered input array"
// Boundaries row (output depends only on the sort keys).

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

describe('rankRepos', () => {
  it('drops excluded repos and orders the rest by stars then recency', () => {
    // Behavior #14
    const result = rankRepos([
      { ...base, name: 'c', stargazers_count: 1 },
      { ...base, name: 'a', stargazers_count: 5 },
      { ...base, name: 'b', stargazers_count: 5, fork: true },
      { ...base, name: 'd', stargazers_count: 5, pushed_at: '2026-06-01T00:00:00Z' },
    ]);
    expect(result.map((repo) => repo.name)).toEqual(['d', 'a', 'c']);
  });

  it('does not slice the ranked list', () => {
    // Signature contract: "Filter, then sort by compareRepos. No slicing."
    // Seven admissible repos must all survive, unlike selectShowcaseRepos.
    const result = rankRepos([
      { ...base, name: 'r1', stargazers_count: 1 },
      { ...base, name: 'r2', stargazers_count: 2 },
      { ...base, name: 'r3', stargazers_count: 3 },
      { ...base, name: 'r4', stargazers_count: 4 },
      { ...base, name: 'r5', stargazers_count: 5 },
      { ...base, name: 'r6', stargazers_count: 6 },
      { ...base, name: 'r7', stargazers_count: 7 },
    ]);
    expect(result.map((repo) => repo.name)).toEqual(['r7', 'r6', 'r5', 'r4', 'r3', 'r2', 'r1']);
  });

  it('returns an empty array for an empty input', () => {
    // Boundaries: "empty repo list" -> rankRepos([]) === []
    expect(rankRepos([])).toEqual([]);
  });

  it('returns a new array rather than the empty input array itself', () => {
    // Boundaries: "empty repo list" -> "(new array)"
    const input: readonly RepoInput[] = [];
    expect(rankRepos(input)).not.toBe(input);
  });

  it('preserves input order for duplicate names that tie on every sort key', () => {
    // Boundaries: "duplicate repo names | ... Array.prototype.sort stability
    // preserves input order". html_url distinguishes the two tied entries.
    const result = rankRepos([
      { ...base, name: 'dup', html_url: 'https://github.com/SethJonesIntern/dup-first' },
      { ...base, name: 'dup', html_url: 'https://github.com/SethJonesIntern/dup-second' },
      {
        ...base,
        name: 'top',
        html_url: 'https://github.com/SethJonesIntern/top',
        stargazers_count: 5,
      },
    ]);
    expect(result.map((repo) => repo.html_url)).toEqual([
      'https://github.com/SethJonesIntern/top',
      'https://github.com/SethJonesIntern/dup-first',
      'https://github.com/SethJonesIntern/dup-second',
    ]);
  });

  it('produces the same order regardless of the input positions of the repos', () => {
    // Boundaries: "unordered input array | Output depends only on the sort
    // keys, never input position".
    const shuffled = rankRepos([
      { ...base, name: 'mid', stargazers_count: 4 },
      { ...base, name: 'low', stargazers_count: 1 },
      { ...base, name: 'high', stargazers_count: 9 },
    ]);
    expect(shuffled.map((repo) => repo.name)).toEqual(['high', 'mid', 'low']);
  });
});
