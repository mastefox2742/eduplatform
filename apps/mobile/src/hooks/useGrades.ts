/**
 * useGrades — Notes du professeur avec synchronisation Firebase temps réel
 *
 * Stratégie hybride :
 *  1. Données démo comme état initial (UX instantané, pas d'écran vide)
 *  2. Firebase écrase les notes démo dès que des données existent en base
 *  3. Chaque écriture va en Firebase en arrière-plan (optimistic update)
 */
import { useState, useEffect, useCallback } from 'react'
import { query, where, onSnapshot, collection } from 'firebase/firestore'
import { db, saveAssessmentGrade } from '@/services/firestore'

// ── Types exportés (réutilisables dans d'autres fichiers) ─────────────────────
export type Trimestre      = 'T1' | 'T2' | 'T3'
export type AssessmentType = 'exercise' | 'exam' | 'quiz' | 'homework'

export interface GradeEntry {
  studentId: string
  value:     number | null
  comment?:  string
}

export interface Assessment {
  id:        string
  title:     string
  date:      string
  maxScore:  number
  coeff:     number
  type:      AssessmentType
  trimestre: Trimestre
  grades:    GradeEntry[]
}

export interface Student {
  id:     string
  name:   string
  avatar: string
}

export interface ClassData {
  id:          string
  name:        string
  subject:     string
  color:       string
  students:    Student[]
  assessments: Assessment[]
}

