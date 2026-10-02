import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appRoutes } from './router';
import { LocalDataProvider } from './LocalDataProvider';
import { ThemeProvider } from '../theme/ThemeProvider';
import { scheduleStorage, ACADEMIC_STORAGE_KEY } from '../storage/scheduleStorage';
import { academicApi, type MockScenario } from '../services/academicApi';
import { createMockSession } from '../mocks/academicSession';

let router: ReturnType<typeof createMemoryRouter>;

function mount(path = '/') {
  router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<ThemeProvider><LocalDataProvider><RouterProvider router={router} /></LocalDataProvider></ThemeProvider>);
  return user;
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, scenario: MockScenario = 'success') {
  if (scenario !== 'success') {
    await user.click(screen.getByText('Estás en una versión de demostración'));
    await user.selectOptions(screen.getByLabelText('Resultado de la consulta'), scenario);
  }
  await user.type(screen.getByLabelText('Identificación o matrícula'), '1101234');
  await user.type(screen.getByLabelText('Contraseña institucional'), 'fictional-secret');
  await user.click(screen.getByRole('button', { name: 'Continuar' }));
}

async function finishRequest() {
  await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
}

function savePrevious() {
  const session = createMockSession('1101234');
  session.schedule.fetchedAt = new Date(2026, 8, 13, 18, 18).toISOString();
  scheduleStorage.save(session);
  return localStorage.getItem(ACADEMIC_STORAGE_KEY);
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 14, 9, 22));
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

afterEach(() => { router?.dispose(); vi.clearAllTimers(); vi.useRealTimers(); });

