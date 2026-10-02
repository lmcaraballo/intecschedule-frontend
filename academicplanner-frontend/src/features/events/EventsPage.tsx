import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { BrandSplash } from '../../components/BrandSplash';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { useAcademicSession } from '../../app/AcademicLayout';
import { atTime, getTodayClasses } from '../schedule/scheduleDomain';
import { dateKey, formatDate } from '../../utils/dateFormat';
import { useCalendarConnection } from './CalendarConnectionProvider';
import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents, updateCalendarEvent } from './calendarApi';
import { calendarOwnerId, syncInstitutionalReminders, syncScheduleToCalendar } from './calendarSync';
import { emptyEventDraft, type CalendarEvent, type EventDraft } from './eventSchema';
import { getInstitutionalPeriod, getInstitutionalPeriods } from '../institutional/institutionalCalendar';

type EventTab = 'personal' | 'schedule' | 'institutional';

const tabCopy: Record<EventTab, { label: string; title: string; description: string; empty: string }> = {
  personal: {
    label: 'Personales',
    title: 'Mis eventos personales',
    description: 'Incluye lo que creaste aquí y los eventos existentes de tu calendario principal de Google.',
    empty: 'No hay eventos personales próximos. Crea uno aquí o añádelo en Google Calendar.',
  },
  schedule: {
    label: 'Mi horario',
    title: 'Clases en Google Calendar',
    description: 'Una carpeta separada para tus clases. Se actualiza solo cuando envías tu horario.',
    empty: 'Todavía no has enviado tus clases a Google Calendar.',
  },
  institutional: {
    label: 'Fechas INTEC',
    title: 'Calendario institucional INTEC',
    description: 'Fechas oficiales y recordatorios en una carpeta independiente, sin mezclar tus actividades.',
    empty: 'No hay fechas institucionales próximas para mostrar.',
  },
};

