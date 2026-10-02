import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../../components/Icon';
import { StatusBanner } from '../../components/StatusBanner';
import { LastValidSchedule } from '../../components/LastValidSchedule';
import { useLocalData } from '../../app/LocalDataProvider';
import { isAcademicMock, type MockScenario } from '../../services/academicApi';
import { useAcademicAccess } from './useAcademicAccess';
import { AccessForm } from './AccessForm';
import { DemoSettings } from './DemoSettings';
import './access.css';
import { defaultPreferences, getStartPath } from '../preferences/preferences';
import { BrandSplash } from '../../components/BrandSplash';
import { takeNextSplash } from '../../utils/transientSplash';

export function AccessPage() {
  const [scenario, setScenario] = useState<MockScenario>('success');
  const access = useAcademicAccess();
  const { data, status, setUsingLastValid } = useLocalData();
  const savedSession = data?.session;
  const navigate = useNavigate();
  const [arrivalSplash, setArrivalSplash] = useState<string | null>(takeNextSplash);

  useEffect(() => {
    if (!arrivalSplash) return;
    const timer = window.setTimeout(() => setArrivalSplash(null), 1180);
    return () => window.clearTimeout(timer);
  }, [arrivalSplash]);

  function continueWithSaved() {
    setUsingLastValid(true);
    navigate(getStartPath(data?.preferences ?? defaultPreferences));
  }

  return (
    <main id="main-content" className="access-layout">
      {arrivalSplash && <BrandSplash message={arrivalSplash} />}
      <section className="welcome" aria-labelledby="welcome-title">
        <span className="eyebrow"><span className="small-dot" /> TU VIDA ACADÉMICA, EN ORDEN</span>
        <h1 id="welcome-title">Un poco de orden.<br /><em>Más espacio<br className="desktop-break" /> para ti.</em></h1>
        <p className="welcome__description">Tus clases, tu tiempo, tu ritmo.<br />Empieza por tener tu horario en un solo lugar.</p>
        <ul className="welcome__benefits" aria-label="Ventajas de AcademicPlanner">
          <li><Icon name="calendar" /><span><strong>Tu semana, clara</strong><small>Clases y fechas INTEC en contexto.</small></span></li>
          <li><Icon name="lock" /><span><strong>Privado por diseño</strong><small>Tu contraseña nunca se guarda.</small></span></li>
        </ul>
        <div className="quiet-art" aria-hidden="true">
          <div className="orbit orbit--one" /><div className="orbit orbit--two" />
          <div className="paper paper--back" />
          <div className="paper paper--front">
            <div className="paper__top"><span className="paper__line" /><span className="paper__dot" /></div>
            <div className="paper__grid">{Array.from({ length: 15 }, (_, i) => <span key={i} className={`paper__cell paper__cell--${i}`} />)}</div>
            <div className="paper__bottom"><span /><span /></div>
          </div>
          <span className="art-check"><Icon name="check" width="25" height="25" /></span>
          <span className="art-spark">✧</span>
        </div>
        <div className="welcome__footnote"><span className="leaf-circle"><Icon name="leaf" /></span><span>Menos ruido. Más claridad.</span></div>
      </section>

      <section className="access-panel" aria-labelledby="access-title">
        {savedSession && <LastValidSchedule session={savedSession} recovery={Boolean(access.error)} onContinue={continueWithSaved} />}
        <div className="access-card">
          <div className="card-heading"><span className="book-mark"><Icon name="book" width="25" height="25" /></span><span className="step-label">TU PUNTO DE PARTIDA</span></div>
          <h2 id="access-title">Todo empieza aquí.</h2>
          <p className="card-description">Accede con tus datos institucionales<br className="wide-break" /> y deja que tu semana tome forma.</p>
          {isAcademicMock && <StatusBanner tone="warning"><strong>Modo de demostración</strong><p>Estas clases son simuladas y no corresponden a tu cuenta. No introduzcas credenciales institucionales reales aquí.</p></StatusBanner>}
          <AccessForm access={access} scenario={scenario} hasSavedSchedule={Boolean(savedSession)} />
          <div className="credential-note"><Icon name="lock" /><p>Tus credenciales se usan solo para consultar tu horario. <strong>No guardamos tu contraseña.</strong></p></div>
          <div className="card-divider" />
          <p className="local-note"><Icon name="check" width="16" height="16" /> Al continuar, tu horario se guarda en este dispositivo.</p>
        </div>
        {status === 'corrupt' && <StatusBanner tone="warning">No pudimos leer el horario guardado. Vuelve a consultarlo para continuar.</StatusBanner>}
        {status === 'unavailable' && <StatusBanner tone="warning">No podemos acceder a los datos de este dispositivo. Revisa los permisos de almacenamiento y vuelve a intentar.</StatusBanner>}
        {isAcademicMock && <DemoSettings scenario={scenario} onChange={setScenario} disabled={access.stage !== null} />}
      </section>
    </main>
  );
}
