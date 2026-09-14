import { describe, expect, it } from 'vitest';

import { formatStack } from '../src/lib/projects';

// Covers Behavior rows 14-17, and the "unicode in titles" Boundaries row
// as it applies to stack entries (non-ASCII round-trips unchanged).

describe('formatStack', () => {
  it('joins two entries with a space, U+00B7 and a space', () => {
    // Behavior #14
    expect(formatStack(['C++', 'ESP32'])).toBe('C++ · ESP32');
  });

  it('emits a single entry with no separator', () => {
    // Behavior #15
    expect(formatStack(['Python'])).toBe('Python');
  });

  it('returns an empty string for an empty stack', () => {
    // Behavior #16
    expect(formatStack([])).toBe('');
  });

  it('trims each entry and drops entries that are empty after trimming', () => {
    // Behavior #17
    expect(formatStack([' React ', '', 'Node.js'])).toBe('React · Node.js');
  });

  it('round-trips non-ASCII stack entries unchanged', () => {
    // Boundaries: unicode entries
    expect(formatStack(['Ω', '😀'])).toBe('Ω · 😀');
  });
});
