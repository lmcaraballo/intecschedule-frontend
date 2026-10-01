import { RouterProvider } from 'react-router';
import { ThemeProvider } from '../theme/ThemeProvider';
import { router } from './router';
import { LocalDataProvider } from './LocalDataProvider';
import { AppErrorBoundary } from './AppErrorBoundary';
import { CalendarConnectionProvider } from '../features/events/CalendarConnectionProvider';
import { InstitutionalCalendarProvider } from '../features/institutional/InstitutionalCalendarProvider';

export function App() {
  return <AppErrorBoundary><ThemeProvider><InstitutionalCalendarProvider><CalendarConnectionProvider><LocalDataProvider><RouterProvider router={router} /></LocalDataProvider></CalendarConnectionProvider></InstitutionalCalendarProvider></ThemeProvider></AppErrorBoundary>;
}
