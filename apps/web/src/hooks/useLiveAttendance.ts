/**
 * Live Attendance hook — Firestore with demo fallback.
 */
import { useState, useEffect, useCallback } from 'react'
import { FIREBASE_READY } from '@/services/firebase.config'
import { useSchoolId } from './useSchool'
import {
  subscribeAttendanceByWeek,
  addAttendanceRecord, updateAttendanceRecord,
  markPresent, justifyAbsence,
} from '@/services/attendance.service'
import { getWeekRange } from './useAttendance'
import type { TeacherAttendanceRecord } from '@school/shared-types'

interface UseLiveAttendanceResult {
  records:  TeacherAttendanceRecord[]
  loading:  boolean
  error:    string | null
  isLive:   boolean
  week:     { start: string; end: string; label: string }
  update:   (id: string, patch: Partial<TeacherAttendanceRecord>) => void
  present:  (id: string, start: string, end: string, hours: number) => void
  justify:  (id: string, reason: string, by: string) => void
}

export function useLiveAttendance(weekOffset: number, fallback: TeacherAttendanceRecord[]): UseLiveAttendanceResult {
  const schoolId = useSchoolId()
  const week = getWeekRange(weekOffset)

  const [records,  setRecords]  = useState<TeacherAttendanceRecord[]>(fallback)
  const [loading,  setLoading]  = useState(FIREBASE_READY)
  const [error,    setError]    = useState<string | null>(null)
  const [isLive,   setIsLive]   = useState(false)

  useEffect(() => {
    if (!FIREBASE_READY) { setLoading(false); return }
    setLoading(true)
    const unsub = subscribeAttendanceByWeek(
      schoolId,
      week.start,
      week.end,
      (data) => {
        if (data.length > 0) { setRecords(data); setIsLive(true) }
        else { setRecords(fallback); setIsLive(false) }
        setLoading(false)
      },
      (err) => { setError(err.message); setRecords(fallback); setLoading(false) }
    )
    return unsub
  }, [schoolId, week.start, week.end])

  const update = useCallback((id: string, patch: Partial<TeacherAttendanceRecord>) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    if (FIREBASE_READY && isLive) updateAttendanceRecord(schoolId, id, patch).catch(console.error)
  }, [schoolId, isLive])

  const present = useCallback((id: string, s: string, e: string, h: number) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'present', actualStart: s, actualEnd: e, effectiveHours: h } : r))
    if (FIREBASE_READY && isLive) markPresent(schoolId, id, s, e, h).catch(console.error)
  }, [schoolId, isLive])

  const justify = useCallback((id: string, reason: string, by: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'justified', justification: reason, validatedBy: by } : r))
    if (FIREBASE_READY && isLive) justifyAbsence(schoolId, id, reason, by).catch(console.error)
  }, [schoolId, isLive])

  return { records, loading, error, isLive, week, update, present, justify }
}
