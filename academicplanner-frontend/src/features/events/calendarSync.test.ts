import { describe, expect, it } from 'vitest';
import { createMockSession } from '../../mocks/academicSession';
import { calendarOwnerId, institutionalReminderEvents, scheduleEventsForSession, stableSourceId } from './calendarSync';

describe('calendar synchronization plan', () => {
  it('uses deterministic UUIDs for idempotent synchronization', () => {
    const first = stableSourceId('schedule:1127998:qa-01:2026-10-01');
    expect(first).toBe(stableSourceId('schedule:1127998:qa-01:2026-10-01'));
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(first).not.toBe(stableSourceId('schedule:1127998:qa-01:2026-10-02'));
  });

  it('exports only real teaching occurrences inside the institutional period', () => {
    const session = createMockSession('1127998');
    session.schedule.classes = [{
      id: 'qa-thu', subjectCode: 'IDS325L', subjectName: 'Aseguramiento de la Calidad', section: '01',
      day: 4, startTime: '08:00', endTime: '10:00', location: 'AJ-103',
    }];
    const events = scheduleEventsForSession(session);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.sourceType === 'schedule')).toBe(true);
    expect(events.some((event) => event.draft.date === '2026-09-24')).toBe(false);
    expect(events.every((event) => event.draft.date >= '2026-08-03' && event.draft.date <= '2026-10-17')).toBe(true);
    expect(events.every((event) => event.ownerId === calendarOwnerId('1127998'))).toBe(true);
  });

  it('uses a separate opaque owner namespace for each academic account', () => {
    const accountA = calendarOwnerId('1127998');
    const accountB = calendarOwnerId('1130042');
    expect(accountA).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(accountA).not.toBe(accountB);
    expect(accountA).not.toContain('1127998');
  });

  it('creates one stable reminder per institutional milestone with the selected lead time', () => {
    const events = institutionalReminderEvents(30);
    expect(events.some((event) => event.draft.title.includes('Inicia'))).toBe(true);
    expect(events.some((event) => event.draft.title === 'Finaliza la docencia')).toBe(true);
    expect(events.every((event) => event.reminderMinutes === 30 && event.sourceType === 'institutional')).toBe(true);
    expect(new Set(events.map((event) => event.sourceId)).size).toBe(events.length);
    expect(events.filter((event) => event.draft.date === '2026-08-03')).toHaveLength(1);
  });

  it('keeps institutional dates when their Google reminders are disabled', () => {
    const events = institutionalReminderEvents(null);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.sourceType === 'institutional' && event.reminderMinutes === null)).toBe(true);
  });
});
