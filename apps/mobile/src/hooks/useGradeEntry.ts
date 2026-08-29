/**
 * useGradeEntry — saisie rapide des notes d'une évaluation.
 *
 * Cahier des charges §12.2, §13.1, §5.2, §19, §26.
 *
 * Le professeur corrige 42 copies puis saisit les notes d'une traite,
 * souvent chez lui, souvent sans réseau. Trois conséquences :
 *
 *  - **La saisie n'attend jamais le serveur.** Chaque note est gardée
 *    en mémoire ; l'envoi se fait en un lot, par la file hors ligne.
 *  - **Rien n'est perdu en cas de coupure.** Les notes déjà envoyées
 *    sont rechargées à l'ouverture, et la progression le montre.
 *  - **La période fermée bloque avant la saisie**, pas au moment de
 *    l'enregistrement : découvrir le refus après 42 notes serait cruel.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { saveGradeBatch } from '@/services/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export type GradeState = 'saisie' | 'absent' | 'exempte' | 'annulee' | 'rattrapage'

export interface GradeRow {
  studentId: string
  fullName: string
  rollNumber: string | null
  /** Note sur le barème de l'évaluation, null tant qu'elle n'est pas saisie. */
  score: number | null
  state: GradeState
  /** La note est-elle déjà confirmée par le serveur ? */
  persisted: boolean
}

export interface AssessmentInfo {
  id: string
  title: string
  kind: string
  maxScore: number
  coefficient: number
  date: string
  className: string
  subjectName: string | null
  classId: string
  periodId: string | null
  state: string
}

interface State {
  assessment: AssessmentInfo | null
  /** Évaluations ouvertes à la saisie, pour en changer sans quitter. */
  candidates: AssessmentInfo[]
  rows: GradeRow[]
  periodOpen: boolean
  isLoading: boolean
  isSaving: boolean
  error: string | null
}

