import { useState, useEffect } from 'react'
import { query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { cols, FSExercise } from '@/services/firestore'

const DEMO_EXERCISES: FSExercise[] = [
  {
    id: 'ex1', title: 'Dérivées — Exercice 1', subject: 'Mathématiques',
    description: 'Calculez la dérivée des fonctions suivantes:\na) f(x) = 3x² + 2x - 5\nb) g(x) = sin(x)·cos(x)',
    teacherId: 'teacher1', teacherName: 'M. Diallo', classTarget: '3ème A',
    dueDate: '2026-05-20', points: 20, published: true,
    createdAt: { toDate: () => new Date('2026-05-10') } as any,
  },
  {
    id: 'ex2', title: 'Équations du 2nd Degré — Ex.2', subject: 'Mathématiques',
    description: 'Résolvez les équations suivantes:\na) x² - 5x + 6 = 0\nb) 2x² + 3x - 2 = 0',
    teacherId: 'teacher1', teacherName: 'M. Diallo', classTarget: '3ème A',
    dueDate: '2026-05-18', points: 20, published: true,
    createdAt: { toDate: () => new Date('2026-05-08') } as any,
  },
]

export function useExercises(schoolId: string, classTarget?: string) {
  const [exercises, setExercises] = useState<FSExercise[]>(DEMO_EXERCISES)
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    if (!schoolId || schoolId === 'demo') return
    setLoading(true)
    let q = query(cols.exercises(schoolId), where('published', '==', true), orderBy('createdAt', 'desc'))
    if (classTarget) q = query(q, where('classTarget', '==', classTarget))
    const unsub = onSnapshot(q,
      snap => { setExercises(snap.docs.map(d => ({ id: d.id, ...d.data() } as FSExercise))); setLoading(false) },
      _err => { setExercises(DEMO_EXERCISES); setLoading(false) }
    )
    return unsub
  }, [schoolId, classTarget])

  return { exercises, loading }
}

export function useTeacherExercises(schoolId: string, teacherId: string) {
  const [exercises, setExercises] = useState<FSExercise[]>(DEMO_EXERCISES)
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    if (!schoolId || schoolId === 'demo' || !teacherId) return
    setLoading(true)
    const q = query(cols.exercises(schoolId), where('teacherId', '==', teacherId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q,
      snap => { setExercises(snap.docs.map(d => ({ id: d.id, ...d.data() } as FSExercise))); setLoading(false) },
      _err => { setExercises(DEMO_EXERCISES); setLoading(false) }
    )
    return unsub
  }, [schoolId, teacherId])

  return { exercises, loading }
}
