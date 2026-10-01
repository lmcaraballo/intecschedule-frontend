import { Icon } from './Icon';

const leaves = Array.from({ length: 9 }, (_, index) => index + 1);

/** Decorative ambient layer. Motion is disabled through CSS for reduced-motion preferences. */
export function BreezeBackground() {
  return <div className="breeze-background" aria-hidden="true">
    <span className="breeze-current breeze-current--one" />
    <span className="breeze-current breeze-current--two" />
    {leaves.map((leaf) => <span className={`breeze-leaf breeze-leaf--${leaf}`} key={leaf}>
      <Icon name="leaf" />
    </span>)}
  </div>;
}
