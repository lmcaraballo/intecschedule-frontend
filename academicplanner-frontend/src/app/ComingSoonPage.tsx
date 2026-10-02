import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState';

export function ComingSoonPage({ title }: { title: 'Eventos' | 'Más' }) {
  return <main id="main-content" className="academic-page"><header className="page-heading"><div><p className="page-eyebrow">Tu espacio sigue creciendo</p><h1 id="page-title" tabIndex={-1}>{title}</h1></div></header><EmptyState title="Próximamente" description="Esta sección estará disponible en una próxima etapa." action={<Link to="/ahora" className="button button--secondary">Volver a Ahora</Link>} /></main>;
}
