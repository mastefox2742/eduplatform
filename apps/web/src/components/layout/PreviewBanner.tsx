import { PREVIEW_MODE, PREVIEW_ROLES, previewIdentity, previewRoleKey } from '@/config/preview'
import { Icon, ICONS } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

/**
 * Bandeau du mode aperçu.
 *
 * Il doit être impossible de croire qu'on regarde des données réelles.
 * Le bandeau reste affiché en permanence, en haut de chaque écran, et
 * permet de basculer d'un rôle à l'autre pour comparer les vues.
 */
export function PreviewBanner() {
  if (!PREVIEW_MODE) return null

  const identity = previewIdentity()
  const current = previewRoleKey()

  return (
    <div className="sticky top-0 z-50 bg-accent text-accent-foreground border-b border-accent-700/30">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name={ICONS.warning} size={16} className="shrink-0" />
          <p className="text-xs font-semibold truncate">
            Mode aperçu — données de démonstration, aucun backend connecté
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] opacity-80 hidden sm:inline">
            Connecté comme {identity.displayName} :
          </span>
          {PREVIEW_ROLES.map((r) => (
            <a
              key={r.key}
              href={`/?role=${r.key}`}
              className={cn(
                'text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors',
                current === r.key
                  ? 'bg-accent-foreground text-accent'
                  : 'bg-accent-foreground/15 hover:bg-accent-foreground/25'
              )}
            >
              {r.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
