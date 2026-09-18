import { z } from 'zod';

export const preferencesSchema = z.object({
  theme: z.enum(['auto', 'day', 'night']),
});

export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = { theme: 'auto' };
