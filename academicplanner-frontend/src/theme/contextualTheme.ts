import type { Preferences } from '../features/preferences/preferences';

export type ContextualTheme = 'morning' | 'day' | 'sunset' | 'night';
export type VisualTheme = 'day' | 'night';

export function getContextualTheme(date: Date = new Date()): ContextualTheme {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'sunset';
  return 'night';
}

export function getVisualTheme(preference: Preferences['theme'], context: ContextualTheme): VisualTheme {
  return preference === 'auto' ? (context === 'night' ? 'night' : 'day') : preference;
}

/** The campus only follows the clock in Auto; manual themes are intentional fixed lighting. */
export function getCampusLighting(preference: Preferences['theme'], context: ContextualTheme) {
  if (preference === 'auto') return { phase: context, theme: getVisualTheme(preference, context) } as const;
  return preference === 'day'
    ? { phase: 'day', theme: 'day' } as const
    : { phase: 'night', theme: 'night' } as const;
}
