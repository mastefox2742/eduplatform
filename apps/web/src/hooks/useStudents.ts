import { useState, useEffect, useCallback } from 'react'
import { useSchoolId } from './useSchool'
import {
  subscribeStudents,
  addStudent,
  updateStudent,
  deleteStudent,
  type StudentCreate,
  type StudentUpdate,
} from '@/services/students.service'
import type { StudentMember } from '@school/shared-types'

interface UseStudentsResult {
  students: StudentMember[]
  loading: boolean
  error: string | null
  add:    (data: StudentCreate) => Promise<string>
  update: (id: string, data: StudentUpdate) => Promise<void>
  remove: (id: string) => Promise<void>
  refresh: () => void
}

export function useStudents(): UseStudentsResult {
  const schoolId = useSchoolId()
  const [students, setStudents] = useState<StudentMember[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [tick,     setTick]     = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsub = subscribeStudents(
      schoolId,
      (data) => { setStudents(data); setLoading(false) },
      (err)  => { setError(err.message); setLoading(false) }
    )

    return unsub
  }, [schoolId, tick])

  const refresh = useCallback(() => setTick(t => t + 1), [])

  const add = useCallback(
    (data: StudentCreate) => addStudent(schoolId, data),
    [schoolId]
  )

  const update = useCallback(
    (id: string, data: StudentUpdate) => updateStudent(schoolId, id, data),
    [schoolId]
  )

  const remove = useCallback(
    (id: string) => deleteStudent(schoolId, id),
    [schoolId]
  )

  return { students, loading, error, add, update, remove, refresh }
}

// Convenience: students grouped by class
export function useStudentsByClass(classId: string | null) {
  const { students, loading, error } = useStudents()
  const filtered = classId ? students.filter(s => s.classId === classId) : students
  return { students: filtered, loading, error }
}
