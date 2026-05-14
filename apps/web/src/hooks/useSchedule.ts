import { useState, useEffect, useCallback } from 'react'
import { useSchoolId } from './useSchool'
import {
  subscribeSchedule,
  subscribeTeacherSchedule,
  addSlot,
  updateSlot,
  deleteSlot,
  type SlotCreate,
  type SlotUpdate,
} from '@/services/schedule.service'
import type { ScheduleSlot } from '@school/shared-types'

interface UseScheduleResult {
  slots:   ScheduleSlot[]
  loading: boolean
  error:   string | null
  add:     (data: SlotCreate) => Promise<string>
  update:  (id: string, data: SlotUpdate) => Promise<void>
  remove:  (id: string) => Promise<void>
}

/** All slots (direction view) */
export function useSchedule(): UseScheduleResult {
  const schoolId = useSchoolId()
  const [slots,   setSlots]   = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeSchedule(
      schoolId,
      (data) => { setSlots(data); setLoading(false) },
      (err)  => { setError(err.message); setLoading(false) }
    )
    return unsub
  }, [schoolId])

  const add    = useCallback((data: SlotCreate) => addSlot(schoolId, data), [schoolId])
  const update = useCallback((id: string, data: SlotUpdate) => updateSlot(schoolId, id, data), [schoolId])
  const remove = useCallback((id: string) => deleteSlot(schoolId, id), [schoolId])

  return { slots, loading, error, add, update, remove }
}

/** Teacher's own slots only */
export function useTeacherSchedule(teacherId: string | null): UseScheduleResult {
  const schoolId = useSchoolId()
  const [slots,   setSlots]   = useState<ScheduleSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!teacherId) { setLoading(false); return }
    setLoading(true)
    const unsub = subscribeTeacherSchedule(
      schoolId,
      teacherId,
      (data) => { setSlots(data); setLoading(false) },
      (err)  => { setError(err.message); setLoading(false) }
    )
    return unsub
  }, [schoolId, teacherId])

  const add    = useCallback((data: SlotCreate) => addSlot(schoolId, data), [schoolId])
  const update = useCallback((id: string, data: SlotUpdate) => updateSlot(schoolId, id, data), [schoolId])
  const remove = useCallback((id: string) => deleteSlot(schoolId, id), [schoolId])

  return { slots, loading, error, add, update, remove }
}
