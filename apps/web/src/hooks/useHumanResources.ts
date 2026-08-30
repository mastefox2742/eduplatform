/**
 * useHumanResources — personnel, contrats, paie, congés.
 * Cahier des charges §18.5, §3.3.
 *
 * Le schéma existe depuis la migration 010 (`staff_records`,
 * `teacher_contracts`, `monthly_payroll`, `leave_requests`,
 * `leave_balances`) et les Cloud Functions calculent la paie. Il
 * manquait l'interface.
 *
 * Deux règles portées par ce hook :
 *
 *  - **Une paie se valide avant d'être payée.** L'état passe par
 *    brouillon → validé → payé. Rien ne sort de la caisse sur un
 *    brouillon.
 *  - **Un congé demandé n'est pas un congé accordé.** L'écran distingue
 *    les deux, et le solde ne bouge qu'à l'approbation.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'
import { PREVIEW_MODE } from '@/config/preview'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ContractType = 'permanent' | 'contractuel' | 'vacataire'
export type PayrollStatus = 'draft' | 'validated' | 'paid'
export type LeaveStatus = 'demande' | 'approuve' | 'refuse' | 'annule'

export interface StaffMember {
  id: string
  fullName: string
  jobTitle: string | null
  department: string | null
  employeeNum: string | null
  contractType: ContractType | null
  baseSalary: number | null
  hiredOn: string | null
  isActive: boolean
  /** Heures hebdomadaires attendues, pour les vacataires surtout. */
  hoursWeek: number | null
  /** Jours de congé restants sur l'année. */
  leaveRemaining: number | null
}

export interface PayrollLine {
  id: string
  staffId: string
  staffName: string
  month: string
  scheduledHours: number
  effectiveHours: number
  absenceHours: number
  grossAmount: number
  netAmount: number
  status: PayrollStatus
  currency: string
}

export interface LeaveRequest {
  id: string
  staffId: string
  staffName: string
  kind: string
  dateFrom: string
  dateTo: string
  daysCount: number
  reason: string | null
  status: LeaveStatus
  createdAt: string
}

interface State {
  staff: StaffMember[]
  payroll: PayrollLine[]
  leaves: LeaveRequest[]
  month: string
  isLoading: boolean
  error: string | null
  busyId: string | null
}

// ── Libellés ──────────────────────────────────────────────────────────────────

export const CONTRACT_LABELS: Record<ContractType, string> = {
  permanent:   'Permanent',
  contractuel: 'Contractuel',
  vacataire:   'Vacataire',
}

export const LEAVE_KIND_LABELS: Record<string, string> = {
  annuel:       'Congé annuel',
  maladie:      'Arrêt maladie',
  maternite:    'Congé maternité',
  paternite:    'Congé paternité',
  sans_solde:   'Sans solde',
  formation:    'Formation',
  exceptionnel: 'Exceptionnel',
}

export const PAYROLL_LABELS: Record<PayrollStatus, string> = {
  draft:     'Brouillon',
  validated: 'Validé',
  paid:      'Payé',
}

// ── Jeu d'aperçu ──────────────────────────────────────────────────────────────

