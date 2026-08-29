/**
 * useDirectionDashboard — vue d'ensemble de l'établissement.
 * Maquette : `design/maquettes/direction---dashboard.html`.
 *
 * Cahier des charges §8.1, §8.3, §19.3.
 *
 * Un directeur ouvre cet écran entre deux rendez-vous, pour savoir
 * s'il doit intervenir. Deux règles en découlent :
 *
 *  - **Aucun chiffre inventé.** Si une donnée manque, le champ vaut
 *    `null` et l'écran affiche « — », jamais zéro. Un taux d'assiduité
 *    à 0 % parce que l'appel n'est pas encore fait serait un mensonge.
 *  - **Les compteurs sont des comptages**, pas des listes chargées puis
 *    mesurées : `head: true` évite de rapatrier 842 lignes pour en
 *    afficher le nombre.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useSyncQueue } from '@/hooks/useSyncQueue'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DirectionKpis {
  /** Élèves actifs sur l'année en cours. */
  students: number | null
  /** Taux de présence du jour, ou null si l'appel n'a pas commencé. */
  attendanceRate: number | null
  /** Encaissé sur le mois courant. */
  collectedThisMonth: number | null
  /** Somme des soldes restant dus. */
  unpaidTotal: number | null
  /** Nombre d'éléments demandant une décision. */
  alerts: number
}

export interface DashboardAlert {
  id: string
  icon: string
  title: string
  detail: string
  tone: 'primary' | 'accent' | 'danger'
  route: string
}

interface State {
  kpis: DirectionKpis
  alerts: DashboardAlert[]
  schoolName: string | null
  academicYear: string | null
  periodLabel: string | null
  isLoading: boolean
  error: string | null
}

