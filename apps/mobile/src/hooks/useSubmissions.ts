import { useState, useEffect } from 'react'
import { query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { cols, FSSubmission } from '@/services/firestore'

export function useSubmissionsByExercise(schoolId: string, exerciseId: string) {
  const [submissions, setSubmissions] = useState<FSSubmission[]>([])
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    if (!schoolId || schoolId === 'demo' || !exerciseId) return
    setLoading(true)
    const q = query(cols.submissions(schoolId), where('exerciseId', '==', exerciseId), orderBy('submittedAt', 'desc'))
    const unsub = onSnapshot(q,
      snap => { setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as FSSubmission))); setLoading(false) },
      _err => { setLoading(false) }
    )
    return unsub
  }, [schoolId, exerciseId])

  return { submissions, loading }
}

export function useStudentSubmissions(schoolId: string, studentId: string) {
  const [submissions, setSubmissions] = useState<FSSubmission[]>([])
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    if (!schoolId || schoolId === 'demo' || !studentId) return
    setLoading(true)
    const q = query(cols.submissions(schoolId), where('studentId', '==', studentId), orderBy('submittedAt', 'desc'))
    const unsub = onSnapshot(q,
      snap => { setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as FSSubmission))); setLoading(false) },
      _err => { setLoading(false) }
    )
    return unsub
  }, [schoolId, studentId])

  return { submissions, loading }
}
