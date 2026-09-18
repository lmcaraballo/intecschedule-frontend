import { Icon } from './Icon';

export function OfflineState({ hasSchedule }: { hasSchedule: boolean }) {
  return <div className="offline-state" role="status">
    <Icon name="offline" width="18" height="18" />
    <div><strong>Sin conexión</strong><p>{hasSchedule
      ? 'Puedes consultar tus clases guardadas. Conéctate para actualizar el horario.'
      : 'Conéctate a Internet para consultar y guardar tu primer horario.'}</p></div>
  </div>;
}
