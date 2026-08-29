/**
 * useCashRegister — guichet d'encaissement.
 *
 * Cahier des charges §14.2, §14.3, §21.4.
 *
 * L'écran précédent faisait saisir le nom de l'élève à la main, sans
 * lien avec sa facture : l'argent entrait en caisse mais le solde de
 * la famille ne bougeait pas. Un parent pouvait payer et rester marqué
 * « en retard ».
 *
 * Ici, un encaissement se rattache **toujours** à une échéance
 * existante. Le trigger `on_payment_success` (migration 008) met alors
 * à jour la tranche puis la facture : aucun solde n'est recalculé à la
 * main.
 *
 * §14.3 impose aussi une caisse ouverte puis fermée, avec comptage
 * physique et écart constaté. Sans session ouverte, on n'encaisse pas.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CashMethod = 'especes' | 'cheque' | 'virement' | 'autre'

export interface StudentHit {
  id: string
  fullName: string
  className: string | null
  studentNumber: string | null
  /** Total restant dû, toutes échéances confondues. */
  balance: number
}

export interface OpenInstallment {
  id: string
  invoiceId: string
  invoiceNum: string
  label: string | null
  remaining: number
  dueDate: string
  currency: string
  isOverdue: boolean
}

export interface CashSession {
  id: string
  openedAt: string
  openingBalance: number
  cashierName: string | null
  /** Encaissé depuis l'ouverture. */
  collected: number
  count: number
}

interface State {
  session: CashSession | null
  results: StudentHit[]
  selected: StudentHit | null
  installments: OpenInstallment[]
  isSearching: boolean
  isLoading: boolean
  isSaving: boolean
  error: string | null
}

