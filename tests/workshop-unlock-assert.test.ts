import { describe, expect, it } from 'vitest';
import { assertUnlockSequence } from '../src/lib/workshop-unlock';
import { READING_LIST } from '../src/lib/reading-books';

const P = 'harry-potter-prisoner-of-azkaban';

/** Runs `fn` and returns whatever it threw, or undefined if it returned normally. */
const caught = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
};

const expectTypeError = (fn: () => unknown, message: string): void => {
  const error = caught(fn);
  expect(error).toBeInstanceOf(TypeError);
  expect((error as TypeError).message).toBe(message);
};

describe('assertUnlockSequence — accepts', () => {
  // Row 38. Each accepting call is paired with a control that removes one needed id and must throw,
  // so a no-op implementation fails.
  it('accepts a one-key sequence whose id is known', () => {
    expect(assertUnlockSequence(['a'], ['a'])).toBeUndefined();
    expect(() => assertUnlockSequence(['a'], ['b'])).toThrow(TypeError);
  });

  // Row 38 / Boundary: unordered knownIds
  it('ignores the order of knownIds', () => {
    expect(assertUnlockSequence(['b', 'a'], ['a', 'b', 'c'])).toBeUndefined();
    expect(() => assertUnlockSequence(['b', 'a'], ['a', 'c'])).toThrow(TypeError);
  });

  // Row 38 / Boundary: duplicate ids in knownIds
  it('accepts duplicate ids in knownIds', () => {
    expect(assertUnlockSequence(['a'], ['a', 'a'])).toBeUndefined();
    expect(() => assertUnlockSequence(['a', 'a'], ['a', 'a'])).toThrow(TypeError);
  });

  // Row 39
  it('does not mutate the sequence or knownIds', () => {
    const s = ['b', 'a'];
    const k = ['c', 'a', 'b'];
    expect(assertUnlockSequence(s, k)).toBeUndefined();
    expect(() => assertUnlockSequence(s, ['c'])).toThrow(TypeError);
    expect(s).toEqual(['b', 'a']);
    expect(k).toEqual(['c', 'a', 'b']);
  });
});

describe('assertUnlockSequence — rejects', () => {
  // Errors row 1 / Boundary: empty sequence
  it('rejects an empty sequence against non-empty knownIds', () => {
    expectTypeError(() => assertUnlockSequence([], ['a']), 'assertUnlockSequence: the sequence is empty');
  });

  // Errors row 1
  it('rejects an empty sequence against empty knownIds', () => {
    expectTypeError(() => assertUnlockSequence([], []), 'assertUnlockSequence: the sequence is empty');
  });

  // Errors row 2
  it('rejects an id absent from knownIds', () => {
    expectTypeError(
      () => assertUnlockSequence(['a', 'nope'], ['a', 'b']),
      'assertUnlockSequence: unknown book id "nope"',
    );
  });

  // Errors row 3
  it('rejects a key book that is not on the shipped shelf', () => {
    expectTypeError(
      () => assertUnlockSequence(['a-storm-of-swords', P], READING_LIST.map((b) => b.id)),
      'assertUnlockSequence: unknown book id "a-storm-of-swords"',
    );
  });

  // Errors row 4
  it('matches ids case-sensitively', () => {
    expectTypeError(() => assertUnlockSequence(['A'], ['a']), 'assertUnlockSequence: unknown book id "A"');
  });

  // Errors row 5
  it('rejects a repeated id', () => {
    expectTypeError(() => assertUnlockSequence(['a', 'a'], ['a']), 'assertUnlockSequence: duplicate book id "a"');
  });

  // Errors row 6
  it('checks unknown before duplicate for the same element', () => {
    expectTypeError(() => assertUnlockSequence(['zz', 'zz'], []), 'assertUnlockSequence: unknown book id "zz"');
  });

  // Errors row 7
  it('reports the first failing element when an unknown precedes a duplicate', () => {
    expectTypeError(
      () => assertUnlockSequence(['a', 'x', 'a'], ['a']),
      'assertUnlockSequence: unknown book id "x"',
    );
  });

  // Errors row 8
  it('reports the first failing element when a duplicate precedes an unknown', () => {
    expectTypeError(
      () => assertUnlockSequence(['a', 'b', 'a', 'x'], ['a', 'b']),
      'assertUnlockSequence: duplicate book id "a"',
    );
  });

  // Errors row 9
  it('interpolates a non-string id via String', () => {
    expectTypeError(
      () => assertUnlockSequence([null as unknown as string], ['a']),
      'assertUnlockSequence: unknown book id "null"',
    );
  });

  // Boundary "null / undefined / non-array sequence or knownIds": undefined beyond row 18, not tested.
});
