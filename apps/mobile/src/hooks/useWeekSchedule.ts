/**
 * useWeekSchedule — emploi du temps de la semaine.
 *
 * Cahier des charges §10.1, §12.1, §15.5, §19.
 *
 * Le même hook sert au professeur et à l'élève : l'un voit ses cours,
 * l'autre ceux de sa classe, et c'est RLS qui fait la différence (§26).
 *
 * Deux points qui comptent en usage réel :
 *
 *  - **Les remplacements et annulations sont fusionnés dans la grille.**
 *    Un élève qui lit un créneau annulé se déplace pour rien ; l'écran
 *    doit montrer l'état du jour, pas la grille théorique.
 *  - **Rien n'est masqué faute de donnée.** Une salle inconnue s'affiche
 *    en creux, jamais remplacée par une valeur inventée.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScheduleEntry {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  subjectName: string
  teacherName: string | null
  className: string | null
  room: string | null
  classId: string | null
  /** Le cours a-t-il lieu ? */
  status: 'normal' | 'remplace' | 'annule'
  /** Enseignant remplaçant, le cas échéant. */
  replacementName: string | null
  /** Durée en minutes, pour la hauteur du bloc. */
  durationMin: number
}

export interface DaySchedule {
  dayOfWeek: number
  label: string
  shortLabel: string
  date: Date
  isToday: boolean
  entries: ScheduleEntry[]
}

interface State {
  days: DaySchedule[]
  weekOffset: number
  isLoading: boolean
  error: string | null
}

const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

// ── Utilitaires ───────────────────────────────────────────────────────────────

function todayDayOfWeek(): number {
  const js = new Date().getDay()
  return js === 0 ? 6 : js - 1
}

/** Lundi de la semaine visée. */
function mondayOf(offset: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - todayDayOfWeek() + offset * 7)
  return d
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWeekSchedule(mode: 'teacher' | 'student') {
  const { user } = useAuth()
  const [state, setState] = useState<State>({
    days: [], weekOffset: 0, isLoading: true, error: null,
  })

  const userId = user?.id ?? null

  const load = useCallback(async (offset: number) => {
    if (!userId) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }

    setState((s) => ({ ...s, isLoading: true, weekOffset: offset }))

    const monday = mondayOf(offset)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)

    // L'élève voit les créneaux de sa classe ; le professeur les siens.
    // RLS filtre déjà, mais l'élève doit restreindre à sa classe.
    let classFilter: string | null = null
    if (mode === 'student') {
      const { data: enrollment } = await supabase
        .from('student_enrollments')
        .select('class_id')
        .eq('student_id', userId)
        .eq('outcome', 'en_cours')
        .maybeSingle()
      classFilter = enrollment?.class_id ?? null
    }

    let query = supabase
      .from('schedule_slots')
      .select(`
        id, day_of_week, start_time, end_time, room, class_id,
        subjects ( name ),
        classes ( name ),
        profiles!schedule_slots_teacher_id_fkey ( display_name )
      `)
      .eq('is_active', true)
      .order('start_time')

    if (classFilter) query = query.eq('class_id', classFilter)

    const [slotsRes, replacementsRes] = await Promise.all([
      query,
      // Remplacements et annulations de la semaine : c'est ce qui
      // distingue la grille théorique de la réalité du jour.
      supabase
        .from('replacements')
        .select('slot_id, date, status, is_cancelled, profiles!replacements_replacement_teacher_fkey(display_name)')
        .gte('date', toISO(monday))
        .lte('date', toISO(sunday)),
    ])

    if (slotsRes.error) {
      setState((s) => ({ ...s, isLoading: false, error: slotsRes.error!.message }))
      return
    }

    // Index des exceptions par (créneau, date).
    const exceptions = new Map<string, { cancelled: boolean; replacedBy: string | null }>()
    for (const r of (replacementsRes.data ?? []) as unknown as Array<{
      slot_id: string | null
      date: string
      status: string
      is_cancelled: boolean
      profiles: { display_name: string | null } | null
    }>) {
      if (!r.slot_id) continue
      exceptions.set(`${r.slot_id}:${r.date}`, {
        cancelled: r.is_cancelled,
        replacedBy: r.status === 'accepted' || r.status === 'validated'
          ? r.profiles?.display_name ?? null
          : null,
      })
    }

    const rows = (slotsRes.data ?? []) as unknown as Array<{
      id: string
      day_of_week: number
      start_time: string
      end_time: string
      room: string | null
      class_id: string | null
      subjects: { name: string } | null
      classes: { name: string } | null
      profiles: { display_name: string | null } | null
    }>

    const currentDay = todayDayOfWeek()

    const days: DaySchedule[] = DAY_LABELS.slice(0, 6).map((label, dayIndex) => {
      const date = new Date(monday)
      date.setDate(date.getDate() + dayIndex)
      const iso = toISO(date)

      const entries: ScheduleEntry[] = rows
        .filter((r) => r.day_of_week === dayIndex)
        .map((r) => {
          const start = r.start_time.slice(0, 5)
          const end = r.end_time.slice(0, 5)
          const ex = exceptions.get(`${r.id}:${iso}`)

          return {
            id: `${r.id}-${iso}`,
            dayOfWeek: dayIndex,
            startTime: start,
            endTime: end,
            subjectName: r.subjects?.name ?? 'Cours',
            teacherName: r.profiles?.display_name ?? null,
            className: r.classes?.name ?? null,
            room: r.room,
            classId: r.class_id,
            status: (ex?.cancelled
              ? 'annule'
              : ex?.replacedBy
                ? 'remplace'
                : 'normal') as ScheduleEntry['status'],
            replacementName: ex?.replacedBy ?? null,
            durationMin: minutesBetween(start, end),
          }
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime))

      return {
        dayOfWeek: dayIndex,
        label,
        shortLabel: DAY_SHORT[dayIndex],
        date,
        isToday: offset === 0 && dayIndex === currentDay,
        entries,
      }
    })

    setState({ days, weekOffset: offset, isLoading: false, error: null })
  }, [userId, mode])

  useEffect(() => { void load(0) }, [load])

  const goToWeek = useCallback((offset: number) => { void load(offset) }, [load])

  // ── Repères d'affichage ─────────────────────────────────────────────────────

  const bounds = useMemo(() => {
    const all = state.days.flatMap((d) => d.entries)
    if (all.length === 0) return { first: '08:00', last: '17:00' }
    return {
      first: all.reduce((min, e) => (e.startTime < min ? e.startTime : min), '23:59'),
      last: all.reduce((max, e) => (e.endTime > max ? e.endTime : max), '00:00'),
    }
  }, [state.days])

  const weekLabel = useMemo(() => {
    const monday = mondayOf(state.weekOffset)
    const saturday = new Date(monday)
    saturday.setDate(saturday.getDate() + 5)

    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    return state.weekOffset === 0
      ? `Cette semaine · ${fmt(monday)} au ${fmt(saturday)}`
      : `${fmt(monday)} au ${fmt(saturday)}`
  }, [state.weekOffset])

  const totalHours = useMemo(() => {
    const minutes = state.days
      .flatMap((d) => d.entries)
      .filter((e) => e.status !== 'annule')
      .reduce((sum, e) => sum + e.durationMin, 0)
    return Math.round((minutes / 60) * 10) / 10
  }, [state.days])

  return { ...state, bounds, weekLabel, totalHours, goToWeek, reload: () => load(state.weekOffset) }
}