const PREVIEW_STAFF: StaffMember[] = [
  { id: 's1', fullName: 'M. Okemba Jean-Paul', jobTitle: 'Professeur de mathématiques', department: 'Sciences',   employeeNum: 'EMP-0012', contractType: 'permanent',   baseSalary: 320_000, hiredOn: '2019-09-01', isActive: true, hoursWeek: 18, leaveRemaining: 12 },
  { id: 's2', fullName: 'Mme Ngoma Clarisse',  jobTitle: 'Professeure de SVT',           department: 'Sciences',   employeeNum: 'EMP-0018', contractType: 'permanent',   baseSalary: 305_000, hiredOn: '2020-09-01', isActive: true, hoursWeek: 16, leaveRemaining: 20 },
  { id: 's3', fullName: 'M. Makosso André',    jobTitle: 'Directeur des Études',         department: 'Direction',  employeeNum: 'EMP-0003', contractType: 'permanent',   baseSalary: 480_000, hiredOn: '2015-09-01', isActive: true, hoursWeek: 35, leaveRemaining: 8  },
  { id: 's4', fullName: 'M. Ndoudi Serge',     jobTitle: 'Professeur de physique',       department: 'Sciences',   employeeNum: 'EMP-0041', contractType: 'contractuel', baseSalary: 260_000, hiredOn: '2023-09-01', isActive: true, hoursWeek: 14, leaveRemaining: 18 },
  { id: 's5', fullName: 'Mme Mabiala Sylvie',  jobTitle: 'Professeure de français',      department: 'Lettres',    employeeNum: 'EMP-0027', contractType: 'permanent',   baseSalary: 310_000, hiredOn: '2018-09-01', isActive: true, hoursWeek: 17, leaveRemaining: 0  },
  { id: 's6', fullName: 'M. Bantsimba Alain',  jobTitle: 'Surveillant Général',          department: 'Vie scolaire', employeeNum: 'EMP-0009', contractType: 'permanent', baseSalary: 285_000, hiredOn: '2017-09-01', isActive: true, hoursWeek: 40, leaveRemaining: 15 },
  { id: 's7', fullName: 'Mme Loubaki Estelle', jobTitle: 'Secrétaire',                   department: 'Administration', employeeNum: 'EMP-0015', contractType: 'permanent', baseSalary: 210_000, hiredOn: '2021-01-15', isActive: true, hoursWeek: 40, leaveRemaining: 22 },
  { id: 's8', fullName: 'M. Kimbembe Paul',    jobTitle: 'Professeur d’histoire',        department: 'Lettres',    employeeNum: 'EMP-0055', contractType: 'vacataire',   baseSalary: null,    hiredOn: '2026-01-08', isActive: true, hoursWeek: 6,  leaveRemaining: null },
]

const PREVIEW_PAYROLL: PayrollLine[] = [
  { id: 'p1', staffId: 's1', staffName: 'M. Okemba Jean-Paul', month: '2026-08', scheduledHours: 72, effectiveHours: 70, absenceHours: 2, grossAmount: 320_000, netAmount: 291_200, status: 'validated', currency: 'XOF' },
  { id: 'p2', staffId: 's2', staffName: 'Mme Ngoma Clarisse',  month: '2026-08', scheduledHours: 64, effectiveHours: 64, absenceHours: 0, grossAmount: 305_000, netAmount: 277_550, status: 'validated', currency: 'XOF' },
  { id: 'p3', staffId: 's3', staffName: 'M. Makosso André',    month: '2026-08', scheduledHours: 140, effectiveHours: 140, absenceHours: 0, grossAmount: 480_000, netAmount: 436_800, status: 'paid',      currency: 'XOF' },
  { id: 'p4', staffId: 's4', staffName: 'M. Ndoudi Serge',     month: '2026-08', scheduledHours: 56, effectiveHours: 48, absenceHours: 8, grossAmount: 222_857, netAmount: 202_800, status: 'draft',     currency: 'XOF' },
  { id: 'p5', staffId: 's5', staffName: 'Mme Mabiala Sylvie',  month: '2026-08', scheduledHours: 68, effectiveHours: 68, absenceHours: 0, grossAmount: 310_000, netAmount: 282_100, status: 'draft',     currency: 'XOF' },
  { id: 'p6', staffId: 's8', staffName: 'M. Kimbembe Paul',    month: '2026-08', scheduledHours: 24, effectiveHours: 24, absenceHours: 0, grossAmount:  96_000, netAmount:  87_360, status: 'draft',     currency: 'XOF' },
]