const EMPTY: State = {
  assessment: null, candidates: [], rows: [],
  periodOpen: true, isLoading: true, isSaving: false, error: null,
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGradeEntry(assessmentId?: string) {
  const { user, profile } = useAuth()
  const { queueWrite, pendingCount, isOnline, sync } = useSyncQueue()
  const [state, setState] = useState<State>(EMPTY)

  const teacherId = user?.id ?? null
  const schoolId = profile?.schoolId ?? null

  // ── Évaluations ouvertes à la saisie ────────────────────────────────────────

  const load = useCallback(async () => {
    if (!teacherId) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }

    setState((s) => ({ ...s, isLoading: true }))

    // RLS ne renvoie que les évaluations de cet enseignant (§26).
    // Seuls les états 'brouillon' et 'rejete' se saisissent : une
    // évaluation validée est figée.
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        id, title, kind, max_score, coefficient, date, class_id,
        subject_name, period_id, state,
        classes ( name )
      `)
      .in('state', ['brouillon', 'rejete'])
      .order('date', { ascending: false })
      .limit(20)

    if (error) {
      setState((s) => ({ ...s, isLoading: false, error: error.message }))
      return
    }

    const candidates: AssessmentInfo[] = ((data ?? []) as unknown as Array<{
      id: string; title: string; kind: string
      max_score: number; coefficient: number; date: string
      class_id: string; subject_name: string | null
      period_id: string | null; state: string
      classes: { name: string } | null
    }>).map((a) => ({
      id: a.id,
      title: a.title,
      kind: a.kind,
      maxScore: Number(a.max_score),
      coefficient: Number(a.coefficient),
      date: a.date,
      className: a.classes?.name ?? 'Classe',
      subjectName: a.subject_name,
      classId: a.class_id,
      periodId: a.period_id,
      state: a.state,
    }))

    const active =
      candidates.find((a) => a.id === assessmentId) ?? candidates[0] ?? null

    if (!active) {
      setState((s) => ({ ...s, candidates, assessment: null, rows: [], isLoading: false }))
      return
    }

    // ── La période accepte-t-elle encore la saisie ? (§5.2) ──────
    let periodOpen = true
    if (active.periodId) {
      const { data: period } = await supabase
        .from('academic_periods')
        .select('is_locked, grades_open_at, grades_close_at')
        .eq('id', active.periodId)
        .maybeSingle()

      if (period) {
        const now = new Date()
        periodOpen =
          !period.is_locked &&
          (!period.grades_open_at || now >= new Date(period.grades_open_at)) &&
          (!period.grades_close_at || now <= new Date(period.grades_close_at))
      }
    }

    // ── Élèves et notes déjà saisies ─────────────────────────────
    const [studentsRes, gradesRes] = await Promise.all([
      supabase
        .from('student_enrollments')
        .select('student_id, profiles!student_enrollments_student_id_fkey(display_name, student_number)')
        .eq('class_id', active.classId)
        .eq('outcome', 'en_cours'),

      supabase
        .from('grades')
        .select('student_id, score, state')
        .eq('assessment_id', active.id),
    ])

    const existing = new Map<string, { score: number | null; state: GradeState }>()
    for (const g of (gradesRes.data ?? []) as Array<{
      student_id: string; score: number | null; state: GradeState
    }>) {
      existing.set(g.student_id, { score: g.score, state: g.state })
    }

    const rows: GradeRow[] = ((studentsRes.data ?? []) as unknown as Array<{
      student_id: string
      profiles: { display_name: string | null; student_number: string | null } | null
    }>)
      .map((r) => {
        const prev = existing.get(r.student_id)
        return {
          studentId: r.student_id,
          fullName: r.profiles?.display_name ?? 'Élève',
          rollNumber: r.profiles?.student_number ?? null,
          score: prev?.score != null ? Number(prev.score) : null,
          state: prev?.state ?? 'saisie',
          persisted: prev != null,
        }
      })
      // Ordre alphabétique : c'est l'ordre de la liste d'appel papier,
      // celui dans lequel les copies sont empilées.
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'))

    setState({
      assessment: active,
      candidates,
      rows,
      periodOpen,
      isLoading: false,
      isSaving: false,
      error: null,
    })
  }, [teacherId, assessmentId])

  useEffect(() => { void load() }, [load])

  // ── Saisie ──────────────────────────────────────────────────────────────────

  const setScore = useCallback((studentId: string, score: number | null) => {
    setState((s) => ({
      ...s,
      rows: s.rows.map((r) =>
        r.studentId === studentId
          ? { ...r, score, state: 'saisie', persisted: false }
          : r
      ),
    }))
  }, [])

  /** Absent, exempté, annulé : une note chiffrée n'aurait pas de sens. */
  const setRowState = useCallback((studentId: string, gradeState: GradeState) => {
    setState((s) => ({
      ...s,
      rows: s.rows.map((r) =>
        r.studentId === studentId
          ? { ...r, state: gradeState, score: gradeState === 'saisie' ? r.score : null, persisted: false }
          : r
      ),
    }))
  }, [])

  const selectAssessment = useCallback((id: string) => {
    setState((s) => ({ ...s, isLoading: true }))
    const target = state.candidates.find((a) => a.id === id)
    if (target) setState((s) => ({ ...s, assessment: target }))
  }, [state.candidates])

  // ── Enregistrement ──────────────────────────────────────────────────────────

  /**
   * Envoie les notes saisies.
   *
   * Seules les lignes modifiées partent : renvoyer les 42 à chaque fois
   * gonflerait la file hors ligne pour rien.
   */
  const save = useCallback(async () => {
    const a = state.assessment
    if (!a || !schoolId) return { ok: false as const, error: 'Évaluation non chargée' }

    if (!state.periodOpen) {
      return { ok: false as const, error: 'Période verrouillée par le Directeur des Études' }
    }

    const dirty = state.rows.filter(
      (r) => !r.persisted && (r.score != null || r.state !== 'saisie')
    )

    if (dirty.length === 0) {
      return { ok: false as const, error: 'Aucune note à enregistrer' }
    }

    setState((s) => ({ ...s, isSaving: true }))

    const payload = {
      schoolId,
      assessmentId: a.id,
      grades: dirty.map((r) => ({
        student_id: r.studentId,
        score: r.state === 'saisie' ? r.score : null,
        state: r.state,
      })),
    }

    await queueWrite(
      () => saveGradeBatch(payload),
      'saveGrades',
      schoolId,
      payload as unknown as Record<string, unknown>,
      `Notes ${a.title} · ${a.className}`
    )

    if (isOnline) await sync()

    // Marquage optimiste : la ligne cesse d'être « à envoyer ».
    setState((s) => ({
      ...s,
      isSaving: false,
      rows: s.rows.map((r) =>
        dirty.some((d) => d.studentId === r.studentId) ? { ...r, persisted: true } : r
      ),
    }))

    return { ok: true as const, count: dirty.length }
  }, [state, schoolId, queueWrite, isOnline, sync])

  // ── Statistiques en direct ──────────────────────────────────────────────────

  const stats = useMemo(() => {
    const scored = state.rows.filter((r) => r.state === 'saisie' && r.score != null)
    const max = state.assessment?.maxScore ?? 20

    const sum = scored.reduce((acc, r) => acc + (r.score ?? 0), 0)
    const average = scored.length ? Math.round((sum / scored.length) * 100) / 100 : null

    // Sur 20, quel que soit le barème : c'est la référence commune.
    const averageOn20 = average != null && max > 0
      ? Math.round((average / max) * 20 * 100) / 100
      : null

    const passing = scored.filter((r) => (r.score ?? 0) / max >= 0.5).length

    return {
      entered: state.rows.filter((r) => !!r.score || r.state !== 'saisie').length,
      total: state.rows.length,
      scored: scored.length,
      average,
      averageOn20,
      passing,
      passRate: scored.length ? Math.round((passing / scored.length) * 100) : null,
      pendingSave: state.rows.filter(
        (r) => !r.persisted && (r.score != null || r.state !== 'saisie')
      ).length,
      best: scored.length ? Math.max(...scored.map((r) => r.score ?? 0)) : null,
      worst: scored.length ? Math.min(...scored.map((r) => r.score ?? 0)) : null,
    }
  }, [state.rows, state.assessment])

  return {
    ...state,
    stats,
    pendingCount,
    isOnline,
    setScore,
    setRowState,
    selectAssessment,
    save,
    reload: load,
  }
}
