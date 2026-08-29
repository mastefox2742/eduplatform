/// <reference types="vite/client" />

/**
 * Typage des variables d'environnement du bundle web.
 *
 * Sans ce fichier, `import.meta.env` n'existe pas pour TypeScript et
 * `pnpm type-check` échoue sur chaque accès (TS2339).
 *
 * Rappel §21.4 : seules des valeurs publiques ont leur place ici.
 * Une clé service_role ou un secret de paiement dans un `VITE_*`
 * se retrouve dans le bundle livré au navigateur.
 */
interface ImportMetaEnv {
  // Firebase (backend historique, en cours de retrait)
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_USE_FIREBASE_EMULATORS?: string

  // Supabase (backend cible)
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string

  // Drapeaux de bascule, une verticale à la fois (§24.2)
  readonly VITE_SB_REFERENTIEL?: string
  readonly VITE_SB_IDENTITE?: string
  readonly VITE_SB_VIE_SCOLAIRE?: string
  readonly VITE_SB_PEDAGOGIE?: string
  readonly VITE_SB_FINANCE?: string

  readonly VITE_APP_VERSION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
