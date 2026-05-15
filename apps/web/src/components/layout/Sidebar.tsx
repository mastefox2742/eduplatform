import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardList, BarChart3, Settings, LogOut,
  ChevronLeft, School, Bell, FileText, Clock, Calendar, Award, Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'
import { logout } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { UserRole } from '@school/shared-types'

const DEMO_ROLE = new URLSearchParams(window.location.search).get('demo') as UserRole | null
const DEMO_PROFILES: Record<string, { displayName: string; role: UserRole }> = {
  direction: { displayName: 'Marie Kourouma', role: UserRole.DIRECTION },
  teacher:   { displayName: 'M. Jean Leblanc', role: UserRole.TEACHER },
}

const DIRECTION_NAV = [
  { to: '/direction',              label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/direction/students',     label: 'Élèves',          icon: GraduationCap   },
  { to: '/direction/teachers',     label: 'Professeurs',     icon: Users           },
  { to: '/direction/classes',      label: 'Classes',         icon: School          },
  { to: '/direction/assessments',  label: 'Devoirs & Examens', icon: FileText      },
  { to: '/direction/attendance',   label: 'Présence profs',  icon: Clock           },
  { to: '/direction/schedule',     label: 'Emplois du temps',icon: Calendar        },
  { to: '/direction/exams',        label: 'Inscriptions examens', icon: Award      },
  { to: '/direction/exam-results', label: 'Résultats examens',    icon: Trophy     },
  { to: '/direction/reports',      label: 'Rapports',        icon: BarChart3       },
  { to: '/direction/settings',     label: 'Paramètres',      icon: Settings        },
]

const TEACHER_NAV = [
  { to: '/teacher',               label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/teacher/schedule',      label: 'Mon emploi du temps', icon: Calendar    },
  { to: '/teacher/assessments',   label: 'Mes évaluations', icon: FileText        },
  { to: '/teacher/classes',       label: 'Mes classes',     icon: School          },
  { to: '/teacher/courses',       label: 'Cours',           icon: BookOpen        },
  { to: '/teacher/exercises',     label: 'Exercices',       icon: ClipboardList   },
  { to: '/teacher/gradebook',     label: 'Carnet de notes', icon: BarChart3       },
]

export function Sidebar() {
  const { profile, role: storeRole } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  const demoProfile = DEMO_ROLE ? DEMO_PROFILES[DEMO_ROLE] : null
  const activeProfile = demoProfile ?? profile
  const role = demoProfile?.role ?? storeRole

  const navItems = role === UserRole.DIRECTION || role === UserRole.ADMIN
    ? DIRECTION_NAV
    : TEACHER_NAV

  return (
    <aside
      className={cn(
        'flex flex-col bg-gray-900 text-white transition-all duration-300 h-screen sticky top-0',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <School size={18} />
        </div>
        {!sidebarCollapsed && (
          <span className="font-bold text-base truncate">EduPlatform</span>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'ml-auto text-gray-400 hover:text-white transition-colors',
            sidebarCollapsed && 'rotate-180'
          )}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to.split('/').length === 2}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {!sidebarCollapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Notifications */}
      <div className="px-3 py-2 border-t border-gray-800">
        <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
          <Bell size={18} className="flex-shrink-0" />
          {!sidebarCollapsed && <span>Notifications</span>}
        </button>
      </div>

      {/* User */}
      <div className={cn('flex items-center gap-3 px-4 py-4 border-t border-gray-800', sidebarCollapsed && 'justify-center')}>
        {activeProfile && <Avatar name={activeProfile.displayName} size="sm" />}
        {!sidebarCollapsed && activeProfile && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{activeProfile.displayName}</p>
            <p className="text-xs text-gray-400 capitalize">{activeProfile.role}</p>
          </div>
        )}
        {!sidebarCollapsed && (
          <button
            onClick={() => logout()}
            className="text-gray-400 hover:text-white transition-colors"
            title="Se déconnecter"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  )
}
