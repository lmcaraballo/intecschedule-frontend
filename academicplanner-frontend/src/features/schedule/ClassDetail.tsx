import { isVirtualLocation, scheduledLocationLabel } from './classLocation';
import { useSearchParams } from 'react-router';
import { useAcademicSession } from '../../app/AcademicLayout';
import { getSubjectColor } from './subjectColor';
import { formatTime, weekdayNames } from '../../utils/dateFormat';
import { Icon } from '../../components/Icon';
import { StatusBanner } from '../../components/StatusBanner';
import { Dialog } from '../../components/Dialog';
import { EmptyState } from '../../components/EmptyState';

export function ClassDetail() {
  const { session } = useAcademicSession();
  const [params, setParams] = useSearchParams();
  const id = params.get('class');
  const item = session.schedule.classes.find((entry) => entry.id === id);
  function close() {
    const next = new URLSearchParams(params);
    next.delete('class');
    setParams(next, { replace: true, preventScrollReset: true });
  }
  if (!id) return null;
  return <Dialog key={id} title="Detalle de clase" className="class-detail" onClose={close}>
    {item ? <>
      <div className="detail-subject" data-subject={getSubjectColor(item.subjectCode)}><span className="section-label">Clase institucional</span><h3>{item.subjectName}</h3><p>{item.subjectCode} · Sección {item.section || 'por confirmar'}</p></div>
      <dl className="detail-facts"><div><dt>Profesor</dt><dd>{item.professor || 'Por confirmar'}</dd></div><div><dt>Día</dt><dd>{weekdayNames[item.day - 1]}</dd></div><div><dt>Hora de inicio</dt><dd>{formatTime(item.startTime)}</dd></div><div><dt>Hora final</dt><dd>{formatTime(item.endTime)}</dd></div><div><dt>Ubicación</dt><dd>{scheduledLocationLabel(item.location)}</dd></div></dl>
      <StatusBanner><strong>Solo lectura</strong><p>Las clases institucionales se consultan tal como aparecen en tu horario.</p></StatusBanner>
      {session.student.isPino && item.location && !isVirtualLocation(item.location) && <div className="pino-help"><Icon name="pine" /><div><strong>¿Primera vez en este edificio?</strong><p>La orientación en Campus estará disponible próximamente.</p><span className="future-link">Ver en Campus · Próximamente</span></div></div>}
    </> : <EmptyState title="No encontramos esta clase" description="Puede que tu horario haya cambiado. Cierra este detalle para consultar las clases disponibles." />}
  </Dialog>;
}
