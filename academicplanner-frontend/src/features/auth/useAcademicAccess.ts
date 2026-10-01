import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AcademicApiError, type AccessStage, type MockScenario } from '../../services/academicApi';
import { consultSchedule } from '../../services/consultSchedule';
import { useLocalData } from '../../app/LocalDataProvider';
import { scheduleStorage, ScheduleStorageError } from '../../storage/scheduleStorage';
import type { Credentials } from './authSchema';
import { defaultPreferences, getStartPath } from '../preferences/preferences';

export function useAcademicAccess() {
  const navigate = useNavigate();
  const { setUsingLastValid } = useLocalData();
  const [stage, setStage] = useState<AccessStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  useEffect(() => scheduleStorage.subscribe((change) => {
    if (change === 'cleared' && activeRequest.current) {
      activeRequest.current.abort();
      activeRequest.current = null;
      setStage(null);
      setError('Se borraron los datos locales. Vuelve a consultar tu horario para continuar.');
    }
  }), []);

  async function submit(credentials: Credentials, scenario: MockScenario) {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setError(null);
    setStage('verifying');
    try {
      await consultSchedule(credentials, {
        scenario,
        signal: controller.signal,
        onProgress: setStage,
      });
      if (controller.signal.aborted) return;
      setUsingLastValid(false);
      navigate(getStartPath(scheduleStorage.get()?.preferences ?? defaultPreferences), { replace: true });
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof AcademicApiError || cause instanceof ScheduleStorageError
        ? cause.message
        : 'No pudimos consultar tu horario. Vuelve a intentarlo.');
    } finally {
      credentials.password = ''; // Release the form-owned request object on every outcome.
      if (activeRequest.current === controller) activeRequest.current = null;
      if (!controller.signal.aborted) setStage(null);
    }
  }

  return { submit, stage, error };
}
