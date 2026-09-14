import { describe, expect, it } from 'vitest';

import {
  GITHUB_PROFILE_URL,
  GITHUB_USERNAME,
  SHOWCASE_LIMIT,
  WEBSITE_REPO_NAME,
} from '../src/lib/github';

// Covers Behavior row 34 (exact values of the four exported constants).
//
// src/lib/github-fetch.ts and its GITHUB_REPOS_URL constant are deliberately
// NOT imported here: the spec's "Test setup" section forbids importing the
// fetch module from the suite.
//
// Consequently the following spec rows have no test anywhere in this suite,
// each by the spec's own instruction:
//
//  - Errors: "fetchShowcaseRepos - network error, DNS failure, timeout"
//    ("Not covered by the suite (network)").
//  - Errors: "fetchShowcaseRepos - HTTP 403/429" and "2xx with non-JSON or
//    non-array body" - both need a fetch mock or the network, and the spec's
//    Non-goals forbid mocking fetch and importing the fetch module. The
//    parseRepoList half of the non-array-body row is covered in
//    tests/github-parse.test.ts.
//  - Errors: "build-time failure of any kind ... npm run build still exits 0"
//    - needs astro build, which the Non-goals forbid.
//  - Boundaries: "fetch failure" - explicitly marked "Do not test".
//  - Everything under "Page contract", which the spec marks as "verified by
//    npm run build and by eye, not by Vitest".

describe('github showcase constants', () => {
  it('exports the GitHub username SethJonesIntern', () => {
    // Behavior #34
    expect(GITHUB_USERNAME).toBe('SethJonesIntern');
  });

  it('exports the website repo name that is excluded from the showcase', () => {
    // Behavior #34
    expect(WEBSITE_REPO_NAME).toBe('SethJonesIntern.github.io');
  });

  it('exports a showcase limit of 6', () => {
    // Behavior #34
    expect(SHOWCASE_LIMIT).toBe(6);
  });

  it('exports the public profile URL used by the fallback paragraph', () => {
    // Behavior #34
    expect(GITHUB_PROFILE_URL).toBe('https://github.com/SethJonesIntern');
  });
});
