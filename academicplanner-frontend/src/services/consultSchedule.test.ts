import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { consultSchedule } from './consultSchedule';
import { academicApi } from './academicApi';
import { scheduleStorage, ACADEMIC_STORAGE_KEY } from '../storage/scheduleStorage';
import { createMockSession } from '../mocks/academicSession';

describe('consultSchedule transaction', () => {
  const credentials = { studentId: '1101234', password: 'not-persisted' };
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it.each(['invalid-credentials', 'portal-unavailable', 'schedule-not-found', 'invalid-response'] as const)('never replaces a valid schedule on %s', async (scenario) => {
    scheduleStorage.save(createMockSession(credentials.studentId));
    const previous = localStorage.getItem(ACADEMIC_STORAGE_KEY);
    const assertion = expect(consultSchedule(credentials, { scenario })).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertion;
    expect(localStorage.getItem(ACADEMIC_STORAGE_KEY)).toBe(previous);
  });

  it('rejects a response for a different student', async () => {
    vi.spyOn(academicApi, 'fetchSession').mockResolvedValue(createMockSession('another-student'));
    await expect(consultSchedule(credentials)).rejects.toThrow();
    expect(scheduleStorage.get()).toBeNull();
  });

  it('does not persist a response delivered after cancellation', async () => {
    const controller = new AbortController();
    vi.spyOn(academicApi, 'fetchSession').mockImplementation(async () => {
      controller.abort();
      return createMockSession(credentials.studentId);
    });
    await expect(consultSchedule(credentials, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(scheduleStorage.get()).toBeNull();
  });
});

describe('out-of-order academic updates',()=>{
  it('does not let an older completed snapshot replace the newest valid schedule',async()=>{
    localStorage.clear();
    const original=createMockSession('qa');original.schedule.fetchedAt='2026-09-18T10:00:00Z';scheduleStorage.save(original);
    const older=createMockSession('qa');older.schedule.fetchedAt='2026-09-18T11:00:00Z';
    const newer=createMockSession('qa');newer.schedule.fetchedAt='2026-09-18T12:00:00Z';newer.schedule.classes=[];
    let resolveA!:(value:unknown)=>void;
    vi.spyOn(academicApi,'fetchSession').mockImplementationOnce(()=>new Promise(resolve=>{resolveA=resolve;})).mockResolvedValueOnce(newer);
    const a=consultSchedule({studentId:'qa',password:'fictional'}).catch(e=>e);
    await consultSchedule({studentId:'qa',password:'fictional'});
    resolveA(older);await a;
    expect(scheduleStorage.get()?.session).toEqual(newer);
  });
});
