import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { scheduleStorage } from '../../storage/scheduleStorage';
import { defaultPreferences, type Preferences } from './preferences';
import { Link } from 'react-router';

export function PreferencesSettings() {
  const [preferences, setPreferences] = useState<Preferences>(() => scheduleStorage.get()?.preferences ?? defaultPreferences);
  const [warning, setWarning] = useState(false);
  useEffect(() => scheduleStorage.subscribe(() => setPreferences(scheduleStorage.get()?.preferences ?? defaultPreferences)), []);
  function update(change: Partial<Preferences>) {
    const next = { ...preferences, ...change };
    setPreferences(next);
    try { scheduleStorage.savePreferences(next); setWarning(false); } catch { setWarning(true); }
  }
  return <section className="preference-settings" aria-labelledby="preference-title">
    <div><p className="section-label">Tu experiencia</p><h2 id="preference-title">Preferencias</h2><p>Se guardan únicamente en este dispositivo.</p></div>
    <fieldset><legend>Inicio y horario</legend>
      <label className="preference-select"><span><strong>Pantalla al iniciar</strong><small>Se abrirá después de consultar o recuperar tu horario.</small></span><select value={preferences.startPage} onChange={(event) => update({ startPage: event.target.value as Preferences['startPage'] })}><option value="now">Ahora</option><option value="schedule">Horario</option><option value="events">Eventos</option></select></label>
      <label className="preference-select"><span><strong>Vista predeterminada del horario</strong><small>Se usa al entrar a Horario sin una vista elegida.</small></span><select value={preferences.defaultScheduleView} onChange={(event) => update({ defaultScheduleView: event.target.value as Preferences['defaultScheduleView'] })}><option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option></select></label>
      <label className="preference-select"><span><strong>Densidad del horario</strong><small>La vista compacta reduce el espacio entre las clases.</small></span><select value={preferences.scheduleDensity} onChange={(event) => update({ scheduleDensity: event.target.value as Preferences['scheduleDensity'] })}><option value="comfortable">Cómoda</option><option value="compact">Compacta</option></select></label>
    </fieldset>
    <fieldset><legend>Apariencia y accesibilidad</legend><div className="preference-options">{(['auto', 'day', 'night'] as const).map((theme) => <Button type="button" key={theme} variant="plain" aria-pressed={preferences.theme === theme} onClick={() => update({ theme })}>{theme === 'auto' ? 'Auto' : theme === 'day' ? 'Claro' : 'Oscuro'}</Button>)}</div>
      <label className="preference-select"><span><strong>Tamaño del texto</strong><small>Aumenta el texto sin depender del zoom del navegador.</small></span><select value={preferences.textSize} onChange={(event) => update({ textSize: event.target.value as Preferences['textSize'] })}><option value="normal">Normal</option><option value="large">Grande</option></select></label>
      <label className="preference-toggle"><span><strong>Contraste reforzado</strong><small>Oscurece bordes y texto secundario para distinguir mejor los elementos.</small></span><input type="checkbox" checked={preferences.highContrast} onChange={(event) => update({ highContrast: event.target.checked })} /></label>
      <label className="preference-toggle"><span><strong>Reducir movimiento</strong><small>Evita animaciones del mapa y transiciones que no sean esenciales.</small></span><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => update({ reducedMotion: event.target.checked })} /></label>
    </fieldset>
    <fieldset><legend>Información visible</legend>
      <label className="preference-toggle"><span><strong>Vista previa del campus</strong><small>Muestra el mapa del próximo edificio en la pantalla Ahora.</small></span><input type="checkbox" checked={preferences.showCampusPreview} onChange={(event) => update({ showCampusPreview: event.target.checked })} /></label>
      <label className="preference-toggle"><span><strong>Materias sin horario</strong><small>Muestra materias asíncronas o pendientes de hora.</small></span><input type="checkbox" checked={preferences.showUnscheduledSubjects} onChange={(event) => update({ showUnscheduledSubjects: event.target.checked })} /></label>
    </fieldset>
    <fieldset><legend>Calendario y recordatorios</legend><label className="preference-toggle"><span><strong>Fechas institucionales</strong><small>Muestra feriados, inicio y cierre del trimestre.</small></span><input type="checkbox" checked={preferences.showInstitutionalDates} onChange={(event) => update({ showInstitutionalDates: event.target.checked })} /></label><label className="preference-toggle"><span><strong>Recordatorios institucionales</strong><small>Google Calendar enviará estos avisos según los permisos de notificación de tu cuenta y dispositivo.</small></span><input type="checkbox" checked={preferences.institutionalReminders} onChange={(event) => update({ institutionalReminders: event.target.checked })} /></label><label className="preference-select"><span>Recordar con anticipación</span><select value={preferences.reminderMinutes} onChange={(event) => update({ reminderMinutes: Number(event.target.value) as Preferences['reminderMinutes'] })}>{[5, 10, 15, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} min antes</option>)}</select></label></fieldset>
    <section className="calendar-connection"><strong>Google Calendar</strong><p>Crea y sincroniza eventos desde una sesión temporal. Nunca guardaremos tu contraseña ni el token de Google en este dispositivo.</p><Link className="button button--secondary" to="/eventos">Administrar conexión</Link></section>
    {warning && <p role="alert" className="preference-warning">No pudimos guardar tus preferencias en este dispositivo.</p>}
  </section>;
}
