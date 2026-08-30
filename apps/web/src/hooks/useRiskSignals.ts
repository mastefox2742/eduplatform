/**
 * useRiskSignals — élèves en difficulté et risque de décrochage.
 * Cahier des charges §7.3.
 *
 * Ce qui distingue cet écran d'un simple classement par moyenne :
 *
 *  - **Le risque est cumulatif, pas scolaire.** Un élève qui baisse en
 *    notes n'est pas en danger ; un élève qui baisse ET s'absente ET
 *    dont la scolarité n'est pas réglée l'est. Le score combine les
 *    trois familles de signaux.
 *  - **Le score n'est pas une décision.** Il ne déclenche rien tout
 *    seul : il désigne l'élève à qui parler. La table
 *    `risk_signals` conserve l'historique pour que la conversation
 *    parte de faits datés, pas d'une impression.
 *
 * Un score qui déclencherait automatiquement une exclusion ou une
 * relance serait une faute : c'est un outil de repérage, pas de
 * sanction.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'
import { PREVIEW_MODE } from '@/config/preview'

export type RiskLevel = 'eleve' | 'modere' | 'faible'
export type SignalKind = 'notes' | 'absences' | 'discipline' | 'finance'

export interface RiskSignal {
  kind: SignalKind
  detail: string
  /** Poids du signal dans le score, sur 100. */
  weight: number
}

export interface StudentAtRisk {
  id: string
  studentName: string
  className: string
  guardianName: string
  guardianPhone: string | null
  score: number
  level: RiskLevel
  signals: RiskSignal[]
  averageTrend: number | null
  lastContactAt: string | null
}

export const SIGNAL_LABELS: Record<SignalKind, string> = {
  notes: 'Résultats',
  absences: 'Assiduité',
  discipline: 'Comportement',
  finance: 'Scolarité',
}

const PREVIEW: StudentAtRisk[] = [
  {
    id: 'r1', studentName: 'Junior Bantsimba', className: '3ème A',
    guardianName: 'Mme Bantsimba Claudine', guardianPhone: '+242 05 909 33 62',
    score: 82, level: 'eleve',
    signals: [
      { kind: 'notes', detail: 'Moyenne passée de 12,4 à 8,1 en un trimestre', weight: 30 },
      { kind: 'absences', detail: '9 absences non justifiées en 3 semaines', weight: 25 },
      { kind: 'discipline', detail: 'Incident grave le 28 août (bagarre)', weight: 15 },
      { kind: 'finance', detail: '2 échéances impayées — 250 000 FCFA dus', weight: 12 },
    ],
    averageTrend: -4.3, lastContactAt: null,
  },
  {
    id: 'r2', studentName: 'Elie Nguesso', className: '3ème A',
    guardianName: 'M. Nguesso Patrick', guardianPhone: '+242 06 112 45 78',
    score: 68, level: 'eleve',
    signals: [
      { kind: 'absences', detail: '14 absences non justifiées depuis la rentrée', weight: 35 },
      { kind: 'notes', detail: 'Moyenne 9,6 — en baisse de 1,8 point', weight: 20 },
      { kind: 'finance', detail: '1 échéance impayée — 166 667 FCFA dus', weight: 13 },
    ],
    averageTrend: -1.8, lastContactAt: '2026-08-22T10:00:00Z',
  },
  {
    id: 'r3', studentName: 'Chris Ondongo', className: '6ème B',
    guardianName: 'Mme Ondongo Prisca', guardianPhone: '+242 06 331 09 55',
    score: 44, level: 'modere',
    signals: [
      { kind: 'finance', detail: '1 échéance impayée — 136 667 FCFA dus', weight: 22 },
      { kind: 'absences', detail: '4 absences, dont 2 pour raison médicale', weight: 12 },
      { kind: 'notes', detail: 'Moyenne 10,8 — stable', weight: 10 },
    ],
    averageTrend: -0.2, lastContactAt: '2026-08-26T14:30:00Z',
  },
  {
    id: 'r4', studentName: 'Grace Mampouya', className: '3ème A',
    guardianName: 'Mme Mampouya Éliane', guardianPhone: '+242 05 337 88 14',
    score: 28, level: 'faible',
    signals: [
      { kind: 'finance', detail: 'Reste 83 334 FCFA à régler, échéance non dépassée', weight: 15 },
      { kind: 'absences', detail: '2 absences justifiées', weight: 8 },
    ],
    averageTrend: 0.6, lastContactAt: '2026-08-29T09:00:00Z',
  },
]

export function useRiskSignals() {
  const [students, setStudents] = useState<StudentAtRisk[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (PREVIEW_MODE) {
      setStudents(PREVIEW)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: e } = await supabase
      .from('risk_signals')
      .select('id, student_id, student_name, class_name, guardian_name, guardian_phone, score, level, signals, average_trend, last_contact_at')
      .order('score', { ascending: false })
      .limit(100)

    if (e) { setError(e.message); setLoading(false); return }

    setStudents(((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      studentName: (r.student_name as string) ?? 'Élève',
      className: (r.class_name as string) ?? '—',
      guardianName: (r.guardian_name as string) ?? '—',
      guardianPhone: (r.guardian_phone as string) ?? null,
      score: Number(r.score ?? 0),
      level: (r.level as RiskLevel) ?? 'faible',
      signals: (r.signals as RiskSignal[]) ?? [],
      averageTrend: r.average_trend != null ? Number(r.average_trend) : null,
      lastContactAt: (r.last_contact_at as string) ?? null,
    })))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  /** Consigne qu'un échange a eu lieu. Ne clôt pas le signalement : le
   *  risque ne disparaît pas parce qu'on a téléphoné. */
  const logContact = useCallback(async (id: string) => {
    setBusyId(id)
    const now = new Date().toISOString()
    if (!PREVIEW_MODE) {
      const { error: e } = await supabase.from('risk_signals')
        .update({ last_contact_at: now }).eq('id', id)
      if (e) { setBusyId(null); return { ok: false as const, error: e.message } }
    }
    setStudents((l) => l.map((s) => s.id === id ? { ...s, lastContactAt: now } : s))
    setBusyId(null)
    return { ok: true as const }
  }, [])

  const stats = useMemo(() => ({
    high: students.filter((s) => s.level === 'eleve').length,
    moderate: students.filter((s) => s.level === 'modere').length,
    /** Risque élevé sans aucun contact : l'angle mort à combler. */
    neverContacted: students.filter((s) => s.level === 'eleve' && !s.lastContactAt).length,
    total: students.length,
  }), [students])

  return { students, stats, isLoading, error, busyId, logContact, reload: () => void load() }
}
