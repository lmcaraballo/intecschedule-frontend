import { useAcademicSession } from '../../app/AcademicLayout';
import { AcademicYearOverview } from './AcademicYearOverview';
import { LocalDataSettings } from './LocalDataSettings';
import { PreferencesSettings } from './PreferencesSettings';

export function MorePage() {
  const { now } = useAcademicSession();
  return <main id="main-content" className="academic-page more-page">
    <header className="page-heading"><div><p className="page-eyebrow">Tu espacio, a tu manera</p><h1 id="page-title" tabIndex={-1}>Más</h1><p className="page-date">Personaliza la app y consulta el calendario académico oficial.</p></div></header>
    <div className="more-layout">
      <AcademicYearOverview now={now} />
      <PreferencesSettings />
      <LocalDataSettings />
    </div>
  </main>;
}