const EMPTY: State = {
  session: null, results: [], selected: null, installments: [],
  isSearching: false, isLoading: true, isSaving: false, error: null,
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCashRegister() {
  const { user, profile } = useAuth()
  const [state, setState] = useState<State>(EMPTY)

  const cashierId = user?.id ?? null
  const schoolId = profile?.schoolId ?? null

  // ── Session de caisse ───────────────────────────────────────────────────────

  const loadSession = useCallback(async () => {
    if (!cashierId) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }

    const { data } = await supabase
      .from('cash_sessions')
      .select('id, opened_at, opening_balance, cashier_name')
      .eq('cashier_id', cashierId)
      .eq('status', 'ouverte')
      .maybeSingle()

    if (!data) {
      setState((s) => ({ ...s, session: null, isLoading: false }))
      return
    }

    // Ce qui est entré depuis l'ouverture : le caissier doit pouvoir
    // rapprocher son tiroir sans quitter l'écran.
    const { data: movements } = await supabase
      .from('cash_payments')
      .select('amount')
      .eq('session_id', data.id)

    const rows = (movements ?? []) as Array<{ amount: number }>

    setState((s) => ({
      ...s,
      session: {
        id: data.id,
        openedAt: data.opened_at,
        openingBalance: Number(data.opening_balance ?? 0),
        cashierName: data.cashier_name,
        collected: rows.reduce((sum, m) => sum + Number(m.amount), 0),
        count: rows.length,
      },
      isLoading: false,
    }))
  }, [cashierId])

  useEffect(() => { void loadSession() }, [loadSession])

  const openSession = useCallback(async (openingBalance: number) => {
    if (!cashierId || !schoolId) return { ok: false as const, error: 'Session expirée' }

    const { error } = await supabase.from('cash_sessions').insert({
      school_id: schoolId,
      cashier_id: cashierId,
      cashier_name: profile?.displayName ?? null,
      opening_balance: openingBalance,
      status: 'ouverte',
    })

    if (error) {
      // Un index unique interdit deux caisses ouvertes pour un même
      // caissier : le message doit le dire, pas afficher le code SQL.
      const msg = error.code === '23505'
        ? 'Une caisse est déjà ouverte à votre nom.'
        : error.message
      return { ok: false as const, error: msg }
    }

    await loadSession()
    return { ok: true as const }
  }, [cashierId, schoolId, profile?.displayName, loadSession])

  /**
   * Ferme la caisse sur un comptage physique.
   * L'écart est calculé par la base (colonne générée) : le caissier
   * déclare ce qu'il a compté, pas ce qu'il devrait avoir.
   */
  const closeSession = useCallback(async (countedBalance: number, note?: string) => {
    const session = state.session
    if (!session) return { ok: false as const, error: 'Aucune caisse ouverte' }

    const theoretical = session.openingBalance + session.collected

    const { error } = await supabase
      .from('cash_sessions')
      .update({
        status: 'fermee',
        closed_at: new Date().toISOString(),
        closing_balance: theoretical,
        counted_balance: countedBalance,
        variance_note: note ?? null,
      })
      .eq('id', session.id)

    if (error) return { ok: false as const, error: error.message }

    await loadSession()
    return { ok: true as const, variance: countedBalance - theoretical }
  }, [state.session, loadSession])

  // ── Recherche d'élève ───────────────────────────────────────────────────────

  const search = useCallback(async (query: string) => {
    const q = query.trim()
    if (q.length < 2) {
      setState((s) => ({ ...s, results: [], isSearching: false }))
      return
    }

    setState((s) => ({ ...s, isSearching: true }))

    // Recherche par nom ou par matricule : le parent présente parfois
    // la carte de l'élève plutôt que son nom.
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, class_name, student_number')
      .eq('role', 'student')
      .or(`display_name.ilike.%${q}%,student_number.ilike.%${q}%`)
      .limit(12)

    if (error) {
      setState((s) => ({ ...s, isSearching: false, error: error.message }))
      return
    }

    const rows = (data ?? []) as Array<{
      id: string
      display_name: string | null
      class_name: string | null
      student_number: string | null
    }>

    // Solde de chacun : c'est ce que le caissier annonce au guichet.
    const ids = rows.map((r) => r.id)
    const balances = new Map<string, number>()

    if (ids.length) {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('student_id, balance, status')
        .in('student_id', ids)
        .in('status', ['emise', 'partiellement_payee', 'en_retard'])

      for (const inv of (invoices ?? []) as Array<{ student_id: string; balance: number }>) {
        balances.set(inv.student_id, (balances.get(inv.student_id) ?? 0) + Number(inv.balance))
      }
    }

    setState((s) => ({
      ...s,
      isSearching: false,
      results: rows.map((r) => ({
        id: r.id,
        fullName: r.display_name ?? 'Élève',
        className: r.class_name,
        studentNumber: r.student_number,
        balance: balances.get(r.id) ?? 0,
      })),
    }))
  }, [])

  // ── Échéances d'un élève ────────────────────────────────────────────────────

  const selectStudent = useCallback(async (student: StudentHit) => {
    setState((s) => ({ ...s, selected: student, installments: [], isSearching: true }))

    const { data } = await supabase
      .from('installments')
      .select('id, invoice_id, label, amount, paid_amount, due_date, invoices(invoice_num, currency, status)')
      .eq('student_id', student.id)
      .order('due_date')

    const rows = ((data ?? []) as unknown as Array<{
      id: string; invoice_id: string; label: string | null
      amount: number; paid_amount: number; due_date: string
      invoices: { invoice_num: string; currency: string; status: string } | null
    }>)
      .filter((i) => i.invoices?.status !== 'annulee')
      .map((i) => {
        const remaining = Number(i.amount) - Number(i.paid_amount ?? 0)
        return {
          id: i.id,
          invoiceId: i.invoice_id,
          invoiceNum: i.invoices?.invoice_num ?? '—',
          label: i.label,
          remaining,
          dueDate: i.due_date,
          currency: i.invoices?.currency ?? 'XOF',
          isOverdue: new Date(i.due_date) < new Date() && remaining > 0,
        }
      })
      .filter((i) => i.remaining > 0)

    setState((s) => ({ ...s, installments: rows, isSearching: false, results: [] }))
  }, [])

  const clearStudent = useCallback(() => {
    setState((s) => ({ ...s, selected: null, installments: [], results: [] }))
  }, [])

  // ── Encaissement ────────────────────────────────────────────────────────────

  /**
   * Enregistre un règlement au guichet.
   *
   * Le reçu est numéroté par la base (`next_receipt_num`) : un compteur
   * côté client produirait des doublons dès que deux guichets encaissent
   * en même temps.
   */
  const record = useCallback(async (input: {
    installment: OpenInstallment
    amount: number
    method: CashMethod
    chequeNum?: string
    bankName?: string
    payerName: string
    payerPhone?: string
    notes?: string
  }) => {
    const session = state.session
    const student = state.selected

    if (!session) return { ok: false as const, error: 'Ouvrez la caisse avant d’encaisser' }
    if (!student || !schoolId) return { ok: false as const, error: 'Aucun élève sélectionné' }

    if (input.amount <= 0) {
      return { ok: false as const, error: 'Le montant doit être supérieur à zéro' }
    }
    if (input.amount > input.installment.remaining) {
      return {
        ok: false as const,
        error: `Le montant dépasse le reste dû (${Math.round(input.installment.remaining)} FCFA)`,
      }
    }
    if (input.method === 'cheque' && !input.chequeNum) {
      return { ok: false as const, error: 'Numéro de chèque requis' }
    }

    setState((s) => ({ ...s, isSaving: true }))

    const { data: receiptNum } = await supabase.rpc('next_receipt_num', {
      p_school_id: schoolId,
    })

    const { data, error } = await supabase
      .from('cash_payments')
      .insert({
        school_id: schoolId,
        session_id: session.id,
        student_id: student.id,
        student_name: student.fullName,
        parent_name: input.payerName,
        parent_phone: input.payerPhone ?? null,
        invoice_id: input.installment.invoiceId,
        installment_id: input.installment.id,
        fee_label: input.installment.label ?? 'Frais de scolarité',
        amount: input.amount,
        currency: input.installment.currency,
        method: input.method,
        cheque_num: input.chequeNum ?? null,
        bank_name: input.bankName ?? null,
        receipt_num: receiptNum ?? null,
        received_by: cashierId,
        received_by_name: profile?.displayName ?? null,
        notes: input.notes ?? null,
      })
      .select('id, receipt_num')
      .single()

    setState((s) => ({ ...s, isSaving: false }))

    if (error) return { ok: false as const, error: error.message }

    // Rafraîchir : le solde de l'élève et le total de caisse ont changé.
    await Promise.all([loadSession(), selectStudent(student)])

    return {
      ok: true as const,
      receiptNum: data.receipt_num as string,
      paymentId: data.id as string,
    }
  }, [state.session, state.selected, schoolId, cashierId, profile?.displayName,
      loadSession, selectStudent])

  return {
    ...state,
    search,
    selectStudent,
    clearStudent,
    openSession,
    closeSession,
    record,
    reload: loadSession,
  }
}
