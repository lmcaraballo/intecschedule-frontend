import type { AcademicSession } from '../types/academic';
import { formatUpdatedAt, formatDate } from '../utils/dateFormat';
import { useClock } from '../utils/useClock';
import { Button } from './Button';
import { Icon } from './Icon';

interface LastValidScheduleProps {
  session: AcademicSession;
  onContinue?: () => void;
  recovery?: boolean;
}

export function LastValidSchedule({ session, onContinue, recovery = false }: LastValidScheduleProps) {
  const now = useClock();
  const fetchedAt = session.schedule.fetchedAt;
  return <section className={`last-valid-schedule${onContinue ? '' : ' last-valid-schedule--compact'}`} aria-label="Último horario válido">
    <Icon name="check" width="18" height="18" />
    <div>
      <h2>{onContinue ? 'Tu horario guardado sigue disponible.' : 'Mostrando tu último horario válido.'}</h2>
      {onContinue && <p>{recovery ? 'Puedes seguir utilizando tu último horario válido.' : 'Continúa sin volver a consultar el portal.'}</p>}
      <p><time dateTime={fetchedAt} title={formatDate(new Date(fetchedAt), { dateStyle: 'full', timeStyle: 'short' })}>{formatUpdatedAt(fetchedAt, now)}</time></p>
      {onContinue && <><p className="saved-profile">Identificación terminada en {session.student.id.slice(-4)}</p><Button variant="secondary" onClick={onContinue}>Continuar con horario guardado</Button></>}
    </div>
  </section>;
}
