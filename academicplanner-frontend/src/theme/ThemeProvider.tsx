import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { scheduleStorage } from '../storage/scheduleStorage';
import { defaultPreferences, type Preferences } from '../features/preferences/preferences';
import { getContextualTheme, getVisualTheme, type VisualTheme } from './contextualTheme';

interface ThemeContextValue {
  theme: VisualTheme;
  preference: Preferences['theme'];
  setPreference: (value: Preferences['theme']) => void;
  storageWarning: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setThemePreference] = useState(() => scheduleStorage.get()?.preferences.theme ?? defaultPreferences.theme);
  const [context, setContext] = useState(getContextualTheme);
  const [storageWarning, setStorageWarning] = useState(false);
  const theme = getVisualTheme(preference, context);

  useEffect(() => scheduleStorage.subscribe((change) => {
    const stored = scheduleStorage.read();
    if (change === 'cleared' || stored.status === 'ready') {
      setThemePreference(stored.data?.preferences.theme ?? defaultPreferences.theme);
      setStorageWarning(false);
    }
  }), []);

  useEffect(() => {
    const refresh = () => setContext(getContextualTheme());
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.context = context;
    document.documentElement.style.colorScheme = theme === 'night' ? 'dark' : 'light';
    const color = getComputedStyle(document.documentElement).getPropertyValue('--browser-theme').trim();
    if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }, [theme, context]);

  function setPreference(value: Preferences['theme']) {
    setThemePreference(value);
    try {
      scheduleStorage.savePreferences({ theme: value });
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }

  return <ThemeContext.Provider value={{ theme, preference, setPreference, storageWarning }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme requiere ThemeProvider');
  return context;
}
