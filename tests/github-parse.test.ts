import { describe, expect, it } from 'vitest';

import { parseRepoList, type RepoInput } from '../src/lib/github';

// Covers Behavior rows 29-33, the Errors row "parseRepoList given any malformed
// value | never throws; returns [] or the valid subset", and the "malformed API
// response" Boundaries row.

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

describe('parseRepoList', () => {
  it('keeps a structurally valid entry with all eight fields intact', () => {
    // Behavior #29
    expect(parseRepoList([base])).toEqual([
      {
        name: 'repo',
        html_url: 'https://github.com/SethJonesIntern/repo',
        description: null,
        language: null,
        stargazers_count: 0,
        fork: false,
        archived: false,
        pushed_at: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('drops structurally invalid entries instead of throwing', () => {
    // Behavior #30
    const input: unknown = [
      base,
      { name: 'x' },
      null,
      42,
      'repo',
      { ...base, stargazers_count: '3' },
    ];
    expect(parseRepoList(input)).toEqual([
      {
        name: 'repo',
        html_url: 'https://github.com/SethJonesIntern/repo',
        description: null,
        language: null,
        stargazers_count: 0,
        fork: false,
        archived: false,
        pushed_at: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('returns an empty array for null', () => {
    // Behavior #31
    expect(parseRepoList(null)).toEqual([]);
  });

  it('returns an empty array for undefined', () => {
    // Behavior #31
    expect(parseRepoList(undefined)).toEqual([]);
  });

  it('returns an empty array for a GitHub error object', () => {
    // Behavior #31: e.g. the 404 body { message: 'Not Found' }
    expect(parseRepoList({ message: 'Not Found' })).toEqual([]);
  });

  it('returns an empty array for the empty string', () => {
    // Behavior #31
    expect(parseRepoList('')).toEqual([]);
  });

  it('rejects an entry whose description is undefined rather than string or null', () => {
    // Behavior #32
    expect(parseRepoList([{ ...base, description: undefined }])).toEqual([]);
  });

  it('tolerates and carries unknown API fields on a valid entry', () => {
    // Behavior #33
    expect(parseRepoList([{ ...base, extra: true }])[0]).toEqual({
      name: 'repo',
      html_url: 'https://github.com/SethJonesIntern/repo',
      description: null,
      language: null,
      stargazers_count: 0,
      fork: false,
      archived: false,
      pushed_at: '2026-01-01T00:00:00Z',
      extra: true,
    });
  });

  it('never throws for any malformed non-array value', () => {
    // Errors row: "parseRepoList given any malformed value | never throws;
    // returns [] or the valid subset". Every value here is a non-array, so the
    // contracted result is [] ("Returns [] for any non-array").
    const malformed: readonly unknown[] = [
      null,
      undefined,
      '',
      'not json',
      0,
      NaN,
      true,
      false,
      {},
      { message: 'API rate limit exceeded' },
      { length: 2, 0: base, 1: base },
      new Map(),
      new Set([base]),
      () => [base],
      Symbol('repos'),
    ];
    for (const value of malformed) {
      expect(() => parseRepoList(value), `parseRepoList threw for ${String(value)}`).not.toThrow();
      expect(parseRepoList(value), `unexpected result for ${String(value)}`).toEqual([]);
    }
  });

  it('never throws for an array whose entries are hostile values', () => {
    // Errors row: same contract, array branch. Every entry below is missing at
    // least one required field or has the wrong type for it, so none survive.
    const input: unknown = [
      null,
      undefined,
      0,
      '',
      [],
      [base],
      {},
      { ...base, name: 42 },
      { ...base, html_url: null },
      { ...base, description: 7 },
      { ...base, language: false },
      { ...base, stargazers_count: null },
      { ...base, fork: 'false' },
      { ...base, archived: 1 },
      { ...base, pushed_at: null },
    ];
    expect(() => parseRepoList(input)).not.toThrow();
    expect(parseRepoList(input)).toEqual([]);
  });
});
