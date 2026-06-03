/**
 * offlineQueue — File d'attente persistée pour les mutations Firebase
 *
 * Stratégie : quand une écriture Firestore échoue pour cause de réseau,
 * on l'enregistre dans AsyncStorage. Dès que l'app revient au premier plan
 * ou que l'utilisateur déclenche manuellement une synchro, la queue est vidée.
 *
 * Pas besoin de @react-native-community/netinfo : on détecte l'offline
 * par le catch de l'erreur Firestore (code 'unavailable').
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

const QUEUE_KEY = '@eduschool:offline_queue'

// ── Types ─────────────────────────────────────────────────────────────────────

export type QueuedOpType =
  | 'submitBulletin'
  | 'saveAttendance'
  | 'validateBulletin'
  | 'rejectBulletin'
  | 'publishBulletin'
  | 'saveSchoolConfig'
  | 'markAnnouncementRead'

export interface QueuedOp {
  id:        string
  type:      QueuedOpType
  schoolId:  string
  payload:   Record<string, unknown>
  createdAt: number
  retries:   number
  label:     string          // lisible par l'utilisateur ("Bulletin de Fatou Sow…")
}

// ── Accès AsyncStorage ────────────────────────────────────────────────────────

async function readQueue(): Promise<QueuedOp[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as QueuedOp[]) : []
  } catch {
    return []
  }
}

async function writeQueue(queue: QueuedOp[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

// ── API publique ───────────────────────────────────────────────────────────────

/** Ajoute une opération à la file locale */
export async function enqueue(
  type:     QueuedOpType,
  schoolId: string,
  payload:  Record<string, unknown>,
  label:    string,
): Promise<string> {
  const op: QueuedOp = {
    id:        `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    schoolId,
    payload,
    label,
    createdAt: Date.now(),
    retries:   0,
  }
  const queue = await readQueue()
  queue.push(op)
  await writeQueue(queue)
  return op.id
}

/** Retire une opération réussie de la file */
export async function dequeue(id: string): Promise<void> {
  const queue = await readQueue()
  await writeQueue(queue.filter(op => op.id !== id))
}

/** Incrémente le compteur de tentatives d'une opération */
export async function incrementRetry(id: string): Promise<void> {
  const queue = await readQueue()
  await writeQueue(queue.map(op => op.id === id ? { ...op, retries: op.retries + 1 } : op))
}

/** Supprime les opérations bloquées (≥ 5 tentatives) pour éviter la saturation */
export async function purgeFailed(): Promise<number> {
  const queue = await readQueue()
  const failed = queue.filter(op => op.retries >= 5)
  await writeQueue(queue.filter(op => op.retries < 5))
  return failed.length
}

/** Retourne toutes les opérations en attente */
export async function getPendingOps(): Promise<QueuedOp[]> {
  return readQueue()
}

/** Retourne le nombre d'opérations en attente */
export async function getPendingCount(): Promise<number> {
  return (await readQueue()).length
}

/**
 * Vide la file en exécutant chaque opération via l'executor fourni.
 * Les opérations réussies sont retirées ; les échecs incrémentent le retry.
 */
export async function flushQueue(
  executor: (op: QueuedOp) => Promise<void>,
): Promise<{ success: number; failed: number }> {
  const queue = await readQueue()
  let success = 0
  let failed  = 0

  for (const op of queue) {
    try {
      await executor(op)
      await dequeue(op.id)
      success++
    } catch (e) {
      await incrementRetry(op.id)
      failed++
      console.warn(`[offlineQueue] op ${op.id} failed (retry ${op.retries + 1}):`, e)
    }
  }

  // Purger les opérations trop réessayées
  const purged = await purgeFailed()
  if (purged > 0) console.warn(`[offlineQueue] ${purged} opérations purgées (≥5 échecs)`)

  return { success, failed }
}

/** Renvoie true si l'erreur Firebase est due au réseau (offline) */
export function isOfflineError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const code = (e as { code?: string }).code
  return code === 'unavailable' || code === 'cancelled' || code === 'deadline-exceeded'
}
