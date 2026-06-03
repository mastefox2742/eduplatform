/**
 * useAttendance — Présences avec synchronisation Firebase
 *
 * Stratégie :
 *  - Lecture : charge la feuille de présence du jour depuis Firebase
 *              (si vide, l'état initial est "non saisi" pour tous les élèves)
 *  - Écriture : `persistRecord()` sauvegarde en Firebase en arrière-plan
 */
import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, saveAttendanceRecord, type AttendanceStatus } from '@/services/firestore'

export interface AttendanceRecord {
  studentId: string
  status:    AttendanceStatus
  note?:     string
}

/**
 * Charge et persiste les présences pour une classe + date donnée.
 *
 * @param schoolId  - ID de l'école (ou 'demo' pour mode hors-ligne)
 * @param teacherId - UID du professeur connecté
 * @param classId   - ID de la classe sélectionnée
 * @param dateISO   - Date au format YYYY-MM-DD
 * @param meta      - Infos contextuelles (nom classe, jour, matière)
 */
export function useAttendance(
  schoolId:  string,
  teacherId: string,
  classId:   string,
  dateISO:   string,
  meta:      { className: string; dayLabel: string; subject: string },
) {
  const [savedRecords, setSavedRecords] = useState<Record<string, AttendanceRecord> | null>(null)
  const [loadingRecord, setLoadingRecord] = useState(false)

  // Écoute le document de présence en temps réel
  useEffect(() => {
    if (!schoolId || schoolId === 'demo' || !teacherId || !classId || !dateISO) return

    const docId = `${classId}_${dateISO}`
    setLoadingRecord(true)

    const unsub = onSnapshot(
      doc(db, 'schools', schoolId, 'attendance', docId),
      snap => {
        if (snap.exists()) {
          const data = snap.data()
          setSavedRecords(data.records ?? null)
        } else {
          setSavedRecords(null)
        }
        setLoadingRecord(false)
      },
      _err => { setLoadingRecord(false) },
    )

    return unsub
  }, [schoolId, teacherId, classId, dateISO])

  /**
   * Sauvegarde la feuille de présence complète en Firebase.
   * Fire-and-forget — ne bloque pas l'UI.
   */
  const persistRecord = useCallback(async (
    records: Record<string, { status: AttendanceStatus; note?: string }>,
  ) => {
    if (!schoolId || schoolId === 'demo' || !teacherId) return
    try {
      await saveAttendanceRecord(schoolId, classId, dateISO, teacherId, records, meta)
    } catch (e) {
      console.warn('[useAttendance] persistRecord failed:', e)
    }
  }, [schoolId, teacherId, classId, dateISO, meta])

  return { savedRecords, loadingRecord, persistRecord }
}
