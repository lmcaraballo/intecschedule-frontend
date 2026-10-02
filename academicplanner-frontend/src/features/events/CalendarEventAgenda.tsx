import type { CalendarEvent } from './eventSchema';
import { formatDate } from '../../utils/dateFormat';
import { Icon } from '../../components/Icon';

export function googleEventsForDay(events: CalendarEvent[], date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return events
    .filter((event) => (event.sourceType === 'google' || event.sourceType === 'personal')
      && Date.parse(event.startAt) < end.getTime() && Date.parse(event.endAt) > start.getTime())
    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
}

export function CalendarEventAgenda({ events, date }: { events: CalendarEvent[]; date: Date }) {
  const dayEvents = googleEventsForDay(events, date);
  if (!dayEvents.length) return null;
  return <section className="calendar-event-agenda" aria-labelledby="calendar-event-agenda-title">
    <div className="section-heading"><div><p className="section-label">Google Calendar</p><h2 id="calendar-event-agenda-title">Tus eventos del día</h2></div><span>{dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}</span></div>
    <ol className="calendar-event-agenda__list">{dayEvents.map((event) => <li key={event.id}>
      <time dateTime={event.startAt}>{formatDate(new Date(event.startAt), { hour: 'numeric', minute: '2-digit' })}</time>
      <div><strong>{event.title}</strong>{event.location && <span><Icon name="pin" width="14" height="14" /> {event.location}</span>}</div>
    </li>)}</ol>
  </section>;
}
