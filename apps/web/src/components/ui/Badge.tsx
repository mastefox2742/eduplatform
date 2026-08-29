import { cn } from '@/lib/utils'

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'gray' | 'secondary'

interface BadgeProps {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'gray', size = 'md', children, className }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    primary:   'bg-primary/10 text-primary',
    success:   'bg-secondary/10 text-secondary',
    warning:   'bg-accent/15 text-accent-700',
    danger:    'bg-destructive/10 text-destructive',
    purple:    'bg-purple-100 text-purple-700',
    gray:      'bg-muted text-muted-foreground',
    secondary: 'bg-input text-foreground border border-border',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-0.5 text-xs',
  }

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-bold', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}
