import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AppShell } from '../components/AppShell';
import { AccessPage } from '../features/auth/AccessPage';
import { AcademicLayout } from './AcademicLayout';
import { NowPage } from '../features/now/NowPage';
import { SchedulePage } from '../features/schedule/SchedulePage';
import { EventsPage } from '../features/events/EventsPage';
import { MorePage } from '../features/preferences/MorePage';
import { AppErrorPage } from './AppErrorPage';

export const appRoutes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <AppErrorPage />,
    children: [
      { path: '/', element: <AccessPage /> },
      { path: '/acceso', element: <Navigate to="/" replace /> },
      { element: <AcademicLayout />, children: [
        { path: '/ahora', element: <NowPage /> },
        { path: '/horario', element: <SchedulePage /> },
        { path: '/eventos', element: <EventsPage /> },
        { path: '/mas', element: <MorePage /> },
      ] },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const router = createBrowserRouter(appRoutes);
