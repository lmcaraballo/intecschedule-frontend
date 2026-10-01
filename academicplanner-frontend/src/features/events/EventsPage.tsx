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
import { emptyEventDraft, type CalendarEvent, type EventDraft } from './eventSchema';

export function EventsPage() {
  const { session, now } = useAcademicSession();
  const connection = useCalendarConnection();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [draft, setDraft] = useState<EventDraft>(() => ({ ...emptyEventDraft(), date: dateKey(now), startTime: '16:00', endTime: '17:00' }));
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh(token = connection.token) {
    if (!token) return;
    setBusy(true);
    setError(null);
    const from = new Date(now);
    const to = new Date(now); to.setDate(to.getDate() + 180);
    try { setEvents(await listCalendarEvents(token, from, to)); }
    catch (caught) { setError(readableError(caught)); }
    finally { setBusy(false); }
  }

  useEffect(() => { if (connection.token) void refresh(connection.token); else setEvents([]); }, [connection.token]); // eslint-disable-line react-hooks/exhaustive-deps

  const conflicts = useMemo(() => {
    if (!draft.date || !draft.startTime || !draft.endTime) return [];
    const day = new Date(`${draft.date}T12:00:00`);
    const start = atTime(day, draft.startTime);
    const end = atTime(day, draft.endTime);
    return getTodayClasses(session.schedule, day).filter((item) => atTime(day, item.startTime) < end && atTime(day, item.endTime) > start);
  }, [draft.date, draft.startTime, draft.endTime, session.schedule]);

  function updateDraft(field: keyof EventDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setMessage(null); setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!connection.token) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      if (editing) await updateCalendarEvent(connection.token, editing.id, draft);
      else await createCalendarEvent(connection.token, draft, crypto.randomUUID());
      setMessage(editing ? 'Evento actualizado en Google Calendar.' : 'Evento creado en Google Calendar.');
      setEditing(null);
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
    setMessage(null); setError(null);
    document.querySelector<HTMLElement>('#event-form-title')?.scrollIntoView({ behavior: 'smooth' });
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

    {connection.token && <div className="events-layout">
      <section className="event-editor" aria-labelledby="event-form-title"><div><p className="section-label">{editing ? 'Editando evento' : 'Nueva actividad'}</p><h2 id="event-form-title">{editing ? editing.title : 'Reserva tiempo para ti'}</h2></div><form onSubmit={save}>
        <label>Título<input required maxLength={200} value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} /></label>
        <div className="event-form-row"><label>Fecha<input required type="date" value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} /></label><label>Inicio<input required type="time" value={draft.startTime} onChange={(event) => updateDraft('startTime', event.target.value)} /></label><label>Fin<input required type="time" value={draft.endTime} onChange={(event) => updateDraft('endTime', event.target.value)} /></label></div>
        <label>Lugar <span>(opcional)</span><input maxLength={300} value={draft.location} onChange={(event) => updateDraft('location', event.target.value)} /></label>
        <label>Descripción <span>(opcional)</span><textarea maxLength={2000} rows={3} value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} /></label>
        {conflicts.length > 0 && <div className="event-conflict" role="status"><Icon name="clock" /><p><strong>Coincide con {conflicts.length === 1 ? 'una clase' : `${conflicts.length} clases`}.</strong> {conflicts.map((item) => `${item.subjectName} (${item.startTime}–${item.endTime})`).join(', ')}</p></div>}
        <div className="event-form-actions">{editing && <Button variant="secondary" onClick={() => { setEditing(null); setDraft({ ...emptyEventDraft(), date: dateKey(now), startTime: '16:00', endTime: '17:00' }); }}>Cancelar edición</Button>}<Button type="submit" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear evento'}</Button></div>
      </form></section>

      <section className="event-list-section" aria-labelledby="event-list-title"><div className="section-heading"><h2 id="event-list-title">Próximos eventos</h2><Button variant="plain" disabled={busy} onClick={() => void refresh()}>Actualizar</Button></div>{message && <p role="status" className="event-success">{message}</p>}{error && <p role="alert" className="preference-warning">{error}</p>}{events.length ? <ol className="event-list">{events.map((event) => <li key={event.id} className="event-card"><div className="event-date"><strong>{formatDate(new Date(event.startAt), { day: 'numeric' })}</strong><span>{formatDate(new Date(event.startAt), { month: 'short' })}</span></div><div><h3>{event.title}</h3><p>{formatDate(new Date(event.startAt), { weekday: 'long', hour: 'numeric', minute: '2-digit' })} – {formatDate(new Date(event.endAt), { hour: 'numeric', minute: '2-digit' })}</p>{event.location && <p><Icon name="pin" width="14" height="14" /> {event.location}</p>}</div><div className="event-card-actions"><Button variant="plain" onClick={() => beginEdit(event)}>Editar</Button><Button variant="plain" onClick={() => setDeleting(event)}>Eliminar</Button></div></li>)}</ol> : <EmptyState compact icon="calendar" title={busy ? 'Sincronizando eventos…' : 'Todavía no tienes eventos'} description="Crea tu primera actividad y aparecerá en el calendario AcademicPlanner de Google." />}</section>
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
