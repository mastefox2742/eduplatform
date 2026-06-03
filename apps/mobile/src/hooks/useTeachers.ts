/**
 * useTeachers — Liste des enseignants d'une école depuis Firebase
 *
 * Utilisé par :
 *  - (direction)/teachers.tsx → affiche et filtre le corps enseignant
 *
 * Les documents proviennent de la collection `users` (rôle 'teacher').
 * Les champs optionnels (subjects, classes, contract, etc.) sont renseignés
 * lors de l'onboarding ou de l'admin web — valeurs par défaut si absents.
 */
import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firestore'

// ── Type public ────────────────────────────────────────────────────────────────

export interface FSTeacher {
  id:       string
  name:     string
  avatar:   string                                    // initiales ou URL photo
  email:    string
  phone:    string
  subjects: string[]
  classes:  string[]
  contract: 'permanent' | 'contractuel' | 'vacataire'
  status:   'active' | 'leave' | 'inactive'
  hrsWeek:  number
  joinDate: string
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Retourne les enseignants d'une école en temps réel.
 * Retourne [] si schoolId === 'demo' (pas d'appel Firebase).
 */
export function useTeachers(schoolId: string) {
  const [teachers, setTeachers] = useState<FSTeacher[]>([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!schoolId || schoolId === 'demo') return

    setLoading(true)

    const q = query(
      collection(db, 'users'),
      where('role',     '==', 'teacher'),
      where('schoolId', '==', schoolId),
    )

    const unsub = onSnapshot(q,
      snap => {
        setTeachers(snap.docs.map(d => {
          const data = d.data()
          const name = (data.displayName || data.name || 'Enseignant') as string
          // Initiales : 2 premières lettres des 2 premiers mots
          const avatar = name
            .split(' ')
            .slice(0, 2)
            .map((w: string) => w[0] ?? '')
            .join('')
            .toUpperCase()

          return {
            id:       d.id,
            name,
            avatar:   data.avatar   ?? avatar,
            email:    data.email    ?? '',
            phone:    data.phone    ?? '',
            subjects: data.subjects ?? [],
            classes:  data.classes  ?? [],
            contract: data.contract ?? 'permanent',
            status:   data.status   ?? 'active',
            hrsWeek:  data.hrsWeek  ?? 0,
            joinDate: data.joinDate ?? '',
          } as FSTeacher
        }))
        setLoading(false)
      },
      _err => setLoading(false),
    )

    return unsub
  }, [schoolId])

  return { teachers, loading }
}
