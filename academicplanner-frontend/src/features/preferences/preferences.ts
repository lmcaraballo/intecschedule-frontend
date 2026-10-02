import { z } from 'zod';

export const preferencesSchema = z.object({
  theme: z.enum(['auto', 'day', 'night']),
  themeVariant: z.enum(['day-cream', 'day-paper', 'night-forest', 'night-midnight']).default('day-cream'),
  themeTone: z.enum(['first', 'second']).default('first'),
  reducedMotion: z.boolean().default(false),
  textSize: z.enum(['normal', 'large']).default('normal'),
  highContrast: z.boolean().default(false),
  startPage: z.enum(['now', 'schedule', 'events']).default('now'),
  defaultScheduleView: z.enum(['day', 'week', 'month']).default('day'),
  showCampusPreview: z.boolean().default(true),
  showUnscheduledSubjects: z.boolean().default(true),
  showInstitutionalDates: z.boolean().default(true),
  institutionalReminders: z.boolean().default(true),
  reminderMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]).default(15),
});

export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = {
  theme: 'auto',
  themeVariant: 'day-cream',
  themeTone: 'first',
  reducedMotion: false,
  textSize: 'normal',
  highContrast: false,
  startPage: 'now',
  defaultScheduleView: 'day',
  showCampusPreview: true,
  showUnscheduledSubjects: true,
  showInstitutionalDates: true,
  institutionalReminders: true,
  reminderMinutes: 15,
};

export function getStartPath(preferences: Preferences): '/ahora' | '/horario' | '/eventos' {
  if (preferences.startPage === 'schedule') return '/horario';
  if (preferences.startPage === 'events') return '/eventos';
  return '/ahora';
}

export function themeVariantFor(theme: Exclude<Preferences['theme'], 'auto'>, tone: Preferences['themeTone']): Preferences['themeVariant'] {
  if (theme === 'day') return tone === 'second' ? 'day-paper' : 'day-cream';
  return tone === 'second' ? 'night-midnight' : 'night-forest';
}

export function themeToneForVariant(variant: Preferences['themeVariant']): Preferences['themeTone'] {
  return variant === 'day-paper' || variant === 'night-midnight' ? 'second' : 'first';
}
