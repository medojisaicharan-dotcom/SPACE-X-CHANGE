import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/format';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  requiredMark?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, requiredMark, ...props },
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
      <textarea
        ref={ref}
        id={inputId}
        className={cn('input-base min-h-[100px] resize-y', error && 'border-rose-400', className)}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});
