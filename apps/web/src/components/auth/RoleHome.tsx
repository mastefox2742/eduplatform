import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { UserRole } from '@school/shared-types'

/**
 * Redirige la racine vers l'espace correspondant au rôle.
 *
 * La racine envoyait tout le monde vers `/direction`. Un enseignant qui
 * se connectait arrivait donc sur « Accès refusé » — sur sa propre
 * application, dès la page d'accueil.
 *
 * Un rôle sans espace web (élève, parent : applications mobiles) est
 * renvoyé vers une page qui l'explique, plutôt que vers un refus sec.
 */
export function RoleHome() {
  const { role } = useAuthStore()

  switch (role) {
    case UserRole.DIRECTION:
    case UserRole.ADMIN:
      return <Navigate to="/direction" replace />

    case UserRole.TEACHER:
      return <Navigate to="/teacher" replace />

    default:
      // Élève et parent n'ont pas d'espace web : leurs écrans sont
      // dans l'application mobile.
      return <Navigate to="/unauthorized" replace />
  }
}
