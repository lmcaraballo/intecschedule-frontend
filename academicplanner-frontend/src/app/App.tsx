import { RouterProvider } from 'react-router';
import { ThemeProvider } from '../theme/ThemeProvider';
import { router } from './router';
import { LocalDataProvider } from './LocalDataProvider';

export function App() {
  return <ThemeProvider><LocalDataProvider><RouterProvider router={router} /></LocalDataProvider></ThemeProvider>;
}
