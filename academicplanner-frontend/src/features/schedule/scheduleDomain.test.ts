import { describe, expect, it } from 'vitest';
import type { Schedule } from '../../types/academic';
import { createMockSession } from '../../mocks/academicSession';
import { getTodayClasses, getCurrentClass, getNextClass, getFreeTimeUntilNextClass, getDayStatus, getClassProgress } from './scheduleDomain';

const schedule = createMockSession('test-student').schedule;
// Local constructor keeps expectations independent of the machine timezone.
const monday = (hour: number, minute = 0, second = 0) => new Date(2026, 8, 14, hour, minute, second);

describe('academic day domain', () => {
  const cases = [
    { label: 'before first class', now: monday(7, 35), kind: 'before', current: null, next: 'mat-01-mon', free: 25, count: 2 },
    { label: 'during class', now: monday(9, 22), kind: 'during', current: 'mat-01-mon', next: 'sis-02-mon', free: null, count: 2 },
    { label: 'between classes', now: monday(10, 15), kind: 'between', current: null, next: 'sis-02-mon', free: 45, count: 2 },
    { label: 'after last class', now: monday(13), kind: 'finished', current: null, next: 'fis-01-tue', free: 1200, count: 2 },
    { label: 'Sunday without classes', now: new Date(2026, 8, 20, 12), kind: 'empty', current: null, next: 'mat-01-mon', free: 1200, count: 0 },
    { label: 'Saturday before class', now: new Date(2026, 8, 19, 8, 45), kind: 'before', current: null, next: 'lab-04-sat', free: 15, count: 1 },
    { label: 'Saturday during class', now: new Date(2026, 8, 19, 10), kind: 'during', current: 'lab-04-sat', next: 'mat-01-mon', free: null, count: 1 },
    { label: 'Saturday after class', now: new Date(2026, 8, 19, 12), kind: 'finished', current: null, next: 'mat-01-mon', free: 2640, count: 1 },
  ] as const;

  it.each(cases)('getTodayClasses: $label', ({ now, count }) => {
    expect(getTodayClasses(schedule, now)).toHaveLength(count);
  });
  it.each(cases)('getCurrentClass: $label', ({ now, current }) => {
    expect(getCurrentClass(schedule, now)?.id ?? null).toBe(current);
  });
  it.each(cases)('getNextClass: $label', ({ now, next }) => {
    const result = getNextClass(schedule, now);
    expect(result?.academicClass.id ?? null).toBe(next);
    expect(result!.startsAt.getTime()).toBeGreaterThan(now.getTime());
    expect(result!.endsAt.getTime()).toBeGreaterThan(result!.startsAt.getTime());
  });
  it.each(cases)('getFreeTimeUntilNextClass: $label', ({ now, free }) => {
    expect(getFreeTimeUntilNextClass(schedule, now)).toBe(free);
  });
  it.each(cases)('getDayStatus: $label', ({ now, kind }) => {
    expect(getDayStatus(schedule, now).kind).toBe(kind);
  });

  it('sorts without mutating the source or its classes', () => {
    const unordered = { ...schedule, classes: [...schedule.classes].reverse() };
    const snapshot = JSON.stringify(unordered);
    expect(getTodayClasses(unordered, monday(7)).map((item) => item.id)).toEqual(['mat-01-mon', 'sis-02-mon']);
    getDayStatus(unordered, monday(10));
    expect(JSON.stringify(unordered)).toBe(snapshot);
  });

  it('uses inclusive start and exclusive end, including consecutive classes', () => {
    expect(getCurrentClass(schedule, monday(8))?.id).toBe('mat-01-mon');
    expect(getCurrentClass(schedule, monday(10))).toBeNull();
    expect(getCurrentClass(schedule, monday(11))?.id).toBe('sis-02-mon');
    const consecutive = { ...schedule, classes: schedule.classes.map((item) => item.id === 'sis-02-mon' ? { ...item, startTime: '10:00' } : item) };
    expect(getCurrentClass(consecutive, monday(10))?.id).toBe('sis-02-mon');
    expect(getFreeTimeUntilNextClass(consecutive, monday(10))).toBeNull();
  });

  it('rounds partial minutes up instead of saying zero minutes before a class', () => {
    expect(getFreeTimeUntilNextClass(schedule, monday(7, 59, 59))).toBe(1);
  });

  it('finds the following week when the only weekly class is active or over', () => {
    const single: Schedule = { ...schedule, classes: [schedule.classes[0]!] };
    expect(getNextClass(single, monday(8))?.startsAt).toEqual(new Date(2026, 8, 21, 8));
    expect(getNextClass(single, monday(13))?.startsAt).toEqual(new Date(2026, 8, 21, 8));
  });

  it('handles empty schedules', () => {
    const empty = { ...schedule, classes: [] };
    expect(getTodayClasses(empty, monday(7))).toEqual([]);
    expect(getCurrentClass(empty, monday(7))).toBeNull();
    expect(getNextClass(empty, monday(7))).toBeNull();
    expect(getFreeTimeUntilNextClass(empty, monday(7))).toBeNull();
    expect(getDayStatus(empty, monday(7)).kind).toBe('empty');
  });

  it('rolls over midnight and month/year boundaries using local dates', () => {
    const sunday = new Date(2026, 8, 20, 23, 59, 59);
    expect(getNextClass(schedule, sunday)?.startsAt).toEqual(new Date(2026, 8, 21, 8));
    const yearEnd = new Date(2026, 11, 31, 23, 59);
    expect(getNextClass(schedule, yearEnd)).toBeNull();
    expect(getTodayClasses(schedule, new Date(2027, 0, 1, 0))).toEqual([]);
  });

  it('does not invent classes on an institutional holiday or after the term', () => {
    expect(getTodayClasses(schedule, new Date(2026, 8, 24, 9))).toEqual([]);
    expect(getCurrentClass(schedule, new Date(2026, 8, 24, 9))).toBeNull();
    expect(getNextClass(schedule, new Date(2026, 9, 19, 9))).toBeNull();
  });

  it('removes an early-finished class from the current state without changing the agenda', () => {
    const now = monday(9);
    const overrides = { '2026-09-14:mat-01-mon': { classId: 'mat-01-mon', date: '2026-09-14', kind: 'finished_early' as const, endedAt: '2026-09-14T09:00:00-04:00' } };
    expect(getTodayClasses(schedule, now)).toHaveLength(2);
    expect(getCurrentClass(schedule, now, overrides)).toBeNull();
    expect(getDayStatus(schedule, now, overrides).kind).toBe('between');
  });

  it('handles a weekday without classes and still finds the next activity', () => {
    const withoutWednesday = { ...schedule, classes: schedule.classes.filter((item) => item.day !== 3) };
    const now = new Date(2026, 8, 16, 9);
    expect(getDayStatus(withoutWednesday, now).kind).toBe('empty');
    expect(getNextClass(withoutWednesday, now)?.academicClass.id).toBe('sis-02-thu');
  });

  it('computes bounded class progress', () => {
    const item = schedule.classes[0]!;
    expect(getClassProgress(item, monday(7))).toBe(0);
    expect(getClassProgress(item, monday(8))).toBe(0);
    expect(getClassProgress(item, monday(9))).toBe(50);
    expect(getClassProgress(item, monday(10))).toBe(100);
    expect(getClassProgress(item, monday(11))).toBe(100);
  });
});

describe('QA temporal boundaries', () => {
  it.each([
    [7,59,false], [8,0,true], [8,1,true], [9,59,true], [10,0,false], [10,1,false],
  ] as const)('08:00–10:00 at %i:%i has active=%s', (hour,minute,active) => {
    const only = { ...schedule, classes: [schedule.classes[0]!] };
    expect(Boolean(getCurrentClass(only,monday(hour,minute)))).toBe(active);
  });
  it('updates day status on Sunday to Monday midnight', () => {
    expect(getDayStatus(schedule,new Date(2026,8,20,23,59)).kind).toBe('empty');
    expect(getDayStatus(schedule,new Date(2026,8,21,0,0)).kind).toBe('before');
  });
});
