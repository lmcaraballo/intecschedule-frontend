import { createContext, useContext, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useLocalData } from './LocalDataProvider';
import type { AcademicSession } from '../types/academic';
import { useClock } from '../utils/useClock';
import { ClassDetail } from '../features/schedule/ClassDetail';
import './academic.css';

const AcademicContext = createContext<{ session: AcademicSession; now: Date } | null>(null);

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
  return <AcademicContext.Provider value={{ session, now }}><Outlet /><ClassDetail /></AcademicContext.Provider>;
}

export function useAcademicSession() {
  const context = useContext(AcademicContext);
  if (!context) throw new Error('Se requiere AcademicLayout');
  return context;
}
