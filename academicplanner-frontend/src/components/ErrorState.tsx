import { Icon } from './Icon';

export function ErrorState({ message }: { message: string }) {
  return <div className="error-state" role="alert"><Icon name="alert" /><p>{message}</p></div>;
}
