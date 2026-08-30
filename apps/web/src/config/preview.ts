import { UserRole } from '@school/shared-types'

/**
 * Mode aperçu — navigation dans l'application sans backend.
 *
 * ## Pourquoi ce mode existe
 *
 * Sans Firebase ni Supabase configuré, l'application s'arrête à l'écran
 * de connexion : impossible de relire un écran, de vérifier une mise en
 * page ou de montrer le produit à un tiers.
 *
 * ## Ce que ce mode n'est PAS
 *
 * Ce n'est **pas** la réintroduction du bypass `?demo=` supprimé lors de
 * l'audit de sécurité. Cette faille permettait, sur une application
 * déployée et connectée à des données réelles, d'atteindre n'importe
 * quelle route en ajoutant un paramètre d'URL.
 *
 * Quatre différences le séparent de cette faille :
 *
 *  1. **Il ne s'active pas par l'URL.** Il faut une variable
 *     d'environnement au moment du build.
 *  2. **Il est impossible en production.** `import.meta.env.PROD` le
 *     désarme, quelle que soit la variable.
 *  3. **Il n'ouvre l'accès à rien.** Aucun backend n'est joignable dans
 *     ce mode ; les écrans affichent leurs jeux de démonstration
 *     internes. Il n'y a pas de donnée réelle à exposer.
 *  4. **Il se voit.** Une bannière permanente le rappelle à l'écran.
 *
 * ## Usage
 *
 *   VITE_PREVIEW_MODE=true pnpm --filter @school/web dev
 *
 * Puis `/?role=direction` ou `/?role=teacher` pour choisir la vue.
 */

const REQUESTED = import.meta.env.VITE_PREVIEW_MODE === 'true'

/**
 * Le mode est refusé en production, sans condition.
 * Un build de production qui embarquerait la variable resterait sûr.
 */
export const PREVIEW_MODE = REQUESTED && import.meta.env.DEV

export interface PreviewIdentity {
  displayName: string
  role: UserRole
  schoolName: string
  email: string
}

const IDENTITIES: Record<string, PreviewIdentity> = {
  direction: {
    displayName: 'Mme Nsimba',
    role: UserRole.DIRECTION,
    schoolName: 'Lycée La Référence · Brazzaville',
    email: 'direction@apercu.local',
  },
  teacher: {
    displayName: 'M. Okemba Jean-Paul',
    role: UserRole.TEACHER,
    schoolName: 'Lycée La Référence · Brazzaville',
    email: 'enseignant@apercu.local',
  },
}

const STORAGE_KEY = 'projetto1:preview-role'

/**
 * Identité choisie via `?role=`, direction par défaut.
 *
 * Le choix est mémorisé pour la session : la racine redirige vers
 * l'espace du rôle (`/teacher`), ce qui efface le paramètre d'URL.
 * Sans mémorisation, on repasserait en direction au premier saut.
 */
export function previewIdentity(): PreviewIdentity {
  if (!PREVIEW_MODE) throw new Error('Mode aperçu inactif')

  const fromUrl = new URLSearchParams(window.location.search).get('role')
  if (fromUrl && IDENTITIES[fromUrl]) {
    sessionStorage.setItem(STORAGE_KEY, fromUrl)
    return IDENTITIES[fromUrl]
  }

  const stored = sessionStorage.getItem(STORAGE_KEY)
  return IDENTITIES[stored ?? ''] ?? IDENTITIES.direction
}

/** Rôle actif, pour l'affichage du bandeau. */
export function previewRoleKey(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('role')
  return fromUrl ?? sessionStorage.getItem(STORAGE_KEY) ?? 'direction'
}

export const PREVIEW_ROLES = Object.entries(IDENTITIES).map(([key, id]) => ({
  key,
  label: id.role === UserRole.DIRECTION ? 'Direction' : 'Enseignant',
  name: id.displayName,
}))
