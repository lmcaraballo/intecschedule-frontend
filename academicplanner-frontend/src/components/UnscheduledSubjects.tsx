import type { Schedule } from '../types/academic';
import { StatusBanner } from './StatusBanner';

export function UnscheduledSubjects({ schedule }: { schedule: Schedule }) {
  const subjects = schedule.unscheduledSubjects ?? [];
  if (!subjects.length) return null;
  return <StatusBanner><strong>Materias asíncronas y componentes sin horario semanal</strong>
    <p>Se muestran por separado para no crear bloques vacíos en tu calendario. Una materia puede tener también encuentros programados.</p>
    <ul>{subjects.map((subject) => <li key={subject.id}>
      <strong>{subject.subjectCode} · {subject.subjectName} · Sección {subject.section || 'no informada'}</strong>
      <p>{subject.reason === 'asynchronous' ? 'Asíncrona: el portal lo indica expresamente. Revisa las actividades y fechas de entrega en el Aula Virtual.'
        : subject.reason === 'to_be_announced' ? 'Horario por anunciar: el portal todavía no informa cuándo se reúne este componente.'
        : 'Sin horario semanal informado: puede ser una materia asíncrona o tener un encuentro pendiente. Confirma la modalidad con tu docente o en BeeCampus.'}</p>
      {subject.location && <p>Ubicación informada: {subject.location}</p>}
    </li>)}</ul>
    <a href="https://campusvirtual.intec.edu.do/" target="_blank" rel="noopener noreferrer">Abrir Aula Virtual de INTEC</a>
  </StatusBanner>;
}
