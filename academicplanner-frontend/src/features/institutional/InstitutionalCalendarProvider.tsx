import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { isAcademicMock } from '../../services/academicApi';
import {
  getInstitutionalPeriods,
  institutionalPeriods,
  setInstitutionalPeriods,
  type InstitutionalPeriod,
} from './institutionalCalendar';

const CACHE_KEY = 'academicplanner:institutional:v1';
const dateSchema = z.object({
  date: z.iso.date(),
  kind: z.enum(['no_class', 'milestone']),
  title: z.string().min(1),
  detail: z.string().min(1),
});
const periodSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
  timezone: z.literal('America/Santo_Domingo'),
  sourceUrl: z.url(),
  updatedAt: z.iso.datetime({ offset: true }),
  dates: z.array(dateSchema),
}).refine((period) => period.startsOn <= period.endsOn, { message: 'INVALID_PERIOD' });
const periodsSchema = z.array(periodSchema).min(1);

type CalendarStatus = 'loading' | 'fresh' | 'stale';
interface InstitutionalCalendarValue {
  periods: InstitutionalPeriod[];
  status: CalendarStatus;
  lastUpdatedAt: string;
}

const fallbackValue: InstitutionalCalendarValue = {
  periods: institutionalPeriods,
  status: 'fresh',
  lastUpdatedAt: latestUpdate(institutionalPeriods),
};
const InstitutionalCalendarContext = createContext<InstitutionalCalendarValue>(fallbackValue);

export function InstitutionalCalendarProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<InstitutionalCalendarValue>(() => {
    const cached = readCache();
    const periods = cached ?? institutionalPeriods;
    setInstitutionalPeriods(periods);
    return { periods, status: isAcademicMock ? 'fresh' : 'loading', lastUpdatedAt: latestUpdate(periods) };
  });

  useEffect(() => {
    if (isAcademicMock) return;
    let active = true;
    fetch('/api/calendar/institutional', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('INSTITUTIONAL_CALENDAR_UNAVAILABLE');
        return periodsSchema.parse(await response.json());
      })
      .then((periods) => {
        if (!active) return;
        setInstitutionalPeriods(periods);
        writeCache(periods);
        setValue({ periods, status: 'fresh', lastUpdatedAt: latestUpdate(periods) });
      })
      .catch(() => {
        if (!active) return;
        const periods = getInstitutionalPeriods();
        setValue({ periods, status: 'stale', lastUpdatedAt: latestUpdate(periods) });
      });
    return () => { active = false; };
  }, []);

  return <InstitutionalCalendarContext.Provider value={value}>{children}</InstitutionalCalendarContext.Provider>;
}

export function useInstitutionalCalendar() {
  return useContext(InstitutionalCalendarContext);
}

function readCache(): InstitutionalPeriod[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? periodsSchema.parse(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(periods: InstitutionalPeriod[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(periods)); } catch { /* respaldo incluido en la app */ }
}

function latestUpdate(periods: InstitutionalPeriod[]) {
  return [...periods].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]!.updatedAt;
}
