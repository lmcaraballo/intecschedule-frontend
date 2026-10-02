import { describe, expect, it } from 'vitest';
import { getContextualTheme, getVisualTheme } from './contextualTheme';

describe('contextual themes', () => {
  it.each([
    [0, 'night'], [4, 'night'], [5, 'morning'], [9, 'morning'],
    [10, 'day'], [16, 'day'], [17, 'sunset'], [19, 'sunset'], [20, 'night'], [23, 'night'],
  ] as const)('recognizes hour %i as %s', (hour, expected) => {
    expect(getContextualTheme(new Date(2026, 8, 18, hour))).toBe(expected);
  });
  it('maps intermediate auto phases to light tones and respects manual preferences', () => {
    expect(getVisualTheme('auto', 'morning')).toBe('day');
    expect(getVisualTheme('auto', 'sunset')).toBe('day');
    expect(getVisualTheme('auto', 'night')).toBe('night');
    expect(getVisualTheme('day', 'night')).toBe('day');
    expect(getVisualTheme('night', 'day')).toBe('night');
  });
});
