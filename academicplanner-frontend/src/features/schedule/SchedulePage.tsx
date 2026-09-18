import { UnscheduledSubjects } from '../../components/UnscheduledSubjects';
import { Button } from '../../components/Button';
import { useSearchParams } from 'react-router';
import { useAcademicSession } from '../../app/AcademicLayout';
import { addDays, getTodayClasses, isSameDay, isoWeekday } from './scheduleDomain';
import { availableScheduleViews, type AvailableScheduleView } from './scheduleViews';
import { dateKey, formatDate, parseDateKey, weekdayNames } from '../../utils/dateFormat';
import { ClassCard } from '../../components/ClassCard';
import { Icon } from '../../components/Icon';
import { LastUpdated } from '../../components/LastUpdated';
import { EmptyState } from '../../components/EmptyState';
import { WeekSchedule } from './WeekSchedule';

export function SchedulePage() {
  const { session, now } = useAcademicSession();
  const [params, setParams] = useSearchParams();
  const view: AvailableScheduleView = params.get('view') === 'week' ? 'week' : 'day';
  const requested = parseDateKey(params.get('date'), now);
  const hasSunday = session.schedule.classes.some((item) => item.day === 7);
  const selected = !hasSunday && isoWeekday(requested) === 7 ? addDays(requested, 1) : requested;
  const monday = addDays(selected, 1 - isoWeekday(selected));
  const days = Array.from({ length: hasSunday ? 7 : 6 }, (_, index) => addDays(monday, index));
  const classes = getTodayClasses(session.schedule, selected);

  function update(date: Date, nextView = view) {
    const next = new URLSearchParams(params);
    next.set('date', dateKey(date));
    next.set('view', nextView);
    next.delete('class');
    setParams(next, { replace: true, preventScrollReset: true });
  }
  function move(direction: number) {
    let next = addDays(selected, view === 'week' ? direction * 7 : direction);
    if (!hasSunday && isoWeekday(next) === 7) next = addDays(next, direction);
    update(next);
  }

  return <main id="main-content" className="academic-page schedule-page">
    <header className="page-heading"><div><p className="page-eyebrow">Haz espacio para lo importante</p><h1 id="page-title" tabIndex={-1}>Horario</h1><p className="page-date">Tus clases institucionales, en un solo lugar.</p></div><span className="readonly-label"><Icon name="lock" width="15" height="15" /> Solo lectura</span></header>
    <div className="schedule-toolbar"><div className="view-switch" role="group" aria-label="Vista del horario">{availableScheduleViews.map((entry) => <Button variant="plain" type="button" key={entry.id} aria-pressed={view === entry.id} onClick={() => update(selected, entry.id)}>{entry.label}</Button>)}</div><Button variant="plain" type="button" className="today-button" onClick={() => update(now)}>{!hasSunday && isoWeekday(now) === 7 ? 'Próximo lunes' : 'Hoy'}</Button></div>
    <div className="date-navigation"><Button variant="plain" type="button" className="icon-button" aria-label={view === 'day' ? 'Día anterior' : 'Semana anterior'} onClick={() => move(-1)}><Icon name="chevron-left" /></Button><h2 aria-live="polite">{view === 'day' ? formatDate(selected, { month: 'long', year: 'numeric' }) : `${formatDate(monday, { day: 'numeric', month: 'short' })} – ${formatDate(days[days.length - 1]!, { day: 'numeric', month: 'short', year: 'numeric' })}`}</h2><Button variant="plain" type="button" className="icon-button" aria-label={view === 'day' ? 'Día siguiente' : 'Semana siguiente'} onClick={() => move(1)}><Icon name="chevron-right" /></Button></div>
    <p className="sr-only" role="status">{view === 'day' ? `Vista Día: ${formatDate(selected)}. ${classes.length} clases.` : `Vista Semana: desde el ${formatDate(monday)}.`}</p>
    <div key={`${view}-${dateKey(selected)}`} className="view-content">
    {view === 'day' ? <>
      <div className="day-picker" role="group" aria-label="Seleccionar día">{days.map((date) => <Button variant="plain" type="button" key={dateKey(date)} aria-pressed={isSameDay(date, selected)} aria-current={isSameDay(date, now) ? 'date' : undefined} aria-label={formatDate(date)} onClick={() => update(date)}><span>{weekdayNames[isoWeekday(date) - 1]?.slice(0, 3)}</span><strong>{date.getDate()}</strong><span className="day-picker__dot" aria-hidden="true" /></Button>)}</div>
      <section className="day-schedule" aria-labelledby="selected-day-title"><div className="section-heading"><h2 id="selected-day-title">{formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h2><span>{classes.length} {classes.length === 1 ? 'clase' : 'clases'}</span></div>{classes.length ? <ol className="class-list">{classes.map((item) => <li key={item.id}><ClassCard academicClass={item} /></li>)}</ol> : <EmptyState compact title="No tienes clases este día" description="Puedes explorar otro día de la semana." />}</section>
    </> : <WeekSchedule schedule={session.schedule} days={days} now={now} onSelectDay={(date) => update(date, 'day')} />}
    </div>
    <p className="schedule-note"><Icon name="calendar" width="16" height="16" /> Horario semanal recurrente · no incluye feriados, reposiciones ni fechas de entrega. Las horas siguen la zona horaria de tu dispositivo.</p>
    <UnscheduledSubjects schedule={session.schedule} />
    <LastUpdated fetchedAt={session.schedule.fetchedAt} />
  </main>;
}
