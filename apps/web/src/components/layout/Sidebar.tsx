import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'
import { logout } from '@/hooks/useAuth'
import { Icon, ICONS } from '@/components/ui/Icon'
import { UserRole } from '@school/shared-types'

/**
 * Navigation latérale — reprise de la maquette `direction---web-dashboard`.
 *
 * Trois écarts assumés avec l'ancienne version :
 *
 *  - Fond clair (`card`) au lieu du gris anthracite. Les maquettes
 *    posent une barre claire séparée par une bordure ; c'est ce qui
 *    donne au produit son air d'outil administratif et non de console.
 *  - Les entrées sont **groupées par métier** (Direction générale,
 *    Pédagogie & Examens…), comme dans la maquette. Un directeur qui
 *    cumule le rôle de DE retrouve ainsi ses deux casquettes séparées.
 *  - Chaque entrée peut porter un **compteur de charge** : « 28 »
 *    bulletins à valider, « 84 % recouv. ». C'est ce qui transforme
 *    une liste de liens en tableau de bord permanent.
 */

// Mode démo uniquement si la variable d'env est explicitement activée (jamais en prod)
const DEMO_ALLOWED = import.meta.env.VITE_ALLOW_DEMO_MODE === 'true'
const DEMO_ROLE = DEMO_ALLOWED
  ? (new URLSearchParams(window.location.search).get('demo') as UserRole | null)
  : null
const DEMO_PROFILES: Record<string, { displayName: string; role: UserRole }> = {
  direction: { displayName: 'Marie Kourouma', role: UserRole.DIRECTION },
  teacher:   { displayName: 'M. Jean Leblanc', role: UserRole.TEACHER },
}

interface NavEntry {
  to: string
  label: string
  icon: string
  /** Compteur affiché à droite : nombre en attente, ou indicateur. */
  badge?: { value: string; tone: 'accent' | 'secondary' | 'danger' }
}

interface NavGroup {
  label: string
  items: NavEntry[]
}

const DIRECTION_GROUPS: NavGroup[] = [
  {
    label: 'Direction générale',
    items: [
      { to: '/direction',             label: 'Tableau de bord',      icon: ICONS.dashboard },
      { to: '/direction/bulletins',   label: 'Validation bulletins', icon: ICONS.bulletin },
      { to: '/direction/students',    label: 'Élèves & inscriptions', icon: ICONS.students },
      { to: '/direction/teachers',    label: 'Corps enseignant',     icon: ICONS.teachers },
      { to: '/direction/budget',      label: 'Finance & caisse',     icon: ICONS.finance },
    ],
  },
  {
    label: 'Pédagogie & examens',
    items: [
      { to: '/direction/classes',      label: 'Classes & niveaux',    icon: ICONS.classes },
      { to: '/direction/schedule',     label: 'Emplois du temps',     icon: ICONS.calendar },
      { to: '/direction/assessments',  label: 'Devoirs & examens',    icon: ICONS.checklist },
      { to: '/direction/exams',        label: 'Examens d’État',  icon: ICONS.diploma },
      { to: '/direction/exam-results', label: 'Résultats officiels',  icon: ICONS.trophy },
    ],
  },
  {
    label: 'Vie scolaire & suivi',
    items: [
      { to: '/direction/attendance', label: 'Présence enseignants', icon: ICONS.attendance },
      { to: '/direction/reports',    label: 'Rapports & inspection', icon: ICONS.reports },
      { to: '/direction/exports',    label: 'Documents & exports',   icon: ICONS.download },
      { to: '/direction/settings',   label: 'Paramètres',            icon: ICONS.settings },
    ],
  },
]

const TEACHER_GROUPS: NavGroup[] = [
  {
    label: 'Ma journée',
    items: [
      { to: '/teacher',          label: 'Tableau de bord',     icon: ICONS.dashboard },
      { to: '/teacher/schedule', label: 'Mon emploi du temps', icon: ICONS.calendar },
      { to: '/teacher/classes',  label: 'Mes classes',         icon: ICONS.classes },
    ],
  },
  {
    label: 'Enseignement',
    items: [
      { to: '/teacher/courses',      label: 'Cours & cahier de textes', icon: ICONS.courses },
      { to: '/teacher/exercises',    label: 'Exercices',                icon: ICONS.homework },
      { to: '/teacher/assessments',  label: 'Mes évaluations',          icon: ICONS.checklist },
      { to: '/teacher/gradebook',    label: 'Carnet de notes',          icon: ICONS.grades },
    ],
  },
]

