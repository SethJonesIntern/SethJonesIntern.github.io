import { describe, expect, it } from 'vitest';

import { postHref, tagHref } from '../src/lib/posts';

// Covers Behavior rows 47-49 and the Errors rows
// "postHref(''), postHref('   '), postHref('/')" and
// "tagHref(''), tagHref('   '), tagHref('/')".

const POST_HREF_MESSAGE = 'postHref: slug must be a non-empty string';
const TAG_HREF_MESSAGE = 'tagHref: slug must be a non-empty string';

function capture(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('postHref', () => {
  it('builds a post path with a leading and trailing slash', () => {
    // Behavior #47
    expect(postHref('building-a-spec-harness')).toBe('/blog/building-a-spec-harness/');
  });

  it('strips surrounding slashes from the slug first', () => {
    // Behavior #49
    expect(postHref('/x/')).toBe('/blog/x/');
  });

  it.each([
    ['an empty slug', ''],
    ['a whitespace-only slug', '   '],
    ['a slug that is only a slash', '/'],
  ])('throws a TypeError with the contracted message for %s', (_label, input) => {
    // Errors: postHref('') / postHref('   ') / postHref('/')
    const error = capture(() => postHref(input));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe(POST_HREF_MESSAGE);
  });
});

describe('tagHref', () => {
  it('builds a tag path under /blog/tags/', () => {
    // Behavior #48
    expect(tagHref('ai')).toBe('/blog/tags/ai/');
  });

  it('strips surrounding slashes from the slug first', () => {
    // Behavior #49
    expect(tagHref('/x/')).toBe('/blog/tags/x/');
  });

  it.each([
    ['an empty slug', ''],
    ['a whitespace-only slug', '   '],
    ['a slug that is only a slash', '/'],
  ])('throws a TypeError with the contracted message for %s', (_label, input) => {
    // Errors: tagHref('') / tagHref('   ') / tagHref('/')
    const error = capture(() => tagHref(input));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe(TAG_HREF_MESSAGE);
  });

  // Not tested: a padded but non-empty slug such as ' ai '. The spec contracts
  // slash stripping and the effectively-empty rejection only, so the output for
  // surrounding whitespace around a real slug is unspecified.
});
