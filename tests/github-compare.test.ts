import { describe, expect, it } from 'vitest';

import { compareRepos, type RepoInput } from '../src/lib/github';

// Covers Behavior rows 8-13 and the Boundaries rows
// "Number.MAX_SAFE_INTEGER stars ... compares numerically",
// "negative stargazers_count ... still sorts numerically" and
// "duplicate repo names ... full ties give compareRepos -> 0".
//
// NOT covered here: the "malformed pushed_at" Boundaries row. The spec says the
// value is compared as a raw string and that its "ordering is defined but
// unspecified in meaning. Do not assert an order for it." There is no concrete
// expected value to assert, so no test is written.

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

describe('compareRepos', () => {
  it('orders the repo with more stars first', () => {
    // Behavior #8
    expect(
      compareRepos(
        { ...base, name: 'a', stargazers_count: 9 },
        { ...base, name: 'b', stargazers_count: 2 },
      ),
    ).toBe(-1);
  });

  it('is antisymmetric when star counts differ', () => {
    // Behavior #9
    expect(
      compareRepos(
        { ...base, name: 'b', stargazers_count: 2 },
        { ...base, name: 'a', stargazers_count: 9 },
      ),
    ).toBe(1);
  });

  it('breaks a star tie by putting the more recent pushed_at first', () => {
    // Behavior #10
    expect(
      compareRepos(
        { ...base, name: 'a', stargazers_count: 3, pushed_at: '2026-05-01T00:00:00Z' },
        { ...base, name: 'b', stargazers_count: 3, pushed_at: '2026-01-01T00:00:00Z' },
      ),
    ).toBe(-1);
  });

  it('ranks pushed_at above name when the two keys disagree', () => {
    // compareRepos contract: "stars descending, then pushed_at descending, then
    // name ascending". Here 'z' is newer than 'a', so recency must win and the
    // name key must not be reached.
    expect(
      compareRepos(
        { ...base, name: 'z', stargazers_count: 3, pushed_at: '2026-05-01T00:00:00Z' },
        { ...base, name: 'a', stargazers_count: 3, pushed_at: '2026-01-01T00:00:00Z' },
      ),
    ).toBe(-1);
  });

  it('breaks a star and pushed_at tie on ascending name', () => {
    // Behavior #11
    expect(
      compareRepos(
        { ...base, name: 'alpha', stargazers_count: 3 },
        { ...base, name: 'beta', stargazers_count: 3 },
      ),
    ).toBe(-1);
  });

  it('compares names by codepoint rather than case-insensitively', () => {
    // Behavior #12: 'Z' (U+005A, 90) < 'a' (U+0061, 97)
    expect(compareRepos({ ...base, name: 'Zebra' }, { ...base, name: 'apple' })).toBe(-1);
  });

  it('returns 0 when stars, pushed_at and name are all equal', () => {
    // Behavior #13
    expect(compareRepos({ ...base, name: 'x' }, { ...base, name: 'x' })).toBe(0);
  });

  it('returns 0 for two repos that share a duplicate name and all sort keys', () => {
    // Boundaries: "duplicate repo names | Legal input; full ties give
    // compareRepos -> 0". Different html_url proves only the sort keys matter.
    expect(
      compareRepos(
        { ...base, name: 'dup', html_url: 'https://github.com/SethJonesIntern/dup' },
        { ...base, name: 'dup', html_url: 'https://github.com/other/dup' },
      ),
    ).toBe(0);
  });

  it('compares a very large star count numerically rather than as a string', () => {
    // Boundaries: "Number.MAX_SAFE_INTEGER stars | Accepted; compares
    // numerically". A string compare would rank '10' before '9007199254740991'
    // and the ascending-name key would also return -1, so only the numeric
    // descending rule yields 1.
    expect(
      compareRepos(
        { ...base, name: 'a', stargazers_count: 10 },
        { ...base, name: 'b', stargazers_count: Number.MAX_SAFE_INTEGER },
      ),
    ).toBe(1);
  });

  it('sorts a negative star count below zero stars', () => {
    // Boundaries: "negative stargazers_count | formatStars -> ''; still sorts
    // numerically". Names are chosen so the name key would return 1, leaving
    // the descending star rule as the only source of -1.
    expect(
      compareRepos(
        { ...base, name: 'z', stargazers_count: 0 },
        { ...base, name: 'a', stargazers_count: -1 },
      ),
    ).toBe(-1);
  });
});