// ── Données démo ──────────────────────────────────────────────────────────────
// Servent de structure de base (classes, élèves, gabarit d'évaluations).
// Les notes réelles en Firebase viennent écraser les valeurs démo.
export const DEMO_CLASSES: ClassData[] = [
  {
    id: 'c1', name: '3ème B', subject: 'Mathématiques', color: '#2563eb',
    students: [
      { id: 's1', name: 'Aminata Bah',      avatar: '🧑🏿' },
      { id: 's2', name: 'Mamadou Diallo',   avatar: '👦🏾' },
      { id: 's3', name: 'Fatoumata Camara', avatar: '👧🏾' },
      { id: 's4', name: 'Ibrahima Sow',     avatar: '🧑🏾' },
      { id: 's5', name: 'Mariama Baldé',    avatar: '👧🏿' },
      { id: 's6', name: 'Oumar Kouyaté',    avatar: '👦🏿' },
    ],
    assessments: [
      { id: 'c1a1', title: 'Interro — Dérivées',           date: '10/09/2025', maxScore: 20, coeff: 1, type: 'exercise', trimestre: 'T1',
        grades: [{ studentId: 's1', value: 14 }, { studentId: 's2', value: 19 }, { studentId: 's3', value: 11 }, { studentId: 's4', value: 17 }, { studentId: 's5', value: 13 }, { studentId: 's6', value: 9 }] },
      { id: 'c1a2', title: 'DS — Fonctions affines',       date: '24/09/2025', maxScore: 20, coeff: 2, type: 'exam',     trimestre: 'T1',
        grades: [{ studentId: 's1', value: 12 }, { studentId: 's2', value: 16 }, { studentId: 's3', value: 9  }, { studentId: 's4', value: 15 }, { studentId: 's5', value: 10 }, { studentId: 's6', value: 8 }] },
      { id: 'c1a3', title: 'Quiz — Géométrie analytique',  date: '08/10/2025', maxScore: 10, coeff: 1, type: 'quiz',     trimestre: 'T1',
        grades: [{ studentId: 's1', value: 8  }, { studentId: 's2', value: 9  }, { studentId: 's3', value: 6  }, { studentId: 's4', value: null }, { studentId: 's5', value: 7 }, { studentId: 's6', value: 5 }] },
      { id: 'c1b1', title: 'Interro — Statistiques',       date: '12/11/2025', maxScore: 20, coeff: 1, type: 'exercise', trimestre: 'T2',
        grades: [{ studentId: 's1', value: 15 }, { studentId: 's2', value: 18 }, { studentId: 's3', value: 12 }, { studentId: 's4', value: 16 }, { studentId: 's5', value: 11 }, { studentId: 's6', value: 10 }] },
      { id: 'c1b2', title: 'Examen mi-trimestre',          date: '26/11/2025', maxScore: 20, coeff: 2, type: 'exam',     trimestre: 'T2',
        grades: [{ studentId: 's1', value: 14 }, { studentId: 's2', value: 17 }, { studentId: 's3', value: 10 }, { studentId: 's4', value: 15 }, { studentId: 's5', value: 12 }, { studentId: 's6', value: 9 }] },
      { id: 'c1b3', title: 'DS — Probabilités',            date: '17/12/2025', maxScore: 20, coeff: 2, type: 'exam',     trimestre: 'T2',
        grades: [{ studentId: 's1', value: 13 }, { studentId: 's2', value: 18 }, { studentId: 's3', value: 11 }, { studentId: 's4', value: 14 }, { studentId: 's5', value: 13 }, { studentId: 's6', value: null }] },
      { id: 'c1c1', title: 'Interro — Vecteurs',           date: '21/01/2026', maxScore: 20, coeff: 1, type: 'exercise', trimestre: 'T3',
        grades: [{ studentId: 's1', value: 16 }, { studentId: 's2', value: 19 }, { studentId: 's3', value: 13 }, { studentId: 's4', value: 17 }, { studentId: 's5', value: null }, { studentId: 's6', value: 11 }] },
      { id: 'c1c2', title: 'DS — Synthèse',                date: '11/02/2026', maxScore: 20, coeff: 3, type: 'exam',     trimestre: 'T3',
        grades: [{ studentId: 's1', value: 15 }, { studentId: 's2', value: 18 }, { studentId: 's3', value: null }, { studentId: 's4', value: 16 }, { studentId: 's5', value: 14 }, { studentId: 's6', value: 10 }] },
      { id: 'c1c3', title: 'Devoir maison — Révisions',    date: '28/02/2026', maxScore: 20, coeff: 1, type: 'homework', trimestre: 'T3',
        grades: [{ studentId: 's1', value: 17 }, { studentId: 's2', value: 19 }, { studentId: 's3', value: 14 }, { studentId: 's4', value: 18 }, { studentId: 's5', value: 15 }, { studentId: 's6', value: 12 }] },
    ],
  },
  {
    id: 'c2', name: '4ème A', subject: 'Mathématiques', color: '#7c3aed',
    students: [
      { id: 't1', name: 'Ousmane Dieng',    avatar: '👦🏿' },
      { id: 't2', name: 'Aissatou Barry',   avatar: '👧🏾' },
      { id: 't3', name: 'Moussa Konaté',    avatar: '🧑🏿' },
      { id: 't4', name: 'Kadiatou Fofana',  avatar: '👧🏿' },
      { id: 't5', name: 'Lamine Cissé',     avatar: '👦🏾' },
    ],
    assessments: [
      { id: 'c2a1', title: 'Interro — Fractions',              date: '12/09/2025', maxScore: 20, coeff: 1, type: 'exercise', trimestre: 'T1',
        grades: [{ studentId: 't1', value: 16 }, { studentId: 't2', value: 13 }, { studentId: 't3', value: 18 }, { studentId: 't4', value: 11 }, { studentId: 't5', value: 14 }] },
      { id: 'c2a2', title: 'DS — Équations du 1er degré',      date: '30/09/2025', maxScore: 20, coeff: 2, type: 'exam',     trimestre: 'T1',
        grades: [{ studentId: 't1', value: 15 }, { studentId: 't2', value: 11 }, { studentId: 't3', value: 17 }, { studentId: 't4', value: 9  }, { studentId: 't5', value: 13 }] },
      { id: 'c2a3', title: 'Quiz — Puissances',                date: '14/10/2025', maxScore: 10, coeff: 1, type: 'quiz',     trimestre: 'T1',
        grades: [{ studentId: 't1', value: 8  }, { studentId: 't2', value: 6  }, { studentId: 't3', value: 9  }, { studentId: 't4', value: 5  }, { studentId: 't5', value: null }] },
      { id: 'c2b1', title: 'Interro — Trigonométrie',          date: '18/11/2025', maxScore: 20, coeff: 1, type: 'exercise', trimestre: 'T2',
        grades: [{ studentId: 't1', value: 14 }, { studentId: 't2', value: 12 }, { studentId: 't3', value: 16 }, { studentId: 't4', value: 10 }, { studentId: 't5', value: 15 }] },
      { id: 'c2b2', title: 'DS — Géométrie plane',             date: '03/12/2025', maxScore: 20, coeff: 2, type: 'exam',     trimestre: 'T2',
        grades: [{ studentId: 't1', value: 16 }, { studentId: 't2', value: 13 }, { studentId: 't3', value: 18 }, { studentId: 't4', value: 11 }, { studentId: 't5', value: null }] },
      { id: 'c2b3', title: 'Devoir maison — Résolution',       date: '19/12/2025', maxScore: 20, coeff: 1, type: 'homework', trimestre: 'T2',
        grades: [{ studentId: 't1', value: 17 }, { studentId: 't2', value: 14 }, { studentId: 't3', value: 19 }, { studentId: 't4', value: 12 }, { studentId: 't5', value: 16 }] },
      { id: 'c2c1', title: 'Interro — Systèmes',               date: '27/01/2026', maxScore: 20, coeff: 1, type: 'exercise', trimestre: 'T3',
        grades: [{ studentId: 't1', value: 15 }, { studentId: 't2', value: 11 }, { studentId: 't3', value: 17 }, { studentId: 't4', value: 9  }, { studentId: 't5', value: 14 }] },
      { id: 'c2c2', title: 'DS — Bilan annuel',                date: '17/02/2026', maxScore: 20, coeff: 3, type: 'exam',     trimestre: 'T3',
        grades: [{ studentId: 't1', value: 16 }, { studentId: 't2', value: null }, { studentId: 't3', value: 18 }, { studentId: 't4', value: 10 }, { studentId: 't5', value: 13 }] },
    ],
  },
  {
    id: 'c3', name: '5ème C', subject: 'Mathématiques', color: '#059669',
    students: [
      { id: 'u1', name: 'Seydou Traoré',   avatar: '👦🏾' },
      { id: 'u2', name: 'Nafi Coulibaly',  avatar: '👧🏾' },
      { id: 'u3', name: 'Adama Keïta',     avatar: '🧑🏿' },
      { id: 'u4', name: 'Rokia Sylla',     avatar: '👧🏿' },
      { id: 'u5', name: 'Boubacar Sanogo', avatar: '👦🏿' },
    ],
    assessments: [
      { id: 'c3a1', title: 'Interro — Proportionnalité',    date: '09/09/2025', maxScore: 20, coeff: 1, type: 'exercise', trimestre: 'T1',
        grades: [{ studentId: 'u1', value: 15 }, { studentId: 'u2', value: 12 }, { studentId: 'u3', value: 13 }, { studentId: 'u4', value: 10 }, { studentId: 'u5', value: 17 }] },
      { id: 'c3a2', title: 'DS — Fractions et décimaux',   date: '23/09/2025', maxScore: 20, coeff: 2, type: 'exam',     trimestre: 'T1',
        grades: [{ studentId: 'u1', value: 14 }, { studentId: 'u2', value: null }, { studentId: 'u3', value: 11 }, { studentId: 'u4', value: 9  }, { studentId: 'u5', value: 16 }] },
      { id: 'c3a3', title: 'Quiz — Numération',             date: '07/10/2025', maxScore: 10, coeff: 1, type: 'quiz',     trimestre: 'T1',
        grades: [{ studentId: 'u1', value: 8  }, { studentId: 'u2', value: 7  }, { studentId: 'u3', value: 6  }, { studentId: 'u4', value: 5  }, { studentId: 'u5', value: 9 }] },
      { id: 'c3b1', title: 'Interro — Angles et triangles', date: '04/11/2025', maxScore: 20, coeff: 1, type: 'exercise', trimestre: 'T2',
        grades: [{ studentId: 'u1', value: 16 }, { studentId: 'u2', value: 13 }, { studentId: 'u3', value: 14 }, { studentId: 'u4', value: 11 }, { studentId: 'u5', value: 17 }] },
      { id: 'c3b2', title: 'DS — Périmètres et aires',     date: '25/11/2025', maxScore: 20, coeff: 2, type: 'exam',     trimestre: 'T2',
        grades: [{ studentId: 'u1', value: 15 }, { studentId: 'u2', value: 11 }, { studentId: 'u3', value: null }, { studentId: 'u4', value: 8  }, { studentId: 'u5', value: 18 }] },
      { id: 'c3b3', title: 'Devoir maison — Volumes',       date: '16/12/2025', maxScore: 20, coeff: 1, type: 'homework', trimestre: 'T2',
        grades: [{ studentId: 'u1', value: 17 }, { studentId: 'u2', value: 14 }, { studentId: 'u3', value: 13 }, { studentId: 'u4', value: 10 }, { studentId: 'u5', value: 18 }] },
      { id: 'c3c1', title: 'Interro — Statistiques',        date: '20/01/2026', maxScore: 20, coeff: 1, type: 'exercise', trimestre: 'T3',
        grades: [{ studentId: 'u1', value: 16 }, { studentId: 'u2', value: 14 }, { studentId: 'u3', value: 12 }, { studentId: 'u4', value: null }, { studentId: 'u5', value: 17 }] },
      { id: 'c3c2', title: 'DS — Révisions générales',      date: '10/02/2026', maxScore: 20, coeff: 3, type: 'exam',     trimestre: 'T3',
        grades: [{ studentId: 'u1', value: 15 }, { studentId: 'u2', value: 13 }, { studentId: 'u3', value: 11 }, { studentId: 'u4', value: 9  }, { studentId: 'u5', value: 17 }] },
    ],
  },
]

