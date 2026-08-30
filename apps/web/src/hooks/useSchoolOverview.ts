/**
 * useSchoolOverview — poste de pilotage de la direction (web).
 * Maquette : `design/maquettes/direction---web-dashboard.html`.
 *
 * Cahier des charges §8.1, §8.2, §20.2.
 *
 * L'écran web sert au pilotage, pas à la consultation : le directeur
 * y passe du temps assis, avec des tableaux et des ratios. Trois
 * différences avec le tableau de bord mobile :
 *
 *  - La répartition par sexe et par cycle est affichée : elle est
 *    demandée dans tous les rapports ministériels (§20.2).
 *  - Le recouvrement est rapporté à un objectif annuel, pas donné
 *    en valeur brute — c'est le ratio qui déclenche une décision.
 *  - Les bulletins en attente sont listés **par classe**, avec qui les
 *    a contrôlés : c'est ainsi qu'on signe un lot en connaissance.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/config/supabase'
import { PREVIEW_MODE } from '@/config/preview'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EnrollmentBreakdown {
  total: number
  girls: number
  boys: number
  /** Effectif par cycle, dans l'ordre primaire → collège → lycée. */
  byCycle: { cycle: string; count: number }[]
}

export interface AttendanceToday {
  /** Null tant qu'aucun appel n'a été saisi : 0 % serait un mensonge. */
  rate: number | null
  present: number
  absent: number
  justified: number
  expected: number
}

export interface Collection {
  collected: number
  expected: number
  remaining: number
  rate: number
  byMethod: { label: string; amount: number; share: number }[]
}

export interface PendingClass {
  classId: string
  className: string
  headcount: number
  average: number | null
  controlledBy: string | null
  count: number
}

interface State {
  schoolName: string | null
  academicYear: string | null
  periodLabel: string | null
  enrollment: EnrollmentBreakdown
  attendance: AttendanceToday
  collection: Collection
  pendingClasses: PendingClass[]
  validatedCount: number
  pendingCount: number
  lastUpdated: Date | null
  isLoading: boolean
  error: string | null
}

