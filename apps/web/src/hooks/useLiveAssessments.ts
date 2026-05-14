/**
 * Live Assessments hook — Firestore with demo fallback.
 * For direction pages (sees all) and teacher pages (filtered by teacherId).
 */
import { useState, useEffect, useCallback } from 'react'
import { FIREBASE_READY } from '@/services/firebase.config'
import { useSchoolId } from './useSchool'
import { useAuthStore } from '@/store/auth.store'
import {
  subscribeAssessments, subscribeTeacherAssessments,
  addAssessment, updateAssessment, deleteAssessment,
  submitAssessment, approveAssessment, rejectAssessment, saveGrades,
} from '@/services/assessments.service'
import type { Assessment, AssessmentGrade } from '@school/shared-types'

export interface LiveAssessmentsResult {
  assessments: Assessment[]
  loading:     boolean
  error:       string | null
  isLive:      boolean
  add:         (a: Assessment) => void
  update:      (id: string, patch: Partial<Assessment>) => void
  remove:      (id: string) => void
  submit:      (id: string) => void
  approve:     (id: string) => void
  reject:      (id: string, reason: string) => void
  grade:       (id: string, grades: AssessmentGrade[], avg: number) => void
}

function useLiveAssessmentsBase(
  subscribeFunc: (
    schoolId: string,
    onData: (items: Assessment[]) => void,
    onError?: (err: Error) => void
  ) => () => void,
  fallback: Assessment[]
): LiveAssessmentsResult {
  const schoolId = useSchoolId()
  const { profile } = useAuthStore()
  const [assessments, setAssessments] = useState<Assessment[]>(fallback)
  const [loading,     setLoading]     = useState(FIREBASE_READY)
  const [error,       setError]       = useState<string | null>(null)
  const [isLive,      setIsLive]      = useState(false)

  useEffect(() => {
    if (!FIREBASE_READY) { setLoading(false); return }
    setLoading(true)
    const unsub = subscribeFunc(
      schoolId,
      (data) => {
        if (data.length > 0) { setAssessments(data); setIsLive(true) }
        else { setAssessments(fallback); setIsLive(false) }
        setLoading(false)
      },
      (err) => { setError(err.message); setAssessments(fallback); setLoading(false) }
    )
    return unsub
  }, [schoolId])

  // Optimistic local mutations (always work, Firestore writes only when live)
  const add = useCallback((a: Assessment) => {
    setAssessments(prev => [a, ...prev])
    if (FIREBASE_READY && isLive) {
      const { id, ...data } = a
      addAssessment(schoolId, data).catch(console.error)
    }
  }, [schoolId, isLive])

  const update = useCallback((id: string, patch: Partial<Assessment>) => {
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    if (FIREBASE_READY && isLive) updateAssessment(schoolId, id, patch).catch(console.error)
  }, [schoolId, isLive])

  const remove = useCallback((id: string) => {
    setAssessments(prev => prev.filter(a => a.id !== id))
    if (FIREBASE_READY && isLive) deleteAssessment(schoolId, id).catch(console.error)
  }, [schoolId, isLive])

  const submit = useCallback((id: string) => {
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: 'submitted', submittedAt: Date.now() } : a))
    if (FIREBASE_READY && isLive) submitAssessment(schoolId, id).catch(console.error)
  }, [schoolId, isLive])

  const approve = useCallback((id: string) => {
    const by = profile?.displayName ?? 'Direction'
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: 'approved', approvedAt: Date.now(), approvedBy: by } : a))
    if (FIREBASE_READY && isLive) approveAssessment(schoolId, id, by).catch(console.error)
  }, [schoolId, isLive, profile])

  const reject = useCallback((id: string, reason: string) => {
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected', rejectedAt: Date.now(), rejectionReason: reason } : a))
    if (FIREBASE_READY && isLive) rejectAssessment(schoolId, id, reason).catch(console.error)
  }, [schoolId, isLive])

  const grade = useCallback((id: string, grades: AssessmentGrade[], avg: number) => {
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, grades, avgScore: avg, status: 'graded' } : a))
    if (FIREBASE_READY && isLive) saveGrades(schoolId, id, grades, avg).catch(console.error)
  }, [schoolId, isLive])

  return { assessments, loading, error, isLive, add, update, remove, submit, approve, reject, grade }
}

/** Direction — sees all school assessments */
export function useLiveAssessments(fallback: Assessment[]): LiveAssessmentsResult {
  return useLiveAssessmentsBase(
    (schoolId, onData, onError) => subscribeAssessments(schoolId, onData, onError),
    fallback
  )
}

/** Teacher — sees only their own assessments */
export function useLiveTeacherAssessments(teacherId: string | null, fallback: Assessment[]): LiveAssessmentsResult {
  const schoolId = useSchoolId()
  const { profile } = useAuthStore()
  const [assessments, setAssessments] = useState<Assessment[]>(fallback)
  const [loading,     setLoading]     = useState(FIREBASE_READY)
  const [error,       setError]       = useState<string | null>(null)
  const [isLive,      setIsLive]      = useState(false)

  useEffect(() => {
    if (!FIREBASE_READY || !teacherId) { setLoading(false); return }
    setLoading(true)
    const unsub = subscribeTeacherAssessments(
      schoolId, teacherId,
      (data) => {
        if (data.length > 0) { setAssessments(data); setIsLive(true) }
        else { setAssessments(fallback); setIsLive(false) }
        setLoading(false)
      },
      (err) => { setError(err.message); setAssessments(fallback); setLoading(false) }
    )
    return unsub
  }, [schoolId, teacherId])

  const add = useCallback((a: Assessment) => {
    setAssessments(prev => [a, ...prev])
    if (FIREBASE_READY && isLive) {
      const { id, ...data } = a
      addAssessment(schoolId, data).catch(console.error)
    }
  }, [schoolId, isLive])

  const update = useCallback((id: string, patch: Partial<Assessment>) => {
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
    if (FIREBASE_READY && isLive) updateAssessment(schoolId, id, patch).catch(console.error)
  }, [schoolId, isLive])

  const remove = useCallback((id: string) => {
    setAssessments(prev => prev.filter(a => a.id !== id))
    if (FIREBASE_READY && isLive) deleteAssessment(schoolId, id).catch(console.error)
  }, [schoolId, isLive])

  const submit = useCallback((id: string) => {
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: 'submitted', submittedAt: Date.now() } : a))
    if (FIREBASE_READY && isLive) submitAssessment(schoolId, id).catch(console.error)
  }, [schoolId, isLive])

  const approve = useCallback((id: string) => {
    const by = profile?.displayName ?? 'Direction'
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: 'approved', approvedAt: Date.now(), approvedBy: by } : a))
    if (FIREBASE_READY && isLive) approveAssessment(schoolId, id, by).catch(console.error)
  }, [schoolId, isLive, profile])

  const reject = useCallback((id: string, reason: string) => {
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected', rejectedAt: Date.now(), rejectionReason: reason } : a))
    if (FIREBASE_READY && isLive) rejectAssessment(schoolId, id, reason).catch(console.error)
  }, [schoolId, isLive])

  const grade = useCallback((id: string, grades: AssessmentGrade[], avg: number) => {
    setAssessments(prev => prev.map(a => a.id === id ? { ...a, grades, avgScore: avg, status: 'graded' } : a))
    if (FIREBASE_READY && isLive) saveGrades(schoolId, id, grades, avg).catch(console.error)
  }, [schoolId, isLive])

  return { assessments, loading, error, isLive, add, update, remove, submit, approve, reject, grade }
}
