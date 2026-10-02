import { describe, expect, it } from 'vitest';
import { googleEventsForDay } from './CalendarEventAgenda';
import type { CalendarEvent } from './eventSchema';

function event(id: string, sourceType: CalendarEvent['sourceType'], startAt: string, endAt: string): CalendarEvent {
  return {
    id, sourceType, startAt, endAt, title: id, description: null, timezone: 'America/Santo_Domingo', location: null,
    sourceId: '49e5f75d-2606-416c-9728-fda9dda3fecf', ownerId: null, reminderMinutes: null,
    createdAt: startAt, updatedAt: startAt, revision: 0, htmlLink: null,
  };
}

describe('Google Calendar agenda', () => {
  it('shows personal and Google events that overlap the selected local day', () => {
    const day = new Date('2026-10-02T12:00:00-04:00');
    const events = [
      event('Google primero', 'google', '2026-10-02T14:00:00-04:00', '2026-10-02T15:00:00-04:00'),
      event('Personal nocturno', 'personal', '2026-10-02T22:30:00-04:00', '2026-10-03T00:30:00-04:00'),
      event('Clase institucional', 'schedule', '2026-10-02T10:00:00-04:00', '2026-10-02T11:00:00-04:00'),
      event('Otro día', 'google', '2026-10-03T10:00:00-04:00', '2026-10-03T11:00:00-04:00'),
    ];

    expect(googleEventsForDay(events, day).map((item) => item.id)).toEqual(['Google primero', 'Personal nocturno']);
  });
});
