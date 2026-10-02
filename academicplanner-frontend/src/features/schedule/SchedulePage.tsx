import { UnscheduledSubjects } from '../../components/UnscheduledSubjects';
import { Button } from '../../components/Button';
import { useSearchParams } from 'react-router';
import { useAcademicSession } from '../../app/AcademicLayout';
import { addDays, getTodayClasses, isPastDay, isSameDay, isoWeekday } from './scheduleDomain';
import { availableScheduleViews, isScheduleView, type AvailableScheduleView } from './scheduleViews';
import { dateKey, formatDate, parseDateKey, weekdayNames } from '../../utils/dateFormat';
import { ClassCard } from '../../components/ClassCard';
import { Icon } from '../../components/Icon';
import { LastUpdated } from '../../components/LastUpdated';
import { EmptyState } from '../../components/EmptyState';
import { WeekSchedule } from './WeekSchedule';
import { getInstitutionalDate, getInstitutionalPeriod } from '../institutional/institutionalCalendar';
import { MonthSchedule } from './MonthSchedule';
import { CalendarEventAgenda } from '../events/CalendarEventAgenda';
import { useCalendarEvents } from '../events/CalendarEventsProvider';

export function SchedulePage() {
  const { session, now, preferences } = useAcademicSession();
  const [params, setParams] = useSearchParams();
  const requestedView = params.get('view');
  const view: AvailableScheduleView = isScheduleView(requestedView) ? requestedView : preferences.defaultScheduleView;
  const requested = parseDateKey(params.get('date'), now);
  const hasSunday = session.schedule.classes.some((item) => item.day === 7);
  const selected = !hasSunday && isoWeekday(requested) === 7 ? addDays(requested, 1) : requested;
  const monday = addDays(selected, 1 - isoWeekday(selected));
  const days = Array.from({ length: hasSunday ? 7 : 6 }, (_, index) => addDays(monday, index));
  const classes = getTodayClasses(session.schedule, selected);
  const selectedIsPast = isPastDay(selected, now);
  const institutionalDate = getInstitutionalDate(selected);
  const period = getInstitutionalPeriod(selected);
  const { events: calendarEvents } = useCalendarEvents();

  function update(date: Date, nextView = view) {
    const next = new URLSearchParams(params);
    next.set('date', dateKey(date));
    next.set('view', nextView);
    next.delete('class');
    setParams(next, { replace: true, preventScrollReset: true });
  }
  function move(direction: number) {
    let next = view === 'month'
      ? new Date(selected.getFullYear(), selected.getMonth() + direction, 1, 12)
      : addDays(selected, view === 'week' ? direction * 7 : direction);
    if (view !== 'month' && !hasSunday && isoWeekday(next) === 7) next = addDays(next, direction);
    update(next);
  }

  const periodLabel = view === 'month'
    ? formatDate(selected, { month: 'long', year: 'numeric' })
    : view === 'day'
      ? formatDate(selected, { month: 'long', year: 'numeric' })
      : `${formatDate(monday, { day: 'numeric', month: 'short' })} – ${formatDate(days[days.length - 1]!, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const previousLabel = view === 'day' ? 'Día anterior' : view === 'week' ? 'Semana anterior' : 'Mes anterior';
  const nextLabel = view === 'day' ? 'Día siguiente' : view === 'week' ? 'Semana siguiente' : 'Mes siguiente';

  return <main id="main-content" className={`academic-page schedule-page${preferences.scheduleDensity === 'compact' ? ' schedule-page--compact' : ''}`} data-density={preferences.scheduleDensity}>
    <header className="page-heading"><div><p className="page-eyebrow">Haz espacio para lo importante</p><h1 id="page-title" tabIndex={-1}>Horario</h1><p className="page-date">{session.student.name ? `${session.student.name} · ` : ''}Tus clases institucionales, en un solo lugar.</p></div><span className="readonly-label"><Icon name="lock" width="15" height="15" /> Solo lectura</span></header>
    <div className="schedule-toolbar"><div className="view-switch" role="group" aria-label="Vista del horario">{availableScheduleViews.map((entry) => <Button variant="plain" type="button" key={entry.id} aria-pressed={view === entry.id} onClick={() => update(selected, entry.id)}>{entry.label}</Button>)}</div><Button variant="plain" type="button" className="today-button" onClick={() => update(now)}>{!hasSunday && isoWeekday(now) === 7 ? 'Próximo lunes' : 'Hoy'}</Button></div>
    <div className="date-navigation"><Button variant="plain" type="button" className="icon-button" aria-label={previousLabel} onClick={() => move(-1)}><Icon name="chevron-left" /></Button><h2 aria-live="polite">{periodLabel}</h2><Button variant="plain" type="button" className="icon-button" aria-label={nextLabel} onClick={() => move(1)}><Icon name="chevron-right" /></Button></div>
    <p className="sr-only" role="status">{view === 'day' ? `Vista Día: ${formatDate(selected)}. ${classes.length} clases.` : view === 'week' ? `Vista Semana: desde el ${formatDate(monday)}.` : `Vista Mes: ${periodLabel}.`}</p>
    <div key={`${view}-${dateKey(selected)}`} className="view-content">
    {view === 'day' ? <>
      <div className="day-picker" role="group" aria-label="Seleccionar día">{days.map((date) => { const past = isPastDay(date, now); return <Button variant="plain" type="button" key={dateKey(date)} data-past={past || undefined} aria-pressed={isSameDay(date, selected)} aria-current={isSameDay(date, now) ? 'date' : undefined} aria-label={`${formatDate(date)}${past ? ', día anterior' : ''}`} onClick={() => update(date)}><span>{weekdayNames[isoWeekday(date) - 1]?.slice(0, 3)}</span><strong>{date.getDate()}</strong><span className="day-picker__dot" aria-hidden="true" /></Button>; })}</div>
      <section className={`day-schedule${selectedIsPast ? ' day-schedule--past' : ''}`} aria-labelledby="selected-day-title"><div className="section-heading"><div><h2 id="selected-day-title">{formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>{selectedIsPast && <p className="history-note"><Icon name="calendar" width="14" height="14" /> Día anterior: puedes consultar sus clases y detalles.</p>}</div><span>{selectedIsPast ? 'Historial · ' : ''}{classes.length} {classes.length === 1 ? 'clase' : 'clases'}</span></div>{classes.length ? <ol className="class-list">{classes.map((item) => <li key={item.id}><ClassCard academicClass={item} eyebrow={selectedIsPast ? 'Historial' : undefined} compact={preferences.scheduleDensity === 'compact'} /></li>)}</ol> : <EmptyState compact title={institutionalDate?.kind === 'no_class' ? institutionalDate.title : period ? 'No tienes clases este día' : 'Este día queda fuera del trimestre activo'} description={institutionalDate?.kind === 'no_class' ? institutionalDate.detail : period ? 'Puedes explorar otro día de la semana.' : 'El horario no se repite automáticamente fuera de las fechas académicas confirmadas.'} />}</section>
    </> : view === 'week' ? <WeekSchedule schedule={session.schedule} days={days} now={now} onSelectDay={(date) => update(date, 'day')} /> : <MonthSchedule schedule={session.schedule} selected={selected} now={now} showInstitutionalDates={preferences.showInstitutionalDates} onSelectDay={(date) => update(date, 'day')} />}
    </div>
    <CalendarEventAgenda events={calendarEvents} date={selected} />
    <p className="schedule-note"><Icon name="calendar" width="16" height="16" /> El horario se muestra solo dentro del trimestre publicado e incorpora los feriados registrados. Las horas siguen la zona horaria de tu dispositivo.</p>
    {preferences.showUnscheduledSubjects && <UnscheduledSubjects schedule={session.schedule} />}
    <LastUpdated fetchedAt={session.schedule.fetchedAt} />
  </main>;
}
