import { academicApi, type FetchOptions } from './academicApi';
import type { Credentials } from '../features/auth/authSchema';
import { parseAcademicResponse } from './academicContract';
import { scheduleStorage, StaleScheduleError } from '../storage/scheduleStorage';

let latestConsultation = 0;

/** A failed or incomplete response never reaches storage. No UI dependencies. */
export async function consultSchedule(credentials: Credentials, options: FetchOptions = {}) {
  const revision = ++latestConsultation;
  const response = await academicApi.fetchSession(credentials, options);
  if (options.signal?.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
  if (revision !== latestConsultation) throw new StaleScheduleError();
  const session = parseAcademicResponse(response, credentials.studentId);
  scheduleStorage.save(session);
  return session;
}
