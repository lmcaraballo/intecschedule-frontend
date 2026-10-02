import { describe, expect, it } from 'vitest';
import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents, updateCalendarEvent } from './calendarApi';
import type { EventDraft } from './eventSchema';

const draft: EventDraft = {
  title: 'Estudiar cálculo',
  description: 'Capítulo 4',
  date: '2026-10-01',
  startTime: '18:00',
  endTime: '20:00',
  location: 'Biblioteca',
};

describe('calendar demo adapter', () => {
  it('creates idempotently, edits, lists and deletes without local persistence', async () => {
    const sourceId = '49e5f75d-2606-416c-9728-fda9dda3fecf';
    const first = await createCalendarEvent('demo', draft, sourceId);
    const retry = await createCalendarEvent('demo', draft, sourceId);
    expect(retry.id).toBe(first.id);

    const updated = await updateCalendarEvent('demo', first.id, { ...draft, title: 'Estudiar física' });
    expect(updated.title).toBe('Estudiar física');
    expect(updated.revision).toBe(1);

    const listed = await listCalendarEvents('demo', new Date('2026-10-01T00:00:00Z'), new Date('2026-10-02T00:00:00Z'), crypto.randomUUID());
    expect(listed.map((event) => event.id)).toContain(first.id);

    await deleteCalendarEvent('demo', first.id);
    const afterDelete = await listCalendarEvents('demo', new Date('2026-10-01T00:00:00Z'), new Date('2026-10-02T00:00:00Z'), crypto.randomUUID());
    expect(afterDelete.map((event) => event.id)).not.toContain(first.id);
  });

  it('rejects an end time before the start time', async () => {
    await expect(createCalendarEvent('demo', { ...draft, endTime: '17:59' }, crypto.randomUUID())).rejects.toThrow('INVALID_EVENT_DATA');
  });
});