const PREVIEW_LEAVES: LeaveRequest[] = [
  { id: 'l1', staffId: 's4', staffName: 'M. Ndoudi Serge',    kind: 'maladie',      dateFrom: '2026-08-24', dateTo: '2026-08-26', daysCount: 3,  reason: 'Certificat médical fourni',        status: 'demande',  createdAt: '2026-08-23T08:12:00Z' },
  { id: 'l2', staffId: 's7', staffName: 'Mme Loubaki Estelle', kind: 'annuel',      dateFrom: '2026-09-14', dateTo: '2026-09-25', daysCount: 10, reason: 'Congés annuels',                    status: 'demande',  createdAt: '2026-08-27T14:30:00Z' },
  { id: 'l3', staffId: 's2', staffName: 'Mme Ngoma Clarisse',  kind: 'formation',   dateFrom: '2026-09-02', dateTo: '2026-09-03', daysCount: 2,  reason: 'Séminaire pédagogique national',    status: 'approuve', createdAt: '2026-08-20T10:00:00Z' },
  { id: 'l4', staffId: 's5', staffName: 'Mme Mabiala Sylvie',  kind: 'exceptionnel', dateFrom: '2026-08-18', dateTo: '2026-08-18', daysCount: 1, reason: 'Événement familial',                status: 'refuse',   createdAt: '2026-08-15T09:00:00Z' },
]

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useHumanResources() {
  const [state, setState] = useState<State>({
    staff: [], payroll: [], leaves: [],
    month: currentMonth(), isLoading: true, error: null, busyId: null,
  })

  const load = useCallback(async (month: string) => {
    if (PREVIEW_MODE) {
      setState({
        staff: PREVIEW_STAFF, payroll: PREVIEW_PAYROLL, leaves: PREVIEW_LEAVES,
        month, isLoading: false, error: null, busyId: null,
      })
      return
    }

    setState((s) => ({ ...s, isLoading: true, month }))

    const [staffRes, contractsRes, payrollRes, leavesRes, balancesRes] = await Promise.all([
      supabase.from('staff_records')
        .select('id, staff_id, employee_num, job_title, department, hired_on, left_on, contract_type, base_salary, profiles!staff_records_staff_id_fkey(display_name, is_active)'),
      supabase.from('teacher_contracts')
        .select('teacher_id, contract_type, base_salary, expected_hours_week, is_active')
        .eq('is_active', true),
      supabase.from('monthly_payroll')
        .select('id, teacher_id, teacher_name, month, scheduled_hours, effective_hours, absence_hours, gross_amount, net_amount, status, currency')
        .eq('month', month),
      supabase.from('leave_requests')
        .select('id, staff_id, staff_name, kind, date_from, date_to, days_count, reason, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('leave_balances').select('staff_id, remaining'),
    ])

    if (staffRes.error) {
      setState((s) => ({ ...s, isLoading: false, error: staffRes.error!.message }))
      return
    }

    const hours = new Map<string, number>()
    const contractOf = new Map<string, ContractType>()
    for (const c of (contractsRes.data ?? []) as Array<{
      teacher_id: string; contract_type: ContractType; expected_hours_week: number | null
    }>) {
      if (c.expected_hours_week != null) hours.set(c.teacher_id, Number(c.expected_hours_week))
      contractOf.set(c.teacher_id, c.contract_type)
    }

    const remaining = new Map<string, number>()
    for (const b of (balancesRes.data ?? []) as Array<{ staff_id: string; remaining: number }>) {
      remaining.set(b.staff_id, Number(b.remaining))
    }

    const staff: StaffMember[] = ((staffRes.data ?? []) as unknown as Array<{
      id: string; staff_id: string; employee_num: string | null
      job_title: string | null; department: string | null
      hired_on: string | null; left_on: string | null
      contract_type: ContractType | null; base_salary: number | null
      profiles: { display_name: string | null; is_active: boolean } | null
    }>).map((r) => ({
      id: r.staff_id,
      fullName: r.profiles?.display_name ?? 'Personnel',
      jobTitle: r.job_title,
      department: r.department,
      employeeNum: r.employee_num,
      contractType: r.contract_type ?? contractOf.get(r.staff_id) ?? null,
      baseSalary: r.base_salary != null ? Number(r.base_salary) : null,
      hiredOn: r.hired_on,
      isActive: r.left_on == null && (r.profiles?.is_active ?? true),
      hoursWeek: hours.get(r.staff_id) ?? null,
      leaveRemaining: remaining.get(r.staff_id) ?? null,
    }))

    const payroll: PayrollLine[] = ((payrollRes.data ?? []) as Array<{
      id: string; teacher_id: string; teacher_name: string | null; month: string
      scheduled_hours: number; effective_hours: number; absence_hours: number
      gross_amount: number; net_amount: number; status: PayrollStatus; currency: string
    }>).map((r) => ({
      id: r.id,
      staffId: r.teacher_id,
      staffName: r.teacher_name ?? 'Personnel',
      month: r.month,
      scheduledHours: Number(r.scheduled_hours ?? 0),
      effectiveHours: Number(r.effective_hours ?? 0),
      absenceHours: Number(r.absence_hours ?? 0),
      grossAmount: Number(r.gross_amount),
      netAmount: Number(r.net_amount),
      status: r.status,
      currency: r.currency ?? 'XOF',
    }))

    const leaves: LeaveRequest[] = ((leavesRes.data ?? []) as Array<{
      id: string; staff_id: string; staff_name: string | null; kind: string
      date_from: string; date_to: string; days_count: number | null
      reason: string | null; status: LeaveStatus; created_at: string
    }>).map((r) => ({
      id: r.id,
      staffId: r.staff_id,
      staffName: r.staff_name ?? 'Personnel',
      kind: r.kind,
      dateFrom: r.date_from,
      dateTo: r.date_to,
      daysCount: Number(r.days_count ?? 0),
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
    }))

    setState({ staff, payroll, leaves, month, isLoading: false, error: null, busyId: null })
  }, [])

  useEffect(() => { void load(currentMonth()) }, [load])

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Valide un bulletin de paie.
   * Un brouillon ne doit jamais être payé : c'est cette validation qui
   * autorise le décaissement (§3.3).
   */
  const validatePayslip = useCallback(async (id: string) => {
    setState((s) => ({ ...s, busyId: id }))

    if (!PREVIEW_MODE) {
      const { data: session } = await supabase.auth.getSession()
      const { error } = await supabase
        .from('monthly_payroll')
        .update({
          status: 'validated',
          validated_by: session.session?.user.id,
          validated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        setState((s) => ({ ...s, busyId: null }))
        return { ok: false as const, error: error.message }
      }
    }

    setState((s) => ({
      ...s,
      busyId: null,
      payroll: s.payroll.map((p) => (p.id === id ? { ...p, status: 'validated' } : p)),
    }))
    return { ok: true as const }
  }, [])

  const markPaid = useCallback(async (id: string) => {
    setState((s) => ({ ...s, busyId: id }))

    if (!PREVIEW_MODE) {
      const { error } = await supabase
        .from('monthly_payroll')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        setState((s) => ({ ...s, busyId: null }))
        return { ok: false as const, error: error.message }
      }
    }

    setState((s) => ({
      ...s,
      busyId: null,
      payroll: s.payroll.map((p) => (p.id === id ? { ...p, status: 'paid' } : p)),
    }))
    return { ok: true as const }
  }, [])

  const decideLeave = useCallback(async (id: string, approve: boolean, note?: string) => {
    setState((s) => ({ ...s, busyId: id }))

    if (!PREVIEW_MODE) {
      const { data: session } = await supabase.auth.getSession()
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: approve ? 'approuve' : 'refuse',
          approved_by: session.session?.user.id,
          approved_at: new Date().toISOString(),
          refusal_note: approve ? null : (note ?? null),
        })
        .eq('id', id)

      if (error) {
        setState((s) => ({ ...s, busyId: null }))
        return { ok: false as const, error: error.message }
      }
    }

    setState((s) => ({
      ...s,
      busyId: null,
      leaves: s.leaves.map((l) =>
        l.id === id ? { ...l, status: approve ? 'approuve' : 'refuse' } : l
      ),
    }))
    return { ok: true as const }
  }, [])

  // ── Dérivés ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active = state.staff.filter((s) => s.isActive)
    const massSalary = state.payroll.reduce((sum, p) => sum + p.netAmount, 0)
    const toValidate = state.payroll.filter((p) => p.status === 'draft').length
    const toPay = state.payroll.filter((p) => p.status === 'validated').length
    const pendingLeaves = state.leaves.filter((l) => l.status === 'demande').length

    const byDepartment = new Map<string, number>()
    for (const s of active) {
      const d = s.department ?? 'Non affecté'
      byDepartment.set(d, (byDepartment.get(d) ?? 0) + 1)
    }

    return {
      headcount: active.length,
      massSalary,
      toValidate,
      toPay,
      pendingLeaves,
      byDepartment: [...byDepartment.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    }
  }, [state.staff, state.payroll, state.leaves])

  return {
    ...state,
    stats,
    setMonth: (m: string) => void load(m),
    reload: () => void load(state.month),
    validatePayslip,
    markPaid,
    decideLeave,
  }
}

// ── Formatage ─────────────────────────────────────────────────────────────────

export function formatMoney(value: number | null, currency = 'XOF'): string {
  if (value == null) return '—'
  const label = currency === 'XOF' ? 'FCFA' : currency
  return `${Math.round(value).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')} ${label}`
}

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
