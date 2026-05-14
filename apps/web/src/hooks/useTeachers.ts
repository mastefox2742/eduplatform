import { useState, useEffect, useCallback } from 'react'
import { useSchoolId } from './useSchool'
import {
  subscribeTeachers,
  addTeacher,
  updateTeacher,
  deleteTeacher,
  type TeacherCreate,
  type TeacherUpdate,
} from '@/services/teachers.service'
import type { TeacherMember } from '@school/shared-types'

interface UseTeachersResult {
  teachers: TeacherMember[]
  loading:  boolean
  error:    string | null
  add:      (data: TeacherCreate) => Promise<string>
  update:   (id: string, data: TeacherUpdate) => Promise<void>
  remove:   (id: string) => Promise<void>
}

export function useTeachers(): UseTeachersResult {
  const schoolId = useSchoolId()
  const [teachers, setTeachers] = useState<TeacherMember[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsub = subscribeTeachers(
      schoolId,
      (data) => { setTeachers(data); setLoading(false) },
      (err)  => { setError(err.message); setLoading(false) }
    )

    return unsub
  }, [schoolId])

  const add    = useCallback((data: TeacherCreate) => addTeacher(schoolId, data), [schoolId])
  const update = useCallback((id: string, data: TeacherUpdate) => updateTeacher(schoolId, id, data), [schoolId])
  const remove = useCallback((id: string) => deleteTeacher(schoolId, id), [schoolId])

  return { teachers, loading, error, add, update, remove }
}
