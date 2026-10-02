import type { AcademicClass, AcademicSession } from '../../types/academic';
import { dateKey } from '../../utils/dateFormat';
import { getTodayClasses } from '../schedule/scheduleDomain';
import { getInstitutionalPeriod, getInstitutionalPeriods, type InstitutionalDate } from '../institutional/institutionalCalendar';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from './calendarApi';
import type { CalendarEvent, EventDraft } from './eventSchema';

interface DesiredEvent {
  sourceId: string;
  sourceType: 'schedule' | 'institutional';
  ownerId: string | null;
  reminderMinutes: number | null;
  draft: EventDraft;
}

export interface CalendarSyncResult {
  created: number;
  updated: number;
  removed: number;
  unchanged: number;
}

/** Stable UUID-shaped identifier used as Google extended metadata. */
export function stableSourceId(value: string): string {
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  const words = seeds.map((seed, wordIndex) => {
    let hash = seed >>> 0;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index) + wordIndex * 31;
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash;
  });
  const bytes = words.flatMap((word) => [word >>> 24, word >>> 16, word >>> 8, word].map((part) => part & 0xff));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * A deterministic, opaque namespace for one academic account. The matrícula
 * itself never leaves the browser as Calendar metadata.
 */
export function calendarOwnerId(studentId: string): string {
  return stableSourceId(`academic-calendar-owner:${studentId}`);
}

export function scheduleEventsForSession(session: AcademicSession): DesiredEvent[] {
  const period = getInstitutionalPeriod(new Date(session.schedule.fetchedAt));
  if (!period) return [];
  const start = new Date(`${period.startsOn}T12:00:00`);
  const end = new Date(`${period.endsOn}T12:00:00`);
  const ownerId = calendarOwnerId(session.student.id);
  const desired: DesiredEvent[] = [];
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    for (const academicClass of getTodayClasses(session.schedule, day)) {
      desired.push(scheduleEvent(session.student.id, ownerId, academicClass, new Date(day)));
    }
  }
  return desired;
}

function scheduleEvent(studentId: string, ownerId: string, academicClass: AcademicClass, date: Date): DesiredEvent {
  const occurrenceDate = dateKey(date);
  return {
    sourceId: stableSourceId(`schedule:${studentId}:${academicClass.id}:${occurrenceDate}`),
    sourceType: 'schedule',
    ownerId,
    reminderMinutes: null,
    draft: {
      title: `${academicClass.subjectCode} · ${academicClass.subjectName}`,
      description: `Clase institucional de AcademicPlanner · Sección ${academicClass.section || 'por confirmar'}`,
      date: occurrenceDate,
      startTime: academicClass.startTime,
      endTime: academicClass.endTime,
      location: academicClass.location ?? '',
    },
  };
}

export function institutionalReminderEvents(reminderMinutes: number): DesiredEvent[] {
  return getInstitutionalPeriods().flatMap((period) => {
    const start: InstitutionalDate = {
      date: period.startsOn,
      kind: 'milestone',
      title: `Inicia ${period.title}`,
      detail: `Inicio oficial del período académico. Fuente: ${period.sourceUrl}`,
    };
    const milestones = [
      start,
      ...period.dates.filter((entry) => entry.kind === 'milestone' && entry.date !== period.startsOn),
    ];
    return milestones.map((entry) => ({
      sourceId: stableSourceId(`institutional:${period.id}:${entry.date}:${entry.title}`),
      sourceType: 'institutional' as const,
      ownerId: null,
      reminderMinutes,
      draft: {
        title: entry.title,
        description: `${entry.detail}\nFuente institucional: ${period.sourceUrl}`,
        date: entry.date,
        startTime: '09:00',
        endTime: '09:15',
        location: 'INTEC',
      },
    }));
  });
}

export async function syncScheduleToCalendar(token: string, session: AcademicSession): Promise<CalendarSyncResult> {
  const period = getInstitutionalPeriod(new Date(session.schedule.fetchedAt));
  if (!period) return { created: 0, updated: 0, removed: 0, unchanged: 0 };
  // A new trimester must never erase classes from an earlier one. We only
  // reconcile this term; missing occurrences here represent a withdrawn class.
  return syncDesiredEvents(token, scheduleEventsForSession(session), 'schedule', period, calendarOwnerId(session.student.id));
}

export async function syncInstitutionalReminders(token: string, studentId: string, enabled: boolean, reminderMinutes: number): Promise<CalendarSyncResult> {
  return syncDesiredEvents(token, enabled ? institutionalReminderEvents(reminderMinutes) : [], 'institutional', undefined, calendarOwnerId(studentId));
}

async function syncDesiredEvents(token: string, desired: DesiredEvent[], sourceType: DesiredEvent['sourceType'], scope: { startsOn: string; endsOn: string } | undefined, ownerId: string): Promise<CalendarSyncResult> {
  const periods = getInstitutionalPeriods();
  const from = new Date(`${scope?.startsOn ?? periods[0]!.startsOn}T00:00:00`);
  const to = new Date(`${scope?.endsOn ?? periods.at(-1)!.endsOn}T23:59:59`);
  const existing = (await listCalendarEvents(token, from, to, ownerId)).filter((event) => event.sourceType === sourceType);
  // Schedule events belong to the academic account that created them, even
  // when two students connect the same Google account on one device.
  const owned = sourceType === 'schedule' ? existing.filter((event) => event.ownerId === ownerId) : existing;
  const existingBySource = new Map(owned.map((event) => [event.sourceId, event]));
  const desiredIds = new Set(desired.map((event) => event.sourceId));
  const result: CalendarSyncResult = { created: 0, updated: 0, removed: 0, unchanged: 0 };

  for (const target of desired) {
    const current = existingBySource.get(target.sourceId);
    if (!current) {
      await createCalendarEvent(token, target.draft, target.sourceId, target);
      result.created += 1;
    } else if (current.id.startsWith('legacy:')) {
      // Versions anteriores guardaban clases y fechas INTEC juntas. Recreate
      // each occurrence in its dedicated calendar, then remove the old copy.
      await createCalendarEvent(token, target.draft, target.sourceId, target);
      await deleteCalendarEvent(token, current.id);
      result.updated += 1;
    } else if (eventDiffers(current, target)) {
      await updateCalendarEvent(token, current.id, target.draft, target);
      result.updated += 1;
    } else {
      result.unchanged += 1;
    }
  }
  for (const stale of owned) {
    if (!desiredIds.has(stale.sourceId)) {
      await deleteCalendarEvent(token, stale.id);
      result.removed += 1;
    }
  }
  return result;
}

function eventDiffers(current: CalendarEvent, target: DesiredEvent): boolean {
  const start = new Date(`${target.draft.date}T${target.draft.startTime}:00`).toISOString();
  const end = new Date(`${target.draft.date}T${target.draft.endTime}:00`).toISOString();
  return current.title !== target.draft.title
    || (current.description ?? '') !== target.draft.description
    // Google can return the same instant using the Santo Domingo offset while
    // the browser sends UTC. Compare instants so an idempotent sync stays quiet.
    || Date.parse(current.startAt) !== Date.parse(start)
    || Date.parse(current.endAt) !== Date.parse(end)
    || (current.location ?? '') !== target.draft.location
    || current.ownerId !== target.ownerId
    || current.reminderMinutes !== target.reminderMinutes;
}
