import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { academicApi, type AccessStage } from './academicApi';
import { academicSessionSchema } from '../types/academic';

describe('academicApi mock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const credentials = { studentId: '1101234', password: 'fictional' };

  it('returns a valid schedule from Monday through Saturday and emits progress', async () => {
    const stages: AccessStage[] = [];
    const request = academicApi.fetchSession(credentials, { onProgress: (stage) => stages.push(stage) });
    await vi.runAllTimersAsync();
    const result = academicSessionSchema.parse(await request);
    expect(result.student.id).toBe(credentials.studentId);
    expect(new Set(result.schedule.classes.map((item) => item.day))).toEqual(new Set([1, 2, 3, 4, 5, 6]));
    expect(stages).toEqual(['verifying', 'fetching', 'organizing']);
    expect(JSON.stringify(result)).not.toContain(credentials.password);
  });

  it.each(['invalid-credentials', 'portal-unavailable'] as const)('supports %s', async (scenario) => {
    const assertion = expect(academicApi.fetchSession(credentials, { scenario })).rejects.toMatchObject({ code: scenario === 'invalid-credentials' ? 'INVALID_CREDENTIALS' : 'PORTAL_UNAVAILABLE' });
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('cancels an in-flight request', async () => {
    const controller = new AbortController();
    const assertion = expect(academicApi.fetchSession(credentials, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
