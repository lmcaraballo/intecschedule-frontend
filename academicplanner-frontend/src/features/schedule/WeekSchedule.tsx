import { Button } from '../../components/Button';
import type { CSSProperties } from 'react';
import type { Schedule } from '../../types/academic';
import { ClassCard } from '../../components/ClassCard';
import { dateKey, formatDate, formatTime, weekdayNames } from '../../utils/dateFormat';
import { getTodayClasses, isSameDay, isoWeekday } from './scheduleDomain';

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

export function WeekSchedule({ schedule, days, now, onSelectDay }: { schedule: Schedule; days: Date[]; now: Date; onSelectDay: (date: Date) => void }) {
  const columns = days.map((date) => ({ date, classes: getTodayClasses(schedule, date) }));
  const allClasses = columns.flatMap((column) => column.classes);
  // Overlapping institutional classes remain fully readable in agenda columns.
  // Otherwise desktop uses shared time rows; mobile always uses daily lists.
  const overlaps = columns.some(({ classes }) => classes.some((item, index) => classes.slice(0, index).some((earlier) => earlier.endTime > item.startTime)));
  const timeline = allClasses.length > 0 && !overlaps;
  const start = allClasses.length ? Math.floor(Math.min(...allClasses.map((item) => minutes(item.startTime))) / 60) * 60 : 480;
  const end = allClasses.length ? Math.ceil(Math.max(...allClasses.map((item) => minutes(item.endTime))) / 60) * 60 : 1020;
  const hours = Array.from({ length: (end - start) / 60 }, (_, index) => start + index * 60);
  return <div className={`week-schedule${timeline ? ' week-schedule--timeline' : ''}`} style={{ '--week-slots': (end - start) / 5 } as CSSProperties} aria-label="Horario semanal de lunes a sábado">
    {timeline && hours.map((hour) => <span key={hour} className="week-time-label" aria-hidden="true" style={{ gridRow: `${(hour - start) / 5 + 2} / span 12` }}>{formatTime(`${String(hour / 60).padStart(2, '0')}:00`)}</span>)}
    {columns.map(({ date, classes }, column) => <section key={dateKey(date)} className={`week-day${isSameDay(date, now) ? ' week-day--today' : ''}`} style={{ '--week-column': column + 2 } as CSSProperties} aria-label={formatDate(date)}>
      <Button variant="plain" type="button" className="week-day__heading" onClick={() => onSelectDay(date)} aria-label={`Ver ${formatDate(date)}`}><span>{weekdayNames[isoWeekday(date) - 1]}</span><strong>{date.getDate()}</strong>{isSameDay(date, now) && <span className="week-day__today">Hoy</span>}</Button>
      {classes.length ? <ol className="class-list">{classes.map((item) => <li key={item.id} style={{ '--class-row': `${Math.floor((minutes(item.startTime) - start) / 5) + 2} / ${Math.ceil((minutes(item.endTime) - start) / 5) + 2}` } as CSSProperties}><ClassCard academicClass={item} compact /></li>)}</ol> : <p className="week-day__empty">Sin clases</p>}
    </section>)}
  </div>;
}
