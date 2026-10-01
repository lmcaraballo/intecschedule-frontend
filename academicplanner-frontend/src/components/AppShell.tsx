import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
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
  const navigate = useNavigate();
  const [splashDestination, setSplashDestination] = useState<string | null>(null);
  const online = useNetworkStatus();
  const { data, usingLastValid } = useLocalData();
  const institutionalCalendar = useInstitutionalCalendar();
  const session = data?.session;
  const academic = ['/ahora', '/horario', '/eventos', '/mas'].includes(pathname);
  const startPath = getStartPath(data?.preferences ?? defaultPreferences);

  useEffect(() => {
    if (!splashDestination) return;
    const reducedMotion = document.documentElement.dataset.reduceMotion === 'true'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const finish = () => {
      setSplashDestination(null);
      if (pathname !== splashDestination) navigate(splashDestination);
    };
    const timer = window.setTimeout(finish, reducedMotion ? 180 : 1180);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        window.clearTimeout(timer);
        finish();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [navigate, pathname, splashDestination]);

  const homePath = academic ? startPath : '/';
  return (
    <div className={`app-shell${academic ? ' app-shell--academic' : ''}`}>
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <BreezeBackground />
      <header className="site-header">
        <Link to={homePath} className="brand-link" aria-label={`Abrir inicio de ${appConfig.name}`} onClick={(event) => {
          event.preventDefault();
          if (!splashDestination) setSplashDestination(homePath);
        }}><Brand /></Link>
        {academic && <PrimaryNavigation />}
        <div className="theme-controls" role="group" aria-label="Apariencia">
          <Button variant="plain" className="theme-auto" aria-pressed={preference === 'auto'} onClick={() => setPreference('auto')}>Auto</Button>
          <Button variant="plain" className="theme-toggle" aria-label={theme === 'day' ? 'Activar tema nocturno' : 'Activar tema de día'} onClick={() => setPreference(theme === 'day' ? 'night' : 'day')}><Icon name={theme === 'day' ? 'moon' : 'sun'} /></Button>
        </div>
      </header>
      {splashDestination && <BrandSplash />}
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

function BrandSplash() {
  return <div className="brand-splash" role="status" aria-live="polite" aria-label="Abriendo AcademicPlanner">
    <div className="brand-splash__glow" aria-hidden="true" />
    <span className="brand-splash__orbit brand-splash__orbit--one" aria-hidden="true" />
    <span className="brand-splash__orbit brand-splash__orbit--two" aria-hidden="true" />
    <div className="brand-splash__content">
      <span className="brand-splash__mark" aria-hidden="true"><Icon name="pine" /></span>
      <strong>{appConfig.name}</strong>
      <span>Organizando tu espacio académico</span>
      <span className="brand-splash__progress" aria-hidden="true"><i /></span>
    </div>
    <Icon className="brand-splash__leaf brand-splash__leaf--one" name="leaf" aria-hidden="true" />
    <Icon className="brand-splash__leaf brand-splash__leaf--two" name="leaf" aria-hidden="true" />
    <Icon className="brand-splash__leaf brand-splash__leaf--three" name="leaf" aria-hidden="true" />
  </div>;
}
