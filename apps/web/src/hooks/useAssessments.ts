import { useState, useEffect, useCallback } from 'react'
import { useSchoolId } from './useSchool'
import { useAuthStore } from '@/store/auth.store'
import {
  subscribeAssessments,
  subscribeTeacherAssessments,
  addAssessment,
  updateAssessment,
  deleteAssessment,
  submitAssessment,
  approveAssessment,
  rejectAssessment,
  saveGrades,
  type AssessmentCreate,
  type AssessmentUpdate,
} from '@/services/assessments.service'
import type { Assessment, AssessmentGrade } from '@school/shared-types'

interface UseAssessmentsResult {
  assessments: Assessment[]
  loading:     boolean
  error:       string | null
  add:         (data: AssessmentCreate) => Promise<string>
  update:      (id: string, data: AssessmentUpdate) => Promise<void>
  remove:      (id: string) => Promise<void>
  submit:      (id: string) => Promise<void>
  approve:     (id: string) => Promise<void>
  reject:      (id: string, reason: string) => Promise<void>
  grade:       (id: string, grades: AssessmentGrade[], avg: number) => Promise<void>
}

/** For direction — sees all assessments */
export function useAssessments(): UseAssessmentsResult {
  const schoolId = useSchoolId()
  const { profile } = useAuthStore()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeAssessments(
      schoolId,
      (data) => { setAssessments(data); setLoading(false) },
      (err)  => { setError(err.message); setLoading(false) }
    )
    return unsub
  }, [schoolId])

  const add    = useCallback((data: AssessmentCreate) => addAssessment(schoolId, data), [schoolId])
  const update = useCallback((id: string, data: AssessmentUpdate) => updateAssessment(schoolId, id, data), [schoolId])
  const remove = useCallback((id: string) => deleteAssessment(schoolId, id), [schoolId])
  const submit = useCallback((id: string) => submitAssessment(schoolId, id), [schoolId])
  const approve = useCallback(
    (id: string) => approveAssessment(schoolId, id, profile?.displayName ?? 'Direction'),
    [schoolId, profile]
  )
  const reject = useCallback(
    (id: string, reason: string) => rejectAssessment(schoolId, id, reason),
    [schoolId]
  )
  const grade = useCallback(
    (id: string, grades: AssessmentGrade[], avg: number) => saveGrades(schoolId, id, grades, avg),
    [schoolId]
  )

  return { assessments, loading, error, add, update, remove, submit, approve, reject, grade }
}

/** For teachers — sees only their own assessments */
export function useTeacherAssessments(teacherId: string | null): UseAssessmentsResult {
  const schoolId = useSchoolId()
  const { profile } = useAuthStore()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!teacherId) { setLoading(false); return }
    setLoading(true)
    const unsub = subscribeTeacherAssessments(
      schoolId,
      teacherId,
      (data) => { setAssessments(data); setLoading(false) },
      (err)  => { setError(err.message); setLoading(false) }
    )
    return unsub
  }, [schoolId, teacherId])

  const add    = useCallback((data: AssessmentCreate) => addAssessment(schoolId, data), [schoolId])
  const update = useCallback((id: string, data: AssessmentUpdate) => updateAssessment(schoolId, id, data), [schoolId])
  const remove = useCallback((id: string) => deleteAssessment(schoolId, id), [schoolId])
  const submit = useCallback((id: string) => submitAssessment(schoolId, id), [schoolId])
  const approve = useCallback(
    (id: string) => approveAssessment(schoolId, id, profile?.displayName ?? ''),
    [schoolId, profile]
  )
  const reject = useCallback(
    (id: string, reason: string) => rejectAssessment(schoolId, id, reason),
    [schoolId]
  )
  const grade = useCallback(
    (id: string, grades: AssessmentGrade[], avg: number) => saveGrades(schoolId, id, grades, avg),
    [schoolId]
  )

  return { assessments, loading, error, add, update, remove, submit, approve, reject, grade }
}
