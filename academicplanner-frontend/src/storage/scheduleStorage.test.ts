import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scheduleStorage, ScheduleStorageError, clearAcademicPlannerData } from './scheduleStorage';
import { createMockSession } from '../mocks/academicSession';
import { defaultPreferences } from '../features/preferences/preferences';

const key = 'academicplanner:data:v1';

describe('scheduleStorage', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when nothing has been saved', () => {
    expect(scheduleStorage.get()).toBeNull();
  });

  it('persists the last valid schedule, timestamp and basic profile', () => {
    const session = createMockSession('1101234');
    scheduleStorage.save(session);
    expect(scheduleStorage.get()).toEqual({ version: 1, session, preferences: defaultPreferences, classOverrides: {} });
  });

  it('persists preferences before login and retains them on refresh', () => {
    scheduleStorage.savePreferences({ theme: 'night' });
    expect(scheduleStorage.get()?.session).toBeNull();
    const session = createMockSession('1101234');
    scheduleStorage.save(session);
    expect(scheduleStorage.get()?.preferences.theme).toBe('night');
    scheduleStorage.savePreferences({ theme: 'day' });
    expect(scheduleStorage.get()?.session).toEqual(session);
  });

  it('upgrades older preference records with safe defaults', () => {
    const session = createMockSession('1101234');
    localStorage.setItem(key, JSON.stringify({ version: 1, session, preferences: { theme: 'day' }, classOverrides: {} }));
    expect(scheduleStorage.get()?.preferences).toMatchObject({
      theme: 'day', startPage: 'now', defaultScheduleView: 'day',
      showCampusPreview: true, showUnscheduledSubjects: true, textSize: 'normal', highContrast: false,
    });
  });

  it('strips passwords, portal sessions and tokens at all object levels', () => {
    const original = createMockSession('1101234');
    const session = {
      ...original,
      password: 'sensitive-password',
      token: 'sensitive-token',
      portalSession: 'sensitive-cookie',
      student: { ...original.student, password: 'sensitive-password' },
      schedule: {
        ...original.schedule,
        token: 'sensitive-token',
        classes: original.schedule.classes.map((item) => ({ ...item, portalSession: 'sensitive-cookie' })),
      },
    };
    scheduleStorage.save(session);
    expect(scheduleStorage.get()?.session).toEqual(original);
    expect(localStorage.getItem(key)).not.toContain('sensitive');
    expect(localStorage.getItem(key)).not.toContain('password');
    expect(localStorage.getItem(key)).not.toContain('token');
    expect(localStorage.getItem(key)).not.toContain('portalSession');
  });

  it.each(['{broken json', '{}', 'null', '{"version":99}', '{"version":1,"session":{},"preferences":{"theme":"auto"}}'])('tolerates corrupted or unsupported data: %s', (raw) => {
    localStorage.setItem(key, raw);
    expect(scheduleStorage.get()).toBeNull();
  });

  it('rejects invalid data before replacing a valid schedule', () => {
    const session = createMockSession('1101234');
    scheduleStorage.save(session);
    expect(() => scheduleStorage.save({ ...session, schedule: { ...session.schedule, fetchedAt: 'invalid' } })).toThrow();
    expect(scheduleStorage.get()?.session).toEqual(session);
  });

  it('retains the previous schedule and reports a quota failure', () => {
    const session = createMockSession('1101234');
    scheduleStorage.save(session);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    expect(() => scheduleStorage.save(createMockSession('9999999'))).toThrow(ScheduleStorageError);
    expect(scheduleStorage.get()?.session).toEqual(session);
  });

  it('handles unavailable storage reads without crashing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    expect(scheduleStorage.get()).toBeNull();
  });

  it('clears only AcademicPlanner data', () => {
    localStorage.setItem('another-app', 'preserve');
    scheduleStorage.save(createMockSession('1101234'));
    scheduleStorage.clear();
    expect(scheduleStorage.get()).toBeNull();
    expect(localStorage.getItem('another-app')).toBe('preserve');
  });

  it('reports a failure to clear storage', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    expect(() => scheduleStorage.clear()).toThrow(ScheduleStorageError);
  });

  it('distinguishes empty, corrupted, readable and unavailable storage', () => {
    expect(scheduleStorage.read().status).toBe('empty');
    localStorage.setItem(key, '');
    expect(scheduleStorage.read().status).toBe('corrupt');
    scheduleStorage.save(createMockSession('1101234'));
    expect(scheduleStorage.read().status).toBe('ready');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('unavailable'); });
    expect(scheduleStorage.read().status).toBe('unavailable');
  });

  it('does not overwrite unreadable data when changing appearance', () => {
    localStorage.setItem(key, '{damaged');
    expect(() => scheduleStorage.savePreferences({ theme: 'night' })).toThrow(ScheduleStorageError);
    expect(localStorage.getItem(key)).toBe('{damaged');
  });

  it('notifies live readers of saves and complete cleanup, without touching other apps', () => {
    const callback = vi.fn();
    const unsubscribe = scheduleStorage.subscribe(callback);
    try {
      localStorage.setItem('other-app', 'keep');
      scheduleStorage.save(createMockSession('1101234'));
      scheduleStorage.savePreferences({ theme: 'night' });
      clearAcademicPlannerData();
      expect(callback.mock.calls.map(([type]) => type)).toEqual(['updated', 'updated', 'cleared']);
      expect(scheduleStorage.get()).toBeNull();
      expect(localStorage.getItem('other-app')).toBe('keep');
    } finally { unsubscribe(); }
    callback.mockClear();
    scheduleStorage.savePreferences({ theme: 'day' });
    expect(callback).not.toHaveBeenCalled();
  });

  it('stores a confirmed empty schedule as valid data', () => {
    const session = createMockSession('1101234');
    session.schedule.classes = [];
    scheduleStorage.save(session);
    expect(scheduleStorage.get()?.session).toEqual(session);
  });

  it('marks an early finish for only that class and calendar day', () => {
    const session = createMockSession('1101234');
    scheduleStorage.save(session);
    scheduleStorage.finishClassEarly('mat-01-mon', '2026-09-14', new Date('2026-09-14T09:15:00-04:00'));
    expect(scheduleStorage.get()?.classOverrides['2026-09-14:mat-01-mon']).toMatchObject({ classId: 'mat-01-mon', date: '2026-09-14', kind: 'finished_early' });
    scheduleStorage.undoClassOverride('mat-01-mon', '2026-09-14');
    expect(scheduleStorage.get()?.classOverrides).toEqual({});
  });
});

