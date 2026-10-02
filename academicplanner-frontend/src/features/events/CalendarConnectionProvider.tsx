import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { isAcademicMock } from '../../services/academicApi';
import { fetchCalendarConfig, type CalendarConfig } from './calendarApi';

interface CalendarConnection {
  config: CalendarConfig | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  retryPreparation: () => Promise<void>;
  disconnect: () => void;
}

const CalendarConnectionContext = createContext<CalendarConnection | null>(null);

interface GoogleTokenResponse { access_token?: string; expires_in?: number; error?: string; }
interface GoogleTokenError { type?: string; }
interface GoogleTokenClient { requestAccessToken: (options?: { prompt?: string }) => void; }
interface GoogleIdentity {
  accounts: { oauth2: { initTokenClient: (options: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (error: GoogleTokenError) => void;
  }) => GoogleTokenClient } };
}

export function CalendarConnectionProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<CalendarConfig | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const expirationTimer = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchCalendarConfig()
      .then((value) => { if (active) { setConfig(value); setError(null); } })
      .catch(() => { if (active) setError('No pudimos leer la configuración de Google Calendar.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; if (expirationTimer.current) window.clearTimeout(expirationTimer.current); };
  }, []);

  async function connect() {
    if (!config?.available) { setError('Google Calendar todavía no está configurado para esta aplicación.'); return; }
    setLoading(true);
    setError(null);
    try {
      if (isAcademicMock) { setToken('demo-calendar-token'); return; }
      if (!config.clientId) throw new Error('missing-client-id');
      const google = await loadGoogleIdentity();
      const accessToken = await new Promise<{ token: string; expiresIn: number }>((resolve, reject) => {
        let timeoutId: number | null = null;
        let settled = false;
        const finish = (action: () => void) => {
          if (settled) return;
          settled = true;
          if (timeoutId !== null) window.clearTimeout(timeoutId);
          action();
        };
        try {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: config.clientId!,
            scope: config.scopes.join(' '),
            callback: (response) => response.access_token
              ? finish(() => resolve({ token: response.access_token!, expiresIn: response.expires_in ?? 3600 }))
              : finish(() => reject(new Error(response.error ?? 'oauth-failed'))),
            error_callback: (oauthError) => finish(() => reject(new Error(oauthError.type ?? 'oauth-popup-failed'))),
          });
          timeoutId = window.setTimeout(
            () => finish(() => reject(new Error('oauth-timeout'))),
            45_000,
          );
          client.requestAccessToken({ prompt: 'consent' });
        } catch (oauthError) {
          finish(() => reject(oauthError));
        }
      });
      if (expirationTimer.current) window.clearTimeout(expirationTimer.current);
      setToken(accessToken.token);
      expirationTimer.current = window.setTimeout(() => setToken(null), Math.max(1, accessToken.expiresIn - 60) * 1000);
    } catch {
      setError('No se completó la conexión con Google Calendar. Puedes intentarlo de nuevo.');
      setToken(null);
    } finally {
      setLoading(false);
    }
  }

  function disconnect() {
    if (expirationTimer.current) window.clearTimeout(expirationTimer.current);
    expirationTimer.current = null;
    setToken(null);
    setError(null);
  }

  async function retryPreparation() {
    setLoading(true);
    setError(null);
    try {
      setConfig(await fetchCalendarConfig());
    } catch {
      setConfig(null);
      setError('No pudimos preparar Google Calendar. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return <CalendarConnectionContext.Provider value={{ config, token, loading, error, connect, retryPreparation, disconnect }}>{children}</CalendarConnectionContext.Provider>;
}

export function useCalendarConnection() {
  const value = useContext(CalendarConnectionContext);
  if (!value) throw new Error('Se requiere CalendarConnectionProvider');
  return value;
}

let googleScriptPromise: Promise<GoogleIdentity> | null = null;
function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const loadedGoogle = (window as Window & { google?: GoogleIdentity }).google;
  if (loadedGoogle) return Promise.resolve(loadedGoogle);
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.dataset.googleIdentity = 'true';
    }
    let settled = false;
    let timeoutId: number | null = null;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      action();
    };
    timeoutId = window.setTimeout(() => finish(() => {
      googleScriptPromise = null;
      reject(new Error('google-timeout'));
    }), 10_000);
    script.addEventListener('load', () => {
      const google = (window as Window & { google?: GoogleIdentity }).google;
      if (google) finish(() => resolve(google));
      else finish(() => {
        googleScriptPromise = null;
        reject(new Error('google-unavailable'));
      });
    }, { once: true });
    script.addEventListener('error', () => finish(() => {
      googleScriptPromise = null;
      reject(new Error('google-unavailable'));
    }), { once: true });
    if (!existing) document.head.append(script);
  });
  return googleScriptPromise;
}
