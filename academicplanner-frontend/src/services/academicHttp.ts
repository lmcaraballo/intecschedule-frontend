import { credentialsSchema, type Credentials } from '../features/auth/authSchema';
import { AcademicApiError, backendErrorSchema } from './academicErrors';
import { ensureOnline, parseAcademicResponse, type FetchOptions } from './academicContract';

export const ACADEMIC_ENDPOINT = '/api/academic/schedule';
export const ACADEMIC_TIMEOUT_MS = 20_000;

/** Prepared HTTP transport; mock remains the default until a backend is available. */
export async function fetchAcademicSession(credentials: Credentials, options: FetchOptions = {}) {
  ensureOnline();
  const request = credentialsSchema.safeParse(credentials);
  if (!request.success) throw new AcademicApiError('INVALID_CREDENTIALS');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, ACADEMIC_TIMEOUT_MS);
  try {
    if (options.signal?.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
    options.onProgress?.('verifying');
    const pending = fetch(ACADEMIC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
      body: JSON.stringify(request.data),
    });
    options.onProgress?.('fetching');
    const response = await pending;
    if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      throw new AcademicApiError(response.ok ? 'INVALID_RESPONSE' : 'PORTAL_UNAVAILABLE');
    }
    let body: unknown;
    try { body = await response.json(); }
    catch { throw new AcademicApiError('INVALID_RESPONSE'); }
    if (!response.ok) {
      const error = backendErrorSchema.safeParse(body);
      throw new AcademicApiError(error.success ? error.data.error.code : 'UNKNOWN_ERROR');
    }
    if (response.status !== 200) throw new AcademicApiError('INVALID_RESPONSE');
    options.onProgress?.('organizing');
    return parseAcademicResponse(body, request.data.studentId);
  } catch (error) {
    if (options.signal?.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
    ensureOnline();
    if (controller.signal.aborted) throw new AcademicApiError('PORTAL_UNAVAILABLE');
    if (error instanceof AcademicApiError) throw error;
    throw new AcademicApiError('PORTAL_UNAVAILABLE');
  } finally {
    request.data.password = '';
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', cancel);
  }
}
