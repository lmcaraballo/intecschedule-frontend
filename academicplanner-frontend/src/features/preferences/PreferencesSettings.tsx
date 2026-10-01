import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { scheduleStorage } from '../../storage/scheduleStorage';
import { defaultPreferences, type Preferences } from './preferences';

export function PreferencesSettings() {
  const [preferences, setPreferences] = useState<Preferences>(() => scheduleStorage.get()?.preferences ?? defaultPreferences);
  const [warning, setWarning] = useState(false);
  const [saved, setSaved] = useState(false);

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
      <fieldset className="preference-card"><legend><Icon name="clock" />Inicio y horario</legend>
        <label className="preference-select"><span><strong>Pantalla al iniciar</strong><small>Se abre después de consultar o recuperar tu horario.</small></span><select aria-label="Pantalla al iniciar" value={preferences.startPage} onChange={(event) => update({ startPage: event.target.value as Preferences['startPage'] })}><option value="now">Ahora</option><option value="schedule">Horario</option><option value="events">Eventos</option></select></label>
        <label className="preference-select"><span><strong>Vista del horario</strong><small>La vista que encontrarás al entrar.</small></span><select aria-label="Vista predeterminada del horario" value={preferences.defaultScheduleView} onChange={(event) => update({ defaultScheduleView: event.target.value as Preferences['defaultScheduleView'] })}><option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option></select></label>
        <label className="preference-select"><span><strong>Densidad</strong><small>Compacta muestra más información en menos espacio.</small></span><select aria-label="Densidad del horario" value={preferences.scheduleDensity} onChange={(event) => update({ scheduleDensity: event.target.value as Preferences['scheduleDensity'] })}><option value="comfortable">Cómoda</option><option value="compact">Compacta</option></select></label>
      </fieldset>

      <fieldset className="preference-card"><legend><Icon name="spark" />Apariencia y accesibilidad</legend>
        <div className="preference-options" aria-label="Tema visual">{(['auto', 'day', 'night'] as const).map((theme) => <Button type="button" key={theme} variant="plain" aria-pressed={preferences.theme === theme} onClick={() => update({ theme })}><Icon name={theme === 'auto' ? 'spark' : theme === 'day' ? 'sun' : 'moon'} />{theme === 'auto' ? 'Auto' : theme === 'day' ? 'Claro' : 'Oscuro'}</Button>)}</div>
        <label className="preference-select"><span><strong>Tamaño del texto</strong><small>Aumenta el texto sin depender del zoom.</small></span><select aria-label="Tamaño del texto" value={preferences.textSize} onChange={(event) => update({ textSize: event.target.value as Preferences['textSize'] })}><option value="normal">Normal</option><option value="large">Grande</option></select></label>
        <Toggle checked={preferences.highContrast} onChange={(checked) => update({ highContrast: checked })} title="Contraste reforzado" detail="Oscurece bordes y texto secundario." />
        <Toggle checked={preferences.reducedMotion} onChange={(checked) => update({ reducedMotion: checked })} title="Reducir movimiento" detail="Evita transiciones que no sean esenciales." />
      </fieldset>

      <fieldset className="preference-card"><legend><Icon name="eye" />Información visible</legend>
        <Toggle checked={preferences.showCampusPreview} onChange={(checked) => update({ showCampusPreview: checked })} title="Vista previa del campus" detail="Muestra el mapa del próximo edificio en Ahora." />
        <Toggle checked={preferences.showUnscheduledSubjects} onChange={(checked) => update({ showUnscheduledSubjects: checked })} title="Materias sin horario" detail="Incluye materias asíncronas o pendientes de hora." />
      </fieldset>

      <fieldset className="preference-card"><legend><Icon name="calendar" />Calendario y recordatorios</legend>
        <Toggle checked={preferences.showInstitutionalDates} onChange={(checked) => update({ showInstitutionalDates: checked })} title="Fechas institucionales" detail="Muestra feriados, inscripciones y cierres." />
        <Toggle checked={preferences.institutionalReminders} onChange={(checked) => update({ institutionalReminders: checked })} title="Recordatorios institucionales" detail="Añade avisos a Google Calendar cuando lo conectes." />
        <label className="preference-select"><span><strong>Anticipación</strong><small>Para recordatorios de clases y actividades.</small></span><select aria-label="Anticipación de recordatorios" value={preferences.reminderMinutes} onChange={(event) => update({ reminderMinutes: Number(event.target.value) as Preferences['reminderMinutes'] })}>{[5, 10, 15, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} min antes</option>)}</select></label>
        <section className="calendar-connection"><div><strong>Google Calendar</strong><p>Conecta una sesión temporal sin guardar tu contraseña ni el token de Google.</p></div><Link className="button button--secondary" to="/eventos">Administrar</Link></section>
      </fieldset>
    </div>
    {warning && <p role="alert" className="preference-warning">No pudimos guardar tus preferencias en este dispositivo.</p>}
  </section>;
}

function Toggle({ checked, onChange, title, detail }: { checked: boolean; onChange: (checked: boolean) => void; title: string; detail: string }) {
  return <label className="preference-toggle"><span><strong>{title}</strong><small>{detail}</small></span><input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}
