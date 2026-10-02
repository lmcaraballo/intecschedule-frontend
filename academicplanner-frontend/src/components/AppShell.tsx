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
import { BrandSplash } from './BrandSplash';

export function AppShell() {
  const { theme, phase, preference, setPreference, storageWarning } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [splashDestination, setSplashDestination] = useState<{ destination: string; message: string } | null>(null);
  const online = useNetworkStatus();
  const { data, usingLastValid } = useLocalData();
  const institutionalCalendar = useInstitutionalCalendar();
  const session = data?.session;
  const academic = ['/ahora', '/horario', '/eventos', '/mas'].includes(pathname);
  const startPath = getStartPath(data?.preferences ?? defaultPreferences);
  const compactThemeControl = useCompactThemeControl();
  const sliderShift = themeSliderShift(preference, phase, compactThemeControl);

  useEffect(() => {
    if (!splashDestination) return;
    const reducedMotion = document.documentElement.dataset.reduceMotion === 'true'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const finish = () => {
      setSplashDestination(null);
      if (pathname !== splashDestination.destination) navigate(splashDestination.destination);
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
          if (!academic || pathname === homePath || splashDestination) return;
          event.preventDefault();
          setSplashDestination({ destination: homePath, message: splashMessageFor(homePath) });
        }}><Brand /></Link>
        {academic && <PrimaryNavigation />}
        <div className="theme-controls" role="group" aria-label="Apariencia" data-mode={preference} data-phase={phase}>
          <Button variant="plain" className="theme-auto" aria-pressed={preference === 'auto'} onClick={() => setPreference('auto')}>Auto</Button>
          <span className="theme-scene">
            <span className="theme-rail" aria-hidden="true"><i /><i /><i /><i /></span>
            <button type="button" className="control-button theme-toggle" style={{ transform: `translateX(${sliderShift}px)` }} aria-label={themeToggleLabel(preference, theme, phase)} onClick={() => setPreference(theme === 'day' ? 'night' : 'day')}><Icon name={phaseIcon(preference, theme, phase)} /></button>
          </span>
        </div>
      </header>
      {splashDestination && <BrandSplash message={splashDestination.message} />}
      {!splashDestination && institutionalCalendar.status === 'loading' && <BrandSplash loading message="Actualizando el calendario institucional" />}
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

function phaseIcon(preference: 'auto' | 'day' | 'night', theme: 'day' | 'night', phase: 'morning' | 'day' | 'sunset' | 'night') {
  if (preference !== 'auto') return theme === 'day' ? 'sun' : 'moon';
  return phase === 'morning' ? 'sunrise' : phase === 'sunset' ? 'sunset' : phase === 'night' ? 'moon' : 'sun';
}

function useCompactThemeControl() {
  const [compact, setCompact] = useState(() => themeControlQuery()?.matches ?? false);
  useEffect(() => {
    const query = themeControlQuery();
    if (!query) return;
    const update = () => setCompact(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return compact;
}

function themeControlQuery() {
  return typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 479px)') : null;
}

function themeSliderShift(preference: 'auto' | 'day' | 'night', phase: 'morning' | 'day' | 'sunset' | 'night', compact: boolean) {
  // A manual choice must take precedence over the current automatic phase.
  // Without this order, choosing night in the morning leaves the thumb at day.
  if (preference === 'day') return 0;
  if (preference === 'night') return compact ? 56 : 64;
  if (phase === 'morning') return 0;
  if (phase === 'night') return compact ? 56 : 64;
  if (phase === 'sunset') return compact ? 38 : 43;
  return compact ? 19 : 22;
}

function themeToggleLabel(preference: 'auto' | 'day' | 'night', theme: 'day' | 'night', phase: 'morning' | 'day' | 'sunset' | 'night') {
  const phaseLabel = { morning: 'mañana', day: 'día', sunset: 'atardecer', night: 'noche' }[phase];
  const action = theme === 'day' ? 'Cambiar manualmente a oscuro' : 'Cambiar manualmente a claro';
  return preference === 'auto' ? `Tema automático: ${phaseLabel}. ${action}` : action;
}

function splashMessageFor(destination: string) {
  return destination === '/horario' ? 'Abriendo tu horario' : destination === '/eventos' ? 'Abriendo tus eventos' : 'Volviendo a tu vista de inicio';
}
