/**
 * Live Schedule hook — Firestore with demo fallback.
 */
import { useState, useEffect, useCallback } from 'react'
import { FIREBASE_READY } from '@/services/firebase.config'
import { useSchoolId } from './useSchool'
import {
  subscribeSchedule, subscribeTeacherSchedule,
  addSlot, updateSlot, deleteSlot,
} from '@/services/schedule.service'
import type { ScheduleSlot } from '@school/shared-types'

interface UseLiveScheduleResult {
  slots:   ScheduleSlot[]
  loading: boolean
  error:   string | null
  isLive:  boolean
  add:     (s: ScheduleSlot) => void
  update:  (id: string, patch: Partial<ScheduleSlot>) => void
  remove:  (id: string) => void
}

/** All slots — direction view */
export function useLiveSchedule(fallback: ScheduleSlot[]): UseLiveScheduleResult {
  const schoolId = useSchoolId()
  const [slots,   setSlots]   = useState<ScheduleSlot[]>(fallback)
  const [loading, setLoading] = useState(FIREBASE_READY)
  const [error,   setError]   = useState<string | null>(null)
  const [isLive,  setIsLive]  = useState(false)

  useEffect(() => {
    if (!FIREBASE_READY) { setLoading(false); return }
    setLoading(true)
    const unsub = subscribeSchedule(
      schoolId,
      (data) => {
        if (data.length > 0) { setSlots(data); setIsLive(true) }
        else { setSlots(fallback); setIsLive(false) }
        setLoading(false)
      },
      (err) => { setError(err.message); setSlots(fallback); setLoading(false) }
    )
    return unsub
  }, [schoolId])

  const add    = useCallback((s: ScheduleSlot) => {
    setSlots(prev => [...prev, s])
    if (FIREBASE_READY && isLive) { const { id, ...d } = s; addSlot(schoolId, d).catch(console.error) }
  }, [schoolId, isLive])

  const update = useCallback((id: string, patch: Partial<ScheduleSlot>) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    if (FIREBASE_READY && isLive) updateSlot(schoolId, id, patch).catch(console.error)
  }, [schoolId, isLive])

  const remove = useCallback((id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id))
    if (FIREBASE_READY && isLive) deleteSlot(schoolId, id).catch(console.error)
  }, [schoolId, isLive])

  return { slots, loading, error, isLive, add, update, remove }
}

/** Teacher's own slots */
export function useLiveTeacherSchedule(teacherId: string | null, fallback: ScheduleSlot[]): UseLiveScheduleResult {
  const schoolId = useSchoolId()
  const [slots,   setSlots]   = useState<ScheduleSlot[]>(fallback)
  const [loading, setLoading] = useState(FIREBASE_READY)
  const [error,   setError]   = useState<string | null>(null)
  const [isLive,  setIsLive]  = useState(false)

  useEffect(() => {
    if (!FIREBASE_READY || !teacherId) { setLoading(false); return }
    setLoading(true)
    const unsub = subscribeTeacherSchedule(
      schoolId, teacherId,
      (data) => {
        if (data.length > 0) { setSlots(data); setIsLive(true) }
        else { setSlots(fallback); setIsLive(false) }
        setLoading(false)
      },
      (err) => { setError(err.message); setSlots(fallback); setLoading(false) }
    )
    return unsub
  }, [schoolId, teacherId])

  const add    = useCallback((s: ScheduleSlot) => {
    setSlots(prev => [...prev, s])
    if (FIREBASE_READY && isLive) { const { id, ...d } = s; addSlot(schoolId, d).catch(console.error) }
  }, [schoolId, isLive])

  const update = useCallback((id: string, patch: Partial<ScheduleSlot>) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    if (FIREBASE_READY && isLive) updateSlot(schoolId, id, patch).catch(console.error)
  }, [schoolId, isLive])

  const remove = useCallback((id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id))
    if (FIREBASE_READY && isLive) deleteSlot(schoolId, id).catch(console.error)
  }, [schoolId, isLive])

  return { slots, loading, error, isLive, add, update, remove }
}
