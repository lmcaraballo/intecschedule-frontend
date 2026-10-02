import { appConfig } from '../app/appConfig';
import { Icon } from './Icon';

export function BrandSplash({
  message = 'Organizando tu espacio académico',
  loading = false,
}: {
  message?: string;
  loading?: boolean;
}) {
  return <div
    className={`brand-splash${loading ? ' brand-splash--loading' : ''}`}
    role="status"
    aria-live="polite"
    aria-label={message}
  >
    <div className="brand-splash__glow" aria-hidden="true" />
    <span className="brand-splash__orbit brand-splash__orbit--one" aria-hidden="true" />
    <span className="brand-splash__orbit brand-splash__orbit--two" aria-hidden="true" />
    <div className="brand-splash__content">
      <span className="brand-splash__mark" aria-hidden="true"><Icon name="pine" /></span>
      <strong>{appConfig.name}</strong>
      <span>{message}</span>
      <span className="brand-splash__progress" aria-hidden="true"><i /></span>
    </div>
    <Icon className="brand-splash__leaf brand-splash__leaf--one" name="leaf" aria-hidden="true" />
    <Icon className="brand-splash__leaf brand-splash__leaf--two" name="leaf" aria-hidden="true" />
    <Icon className="brand-splash__leaf brand-splash__leaf--three" name="leaf" aria-hidden="true" />
  </div>;
}
