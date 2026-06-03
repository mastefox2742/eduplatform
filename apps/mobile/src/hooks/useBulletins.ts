/**
 * useBulletins — Supabase Realtime
 * Remplace l'ancienne version Firebase avec onSnapshot
 *
 * Utilise Supabase Realtime pour écouter les changements en temps réel.
 * Compatible avec la même API que la version Firebase.
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/config/supabase'
import type { BulletinRow } from '@/config/supabase'
import { submitBulletin, validateBulletin, rejectBulletin, publishBulletin } from '@/services/supabase'

export type { BulletinRow as FSBulletin }
export type Trimestre     = 'T1' | 'T2' | 'T3'
export type BulletinStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'published'

export interface UseBulletinsOptions {
  trimestre?:  Trimestre
  classId?:    string
  teacherId?:  string
  studentId?:  string
  status?:     BulletinStatus | BulletinStatus[]
}

export function useBulletins(
  schoolId: string,
  options:  UseBulletinsOptions = {},
) {
  const [bulletins, setBulletins] = useState<BulletinRow[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Clé stable pour options.status
  const statusKey = Array.isArray(options.status)
    ? options.status.join(',')
    : (options.status ?? '')

  useEffect(() => {
    if (!schoolId || schoolId === 'demo') return

    setLoading(true)
    setError(null)

    // Construction de la requête initiale
    const fetchData = async () => {
      let query = supabase
        .from('bulletins')
        .select('*, bulletin_assessments(*)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (options.trimestre) query = query.eq('trimestre',  options.trimestre)
      if (options.classId)   query = query.eq('class_id',   options.classId)
      if (options.teacherId) query = query.eq('teacher_id', options.teacherId)
      if (options.studentId) query = query.eq('student_id', options.studentId)

      if (options.status) {
        if (Array.isArray(options.status)) {
          query = query.in('status', options.status)
        } else {
          query = query.eq('status', options.status)
        }
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
      } else {
        setBulletins((data ?? []) as BulletinRow[])
      }
      setLoading(false)
    }

    fetchData()

    // Supabase Realtime — écouter les INSERT, UPDATE, DELETE sur les bulletins de l'école
    const channel = supabase
      .channel(`bulletins:${schoolId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'bulletins',
          filter: `school_id=eq.${schoolId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBulletins(prev => [payload.new as BulletinRow, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setBulletins(prev => prev.map(b =>
              b.id === payload.new.id ? { ...b, ...payload.new as BulletinRow } : b
            ))
          } else if (payload.eventType === 'DELETE') {
            setBulletins(prev => prev.filter(b => b.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [schoolId, options.trimestre, options.classId, options.teacherId, options.studentId, statusKey])

  // ── Actions (délèguent à services/supabase.ts) ────────────────────────────

  const submit = useCallback(async (data: Parameters<typeof submitBulletin>[1]) => {
    if (!schoolId || schoolId === 'demo') return null
    try {
      return await submitBulletin(schoolId, data)
    } catch (e) {
      console.warn('[useBulletins] submit failed:', e)
      return null
    }
  }, [schoolId])

  const validate = useCallback(async (bulletinId: string, comment: string) => {
    if (!schoolId || schoolId === 'demo') return
    try {
      await validateBulletin(bulletinId, comment)
    } catch (e) { console.warn('[useBulletins] validate failed:', e) }
  }, [schoolId])

  const reject = useCallback(async (bulletinId: string, reason: string) => {
    if (!schoolId || schoolId === 'demo') return
    try {
      await rejectBulletin(bulletinId, reason)
    } catch (e) { console.warn('[useBulletins] reject failed:', e) }
  }, [schoolId])

  const publish = useCallback(async (bulletinId: string) => {
    if (!schoolId || schoolId === 'demo') return
    try {
      await publishBulletin(bulletinId)
    } catch (e) { console.warn('[useBulletins] publish failed:', e) }
  }, [schoolId])

  return { bulletins, loading, error, submit, validate, reject, publish }
}
