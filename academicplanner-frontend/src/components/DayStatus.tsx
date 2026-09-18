import type { AcademicDayStatus } from '../features/schedule/scheduleDomain';
import { formatDuration, formatTime } from '../utils/dateFormat';
import { Icon } from './Icon';

export function DayStatus({ status }: { status: AcademicDayStatus }) {
  const messages = {
    before: { title: `Tu primera clase comienza en ${formatDuration(status.freeMinutes ?? 0)}.`, detail: 'Todo a su tiempo. Ya tienes tu día a mano.' },
    during: { title: 'Una clase a la vez.', detail: 'Estás en clase. Aquí tienes lo que viene después.' },
    between: { title: `Tienes ${formatDuration(status.freeMinutes ?? 0)} libres.`, detail: status.next ? `Tu próxima clase comienza a las ${formatTime(status.next.academicClass.startTime)}.` : '' },
    finished: { title: 'Terminaste tus clases de hoy.', detail: 'Es momento de hacer espacio para ti.' },
    empty: { title: 'No tienes clases hoy.', detail: status.next ? 'Disfruta la pausa. Tu próxima clase está aquí abajo.' : 'Tu horario no tiene clases registradas.' },
  };
  const message = messages[status.kind];
  return <div className={`day-status day-status--${status.kind}`} role="status"><span className="day-status__icon"><Icon name={status.kind === 'finished' ? 'check' : status.kind === 'during' ? 'book' : 'leaf'} width="22" height="22" /></span><div><h2>{message.title}</h2><p>{message.detail}</p></div></div>;
}
