import { appConfig } from '../app/appConfig';
import { Icon } from './Icon';

export function Brand() {
  return <span className="brand"><span className="brand__mark"><Icon name="pine" width="27" height="27" /></span><span>{appConfig.name}</span></span>;
}