const EMPTY: State = {
  schoolName: null, academicYear: null, periodLabel: null,
  enrollment: { total: 0, girls: 0, boys: 0, byCycle: [] },
  attendance: { rate: null, present: 0, absent: 0, justified: 0, expected: 0 },
  collection: { collected: 0, expected: 0, remaining: 0, rate: 0, byMethod: [] },
  pendingClasses: [], validatedCount: 0, pendingCount: 0,
  lastUpdated: null, isLoading: true, error: null,
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Regroupe les réseaux Mobile Money sous un libellé lisible. */
function methodLabel(network: string | null, provider: string | null): string {
  const n = (network ?? provider ?? '').toLowerCase()
  if (n.includes('mtn')) return 'MTN Mobile Money'
  if (n.includes('airtel')) return 'Airtel Money'
  if (n.includes('wave')) return 'Wave'
  if (n.includes('orange')) return 'Orange Money'
  if (n.includes('cinetpay') || n.includes('visa') || n.includes('card')) return 'Carte / CinetPay'
  return 'Autre'
}

// ── Jeu d'aperçu ──────────────────────────────────────────────────────────────

/**
 * Données de démonstration, reprises de la maquette
 * `design/maquettes/direction---web-dashboard.html`.
 *
 * Elles ne servent qu'au mode aperçu : sans backend, l'écran doit
 * montrer quelque chose plutôt que tourner sans fin.
 */
const PREVIEW_OVERVIEW: State = {
  schoolName: 'Lycée La Référence · Brazzaville',
  academicYear: '2025-2026',
  periodLabel: '2e trimestre',
  enrollment: {
    total: 842,
    girls: 430,
    boys: 412,
    byCycle: [
      { cycle: 'Lycée', count: 318 },
      { cycle: 'Collège', count: 294 },
      { cycle: 'Primaire', count: 230 },
    ],
  },
  attendance: { rate: 94.6, present: 785, absent: 45, justified: 12, expected: 842 },
  collection: {
    collected: 42_800_000,
    expected: 51_000_000,
    remaining: 8_150_000,
    rate: 84,
    byMethod: [
      { label: 'MTN Mobile Money', amount: 22_427_200, share: 52.4 },
      { label: 'Airtel Money',     amount: 14_081_200, share: 32.9 },
      { label: 'Caisse directe',   amount:  6_291_600, share: 14.7 },
    ],
  },
  pendingClasses: [
    { classId: 'p1', className: 'Terminale C',     headcount: 34, average: 13.45, controlledBy: 'M. Makosso', count: 34 },
    { classId: 'p2', className: 'Terminale D1',    headcount: 42, average: 12.80, controlledBy: 'M. Makosso', count: 42 },
    { classId: 'p3', className: '3ème A (Brevet)', headcount: 38, average: 11.90, controlledBy: 'Mme Ngoma',  count: 38 },
    { classId: 'p4', className: '6ème C',          headcount: 31, average: null,  controlledBy: null,          count: 31 },
  ],
  validatedCount: 18,
  pendingCount: 145,
  lastUpdated: null,
  isLoading: false,
  error: null,
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSchoolOverview() {
  const [state, setState] = useState<State>(EMPTY)

  const load = useCallback(async () => {
    // En aperçu, aucun backend n'est joignable : on sert un jeu de
    // démonstration plutôt que de laisser l'écran tourner indéfiniment.
    // Les chiffres sont ceux de la maquette `direction---web-dashboard`.
    if (PREVIEW_MODE) {
      setState({ ...PREVIEW_OVERVIEW, lastUpdated: new Date(), isLoading: false })
      return
    }

    setState((s) => ({ ...s, isLoading: true }))

    const [
      schoolRes, periodRes, studentsRes, sessionsRes,
      paymentsRes, cashRes, invoicesRes, summariesRes,
    ] = await Promise.all([
      supabase.from('schools').select('name, academic_year').limit(1).maybeSingle(),

      supabase.from('academic_periods').select('label')
        .lte('starts_on', todayISO()).gte('ends_on', todayISO()).maybeSingle(),

      // Sexe et niveau viennent du profil : ce sont les deux axes
      // exigés par les rapports ministériels (§20.2).
      supabase.from('student_enrollments')
        .select('student_id, level_name, profiles!student_enrollments_student_id_fkey(gender)')
        .eq('outcome', 'en_cours'),

      supabase.from('attendance_sessions')
        .select('id, attendance_records(status)')
        .eq('date', todayISO()),

      supabase.from('payments')
        .select('amount, network, provider')
        .eq('status', 'success'),

      supabase.from('cash_payments').select('amount, method'),

      supabase.from('invoices')
        .select('net_amount, paid_amount, balance, status'),

      supabase.from('bulletin_summaries')
        .select('id, class_id, state, general_average, classes(name), profiles!bulletin_summaries_validated_by_fkey(display_name)')
        .in('state', ['soumis', 'controle', 'valide']),
    ])

    if (schoolRes.error) {
      setState((s) => ({ ...s, isLoading: false, error: schoolRes.error!.message }))
      return
    }

    // ── Effectifs ──────────────────────────────────────────────────
    const enrollRows = (studentsRes.data ?? []) as unknown as Array<{
      student_id: string
      level_name: string | null
      profiles: { gender: string | null } | null
    }>

    const girls = enrollRows.filter((r) => (r.profiles?.gender ?? '').toUpperCase() === 'F').length
    const boys = enrollRows.filter((r) => (r.profiles?.gender ?? '').toUpperCase() === 'M').length

    const cycleMap = new Map<string, number>()
    for (const r of enrollRows) {
      const key = r.level_name ?? 'Non affecté'
      cycleMap.set(key, (cycleMap.get(key) ?? 0) + 1)
    }

    // ── Assiduité du jour ──────────────────────────────────────────
    const sessions = (sessionsRes.data ?? []) as unknown as Array<{
      attendance_records: Array<{ status: string }> | null
    }>
    const records = sessions.flatMap((s) => s.attendance_records ?? [])

    const present = records.filter((r) => r.status === 'present' || r.status === 'late').length
    const justified = records.filter((r) => r.status === 'justified').length
    const absent = records.filter((r) => r.status === 'absent').length

    const attendance: AttendanceToday = {
      rate: records.length
        ? Math.round(((present + justified) / records.length) * 1000) / 10
        : null,
      present, absent, justified,
      expected: records.length,
    }

    // ── Recouvrement ───────────────────────────────────────────────
    const online = (paymentsRes.data ?? []) as Array<{
      amount: number; network: string | null; provider: string | null
    }>
    const cash = (cashRes.data ?? []) as Array<{ amount: number; method: string }>

    const byMethodMap = new Map<string, number>()
    for (const p of online) {
      const label = methodLabel(p.network, p.provider)
      byMethodMap.set(label, (byMethodMap.get(label) ?? 0) + Number(p.amount))
    }
    for (const c of cash) {
      byMethodMap.set('Caisse directe', (byMethodMap.get('Caisse directe') ?? 0) + Number(c.amount))
    }

    const collected = [...byMethodMap.values()].reduce((a, b) => a + b, 0)

    // L'objectif est la somme facturée, pas une cible arbitraire :
    // c'est ce que l'école attend réellement sur l'année.
    const invoices = (invoicesRes.data ?? []) as Array<{
      net_amount: number; balance: number; status: string
    }>
    const expected = invoices
      .filter((i) => i.status !== 'annulee' && i.status !== 'brouillon')
      .reduce((sum, i) => sum + Number(i.net_amount), 0)
    const remaining = invoices
      .filter((i) => i.status !== 'annulee' && i.status !== 'brouillon')
      .reduce((sum, i) => sum + Number(i.balance), 0)

    const collection: Collection = {
      collected,
      expected,
      remaining,
      rate: expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0,
      byMethod: [...byMethodMap.entries()]
        .map(([label, amount]) => ({
          label,
          amount,
          share: collected > 0 ? Math.round((amount / collected) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.amount - a.amount),
    }

    // ── Bulletins par classe ───────────────────────────────────────
    const summaries = (summariesRes.data ?? []) as unknown as Array<{
      id: string
      class_id: string | null
      state: string
      general_average: number | null
      classes: { name: string } | null
      profiles: { display_name: string | null } | null
    }>

    const pendingByClass = new Map<string, PendingClass & { sum: number; n: number }>()
    let validatedCount = 0

    for (const b of summaries) {
      if (b.state === 'valide') { validatedCount++; continue }
      if (!b.class_id) continue

      const existing = pendingByClass.get(b.class_id)
      const avg = b.general_average != null ? Number(b.general_average) : null

      if (existing) {
        existing.count++
        if (avg != null) { existing.sum += avg; existing.n++ }
      } else {
        pendingByClass.set(b.class_id, {
          classId: b.class_id,
          className: b.classes?.name ?? 'Classe',
          headcount: 0,
          average: null,
          controlledBy: b.profiles?.display_name ?? null,
          count: 1,
          sum: avg ?? 0,
          n: avg != null ? 1 : 0,
        })
      }
    }

    // Effectif réel de chaque classe concernée.
    const headcounts = new Map<string, number>()
    for (const r of enrollRows) headcounts.set(r.student_id, 1)

    const pendingClasses: PendingClass[] = [...pendingByClass.values()]
      .map((c) => ({
        classId: c.classId,
        className: c.className,
        headcount: c.count,
        average: c.n > 0 ? Math.round((c.sum / c.n) * 100) / 100 : null,
        controlledBy: c.controlledBy,
        count: c.count,
      }))
      .sort((a, b) => b.count - a.count)

    setState({
      schoolName: schoolRes.data?.name ?? null,
      academicYear: schoolRes.data?.academic_year ?? null,
      periodLabel: periodRes.data?.label ?? null,
      enrollment: {
        total: enrollRows.length,
        girls,
        boys,
        byCycle: [...cycleMap.entries()]
          .map(([cycle, count]) => ({ cycle, count }))
          .sort((a, b) => b.count - a.count),
      },
      attendance,
      collection,
      pendingClasses,
      validatedCount,
      pendingCount: pendingClasses.reduce((sum, c) => sum + c.count, 0),
      lastUpdated: new Date(),
      isLoading: false,
      error: null,
    })
  }, [])

  useEffect(() => { void load() }, [load])

  return { ...state, reload: load }
}

// ── Formatage ─────────────────────────────────────────────────────────────────

/** « 18,2 M » — les montants scolaires se lisent en millions de FCFA. */
export function formatMillions(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.', ',')} M`
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)} k`
  }
  return String(Math.round(value))
}

export function formatFull(value: number): string {
  // `toLocaleString('fr-FR')` separe les milliers par une espace fine
  // insecable (U+202F) ou insecable (U+00A0) selon la plateforme. On la
  // ramene a une espace ordinaire ; le motif est ecrit en echappements,
  // un caractere invisible dans une expression reguliere etant illisible.
  return Math.round(value).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')
}

export function formatTime(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
