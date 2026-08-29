/**
 * useTeacherSession — le cours en train de se dérouler.
 *
 * Alimente l'écran « Appel & Notes », le plus utilisé de tout l'ERP.
 * Cahier des charges §11.1, §12.1, §12.2, §26.
 *
 * Deux principes tiennent tout l'écran :
 *
 *  1. **RLS décide.** Le hook ne filtre pas par enseignant : il
 *     interroge Supabase sous l'identité de l'appelant, et les
 *     policies ne renvoient que ses classes et ses matières (§26).
 *     Un filtre côté client serait cosmétique.
 *
 *  2. **Hors ligne d'abord.** L'appel doit se faire dans une salle
 *     sans réseau. Toute écriture part dans la file de synchronisation
 *     et n'est annoncée comme faite qu'après confirmation serveur
 *     (§19.3).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSyncQueue } from '@/hooks/useSyncQueue'
import { saveAttendanceSession } from '@/services/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export type PresenceStatus = 'present' | 'late' | 'absent' | 'justified' | 'pending'

export interface SessionStudent {
  id: string
  fullName: string
  photoUrl: string | null
  /** Numéro dans la classe, affiché sous le nom dans la maquette. */
  rollNumber: string | null
  /** Moyenne de la matière sur la période, ou null si aucune note. */
  average: number | null
  /** Téléphone du responsable, pour l'alerte WhatsApp. */
  guardianWhatsapp: string | null
  guardianName: string | null
}

export interface PresenceRecord {
  status: PresenceStatus
  lateMinutes?: number
  note?: string
  reasonId?: string | null
}

export interface TeacherSlot {
  slotId: string | null
  classId: string
  className: string
  subjectId: string | null
  subjectName: string
  room: string | null
  startTime: string | null
  endTime: string | null
  studentCount: number
  /** Le créneau est-il en cours à cette minute ? */
  isNow: boolean
}

/** Avancement de la saisie des notes, pour la carte « Saisie flash ». */
export interface GradingProgress {
  assessmentId: string | null
  title: string | null
  coefficient: number | null
  maxScore: number | null
  entered: number
  expected: number
}

interface State {
  slots: TeacherSlot[]
  activeSlot: TeacherSlot | null
  students: SessionStudent[]
  records: Record<string, PresenceRecord>
  sessionId: string | null
  /** L'appel a-t-il déjà été enregistré et confirmé par le serveur ? */
  isSubmitted: boolean
  /** La période autorise-t-elle encore la saisie (§5.2) ? */
  periodOpen: boolean
  periodId: string | null
  grading: GradingProgress
  isLoading: boolean
  error: string | null
}

