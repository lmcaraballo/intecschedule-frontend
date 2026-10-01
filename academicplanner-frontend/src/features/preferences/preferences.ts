import { z } from 'zod';

export const preferencesSchema = z.object({
  theme: z.enum(['auto', 'day', 'night']),
  reducedMotion: z.boolean().default(false),
  textSize: z.enum(['normal', 'large']).default('normal'),
  highContrast: z.boolean().default(false),
  startPage: z.enum(['now', 'schedule', 'events']).default('now'),
  defaultScheduleView: z.enum(['day', 'week', 'month']).default('day'),
  scheduleDensity: z.enum(['comfortable', 'compact']).default('comfortable'),
  showCampusPreview: z.boolean().default(true),
  showUnscheduledSubjects: z.boolean().default(true),
  showInstitutionalDates: z.boolean().default(true),
  institutionalReminders: z.boolean().default(true),
  reminderMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]).default(15),
});

export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = {
  theme: 'auto',
  reducedMotion: false,
  textSize: 'normal',
  highContrast: false,
  startPage: 'now',
  defaultScheduleView: 'day',
  scheduleDensity: 'comfortable',
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
