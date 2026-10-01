import { Link, Outlet, useLocation } from 'react-router';
import { Brand } from './Brand';
import { Icon } from './Icon';
import { StatusBanner } from './StatusBanner';
import { useTheme } from '../theme/ThemeProvider';
import { appConfig } from '../app/appConfig';
import { PrimaryNavigation } from './PrimaryNavigation';
import { Button } from './Button';
import { OfflineState } from './OfflineState';
import { LastValidSchedule } from './LastValidSchedule';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import { useLocalData } from '../app/LocalDataProvider';
import { defaultPreferences, getStartPath } from '../features/preferences/preferences';
import { useInstitutionalCalendar } from '../features/institutional/InstitutionalCalendarProvider';
import { formatDate } from '../utils/dateFormat';
import { BreezeBackground } from './BreezeBackground';

export function AppShell() {
  const { theme, preference, setPreference, storageWarning } = useTheme();
  const { pathname } = useLocation();
  const online = useNetworkStatus();
  const { data, usingLastValid } = useLocalData();
  const institutionalCalendar = useInstitutionalCalendar();
  const session = data?.session;
  const academic = ['/ahora', '/horario', '/eventos', '/mas'].includes(pathname);
  const startPath = getStartPath(data?.preferences ?? defaultPreferences);
  return (
    <div className={`app-shell${academic ? ' app-shell--academic' : ''}`}>
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <BreezeBackground />
      <header className="site-header">
        <Link to={academic ? startPath : '/'} className="brand-link" aria-label={`${appConfig.name}, inicio`}><Brand /></Link>
        {academic && <PrimaryNavigation />}
        <div className="theme-controls" role="group" aria-label="Apariencia">
          <Button variant="plain" className="theme-auto" aria-pressed={preference === 'auto'} onClick={() => setPreference('auto')}>Auto</Button>
          <Button variant="plain" className="theme-toggle" aria-label={theme === 'day' ? 'Activar tema nocturno' : 'Activar tema de día'} onClick={() => setPreference(theme === 'day' ? 'night' : 'day')}><Icon name={theme === 'day' ? 'moon' : 'sun'} /></Button>
        </div>
      </header>
      {(!online || storageWarning || institutionalCalendar.status === 'stale' || (academic && session && usingLastValid)) && <div className="shell-warning shell-notices">
        {!online && <OfflineState hasSchedule={Boolean(session)} />}
        {academic && session && (usingLastValid || !online) && <LastValidSchedule session={session} />}
        {storageWarning && <StatusBanner tone="warning">El tema cambió, pero no pudimos guardar tu preferencia en este dispositivo.</StatusBanner>}
        {institutionalCalendar.status === 'stale' && <StatusBanner tone="warning">No pudimos actualizar el calendario institucional. Se muestra la última versión válida, actualizada el {formatDate(new Date(institutionalCalendar.lastUpdatedAt), { day: 'numeric', month: 'long', year: 'numeric' })}.</StatusBanner>}
      </div>}
      <Outlet />
      <footer className="site-footer"><span>Hecho para tu ritmo.</span><span className="footer-note"><span aria-hidden="true" className="small-dot" /> Un espacio para enfocarte</span></footer>
    </div>
  );
}
