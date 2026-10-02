import { z } from 'zod';
import { credentialsSchema, type Credentials } from '../features/auth/authSchema';
import { AcademicApiError, backendErrorSchema } from './academicErrors';
import { ensureOnline, parseAcademicResponse, type FetchOptions } from './academicContract';
import { scheduleSchema, studentProfileSchema } from '../types/academic';

export const LOGIN_ENDPOINT = '/api/user/login';
export const ACADEMIC_ENDPOINT = '/api/schedule';
export const ACADEMIC_TIMEOUT_MS = 20_000;

// Only the access token is needed for this one-off consultation. Strip refresh tokens.
export const loginResponseSchema = z.object({
  accessToken: z.string().min(1).regex(/^[A-Za-z0-9._~+\/-]+=*$/),
  tokenType: z.string().toLowerCase().pipe(z.literal('bearer')),
  expiresIn: z.number().int().positive(),
});
export const portalScheduleSchema = scheduleSchema.extend({ student: studentProfileSchema });

export function parsePortalSchedule(value: unknown, studentId: string) {
  const result = portalScheduleSchema.safeParse(value);
  if (!result.success) throw new AcademicApiError('INVALID_RESPONSE');
  const { student, ...schedule } = result.data;
  return parseAcademicResponse({ student, schedule }, studentId);
}

async function readResponse(response: Response): Promise<unknown> {
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    throw new AcademicApiError(response.ok ? 'INVALID_RESPONSE' : 'BACKEND_UNAVAILABLE');
  }
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new AcademicApiError('INVALID_RESPONSE'); }
  if (!response.ok) {
    const error = backendErrorSchema.safeParse(body);
    throw new AcademicApiError(error.success ? error.data.error.code : 'UNKNOWN_ERROR');
  }
  if (response.status !== 200) throw new AcademicApiError('INVALID_RESPONSE');
  return body;
}

/** Login and fetch once; no persistent portal session or automatic credential retries. */
export async function fetchAcademicSession(credentials: Credentials, options: FetchOptions = {}) {
  ensureOnline();
  const request = credentialsSchema.safeParse(credentials);
  if (!request.success) throw new AcademicApiError('INVALID_CREDENTIALS');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, ACADEMIC_TIMEOUT_MS);
  let accessToken = '';
  const checkCancelled = () => {
    if (options.signal?.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
    if (controller.signal.aborted) throw new AcademicApiError('PORTAL_UNAVAILABLE');
  };
  const common: RequestInit = {
    method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
  };
  try {
    checkCancelled();
    options.onProgress?.('verifying');
    const loginResponse = await fetch(LOGIN_ENDPOINT, {
      ...common,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request.data),
    });
    request.data.password = '';
    const login = loginResponseSchema.safeParse(await readResponse(loginResponse));
    if (!login.success) throw new AcademicApiError('INVALID_RESPONSE');
    accessToken = login.data.accessToken;
    login.data.accessToken = '';
    checkCancelled();
    options.onProgress?.('fetching');
    const response = await fetch(ACADEMIC_ENDPOINT, {
      ...common,
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
    });
    accessToken = '';
    const body = await readResponse(response);
    checkCancelled();
    options.onProgress?.('organizing');
    return parsePortalSchedule(body, request.data.studentId);
  } catch (error) {
    if (options.signal?.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
    ensureOnline();
    if (controller.signal.aborted) throw new AcademicApiError('PORTAL_UNAVAILABLE');
    if (error instanceof AcademicApiError) throw error;
    throw new AcademicApiError('BACKEND_UNAVAILABLE');
  } finally {
    accessToken = '';
    request.data.password = '';
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', cancel);
  }
}
