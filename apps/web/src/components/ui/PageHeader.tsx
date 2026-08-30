import { Icon } from './Icon'
import { cn } from '@/lib/utils'

/**
 * En-tête de page et barre d'onglets — motif répété par les écrans de
 * la direction. Extrait ici pour que six pages ne réinventent pas six
 * fois la même hiérarchie typographique.
 */
export function PageHeader({
  title, subtitle, count, action,
}: {
  title: string
  subtitle?: string
  count?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>
          {count && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {count}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export interface TabDef<T extends string> {
  key: T
  label: string
  count?: number
}

export function Tabs<T extends string>({
  tabs, active, onChange,
}: {
  tabs: readonly TabDef<T>[]
  active: T
  onChange: (key: T) => void
}) {
  return (
    <div
      role="tablist"
      className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1"
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            active === t.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/70'
          )}
        >
          {t.label}
          {t.count != null && ` (${t.count})`}
        </button>
      ))}
    </div>
  )
}

/**
 * Bandeau d'information contextuel. Les écrans de la direction portent
 * des règles métier qui ne se devinent pas (« signer ne publie pas »,
 * « un brouillon de paie ne se décaisse pas ») : elles sont dites à
 * l'écran, pas seulement dans la documentation.
 */
export function RuleNote({
  icon, tone = 'info', children,
}: {
  icon: string
  tone?: 'info' | 'warning'
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border p-3 mb-4 text-sm',
        tone === 'warning'
          ? 'border-accent/30 bg-accent/10 text-accent-700'
          : 'border-primary/20 bg-primary/5 text-foreground'
      )}
    >
      <Icon name={icon} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
