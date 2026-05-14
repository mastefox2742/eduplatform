/**
 * Provides teachers from Firestore (real-time) with automatic fallback
 * to demo data when Firebase is not configured or collection is empty.
 */
import { useState, useEffect, useCallback } from 'react'
import { FIREBASE_READY } from '@/services/firebase.config'
import { useSchoolId } from './useSchool'
import { subscribeTeachers, addTeacher, updateTeacher, deleteTeacher } from '@/services/teachers.service'
import type { TeacherMember } from '@school/shared-types'
import type { Teacher } from '@/pages/direction/TeachersPage'

// ─── Mapper ──────────────────────────────────────────────────────────────────

function toTeacher(m: TeacherMember): Teacher {
  return {
    id:                m.id,
    displayName:       m.displayName,
    teacherNumber:     m.employeeId ?? '',
    email:             m.email,
    phone:             '',
    subjects:          m.subjects ?? [],
    classIds:          [],
    classNames:        [],
    studentsCount:     0,
    coursesPublished:  0,
    exercisesCreated:  0,
    avgClassScore:     0,
    status:            m.isActive ? 'active' : 'inactive',
    lastActivity:      m.updatedAt ?? Date.now(),
    createdAt:         m.createdAt ?? Date.now(),
    specialization:    (m.subjects ?? []).join(', '),
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseLiveTeachersResult {
  teachers: Teacher[]
  loading:  boolean
  error:    string | null
  isLive:   boolean
  add:      (t: Teacher) => void
  update:   (id: string, patch: Partial<Teacher>) => void
  remove:   (id: string) => void
}

export function useLiveTeachers(fallbackDemo: Teacher[]): UseLiveTeachersResult {
  const schoolId = useSchoolId()
  const [teachers, setTeachers] = useState<Teacher[]>(fallbackDemo)
  const [loading,  setLoading]  = useState(FIREBASE_READY)
  const [error,    setError]    = useState<string | null>(null)
  const [isLive,   setIsLive]   = useState(false)

  useEffect(() => {
    if (!FIREBASE_READY) {
      setTeachers(fallbackDemo)
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = subscribeTeachers(
      schoolId,
      (members) => {
        if (members.length > 0) {
          setTeachers(members.map(toTeacher))
          setIsLive(true)
        } else {
          setTeachers(fallbackDemo)
          setIsLive(false)
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setTeachers(fallbackDemo)
        setLoading(false)
      }
    )
    return unsub
  }, [schoolId])

  const add = useCallback((t: Teacher) => {
    setTeachers(prev => [t, ...prev])
    if (FIREBASE_READY && isLive) {
      addTeacher(schoolId, {
        email: t.email, displayName: t.displayName, role: 'teacher' as any,
        schoolId, isActive: t.status === 'active',
        subjects: t.subjects, employeeId: t.teacherNumber,
      }).catch(console.error)
    }
  }, [schoolId, isLive])

  const update = useCallback((id: string, patch: Partial<Teacher>) => {
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    if (FIREBASE_READY && isLive) {
      updateTeacher(schoolId, id, patch as any).catch(console.error)
    }
  }, [schoolId, isLive])

  const remove = useCallback((id: string) => {
    setTeachers(prev => prev.filter(t => t.id !== id))
    if (FIREBASE_READY && isLive) {
      deleteTeacher(schoolId, id).catch(console.error)
    }
  }, [schoolId, isLive])

  return { teachers, loading, error, isLive, add, update, remove }
}
