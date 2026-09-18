import { RouterProvider } from 'react-router';
import { ThemeProvider } from '../theme/ThemeProvider';
import { router } from './router';
import { LocalDataProvider } from './LocalDataProvider';
import { AppErrorBoundary } from './AppErrorBoundary';

export function App() {
  return <AppErrorBoundary><ThemeProvider><LocalDataProvider><RouterProvider router={router} /></LocalDataProvider></ThemeProvider></AppErrorBoundary>;
}
