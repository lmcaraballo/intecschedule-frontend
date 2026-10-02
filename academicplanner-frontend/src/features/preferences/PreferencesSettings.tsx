import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { Icon, type IconName } from '../../components/Icon';
import { scheduleStorage } from '../../storage/scheduleStorage';
import { defaultPreferences, type Preferences } from './preferences';
import { useTheme } from '../../theme/ThemeProvider';

export function PreferencesSettings() {
  const { phase } = useTheme();
  const [preferences, setPreferences] = useState<Preferences>(() => scheduleStorage.get()?.preferences ?? defaultPreferences);
  const [warning, setWarning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openSection, setOpenSection] = useState<PreferenceSectionId>('start');

  useEffect(() => scheduleStorage.subscribe(() => setPreferences(scheduleStorage.get()?.preferences ?? defaultPreferences)), []);

  function update(change: Partial<Preferences>) {
    const next = { ...preferences, ...change };
    setPreferences(next);
    try {
      scheduleStorage.savePreferences(next);
      setWarning(false);
      setSaved(true);
    } catch {
      setWarning(true);
      setSaved(false);
    }
  }

  return <section className="preference-settings" aria-labelledby="preference-title">
    <header className="preference-settings__heading">
      <div><p className="section-label">Tu experiencia</p><h2 id="preference-title">Preferencias</h2><p>Los cambios se aplican al instante y permanecen únicamente en este dispositivo.</p></div>
      <p className="preference-save-state" role="status" aria-live="polite"><Icon name={warning ? 'alert' : 'check'} />{warning ? 'Sin guardar' : saved ? 'Cambios guardados' : 'Guardado automático'}</p>
    </header>

    <div className="preference-grid">
      <PreferenceCard id="start" icon="clock" title="Inicio y horario" detail="Pantalla inicial, vista y densidad" open={openSection === 'start'} onOpen={setOpenSection}>
        <label className="preference-select"><span><strong>Pantalla al iniciar</strong><small>Se abre después de consultar o recuperar tu horario.</small></span><select aria-label="Pantalla al iniciar" value={preferences.startPage} onChange={(event) => update({ startPage: event.target.value as Preferences['startPage'] })}><option value="now">Ahora</option><option value="schedule">Horario</option><option value="events">Eventos</option></select></label>
        <label className="preference-select"><span><strong>Vista del horario</strong><small>La vista que encontrarás al entrar.</small></span><select aria-label="Vista predeterminada del horario" value={preferences.defaultScheduleView} onChange={(event) => update({ defaultScheduleView: event.target.value as Preferences['defaultScheduleView'] })}><option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option></select></label>
        <label className="preference-select"><span><strong>Densidad</strong><small>Compacta muestra más información en menos espacio.</small></span><select aria-label="Densidad del horario" value={preferences.scheduleDensity} onChange={(event) => update({ scheduleDensity: event.target.value as Preferences['scheduleDensity'] })}><option value="comfortable">Cómoda</option><option value="compact">Compacta</option></select></label>
      </PreferenceCard>

      <PreferenceCard id="appearance" icon="spark" title="Apariencia y accesibilidad" detail="Tema, texto, contraste y movimiento" open={openSection === 'appearance'} onOpen={setOpenSection}>
        <div className="preference-options" aria-label="Tema visual">{(['auto', 'day', 'night'] as const).map((theme) => <Button type="button" key={theme} variant="plain" aria-pressed={preferences.theme === theme} onClick={() => update({ theme })}><Icon name={theme === 'auto' ? 'spark' : theme === 'day' ? 'sun' : 'moon'} />{theme === 'auto' ? 'Auto' : theme === 'day' ? 'Claro' : 'Oscuro'}</Button>)}</div>
        <section className="theme-day-cycle" aria-label="Ciclo diario del tema automático">
          <div><strong>Auto acompaña la hora</strong><p>La luz cambia suavemente durante el día. Ahora corresponde a <b>{phaseLabel(phase)}</b>.</p></div>
          <ol>
            <ThemePhase icon="sunrise" label="Mañana" time="5–10" active={preferences.theme === 'auto' && phase === 'morning'} />
            <ThemePhase icon="sun" label="Día" time="10–17" active={preferences.theme === 'auto' && phase === 'day'} />
            <ThemePhase icon="sunset" label="Atardecer" time="17–20" active={preferences.theme === 'auto' && phase === 'sunset'} />
            <ThemePhase icon="moon" label="Noche" time="20–5" active={preferences.theme === 'auto' && phase === 'night'} />
          </ol>
        </section>
        <label className="preference-select"><span><strong>Tamaño del texto</strong><small>Aumenta el texto sin depender del zoom.</small></span><select aria-label="Tamaño del texto" value={preferences.textSize} onChange={(event) => update({ textSize: event.target.value as Preferences['textSize'] })}><option value="normal">Normal</option><option value="large">Grande</option></select></label>
        <Toggle checked={preferences.highContrast} onChange={(checked) => update({ highContrast: checked })} title="Contraste reforzado" detail="Oscurece bordes y texto secundario." />
        <Toggle checked={preferences.reducedMotion} onChange={(checked) => update({ reducedMotion: checked })} title="Reducir movimiento" detail="Evita transiciones que no sean esenciales." />
      </PreferenceCard>

      <PreferenceCard id="information" icon="eye" title="Información visible" detail="Campus y materias sin horario" open={openSection === 'information'} onOpen={setOpenSection}>
        <Toggle checked={preferences.showCampusPreview} onChange={(checked) => update({ showCampusPreview: checked })} title="Vista previa del campus" detail="Muestra el mapa del próximo edificio en Ahora." />
        <Toggle checked={preferences.showUnscheduledSubjects} onChange={(checked) => update({ showUnscheduledSubjects: checked })} title="Materias sin horario" detail="Incluye materias asíncronas o pendientes de hora." />
      </PreferenceCard>

      <PreferenceCard id="reminders" icon="calendar" title="Calendario y recordatorios" detail="Fechas, avisos y Google Calendar" open={openSection === 'reminders'} onOpen={setOpenSection}>
        <Toggle checked={preferences.showInstitutionalDates} onChange={(checked) => update({ showInstitutionalDates: checked })} title="Fechas institucionales" detail="Muestra feriados, inscripciones y cierres." />
        <Toggle checked={preferences.institutionalReminders} onChange={(checked) => update({ institutionalReminders: checked })} title="Recordatorios institucionales" detail="Añade avisos a Google Calendar cuando lo conectes." />
        <label className="preference-select"><span><strong>Anticipación</strong><small>Para recordatorios de clases y actividades.</small></span><select aria-label="Anticipación de recordatorios" value={preferences.reminderMinutes} onChange={(event) => update({ reminderMinutes: Number(event.target.value) as Preferences['reminderMinutes'] })}>{[5, 10, 15, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} min antes</option>)}</select></label>
        <section className="calendar-connection"><div><strong>Google Calendar</strong><p>Conecta una sesión temporal sin guardar tu contraseña ni el token de Google.</p></div><Link className="button button--secondary" to="/eventos">Administrar</Link></section>
      </PreferenceCard>
    </div>
    {warning && <p role="alert" className="preference-warning">No pudimos guardar tus preferencias en este dispositivo.</p>}
  </section>;
}

