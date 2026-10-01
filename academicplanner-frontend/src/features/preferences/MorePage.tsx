import { useState } from 'react';
import { useAcademicSession } from '../../app/AcademicLayout';
import { Icon, type IconName } from '../../components/Icon';
import { AcademicYearOverview } from './AcademicYearOverview';
import { LocalDataSettings } from './LocalDataSettings';
import { PreferencesSettings } from './PreferencesSettings';

export function MorePage() {
  const { now } = useAcademicSession();
  const [section, setSection] = useState<MoreSection>('preferences');
  const sections: Array<{ id: MoreSection; label: string; detail: string; icon: IconName }> = [
    { id: 'preferences', label: 'Preferencias', detail: 'Inicio, apariencia y recordatorios', icon: 'spark' },
    { id: 'calendar', label: 'Calendario INTEC', detail: 'Trimestres y próximas fechas', icon: 'calendar' },
    { id: 'privacy', label: 'Privacidad', detail: 'Datos guardados en este dispositivo', icon: 'lock' },
  ];
  return <main id="main-content" className="academic-page more-page">
    <header className="page-heading"><div><p className="page-eyebrow">Tu espacio, a tu manera</p><h1 id="page-title" tabIndex={-1}>Más</h1><p className="page-date">Personaliza la app y consulta el calendario académico oficial.</p></div></header>
    <div className="more-layout">
      <div className="more-section-tabs" role="tablist" aria-label="Secciones de Más">
        {sections.map((item, index) => <button key={item.id} type="button" role="tab" id={`more-tab-${item.id}`} aria-selected={section === item.id} aria-controls={`more-panel-${item.id}`} tabIndex={section === item.id ? 0 : -1} onClick={() => setSection(item.id)} onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + sections.length) % sections.length;
          setSection(sections[nextIndex]!.id);
          (event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[nextIndex])?.focus();
        }}>
          <Icon name={item.icon} /><span><strong>{item.label}</strong><small>{item.detail}</small></span><Icon className="more-section-tabs__chevron" name="chevron-right" />
        </button>)}
      </div>
      <div className="more-section-panel" role="tabpanel" id={`more-panel-${section}`} aria-labelledby={`more-tab-${section}`}>
        {section === 'preferences' && <PreferencesSettings />}
        {section === 'calendar' && <AcademicYearOverview now={now} />}
        {section === 'privacy' && <LocalDataSettings />}
      </div>
    </div>
  </main>;
}

type MoreSection = 'preferences' | 'calendar' | 'privacy';
