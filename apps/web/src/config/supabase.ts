/**
 * Client Supabase — web
 *
 * Première pierre de la migration §24.2. Le web tourne encore
 * sur Firebase ; ce client est introduit verticale par verticale,
 * sans double écriture durable.
 *
 * Variables requises dans .env.local :
 *   VITE_SUPABASE_URL=https://xxxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
 *
 * La clé anon est publique : elle est protégée par RLS. La clé
 * service_role ne doit JAMAIS entrer dans un bundle client (§21.4).
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquante. ' +
    'Copier .env.example vers .env.local.'
  )
}

export const supabase = createClient(
  SUPABASE_URL ?? 'http://localhost:54321',
  SUPABASE_ANON_KEY ?? 'anon',
  {
    auth: {
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: true,
      storageKey:         'projetto1-auth',
    },
    global: {
      headers: { 'x-app-surface': 'web' },
    },
  }
)

/** Vrai si la configuration Supabase est exploitable. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/**
 * Drapeau de bascule par verticale (§ plan de rollback).
 * Tant qu'une verticale est à `false`, le web lit Firebase.
 * On bascule une verticale à la fois, et on retire le chemin
 * Firebase dès qu'elle est validée.
 */
export const SUPABASE_VERTICALS = {
  referentiel: import.meta.env.VITE_SB_REFERENTIEL === 'true',
  identite:    import.meta.env.VITE_SB_IDENTITE    === 'true',
  vieScolaire: import.meta.env.VITE_SB_VIE_SCOLAIRE === 'true',
  pedagogie:   import.meta.env.VITE_SB_PEDAGOGIE   === 'true',
  finance:     import.meta.env.VITE_SB_FINANCE     === 'true',
} as const

export type Vertical = keyof typeof SUPABASE_VERTICALS

export function usesSupabase(vertical: Vertical): boolean {
  return isSupabaseConfigured && SUPABASE_VERTICALS[vertical]
}

/**
 * Génère une URL signée pour un fichier privé.
 *
 * §21.2 : « les documents sensibles sont protégés par autorisation
 * serveur, pas uniquement par une URL secrète ». RLS vérifie le droit
 * d'accès avant de signer ; l'URL expire vite.
 */
export async function signedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds)

  if (error) {
    console.warn(`[Storage] Signature refusée pour ${bucket}/${path}:`, error.message)
    return null
  }
  return data.signedUrl
}

/**
 * Construit un chemin Storage conforme à la convention obligatoire :
 *   <school_id>/<entité_id>/<fichier>
 * Le premier segment porte le tenant — c'est lui que vérifient les
 * policies. Un chemin hors convention sera rejeté.
 */
export function storagePath(schoolId: string, entityId: string, filename: string): string {
  const safe = filename.replace(/[^\w.-]/g, '_')
  return `${schoolId}/${entityId}/${Date.now()}_${safe}`
}
