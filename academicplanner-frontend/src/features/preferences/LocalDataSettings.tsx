import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Dialog } from '../../components/Dialog';
import { ErrorState } from '../../components/ErrorState';
import { clearAcademicPlannerData } from '../../storage/scheduleStorage';

export function LocalDataSettings() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  function clearData() {
    try {
      clearAcademicPlannerData();
      navigate('/', { replace: true });
    } catch {
      setError('No pudimos borrar los datos. Revisa los permisos de almacenamiento y vuelve a intentar.');
    }
  }

  return <section className="local-data-settings" aria-labelledby="local-data-title">
    <h2 id="local-data-title">Tus datos en este dispositivo</h2>
    <p>Guardamos tu perfil básico, tu último horario válido y la apariencia que elegiste.</p>
    <p>Tu contraseña y la sesión del portal no se guardan.</p>
    <Button variant="secondary" onClick={() => { setError(null); setConfirming(true); }}>Limpiar datos locales</Button>
    {confirming && <Dialog title="Limpiar datos locales" className="confirmation-dialog" onClose={() => setConfirming(false)}>
      <p>Se borrarán el horario, el perfil y las preferencias de AcademicPlanner en este dispositivo.</p>
      <p>Para volver a usar tu horario necesitarás conexión y una nueva consulta. Los datos de otras aplicaciones se conservan.</p>
      {error && <ErrorState message={error} />}
      <div className="dialog-actions"><Button variant="secondary" onClick={() => setConfirming(false)}>Cancelar</Button><Button onClick={clearData}>Borrar mis datos locales</Button></div>
    </Dialog>}
  </section>;
}
