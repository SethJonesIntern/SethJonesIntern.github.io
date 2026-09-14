import { describe, expect, it } from 'vitest';

import { sortProjects } from '../src/lib/projects';

// Covers Behavior rows 8-11 and the Boundaries rows
// "empty collection / sortProjects([])", "single item", "all-equal sort keys",
// and "unordered input array".

// Frontmatter literals transcribed from spec section "Content (exact literals)",
// each given its filename stem as `id`.
const SENTINEL = {
  id: 'sentinel-grid-honeynet',
  title: 'Sentinel Grid Honeynet',
  role: 'Backend engineer and technical lead',
  stack: ['Python'],
  status: 'completed',
  summary:
    'A honeynet whose Python backend I built and whose technical direction I led — logging APIs that record what an attacker does once they are inside.',
  order: 1,
};

const TSAT = {
  id: 'tsat-2a',
  title: 'TSAT 2A',
  role: 'Software engineering team lead',
  stack: ['C++', 'ESP32'],
  status: 'completed',
  summary:
    'The embedded C++ for the UCF Knights Satellite Club’s T-SAT 2A payload, designed end to end as software team lead.',
  order: 2,
};

const TYPERACER = {
  id: 'typeracer-web-game',
  title: 'TypeRacer Web Game',
  role: 'Backend developer',
  stack: ['MongoDB', 'Express', 'React', 'Node.js', 'Socket.IO'],
  status: 'completed',
  summary:
    'A 1v1 real-time typing game built at KnightHacks 8 — live lobbies, matchmaking, and performance tracking over Socket.IO.',
  order: 3,
};

describe('sortProjects', () => {
  it('sorts an unsorted list into ascending order', () => {
    // Behavior #8
    const sorted = sortProjects([
      { id: 'c', order: 3, title: 'C' },
      { id: 'a', order: 1, title: 'A' },
      { id: 'b', order: 2, title: 'B' },
    ]);
    expect(sorted.map((project) => project.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts the three shipped project entries by their order field', () => {
    // Behavior #9
    const sorted = sortProjects([TYPERACER, SENTINEL, TSAT]);
    expect(sorted.map((project) => project.id)).toEqual([
      'sentinel-grid-honeynet',
      'tsat-2a',
      'typeracer-web-game',
    ]);
  });

  it('returns a new array without mutating the input', () => {
    // Behavior #10
    const input = [
      { id: 'c', order: 3, title: 'C' },
      { id: 'a', order: 1, title: 'A' },
      { id: 'b', order: 2, title: 'B' },
    ];
    const sorted = sortProjects(input);
    expect(sorted).not.toBe(input);
    expect(input.map((project) => project.id)).toEqual(['c', 'a', 'b']);
  });

  it('preserves extra properties on the sorted entries', () => {
    // Behavior #11
    const sorted = sortProjects([
      { id: 'a', order: 1, title: 'A', repo: 'https://example.com' },
    ]);
    expect(sorted[0].repo).toBe('https://example.com');
  });

  it('returns a new empty array for an empty collection', () => {
    // Boundaries: empty collection
    const input: { id: string; order: number; title: string }[] = [];
    const sorted = sortProjects(input);
    expect(sorted).toEqual([]);
    expect(sorted).not.toBe(input);
  });

  it('returns the same single object for a one-element collection', () => {
    // Boundaries: single item
    const only = { id: 'tsat-2a', order: 2, title: 'TSAT 2A' };
    const sorted = sortProjects([only]);
    expect(sorted).toHaveLength(1);
    expect(sorted[0]).toBe(only);
  });

  it('keeps input order for entries whose sort keys are all equal', () => {
    // Boundaries: all-equal sort keys (Array.prototype.sort is stable)
    const first = { id: 'x', order: 2, title: 'Same', tag: 'first' };
    const second = { id: 'x', order: 2, title: 'Same', tag: 'second' };
    const third = { id: 'x', order: 2, title: 'Same', tag: 'third' };
    const sorted = sortProjects([first, second, third]);
    expect(sorted.map((project) => project.tag)).toEqual(['first', 'second', 'third']);
  });

  it('breaks duplicate order values on title and then id', () => {
    // Boundaries: duplicate order values across real entries are legal
    const sorted = sortProjects([
      { id: 'b', order: 2, title: 'Same' },
      { id: 'a', order: 2, title: 'Same' },
      { id: 'c', order: 2, title: 'Alpha' },
    ]);
    expect(sorted.map((project) => project.id)).toEqual(['c', 'a', 'b']);
  });

  it('produces the same order for every permutation of distinct sort keys', () => {
    // Boundaries: unordered input array -> output depends only on sort keys
    const a = { id: 'a', order: 1, title: 'A' };
    const b = { id: 'b', order: 2, title: 'B' };
    const c = { id: 'c', order: 3, title: 'C' };
    const permutations = [
      [a, b, c],
      [a, c, b],
      [b, a, c],
      [b, c, a],
      [c, a, b],
      [c, b, a],
    ];
    for (const permutation of permutations) {
      expect(sortProjects(permutation).map((project) => project.id)).toEqual(['a', 'b', 'c']);
    }
  });
});
