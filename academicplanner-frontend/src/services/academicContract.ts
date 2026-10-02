import { z } from 'zod';
import { academicSessionSchema } from '../types/academic';
import { AcademicApiError } from './academicErrors';

export type MockScenario = 'success' | 'invalid-credentials' | 'portal-unavailable' | 'schedule-not-found' | 'empty-schedule' | 'invalid-response';
export type AccessStage = 'verifying' | 'fetching' | 'organizing';
export interface FetchOptions {
  scenario?: MockScenario;
  signal?: AbortSignal;
  onProgress?: (stage: AccessStage) => void;
}

// source is optional metadata; it must never turn an error into a saved success.
export const academicResponseSchema = academicSessionSchema.extend({
  source: z.object({ status: z.literal('ok') }).optional(),
});

export function parseAcademicResponse(value: unknown, studentId: string) {
  const result = academicResponseSchema.safeParse(value);
  if (!result.success || result.data.student.id !== studentId.trim()) {
    throw new AcademicApiError('INVALID_RESPONSE');
  }
  // Persist only AcademicSession, never transport metadata.
  return academicSessionSchema.parse(result.data);
}

export function ensureOnline() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new AcademicApiError('OFFLINE');
}
