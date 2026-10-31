import { Link } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/utils/format';

export function Logo({
  className,
  dark = false,
  compact = false,
}: {
  className?: string;
  dark?: boolean;
  compact?: boolean;
}) {
  return (
    <Link to="/" className={cn('group inline-flex items-center gap-2.5', className)} aria-label="SPACEXCHANGE home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-white shadow-sm transition group-hover:bg-navy-800">
        <ArrowLeftRight className="h-4.5 w-4.5" strokeWidth={2.4} />
      </span>
      {!compact ? (
        <span
          className={cn(
            'text-[15px] font-bold uppercase tracking-[0.14em]',
            dark ? 'text-white' : 'text-ink',
          )}
        >
          Space<span className={dark ? 'text-navy-300' : 'text-navy-600'}>X</span>change
        </span>
      ) : null}
    </Link>
  );
}
