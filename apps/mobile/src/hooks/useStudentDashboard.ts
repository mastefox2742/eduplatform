/**
 * useStudentDashboard — la journée de l'élève.
 * Maquette : `design/maquettes/eleve---dashboard.html`.
 *
 * Cahier des charges §15.1, §15.3, §15.5, §15.7, §19.
 *
 * Deux contraintes propres à cet écran :
 *
 *  - **§15.7 : pas de classement humiliant.** Le rang n'est chargé que
 *    si l'école a mis `rank_visible_student` à vrai. Par défaut, un
 *    élève ne voit jamais sa position dans la classe.
 *  - **Hors ligne utile.** L'élève consulte souvent son planning et ses
 *    devoirs sans réseau. Les données lues sont volontairement légères
 *    pour tenir dans le cache du client Supabase.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSyncQueue } from '@/hooks/useSyncQueue'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TodayCourse {
  id: string
  subjectName: string
  teacherName: string | null
  room: string | null
  startTime: string
  endTime: string
  /** 'now' | 'soon' | 'later' — dicte l'apparence de la carte. */
  phase: 'now' | 'soon' | 'later' | 'done'
  homeworkNote: string | null
}

export interface HomeworkItem {
  id: string
  title: string
  subjectName: string | null
  teacherName: string | null
  dueDate: string
  dueTime: string | null
  /** Jours restants ; négatif si la date est passée. */
  daysLeft: number
  isSubmitted: boolean
  isUrgent: boolean
}

export interface RecentGrade {
  id: string
  assessmentTitle: string
  subjectName: string | null
  score: number
  maxScore: number
  coefficient: number
  date: string
}

export interface StudentProgress {
  xp: number
  level: number
  streak: number
  badges: string[]
}

interface State {
  studentName: string | null
  className: string | null
  periodLabel: string | null
  courses: TodayCourse[]
  homework: HomeworkItem[]
  grades: RecentGrade[]
  progress: StudentProgress
  /** Moyenne générale de la période, ou null si non publiée. */
  average: number | null
  /** Rang : null si l'école ne l'expose pas aux élèves (§15.7). */
  rank: number | null
  classSize: number | null
  absencesUnjustified: number
  lateCount: number
  isLoading: boolean
  error: string | null
}

