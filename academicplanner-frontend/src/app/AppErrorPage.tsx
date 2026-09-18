import { Link } from 'react-router';
import { ErrorState } from '../components/ErrorState';

/** Route errors never render the exception, stack, request or credentials. */
export function AppErrorPage() {
  return <main id="main-content" className="recovery-page">
    <h1>No pudimos abrir esta pantalla.</h1>
    <ErrorState message="Algo no salió como esperábamos. Vuelve al acceso e inténtalo de nuevo." />
    <Link className="button button--secondary" to="/">Volver al acceso</Link>
  </main>;
}
