import { NavLink } from 'react-router';
import { Icon, type IconName } from './Icon';

const items: { to: string; label: string; icon: IconName }[] = [
  { to: '/ahora', label: 'Ahora', icon: 'sun' },
  { to: '/horario', label: 'Horario', icon: 'calendar' },
  { to: '/eventos', label: 'Eventos', icon: 'spark' },
  { to: '/mas', label: 'Más', icon: 'more' },
];

export function PrimaryNavigation() {
  return <nav className="primary-nav" aria-label="Navegación principal">{items.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `primary-nav__link${isActive ? ' is-active' : ''}`}><Icon name={item.icon} /><span>{item.label}</span></NavLink>)}</nav>;
}
