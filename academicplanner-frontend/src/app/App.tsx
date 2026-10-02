import { RouterProvider } from 'react-router';
import { ThemeProvider } from '../theme/ThemeProvider';
import { router } from './router';
import { LocalDataProvider } from './LocalDataProvider';
import { AppErrorBoundary } from './AppErrorBoundary';
import { CalendarConnectionProvider } from '../features/events/CalendarConnectionProvider';
import { InstitutionalCalendarProvider } from '../features/institutional/InstitutionalCalendarProvider';
import { CalendarEventsProvider } from '../features/events/CalendarEventsProvider';

export function App() {
  return <AppErrorBoundary><ThemeProvider><InstitutionalCalendarProvider><LocalDataProvider><CalendarConnectionProvider><CalendarEventsProvider><RouterProvider router={router} /></CalendarEventsProvider></CalendarConnectionProvider></LocalDataProvider></InstitutionalCalendarProvider></ThemeProvider></AppErrorBoundary>;
}
