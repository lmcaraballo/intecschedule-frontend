import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAcademicSession, LOGIN_ENDPOINT, ACADEMIC_ENDPOINT, ACADEMIC_TIMEOUT_MS, parsePortalSchedule } from './academicHttp';
import { backendErrorCodeSchema } from './academicErrors';
import { parseAcademicResponse } from './academicContract';
import { createMockSession } from '../mocks/academicSession';

const credentials = { studentId: '1127998', password: 'fictional-http-secret' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8' },
});

const tokens = { accessToken: 'fictional-access-token', refreshToken: 'fictional-refresh-token', tokenType: 'bearer', expiresIn: 900 };
const flat = (session = createMockSession(credentials.studentId)) => ({ student: session.student, ...session.schedule });
const succeeds = (body: unknown) => vi.fn().mockResolvedValueOnce(json(tokens)).mockResolvedValueOnce(json(body));

afterEach(() => vi.useRealTimers());

describe('HTTP academic contract', () => {
  it('sends only the request contract without cookies/cache, validates offset dates and removes extras', async () => {
    const session = createMockSession(credentials.studentId);
    session.schedule.fetchedAt = '2026-09-18T11:53:33.872305-04:00';
    const fetcher = succeeds({ ...flat(session), password: 'must-be-removed' });
    vi.stubGlobal('fetch', fetcher);
    const progress = vi.fn();
    const result = await fetchAcademicSession(credentials, { onProgress: progress });
    expect(result).toEqual(session);
    expect(fetcher).toHaveBeenNthCalledWith(1, LOGIN_ENDPOINT, expect.objectContaining({
      method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(credentials), signal: expect.any(AbortSignal),
    }));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenNthCalledWith(2, ACADEMIC_ENDPOINT, expect.objectContaining({
      method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
      headers: { Accept: 'application/json', Authorization: `Bearer ${tokens.accessToken}` },
    }));
    expect(fetcher.mock.calls[1]![1].body).toBeUndefined();
    expect(JSON.stringify(result)).not.toMatch(/token|password|secret/i);
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
    { label: 'HTML from failed upstream', response: () => new Response('<html>private</html>', { status: 502 }), code: 'BACKEND_UNAVAILABLE' },
    { label: 'HTML success', response: () => new Response('<html>private</html>'), code: 'INVALID_RESPONSE' },
    { label: 'malformed JSON', response: () => new Response('{', { headers: { 'Content-Type': 'application/json' } }), code: 'INVALID_RESPONSE' },
    { label: 'incomplete success', response: () => json({ schedule: {} }), code: 'INVALID_RESPONSE' },
    { label: 'wrong student', response: () => json(flat(createMockSession('other'))), code: 'INVALID_RESPONSE' },
    { label: 'legacy nested shape', response: () => json(createMockSession(credentials.studentId)), code: 'INVALID_RESPONSE' },
  ])('rejects $label', async ({ response, code }) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json(tokens)).mockResolvedValueOnce(response()));
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
    await expect(fetchAcademicSession(credentials)).rejects.toMatchObject({ code: 'BACKEND_UNAVAILABLE' });
  });

  it('accepts a confirmed empty schedule', async () => {
    const session = createMockSession(credentials.studentId);
    session.schedule.classes = [];
    vi.stubGlobal('fetch', succeeds(flat(session)));
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


describe('two-stage portal access', () => {
  it.each([{}, { ...tokens, accessToken: '' }, { ...tokens, tokenType: 'cookie' }, { ...tokens, expiresIn: 0 }, { ...tokens, accessToken: 'unsafe\r\nheader' }])('rejects invalid login without consulting schedule', async body => {
    const fetcher = vi.fn().mockResolvedValue(json(body)); vi.stubGlobal('fetch', fetcher);
    await expect(fetchAcademicSession(credentials)).rejects.toMatchObject({code: 'INVALID_RESPONSE'});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects an expired access token without retrying credentials or refreshing', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json(tokens)).mockResolvedValueOnce(json({error:{code:'AUTHENTICATION_REQUIRED',message:'private'}},401));
    vi.stubGlobal('fetch',fetcher);
    await expect(fetchAcademicSession(credentials)).rejects.toMatchObject({code:'AUTHENTICATION_REQUIRED'});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not fetch schedule after cancellation during login parsing', async () => {
    const controller = new AbortController();
    const response = json(tokens); vi.spyOn(response,'json').mockImplementation(async()=>{controller.abort();return tokens});
    const fetcher=vi.fn().mockResolvedValue(response);vi.stubGlobal('fetch',fetcher);
    await expect(fetchAcademicSession(credentials,{signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('shares the timeout budget across both requests',async()=>{
    vi.useFakeTimers();
    const fetcher=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>setTimeout(()=>resolve(json(tokens)),15000)))
      .mockImplementationOnce((_url:string,init:RequestInit)=>new Promise((_resolve,reject)=>init.signal?.addEventListener('abort',()=>reject(new DOMException('Timeout','AbortError')))));
    vi.stubGlobal('fetch',fetcher);
    const assertion=expect(fetchAcademicSession(credentials)).rejects.toMatchObject({code:'PORTAL_UNAVAILABLE'});
    await vi.advanceTimersByTimeAsync(ACADEMIC_TIMEOUT_MS);await assertion;
    expect(fetcher).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
  });
  it('validates the supplied flat shape with 12 entries, blank professors, repeated subjects and microseconds',()=>{
    const session=createMockSession(credentials.studentId);
    const times = [[2,'07:00','09:00'],[2,'10:00','14:00'],[2,'14:00','16:00'],[2,'20:00','22:00'],[3,'16:00','19:00'],[4,'07:00','09:00'],[4,'12:00','14:00'],[4,'14:00','16:00'],[4,'19:00','22:00'],[5,'07:00','09:00'],[5,'18:00','21:00'],[6,'07:00','08:00']] as const;
    session.schedule.fetchedAt='2026-09-18T11:53:33.872305-04:00';
    session.schedule.classes=times.map(([day,startTime,endTime],i)=>({...session.schedule.classes[0]!,id:`qa-${i}`,day,startTime,endTime,professor:'',location:i===5||i===11?'VIRTUAL':'Aula'}));
    expect(parsePortalSchedule(flat(session),credentials.studentId)).toEqual(session);
  });
});
