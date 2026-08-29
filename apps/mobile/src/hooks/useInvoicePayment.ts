/**
 * useInvoicePayment — règlement d'une échéance de scolarité.
 *
 * Cahier des charges §14.1, §14.2, §16.3, §22, §26.
 *
 * Le point qui gouverne tout ce hook : **le client ne décide jamais
 * qu'un paiement a réussi**. Il ouvre une demande, l'opérateur
 * encaisse, et c'est l'Edge Function `payment-webhook` qui, après
 * re-confirmation auprès du fournisseur, écrit `success`.
 *
 * Le hook se contente donc d'interroger l'état réel, et le rend tel
 * quel — y compris quand il reste `pending` (§22).
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/config/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'mtn' | 'airtel' | 'cinetpay' | 'cash'

export interface InvoiceLine {
  id: string
  label: string
  kind: string
  amount: number
  discount: number
  net: number
}

export interface PayableInstallment {
  id: string
  invoiceId: string
  invoiceNum: string
  studentId: string
  studentName: string
  className: string | null
  label: string | null
  /** Ce qui reste dû sur cette tranche. */
  remaining: number
  amount: number
  paidAmount: number
  dueDate: string
  currency: string
  isOverdue: boolean
  lines: InvoiceLine[]
  discountTotal: number
}

export type PaymentPhase =
  | 'idle'
  | 'initiating'   // on demande l'URL à l'opérateur
  | 'awaiting'     // l'opérateur a la main, le parent saisit son PIN
  | 'confirmed'    // le webhook a confirmé
  | 'failed'

interface State {
  installment: PayableInstallment | null
  isLoading: boolean
  error: string | null
  phase: PaymentPhase
  paymentId: string | null
  paymentUrl: string | null
  failureReason: string | null
}

const EMPTY: State = {
  installment: null, isLoading: true, error: null,
  phase: 'idle', paymentId: null, paymentUrl: null, failureReason: null,
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useInvoicePayment(installmentId: string | null) {
  const [state, setState] = useState<State>(EMPTY)

  // ── Chargement de l'échéance ────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!installmentId) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }

    // Requête sous l'identité du parent : RLS vérifie le rattachement
    // parent-enfant (§26). Aucun filtre client n'est nécessaire.
    const { data, error } = await supabase
      .from('installments')
      .select(`
        id, invoice_id, student_id, label, amount, paid_amount, due_date,
        invoices ( invoice_num, currency, discount_amount,
                   invoice_lines ( id, label, kind, amount, discount, net ) ),
        profiles!installments_student_id_fkey ( display_name, class_name )
      `)
      .eq('id', installmentId)
      .single()

    if (error || !data) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: error?.message ?? 'Échéance introuvable ou accès refusé',
      }))
      return
    }

    const row = data as unknown as {
      id: string
      invoice_id: string
      student_id: string
      label: string | null
      amount: number
      paid_amount: number
      due_date: string
      invoices: {
        invoice_num: string
        currency: string
        discount_amount: number
        invoice_lines: Array<{
          id: string; label: string; kind: string
          amount: number; discount: number; net: number
        }>
      } | null
      profiles: { display_name: string | null; class_name: string | null } | null
    }

    const remaining = Number(row.amount) - Number(row.paid_amount ?? 0)

    setState((s) => ({
      ...s,
      isLoading: false,
      error: null,
      installment: {
        id: row.id,
        invoiceId: row.invoice_id,
        invoiceNum: row.invoices?.invoice_num ?? '—',
        studentId: row.student_id,
        studentName: row.profiles?.display_name ?? 'Élève',
        className: row.profiles?.class_name ?? null,
        label: row.label,
        remaining,
        amount: Number(row.amount),
        paidAmount: Number(row.paid_amount ?? 0),
        dueDate: row.due_date,
        currency: row.invoices?.currency ?? 'XOF',
        isOverdue: new Date(row.due_date) < new Date() && remaining > 0,
        lines: row.invoices?.invoice_lines ?? [],
        discountTotal: Number(row.invoices?.discount_amount ?? 0),
      },
    }))
  }, [installmentId])

  useEffect(() => { void load() }, [load])

  // ── Initiation ──────────────────────────────────────────────────────────────

  /**
   * Ouvre une demande de paiement.
   *
   * Retourne l'URL de l'opérateur. La réponse porte toujours
   * `status: 'pending'` : l'afficher autrement serait mentir (§22).
   */
  const initiate = useCallback(
    async (phoneNumber: string, method: PaymentMethod) => {
      if (!state.installment) return { ok: false as const, error: 'Échéance non chargée' }

      setState((s) => ({ ...s, phase: 'initiating', failureReason: null }))

      const { data, error } = await supabase.functions.invoke('payment-init', {
        body: {
          installmentId: state.installment.id,
          phoneNumber,
          network: method.toUpperCase(),
        },
      })

      if (error || data?.error) {
        const reason = data?.error ?? error?.message ?? 'Initialisation refusée'
        setState((s) => ({ ...s, phase: 'failed', failureReason: reason }))
        return { ok: false as const, error: reason }
      }

      setState((s) => ({
        ...s,
        phase: 'awaiting',
        paymentId: data.paymentId,
        paymentUrl: data.paymentUrl,
      }))

      return { ok: true as const, paymentUrl: data.paymentUrl as string, paymentId: data.paymentId as string }
    },
    [state.installment]
  )

  // ── Attente de la confirmation serveur ──────────────────────────────────────

  /**
   * Suit le paiement jusqu'à ce que le webhook tranche.
   *
   * On s'abonne au Realtime plutôt que d'interroger en boucle : le
   * parent est souvent sur un réseau facturé à la donnée, et un
   * sondage toutes les deux secondes coûte pour rien.
   *
   * Un délai de sécurité arrête l'attente : au-delà, le paiement
   * reste `pending` et l'écran le dit franchement.
   */
  useEffect(() => {
    if (state.phase !== 'awaiting' || !state.paymentId) return

    const channel = supabase
      .channel(`payment:${state.paymentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${state.paymentId}`,
        },
        (payload) => {
          const next = payload.new as { status: string; failure_reason: string | null }
          if (next.status === 'success') {
            setState((s) => ({ ...s, phase: 'confirmed' }))
            void load()
          } else if (next.status === 'failed') {
            setState((s) => ({
              ...s,
              phase: 'failed',
              failureReason: next.failure_reason ?? 'Paiement refusé par l’opérateur',
            }))
          }
        }
      )
      .subscribe()

    // Cinq minutes : au-delà, l'opérateur a presque toujours tranché.
    const timeout = setTimeout(() => {
      setState((s) =>
        s.phase === 'awaiting'
          ? { ...s, failureReason: 'Confirmation non reçue. Vérifiez votre historique de paiements.' }
          : s
      )
    }, 5 * 60 * 1000)

    return () => {
      void supabase.removeChannel(channel)
      clearTimeout(timeout)
    }
  }, [state.phase, state.paymentId, load])

  const reset = useCallback(() => {
    setState((s) => ({ ...s, phase: 'idle', paymentId: null, paymentUrl: null, failureReason: null }))
  }, [])

  return { ...state, initiate, reload: load, reset }
}

// ── Formatage ─────────────────────────────────────────────────────────────────

/** « 45 000 FCFA » — espace insécable fine, comme dans les maquettes. */
export function formatAmount(value: number, currency = 'XOF'): string {
  const label = currency === 'XOF' ? 'FCFA' : currency
  return `${Math.round(value).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')} ${label}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}
