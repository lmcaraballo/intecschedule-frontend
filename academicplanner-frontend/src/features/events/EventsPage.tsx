import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { useAcademicSession } from '../../app/AcademicLayout';
import { atTime, getTodayClasses } from '../schedule/scheduleDomain';
import { dateKey, formatDate } from '../../utils/dateFormat';
import { useCalendarConnection } from './CalendarConnectionProvider';
import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents, updateCalendarEvent } from './calendarApi';
import { syncInstitutionalReminders, syncScheduleToCalendar } from './calendarSync';
import { emptyEventDraft, type CalendarEvent, type EventDraft } from './eventSchema';

export function EventsPage() {
  const { session, now, preferences } = useAcademicSession();
  const connection = useCalendarConnection();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [draft, setDraft] = useState<EventDraft>(() => ({ ...emptyEventDraft(), date: dateKey(now), startTime: '16:00', endTime: '17:00' }));
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [eventsExpanded, setEventsExpanded] = useState(false);

  async function refresh(token = connection.token) {
    if (!token) return;
    setBusy(true);
    setError(null);
    const from = new Date(now);
    const to = new Date(now); to.setDate(to.getDate() + 180);
    try {
      const nextEvents = await listCalendarEvents(token, from, to);
      setEvents([...nextEvents].sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt)));
      setLastSyncedAt(new Date());
    }
    catch (caught) { setError(readableError(caught)); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!connection.token) { setEvents([]); setEventsExpanded(false); setLastSyncedAt(null); return; }
    const token = connection.token;
    void (async () => {
      try {
        await syncInstitutionalReminders(token, preferences.institutionalReminders, preferences.reminderMinutes);
      } catch (caught) {
        setError(readableError(caught));
      }
      await refresh(token);
    })();
  }, [connection.token, preferences.institutionalReminders, preferences.reminderMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  async function syncSchedule() {
    if (!connection.token) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const result = await syncScheduleToCalendar(connection.token, session);
      await syncInstitutionalReminders(connection.token, preferences.institutionalReminders, preferences.reminderMinutes);
      setMessage(`Horario sincronizado: ${result.created} creadas, ${result.updated} actualizadas y ${result.removed} retiradas. No se duplicaron ${result.unchanged} ocurrencias.`);
      await refresh(connection.token);
    } catch (caught) { setError(readableError(caught)); }
    finally { setBusy(false); }
  }

  const conflicts = useMemo(() => {
    if (!draft.date || !draft.startTime || !draft.endTime) return [];
    const day = new Date(`${draft.date}T12:00:00`);
    const start = atTime(day, draft.startTime);
    const end = atTime(day, draft.endTime);
    return getTodayClasses(session.schedule, day).filter((item) => atTime(day, item.startTime) < end && atTime(day, item.endTime) > start);
  }, [draft.date, draft.startTime, draft.endTime, session.schedule]);
  const timeRangeInvalid = Boolean(draft.startTime && draft.endTime && draft.endTime <= draft.startTime);
  const visibleEvents = eventsExpanded ? events : events.slice(0, 8);
  const hiddenEventCount = Math.max(0, events.length - visibleEvents.length);

  function updateDraft(field: keyof EventDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setMessage(null); setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!connection.token) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      if (editing) await updateCalendarEvent(connection.token, editing.id, draft, {
        sourceType: editing.sourceType,
        reminderMinutes: editing.reminderMinutes,
      });
      else await createCalendarEvent(connection.token, draft, crypto.randomUUID());
      setMessage(editing ? 'Evento actualizado en Google Calendar.' : 'Evento creado en Google Calendar.');
      setEventsExpanded(true);
      setEditing(null);
      setOptionalOpen(false);
      setDraft({ ...emptyEventDraft(), date: draft.date, startTime: '16:00', endTime: '17:00' });
      await refresh(connection.token);
    } catch (caught) { setError(readableError(caught)); }
    finally { setBusy(false); }
  }

  function beginEdit(event: CalendarEvent) {
    const start = new Date(event.startAt); const end = new Date(event.endAt);
    setEditing(event);
    setDraft({
      title: event.title, description: event.description ?? '', date: dateKey(start),
      startTime: timeValue(start), endTime: timeValue(end), location: event.location ?? '',
    });
    setOptionalOpen(true);
    setMessage(null); setError(null);
    document.querySelector<HTMLElement>('#event-form-title')?.scrollIntoView({ behavior: preferences.reducedMotion ? 'auto' : 'smooth', block: 'start' });
    window.requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#event-title')?.focus({ preventScroll: true }));
  }

  async function confirmDelete() {
    if (!connection.token || !deleting) return;
    setBusy(true); setError(null);
    try {
      await deleteCalendarEvent(connection.token, deleting.id);
      setDeleting(null);
      setMessage('Evento eliminado de Google Calendar.');
      await refresh(connection.token);
    } catch (caught) { setDeleting(null); setError(readableError(caught)); }
    finally { setBusy(false); }
  }

  return <main id="main-content" className="academic-page events-page">
    <header className="page-heading"><div><p className="page-eyebrow">Tu tiempo también cuenta</p><h1 id="page-title" tabIndex={-1}>Eventos</h1><p className="page-date">Crea y actualiza tus actividades en Google Calendar.</p></div>{connection.token && <Button variant="secondary" onClick={connection.disconnect}>Desconectar Google</Button>}</header>

    {!connection.token && <section className="calendar-onboarding" aria-labelledby="calendar-onboarding-title"><Icon name="calendar" width="28" height="28" /><div><p className="section-label">Sin base de datos propia</p><h2 id="calendar-onboarding-title">Conecta tu calendario</h2><p>AcademicPlanner usará un calendario separado para tus eventos. El acceso permanece solo mientras esta pestaña esté abierta.</p><Button disabled={connection.loading || !connection.config?.available} onClick={() => void connection.connect()}>{connection.loading ? 'Preparando…' : 'Conectar Google Calendar'}</Button>{!connection.loading && !connection.config?.available && <p className="connection-help">Falta configurar el Client ID OAuth en el backend.</p>}{connection.error && <p role="alert" className="preference-warning">{connection.error}</p>}</div></section>}

    {connection.token && <div className="events-layout" aria-busy={busy}>
      <section className="event-editor" aria-labelledby="event-form-title"><div className="event-editor__heading"><span className="event-editor__icon"><Icon name={editing ? 'edit' : 'spark'} /></span><div><p className="section-label">{editing ? 'Editando evento' : 'Nueva actividad'}</p><h2 id="event-form-title">{editing ? editing.title : 'Reserva tiempo para ti'}</h2><p>Se guardará directamente en tu calendario AcademicPlanner.</p></div></div><form onSubmit={save}>
        <label htmlFor="event-title">Título<input id="event-title" required maxLength={200} autoComplete="off" placeholder="Ej. Estudiar para el parcial" value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} /></label>
        <div className="event-form-row"><label>Fecha<input required type="date" value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} /></label><label>Inicio<input required type="time" value={draft.startTime} onChange={(event) => updateDraft('startTime', event.target.value)} /></label><label>Fin<input required type="time" aria-invalid={timeRangeInvalid} aria-describedby={timeRangeInvalid ? 'event-time-error' : undefined} value={draft.endTime} onChange={(event) => updateDraft('endTime', event.target.value)} /></label></div>
        {timeRangeInvalid && <p id="event-time-error" className="event-field-error" role="alert"><Icon name="alert" /> La hora de fin debe ser posterior a la de inicio.</p>}
        <details className="event-form-more" open={optionalOpen} onToggle={(event) => setOptionalOpen(event.currentTarget.open)}><summary><span><Icon name="pin" /> Añadir detalles opcionales</span><small>{optionalOpen ? 'Ocultar' : 'Lugar y descripción'}</small></summary><div className="event-form-more__fields">
          <label>Lugar <span>(opcional)</span><input maxLength={300} placeholder="Ej. Biblioteca" value={draft.location} onChange={(event) => updateDraft('location', event.target.value)} /></label>
          <label>Descripción <span>(opcional)</span><textarea maxLength={2000} rows={3} placeholder="Notas, enlaces o información importante" value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} /></label>
        </div></details>
        {conflicts.length > 0 && <div className="event-conflict" role="status"><Icon name="clock" /><p><strong>Coincide con {conflicts.length === 1 ? 'una clase' : `${conflicts.length} clases`}.</strong> {conflicts.map((item) => `${item.subjectName} (${item.startTime}–${item.endTime})`).join(', ')}</p></div>}
        <div className="event-form-actions">{editing && <Button variant="secondary" onClick={() => { setEditing(null); setOptionalOpen(false); setDraft({ ...emptyEventDraft(), date: dateKey(now), startTime: '16:00', endTime: '17:00' }); }}>Cancelar edición</Button>}<Button type="submit" disabled={busy || timeRangeInvalid || !draft.title.trim()}>{busy ? <><span className="spinner" /> Guardando…</> : editing ? <><Icon name="check" /> Guardar cambios</> : <><Icon name="arrow" /> Crear evento</>}</Button></div>
      </form></section>

      <section className="event-list-section" aria-labelledby="event-list-title">
        <div className="section-heading"><div><div className="event-list-title-row"><h2 id="event-list-title">Próximos eventos</h2><span className="event-count" aria-label={`${events.length} eventos`}>{events.length}</span></div>{lastSyncedAt && <p className="event-sync-status"><span aria-hidden="true" /> Actualizado {formatDate(lastSyncedAt, { hour: 'numeric', minute: '2-digit', hour12: true })}</p>}</div><div className="event-list-actions"><Button variant="secondary" disabled={busy} onClick={() => void syncSchedule()}><Icon name="sync" /> Sincronizar horario</Button><Button variant="plain" disabled={busy} onClick={() => void refresh()}><Icon name="refresh" /> Actualizar desde Google</Button></div></div>
        <p className="event-sync-rule">Los eventos personales y los creados directamente en este calendario toman su versión más reciente de Google. Las clases exportadas se actualizan desde el horario institucional al usar “Sincronizar horario”.</p>
        {message && <div role="status" className="event-feedback event-feedback--success"><span><Icon name="check" /></span><p>{message}</p><button type="button" aria-label="Cerrar confirmación" onClick={() => setMessage(null)}><Icon name="close" /></button></div>}
        {error && <div role="alert" className="event-feedback event-feedback--error"><span><Icon name="alert" /></span><p>{error}</p><button type="button" aria-label="Cerrar error" onClick={() => setError(null)}><Icon name="close" /></button></div>}
        {events.length ? <><ol className="event-list">{visibleEvents.map((event) => <li key={event.id} className="event-card" data-source={event.sourceType}><time className="event-date" dateTime={event.startAt}><strong>{formatDate(new Date(event.startAt), { day: 'numeric' })}</strong><span>{formatDate(new Date(event.startAt), { month: 'short' })}</span></time><div className="event-card__content"><p className="event-source"><span aria-hidden="true" /> {event.sourceType === 'schedule' ? 'Clase sincronizada' : event.sourceType === 'institutional' ? 'Fecha INTEC' : event.sourceType === 'google' ? 'Creado en Google' : 'Evento personal'}</p><h3>{event.title}</h3><p><Icon name="clock" width="14" height="14" /> {formatDate(new Date(event.startAt), { weekday: 'long', hour: 'numeric', minute: '2-digit' })} – {formatDate(new Date(event.endAt), { hour: 'numeric', minute: '2-digit' })}</p>{event.location && <p><Icon name="pin" width="14" height="14" /> {event.location}</p>}</div>{(event.sourceType === 'personal' || event.sourceType === 'google') && <div className="event-card-actions"><Button variant="secondary" className="event-action event-action--edit" onClick={() => beginEdit(event)}><Icon name="edit" /> Editar</Button><Button variant="plain" className="event-action event-action--delete" onClick={() => setDeleting(event)}><Icon name="trash" /> Eliminar</Button></div>}</li>)}</ol>{(hiddenEventCount > 0 || eventsExpanded) && <Button variant="plain" className="event-list-more" aria-expanded={eventsExpanded} onClick={() => setEventsExpanded((current) => !current)}>{eventsExpanded ? 'Mostrar menos eventos' : `Mostrar ${hiddenEventCount} eventos más`}<Icon name="chevron-right" /></Button>}</> : <EmptyState compact icon="calendar" title={busy ? 'Sincronizando eventos…' : 'Todavía no tienes eventos'} description="Crea tu primera actividad o sincroniza tu horario para verlo en el calendario AcademicPlanner de Google." />}
      </section>
    </div>}
    {deleting && <Dialog title="Eliminar evento" onClose={() => setDeleting(null)}><p>Se eliminará “{deleting.title}” del calendario AcademicPlanner de Google.</p><div className="dialog-actions"><Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button><Button disabled={busy} onClick={() => void confirmDelete()}>Eliminar</Button></div></Dialog>}
  </main>;
}

function timeValue(date: Date) { return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
function readableError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'INVALID_EVENT_DATA' || code === 'INVALID_REQUEST') return 'Revisa el título, la fecha y que la hora final sea posterior a la inicial.';
  if (code === 'GOOGLE_CALENDAR_AUTH_REQUIRED') return 'La sesión de Google expiró. Desconecta y vuelve a conectar el calendario.';
  if (code === 'GOOGLE_CALENDAR_PERMISSION_DENIED') return 'Google no concedió los permisos necesarios para este calendario.';
  return 'No pudimos sincronizar el evento. Revisa tu conexión e inténtalo de nuevo.';
}
