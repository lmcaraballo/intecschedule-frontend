import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { Icon } from './Icon';

/** Mount only while open; native modal plus explicit tab cycling and focus return. */
export function Dialog({ title, children, onClose, className = '' }: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
      const target = opener?.isConnected ? opener : document.querySelector<HTMLElement>('#page-title');
      target?.focus({ preventScroll: true });
    };
  }, []);

  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]'));
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  return createPortal(<dialog ref={dialog} className={`app-dialog ${className}`} aria-labelledby={id}
    onKeyDown={containFocus} onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <header className="detail-toolbar"><h2 id={id}>{title}</h2><Button variant="plain" autoFocus className="icon-button" onClick={onClose} aria-label={`Cerrar ${title.toLowerCase()}`}><Icon name="close" /></Button></header>
    {children}
  </dialog>, document.body);
}
