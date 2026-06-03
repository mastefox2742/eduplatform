/**
 * useSyncQueue — Gestion de la file offline + synchronisation automatique
 *
 * Usage :
 *   const { pendingCount, isSyncing, isOnline, sync, queueWrite } = useSyncQueue()
 *
 * - queueWrite()  : tenter l'écriture Firebase, si offline → enqueue localement
 * - sync()        : vider la file (appelé au retour du réseau ou manuellement)
 * - pendingCount  : nb d'opérations en attente (affichable dans l'UI)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import {
  enqueue, flushQueue, getPendingCount, isOfflineError,
  type QueuedOpType, type QueuedOp,
} from '@/services/offlineQueue'
import {
  submitBulletin, validateBulletin, rejectBulletin, publishBulletin,
  saveAttendance, markAnnouncementRead,
} from '@/services/firestore'

// ── Executor : dispatche chaque type d'op vers le bon service Firebase ────────

async function executeOp(op: QueuedOp): Promise<void> {
  const { type, schoolId, payload } = op
  switch (type) {
    case 'submitBulletin':
      await submitBulletin(schoolId, payload.data as any)
      break
    case 'validateBulletin':
      await validateBulletin(schoolId, payload.bulletinId as string, payload.comment as string)
      break
    case 'rejectBulletin':
      await rejectBulletin(schoolId, payload.bulletinId as string, payload.reason as string)
      break
    case 'publishBulletin':
      await publishBulletin(schoolId, payload.bulletinId as string)
      break
    case 'saveAttendance':
      await saveAttendance(
        schoolId,
        payload.classId    as string,
        payload.dateISO    as string,
        payload.teacherId  as string,
        payload.records    as any,
        payload.meta       as any,
      )
      break
    case 'markAnnouncementRead':
      await markAnnouncementRead(schoolId, payload.announcementId as string, payload.userId as string)
      break
    case 'saveSchoolConfig':
      // Importé dynamiquement pour éviter les dépendances circulaires
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      const { db } = await import('@/config/firebase')
      await setDoc(
        doc(db, 'schools', schoolId, 'school_config', 'main'),
        { ...payload.data, updatedAt: serverTimestamp() },
        { merge: true },
      )
      break
    default:
      console.warn('[useSyncQueue] type inconnu:', type)
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSyncQueue() {
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing,    setIsSyncing]    = useState(false)
  const [isOnline,     setIsOnline]     = useState(true)
  const syncingRef = useRef(false)

  const refreshCount = useCallback(async () => {
    const n = await getPendingCount()
    setPendingCount(n)
  }, [])

  /** Vide la file — ne pas appeler si déjà en cours */
  const sync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setIsSyncing(true)

    try {
      const { success, failed } = await flushQueue(executeOp)
      if (success > 0 || failed > 0) {
        console.info(`[useSyncQueue] sync: ${success} succès, ${failed} échecs`)
      }
      setIsOnline(true)
    } catch (e) {
      console.warn('[useSyncQueue] sync globale échouée:', e)
    } finally {
      await refreshCount()
      setIsSyncing(false)
      syncingRef.current = false
    }
  }, [refreshCount])

  /**
   * Tente d'exécuter fn() immédiatement.
   * Si réseau indisponible → enqueue pour synchro ultérieure.
   * Retourne 'online' | 'queued' | 'error'
   */
  const queueWrite = useCallback(async (
    fn:      () => Promise<void>,
    type:    QueuedOpType,
    schoolId: string,
    payload: Record<string, unknown>,
    label:   string,
  ): Promise<'online' | 'queued' | 'error'> => {
    try {
      await fn()
      setIsOnline(true)
      return 'online'
    } catch (e) {
      if (isOfflineError(e)) {
        setIsOnline(false)
        await enqueue(type, schoolId, payload, label)
        await refreshCount()
        return 'queued'
      }
      console.warn('[useSyncQueue] write échouée (non-réseau):', e)
      return 'error'
    }
  }, [refreshCount])

  // ── Sync automatique au retour du foreground ───────────────────────────────

  useEffect(() => {
    refreshCount()

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // App revenue au premier plan → tenter la synchro
        getPendingCount().then(n => {
          if (n > 0) sync()
        })
      }
    })

    return () => subscription.remove()
  }, [sync, refreshCount])

  return { pendingCount, isSyncing, isOnline, sync, queueWrite, refreshCount }
}
