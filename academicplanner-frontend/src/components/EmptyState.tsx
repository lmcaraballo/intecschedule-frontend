import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: IconName;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ title, description, icon = 'leaf', action, compact = false }: EmptyStateProps) {
  return <section className={compact ? 'empty-day' : 'empty-state'}>
    <Icon name={icon} />
    <h2>{title}</h2>
    <p>{description}</p>
    {action}
  </section>;
}
