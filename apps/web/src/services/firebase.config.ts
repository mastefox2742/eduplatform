/**
 * Détecte si Firebase est vraiment configuré (les clés ne sont pas les placeholders).
 * Permet de basculer automatiquement entre mode Firestore et mode démo local.
 */
import { db } from '@/config/firebase'

export function isFirebaseConfigured(): boolean {
  try {
    // @ts-ignore — accès interne pour vérifier l'app
    const projectId: string = db.app.options.projectId ?? ''
    return projectId !== '' && projectId !== 'REPLACE_ME'
  } catch {
    return false
  }
}

/** Returns true when running with real Firebase credentials */
export const FIREBASE_READY = isFirebaseConfigured()
