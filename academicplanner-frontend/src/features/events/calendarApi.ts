import { z } from 'zod';
import { isAcademicMock } from '../../services/academicApi';
import { calendarEventSchema, calendarEventsSchema, type CalendarEvent, type EventDraft } from './eventSchema';

const configSchema = z.object({
  available: z.boolean(),
  clientId: z.string().nullable(),
  scopes: z.array(z.string()),
  calendarName: z.string(),
});
export type CalendarConfig = z.infer<typeof configSchema>;

const demoEvents: CalendarEvent[] = [];

export interface CalendarEventOptions {
  sourceType?: CalendarEvent['sourceType'];
  reminderMinutes?: number | null;
}

async function parseResponse(response: Response) {
  if (response.ok) return response.status === 204 ? null : response.json();
  let code = 'UNKNOWN_ERROR';
  try { code = (await response.json()).error?.code ?? code; } catch { /* respuesta externa inválida */ }
  throw new Error(code);
}

export async function fetchCalendarConfig(): Promise<CalendarConfig> {
  if (isAcademicMock) return { available: true, clientId: 'demo', scopes: [], calendarName: 'AcademicPlanner · demostración' };
  return configSchema.parse(await parseResponse(await fetchWithTimeout('/api/calendar/config', {}, 8_000)));
}

export async function listCalendarEvents(token: string, from: Date, to: Date): Promise<CalendarEvent[]> {
  if (isAcademicMock) return demoEvents.filter((event) => Date.parse(event.startAt) < to.getTime() && Date.parse(event.endAt) > from.getTime());
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  const response = await fetchWithTimeout(`/api/events?${query}`, { headers: { Authorization: `Bearer ${token}` } }, 15_000);
  return calendarEventsSchema.parse(await parseResponse(response));
}

export async function createCalendarEvent(token: string, draft: EventDraft, sourceId: string, options: CalendarEventOptions = {}): Promise<CalendarEvent> {
  const payload = draftToPayload(draft, sourceId, options);
  if (isAcademicMock) {
    const existing = demoEvents.find((event) => event.sourceId === sourceId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const event = calendarEventSchema.parse({ id: `demo-${sourceId}`, ...payload, createdAt: now, updatedAt: now, revision: 0, htmlLink: null });
    demoEvents.push(event);
    return event;
  }
  const response = await fetchWithTimeout('/api/events', { method: 'POST', headers: jsonHeaders(token), body: JSON.stringify(payload) }, 15_000);
  return calendarEventSchema.parse(await parseResponse(response));
}

export async function updateCalendarEvent(token: string, id: string, draft: EventDraft, options: CalendarEventOptions = {}): Promise<CalendarEvent> {
  const payload = draftToPayload(draft, crypto.randomUUID(), options);
  if (isAcademicMock) {
    const index = demoEvents.findIndex((event) => event.id === id);
    if (index < 0) throw new Error('EVENT_NOT_FOUND');
    const previous = demoEvents[index]!;
    const updated = calendarEventSchema.parse({ ...previous, ...payload, sourceId: previous.sourceId, updatedAt: new Date().toISOString(), revision: previous.revision + 1 });
    demoEvents[index] = updated;
    return updated;
  }
  const { sourceId: _, sourceType: __, ...changes } = payload;
  const response = await fetchWithTimeout(`/api/events/${encodeURIComponent(id)}`, { method: 'PATCH', headers: jsonHeaders(token), body: JSON.stringify(changes) }, 15_000);
  return calendarEventSchema.parse(await parseResponse(response));
}

export async function deleteCalendarEvent(token: string, id: string): Promise<void> {
  if (isAcademicMock) {
    const index = demoEvents.findIndex((event) => event.id === id);
    if (index >= 0) demoEvents.splice(index, 1);
    return;
  }
  await parseResponse(await fetchWithTimeout(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }, 15_000));
}

function jsonHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { window.clearTimeout(timer); }
}

function draftToPayload(draft: EventDraft, sourceId: string = crypto.randomUUID(), options: CalendarEventOptions = {}) {
  const start = new Date(`${draft.date}T${draft.startTime}:00`);
  const end = new Date(`${draft.date}T${draft.endTime}:00`);
  if (!draft.title.trim() || !draft.date || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new Error('INVALID_EVENT_DATA');
  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    timezone: 'America/Santo_Domingo',
    location: draft.location.trim() || null,
    sourceId,
    sourceType: options.sourceType ?? 'personal',
    reminderMinutes: options.reminderMinutes ?? null,
  };
}
