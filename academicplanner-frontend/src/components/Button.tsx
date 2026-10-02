import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'plain';
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  const base = variant === 'plain' ? 'control-button' : `button button--${variant}`;
  return <button type={type} className={`${base} ${className}`} {...props} />;
}
