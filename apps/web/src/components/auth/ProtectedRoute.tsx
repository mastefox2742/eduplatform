import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { PREVIEW_MODE } from '@/config/preview'
import type { UserRole } from '@school/shared-types'

// ⚠️ Le bypass `?demo=` reste SUPPRIMÉ : atteindre n'importe quelle route
// par un simple paramètre d'URL, sur une application connectée à des
// données réelles, est une faille critique.
//
// `PREVIEW_MODE` est autre chose. Il exige une variable d'environnement
// au moment du build, il est désarmé dès que `import.meta.env.PROD` est
// vrai, et il n'ouvre l'accès à aucune donnée : aucun backend n'est
// joignable dans ce mode, les écrans affichent leurs jeux de
// démonstration internes. Voir config/preview.ts.

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-secondary">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  // En aperçu, aucune session n'existe et il n'y a rien à protéger : les
  // écrans affichent leurs jeux de démonstration internes.
  if (!isAuthenticated && !PREVIEW_MODE) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
