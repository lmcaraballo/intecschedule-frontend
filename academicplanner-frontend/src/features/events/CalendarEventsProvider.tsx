import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocalData } from '../../app/LocalDataProvider';
import { calendarOwnerId } from './calendarSync';
import { listCalendarEvents } from './calendarApi';
import { useCalendarConnection } from './CalendarConnectionProvider';
import type { CalendarEvent } from './eventSchema';

interface CalendarEventsContextValue {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CalendarEventsContext = createContext<CalendarEventsContextValue>({
  events: [], loading: false, error: null, refresh: async () => {},
});

function currentCalendarWindow() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 180);
  return { from, to };
}

export function CalendarEventsProvider({ children }: { children: ReactNode }) {
  const { data } = useLocalData();
  const connection = useCalendarConnection();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const studentId = data?.session?.student.id;

  const refresh = useCallback(async () => {
    if (!connection.token || !studentId) {
      setEvents([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { from, to } = currentCalendarWindow();
      const nextEvents = await listCalendarEvents(connection.token, from, to, calendarOwnerId(studentId));
      setEvents([...nextEvents].sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt)));
    } catch {
      setError('No pudimos actualizar los eventos de Google Calendar.');
    } finally {
      setLoading(false);
    }
  }, [connection.token, studentId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  return <CalendarEventsContext.Provider value={{ events, loading, error, refresh }}>{children}</CalendarEventsContext.Provider>;
}

export function useCalendarEvents() {
  return useContext(CalendarEventsContext);
}
