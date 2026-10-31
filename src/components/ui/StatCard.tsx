import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/format';

const TONES = {
  navy: 'bg-navy-50 text-navy-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  sky: 'bg-sky-50 text-sky-700',
  purple: 'bg-purple-50 text-purple-700',
  slate: 'bg-slate-100 text-slate-600',
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'navy',
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <div className={cn('card p-5 transition hover:shadow-lift', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
