import { credentialsSchema, type Credentials } from '../features/auth/authSchema';
import { createMockSession } from './academicSession';
import { delay } from '../utils/delay';
import { AcademicApiError } from '../services/academicErrors';
import { ensureOnline, type FetchOptions } from '../services/academicContract';

async function fetchSession(credentials: Credentials, options: FetchOptions = {}): Promise<unknown> {
  ensureOnline();
  const { studentId } = credentialsSchema.parse(credentials);
  const { scenario = 'success', signal, onProgress } = options;
  onProgress?.('verifying');
  await delay(750, signal);
  ensureOnline();
  if (scenario === 'invalid-credentials') throw new AcademicApiError('INVALID_CREDENTIALS');
  onProgress?.('fetching');
  await delay(900, signal);
  ensureOnline();
  if (scenario === 'portal-unavailable') throw new AcademicApiError('PORTAL_UNAVAILABLE');
  if (scenario === 'schedule-not-found') throw new AcademicApiError('SCHEDULE_NOT_FOUND');
  onProgress?.('organizing');
  await delay(650, signal);
  ensureOnline();
  // Backend boundary intentionally returns unknown: consumers must validate it.
  if (scenario === 'invalid-response') return { student: { id: studentId }, schedule: {} };
  const session = createMockSession(studentId);
  if (scenario === 'empty-schedule') session.schedule.classes = [];
  return session;
}

export const mockAcademicApi = { fetchSession };
