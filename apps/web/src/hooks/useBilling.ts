/**
 * useBilling — grilles tarifaires, factures et impayés.
 * Cahier des charges §14.1.
 *
 * La caisse (§14.2-3, écran « Finance & caisse ») répond à « qu'a-t-on
 * encaissé aujourd'hui ». Cet écran-ci répond à « qui doit quoi » :
 * ce sont deux questions différentes et deux responsabilités
 * différentes dans l'établissement.
 *
 * Règle centrale : **le reste à payer est la seule donnée qui compte**.
 * Un montant facturé sans le montant déjà réglé ne dit rien, et une
 * échéance dépassée n'est pas un impayé tant que le solde est nul.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'
import { PREVIEW_MODE } from '@/config/preview'

export interface FeeStructure {
  id: string
  label: string
  level: string
  amount: number
  currency: string
  installmentCount: number
  isActive: boolean
}

export interface Invoice {
  id: string
  number: string
  studentName: string
  className: string
  guardianName: string
  guardianPhone: string | null
  totalAmount: number
  paidAmount: number
  currency: string
  dueDate: string
  /** Nombre d'échéances passées dont le solde n'est pas soldé. */
  overdueInstallments: number
}

const PREVIEW_FEES: FeeStructure[] = [
  { id: 'f1', label: 'Scolarité annuelle — 6ème', level: '6ème', amount: 180_000, currency: 'XOF', installmentCount: 3, isActive: true },
  { id: 'f2', label: 'Scolarité annuelle — 5ème', level: '5ème', amount: 190_000, currency: 'XOF', installmentCount: 3, isActive: true },
  { id: 'f3', label: 'Scolarité annuelle — 4ème', level: '4ème', amount: 205_000, currency: 'XOF', installmentCount: 3, isActive: true },
  { id: 'f4', label: 'Scolarité annuelle — 3ème', level: '3ème', amount: 225_000, currency: 'XOF', installmentCount: 3, isActive: true },
  { id: 'f5', label: 'Frais d’inscription', level: 'Tous niveaux', amount: 25_000, currency: 'XOF', installmentCount: 1, isActive: true },
  { id: 'f6', label: 'Tenue scolaire', level: 'Tous niveaux', amount: 18_000, currency: 'XOF', installmentCount: 1, isActive: true },
]

const PREVIEW_INVOICES: Invoice[] = [
  { id: 'v1', number: 'FAC-2026-0311', studentName: 'Destin Moukoko', className: '3ème A', guardianName: 'M. Moukoko Bernard', guardianPhone: '+242 06 445 21 09', totalAmount: 250_000, paidAmount: 250_000, currency: 'XOF', dueDate: '2026-09-15', overdueInstallments: 0 },
  { id: 'v2', number: 'FAC-2026-0312', studentName: 'Grace Mampouya', className: '3ème A', guardianName: 'Mme Mampouya Éliane', guardianPhone: '+242 05 337 88 14', totalAmount: 250_000, paidAmount: 166_666, currency: 'XOF', dueDate: '2026-09-15', overdueInstallments: 0 },
  { id: 'v3', number: 'FAC-2026-0298', studentName: 'Elie Nguesso', className: '3ème A', guardianName: 'M. Nguesso Patrick', guardianPhone: '+242 06 112 45 78', totalAmount: 250_000, paidAmount: 83_333, currency: 'XOF', dueDate: '2026-08-15', overdueInstallments: 1 },
  { id: 'v4', number: 'FAC-2026-0301', studentName: 'Junior Bantsimba', className: '3ème A', guardianName: 'Mme Bantsimba Claudine', guardianPhone: '+242 05 909 33 62', totalAmount: 250_000, paidAmount: 0, currency: 'XOF', dueDate: '2026-07-15', overdueInstallments: 2 },
  { id: 'v5', number: 'FAC-2026-0330', studentName: 'Naomi Mabiala', className: '4ème B', guardianName: 'Mme Mabiala Sylvie', guardianPhone: '+242 06 774 10 25', totalAmount: 230_000, paidAmount: 230_000, currency: 'XOF', dueDate: '2026-09-15', overdueInstallments: 0 },
  { id: 'v6', number: 'FAC-2026-0345', studentName: 'Chris Ondongo', className: '6ème B', guardianName: 'Mme Ondongo Prisca', guardianPhone: '+242 06 331 09 55', totalAmount: 205_000, paidAmount: 68_333, currency: 'XOF', dueDate: '2026-08-15', overdueInstallments: 1 },
]

export function useBilling() {
  const [fees, setFees] = useState<FeeStructure[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (PREVIEW_MODE) {
      setFees(PREVIEW_FEES)
      setInvoices(PREVIEW_INVOICES)
      setLoading(false)
      return
    }
    setLoading(true)
    const [f, i] = await Promise.all([
      supabase.from('fee_structures')
        .select('id, label, level, amount, currency, installment_count, is_active')
        .order('level'),
      supabase.from('invoices')
        .select('id, number, student_name, class_name, guardian_name, guardian_phone, total_amount, paid_amount, currency, due_date, overdue_installments')
        .order('due_date').limit(300),
    ])
    if (f.error) { setError(f.error.message); setLoading(false); return }

    setFees(((f.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      label: (r.label as string) ?? '—',
      level: (r.level as string) ?? 'Tous niveaux',
      amount: Number(r.amount ?? 0),
      currency: (r.currency as string) ?? 'XOF',
      installmentCount: Number(r.installment_count ?? 1),
      isActive: (r.is_active as boolean) ?? true,
    })))

    setInvoices(((i.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      number: (r.number as string) ?? '—',
      studentName: (r.student_name as string) ?? 'Élève',
      className: (r.class_name as string) ?? '—',
      guardianName: (r.guardian_name as string) ?? '—',
      guardianPhone: (r.guardian_phone as string) ?? null,
      totalAmount: Number(r.total_amount ?? 0),
      paidAmount: Number(r.paid_amount ?? 0),
      currency: (r.currency as string) ?? 'XOF',
      dueDate: r.due_date as string,
      overdueInstallments: Number(r.overdue_installments ?? 0),
    })))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const stats = useMemo(() => {
    const billed = invoices.reduce((s, i) => s + i.totalAmount, 0)
    const collected = invoices.reduce((s, i) => s + i.paidAmount, 0)
    const outstanding = billed - collected
    /** Une échéance dépassée n'est un impayé que si le solde reste dû. */
    const late = invoices.filter((i) => i.overdueInstallments > 0 && i.paidAmount < i.totalAmount)
    return {
      billed, collected, outstanding,
      collectionRate: billed > 0 ? Math.round((collected / billed) * 100) : 0,
      lateCount: late.length,
      lateAmount: late.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0),
      settled: invoices.filter((i) => i.paidAmount >= i.totalAmount).length,
    }
  }, [invoices])

  return { fees, invoices, stats, isLoading, error, reload: () => void load() }
}

export function remaining(i: Invoice): number {
  return Math.max(0, i.totalAmount - i.paidAmount)
}

export function paidRatio(i: Invoice): number {
  return i.totalAmount > 0 ? Math.min(100, Math.round((i.paidAmount / i.totalAmount) * 100)) : 0
}
