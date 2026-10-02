import { act, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';
import { appRoutes } from './router';
import { ThemeProvider } from '../theme/ThemeProvider';
import * as contextualTheme from '../theme/contextualTheme';
import { LocalDataProvider } from './LocalDataProvider';
import { scheduleStorage, ACADEMIC_STORAGE_KEY } from '../storage/scheduleStorage';
import { createMockSession } from '../mocks/academicSession';

beforeEach(()=>localStorage.clear());

it('recovers from a provider render failure without revealing details or removing storage',()=>{
  scheduleStorage.save(createMockSession('qa'));
  const previous=localStorage.getItem(ACADEMIC_STORAGE_KEY);
  vi.spyOn(contextualTheme,'getContextualTheme').mockImplementation(()=>{throw new Error('PRIVATE-render-detail');});
  vi.spyOn(console,'error').mockImplementation(()=>{});
  render(<App />);
  expect(screen.getByRole('heading',{name:'Necesitamos recargar esta parte.'})).toBeVisible();
  expect(document.body).not.toHaveTextContent('PRIVATE-render-detail');
  expect(localStorage.getItem(ACADEMIC_STORAGE_KEY)).toBe(previous);
});

it.each(['cleared','corrupt'] as const)('revalidates manually %s storage when focus returns',async(kind)=>{
  scheduleStorage.save(createMockSession('qa'));
  const router=createMemoryRouter(appRoutes,{initialEntries:['/ahora']});
  render(<ThemeProvider><LocalDataProvider><RouterProvider router={router}/></LocalDataProvider></ThemeProvider>);
  await act(async()=>{
    if(kind==='cleared')localStorage.removeItem(ACADEMIC_STORAGE_KEY);
    else localStorage.setItem(ACADEMIC_STORAGE_KEY,'{broken');
    window.dispatchEvent(new Event('focus'));
  });
  expect(router.state.location.pathname).toBe('/');
  expect(screen.queryByRole('heading',{name:'Ahora'})).not.toBeInTheDocument();
  router.dispose();
});
