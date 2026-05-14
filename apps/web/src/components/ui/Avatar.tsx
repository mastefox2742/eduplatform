import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const COLORS = [
  'bg-primary-100 text-primary-700',
  'bg-success-100 text-success-700',
  'bg-warning-100 text-warning-700',
  'bg-purple-100  text-purple-700',
  'bg-danger-100  text-danger-700',
]

function getColorFromName(name: string) {
  const code = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return COLORS[code % COLORS.length]
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizes[size], className)}
      />
    )
  }

  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold flex-shrink-0', sizes[size], getColorFromName(name), className)}>
      {getInitials(name)}
    </div>
  )
}
