import { describe, expect, it } from 'vitest';

import { projectHref } from '../src/lib/projects';

// Covers Behavior rows 18 and 19, and the Errors row
// "projectHref(''), projectHref('   '), projectHref('/') -> TypeError".

const EMPTY_ID_MESSAGE = 'projectHref: id must be a non-empty string';

function capture(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('projectHref', () => {
  it('builds a detail path with a leading and trailing slash', () => {
    // Behavior #18
    expect(projectHref('tsat-2a')).toBe('/projects/tsat-2a/');
  });

  it('strips surrounding slashes from the id before building the path', () => {
    // Behavior #19
    expect(projectHref('/tsat-2a/')).toBe('/projects/tsat-2a/');
  });

  it('throws a TypeError for an empty id', () => {
    // Errors: projectHref('')
    const error = capture(() => projectHref(''));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe(EMPTY_ID_MESSAGE);
  });

  it('throws a TypeError for a whitespace-only id', () => {
    // Errors: projectHref('   ')
    const error = capture(() => projectHref('   '));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe(EMPTY_ID_MESSAGE);
  });

  it('throws a TypeError for an id that is only a slash', () => {
    // Errors: projectHref('/')
    const error = capture(() => projectHref('/'));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe(EMPTY_ID_MESSAGE);
  });

  // Not tested: projectHref with a padded but non-empty id (e.g. ' tsat-2a ').
  // The spec only contracts slash stripping and the empty-after-trim rejection,
  // so the expected output for a padded id is unspecified.
});
