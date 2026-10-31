import { cn, initials } from '@/utils/format';

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'h-8 w-8 text-[11px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-14 w-14 text-base',
  };
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-navy-900 font-semibold text-white',
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials(name) || 'SX'}
    </div>
  );
}
