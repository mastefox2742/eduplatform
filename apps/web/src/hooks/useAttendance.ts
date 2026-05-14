import { useState, useEffect, useCallback } from 'react'
import { useSchoolId } from './useSchool'
import {
  subscribeAttendanceByWeek,
  addAttendanceRecord,
  updateAttendanceRecord,
  markPresent,
  justifyAbsence,
  type AttendanceCreate,
  type AttendanceUpdate,
} from '@/services/attendance.service'
import type { TeacherAttendanceRecord } from '@school/shared-types'

/** Get ISO week start (Monday) and end (Friday) for a given offset */
export function getWeekRange(offsetWeeks = 0): { start: string; end: string; label: string } {
  const now = new Date()
  const day = now.getDay()                       // 0=Sun, 1=Mon, ...
  const diffToMon = day === 0 ? -6 : 1 - day    // days to Monday
  const mon = new Date(now)
  mon.setDate(now.getDate() + diffToMon + offsetWeeks * 7)
  mon.setHours(0, 0, 0, 0)

  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const fmtLabel = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

  return {
    start: fmt(mon),
    end:   fmt(fri),
    label: `${fmtLabel(mon)} – ${fmtLabel(fri)}`,
  }
}

interface UseAttendanceResult {
  records:    TeacherAttendanceRecord[]
  loading:    boolean
  error:      string | null
  add:        (data: AttendanceCreate) => Promise<string>
  update:     (id: string, data: AttendanceUpdate) => Promise<void>
  present:    (id: string, start: string, end: string, hours: number) => Promise<void>
  justify:    (id: string, reason: string, by: string) => Promise<void>
}

export function useAttendance(weekOffset = 0): UseAttendanceResult {
  const schoolId = useSchoolId()
  const week = getWeekRange(weekOffset)
  const [records,  setRecords]  = useState<TeacherAttendanceRecord[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeAttendanceByWeek(
      schoolId,
      week.start,
      week.end,
      (data) => { setRecords(data); setLoading(false) },
      (err)  => { setError(err.message); setLoading(false) }
    )
    return unsub
  }, [schoolId, week.start, week.end])

  const add     = useCallback((data: AttendanceCreate) => addAttendanceRecord(schoolId, data), [schoolId])
  const update  = useCallback((id: string, data: AttendanceUpdate) => updateAttendanceRecord(schoolId, id, data), [schoolId])
  const present = useCallback(
    (id: string, s: string, e: string, h: number) => markPresent(schoolId, id, s, e, h),
    [schoolId]
  )
  const justify = useCallback(
    (id: string, reason: string, by: string) => justifyAbsence(schoolId, id, reason, by),
    [schoolId]
  )

  return { records, loading, error, add, update, present, justify }
}
