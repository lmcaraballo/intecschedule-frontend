import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { scheduleStorage } from '../storage/scheduleStorage';
import { defaultPreferences, type Preferences } from '../features/preferences/preferences';
import { getContextualTheme, getVisualTheme, type ContextualTheme, type VisualTheme } from './contextualTheme';

interface ThemeContextValue {
  theme: VisualTheme;
  phase: ContextualTheme;
  preference: Preferences['theme'];
  setPreference: (value: Preferences['theme']) => void;
  storageWarning: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(() => scheduleStorage.get()?.preferences ?? defaultPreferences);
  const [context, setContext] = useState(getContextualTheme);
  const [storageWarning, setStorageWarning] = useState(false);
  const preference = preferences.theme;
  const theme = getVisualTheme(preference, context);

  useEffect(() => scheduleStorage.subscribe((change) => {
    const stored = scheduleStorage.read();
    if (change === 'cleared' || stored.status === 'ready') {
      setPreferences(stored.data?.preferences ?? defaultPreferences);
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
    document.documentElement.dataset.themeMode = preference;
    document.documentElement.dataset.themeVariant = preference === 'auto' ? 'auto' : preferences.themeVariant;
    document.documentElement.style.colorScheme = theme === 'night' ? 'dark' : 'light';
    const color = getComputedStyle(document.documentElement).getPropertyValue('--browser-theme').trim();
    if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  }, [theme, context, preference, preferences.themeVariant]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(preferences.reducedMotion);
    document.documentElement.dataset.textSize = preferences.textSize;
    document.documentElement.dataset.highContrast = String(preferences.highContrast);
  }, [preferences.highContrast, preferences.reducedMotion, preferences.textSize]);

  function setPreference(value: Preferences['theme']) {
    const variantForMode = (current: Preferences) => {
      if (value === 'auto') return current.themeVariant;
      if (value === 'day') return current.themeVariant.startsWith('day-') ? current.themeVariant : 'day-cream';
      return current.themeVariant.startsWith('night-') ? current.themeVariant : 'night-forest';
    };
    setPreferences((current) => ({ ...current, theme: value, themeVariant: variantForMode(current) }));
    try {
      const current = scheduleStorage.get()?.preferences ?? defaultPreferences;
      scheduleStorage.savePreferences({ theme: value, themeVariant: variantForMode(current) });
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }

  return <ThemeContext.Provider value={{ theme, phase: context, preference, setPreference, storageWarning }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme requiere ThemeProvider');
  return context;
}
