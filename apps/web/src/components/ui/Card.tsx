import { cn } from '@/lib/utils'
import { Icon } from './Icon'

/**
 * Carte du design system — reprise des maquettes :
 * fond `card`, bordure `border`, coins `rounded-2xl`, ombre discrète.
 */
interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
  /** Retire le rembourrage interne (tableaux, listes pleine largeur). */
  flush?: boolean
}

export function Card({ children, className, onClick, hoverable, flush }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-2xl shadow-card',
        !flush && 'p-5',
        hoverable && 'cursor-pointer transition-all hover:shadow-card-hover hover:border-primary/25',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * En-tête de section : titre en Manrope, sous-titre discret, action
 * facultative à droite. C'est la structure répétée dans chaque
 * section des maquettes.
 */
export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-end justify-between mb-3', className)}>
      <div>
        <h2 className="font-heading font-bold text-sm text-foreground">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

type StatTone = 'primary' | 'secondary' | 'accent' | 'danger' | 'neutral'

const TONES: Record<StatTone, { bg: string; fg: string }> = {
  primary:   { bg: 'bg-primary/10',     fg: 'text-primary' },
  secondary: { bg: 'bg-secondary/10',   fg: 'text-secondary' },
  accent:    { bg: 'bg-accent/15',      fg: 'text-accent-600' },
  danger:    { bg: 'bg-destructive/10', fg: 'text-destructive' },
  neutral:   { bg: 'bg-muted',          fg: 'text-muted-foreground' },
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  /** Nom Iconify, ex. `solar:users-group-rounded-outline`. */
  icon?: string
  /** Conservé pour les écrans qui passent encore un élément lucide. */
  iconNode?: React.ReactNode
  tone?: StatTone
  trend?: { value: number; label: string }
  onClick?: () => void
}

/**
 * Tuile d'indicateur. Dans les maquettes, la valeur est en Manrope
 * gras, l'icône dans une pastille teintée, et la tendance en teal
 * ou en rouge selon le signe.
 */
export function StatCard({
  title, value, subtitle, icon, iconNode, tone = 'primary', trend, onClick,
}: StatCardProps) {
  const t = TONES[tone]

  return (
    <Card hoverable={!!onClick} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 font-heading text-3xl font-bold text-foreground tabular">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div
              className={cn(
                'mt-2 flex items-center gap-1 text-xs font-semibold',
                trend.value >= 0 ? 'text-secondary' : 'text-destructive'
              )}
            >
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">{trend.label}</span>
            </div>
          )}
        </div>
        {(icon || iconNode) && (
          <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', t.bg, t.fg)}>
            {icon ? <Icon name={icon} size={20} /> : iconNode}
          </div>
        )}
      </div>
    </Card>
  )
}

/**
 * Ligne d'alerte — le motif « À ne pas manquer » des maquettes
 * direction. Le ton porte le sens : ambre pour ce qui attend,
 * rouge pour ce qui est en retard.
 */
export function AlertRow({
  icon, title, detail, tone = 'accent', action, onClick,
}: {
  icon: string
  title: string
  detail?: string
  tone?: StatTone
  action?: React.ReactNode
  onClick?: () => void
}) {
  const t = TONES[tone]

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border border-border bg-card',
        onClick && 'cursor-pointer transition-colors hover:bg-muted/50'
      )}
    >
      <div className={cn('size-9 rounded-xl flex items-center justify-center shrink-0', t.bg, t.fg)}>
        <Icon name={icon} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-heading font-bold text-sm text-foreground truncate">{title}</p>
        {detail && <p className="text-xs text-muted-foreground truncate">{detail}</p>}
      </div>
      {action}
    </div>
  )
}

/**
 * État vide. Les maquettes n'en montrent pas, mais chaque liste en a
 * besoin — §23 exige des états explicites (chargement, vide, erreur).
 */
export function EmptyState({
  icon = 'solar:document-text-outline', title, detail, action,
}: {
  icon?: string
  title: string
  detail?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="size-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center">
        <Icon name={icon} size={26} />
      </div>
      <p className="mt-3 font-heading font-bold text-sm text-foreground">{title}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground max-w-xs">{detail}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
