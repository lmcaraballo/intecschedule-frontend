import { describe, expect, it } from 'vitest';
import { getInstitutionalDate, getInstitutionalNotice, getInstitutionalPeriod, getNextInstitutionalDate, isTeachingDate } from './institutionalCalendar';

describe('institutional calendar', () => {
  it('keeps classes inside the confirmed academic period', () => {
    expect(isTeachingDate(new Date(2026, 7, 3, 8))).toBe(true);
    expect(isTeachingDate(new Date(2026, 9, 17, 8))).toBe(true);
    expect(isTeachingDate(new Date(2026, 9, 18, 8))).toBe(false);
    expect(getInstitutionalPeriod(new Date(2026, 9, 18, 8))).toBeNull();
  });

  it('recognizes no-class dates and exposes the next student milestone', () => {
    expect(isTeachingDate(new Date(2026, 7, 16, 8))).toBe(false);
    const holiday = new Date(2026, 8, 24, 8);
    expect(isTeachingDate(holiday)).toBe(false);
    expect(getInstitutionalDate(holiday)?.kind).toBe('no_class');
    expect(getNextInstitutionalDate(new Date(2026, 8, 25, 8))?.date).toBe('2026-10-03');
  });

  it('labels future milestones as upcoming instead of claiming they are happening now', () => {
    const notice = getInstitutionalNotice(new Date(2026, 8, 28, 8));
    expect(notice).toMatchObject({ date: '2026-10-03', daysUntil: 5, isUpcoming: true, title: 'En 5 días: último día para retirar asignaturas' });
    expect(notice?.detail).toContain('sábado, 3 de octubre');
    expect(notice?.title).not.toContain('última semana');
    expect(getInstitutionalNotice(new Date(2026, 9, 11, 8))?.title).toBe('Mañana: última semana de docencia');
    expect(getInstitutionalNotice(new Date(2026, 9, 12, 8))).toMatchObject({ isUpcoming: false, title: 'Última semana de docencia' });
  });
});
