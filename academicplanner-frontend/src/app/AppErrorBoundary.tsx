import { Component, type ReactNode } from 'react';
import { Brand } from '../components/Brand';

/** Last resort for provider errors outside the router. Never inspect or persist the cause. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main id="main-content" className="recovery-page" role="alert">
      <div className="recovery-page__card">
        <Brand />
        <span className="recovery-page__icon" aria-hidden="true">↻</span>
        <p className="section-label">Tu información sigue protegida</p>
        <h1>Necesitamos recargar esta parte.</h1>
        <p>Tu horario guardado no se modificó. Puedes reiniciar AcademicPlanner para intentarlo otra vez.</p>
        <div className="recovery-page__actions"><a className="button" href="/">Reintentar</a><a className="button button--secondary" href="/acceso">Ir al acceso</a></div>
      </div>
    </main>;
  }
}
