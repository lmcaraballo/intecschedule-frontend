import { Link } from 'react-router';
import { useState } from 'react';
import { Icon } from '../../components/Icon';
import { dateKey, formatDate } from '../../utils/dateFormat';
import { useInstitutionalCalendar } from '../institutional/InstitutionalCalendarProvider';

function calendarDate(value: string, options: Intl.DateTimeFormatOptions) {
  return formatDate(new Date(`${value}T12:00:00`), options);
}

export function AcademicYearOverview({ now }: { now: Date }) {
  const { periods, status, lastUpdatedAt } = useInstitutionalCalendar();
  const today = dateKey(now);
  const currentPeriod = periods.find((period) => period.startsOn <= today && today <= period.endsOn) ?? periods[0];
  const [selectedPeriodId, setSelectedPeriodId] = useState(() => currentPeriod?.id ?? '');
  const selectedPeriod = periods.find((period) => period.id === selectedPeriodId) ?? currentPeriod;
  const dates = (selectedPeriod?.dates ?? [])
    .filter((entry, index, all) => all.findIndex((item) => item.date === entry.date && item.title === entry.title) === index)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);
  const totalDates = periods.reduce((total, period) => total + period.dates.length, 0);
  const sourceUrl = periods[0]?.sourceUrl;

  return <section className="academic-year-card" aria-labelledby="academic-year-title">
    <div className="academic-year-card__heading">
      <span className="academic-year-card__icon"><Icon name="calendar" /></span>
      <div>
        <p className="section-label">Calendario institucional</p>
        <h2 id="academic-year-title">Año académico 2026–2027</h2>
        <p>{periods.length} trimestres · {totalDates} fechas y actividades</p>
      </div>
      <span className={`calendar-data-status calendar-data-status--${status}`}>{status === 'stale' ? 'Copia guardada' : 'Actualizado'}</span>
    </div>

    <ol className="academic-periods" aria-label="Elige un trimestre para consultar sus fechas">
      {periods.map((period, index) => {
        const active = period.id === selectedPeriod?.id;
        const current = period.startsOn <= today && today <= period.endsOn;
        return <li key={period.id} className={active ? 'is-active' : undefined}>
          <button type="button" aria-pressed={active} onClick={() => setSelectedPeriodId(period.id)}>
            <span>{index + 1}</span>
            <span><strong>{period.title.replace('Trimestre ', '')}</strong><small>{calendarDate(period.startsOn, { day: 'numeric', month: 'short' })} – {calendarDate(period.endsOn, { day: 'numeric', month: 'short', year: 'numeric' })}</small></span>
            {current && <em>Actual</em>}
          </button>
        </li>;
      })}
    </ol>

    <div className="upcoming-academic-dates">
      <div className="academic-period-detail-heading"><div><p className="section-label">Trimestre seleccionado</p><h3>{selectedPeriod?.title.replace('Trimestre ', '')}</h3></div>{selectedPeriod && <Link className="button button--secondary" to={`/eventos?tab=schedule&period=${encodeURIComponent(selectedPeriod.id)}`}>Ver clases sincronizadas</Link>}</div>
      <p className="academic-period-detail-copy">Se muestran solo las fechas y actividades de este trimestre. Las clases de períodos anteriores se pueden consultar en Google Calendar si las habías sincronizado.</p>
      {dates.length ? <ul>{dates.map((entry) => <li key={`${entry.date}-${entry.title}`}>
        <time dateTime={entry.date}><strong>{calendarDate(entry.date, { day: '2-digit' })}</strong><span>{calendarDate(entry.date, { month: 'short' })}</span></time>
        <div><strong>{entry.title}</strong><small>{entry.kind === 'no_class' ? 'Sin docencia' : 'Actividad académica'}</small></div>
      </li>)}</ul> : <p>No hay fechas publicadas para este trimestre.</p>}
    </div>

    <footer>
      <span>Revisado {formatDate(new Date(lastUpdatedAt), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer">Ver fuente oficial <span aria-hidden="true">↗</span></a>}
    </footer>
  </section>;
}
