import { useState, useEffect } from 'react'
import { query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { cols, FSCourse } from '@/services/firestore'

// Demo fallback data
const DEMO_COURSES: FSCourse[] = [
  {
    id: 'c1', title: 'Introduction aux Dérivées', subject: 'Mathématiques',
    content: 'Une dérivée mesure le taux de variation instantané d\'une fonction...',
    teacherId: 'teacher1', teacherName: 'M. Diallo', classTarget: '3ème A',
    createdAt: { toDate: () => new Date('2026-05-10') } as any,
    updatedAt: { toDate: () => new Date('2026-05-10') } as any,
    published: true, emoji: '📐',
  },
  {
    id: 'c2', title: 'Les Équations du Second Degré', subject: 'Mathématiques',
    content: 'L\'équation ax² + bx + c = 0 admet des solutions réelles si le discriminant Δ ≥ 0...',
    teacherId: 'teacher1', teacherName: 'M. Diallo', classTarget: '3ème A',
    createdAt: { toDate: () => new Date('2026-05-08') } as any,
    updatedAt: { toDate: () => new Date('2026-05-08') } as any,
    published: true, emoji: '📊',
  },
  {
    id: 'c3', title: 'Les Temps du Passé en Français', subject: 'Français',
    content: 'Le passé composé exprime une action achevée, tandis que l\'imparfait décrit un état...',
    teacherId: 'teacher2', teacherName: 'Mme Camara', classTarget: '3ème A',
    createdAt: { toDate: () => new Date('2026-05-07') } as any,
    updatedAt: { toDate: () => new Date('2026-05-07') } as any,
    published: true, emoji: '📝',
  },
]

export function useCourses(schoolId: string, classTarget?: string) {
  const [courses,   setCourses]   = useState<FSCourse[]>(DEMO_COURSES)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [usingDemo, setUsingDemo] = useState(true)

  useEffect(() => {
    if (!schoolId || schoolId === 'demo') { setUsingDemo(true); return }
    setLoading(true)
    setUsingDemo(false)
    let q = query(cols.courses(schoolId), where('published', '==', true), orderBy('createdAt', 'desc'))
    if (classTarget) q = query(q, where('classTarget', '==', classTarget))
    const unsub = onSnapshot(q,
      snap => { setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as FSCourse))); setLoading(false) },
      err  => { setError(err.message); setUsingDemo(true); setCourses(DEMO_COURSES); setLoading(false) }
    )
    return unsub
  }, [schoolId, classTarget])

  return { courses, loading, error, usingDemo }
}

export function useTeacherCourses(schoolId: string, teacherId: string) {
  const [courses, setCourses] = useState<FSCourse[]>(DEMO_COURSES)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!schoolId || schoolId === 'demo' || !teacherId) return
    setLoading(true)
    const q = query(cols.courses(schoolId), where('teacherId', '==', teacherId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q,
      snap => { setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as FSCourse))); setLoading(false) },
      _err => { setCourses(DEMO_COURSES); setLoading(false) }
    )
    return unsub
  }, [schoolId, teacherId])

  return { courses, loading }
}
