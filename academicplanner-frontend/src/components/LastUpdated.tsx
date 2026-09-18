import { Link } from 'react-router';
import { formatDate } from '../utils/dateFormat';
import { Icon } from './Icon';
import { useNetworkStatus } from '../utils/useNetworkStatus';

export function LastUpdated({ fetchedAt }: { fetchedAt: string }) {
  const online = useNetworkStatus();
  return <div className="last-updated"><Icon name="check" width="15" height="15" /><p>Última actualización: <time dateTime={fetchedAt}>{formatDate(new Date(fetchedAt), { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</time><span>Horario guardado en este dispositivo · {online ? <Link to="/">Consultar de nuevo</Link> : 'Conéctate a Internet para actualizarlo.'}</span></p></div>;
}
