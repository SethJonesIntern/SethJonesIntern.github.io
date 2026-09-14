import { describe, expect, it } from 'vitest';

import { PROJECT_STATUSES, isProjectStatus, statusLabel } from '../src/lib/projects';

// Covers Behavior rows 12, 13 and 24.

describe('PROJECT_STATUSES', () => {
  it('lists the three statuses in the declared order', () => {
    // Behavior #24
    expect([...PROJECT_STATUSES]).toEqual(['in-progress', 'completed', 'archived']);
  });
});

describe('statusLabel', () => {
  it('labels in-progress as "In progress"', () => {
    // Behavior #12
    expect(statusLabel('in-progress')).toBe('In progress');
  });

  it('labels completed as "Completed"', () => {
    // Behavior #12
    expect(statusLabel('completed')).toBe('Completed');
  });

  it('labels archived as "Archived"', () => {
    // Behavior #12
    expect(statusLabel('archived')).toBe('Archived');
  });
});

describe('isProjectStatus', () => {
  it('accepts every declared status value', () => {
    // Behavior #13 (true case)
    expect(isProjectStatus('in-progress')).toBe(true);
    expect(isProjectStatus('completed')).toBe(true);
    expect(isProjectStatus('archived')).toBe(true);
  });

  it('rejects an undeclared status string', () => {
    // Behavior #13
    expect(isProjectStatus('done')).toBe(false);
  });

  it('rejects undefined', () => {
    // Behavior #13
    expect(isProjectStatus(undefined)).toBe(false);
  });

  it('rejects a number', () => {
    // Behavior #13
    expect(isProjectStatus(1)).toBe(false);
  });

  it('rejects a status with the wrong casing', () => {
    // Behavior #13: case-sensitive
    expect(isProjectStatus('Completed')).toBe(false);
  });
});
