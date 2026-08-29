/**
 * useParentDashboard — suivi d'un enfant par son parent.
 * Maquette : `design/maquettes/parent---dashboard.html`.
 *
 * Cahier des charges §16.1, §16.2, §16.3, §26.
 *
 * Le parent veut savoir trois choses en ouvrant l'application :
 * mon enfant travaille-t-il bien, est-il assidu, et est-ce que je dois
 * de l'argent. L'écran répond dans cet ordre.
 *
 * Toutes les requêtes partent sous l'identité du parent : RLS ne
 * renvoie que les données de ses propres enfants (§26). Aucun filtre
 * n'est appliqué côté client — il serait contournable.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/config/supabase'
import { useActiveChild } from '@/hooks/useActiveChild'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DueInstallment {
  id: string
  invoiceId: string
  invoiceNum: string
  label: string | null
  remaining: number
  dueDate: string
  currency: string
  isOverdue: boolean
  daysLeft: number
}

export interface UpcomingWork {
  id: string
  title: string
  subjectName: string | null
  teacherName: string | null
  dueDate: string
  daysLeft: number
  isSubmitted: boolean
}

export interface PublishedGrade {
  id: string
  title: string
  subjectName: string | null
  score: number
  maxScore: number
  coefficient: number
  date: string
  /** Moyenne de la classe : donne au parent un point de comparaison. */
  classAverage: number | null
}

interface State {
  average: number | null
  averageTrend: number | null
  rank: number | null
  classSize: number | null
  periodLabel: string | null
  attendanceRate: number | null
  unjustifiedAbsences: number
  lateCount: number
  dues: DueInstallment[]
  totalDue: number
  upcoming: UpcomingWork[]
  grades: PublishedGrade[]
  bulletinAvailable: boolean
  bulletinPath: string | null
  isLoading: boolean
  error: string | null
}

