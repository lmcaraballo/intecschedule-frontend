import type { Schedule } from '../types/academic';
import { StatusBanner } from './StatusBanner';

export function UnscheduledSubjects({ schedule }: { schedule: Schedule }) {
  const subjects = schedule.unscheduledSubjects ?? [];
  if (!subjects.length) return null;
  return <StatusBanner tone="warning"><strong>Sin horario asignado</strong>
    <p>El portal registra estas materias sin días ni horas. No aparecen en el calendario; consulta sus detalles en BeeCampus.</p>
    <ul>{subjects.map((subject) => <li key={subject.id}>{subject.subjectCode} · {subject.subjectName} · Sección {subject.section}</li>)}</ul>
  </StatusBanner>;
}
