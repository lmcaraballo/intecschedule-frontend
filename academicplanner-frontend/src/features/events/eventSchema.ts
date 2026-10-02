import { z } from 'zod';

export const calendarEventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  startAt: z.iso.datetime({ offset: true }),
  endAt: z.iso.datetime({ offset: true }),
  timezone: z.string().min(1),
  location: z.string().nullable(),
  sourceId: z.string().uuid(),
  sourceType: z.enum(['personal', 'schedule', 'institutional', 'google']).default('personal'),
  // Opaque account namespace for academic schedule events. It is not the
  // student's identifier and is stored in Google private metadata only.
  ownerId: z.string().uuid().nullable().default(null),
  reminderMinutes: z.number().int().min(0).max(10080).nullable().default(null),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  revision: z.number().int().nonnegative(),
  htmlLink: z.url().nullable(),
});

export const calendarEventsSchema = z.array(calendarEventSchema);
export type CalendarEvent = z.infer<typeof calendarEventSchema>;

export interface EventDraft {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
}

export const emptyEventDraft = (): EventDraft => ({
  title: '', description: '', date: '', startTime: '', endTime: '', location: '',
});
