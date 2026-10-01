import { RouterProvider } from 'react-router';
import { ThemeProvider } from '../theme/ThemeProvider';
import { router } from './router';
import { LocalDataProvider } from './LocalDataProvider';
import { AppErrorBoundary } from './AppErrorBoundary';
import { CalendarConnectionProvider } from '../features/events/CalendarConnectionProvider';

export function App() {
  return <AppErrorBoundary><ThemeProvider><CalendarConnectionProvider><LocalDataProvider><RouterProvider router={router} /></LocalDataProvider></CalendarConnectionProvider></ThemeProvider></AppErrorBoundary>;
}
