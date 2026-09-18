import type { AcademicClass } from '../types/academic';
import { ClassCard } from './ClassCard';
import { ClassProgress } from './ClassProgress';

export function CurrentClassCard({ academicClass, now }: { academicClass: AcademicClass; now: Date }) {
  return <section aria-labelledby="current-class-title"><h2 id="current-class-title" className="section-label">Clase en curso</h2><ClassCard academicClass={academicClass} eyebrow="Ahora"><ClassProgress academicClass={academicClass} now={now} /></ClassCard></section>;
}
