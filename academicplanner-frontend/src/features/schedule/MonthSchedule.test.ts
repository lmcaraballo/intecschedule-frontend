import { describe, expect, it } from 'vitest';
import { dateKey } from '../../utils/dateFormat';
import { getMonthGridDays } from './MonthSchedule';

describe('getMonthGridDays', () => {
  it('builds complete Monday-to-Sunday weeks for the selected month', () => {
    const days = getMonthGridDays(new Date('2026-09-15T12:00:00'));
    expect(days).toHaveLength(35);
    expect(dateKey(days[0]!)).toBe('2026-08-31');
    expect(dateKey(days.at(-1)!)).toBe('2026-10-04');
  });

  it('uses six rows when a month spans six calendar weeks', () => {
    const days = getMonthGridDays(new Date('2026-08-15T12:00:00'));
    expect(days).toHaveLength(42);
    expect(dateKey(days[0]!)).toBe('2026-07-27');
    expect(dateKey(days.at(-1)!)).toBe('2026-09-06');
  });
});