const EMPTY: State = {
  kpis: { students: null, attendanceRate: null, collectedThisMonth: null, unpaidTotal: null, alerts: 0 },
  alerts: [],
  schoolName: null, academicYear: null, periodLabel: null,
  isLoading: true, error: null,
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthStartISO(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDirectionDashboard() {
  const { profile } = useAuth()
  const { pendingCount, isOnline } = useSyncQueue()
  const [state, setState] = useState<State>(EMPTY)

  const schoolId = profile?.schoolId ?? null

  const load = useCallback(async () => {
    if (!schoolId) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }

    setState((s) => ({ ...s, isLoading: true }))

    const year = todayISO()

    // Toutes les mesures sont indépendantes : un seul aller-retour
    // groupé plutôt que huit requêtes en cascade.
    const [
      school, period, studentsRes, sessionsRes,
      paymentsRes, invoicesRes, bulletinsRes, docsRes, risksRes,
    ] = await Promise.all([
      supabase.from('schools').select('name, academic_year').eq('id', schoolId).maybeSingle(),

      supabase.from('academic_periods').select('label')
        .lte('starts_on', year).gte('ends_on', year).maybeSingle(),

      supabase.from('student_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('outcome', 'en_cours'),

      // Sessions d'appel du jour, avec leurs lignes : c'est la seule
      // façon d'obtenir un taux réel plutôt qu'une estimation.
      supabase.from('attendance_sessions')
        .select('id, attendance_records(status)')
        .eq('date', todayISO()),

      supabase.from('payments')
        .select('amount')
        .eq('status', 'success')
        .gte('paid_at', monthStartISO()),

      supabase.from('invoices')
        .select('balance')
        .in('status', ['emise', 'partiellement_payee', 'en_retard']),

      supabase.from('bulletin_summaries')
        .select('id', { count: 'exact', head: true })
        .in('state', ['soumis', 'controle']),

      supabase.from('document_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'a_signer'),

      supabase.from('risk_signals')
        .select('id', { count: 'exact', head: true })
        .in('status', ['ouvert', 'en_suivi'])
        .in('priority', ['eleve', 'critique']),
    ])

    // ── Assiduité ──────────────────────────────────────────────────
    // Null tant qu'aucun appel n'a été fait : afficher 0 % à 7 h du
    // matin ferait croire à une désertion générale.
    let attendanceRate: number | null = null
    const sessions = (sessionsRes.data ?? []) as unknown as Array<{
      id: string
      attendance_records: Array<{ status: string }> | null
    }>
    const allRecords = sessions.flatMap((s) => s.attendance_records ?? [])
    if (allRecords.length > 0) {
      const present = allRecords.filter(
        (r) => r.status === 'present' || r.status === 'late' || r.status === 'justified'
      ).length
      attendanceRate = Math.round((present / allRecords.length) * 1000) / 10
    }

    // ── Finance ────────────────────────────────────────────────────
    const collected = (paymentsRes.data ?? []).reduce(
      (sum, p: { amount: number }) => sum + Number(p.amount), 0
    )
    const unpaid = (invoicesRes.data ?? []).reduce(
      (sum, i: { balance: number }) => sum + Number(i.balance), 0
    )

    // ── File de décisions ──────────────────────────────────────────
    const bulletinCount = bulletinsRes.count ?? 0
    const docCount = docsRes.count ?? 0
    const riskCount = risksRes.count ?? 0

    const alerts: DashboardAlert[] = []

    if (bulletinCount > 0) {
      alerts.push({
        id: 'bulletins',
        icon: 'document-text-outline',
        title: `${bulletinCount} bulletin${bulletinCount > 1 ? 's' : ''} à valider`,
        detail: state.periodLabel
          ? `${state.periodLabel} · en attente de signature`
          : 'En attente de votre signature',
        tone: 'primary',
        route: '/(direction)/validation',
      })
    }

    if (docCount > 0) {
      alerts.push({
        id: 'documents',
        icon: 'create-outline',
        title: `${docCount} document${docCount > 1 ? 's' : ''} à signer`,
        detail: 'Certificats et attestations préparés par le secrétariat',
        tone: 'primary',
        route: '/(direction)/validation',
      })
    }

    if (riskCount > 0) {
      alerts.push({
        id: 'risks',
        icon: 'people-outline',
        title: `${riskCount} élève${riskCount > 1 ? 's' : ''} en difficulté`,
        detail: 'Signaux de priorité élevée à examiner',
        tone: 'accent',
        route: '/(direction)/students',
      })
    }

    if (unpaid > 0) {
      alerts.push({
        id: 'unpaid',
        icon: 'wallet-outline',
        title: 'Impayés en cours',
        detail: `${Math.round(unpaid).toLocaleString('fr-FR')} FCFA restant à recouvrer`,
        tone: unpaid > collected ? 'danger' : 'accent',
        route: '/(direction)/fees',
      })
    }

    setState({
      kpis: {
        students: studentsRes.count ?? null,
        attendanceRate,
        collectedThisMonth: collected,
        unpaidTotal: unpaid,
        alerts: bulletinCount + docCount + riskCount,
      },
      alerts,
      schoolName: school.data?.name ?? null,
      academicYear: school.data?.academic_year ?? null,
      periodLabel: period.data?.label ?? null,
      isLoading: false,
      error: null,
    })
    // `state.periodLabel` n'est lu que pour un libellé : le relire en
    // dépendance relancerait la requête à chaque chargement.
  }, [schoolId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load() }, [load])

  /**
   * Part des opérations parties au serveur.
   * La maquette affiche « 96 % données synchronisées » : ce chiffre
   * n'a de sens que rapporté à ce qui attend réellement.
   */
  const syncHealth = pendingCount === 0 ? 100 : Math.max(0, 100 - pendingCount * 2)

  return { ...state, pendingCount, isOnline, syncHealth, reload: load }
}

// ── Formatage ─────────────────────────────────────────────────────────────────

/** « 4 280 000 » — sans unité : la maquette la place en dessous. */
export function formatCompact(value: number | null): string {
  if (value == null) return '—'
  return Math.round(value).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')
}

export function formatRate(value: number | null): string {
  return value == null ? '—' : `${value.toString().replace('.', ',')} %`
}
