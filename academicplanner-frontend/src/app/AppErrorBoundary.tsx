import { Component, type ReactNode } from 'react';

/** Last resort for provider errors outside the router. Never inspect or persist the cause. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main id="main-content" className="recovery-page" role="alert">
      <h1>No pudimos abrir esta pantalla.</h1>
      <p>Vuelve a cargar la aplicación para intentarlo de nuevo. Tu horario guardado se conserva.</p>
      <a className="button button--secondary" href="/">Volver a intentar</a>
    </main>;
  }
}
