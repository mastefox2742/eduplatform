/**
 * Provides students from Firestore (real-time) with automatic fallback
 * to demo data when Firebase is not configured or collection is empty.
 *
 * Maps StudentMember → the page's Student UI type.
 */
import { useState, useEffect, useCallback } from 'react'
import { FIREBASE_READY } from '@/services/firebase.config'
import { useSchoolId } from './useSchool'
import { subscribeStudents, addStudent, updateStudent, deleteStudent } from '@/services/students.service'
import type { StudentMember } from '@school/shared-types'
import type { Student } from '@/pages/direction/StudentsPage'

// ─── Mapper ──────────────────────────────────────────────────────────────────

function toStudent(m: StudentMember): Student {
  return {
    id:                   m.id,
    displayName:          m.displayName,
    studentNumber:        m.studentNumber ?? '',
    email:                m.email,
    levelId:              m.levelId,
    levelName:            m.levelName,
    classId:              m.classId,
    className:            m.className,
    parentEmail:          m.parentEmail ?? '',
    // Fields not stored in Firestore yet → sensible defaults
    avgScore:             0,
    completedExercises:   0,
    totalExercises:       0,
    attendanceRate:       100,
    status:               m.isActive ? 'active' : 'inactive',
    lastActivity:         m.updatedAt ?? Date.now(),
    createdAt:            m.createdAt ?? Date.now(),
    alerts:               [],
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseLiveStudentsResult {
  students:   Student[]
  loading:    boolean
  error:      string | null
  isLive:     boolean      // true = data from Firestore, false = demo fallback
  add:        (s: Student) => void
  update:     (id: string, patch: Partial<Student>) => void
  remove:     (id: string) => void
}

export function useLiveStudents(fallbackDemo: Student[]): UseLiveStudentsResult {
  const schoolId = useSchoolId()
  const [students, setStudents] = useState<Student[]>(fallbackDemo)
  const [loading,  setLoading]  = useState(FIREBASE_READY)
  const [error,    setError]    = useState<string | null>(null)
  const [isLive,   setIsLive]   = useState(false)

  useEffect(() => {
    if (!FIREBASE_READY) {
      setStudents(fallbackDemo)
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = subscribeStudents(
      schoolId,
      (members) => {
        if (members.length > 0) {
          setStudents(members.map(toStudent))
          setIsLive(true)
        } else {
          // Firestore configured but empty — keep demo data, show seed button
          setStudents(fallbackDemo)
          setIsLive(false)
        }
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setStudents(fallbackDemo)
        setLoading(false)
      }
    )
    return unsub
  }, [schoolId])

  // Local optimistic mutations (works even in demo mode)
  const add = useCallback((s: Student) => {
    setStudents(prev => [s, ...prev])
    if (FIREBASE_READY && isLive) {
      addStudent(schoolId, {
        email: s.email, displayName: s.displayName, role: 'student' as any,
        schoolId, isActive: true, levelId: s.levelId, levelName: s.levelName,
        classId: s.classId, className: s.className, studentNumber: s.studentNumber,
        parentEmail: s.parentEmail,
      }).catch(console.error)
    }
  }, [schoolId, isLive])

  const update = useCallback((id: string, patch: Partial<Student>) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    if (FIREBASE_READY && isLive) {
      updateStudent(schoolId, id, patch as any).catch(console.error)
    }
  }, [schoolId, isLive])

  const remove = useCallback((id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id))
    if (FIREBASE_READY && isLive) {
      deleteStudent(schoolId, id).catch(console.error)
    }
  }, [schoolId, isLive])

  return { students, loading, error, isLive, add, update, remove }
}
