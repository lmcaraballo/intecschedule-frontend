import { z } from 'zod';

export const backendErrorCodeSchema = z.enum([
  'INVALID_CREDENTIALS', 'PORTAL_UNAVAILABLE', 'SCHEDULE_NOT_FOUND',
  'PORTAL_STRUCTURE_CHANGED', 'INVALID_RESPONSE', 'UNKNOWN_ERROR',
]);
export type BackendErrorCode = z.infer<typeof backendErrorCodeSchema>;
export type AcademicApiErrorCode = BackendErrorCode | 'OFFLINE';
export const backendErrorSchema = z.object({ error: z.object({ code: backendErrorCodeSchema }) });

const messages: Record<AcademicApiErrorCode, string> = {
  INVALID_CREDENTIALS: 'Revisa tu identificación o contraseña.',
  PORTAL_UNAVAILABLE: 'El portal no está disponible en este momento. Inténtalo más tarde.',
  SCHEDULE_NOT_FOUND: 'No encontramos un horario académico disponible.',
  PORTAL_STRUCTURE_CHANGED: 'No pudimos interpretar el horario recibido.',
  INVALID_RESPONSE: 'No pudimos consultar tu horario. Vuelve a intentarlo.',
  UNKNOWN_ERROR: 'No pudimos consultar tu horario. Vuelve a intentarlo.',
  OFFLINE: 'Necesitas conexión a Internet para consultar un horario actualizado.',
};

/** Never copy backend messages, response bodies or exception causes into UI errors. */
export class AcademicApiError extends Error {
  constructor(public readonly code: AcademicApiErrorCode) {
    super(messages[code]);
    this.name = 'AcademicApiError';
  }
}
