import { describe, expect, it } from 'vitest';

import { assignSlugs } from '../src/lib/posts';

// Covers Behavior rows 16-21, the Errors rows
// "assignSlugs([{id:'a',title:'X'},{id:'a',title:'Y'}])" and
// "assignSlugs([{id:'',title:'X'}]) or an all-whitespace id", and the
// Boundaries rows "slug collision", "no posts at all" (the assignSlugs half),
// "empty slugify result" (the 'post' substitution half) and
// "unordered input array" (the assignSlugs half).

const EMPTY_ID_MESSAGE = 'assignSlugs: id must be a non-empty string';

function capture(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('assignSlugs', () => {
  it('keys the result by id and uses the slugified title', () => {
    // Behavior #16
    expect(assignSlugs([{ id: 'a', title: 'Hello World' }])).toEqual({ a: 'hello-world' });
  });

  it('gives the base slug to the id-ascending winner and suffixes the loser with -2', () => {
    // Behavior #17: 'a-post' < 'b-post' by codepoint, so 'a-post' keeps the base
    // even though 'b-post' appears first in the input.
    expect(
      assignSlugs([
        { id: 'b-post', title: 'Tags & RSS' },
        { id: 'a-post', title: 'Tags, RSS' },
      ]),
    ).toEqual({ 'a-post': 'tags-rss', 'b-post': 'tags-rss-2' });
  });

  it('produces the same assignment when the colliding pair is reversed', () => {
    // Behavior #18 / Boundaries: slug collision, including reversed-input equality
    expect(
      assignSlugs([
        { id: 'a-post', title: 'Tags, RSS' },
        { id: 'b-post', title: 'Tags & RSS' },
      ]),
    ).toEqual({ 'a-post': 'tags-rss', 'b-post': 'tags-rss-2' });
  });

  it('skips a candidate that is another post’s base slug', () => {
    // Behavior #19: 'tags-rss-2' is c's own base slug, so b must take -3
    expect(
      assignSlugs([
        { id: 'a', title: 'Tags RSS' },
        { id: 'b', title: 'Tags, RSS' },
        { id: 'c', title: 'Tags RSS 2' },
      ]),
    ).toEqual({ a: 'tags-rss', b: 'tags-rss-3', c: 'tags-rss-2' });
  });

  it('substitutes post for an empty base slug and then applies the collision rules', () => {
    // Behavior #20 / Boundaries: empty slugify result
    expect(
      assignSlugs([
        { id: 'x', title: '日本語' },
        { id: 'y', title: '!!!' },
      ]),
    ).toEqual({ x: 'post', y: 'post-2' });
  });

  it('returns an empty object for no sources at all', () => {
    // Behavior #21 / Boundaries: no posts at all
    expect(assignSlugs([])).toEqual({});
  });

  it('returns the same assignment for every permutation of the input', () => {
    // Boundaries: unordered input array -> output depends only on content.
    // Same three sources as Behavior #19, whose expected assignment is literal.
    const a = { id: 'a', title: 'Tags RSS' };
    const b = { id: 'b', title: 'Tags, RSS' };
    const c = { id: 'c', title: 'Tags RSS 2' };
    const permutations = [
      [a, b, c],
      [a, c, b],
      [b, a, c],
      [b, c, a],
      [c, a, b],
      [c, b, a],
    ];
    for (const permutation of permutations) {
      expect(assignSlugs(permutation)).toEqual({
        a: 'tags-rss',
        b: 'tags-rss-3',
        c: 'tags-rss-2',
      });
    }
  });

  it('throws a TypeError naming the duplicated id', () => {
    // Errors: duplicate id
    const error = capture(() =>
      assignSlugs([
        { id: 'a', title: 'X' },
        { id: 'a', title: 'Y' },
      ]),
    );
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe('assignSlugs: duplicate id "a"');
  });

  it('throws a TypeError for an empty id', () => {
    // Errors: assignSlugs([{id:'',title:'X'}])
    const error = capture(() => assignSlugs([{ id: '', title: 'X' }]));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe(EMPTY_ID_MESSAGE);
  });

  it('throws a TypeError for an all-whitespace id', () => {
    // Errors: "or an all-whitespace id"
    const error = capture(() => assignSlugs([{ id: '   ', title: 'X' }]));
    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe(EMPTY_ID_MESSAGE);
  });
});
