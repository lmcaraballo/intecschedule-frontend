import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function StatusBanner({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'success' }) {
  return <div className={`status-banner status-banner--${tone}`} role="status"><Icon name={tone === 'success' ? 'check' : tone === 'warning' ? 'alert' : 'lock'} /><div>{children}</div></div>;
}