export function EventsPage() {
  const { session, now, preferences } = useAcademicSession();
  const connection = useCalendarConnection();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [params] = useSearchParams();
  const requestedTab = params.get('tab');
  const [activeTab, setActiveTab] = useState<EventTab>(() => requestedTab === 'schedule' || requestedTab === 'institutional' ? requestedTab : 'personal');
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<EventDraft>(() => ({ ...emptyEventDraft(), date: dateKey(now), startTime: '16:00', endTime: '17:00' }));
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const busy = Boolean(loadingMessage) || connection.loading;
  const selectedPeriod = useMemo(() => getInstitutionalPeriods().find((period) => period.id === params.get('period')) ?? null, [params]);
  const scheduleOwnerId = calendarOwnerId(session.student.id);
  const sessionPeriod = getInstitutionalPeriod(new Date(session.schedule.fetchedAt));
  const viewingScheduleHistory = activeTab === 'schedule' && Boolean(selectedPeriod && selectedPeriod.id !== sessionPeriod?.id);

  async function refresh(token = connection.token, showSplash = true, tab = activeTab) {
    if (!token) return;
    if (showSplash) setLoadingMessage('Trayendo tus cambios de Google Calendar');
    setError(null);
    const isPeriodHistory = tab === 'schedule' && selectedPeriod;
    const from = isPeriodHistory ? new Date(`${selectedPeriod.startsOn}T00:00:00`) : new Date(now);
    const to = isPeriodHistory ? new Date(`${selectedPeriod.endsOn}T23:59:59`) : new Date(now);
    if (!isPeriodHistory) to.setDate(to.getDate() + 180);
    try {
      const nextEvents = await listCalendarEvents(token, from, to, scheduleOwnerId);
      setEvents([...nextEvents].sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt)));
      setLastSyncedAt(new Date());
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      if (showSplash) setLoadingMessage(null);
    }
  }

  useEffect(() => {
    if (!connection.token) {
      setEvents([]); setEventsExpanded(false); setLastSyncedAt(null); setEditorOpen(false);
      return;
    }
    const token = connection.token;
    void (async () => {
      setLoadingMessage('Preparando tus calendarios separados');
      try {
        await syncInstitutionalReminders(token, session.student.id, preferences.institutionalReminders, preferences.reminderMinutes);
        await refresh(token, false);
      } catch (caught) {
        setError(readableError(caught));
      } finally {
        setLoadingMessage(null);
      }
    })();
  }, [connection.token, preferences.institutionalReminders, preferences.reminderMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupedEvents = useMemo<Record<EventTab, CalendarEvent[]>>(() => ({
    personal: events.filter((event) => event.sourceType === 'personal' || event.sourceType === 'google'),
    schedule: events.filter((event) => event.sourceType === 'schedule' && event.ownerId === scheduleOwnerId),
    institutional: events.filter((event) => event.sourceType === 'institutional'),
  }), [events, scheduleOwnerId]);
  const tabEvents = groupedEvents[activeTab];
  const visibleEvents = eventsExpanded ? tabEvents : tabEvents.slice(0, 8);
  const hiddenEventCount = Math.max(0, tabEvents.length - visibleEvents.length);

  function resetDraft(keepDate = false) {
    setEditing(null); setOptionalOpen(false);
    setDraft({ ...emptyEventDraft(), date: keepDate ? draft.date : dateKey(now), startTime: '16:00', endTime: '17:00' });
  }

  function cancelEditing() {
    resetDraft();
    setEditorOpen(false);
  }

  function selectTab(tab: EventTab) {
    setActiveTab(tab);
    setEventsExpanded(false);
    if (tab !== 'personal') cancelEditing();
    setMessage(null); setError(null);
    if (connection.token) void refresh(connection.token, true, tab);
  }

  function disconnectGoogle() {
    connection.disconnect();
    setDisconnecting(true);
    window.setTimeout(() => setDisconnecting(false), preferences.reducedMotion ? 180 : 1180);
  }

  async function syncSchedule() {
    if (!connection.token) return;
    setLoadingMessage('Enviando tus clases a Google Calendar'); setError(null); setMessage(null);
    try {
      const result = await syncScheduleToCalendar(connection.token, session);
      setMessage(`Horario sincronizado: ${result.created} creadas, ${result.updated} actualizadas y ${result.removed} retiradas. No se duplicaron ${result.unchanged} ocurrencias.`);
      await refresh(connection.token, false, 'schedule');
      setActiveTab('schedule'); setEventsExpanded(false);
    } catch (caught) { setError(readableError(caught)); }
    finally { setLoadingMessage(null); }
  }

  const conflicts = useMemo(() => {
    if (!draft.date || !draft.startTime || !draft.endTime) return [];
    const day = new Date(`${draft.date}T12:00:00`);
    const start = atTime(day, draft.startTime);
    const end = atTime(day, draft.endTime);
    return getTodayClasses(session.schedule, day).filter((item) => atTime(day, item.startTime) < end && atTime(day, item.endTime) > start);
  }, [draft.date, draft.startTime, draft.endTime, session.schedule]);
  const timeRangeInvalid = Boolean(draft.startTime && draft.endTime && draft.endTime <= draft.startTime);

  function updateDraft(field: keyof EventDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setMessage(null); setError(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!connection.token) return;
    setLoadingMessage(editing ? 'Guardando tus cambios en Google Calendar' : 'Creando tu evento en Google Calendar');
    setError(null); setMessage(null);
    try {
      if (editing) await updateCalendarEvent(connection.token, editing.id, draft, {
        sourceType: editing.sourceType,
        reminderMinutes: editing.reminderMinutes,
      });
      else await createCalendarEvent(connection.token, draft, crypto.randomUUID());
      setMessage(editing ? 'Evento actualizado en tu calendario personal.' : 'Evento creado en tu calendario personal.');
      setEventsExpanded(true);
      resetDraft(true);
      setEditorOpen(false);
      await refresh(connection.token, false);
    } catch (caught) { setError(readableError(caught)); }
    finally { setLoadingMessage(null); }
  }

  function beginEdit(event: CalendarEvent) {
    const start = new Date(event.startAt); const end = new Date(event.endAt);
    setActiveTab('personal'); setEditorOpen(true); setEditing(event);
    setDraft({
      title: event.title, description: event.description ?? '', date: dateKey(start),
      startTime: timeValue(start), endTime: timeValue(end), location: event.location ?? '',
    });
    setOptionalOpen(true); setMessage(null); setError(null);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('#event-form-title')?.scrollIntoView({ behavior: preferences.reducedMotion ? 'auto' : 'smooth', block: 'start' });
      document.querySelector<HTMLInputElement>('#event-title')?.focus({ preventScroll: true });
    });
  }

  async function confirmDelete() {
    if (!connection.token || !deleting) return;
    setLoadingMessage('Eliminando el evento de Google Calendar'); setError(null);
    try {
      await deleteCalendarEvent(connection.token, deleting.id);
      setDeleting(null);
      setMessage('Evento eliminado de tu calendario personal.');
      await refresh(connection.token, false);
    } catch (caught) { setDeleting(null); setError(readableError(caught)); }
    finally { setLoadingMessage(null); }
  }

  return <main id="main-content" className="academic-page events-page">
    {(connection.loading || loadingMessage) && <BrandSplash loading message={loadingMessage ?? 'Preparando Google Calendar'} />}
    {disconnecting && <BrandSplash message="Conexión con Google Calendar cerrada" />}
    <header className="page-heading"><div><p className="page-eyebrow">Tu tiempo, cada cosa en su lugar</p><h1 id="page-title" tabIndex={-1}>Eventos</h1><p className="page-date">Personales, clases y fechas INTEC viven en espacios separados.</p></div>{connection.token && <Button variant="secondary" onClick={disconnectGoogle}>Desconectar Google</Button>}</header>

    {!connection.token && <section className="calendar-onboarding" aria-labelledby="calendar-onboarding-title"><Icon name="calendar" width="28" height="28" /><div><p className="section-label">{selectedPeriod ? 'Historial de un trimestre' : 'Tus calendarios, bien organizados'}</p><h2 id="calendar-onboarding-title">{selectedPeriod ? `Recupera ${selectedPeriod.title.replace('Trimestre ', '')}` : 'Conecta tus calendarios de Google'}</h2><p>{selectedPeriod ? 'Al conectarte, mostraremos solo las clases que AcademicPlanner hubiera sincronizado para este trimestre. Las materias retiradas no se incluyen.' : 'Importa los eventos de tu calendario personal. Tus clases y fechas INTEC se guardarán por separado para que no se mezclen.'}</p><Button disabled={connection.loading} onClick={() => void (connection.config?.available ? connection.connect() : connection.retryPreparation())}>{connection.loading ? 'Preparando conexión…' : connection.config?.available ? 'Conectar con Google' : 'Reintentar conexión'}</Button>{!connection.loading && connection.config && !connection.config.available && <p className="connection-help">La conexión con Google no está disponible todavía. Vuelve a intentarlo en unos minutos.</p>}{connection.error && <p role="alert" className="preference-warning">{connection.error}</p>}</div></section>}

    {connection.token && <div className="event-workspace" aria-busy={busy}>
      <div className="event-tabs" role="tablist" aria-label="Carpetas de eventos">
        {(Object.keys(tabCopy) as EventTab[]).map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} aria-controls={`events-panel-${tab}`} id={`events-tab-${tab}`} onClick={() => selectTab(tab)}><span>{tabCopy[tab].label}</span><strong aria-label={`${groupedEvents[tab].length} eventos`}>{groupedEvents[tab].length}</strong></button>)}
      </div>

      <section className="event-folder-toolbar" aria-labelledby="event-folder-title">
        <div><p className="section-label">{activeTab === 'schedule' && selectedPeriod ? 'Trimestre seleccionado' : 'Carpeta actual'}</p><h2 id="event-folder-title">{activeTab === 'schedule' && selectedPeriod ? selectedPeriod.title.replace('Trimestre ', '') : tabCopy[activeTab].title}</h2><p>{activeTab === 'schedule' && selectedPeriod ? `Clases sincronizadas entre ${formatDate(new Date(`${selectedPeriod.startsOn}T12:00:00`), { day: 'numeric', month: 'long', year: 'numeric' })} y ${formatDate(new Date(`${selectedPeriod.endsOn}T12:00:00`), { day: 'numeric', month: 'long', year: 'numeric' })}.` : tabCopy[activeTab].description}</p>{lastSyncedAt && <p className="event-sync-status"><span aria-hidden="true" /> Última consulta a Google: {formatDate(lastSyncedAt, { hour: 'numeric', minute: '2-digit', hour12: true })}</p>}</div>
        <div className="event-folder-actions">
          {activeTab === 'personal' && <><Button onClick={() => { if (editorOpen) { resetDraft(); setEditorOpen(false); } else setEditorOpen(true); }}><Icon name={editorOpen ? 'close' : 'spark'} /> {editorOpen ? 'Cerrar formulario' : 'Nueva actividad'}</Button><Button variant="secondary" disabled={busy} onClick={() => void refresh()} title="Vuelve a consultar Google y trae los cambios hechos fuera de AcademicPlanner"><Icon name="refresh" /> Traer cambios de Google</Button></>}
          {activeTab === 'schedule' && !viewingScheduleHistory && <Button disabled={busy} onClick={() => void syncSchedule()}><Icon name="sync" /> Enviar clases a Google</Button>}
          {activeTab === 'schedule' && viewingScheduleHistory && <span className="event-folder-note"><Icon name="lock" /> Consulta de un trimestre anterior</span>}
          {activeTab === 'institutional' && <span className="event-folder-note"><Icon name="check" /> {preferences.institutionalReminders ? 'Recordatorios automáticos activos' : 'Actívalos en Más para enviarlos a Google'}</span>}
        </div>
      </section>

      {message && <div role="status" className="event-feedback event-feedback--success"><span><Icon name="check" /></span><p>{message}</p><button type="button" aria-label="Cerrar confirmación" onClick={() => setMessage(null)}><Icon name="close" /></button></div>}
      {error && <div role="alert" className="event-feedback event-feedback--error"><span><Icon name="alert" /></span><p>{error}</p><button type="button" aria-label="Cerrar error" onClick={() => setError(null)}><Icon name="close" /></button></div>}

      {activeTab === 'personal' && editorOpen && <section className="event-editor" aria-labelledby="event-form-title"><div className="event-editor__heading"><span className="event-editor__icon"><Icon name={editing ? 'edit' : 'spark'} /></span><div><p className="section-label">{editing ? 'Editando evento' : 'Nueva actividad'}</p><h2 id="event-form-title">{editing ? editing.title : 'Reserva tiempo para ti'}</h2><p>Se guardará en tu calendario principal de Google, separado de clases y fechas INTEC.</p></div></div><form onSubmit={save}>
        <label htmlFor="event-title">Título<input id="event-title" required maxLength={200} autoComplete="off" placeholder="Ej. Estudiar para el parcial" value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} /></label>
        <div className="event-form-row"><label>Fecha<input required type="date" value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} /></label><label>Inicio<input required type="time" value={draft.startTime} onChange={(event) => updateDraft('startTime', event.target.value)} /></label><label>Fin<input required type="time" aria-invalid={timeRangeInvalid} aria-describedby={timeRangeInvalid ? 'event-time-error' : undefined} value={draft.endTime} onChange={(event) => updateDraft('endTime', event.target.value)} /></label></div>
        {timeRangeInvalid && <p id="event-time-error" className="event-field-error" role="alert"><Icon name="alert" /> La hora de fin debe ser posterior a la de inicio.</p>}
        <details className="event-form-more" open={optionalOpen} onToggle={(event) => setOptionalOpen(event.currentTarget.open)}><summary><span><Icon name="pin" /> Añadir detalles opcionales</span><small>{optionalOpen ? 'Ocultar' : 'Lugar y descripción'}</small></summary><div className="event-form-more__fields">
          <label>Lugar <span>(opcional)</span><input maxLength={300} placeholder="Ej. Biblioteca" value={draft.location} onChange={(event) => updateDraft('location', event.target.value)} /></label>
          <label>Descripción <span>(opcional)</span><textarea maxLength={2000} rows={3} placeholder="Notas, enlaces o información importante" value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} /></label>
        </div></details>
        {conflicts.length > 0 && <div className="event-conflict" role="status"><Icon name="clock" /><p><strong>Coincide con {conflicts.length === 1 ? 'una clase' : `${conflicts.length} clases`}.</strong> {conflicts.map((item) => `${item.subjectName} (${item.startTime}–${item.endTime})`).join(', ')}</p></div>}
        <div className="event-form-actions"><Button variant="secondary" onClick={cancelEditing}>Cancelar</Button><Button type="submit" disabled={busy || timeRangeInvalid || !draft.title.trim()}>{editing ? <><Icon name="check" /> Guardar cambios</> : <><Icon name="arrow" /> Crear evento</>}</Button></div>
      </form></section>}

      <section className="event-list-section" role="tabpanel" id={`events-panel-${activeTab}`} aria-labelledby={`events-tab-${activeTab}`}>
        <div className="section-heading"><div><div className="event-list-title-row"><h2>{activeTab === 'schedule' && selectedPeriod ? 'Clases de este trimestre' : 'Próximos'}</h2><span className="event-count" aria-label={`${tabEvents.length} eventos`}>{tabEvents.length}</span></div></div></div>
        {tabEvents.length ? <><ol className="event-list">{visibleEvents.map((event) => <li key={event.id} className="event-card" data-source={event.sourceType}><time className="event-date" dateTime={event.startAt}><strong>{formatDate(new Date(event.startAt), { day: 'numeric' })}</strong><span>{formatDate(new Date(event.startAt), { month: 'short' })}</span></time><div className="event-card__content"><p className="event-source"><span aria-hidden="true" /> {event.sourceType === 'schedule' ? 'Clase sincronizada' : event.sourceType === 'institutional' ? 'Fecha INTEC' : event.sourceType === 'google' ? 'Creado en Google' : 'Evento personal'}</p><h3>{event.title}</h3><p><Icon name="clock" width="14" height="14" /> {formatDate(new Date(event.startAt), { weekday: 'long', hour: 'numeric', minute: '2-digit' })} – {formatDate(new Date(event.endAt), { hour: 'numeric', minute: '2-digit' })}</p>{event.location && <p><Icon name="pin" width="14" height="14" /> {event.location}</p>}</div>{activeTab === 'personal' && <div className="event-card-actions"><Button variant="secondary" className="event-action event-action--edit" onClick={() => beginEdit(event)}><Icon name="edit" /> Editar</Button><Button variant="plain" className="event-action event-action--delete" onClick={() => setDeleting(event)}><Icon name="trash" /> Eliminar</Button></div>}</li>)}</ol>{(hiddenEventCount > 0 || eventsExpanded) && <Button variant="plain" className="event-list-more" aria-expanded={eventsExpanded} onClick={() => setEventsExpanded((current) => !current)}>{eventsExpanded ? 'Mostrar menos eventos' : `Mostrar ${hiddenEventCount} eventos más`}<Icon name="chevron-right" /></Button>}</> : <EmptyState compact icon="calendar" title={activeTab === 'schedule' && selectedPeriod ? 'No encontramos clases sincronizadas para este trimestre' : 'Esta carpeta está al día'} description={activeTab === 'schedule' && selectedPeriod ? 'Conecta Google Calendar para recuperar las clases que AcademicPlanner hubiera sincronizado en este período. Las materias retiradas no se muestran.' : tabCopy[activeTab].empty} />}
      </section>
    </div>}
    {deleting && <Dialog title="Eliminar evento" onClose={() => setDeleting(null)}><p>Se eliminará “{deleting.title}” de tu calendario personal de Google.</p><div className="dialog-actions"><Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button><Button disabled={busy} onClick={() => void confirmDelete()}>Eliminar</Button></div></Dialog>}
  </main>;
}

function timeValue(date: Date) { return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
function readableError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'INVALID_EVENT_DATA' || code === 'INVALID_REQUEST') return 'Revisa el título, la fecha y que la hora final sea posterior a la inicial.';
  if (code === 'GOOGLE_CALENDAR_AUTH_REQUIRED') return 'La sesión de Google expiró. Desconecta y vuelve a conectar el calendario.';
  if (code === 'GOOGLE_CALENDAR_PERMISSION_DENIED') return 'Google no concedió los permisos necesarios para estos calendarios.';
  return 'No pudimos sincronizar con Google Calendar. Revisa tu conexión e inténtalo de nuevo.';
}
