import type { AcademicClass, Schedule } from '../../types/academic';
import { dateKey } from '../../utils/dateFormat';
import { getInstitutionalPeriod, isTeachingDate } from '../institutional/institutionalCalendar';

export interface ClassOccurrence {
  academicClass: AcademicClass;
  startsAt: Date;
  endsAt: Date;
}
export type DayStatusKind = 'before' | 'during' | 'between' | 'finished' | 'empty';
export interface AcademicDayStatus {
  kind: DayStatusKind;
  today: AcademicClass[];
  current: AcademicClass | null;
  next: ClassOccurrence | null;
  freeMinutes: number | null;
}

export function isoWeekday(date: Date): number {
  return date.getDay() || 7;
}

export function atTime(date: Date, time: string): Date {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Dates remain readable after they pass, but are presented as history rather than current work. */
export function isPastDay(date: Date, now: Date = new Date()): boolean {
  return dateKey(date) < dateKey(now);
}

/** Weekly recurring classes, ordered without mutating the stored schedule. */
export function getTodayClasses(schedule: Schedule, now: Date = new Date()): AcademicClass[] {
  const schedulePeriod = getInstitutionalPeriod(new Date(schedule.fetchedAt));
  const target = dateKey(now);
  if (!schedulePeriod || target < schedulePeriod.startsOn || target > schedulePeriod.endsOn) return [];
  if (!isTeachingDate(now)) return [];
  return schedule.classes.filter((item) => item.day === isoWeekday(now))
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime) || a.id.localeCompare(b.id));
}

/** Start inclusive, end exclusive; simultaneous classes use the stable order above. */
export type ClassOverrides = Record<string, { classId: string; date: string; kind: 'finished_early'; endedAt: string }>;
function isFinishedEarly(item: AcademicClass, date: Date, overrides: ClassOverrides) {
  return Boolean(overrides[`${dateKey(date)}:${item.id}`]);
}

export function getCurrentClass(schedule: Schedule, now: Date = new Date(), overrides: ClassOverrides = {}): AcademicClass | null {
  return getTodayClasses(schedule, now).find((item) => !isFinishedEarly(item, now, overrides) && atTime(now, item.startTime) <= now && now < atTime(now, item.endTime)) ?? null;
}

/** Next strictly future start, including the following week if needed. */
export function getNextClass(schedule: Schedule, now: Date = new Date()): ClassOccurrence | null {
  // A term may span weeks; its end is the hard bound that prevents invented classes.
  for (let offset = 0; offset <= 120; offset++) {
    const date = addDays(now, offset);
    for (const academicClass of getTodayClasses(schedule, date)) {
      const startsAt = atTime(date, academicClass.startTime);
      if (startsAt > now) return { academicClass, startsAt, endsAt: atTime(date, academicClass.endTime) };
    }
  }
  return null;
}

/** Remaining whole minutes, rounded up; null during a class or with no next class. */
export function getFreeTimeUntilNextClass(schedule: Schedule, now: Date = new Date(), overrides: ClassOverrides = {}): number | null {
  if (getCurrentClass(schedule, now, overrides)) return null;
  const next = getNextClass(schedule, now);
  return next ? Math.ceil((next.startsAt.getTime() - now.getTime()) / 60_000) : null;
}

export function getDayStatus(schedule: Schedule, now: Date = new Date(), overrides: ClassOverrides = {}): AcademicDayStatus {
  const today = getTodayClasses(schedule, now);
  const current = getCurrentClass(schedule, now, overrides);
  const next = getNextClass(schedule, now);
  const first = today[0];
  const kind: DayStatusKind = !first ? 'empty' : current ? 'during'
    : now < atTime(now, first.startTime) ? 'before'
      : next && isSameDay(next.startsAt, now) ? 'between' : 'finished';
  return { kind, today, current, next, freeMinutes: getFreeTimeUntilNextClass(schedule, now, overrides) };
}

export function getClassProgress(item: AcademicClass, now: Date): number {
  const start = atTime(now, item.startTime).getTime();
  const end = atTime(now, item.endTime).getTime();
  return Math.max(0, Math.min(100, Math.round((now.getTime() - start) / (end - start) * 100)));
}
