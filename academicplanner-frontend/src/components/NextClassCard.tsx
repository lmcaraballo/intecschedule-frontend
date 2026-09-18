import { addDays, isSameDay, type ClassOccurrence } from '../features/schedule/scheduleDomain';
import { formatDate } from '../utils/dateFormat';
import { ClassCard } from './ClassCard';

export function NextClassCard({ occurrence, now }: { occurrence: ClassOccurrence; now: Date }) {
  const day = isSameDay(occurrence.startsAt, now) ? 'Hoy' : isSameDay(occurrence.startsAt, addDays(now, 1)) ? 'Mañana' : formatDate(occurrence.startsAt, { weekday: 'long', day: 'numeric', month: 'short' });
  return <section aria-labelledby="next-class-title"><h2 id="next-class-title" className="section-label">Próxima clase <span>{day}</span></h2><ClassCard academicClass={occurrence.academicClass} /></section>;
}