const EMPTY: State = {
  slots: [], activeSlot: null, students: [], records: {},
  sessionId: null, isSubmitted: false, periodOpen: true, periodId: null,
  grading: { assessmentId: null, title: null, coefficient: null, maxScore: null, entered: 0, expected: 0 },
  isLoading: true, error: null,
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 0 = lundi, conformément à `schedule_slots.day_of_week`. */
function todayDayOfWeek(): number {
  const js = new Date().getDay() // 0 = dimanche
  return js === 0 ? 6 : js - 1
}

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function isBetween(now: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false
  return now >= start.slice(0, 5) && now <= end.slice(0, 5)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTeacherSession() {
  const { user, profile } = useAuth()
  const { queueWrite, pendingCount, isOnline, sync } = useSyncQueue()
  const [state, setState] = useState<State>(EMPTY)

  const schoolId = profile?.schoolId ?? null
  const teacherId = user?.id ?? null

  // ── Créneaux du jour ────────────────────────────────────────────────────────

  const loadSlots = useCallback(async () => {
    if (!teacherId || !schoolId) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }

    const { data, error } = await supabase
      .from('schedule_slots')
      .select('id, class_id, subject_id, start_time, end_time, room, classes(name), subjects(name)')
      .eq('day_of_week', todayDayOfWeek())
      .eq('is_active', true)
      .order('start_time')

    if (error) {
      setState((s) => ({ ...s, isLoading: false, error: error.message }))
      return
    }

    const now = nowHHMM()
    const rows = (data ?? []) as unknown as Array<{
      id: string
      class_id: string
      subject_id: string | null
      start_time: string | null
      end_time: string | null
      room: string | null
      classes: { name: string } | null
      subjects: { name: string } | null
    }>

    const slots: TeacherSlot[] = rows.map((r) => ({
      slotId: r.id,
      classId: r.class_id,
      className: r.classes?.name ?? 'Classe',
      subjectId: r.subject_id,
      subjectName: r.subjects?.name ?? 'Cours',
      room: r.room,
      startTime: r.start_time?.slice(0, 5) ?? null,
      endTime: r.end_time?.slice(0, 5) ?? null,
      studentCount: 0,
      isNow: isBetween(now, r.start_time, r.end_time),
    }))

    // Le créneau en cours, sinon le prochain, sinon le premier.
    const active =
      slots.find((s) => s.isNow) ??
      slots.find((s) => (s.startTime ?? '') > now) ??
      slots[0] ??
      null

    setState((s) => ({ ...s, slots, activeSlot: active }))
  }, [teacherId, schoolId])

  // ── Période courante ────────────────────────────────────────────────────────

  const loadPeriod = useCallback(async () => {
    const { data } = await supabase
      .from('academic_periods')
      .select('id, is_locked, grades_open_at, grades_close_at')
      .lte('starts_on', todayISO())
      .gte('ends_on', todayISO())
      .maybeSingle()

    if (!data) return

    const now = new Date()
    const open =
      !data.is_locked &&
      (!data.grades_open_at || now >= new Date(data.grades_open_at)) &&
      (!data.grades_close_at || now <= new Date(data.grades_close_at))

    setState((s) => ({ ...s, periodId: data.id, periodOpen: open }))
  }, [])

  // ── Élèves de la classe active ──────────────────────────────────────────────

  const loadStudents = useCallback(
    async (slot: TeacherSlot | null) => {
      if (!slot) {
        setState((s) => ({ ...s, students: [], isLoading: false }))
        return
      }

      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          profiles!student_enrollments_student_id_fkey (
            id, display_name, photo_url, student_number
          )
        `)
        .eq('class_id', slot.classId)
        .eq('outcome', 'en_cours')

      if (error) {
        setState((s) => ({ ...s, isLoading: false, error: error.message }))
        return
      }

      const rows = (data ?? []) as unknown as Array<{
        student_id: string
        profiles: {
          id: string
          display_name: string | null
          photo_url: string | null
          student_number: string | null
        } | null
      }>

      const ids = rows.map((r) => r.student_id)

      // Responsables : un seul aller-retour pour toute la classe.
      // L'alerte WhatsApp d'absence en a besoin immédiatement (§11.1).
      const { data: guardians } = ids.length
        ? await supabase
            .from('student_guardians')
            .select('student_id, guardian_name, guardian_whatsapp, guardian_phone, is_primary')
            .in('student_id', ids)
        : { data: [] }

      const byStudent = new Map<string, { name: string; whatsapp: string | null }>()
      for (const g of (guardians ?? []) as Array<{
        student_id: string
        guardian_name: string
        guardian_whatsapp: string | null
        guardian_phone: string | null
        is_primary: boolean
      }>) {
        // L'interlocuteur principal l'emporte ; sinon le premier trouvé.
        if (!byStudent.has(g.student_id) || g.is_primary) {
          byStudent.set(g.student_id, {
            name: g.guardian_name,
            whatsapp: g.guardian_whatsapp ?? g.guardian_phone,
          })
        }
      }

      // Moyennes de la matière sur la période : le professeur doit voir
      // le niveau de l'élève au moment où il fait l'appel. Une requête
      // par élève serait 42 allers-retours ; on agrège ici.
      const averages = new Map<string, number>()
      if (ids.length && slot.subjectId) {
        const { data: grades } = await supabase
          .from('grades')
          .select('student_id, score, assessments!inner(max_score, coefficient, subject_id, state)')
          .in('student_id', ids)
          .eq('state', 'saisie')
          .eq('assessments.subject_id', slot.subjectId)

        const acc = new Map<string, { sum: number; coef: number }>()
        for (const g of (grades ?? []) as unknown as Array<{
          student_id: string
          score: number | null
          assessments: { max_score: number; coefficient: number; state: string } | null
        }>) {
          const a = g.assessments
          if (!a || g.score == null) continue
          if (a.state !== 'valide' && a.state !== 'publie') continue
          const prev = acc.get(g.student_id) ?? { sum: 0, coef: 0 }
          acc.set(g.student_id, {
            sum: prev.sum + (g.score / a.max_score) * 20 * a.coefficient,
            coef: prev.coef + a.coefficient,
          })
        }
        for (const [id, v] of acc) {
          if (v.coef > 0) averages.set(id, Math.round((v.sum / v.coef) * 10) / 10)
        }
      }

      const students: SessionStudent[] = rows.map((r) => {
        const g = byStudent.get(r.student_id)
        return {
          id: r.student_id,
          fullName: r.profiles?.display_name ?? 'Élève',
          photoUrl: r.profiles?.photo_url ?? null,
          rollNumber: r.profiles?.student_number ?? null,
          average: averages.get(r.student_id) ?? null,
          guardianWhatsapp: g?.whatsapp ?? null,
          guardianName: g?.name ?? null,
        }
      })

      setState((s) => ({
        ...s,
        students,
        activeSlot: s.activeSlot ? { ...s.activeSlot, studentCount: students.length } : s.activeSlot,
        isLoading: false,
      }))
    },
    []
  )

  // ── Avancement de la saisie des notes ───────────────────────────────────────

  const loadGrading = useCallback(async (slot: TeacherSlot | null, studentCount: number) => {
    if (!slot) return

    // La dernière évaluation non publiée : c'est celle que le
    // professeur est en train de corriger.
    const { data: assessment } = await supabase
      .from('assessments')
      .select('id, title, coefficient, max_score')
      .eq('class_id', slot.classId)
      .in('state', ['brouillon', 'rejete'])
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!assessment) {
      setState((s) => ({
        ...s,
        grading: { assessmentId: null, title: null, coefficient: null, maxScore: null, entered: 0, expected: studentCount },
      }))
      return
    }

    const { count } = await supabase
      .from('grades')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', assessment.id)

    setState((s) => ({
      ...s,
      grading: {
        assessmentId: assessment.id,
        title: assessment.title,
        coefficient: assessment.coefficient,
        maxScore: assessment.max_score,
        entered: count ?? 0,
        expected: studentCount,
      },
    }))
  }, [])

  // ── Appel déjà saisi aujourd'hui ────────────────────────────────────────────

  const loadExisting = useCallback(async (slot: TeacherSlot | null) => {
    if (!slot) return

    const { data: session } = await supabase
      .from('attendance_sessions')
      .select('id, is_locked')
      .eq('class_id', slot.classId)
      .eq('date', todayISO())
      .maybeSingle()

    if (!session) {
      setState((s) => ({ ...s, sessionId: null, isSubmitted: false }))
      return
    }

    const { data: recs } = await supabase
      .from('attendance_records')
      .select('student_id, status, late_minutes, note, reason_id')
      .eq('session_id', session.id)

    const records: Record<string, PresenceRecord> = {}
    for (const r of (recs ?? []) as Array<{
      student_id: string
      status: PresenceStatus
      late_minutes: number | null
      note: string | null
      reason_id: string | null
    }>) {
      records[r.student_id] = {
        status: r.status,
        lateMinutes: r.late_minutes ?? undefined,
        note: r.note ?? undefined,
        reasonId: r.reason_id,
      }
    }

    setState((s) => ({ ...s, sessionId: session.id, records, isSubmitted: true }))
  }, [])

  // ── Orchestration ───────────────────────────────────────────────────────────

  useEffect(() => {
    void loadSlots()
    void loadPeriod()
  }, [loadSlots, loadPeriod])

  useEffect(() => {
    void loadStudents(state.activeSlot)
    void loadExisting(state.activeSlot)
    // Ne dépend que de la classe : changer d'heure ne recharge pas la liste.
  }, [state.activeSlot?.classId, loadStudents, loadExisting]) // eslint-disable-line react-hooks/exhaustive-deps

  // La progression dépend du nombre d'élèves : elle se calcule après.
  useEffect(() => {
    void loadGrading(state.activeSlot, state.students.length)
  }, [state.activeSlot?.classId, state.students.length, loadGrading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ─────────────────────────────────────────────────────────────────

  const selectSlot = useCallback((slot: TeacherSlot) => {
    setState((s) => ({ ...s, activeSlot: slot, records: {}, isSubmitted: false, isLoading: true }))
  }, [])

  /** Bascule présent → absent → retard → présent, comme la maquette. */
  const cycleStatus = useCallback((studentId: string) => {
    setState((s) => {
      const current = s.records[studentId]?.status ?? 'present'
      const next: PresenceStatus =
        current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present'
      return {
        ...s,
        records: { ...s.records, [studentId]: { status: next } },
        isSubmitted: false,
      }
    })
  }, [])

  const setStatus = useCallback((studentId: string, rec: PresenceRecord) => {
    setState((s) => ({
      ...s,
      records: { ...s.records, [studentId]: rec },
      isSubmitted: false,
    }))
  }, [])

  /** « Faire l'appel (1-Tap) » : tout le monde présent d'un coup. */
  const markAllPresent = useCallback(() => {
    setState((s) => {
      const records: Record<string, PresenceRecord> = {}
      for (const st of s.students) records[st.id] = { status: 'present' }
      return { ...s, records, isSubmitted: false }
    })
  }, [])

  /**
   * Enregistre l'appel.
   *
   * §19.3 : tant que le serveur n'a pas confirmé, l'écran doit
   * afficher « en attente », jamais « enregistré ». C'est la file de
   * synchronisation qui porte cette distinction.
   */
  const submit = useCallback(async () => {
    const slot = state.activeSlot
    if (!slot || !schoolId || !teacherId) return { queued: false }

    const payload = {
      schoolId,
      classId: slot.classId,
      subjectId: slot.subjectId,
      teacherId,
      periodId: state.periodId,
      dateISO: todayISO(),
      slotId: slot.slotId,
      records: state.students.map((st) => ({
        student_id: st.id,
        student_name: st.fullName,
        status: state.records[st.id]?.status ?? 'present',
        late_minutes: state.records[st.id]?.lateMinutes ?? null,
        note: state.records[st.id]?.note ?? null,
        reason_id: state.records[st.id]?.reasonId ?? null,
      })),
    }

    // `queueWrite` tente l'écriture ; en cas d'échec réseau, elle
    // atterrit dans la file locale avec un libellé lisible (§19.3).
    await queueWrite(
      () => saveAttendanceSession(payload),
      'saveAttendance',
      schoolId,
      payload as unknown as Record<string, unknown>,
      `Présence de la ${slot.className}`
    )

    // Tentative immédiate : si le réseau est là, la file part maintenant.
    if (isOnline) await sync()

    return { queued: true }
  }, [state, schoolId, teacherId, queueWrite, isOnline, sync])

  // ── Décompte affiché dans le bandeau ────────────────────────────────────────

  const counts = useMemo(() => {
    let present = 0, absent = 0, late = 0
    for (const st of state.students) {
      const s = state.records[st.id]?.status ?? 'present'
      if (s === 'absent') absent++
      else if (s === 'late') late++
      else present++
    }
    return { present, absent, late, total: state.students.length }
  }, [state.students, state.records])

  return {
    ...state,
    counts,
    pendingCount,
    isOnline,
    selectSlot,
    cycleStatus,
    setStatus,
    markAllPresent,
    submit,
    reload: () => {
      void loadSlots()
      void loadStudents(state.activeSlot)
    },
  }
}
