import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string;
  trailing?: ReactNode;
}

export function Input({ label, error, hint, trailing, id, className = '', ...props }: InputProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const description = [hint ? `${fieldId}-hint` : '', error ? `${fieldId}-error` : '', props['aria-describedby'] ?? ''].filter(Boolean).join(' ');
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="field__control">
        <input {...props} id={fieldId} className={`input ${trailing ? 'input--trailing' : ''} ${className}`} aria-invalid={Boolean(error)} aria-describedby={description || undefined} />
        {trailing && <div className="field__trailing">{trailing}</div>}
      </div>
      {hint && <p className="field__hint" id={`${fieldId}-hint`}>{hint}</p>}
      {error && <p className="field__error" id={`${fieldId}-error`}>{error}</p>}
    </div>
  );
}
