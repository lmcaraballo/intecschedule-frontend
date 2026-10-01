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
import { CampusPreview } from '../campus/CampusPreview';
import { getInstitutionalNotice, getInstitutionalPeriod } from '../institutional/institutionalCalendar';
import { dateKey } from '../../utils/dateFormat';
import { Button } from '../../components/Button';
import { useInstitutionalCalendar } from '../institutional/InstitutionalCalendarProvider';

const greetings = { morning: 'Buenos días', day: 'A tu ritmo', sunset: 'Buenas tardes', night: 'Buenas noches' };

export function NowPage() {
  const { session, now, preferences, classOverrides, undoClassOverride } = useAcademicSession();
  const status = getDayStatus(session.schedule, now, classOverrides);
  const online = useNetworkStatus();
  const institutionalNotice = getInstitutionalNotice(now);
  const period = getInstitutionalPeriod(now);
  const institutionalCalendar = useInstitutionalCalendar();
  const finishedEarlyClass = status.today.find((item) => classOverrides[`${dateKey(now)}:${item.id}`]);
  // This value is derived from the current clock and schedule. It is never persisted.
  const campusClass = status.current ?? status.next?.academicClass;
  return <main id="main-content" className="academic-page now-page">
    <header className="page-heading"><div><p className="page-eyebrow">{greetings[getContextualTheme(now)]} · tu espacio académico</p><h1 id="page-title" tabIndex={-1}>Ahora</h1><p className="page-date">{formatDate(now)} <span aria-hidden="true">· </span><time dateTime={now.toISOString()}>{formatDate(now, { hour: 'numeric', minute: '2-digit', hour12: true })}</time></p></div><Link className="quick-link" to="/horario">Ver horario <Icon name="arrow" width="17" height="17" /></Link></header>
    <DayStatus status={status} hasUnscheduled={Boolean(session.schedule.unscheduledSubjects?.length)} />
    {finishedEarlyClass && <section className="early-finish-notice" role="status"><div><strong>{finishedEarlyClass.subjectName}</strong><p>Marcaste esta clase como terminada antes. El horario institucional no cambió.</p></div><Button variant="plain" onClick={() => undoClassOverride(finishedEarlyClass)}>Deshacer</Button></section>}
    {preferences.showInstitutionalDates && institutionalNotice && <section className="institutional-note" aria-label="Calendario institucional"><Icon name="calendar" /><div><p className="section-label">{institutionalNotice.isUpcoming ? 'Próxima fecha INTEC' : 'Hoy en el calendario INTEC'}</p><h2>{institutionalNotice.title}</h2><p>{institutionalNotice.detail}</p></div></section>}
    <div className="now-columns">
      <div className="now-focus">
        {status.current && <CurrentClassCard academicClass={status.current} now={now} />}
        {status.next && <NextClassCard occurrence={status.next} now={now} />}
        {preferences.showCampusPreview && campusClass && <CampusPreview academicClass={campusClass} timing={status.current ? 'current' : 'next'} />}
        {!status.current && !status.next && <EmptyState icon="calendar" title={session.schedule.unscheduledSubjects?.length ? "Tus materias no tienen encuentros con hora informada" : "Tu horario todavía no tiene clases"} description={session.schedule.unscheduledSubjects?.length ? "Puedes ver las materias registradas al final de esta página." : online ? "La consulta fue correcta, pero no hay clases registradas. Puedes volver a consultar más adelante." : "No hay clases en el horario guardado. Conéctate a Internet para consultar uno actualizado."} action={online && <Link to="/" className="quick-link">Consultar horario <Icon name="arrow" /></Link>} />}
        {session.student.isPino && session.schedule.classes.length > 0 && <div className="pino-help"><Icon name="pine" /><p><strong>Conoce tu próximo destino.</strong> Abre una clase para consultar el aula y los datos de tu profesor.</p></div>}
      </div>
      <section className="today-agenda" aria-labelledby="today-agenda-title"><div className="section-heading"><h2 id="today-agenda-title">Tu día, de un vistazo</h2><span>{status.today.length} {status.today.length === 1 ? 'clase' : 'clases'}</span></div>
        {status.today.length ? <ol className="class-list">{status.today.map((item) => {
          const finishedEarly = Boolean(classOverrides[`${dateKey(now)}:${item.id}`]);
          const eyebrow = finishedEarly ? 'Terminaste antes' : atTime(now, item.endTime) <= now ? 'Finalizada' : atTime(now, item.startTime) <= now ? 'En curso' : 'Pendiente';
          return <li key={item.id}><ClassCard academicClass={item} compact eyebrow={eyebrow} /></li>;
        })}</ol> : <EmptyState compact title="Hoy no hay clases en tu horario" description="Puedes explorar los demás días de tu semana." action={<Link to="/horario" className="quick-link">Explorar la semana <Icon name="arrow" width="16" height="16" /></Link>} />}
      </section>
    </div>
    {preferences.showUnscheduledSubjects && <UnscheduledSubjects schedule={session.schedule} />}
    <LastUpdated fetchedAt={session.schedule.fetchedAt} />
    {period && <p className="schedule-note"><Icon name="calendar" width="16" height="16" /><span>{period.title} · horario válido hasta el {period.endsOn.split('-').reverse().join('/')} · <a href={period.sourceUrl} target="_blank" rel="noopener noreferrer">fuente INTEC</a> (actualizada el {formatDate(new Date(institutionalCalendar.lastUpdatedAt), { day: 'numeric', month: 'long', year: 'numeric' })}).</span></p>}
  </main>;
}
