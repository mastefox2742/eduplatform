/**
 * useSchoolConfig — Configuration académique persistée dans Firestore
 *
 * Utilisé par :
 *  - (direction)/config.tsx → lit et écrit la configuration de l'école
 *
 * La configuration est stockée dans un seul document :
 *   schools/{schoolId}/school_config/main
 *
 * Générique : T = forme de l'objet config. Le caller passe defaultConfig
 * qui sert à la fois de valeur initiale ET de type. Firebase merge dessus.
 */
import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/services/firestore'

export function useSchoolConfig<T extends Record<string, any>>(
  schoolId: string,
  defaultConfig: T,
) {
  const [config,  setConfig]  = useState<T>(defaultConfig)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)

  // ── Chargement temps réel ─────────────────────────────────────────────────

  useEffect(() => {
    if (!schoolId || schoolId === 'demo') return

    setLoading(true)
    const ref = doc(db, 'schools', schoolId, 'school_config', 'main')

    const unsub = onSnapshot(ref,
      snap => {
        if (snap.exists()) {
          // Merge : les champs Firestore écrasent les valeurs par défaut
          setConfig(prev => ({ ...prev, ...snap.data() } as T))
        }
        setLoading(false)
      },
      _err => setLoading(false),
    )

    return unsub
  }, [schoolId])

  // ── Sauvegarde ────────────────────────────────────────────────────────────

  const saveConfig = useCallback(async (data: T) => {
    if (!schoolId || schoolId === 'demo') return
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'schools', schoolId, 'school_config', 'main'),
        { ...data, updatedAt: serverTimestamp() },
        { merge: true },
      )
    } catch (e) {
      console.warn('[useSchoolConfig] saveConfig failed:', e)
      throw e   // re-throw pour que l'appelant puisse afficher une alerte d'erreur
    } finally {
      setSaving(false)
    }
  }, [schoolId])

  return { config, setConfig, loading, saving, saveConfig }
}
