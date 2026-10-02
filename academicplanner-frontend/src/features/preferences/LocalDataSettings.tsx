import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { ErrorState } from '../../components/ErrorState';
import { Icon } from '../../components/Icon';
import { clearAcademicPlannerData } from '../../storage/scheduleStorage';
import { queueNextSplash } from '../../utils/transientSplash';

export function LocalDataSettings() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function clearData() {
    try {
      queueNextSplash('Tus datos locales se borraron con seguridad');
      clearAcademicPlannerData();
      navigate('/', { replace: true });
    } catch {
      setError('No pudimos borrar los datos. Revisa los permisos de almacenamiento y vuelve a intentar.');
    }
  }

  return <section className="local-data-settings" aria-labelledby="local-data-title">
    <div className="local-data-settings__heading"><span><Icon name="lock" /></span><div><p className="section-label">Privacidad</p><h2 id="local-data-title">Tus datos, bajo tu control</h2></div></div>
    <ul className="local-data-facts">
      <li><Icon name="check" /><span><strong>Solo en este dispositivo</strong>Perfil básico, último horario válido y preferencias.</span></li>
      <li><Icon name="lock" /><span><strong>Nunca almacenamos</strong>Tu contraseña ni la sesión del portal.</span></li>
    </ul>
    <div className="local-data-danger"><div><strong>Empezar de nuevo</strong><p>Borra la información de AcademicPlanner sin afectar otras aplicaciones.</p></div><Button variant="secondary" onClick={() => { setError(null); setConfirming(true); }}>Limpiar datos locales</Button></div>
    {confirming && <Dialog title="Limpiar datos locales" className="confirmation-dialog" onClose={() => setConfirming(false)}>
      <div className="confirmation-dialog__lead"><span className="confirmation-dialog__icon confirmation-dialog__icon--warning"><Icon name="alert" /></span><div><p className="section-label">Esta acción no se puede deshacer</p><p>Eliminarás la información de AcademicPlanner guardada en este dispositivo.</p></div></div>
      <ul className="confirmation-dialog__impact">
        <li><Icon name="calendar" /><span><strong>Se borrará</strong>Tu último horario, perfil básico y preferencias.</span></li>
        <li><Icon name="lock" /><span><strong>Se conserva</strong>Las demás aplicaciones y la información de Google Calendar.</span></li>
      </ul>
      <div className="confirmation-dialog__note"><Icon name="spark" /><p>Para consultar tu horario otra vez necesitarás conexión y una nueva consulta institucional.</p></div>
      {error && <ErrorState message={error} />}
      <div className="dialog-actions"><Button variant="secondary" onClick={() => setConfirming(false)}>Conservar mis datos</Button><Button onClick={clearData}>Borrar datos de este dispositivo</Button></div>
    </Dialog>}
  </section>;
}
