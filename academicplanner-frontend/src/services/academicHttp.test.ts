import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAcademicSession, ACADEMIC_ENDPOINT, ACADEMIC_TIMEOUT_MS } from './academicHttp';
import { backendErrorCodeSchema } from './academicErrors';
import { parseAcademicResponse } from './academicContract';
import { createMockSession } from '../mocks/academicSession';

const credentials = { studentId: '1127998', password: 'fictional-http-secret' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8' },
});

afterEach(() => vi.useRealTimers());

describe('HTTP academic contract', () => {
  it('sends only the request contract without cookies/cache, validates offset dates and removes extras', async () => {
    const session = createMockSession(credentials.studentId);
    session.schedule.fetchedAt = '2026-09-18T07:30:00-04:00';
    const fetcher = vi.fn().mockResolvedValue(json({ ...session, source: { status: 'ok' }, password: 'must-be-removed' }));
    vi.stubGlobal('fetch', fetcher);
    const progress = vi.fn();
    const result = await fetchAcademicSession(credentials, { onProgress: progress });
    expect(result).toEqual(session);
    expect(fetcher).toHaveBeenCalledWith(ACADEMIC_ENDPOINT, expect.objectContaining({
      method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(credentials), signal: expect.any(AbortSignal),
    }));
    expect(progress.mock.calls.flat()).toEqual(['verifying', 'fetching', 'organizing']);
  });

  it.each(backendErrorCodeSchema.options)('maps %s without exposing backend messages or secrets', async (code) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: { code, message: credentials.password, stack: 'internal-details' } }, 502)));
    const error: unknown = await fetchAcademicSession(credentials).catch((cause: unknown) => cause);
    expect(error).toMatchObject({ name: 'AcademicApiError', code });
    expect((error as Error).message).not.toContain(code);
    expect((error as Error).message).not.toMatch(/fictional-http-secret|internal-details/);
  });

  it.each([
    { label: 'unknown code', response: () => json({ error: { code: 'NEW_ERROR', message: 'private' } }, 500), code: 'UNKNOWN_ERROR' },
    { label: 'HTML from failed upstream', response: () => new Response('<html>private</html>', { status: 502 }), code: 'PORTAL_UNAVAILABLE' },
    { label: 'HTML success', response: () => new Response('<html>private</html>'), code: 'INVALID_RESPONSE' },
    { label: 'malformed JSON', response: () => new Response('{', { headers: { 'Content-Type': 'application/json' } }), code: 'INVALID_RESPONSE' },
    { label: 'incomplete success', response: () => json({ schedule: {} }), code: 'INVALID_RESPONSE' },
    { label: 'wrong student', response: () => json(createMockSession('other')), code: 'INVALID_RESPONSE' },
    { label: 'non-success source', response: () => json({ ...createMockSession(credentials.studentId), source: { status: 'error' } }), code: 'INVALID_RESPONSE' },
  ])('rejects $label', async ({ response, code }) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));
    await expect(fetchAcademicSession(credentials)).rejects.toMatchObject({ code });
  });

  it('does not start a request offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchAcademicSession(credentials)).rejects.toMatchObject({ code: 'OFFLINE' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('maps transport failures safely', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private network detail')));
    await expect(fetchAcademicSession(credentials)).rejects.toMatchObject({ code: 'PORTAL_UNAVAILABLE' });
  });

  it('accepts a confirmed empty schedule', async () => {
    const session = createMockSession(credentials.studentId);
    session.schedule.classes = [];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(session)));
    expect(await fetchAcademicSession(credentials)).toEqual(session);
  });

  it('cancels without reporting a portal failure', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')));
    })));
    const request = fetchAcademicSession(credentials, { signal: controller.signal });
    const assertion = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
  });

  it('times out and releases its timer', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')));
    })));
    const assertion = expect(fetchAcademicSession(credentials)).rejects.toMatchObject({ code: 'PORTAL_UNAVAILABLE' });
    await vi.advanceTimersByTimeAsync(ACADEMIC_TIMEOUT_MS);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects duplicate IDs so detail links cannot point to an ambiguous class', () => {
    const session = createMockSession(credentials.studentId);
    session.schedule.classes.push({ ...session.schedule.classes[0]! });
    expect(() => parseAcademicResponse(session, credentials.studentId)).toThrow();
  });

  it('rejects timestamps without an explicit timezone', () => {
    const session = createMockSession(credentials.studentId);
    session.schedule.fetchedAt = '2026-09-18T07:30:00';
    expect(() => parseAcademicResponse(session, credentials.studentId)).toThrow();
  });
});
