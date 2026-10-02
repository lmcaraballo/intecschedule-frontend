import type { AccessStage } from '../services/academicApi';

export const accessMessages: Record<AccessStage, string> = {
  verifying: 'Verificando acceso…',
  fetching: 'Consultando tu horario actualizado…',
  organizing: 'Organizando tus clases…',
};

export function LoadingState({ message }: { message: string }) {
  return <div className="loading-state" role="status" aria-live="polite"><span className="spinner" aria-hidden="true" /><span>{message}</span></div>;
}
