/* The one network call in the build: an unauthenticated GET of the public repo
   list, made once when the site is built. It never throws and never rejects —
   an unreachable or rate-limited API must degrade to the page's fallback
   paragraph rather than fail the deploy. All decision logic stays in
   `./github`, which never reaches back into this file. No token, ever. */

import { GITHUB_USERNAME, parseRepoList, type RepoInput } from './github';

/* Built from GITHUB_USERNAME so a wrong account is a one-line change there.
   Resolves to
   'https://api.github.com/users/SethJonesIntern/repos?per_page=100&sort=pushed&type=owner'. */
export const GITHUB_REPOS_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=pushed&type=owner`;

export interface RepoFetchResult {
  readonly ok: boolean;
  readonly repos: readonly RepoInput[]; // `[]` whenever `ok` is false
  readonly reason: string | null; // null when ok; a short diagnostic otherwise
}

const DEFAULT_TIMEOUT_MS = 5000;

/** GitHub rejects API requests without a User-Agent; this is not a credential. */
const REQUEST_HEADERS: Readonly<Record<string, string>> = {
  Accept: 'application/vnd.github+json',
  'User-Agent': `${GITHUB_USERNAME}-personal-website-build`,
};

function failure(reason: string): RepoFetchResult {
  return { ok: false, repos: [], reason };
}

/** Unauthenticated GET, no `Authorization` header, ever. Resolves — never throws, never rejects.
    Any network error, non-2xx status (403/429 = rate limit), timeout, or unparseable body
    resolves to `{ ok: false, repos: [], reason: <string> }`. */
export async function fetchShowcaseRepos(options?: {
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number; // default 5000
}): Promise<RepoFetchResult> {
  // Everything, including reading `options`, is guarded: the contract is that
  // this function resolves for every input.
  try {
    const requested = options?.timeoutMs;
    const timeoutMs =
      typeof requested === 'number' && Number.isFinite(requested) && requested > 0
        ? requested
        : DEFAULT_TIMEOUT_MS;

    const fetchImpl = options?.fetchImpl ?? globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
      return failure('no fetch implementation is available in this environment');
    }

    // AbortController + setTimeout rather than AbortSignal.timeout: the same
    // behaviour without assuming a Node version, and the flag lets a timeout be
    // reported distinctly from an unrelated abort.
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      let response: Response;
      try {
        response = await fetchImpl(GITHUB_REPOS_URL, {
          headers: REQUEST_HEADERS,
          signal: controller.signal,
        });
      } catch (error) {
        return failure(
          timedOut ? `GitHub API request timed out after ${timeoutMs}ms` : describeError(error),
        );
      }

      if (!response.ok) {
        const status = response.status;
        return failure(
          status === 403 || status === 429
            ? `GitHub API rate limit reached (HTTP ${status})`
            : `GitHub API returned HTTP ${status}`,
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return failure('GitHub API response body was not valid JSON');
      }

      if (!Array.isArray(payload)) {
        return failure('GitHub API response body was not a JSON array');
      }

      const repos = parseRepoList(payload);
      if (repos.length === 0 && payload.length > 0) {
        return failure('GitHub API response contained no usable repository entries');
      }

      return { ok: true, repos, reason: null };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    return failure(describeError(error));
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return 'GitHub API request timed out';
    }
    // Message can be empty (some undici errors); the reason must stay non-empty.
    return error.message.trim() === ''
      ? `GitHub API request failed (${error.name})`
      : `GitHub API request failed: ${error.message}`;
  }
  return 'GitHub API request failed for an unknown reason';
}
