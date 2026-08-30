/**
 * Liste des élèves.
 *
 * Deux sources selon la verticale identité :
 *  - `VITE_SB_IDENTITE=true` → Supabase (`student_enrollments` + `profiles`),
 *    sous RLS : il faut une session Supabase (voir useAuth).
 *  - sinon → Firestore temps réel, avec repli sur des données de démonstration.
 */
import { useState, useEffect, useCallback } from 'react'
import { FIREBASE_READY } from '@/services/firebase.config'
import { supabase, usesSupabase } from '@/config/supabase'
import { useSchoolId } from './useSchool'
import { subscribeStudents, addStudent, updateStudent, deleteStudent } from '@/services/students.service'
import type { StudentMember } from '@school/shared-types'
import type { Student } from '@/pages/direction/StudentsPage'

// ─── Mappers ─────────────────────────────────────────────────────────────────

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

interface EnrollmentRow {
  student_id: string
  class_id:   string | null
  class_name: string | null
  level_id:   string | null
  level_name: string | null
  profiles: {
    display_name:   string | null
    student_number: string | null
    parent_email:   string | null
    is_active:      boolean | null
  } | null
}

function rowToStudent(r: EnrollmentRow): Student {
  const p = r.profiles
  return {
    id:                 r.student_id,
    displayName:        p?.display_name ?? '—',
    studentNumber:      p?.student_number ?? '',
    email:              '',
    levelId:            r.level_id ?? '',
    levelName:          r.level_name ?? '',
    classId:            r.class_id ?? '',
    className:          r.class_name ?? '',
    parentEmail:        p?.parent_email ?? '',
    avgScore:           0,
    completedExercises: 0,
    totalExercises:     0,
    attendanceRate:     100,
    status:             (p?.is_active ?? true) ? 'active' : 'inactive',
    lastActivity:       Date.now(),
    createdAt:          Date.now(),
    alerts:             [],
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseLiveStudentsResult {
  students:   Student[]
  loading:    boolean
  error:      string | null
  isLive:     boolean
  add:        (s: Student) => void
  update:     (id: string, patch: Partial<Student>) => void
  remove:     (id: string) => void
  refetch:    () => void
}

export function useLiveStudents(fallbackDemo: Student[]): UseLiveStudentsResult {
  const schoolId = useSchoolId()
  const supabaseIdentity = usesSupabase('identite')
  const [students, setStudents] = useState<Student[]>(fallbackDemo)
  const [loading,  setLoading]  = useState(FIREBASE_READY || supabaseIdentity)
  const [error,    setError]    = useState<string | null>(null)
  const [isLive,   setIsLive]   = useState(false)
  const [reload,   setReload]   = useState(0)

  const refetch = useCallback(() => setReload((n) => n + 1), [])

  // ── Source Supabase ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabaseIdentity) return
    let cancelled = false
    setLoading(true)

    supabase
      .from('student_enrollments')
      .select('student_id, class_id, class_name, level_id, level_name, profiles(display_name, student_number, parent_email, is_active)')
      .eq('school_id', schoolId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setError(error.message)
          setStudents([])
          setIsLive(false)
        } else {
          // Un élève peut avoir plusieurs parcours (années) : on déduplique.
          const seen = new Set<string>()
          const mapped: Student[] = []
          for (const row of (data ?? []) as unknown as EnrollmentRow[]) {
            if (seen.has(row.student_id)) continue
            seen.add(row.student_id)
            mapped.push(rowToStudent(row))
          }
          mapped.sort((a, b) => a.displayName.localeCompare(b.displayName))
          setStudents(mapped)
          setIsLive(true)
          setError(null)
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [supabaseIdentity, schoolId, reload])

  // ── Source Firestore (historique) ────────────────────────────────────────
  useEffect(() => {
    if (supabaseIdentity) return
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
  }, [supabaseIdentity, schoolId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mutations ────────────────────────────────────────────────────────────
  const add = useCallback((s: Student) => {
    // Sous Supabase, la persistance est faite côté serveur (enroll-student) :
    // on affiche l'élève optimistiquement puis on resynchronise avec la base.
    setStudents((prev) => [s, ...prev])
    if (supabaseIdentity) {
      setTimeout(() => setReload((n) => n + 1), 400)
      return
    }
    if (FIREBASE_READY && isLive) {
      addStudent(schoolId, {
        email: s.email, displayName: s.displayName, role: 'student' as any,
        schoolId, isActive: true, levelId: s.levelId, levelName: s.levelName,
        classId: s.classId, className: s.className, studentNumber: s.studentNumber,
        parentEmail: s.parentEmail,
        archiveStatus: 'active',
        academicHistory: [],
      }).catch(console.error)
    }
  }, [schoolId, isLive, supabaseIdentity])

  const update = useCallback((id: string, patch: Partial<Student>) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    if (!supabaseIdentity && FIREBASE_READY && isLive) {
      updateStudent(schoolId, id, patch as any).catch(console.error)
    }
  }, [schoolId, isLive, supabaseIdentity])

  const remove = useCallback((id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id))
    if (!supabaseIdentity && FIREBASE_READY && isLive) {
      deleteStudent(schoolId, id).catch(console.error)
    }
  }, [schoolId, isLive, supabaseIdentity])

  return { students, loading, error, isLive, add, update, remove, refetch }
}
