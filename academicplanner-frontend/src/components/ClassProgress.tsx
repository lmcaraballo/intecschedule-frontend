import type { AcademicClass } from '../types/academic';
import { atTime, getClassProgress } from '../features/schedule/scheduleDomain';

export function ClassProgress({ academicClass, now }: { academicClass: AcademicClass; now: Date }) {
  const percentage = getClassProgress(academicClass, now);
  const remaining = Math.max(0, Math.ceil((atTime(now, academicClass.endTime).getTime() - now.getTime()) / 60_000));
  return <div className="class-progress"><div className="class-progress__label"><span>En curso · termina en {remaining} min</span><span aria-hidden="true">{percentage}%</span></div><progress max="100" value={percentage} aria-label={`Progreso de ${academicClass.subjectName}`} aria-valuetext={`${percentage}% de la clase transcurrido`} /></div>;
}
