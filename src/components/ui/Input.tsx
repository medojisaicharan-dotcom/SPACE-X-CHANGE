import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/format';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  rightSlot?: ReactNode;
  requiredMark?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, rightSlot, className, id, requiredMark, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="label-base">
          {label}
          {requiredMark ? <span className="ml-0.5 text-rose-500">*</span> : null}
        </label>
      ) : null}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'input-base',
            rightSlot && 'pr-11',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-100',
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {rightSlot ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">{rightSlot}</div>
        ) : null}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