describe('access → saved schedule → Ahora', () => {
  it('validates, shows progress, receives and stores the schedule, then shows it in Ahora', async () => {
    const request = vi.spyOn(academicApi, 'fetchSession');
    const user = mount();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByLabelText('Identificación o matrícula')).toHaveFocus();
    expect(request).not.toHaveBeenCalled();
    await fillAndSubmit(user);
    expect(screen.getByLabelText('Contraseña institucional')).toHaveValue('');
    expect(screen.getByText('Verificando acceso…')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Consultando…' })).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(750); });
    expect(screen.getByText('Consultando tu horario actualizado…')).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(screen.getByText('Organizando tus clases…')).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(650); });
    expect(request).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe('/ahora');
    expect(screen.getByRole('heading', { name: 'Ahora' })).toBeVisible();
    expect(screen.getAllByText('Cálculo diferencial').length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '68');
    expect(scheduleStorage.get()?.session?.schedule.classes).toHaveLength(8);
    expect(localStorage.getItem(ACADEMIC_STORAGE_KEY)).not.toContain('fictional-secret');
    expect(localStorage.getItem(ACADEMIC_STORAGE_KEY)).not.toContain('password');
  });

  it.each(['invalid-credentials', 'portal-unavailable', 'schedule-not-found', 'invalid-response'] as const)('preserves the last valid schedule after %s and lets the student continue', async (scenario) => {
    const original = savePrevious();
    const user = mount();
    await fillAndSubmit(user, scenario);
    await finishRequest();
    expect(screen.getByRole('alert')).toBeVisible();
    expect(localStorage.getItem(ACADEMIC_STORAGE_KEY)).toBe(original);
    expect(screen.getByText(/Actualizado ayer a las/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Continuar con horario guardado' }));
    expect(router.state.location.pathname).toBe('/ahora');
    expect(screen.getByText('Mostrando tu último horario válido.')).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Horario' }));
    expect(screen.getByText('Mostrando tu último horario válido.')).toBeVisible();
    expect(localStorage.getItem(ACADEMIC_STORAGE_KEY)).toBe(original);
  });

  it('explains retry on first use and never renders technical error details', async () => {
    vi.spyOn(academicApi, 'fetchSession').mockRejectedValue(new Error('INTERNAL_STACK secret-token'));
    const user = mount();
    await fillAndSubmit(user);
    await finishRequest();
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos consultar tu horario.');
    expect(screen.getByText(/Todavía no tienes un horario guardado/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continuar con horario guardado' })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('INTERNAL_STACK');
    expect(scheduleStorage.get()).toBeNull();
  });

  it('stores a confirmed empty schedule and shows useful empty states', async () => {
    const user = mount();
    await fillAndSubmit(user, 'empty-schedule');
    await finishRequest();
    expect(router.state.location.pathname).toBe('/ahora');
    expect(screen.getByRole('heading', { name: 'Tu horario todavía no tiene clases' })).toBeVisible();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(scheduleStorage.get()?.session?.schedule.classes).toEqual([]);
    await user.click(screen.getByRole('link', { name: 'Horario' }));
    expect(screen.getByText('No tienes clases este día')).toBeVisible();
  });

  it('keeps Ahora, Horario and class details working offline; reconnect enables consultation', async () => {
    const original = savePrevious();
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const request = vi.spyOn(academicApi, 'fetchSession');
    const user = mount();
    expect(screen.getByText('Sin conexión')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Continuar con horario guardado' }));
    expect(screen.getByRole('heading', { name: 'Ahora' })).toBeVisible();
    await user.click(screen.getByRole('link', { name: 'Horario' }));
    await user.click(screen.getByRole('button', { name: /Ver detalle: Cálculo diferencial/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Laura Méndez');
    expect(request).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACADEMIC_STORAGE_KEY)).toBe(original);
    await user.click(screen.getByRole('button', { name: 'Cerrar detalle de clase' }));
    act(() => { online.mockReturnValue(true); window.dispatchEvent(new Event('online')); });
    expect(screen.queryByText('Sin conexión')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Consultar de nuevo' })).toBeVisible();
  });

  it('handles first use offline and reconnects without reloading', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    mount();
    expect(screen.getByText(/guardar tu primer horario/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continuar con horario guardado' })).not.toBeInTheDocument();
    act(() => { online.mockReturnValue(true); window.dispatchEvent(new Event('online')); });
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });

  it('keeps saved data if connectivity drops during consultation', async () => {
    const original = savePrevious();
    const online = vi.spyOn(navigator, 'onLine', 'get');
    const user = mount();
    await fillAndSubmit(user);
    act(() => { online.mockReturnValue(false); window.dispatchEvent(new Event('offline')); });
    await finishRequest();
    expect(screen.getByRole('alert')).toHaveTextContent('Necesitas conexión a Internet');
    expect(localStorage.getItem(ACADEMIC_STORAGE_KEY)).toBe(original);
    expect(screen.getByRole('button', { name: 'Continuar con horario guardado' })).toBeEnabled();
  });

  it('clears only our data after confirmation, resets the theme, and guards academic routes', async () => {
    savePrevious();
    scheduleStorage.savePreferences({ theme: 'night' });
    localStorage.setItem('other-app', 'untouched');
    const user = mount('/mas');
    await user.click(screen.getByRole('tab', { name: /Privacidad/ }));
    await user.click(screen.getByRole('button', { name: 'Limpiar datos locales' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(scheduleStorage.get()?.session).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Limpiar datos locales' }));
    await user.click(screen.getByRole('button', { name: 'Borrar mis datos locales' }));
    expect(router.state.location.pathname).toBe('/');
    expect(scheduleStorage.get()).toBeNull();
    expect(localStorage.getItem('other-app')).toBe('untouched');
    expect(document.documentElement.dataset.theme).toBe('day');
    expect(screen.getByRole('status', { name: 'Tus datos locales se borraron con seguridad' })).toBeVisible();
    await act(async () => { await router.navigate('/ahora'); });
    expect(router.state.location.pathname).toBe('/');
  });

  it('reports a failed cleanup and keeps the saved schedule', async () => {
    const original = savePrevious();
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    const user = mount('/mas');
    await user.click(screen.getByRole('tab', { name: /Privacidad/ }));
    await user.click(screen.getByRole('button', { name: 'Limpiar datos locales' }));
    await user.click(screen.getByRole('button', { name: 'Borrar mis datos locales' }));
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('No pudimos borrar los datos.');
    expect(localStorage.getItem(ACADEMIC_STORAGE_KEY)).toBe(original);
  });

  it('removes the active schedule from the UI when another tab clears the app data', () => {
    const oldValue = savePrevious();
    mount('/ahora');
    act(() => {
      localStorage.removeItem(ACADEMIC_STORAGE_KEY);
      window.dispatchEvent(new StorageEvent('storage', { key: ACADEMIC_STORAGE_KEY, oldValue, newValue: null }));
    });
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByText('Cálculo diferencial')).not.toBeInTheDocument();
  });

  it('updates Ahora at a minute boundary without persisting derived state', async () => {
    savePrevious();
    vi.setSystemTime(new Date(2026, 8, 14, 9, 59, 59));
    mount('/ahora');
    const original = localStorage.getItem(ACADEMIC_STORAGE_KEY);
    expect(screen.getByRole('progressbar')).toBeVisible();
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Tienes 1 h libres.')).toBeVisible();
    expect(localStorage.getItem(ACADEMIC_STORAGE_KEY)).toBe(original);
  });

  it('handles corrupted local data without crashing or inventing a schedule', () => {
    localStorage.setItem(ACADEMIC_STORAGE_KEY, '{broken');
    mount('/ahora');
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByText(/No pudimos leer el horario guardado/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continuar con horario guardado' })).not.toBeInTheDocument();
  });

  it('does not restore data from an in-flight request after another tab clears it', async () => {
    savePrevious();
    const user = mount();
    await fillAndSubmit(user);
    act(() => {
      localStorage.removeItem(ACADEMIC_STORAGE_KEY);
      window.dispatchEvent(new StorageEvent('storage', { key: ACADEMIC_STORAGE_KEY, newValue: null }));
    });
    await finishRequest();
    expect(scheduleStorage.get()).toBeNull();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.getByRole('alert')).toHaveTextContent('Se borraron los datos locales.');
  });

  it('offers the existing schedule when a new valid response cannot be saved', async () => {
    const original = savePrevious();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    const user = mount();
    await fillAndSubmit(user);
    await finishRequest();
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos guardar los datos');
    expect(router.state.location.pathname).toBe('/');
    expect(localStorage.getItem(ACADEMIC_STORAGE_KEY)).toBe(original);
    expect(screen.getByRole('button', { name: 'Continuar con horario guardado' })).toBeEnabled();
  });
});

describe('QA regression cases', () => {
  it('labels every ongoing class as active when institutional classes overlap', () => {
    const session = createMockSession('qa');
    session.schedule.classes = [
      { ...session.schedule.classes[0]!, id: 'first', startTime: '08:00', endTime: '10:00' },
      { ...session.schedule.classes[0]!, id: 'second', startTime: '09:00', endTime: '11:00' },
    ];
    scheduleStorage.save(session);
    mount('/ahora');
    const agenda = screen.getByRole('region', { name: 'Tu día, de un vistazo' });
    expect(within(agenda).getAllByText('En curso')).toHaveLength(2);
    expect(within(agenda).queryByText('Pendiente')).not.toBeInTheDocument();
  });

  it('ignores duplicate submissions while a request is pending', async () => {
    const request = vi.spyOn(academicApi, 'fetchSession');
    const user = mount();
    await user.type(screen.getByLabelText('Identificación o matrícula'), 'qa');
    await user.type(screen.getByLabelText('Contraseña institucional'), 'fictional');
    await user.dblClick(screen.getByRole('button', { name: 'Continuar' }));
    await user.keyboard('{Enter}{Enter}');
    expect(request).toHaveBeenCalledTimes(1);
    await finishRequest();
    expect(router.state.location.pathname).toBe('/ahora');
  });

  it('aborts on navigation and does not save a delayed response', async () => {
    const user = mount();
    await fillAndSubmit(user);
    await act(async () => { await router.navigate('/missing'); });
    await finishRequest();
    expect(scheduleStorage.get()).toBeNull();
    expect(router.state.location.pathname).toBe('/');
  });
});

it('does not resurrect manually deleted storage after focus during loading',async()=>{
  savePrevious();const user=mount();await fillAndSubmit(user);
  act(()=>{localStorage.removeItem(ACADEMIC_STORAGE_KEY);window.dispatchEvent(new Event('focus'));});
  await finishRequest();expect(scheduleStorage.get()).toBeNull();
  expect(router.state.location.pathname).toBe('/');
  expect(screen.getByRole('alert')).toHaveTextContent('Se borraron los datos locales.');
});
