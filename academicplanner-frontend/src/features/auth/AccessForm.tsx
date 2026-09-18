import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Icon } from '../../components/Icon';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState, accessMessages } from '../../components/LoadingState';
import { useNetworkStatus } from '../../utils/useNetworkStatus';
import { credentialsSchema } from './authSchema';
import type { useAcademicAccess } from './useAcademicAccess';
import type { MockScenario } from '../../services/academicApi';

export function AccessForm({ access, scenario, hasSavedSchedule }: {
  access: ReturnType<typeof useAcademicAccess>;
  scenario: MockScenario;
  hasSavedSchedule: boolean;
}) {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ studentId?: string | undefined; password?: string | undefined }>({});
  const formRef = useRef<HTMLFormElement>(null);
  const online = useNetworkStatus();
  const { submit, stage, error } = access;
  const isLoading = stage !== null;

  useEffect(() => { if (!online) { setPassword(''); setVisible(false); } }, [online]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading || !online) return;
    const result = credentialsSchema.safeParse({ studentId, password });
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setFieldErrors({ studentId: errors.studentId?.[0], password: errors.password?.[0] });
      formRef.current?.querySelector<HTMLInputElement>(errors.studentId ? '#student-id' : '#password')?.focus();
      return;
    }
    setFieldErrors({});
    setPassword('');
    setVisible(false);
    void submit(result.data, scenario);
  }

  return <form ref={formRef} onSubmit={handleSubmit} noValidate aria-label="Consultar horario institucional">
    <fieldset disabled={isLoading || !online} className="access-fields">
      <legend className="sr-only">Acceso institucional</legend>
      <Input id="student-id" name="studentId" label="Identificación o matrícula" placeholder="Ej. 1101234"
        autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={64} value={studentId}
        onChange={(event) => { setStudentId(event.target.value); setFieldErrors((previous) => ({ ...previous, studentId: undefined })); }} error={fieldErrors.studentId} />
      <Input id="password" name="password" label="Contraseña institucional" placeholder="Tu contraseña"
        type={visible ? 'text' : 'password'} autoComplete="off" required maxLength={256} value={password}
        onChange={(event) => { setPassword(event.target.value); setFieldErrors((previous) => ({ ...previous, password: undefined })); }} error={fieldErrors.password}
        trailing={<Button variant="plain" className="password-toggle" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible((value) => !value)}><Icon name={visible ? 'eye-off' : 'eye'} /></Button>} />
    </fieldset>
    {error && <ErrorState message={error} />}
    {error && !hasSavedSchedule && <p className="access-retry-note">Todavía no tienes un horario guardado. Vuelve a intentar la consulta para continuar.</p>}
    <Button type="submit" className="continue-button" disabled={isLoading || !online} aria-busy={isLoading} aria-describedby={!online ? 'connection-required' : undefined}>
      <span>{isLoading ? 'Consultando…' : error ? 'Volver a intentar' : 'Continuar'}</span>{!isLoading && <Icon name="arrow" />}
    </Button>
    {!online && <p id="connection-required" className="access-retry-note">Necesitas Internet para consultar un horario actualizado.</p>}
    {stage && <LoadingState message={accessMessages[stage]} />}
  </form>;
}
