import { createContext, useContext, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useLocalData } from './LocalDataProvider';
import type { AcademicClass, AcademicSession } from '../types/academic';
import { useClock } from '../utils/useClock';
import { ClassDetail } from '../features/schedule/ClassDetail';
import { scheduleStorage } from '../storage/scheduleStorage';
import { dateKey } from '../utils/dateFormat';
import type { ClassOverrides } from '../features/schedule/scheduleDomain';
import type { Preferences } from '../features/preferences/preferences';
import './academic.css';

const AcademicContext = createContext<{
  session: AcademicSession; now: Date; preferences: Preferences; classOverrides: ClassOverrides;
  finishClassEarly: (item: AcademicClass) => void; undoClassOverride: (item: AcademicClass) => void;
} | null>(null);

export function AcademicLayout() {
  const { data } = useLocalData();
  const session = data?.session;
  const now = useClock();
  const { pathname } = useLocation();
  useEffect(() => {
    document.querySelector<HTMLElement>('#page-title')?.focus();
    window.scrollTo(0, 0);
  }, [pathname]);
  if (!session) return <Navigate to="/" replace />;
  const preferences = data?.preferences;
  if (!preferences) return <Navigate to="/" replace />;
  const classOverrides = data?.classOverrides ?? {};
  const finishClassEarly = (item: AcademicClass) => scheduleStorage.finishClassEarly(item.id, dateKey(now), now);
  const undoClassOverride = (item: AcademicClass) => scheduleStorage.undoClassOverride(item.id, dateKey(now));
  return <AcademicContext.Provider value={{ session, now, preferences, classOverrides, finishClassEarly, undoClassOverride }}><Outlet /><ClassDetail /></AcademicContext.Provider>;
}

export function useAcademicSession() {
  const context = useContext(AcademicContext);
  if (!context) throw new Error('Se requiere AcademicLayout');
  return context;
}