// ── Hook principal ─────────────────────────────────────────────────────────────

/**
 * Charge les notes du professeur depuis Firebase.
 * Si Firebase est vide ou indisponible, les données démo restent actives.
 * Retourne aussi `persistGrade` pour écrire en Firebase en arrière-plan.
 */
export function useGrades(schoolId: string, teacherId: string) {
  const [classes, setClasses] = useState<ClassData[]>(DEMO_CLASSES)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!schoolId || schoolId === 'demo' || !teacherId) return

    setLoading(true)
    const q = query(
      collection(db, 'schools', schoolId, 'assessments'),
      where('teacherId', '==', teacherId),
    )

    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        // Construit un map asmId → grades sauvegardées
        const savedGrades: Record<string, Record<string, { value: number | null; comment?: string }>> = {}
        snap.docs.forEach(d => {
          const data = d.data()
          if (data.grades) savedGrades[d.id] = data.grades
        })

        // Fusionne les grades Firebase dans la structure démo
        setClasses(prev => prev.map(cls => ({
          ...cls,
          assessments: cls.assessments.map(asmt => {
            const fsGrades = savedGrades[asmt.id]
            if (!fsGrades) return asmt
            return {
              ...asmt,
              grades: asmt.grades.map(g => {
                const saved = fsGrades[g.studentId]
                if (saved === undefined) return g
                return { ...g, value: saved.value ?? null, comment: saved.comment ?? '' }
              }),
            }
          }),
        })))
      }
      setLoading(false)
    }, _err => {
      // Erreur réseau : on garde les données actuelles (démo ou cache)
      setLoading(false)
    })

    return unsub
  }, [schoolId, teacherId])

  /**
   * Écrit une note en Firebase en arrière-plan (fire-and-forget).
   * Ne bloque pas l'UI — l'état local est déjà mis à jour par l'appelant.
   */
  const persistGrade = useCallback(async (
    assessmentId: string,
    studentId:    string,
    value:        number | null,
    comment:      string,
  ) => {
    if (!schoolId || schoolId === 'demo' || !teacherId) return
    try {
      await saveAssessmentGrade(schoolId, assessmentId, teacherId, studentId, value, comment)
    } catch (e) {
      console.warn('[useGrades] persistGrade failed:', e)
    }
  }, [schoolId, teacherId])

  return { classes, setClasses, loading, persistGrade }
}