const EMPTY: State = {
  average: null, averageTrend: null, rank: null, classSize: null,
  periodLabel: null, attendanceRate: null,
  unjustifiedAbsences: 0, lateCount: 0,
  dues: [], totalDue: 0, upcoming: [], grades: [],
  bulletinAvailable: false, bulletinPath: null,
  isLoading: true, error: null,
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(iso: string): number {
  const t = new Date(iso); t.setHours(0, 0, 0, 0)
  const n = new Date(); n.setHours(0, 0, 0, 0)
  return Math.round((t.getTime() - n.getTime()) / 86_400_000)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useParentDashboard() {
  const { activeChild, children, hasMultiple, setActive, isLoading: childLoading } =
    useActiveChild()
  const [state, setState] = useState<State>(EMPTY)

  const studentId = activeChild?.studentId ?? null

  const load = useCallback(async () => {
    if (!studentId) {
      setState((s) => ({ ...s, isLoading: childLoading }))
      return
    }

    setState((s) => ({ ...s, isLoading: true }))

    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('class_id')
      .eq('student_id', studentId)
      .eq('outcome', 'en_cours')
      .maybeSingle()

    const classId = enrollment?.class_id ?? null

    const [periodRes, installRes, devoirsRes, subsRes, attRes] = await Promise.all([
      supabase.from('academic_periods').select('id, label, order_num, year_id')
        .lte('starts_on', todayISO()).gte('ends_on', todayISO()).maybeSingle(),

      supabase.from('installments')
        .select('id, invoice_id, label, amount, paid_amount, due_date, invoices(invoice_num, currency, status)')
        .eq('student_id', studentId)
        .order('due_date'),

      classId
        ? supabase.from('devoirs')
            .select('id, title, subject_name, teacher_name, due_date')
            .eq('class_id', classId)
            .gte('due_date', todayISO())
            .order('due_date')
            .limit(4)
        : Promise.resolve({ data: [] }),

      supabase.from('devoir_submissions')
        .select('devoir_id, status')
        .eq('student_id', studentId),

      supabase.from('attendance_records')
        .select('status')
        .eq('student_id', studentId),
    ])

    const periodId = periodRes.data?.id ?? null

    // ── Bulletin de la période, uniquement s'il est publié (§13.3) ──
    const { data: summary } = periodId
      ? await supabase
          .from('bulletin_summaries')
          .select('general_average, rank_in_class, class_size, pdf_path, state')
          .eq('student_id', studentId)
          .eq('period_id', periodId)
          .maybeSingle()
      : { data: null }

    const published = summary?.state === 'publie'

    // Période précédente : sert à calculer l'évolution affichée
    // dans la maquette (« +0.8 »).
    let trend: number | null = null
    if (published && summary?.general_average != null && periodRes.data) {
      const { data: prev } = await supabase
        .from('bulletin_summaries')
        .select('general_average, academic_periods!inner(order_num, year_id)')
        .eq('student_id', studentId)
        .eq('state', 'publie')
        .eq('academic_periods.year_id', periodRes.data.year_id)
        .lt('academic_periods.order_num', periodRes.data.order_num)
        .order('academic_periods(order_num)', { ascending: false })
        .limit(1)
        .maybeSingle()

      const prevAvg = (prev as { general_average: number | null } | null)?.general_average
      if (prevAvg != null) {
        trend = Math.round((Number(summary.general_average) - Number(prevAvg)) * 10) / 10
      }
    }

    // ── Échéances impayées ─────────────────────────────────────────
    const dues: DueInstallment[] = ((installRes.data ?? []) as unknown as Array<{
      id: string; invoice_id: string; label: string | null
      amount: number; paid_amount: number; due_date: string
      invoices: { invoice_num: string; currency: string; status: string } | null
    }>)
      .filter((i) => i.invoices?.status !== 'annulee')
      .map((i) => {
        const remaining = Number(i.amount) - Number(i.paid_amount ?? 0)
        const daysLeft = daysBetween(i.due_date)
        return {
          id: i.id,
          invoiceId: i.invoice_id,
          invoiceNum: i.invoices?.invoice_num ?? '—',
          label: i.label,
          remaining,
          dueDate: i.due_date,
          currency: i.invoices?.currency ?? 'XOF',
          isOverdue: daysLeft < 0 && remaining > 0,
          daysLeft,
        }
      })
      .filter((i) => i.remaining > 0)

    const totalDue = dues.reduce((sum, d) => sum + d.remaining, 0)

    // ── Devoirs à venir ────────────────────────────────────────────
    const submitted = new Set(
      ((subsRes.data ?? []) as Array<{ devoir_id: string; status: string }>)
        .filter((s) => s.status === 'done')
        .map((s) => s.devoir_id)
    )

    const upcoming: UpcomingWork[] = ((devoirsRes.data ?? []) as Array<{
      id: string; title: string; subject_name: string | null
      teacher_name: string | null; due_date: string
    }>).map((d) => ({
      id: d.id,
      title: d.title,
      subjectName: d.subject_name,
      teacherName: d.teacher_name,
      dueDate: d.due_date,
      daysLeft: daysBetween(d.due_date),
      isSubmitted: submitted.has(d.id),
    }))

    // ── Dernières notes publiées ───────────────────────────────────
    const { data: gradesData } = await supabase
      .from('grades')
      .select('id, score, assessments!inner(title, subject_name, max_score, coefficient, date, state, class_id)')
      .eq('student_id', studentId)
      .eq('state', 'saisie')
      .order('entered_at', { ascending: false })
      .limit(12)

    const publishedGrades = ((gradesData ?? []) as unknown as Array<{
      id: string
      score: number | null
      assessments: {
        title: string; subject_name: string | null; max_score: number
        coefficient: number; date: string; state: string; class_id: string
      } | null
    }>).filter((g) => g.assessments?.state === 'publie' && g.score != null).slice(0, 4)

    // Moyenne de la classe pour chaque évaluation : c'est ce qui
    // permet au parent de situer la note de son enfant.
    const grades: PublishedGrade[] = await Promise.all(
      publishedGrades.map(async (g) => {
        const a = g.assessments!
        const { data: peers } = await supabase
          .from('grades')
          .select('score, assessments!inner(title, date, class_id)')
          .eq('state', 'saisie')
          .eq('assessments.class_id', a.class_id)
          .eq('assessments.title', a.title)

        const scores = ((peers ?? []) as Array<{ score: number | null }>)
          .map((p) => p.score)
          .filter((v): v is number => v != null)

        const classAverage = scores.length
          ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10
          : null

        return {
          id: g.id,
          title: a.title,
          subjectName: a.subject_name,
          score: Number(g.score),
          maxScore: Number(a.max_score),
          coefficient: Number(a.coefficient),
          date: a.date,
          classAverage,
        }
      })
    )

    // ── Assiduité ──────────────────────────────────────────────────
    const records = (attRes.data ?? []) as Array<{ status: string }>
    const absent = records.filter((r) => r.status === 'absent').length
    const late = records.filter((r) => r.status === 'late').length
    const attendanceRate = records.length
      ? Math.round(((records.length - absent) / records.length) * 1000) / 10
      : null

    setState({
      average: published && summary?.general_average != null
        ? Number(summary.general_average) : null,
      averageTrend: trend,
      rank: published ? summary?.rank_in_class ?? null : null,
      classSize: published ? summary?.class_size ?? null : null,
      periodLabel: periodRes.data?.label ?? null,
      attendanceRate,
      unjustifiedAbsences: absent,
      lateCount: late,
      dues,
      totalDue,
      upcoming,
      grades,
      bulletinAvailable: published && !!summary?.pdf_path,
      bulletinPath: published ? summary?.pdf_path ?? null : null,
      isLoading: false,
      error: null,
    })
  }, [studentId, childLoading])

  useEffect(() => { void load() }, [load])

  return {
    ...state,
    children,
    activeChild,
    hasMultiple,
    setActive,
    reload: load,
  }
}
