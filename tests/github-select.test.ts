import { describe, expect, it } from 'vitest';

import { selectShowcaseRepos, WEBSITE_REPO_NAME, type RepoInput } from '../src/lib/github';

// Covers Behavior rows 25-28, the Errors row
// "selectShowcaseRepos(repos, -1) / (repos, 1.5) / (repos, NaN) -> RangeError",
// the "empty repo list" Boundaries row as it applies to selectShowcaseRepos and
// the "all repos filtered out" Boundaries row.
//
// The page-level half of the "all repos filtered out" row ("Page renders the
// empty/fallback paragraph") is not tested: the spec says "Test the function
// only", and the Non-goals forbid rendering .astro files.

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

const EXPECTED_LIMIT_MESSAGE = 'selectShowcaseRepos: limit must be a non-negative integer';

function captureThrown(limit: number): unknown {
  try {
    selectShowcaseRepos([{ ...base, name: 'a' }], limit);
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('selectShowcaseRepos', () => {
  it('returns an empty array for an empty repo list', () => {
    // Behavior #25, and Boundaries: "empty repo list"
    expect(selectShowcaseRepos([])).toEqual([]);
  });

  it('returns a new array rather than the empty input array itself', () => {
    // Boundaries: "empty repo list" -> "(new array)"
    const input: readonly RepoInput[] = [];
    expect(selectShowcaseRepos(input)).not.toBe(input);
  });

  it('keeps only the top six repos when no limit is given', () => {
    // Behavior #26: the default limit is SHOWCASE_LIMIT (6)
    const result = selectShowcaseRepos([
      { ...base, name: 'r1', stargazers_count: 1 },
      { ...base, name: 'r2', stargazers_count: 2 },
      { ...base, name: 'r3', stargazers_count: 3 },
      { ...base, name: 'r4', stargazers_count: 4 },
      { ...base, name: 'r5', stargazers_count: 5 },
      { ...base, name: 'r6', stargazers_count: 6 },
      { ...base, name: 'r7', stargazers_count: 7 },
    ]);
    expect(result.map((repo) => repo.name)).toEqual(['r7', 'r6', 'r5', 'r4', 'r3', 'r2']);
  });

  it('honours an explicit smaller limit', () => {
    // Behavior #27
    const result = selectShowcaseRepos([{ ...base, name: 'a' }, { ...base, name: 'b' }], 1);
    expect(result.map((repo) => repo.name)).toEqual(['a']);
  });

  it('treats a limit of zero as legal and returns nothing', () => {
    // Behavior #28
    expect(selectShowcaseRepos([{ ...base, name: 'a' }], 0)).toEqual([]);
  });

  it('returns an empty array when every repo is excluded', () => {
    // Boundaries: "all repos filtered out"
    expect(
      selectShowcaseRepos([
        { ...base, fork: true },
        { ...base, archived: true },
        { ...base, name: WEBSITE_REPO_NAME },
      ]),
    ).toEqual([]);
  });

  it('returns ShowcaseRepo projections rather than raw RepoInput objects', () => {
    // Signature contract: "rankRepos then .slice(0, limit) then toShowcaseRepo"
    expect(
      selectShowcaseRepos([
        {
          ...base,
          name: 'honeynet',
          html_url: 'https://github.com/SethJonesIntern/honeynet',
          description: '  A trap.  ',
          language: 'Python',
          stargazers_count: 2,
        },
      ]),
    ).toEqual([
      {
        name: 'honeynet',
        url: 'https://github.com/SethJonesIntern/honeynet',
        description: 'A trap.',
        language: 'Python',
        stars: 2,
        meta: 'Python · 2 stars',
      },
    ]);
  });

  it('throws a RangeError for a negative limit', () => {
    // Errors row 1
    const thrown = captureThrown(-1);
    expect(thrown).toBeInstanceOf(RangeError);
    expect((thrown as Error).message).toBe(EXPECTED_LIMIT_MESSAGE);
  });

  it('throws a RangeError for a fractional limit', () => {
    // Errors row 1
    const thrown = captureThrown(1.5);
    expect(thrown).toBeInstanceOf(RangeError);
    expect((thrown as Error).message).toBe(EXPECTED_LIMIT_MESSAGE);
  });

  it('throws a RangeError for a NaN limit', () => {
    // Errors row 1
    const thrown = captureThrown(NaN);
    expect(thrown).toBeInstanceOf(RangeError);
    expect((thrown as Error).message).toBe(EXPECTED_LIMIT_MESSAGE);
  });
});
