import { LocalDataSettings } from './LocalDataSettings';
import { PreferencesSettings } from './PreferencesSettings';

export function MorePage() {
  return <main id="main-content" className="academic-page">
    <header className="page-heading"><div><p className="page-eyebrow">Un espacio bajo tu control</p><h1 id="page-title" tabIndex={-1}>Más</h1><p className="page-date">Información y datos guardados.</p></div></header>
    <PreferencesSettings />
    <LocalDataSettings />
  </main>;
}
