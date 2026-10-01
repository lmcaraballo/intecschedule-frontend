import type { Schedule } from '../../types/academic';
import { Button } from '../../components/Button';
import { dateKey, formatDate, formatTime, weekdayNames } from '../../utils/dateFormat';
import { getInstitutionalDate } from '../institutional/institutionalCalendar';
import { getClassModality } from './classLocation';
import { addDays, getTodayClasses, isSameDay, isoWeekday } from './scheduleDomain';
import { getSubjectColor } from './subjectColor';

export function getMonthGridDays(selected: Date): Date[] {
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
  const last = new Date(selected.getFullYear(), selected.getMonth() + 1, 0, 12);
  const start = addDays(first, 1 - isoWeekday(first));
  const end = addDays(last, 7 - isoWeekday(last));
  const total = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Array.from({ length: total }, (_, index) => addDays(start, index));
}

export function MonthSchedule({ schedule, selected, now, showInstitutionalDates, onSelectDay }: {
  schedule: Schedule;
  selected: Date;
  now: Date;
  showInstitutionalDates: boolean;
  onSelectDay: (date: Date) => void;
}) {
  const days = getMonthGridDays(selected);
  const month = selected.getMonth();

  return <section className="month-schedule" aria-label={`Horario mensual de ${formatDate(selected, { month: 'long', year: 'numeric' })}`}>
    <div className="month-weekdays" aria-hidden="true">{weekdayNames.map((name) => <span key={name}>{name.slice(0, 3)}</span>)}</div>
    <div className="month-grid">{days.map((date) => {
      const classes = getTodayClasses(schedule, date);
      const institutional = showInstitutionalDates ? getInstitutionalDate(date) : undefined;
      const outside = date.getMonth() !== month;
      const description = [formatDate(date), `${classes.length} ${classes.length === 1 ? 'clase' : 'clases'}`, institutional?.title].filter(Boolean).join('. ');
      return <Button
        variant="plain"
        type="button"
        key={dateKey(date)}
        className={`month-day${outside ? ' month-day--outside' : ''}${isSameDay(date, now) ? ' month-day--today' : ''}${institutional ? ' month-day--institutional' : ''}`}
        aria-label={description}
        aria-current={isSameDay(date, now) ? 'date' : undefined}
        onClick={() => onSelectDay(date)}
      >
        <span className="month-day__number">{date.getDate()}</span>
        {institutional && <span className="month-day__institutional" title={institutional.title}>{institutional.title}</span>}
        {classes.length > 0 && <>
          <span className="month-day__count">{classes.length} {classes.length === 1 ? 'clase' : 'clases'}</span>
          <span className="month-day__classes" aria-hidden="true">{classes.slice(0, 3).map((item) => <span key={item.id} data-subject={getSubjectColor(item.subjectCode)} className={getClassModality(item.location) === 'virtual' ? 'is-virtual' : undefined}><strong>{formatTime(item.startTime)}</strong> {item.subjectCode}{getClassModality(item.location) === 'virtual' ? ' · Virtual' : ''}</span>)}{classes.length > 3 && <span>+{classes.length - 3} más</span>}</span>
        </>}
      </Button>;
    })}</div>
    <p className="month-schedule__hint">Selecciona un día para ver sus clases y detalles.</p>
  </section>;
}