function ThemePhase({ icon, label, time, active }: { icon: IconName; label: string; time: string; active: boolean }) {
  return <li className={active ? 'is-active' : undefined} aria-current={active ? 'true' : undefined}><Icon name={icon} /><span><strong>{label}</strong><small>{time}</small></span></li>;
}

function phaseLabel(phase: 'morning' | 'day' | 'sunset' | 'night') {
  return { morning: 'la mañana', day: 'el día', sunset: 'el atardecer', night: 'la noche' }[phase];
}

type PreferenceSectionId = 'start' | 'appearance' | 'information' | 'reminders';

function PreferenceCard({ id, icon, title, detail, open, onOpen, children }: { id: PreferenceSectionId; icon: IconName; title: string; detail: string; open: boolean; onOpen: (id: PreferenceSectionId) => void; children: ReactNode }) {
  const contentId = `preference-section-${id}`;
  return <section className={`preference-card${open ? ' is-open' : ''}`}>
    <h3><button type="button" className="preference-card__trigger" aria-expanded={open} aria-controls={contentId} onClick={() => onOpen(id)}>
      <Icon name={icon} /><span><strong>{title}</strong><small>{detail}</small></span><Icon className="preference-card__chevron" name="chevron-right" />
    </button></h3>
    {open && <div className="preference-card__body" id={contentId} role="group" aria-label={title}>{children}</div>}
  </section>;
}

function Toggle({ checked, onChange, title, detail }: { checked: boolean; onChange: (checked: boolean) => void; title: string; detail: string }) {
  return <label className="preference-toggle"><span><strong>{title}</strong><small>{detail}</small></span><input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}
