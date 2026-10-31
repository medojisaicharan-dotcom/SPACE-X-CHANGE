import type { ReactNode } from 'react';
import { cn } from '@/utils/format';

type Tone = 'slate' | 'navy' | 'green' | 'amber' | 'rose' | 'purple' | 'sky' | 'teal';

const TONES: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  navy: 'bg-navy-50 text-navy-700 border-navy-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
};

export function Badge({
  children,
  tone = 'slate',
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