describe('snapshot ordering and external changes',()=>{
  beforeEach(()=>localStorage.clear());
  it('compares actual timestamps across timezone offsets without mixing profiles',()=>{
    const newest=createMockSession('qa');newest.schedule.fetchedAt='2026-09-18T09:00:00-04:00';scheduleStorage.save(newest);
    const older=createMockSession('qa');older.schedule.fetchedAt='2026-09-18T12:00:00Z';
    expect(()=>scheduleStorage.save(older)).toThrow('desactualizada');
    expect(scheduleStorage.get()?.session).toEqual(newest);
    older.student.id='other-student';expect(()=>scheduleStorage.save(older)).not.toThrow();
  });
  it('does not emit on unchanged focus, rereads changed data on visibility, and removes listeners',()=>{
    scheduleStorage.save(createMockSession('qa'));
    const listener=vi.fn(),unsubscribe=scheduleStorage.subscribe(listener);
    window.dispatchEvent(new Event('focus'));expect(listener).not.toHaveBeenCalled();
    localStorage.removeItem('academicplanner:data:v1');
    vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));expect(listener).toHaveBeenCalledWith('cleared');
    unsubscribe();listener.mockClear();window.dispatchEvent(new Event('focus'));expect(listener).not.toHaveBeenCalled();
  });
});
