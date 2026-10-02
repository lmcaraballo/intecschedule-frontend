import { Brand } from '../components/Brand';

/** Route errors never render the exception, stack, request or credentials. */
export function AppErrorPage() {
  return <main id="main-content" className="recovery-page">
    <div className="recovery-page__card">
      <Brand />
      <span className="recovery-page__icon" aria-hidden="true">↻</span>
      <p className="section-label">Podemos recuperarnos de esto</p>
      <h1>Esta vista necesita volver a cargarse.</h1>
      <p>No modificamos tu horario ni tus preferencias. Intenta abrir AcademicPlanner otra vez; si el problema continúa, vuelve al acceso para consultar tu horario de nuevo.</p>
      <div className="recovery-page__actions"><a className="button" href="/">Reintentar</a><a className="button button--secondary" href="/acceso">Ir al acceso</a></div>
    </div>
  </main>;
}
