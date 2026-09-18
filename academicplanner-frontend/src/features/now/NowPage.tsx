import { UnscheduledSubjects } from '../../components/UnscheduledSubjects';
import { Link } from 'react-router';
import { useAcademicSession } from '../../app/AcademicLayout';
import { getDayStatus, atTime } from '../schedule/scheduleDomain';
import { getContextualTheme } from '../../theme/contextualTheme';
import { formatDate } from '../../utils/dateFormat';
import { ClassCard } from '../../components/ClassCard';
import { CurrentClassCard } from '../../components/CurrentClassCard';
import { NextClassCard } from '../../components/NextClassCard';
import { DayStatus } from '../../components/DayStatus';
import { LastUpdated } from '../../components/LastUpdated';
import { Icon } from '../../components/Icon';
import { EmptyState } from '../../components/EmptyState';
import { useNetworkStatus } from '../../utils/useNetworkStatus';

const greetings = { morning: 'Buenos días', day: 'A tu ritmo', sunset: 'Buenas tardes', night: 'Buenas noches' };

export function NowPage() {
  const { session, now } = useAcademicSession();
  const status = getDayStatus(session.schedule, now);
  const online = useNetworkStatus();
  return <main id="main-content" className="academic-page now-page">
    <header className="page-heading"><div><p className="page-eyebrow">{greetings[getContextualTheme(now)]} · tu espacio académico</p><h1 id="page-title" tabIndex={-1}>Ahora</h1><p className="page-date">{formatDate(now)} <span aria-hidden="true">· </span><time dateTime={now.toISOString()}>{formatDate(now, { hour: 'numeric', minute: '2-digit', hour12: true })}</time></p></div><Link className="quick-link" to="/horario">Ver horario <Icon name="arrow" width="17" height="17" /></Link></header>
    <DayStatus status={status} hasUnscheduled={Boolean(session.schedule.unscheduledSubjects?.length)} />
    <div className="now-columns">
      <div className="now-focus">
        {status.current && <CurrentClassCard academicClass={status.current} now={now} />}
        {status.next && <NextClassCard occurrence={status.next} now={now} />}
        {!status.current && !status.next && <EmptyState icon="calendar" title={session.schedule.unscheduledSubjects?.length ? "Tus materias no tienen encuentros con hora informada" : "Tu horario todavía no tiene clases"} description={session.schedule.unscheduledSubjects?.length ? "Puedes ver las materias registradas al final de esta página." : online ? "La consulta fue correcta, pero no hay clases registradas. Puedes volver a consultar más adelante." : "No hay clases en el horario guardado. Conéctate a Internet para consultar uno actualizado."} action={online && <Link to="/" className="quick-link">Consultar horario <Icon name="arrow" /></Link>} />}
        {session.student.isPino && session.schedule.classes.length > 0 && <div className="pino-help"><Icon name="pine" /><p><strong>Conoce tu próximo destino.</strong> Abre una clase para consultar el aula y los datos de tu profesor.</p></div>}
      </div>
      <section className="today-agenda" aria-labelledby="today-agenda-title"><div className="section-heading"><h2 id="today-agenda-title">Tu día, de un vistazo</h2><span>{status.today.length} {status.today.length === 1 ? 'clase' : 'clases'}</span></div>
        {status.today.length ? <ol className="class-list">{status.today.map((item) => <li key={item.id}><ClassCard academicClass={item} compact eyebrow={atTime(now, item.endTime) <= now ? 'Finalizada' : atTime(now, item.startTime) <= now ? 'En curso' : 'Pendiente'} /></li>)}</ol> : <EmptyState compact title="Hoy no hay clases en tu horario" description="Puedes explorar los demás días de tu semana." action={<Link to="/horario" className="quick-link">Explorar la semana <Icon name="arrow" width="16" height="16" /></Link>} />}
      </section>
    </div>
    <UnscheduledSubjects schedule={session.schedule} />
    <LastUpdated fetchedAt={session.schedule.fetchedAt} />
  </main>;
}