const BADGE_TONES = {
  accent:    'bg-accent text-accent-foreground',
  secondary: 'text-secondary font-semibold',
  danger:    'bg-destructive text-white',
} as const

export function Sidebar() {
  const { profile, role: storeRole } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  const demoProfile = DEMO_ROLE ? DEMO_PROFILES[DEMO_ROLE] : null
  const activeProfile = demoProfile ?? profile
  const role = demoProfile?.role ?? storeRole

  const groups =
    role === UserRole.DIRECTION || role === UserRole.ADMIN
      ? DIRECTION_GROUPS
      : TEACHER_GROUPS

  const collapsed = sidebarCollapsed

  return (
    <aside
      className={cn(
        'flex flex-col justify-between bg-card border-r border-border',
        'h-screen sticky top-0 transition-all duration-300 p-4',
        collapsed ? 'w-[76px]' : 'w-72'
      )}
    >
      <div className="space-y-6 overflow-y-auto no-scrollbar">
        {/* ── Identité produit et établissement ──────────────────── */}
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-heading font-extrabold text-lg shadow-sm shrink-0">
            P1
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-bold text-base tracking-tight truncate">
                  Projetto1
                </span>
                <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  ERP
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {'schoolName' in (activeProfile ?? {})
                  ? String((activeProfile as { schoolName?: string }).schoolName)
                  : 'Établissement'}
              </p>
            </div>
          )}
        </div>

        {/* ── Contexte actif : année et période (§3.1) ───────────── */}
        {/* Chaque écran doit afficher le contexte courant. Sans ce
            rappel, un utilisateur qui bascule d'année saisit des
            notes dans la mauvaise période sans s'en apercevoir. */}
        {!collapsed && (
          <button
            type="button"
            className="w-full bg-input/70 border border-border rounded-xl p-2.5 flex items-center justify-between hover:bg-muted/70 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Icon name={ICONS.calendarBold} size={16} className="text-secondary shrink-0" />
              <div className="text-xs text-left min-w-0">
                <span className="font-semibold block truncate">Année 2025–2026</span>
                <span className="text-muted-foreground text-[11px]">Trimestre 2 · En cours</span>
              </div>
            </div>
            <Icon name={ICONS.chevronDown} size={14} className="text-muted-foreground shrink-0" />
          </button>
        )}

        {/* ── Navigation groupée par métier ──────────────────────── */}
        <nav className="space-y-1">
          {groups.map((group) => (
            <div key={group.label} className="pb-2">
              {!collapsed && (
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 mt-3 first:mt-0">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/direction' || item.to === '/teacher'}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                      collapsed && 'justify-center px-2',
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'text-foreground hover:bg-muted/70 font-medium'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        name={item.icon}
                        size={20}
                        className={cn('shrink-0', !isActive && 'text-primary')}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={cn(
                                'text-[11px] px-2 py-0.5 rounded-full shrink-0',
                                isActive
                                  ? 'bg-primary-foreground/20 text-primary-foreground font-bold'
                                  : BADGE_TONES[item.badge.tone]
                              )}
                            >
                              {item.badge.value}
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* ── Pied : compte et repli ─────────────────────────────── */}
      <div className="space-y-2 pt-3 border-t border-border">
        <div
          className={cn(
            'flex items-center gap-3 px-2 py-2 rounded-xl',
            collapsed && 'justify-center px-0'
          )}
        >
          <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading font-bold text-sm shrink-0">
            {(activeProfile?.displayName ?? '?').charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">
                {activeProfile?.displayName ?? 'Utilisateur'}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {role === UserRole.DIRECTION || role === UserRole.ADMIN
                  ? 'Direction'
                  : 'Enseignant'}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => void logout()}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
            'text-destructive hover:bg-destructive/10 transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          <Icon name={ICONS.logout} size={20} className="shrink-0" />
          {!collapsed && <span>Se déconnecter</span>}
        </button>

        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs',
            'text-muted-foreground hover:bg-muted/70 transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          <Icon
            name={ICONS.back}
            size={16}
            className={cn('shrink-0 transition-transform', collapsed && 'rotate-180')}
          />
          {!collapsed && <span>Replier</span>}
        </button>
      </div>
    </aside>
  )
}
