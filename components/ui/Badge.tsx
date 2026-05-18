import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral' | 'info';

const variants: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  error: 'bg-red-500/10 text-red-400 ring-red-500/20',
  neutral: 'bg-gray-500/10 text-gray-400 ring-gray-500/20',
  info: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