const EMPTY: State = {
  studentName: null, className: null, periodLabel: null,
  courses: [], homework: [], grades: [],
  progress: { xp: 0, level: 1, streak: 0, badges: [] },
  average: null, rank: null, classSize: null,
  absencesUnjustified: 0, lateCount: 0,
  isLoading: true, error: null,
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function todayDayOfWeek(): number {
  const js = new Date().getDay()
  return js === 0 ? 6 : js - 1
}

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function daysBetween(iso: string): number {
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/** Palier atteint : 100 XP par niveau, comme dans la maquette. */
function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / 100) + 1)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStudentDashboard() {
  const { user, profile } = useAuth()
  const { pendingCount, isOnline } = useSyncQueue()
  const [state, setState] = useState<State>(EMPTY)

  const studentId = user?.id ?? null

  const load = useCallback(async () => {
    if (!studentId) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }

    setState((s) => ({ ...s, isLoading: true }))

    // Classe de l'élève : tout le reste en dépend.
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('class_id, class_name, level_id')
      .eq('student_id', studentId)
      .eq('outcome', 'en_cours')
      .maybeSingle()

    const classId = enrollment?.class_id ?? null

    const [periodRes, slotsRes, devoirsRes, submissionsRes, xpRes, rulesRes] =
      await Promise.all([
        supabase.from('academic_periods').select('id, label')
          .lte('starts_on', todayISO()).gte('ends_on', todayISO()).maybeSingle(),

        classId
          ? supabase.from('schedule_slots')
              .select('id, start_time, end_time, room, subjects(name), profiles!schedule_slots_teacher_id_fkey(display_name)')
              .eq('class_id', classId)
              .eq('day_of_week', todayDayOfWeek())
              .eq('is_active', true)
              .order('start_time')
          : Promise.resolve({ data: [] }),

        classId
          ? supabase.from('devoirs')
              .select('id, title, subject_name, teacher_name, due_date, due_time')
              .eq('class_id', classId)
              .gte('due_date', todayISO())
              .order('due_date')
              .limit(6)
          : Promise.resolve({ data: [] }),

        supabase.from('devoir_submissions')
          .select('devoir_id, status')
          .eq('student_id', studentId),

        supabase.from('student_xp')
          .select('total_xp, level_num, streak, badges')
          .eq('student_id', studentId)
          .maybeSingle(),

        // §15.7 : le rang ne s'affiche que si l'école l'autorise.
        supabase.from('grading_rules')
          .select('rank_visible_student')
          .is('level_id', null)
          .maybeSingle(),
      ])

    const periodId = periodRes.data?.id ?? null

    // ── Cours du jour ──────────────────────────────────────────────
    const now = nowHHMM()
    const courses: TodayCourse[] = ((slotsRes.data ?? []) as unknown as Array<{
      id: string
      start_time: string
      end_time: string
      room: string | null
      subjects: { name: string } | null
      profiles: { display_name: string | null } | null
    }>).map((r) => {
      const start = r.start_time.slice(0, 5)
      const end = r.end_time.slice(0, 5)
      const phase: TodayCourse['phase'] =
        now >= start && now <= end ? 'now'
        : now < start ? (start <= '12:00' ? 'soon' : 'later')
        : 'done'

      return {
        id: r.id,
        subjectName: r.subjects?.name ?? 'Cours',
        teacherName: r.profiles?.display_name ?? null,
        room: r.room,
        startTime: start,
        endTime: end,
        phase,
        homeworkNote: null,
      }
    })

    // ── Devoirs ────────────────────────────────────────────────────
    const submitted = new Set(
      ((submissionsRes.data ?? []) as Array<{ devoir_id: string; status: string }>)
        .filter((s) => s.status === 'done')
        .map((s) => s.devoir_id)
    )

    const homework: HomeworkItem[] = ((devoirsRes.data ?? []) as Array<{
      id: string; title: string; subject_name: string | null
      teacher_name: string | null; due_date: string; due_time: string | null
    }>).map((d) => {
      const daysLeft = daysBetween(d.due_date)
      return {
        id: d.id,
        title: d.title,
        subjectName: d.subject_name,
        teacherName: d.teacher_name,
        dueDate: d.due_date,
        dueTime: d.due_time?.slice(0, 5) ?? null,
        daysLeft,
        isSubmitted: submitted.has(d.id),
        isUrgent: daysLeft <= 1 && !submitted.has(d.id),
      }
    })

    // ── Notes récentes ─────────────────────────────────────────────
    // Uniquement les évaluations publiées : une note en cours de
    // correction ne doit pas apparaître (§13.3).
    const { data: gradesData } = await supabase
      .from('grades')
      .select('id, score, assessments!inner(id, title, subject_name, max_score, coefficient, date, state)')
      .eq('student_id', studentId)
      .eq('state', 'saisie')
      .order('entered_at', { ascending: false })
      .limit(10)

    const grades: RecentGrade[] = ((gradesData ?? []) as unknown as Array<{
      id: string
      score: number | null
      assessments: {
        title: string; subject_name: string | null
        max_score: number; coefficient: number; date: string; state: string
      } | null
    }>)
      .filter((g) => g.assessments?.state === 'publie' && g.score != null)
      .slice(0, 4)
      .map((g) => ({
        id: g.id,
        assessmentTitle: g.assessments!.title,
        subjectName: g.assessments!.subject_name,
        score: Number(g.score),
        maxScore: Number(g.assessments!.max_score),
        coefficient: Number(g.assessments!.coefficient),
        date: g.assessments!.date,
      }))

    // ── Bulletin publié ────────────────────────────────────────────
    const rankVisible = rulesRes.data?.rank_visible_student === true

    const { data: summary } = periodId
      ? await supabase
          .from('bulletin_summaries')
          .select('general_average, rank_in_class, class_size, absences_count, late_count, state')
          .eq('student_id', studentId)
          .eq('period_id', periodId)
          .maybeSingle()
      : { data: null }

    const published = summary?.state === 'publie'

    // ── Absences ───────────────────────────────────────────────────
    const { count: absCount } = await supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'absent')

    const { count: lateCount } = await supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'late')

    const xp = Number(xpRes.data?.total_xp ?? 0)

    setState({
      studentName: profile?.displayName ?? null,
      className: enrollment?.class_name ?? null,
      periodLabel: periodRes.data?.label ?? null,
      courses,
      homework,
      grades,
      progress: {
        xp,
        level: Number(xpRes.data?.level_num ?? levelFromXp(xp)),
        streak: Number(xpRes.data?.streak ?? 0),
        badges: (xpRes.data?.badges ?? []) as string[],
      },
      average: published && summary?.general_average != null
        ? Number(summary.general_average)
        : null,
      rank: rankVisible && published ? summary?.rank_in_class ?? null : null,
      classSize: rankVisible && published ? summary?.class_size ?? null : null,
      absencesUnjustified: absCount ?? 0,
      lateCount: lateCount ?? 0,
      isLoading: false,
      error: null,
    })
  }, [studentId, profile?.displayName])

  useEffect(() => { void load() }, [load])

  return { ...state, pendingCount, isOnline, reload: load }
}

// ── Formatage ─────────────────────────────────────────────────────────────────

/** « Dans 2j », « Pour demain », « En retard ». */
export function dueLabel(daysLeft: number, dueTime: string | null): string {
  if (daysLeft < 0) return `En retard de ${Math.abs(daysLeft)}j`
  if (daysLeft === 0) return dueTime ? `Aujourd’hui ${dueTime}` : 'Aujourd’hui'
  if (daysLeft === 1) return dueTime ? `Demain ${dueTime}` : 'Demain'
  return `Dans ${daysLeft}j`
}

/** Trois lettres pour la pastille de matière : MATH, FR, PC… */
export function subjectTag(name: string | null): string {
  if (!name) return '—'
  const clean = name.trim().toUpperCase()
  if (clean.length <= 4) return clean
  const words = clean.split(/[\s-]+/)
  if (words.length > 1) return words.map((w) => w[0]).join('').slice(0, 3)
  return clean.slice(0, 4)
}
