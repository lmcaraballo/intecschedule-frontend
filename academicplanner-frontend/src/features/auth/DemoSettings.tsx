import type { MockScenario } from '../../services/academicApi';

export function DemoSettings({ scenario, onChange, disabled }: { scenario: MockScenario; onChange: (scenario: MockScenario) => void; disabled: boolean }) {
  return <details className="demo-settings">
    <summary><span className="demo-dot" /> Estás en una versión de demostración <span className="summary-plus" aria-hidden="true">+</span></summary>
    <div className="demo-settings__content">
      <p>Usa una matrícula y contraseña ficticias. La consulta al portal está simulada.</p>
      <label htmlFor="mock-scenario">Resultado de la consulta</label>
      <select id="mock-scenario" disabled={disabled} value={scenario} onChange={(event) => onChange(event.target.value as MockScenario)}>
        <option value="success">Consulta exitosa</option>
        <option value="invalid-credentials">Credenciales incorrectas</option>
        <option value="portal-unavailable">Portal no disponible</option>
        <option value="schedule-not-found">Horario no encontrado</option>
        <option value="empty-schedule">Horario válido sin clases</option>
        <option value="invalid-response">Respuesta incompleta</option>
      </select>
    </div>
  </details>;
}
