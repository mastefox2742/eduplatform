import { useState, useEffect, useCallback } from 'react'
import { useSchoolId } from './useSchool'
import {
  subscribeClasses,
  addClass,
  updateClass,
  deleteClass,
  type ClassCreate,
  type ClassUpdate,
} from '@/services/classes.service'
import type { SchoolClass } from '@school/shared-types'

interface UseClassesResult {
  classes:  SchoolClass[]
  loading:  boolean
  error:    string | null
  add:      (data: ClassCreate) => Promise<string>
  update:   (id: string, data: ClassUpdate) => Promise<void>
  remove:   (id: string) => Promise<void>
}

export function useClasses(): UseClassesResult {
  const schoolId = useSchoolId()
  const [classes,  setClasses]  = useState<SchoolClass[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsub = subscribeClasses(
      schoolId,
      (data) => { setClasses(data); setLoading(false) },
      (err)  => { setError(err.message); setLoading(false) }
    )

    return unsub
  }, [schoolId])

  const add    = useCallback((data: ClassCreate) => addClass(schoolId, data), [schoolId])
  const update = useCallback((id: string, data: ClassUpdate) => updateClass(schoolId, id, data), [schoolId])
  const remove = useCallback((id: string) => deleteClass(schoolId, id), [schoolId])

  return { classes, loading, error, add, update, remove }
}
