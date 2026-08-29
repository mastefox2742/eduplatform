/**
 * useValidationQueue — la file de signature du directeur.
 *
 * Cahier des charges §3.3, §8.3, §13.3, §20.1, §21.4.
 *
 * Ce que cet écran a de particulier : **c'est le seul endroit où une
 * décision engage l'établissement**. Signer un bulletin le rend
 * opposable ; signer un certificat de scolarité produit un document
 * qui servira à obtenir un visa. Trois conséquences dans ce hook :
 *
 *  - Chaque action laisse une trace nominative (`signed_by`), pas un
 *    simple changement d'état.
 *  - Un rejet exige un motif : renvoyer un bulletin sans dire pourquoi
 *    fait perdre une journée à l'enseignant.
 *  - « Valider tout » existe parce qu'un directeur signe 24 bulletins
 *    d'affilée, mais il ne s'applique **qu'aux bulletins sans anomalie**.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  signBulletinSummary, rejectBulletinSummary,
  signDocumentRequest, refuseDocumentRequest,
} from '@/services/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export type QueueTab = 'bulletins' | 'documents'

export interface BulletinItem {
  id: string
  studentId: string
  studentName: string
  photoUrl: string | null
  className: string | null
  periodLabel: string | null
  average: number | null
  classAverage: number | null
  rank: number | null
  classSize: number | null
  councilDecision: string | null
  honor: string | null
  absences: number
  submittedAt: string | null
  /**
   * Ce qui doit retenir l'attention du directeur avant de signer :
   * moyenne manquante, absences nombreuses, décision de conseil vide.
   */
  warnings: string[]
}

export interface DocumentItem {
  id: string
  reference: string
  kind: string
  title: string
  studentName: string | null
  className: string | null
  requesterName: string | null
  purpose: string | null
  neededBy: string | null
  createdAt: string
  copies: number
  feeAmount: number | null
  feePaid: boolean
  /** L'échéance est-elle dépassée ou imminente ? */
  isUrgent: boolean
}

interface Thresholds {
  honor: number
  excellence: number
  pass: number
}

interface State {
  bulletins: BulletinItem[]
  documents: DocumentItem[]
  thresholds: Thresholds
  isLoading: boolean
  error: string | null
  /** Identifiant en cours de traitement, pour désactiver sa carte. */
  processingId: string | null
}

const DEFAULT_THRESHOLDS: Thresholds = { honor: 14, excellence: 16, pass: 10 }

const EMPTY: State = {
  bulletins: [], documents: [], thresholds: DEFAULT_THRESHOLDS,
  isLoading: true, error: null, processingId: null,
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useValidationQueue() {
  const { user } = useAuth()
  const [state, setState] = useState<State>(EMPTY)

  const signerId = user?.id ?? null

  // ── Seuils de mention ───────────────────────────────────────────────────────

  const loadThresholds = useCallback(async () => {
    // Les seuils viennent de l'école, pas du code : un établissement
    // peut placer le tableau d'honneur à 15 plutôt qu'à 14 (§5.2).
    const { data } = await supabase
      .from('grading_rules')
      .select('honor_threshold, excellence_threshold, pass_threshold')
      .is('level_id', null)
      .maybeSingle()

    if (!data) return
    setState((s) => ({
      ...s,
      thresholds: {
        honor: Number(data.honor_threshold ?? 14),
        excellence: Number(data.excellence_threshold ?? 16),
        pass: Number(data.pass_threshold ?? 10),
      },
    }))
  }, [])

  // ── Bulletins en attente ────────────────────────────────────────────────────

  const loadBulletins = useCallback(async () => {
    const { data, error } = await supabase
      .from('bulletin_summaries')
      .select(`
        id, student_id, class_id, general_average, class_average,
        rank_in_class, class_size, council_decision, honor,
        absences_count, submitted_at, state,
        profiles!bulletin_summaries_student_id_fkey ( display_name, photo_url ),
        classes ( name ),
        academic_periods ( label )
      `)
      .in('state', ['soumis', 'controle'])
      .order('submitted_at', { ascending: true })

    if (error) {
      setState((s) => ({ ...s, error: error.message, isLoading: false }))
      return
    }

    const rows = (data ?? []) as unknown as Array<{
      id: string
      student_id: string
      general_average: number | null
      class_average: number | null
      rank_in_class: number | null
      class_size: number | null
      council_decision: string | null
      honor: string | null
      absences_count: number | null
      submitted_at: string | null
      profiles: { display_name: string | null; photo_url: string | null } | null
      classes: { name: string } | null
      academic_periods: { label: string } | null
    }>

    const bulletins: BulletinItem[] = rows.map((r) => {
      // Les anomalies sont calculées ici plutôt qu'affichées à l'aveugle :
      // un directeur qui signe 24 bulletins doit voir lesquels regarder.
      const warnings: string[] = []
      if (r.general_average == null) warnings.push('Moyenne générale absente')
      if (!r.council_decision) warnings.push('Décision de conseil non renseignée')
      if ((r.absences_count ?? 0) > 10) warnings.push(`${r.absences_count} absences ce trimestre`)

      return {
        id: r.id,
        studentId: r.student_id,
        studentName: r.profiles?.display_name ?? 'Élève',
        photoUrl: r.profiles?.photo_url ?? null,
        className: r.classes?.name ?? null,
        periodLabel: r.academic_periods?.label ?? null,
        average: r.general_average != null ? Number(r.general_average) : null,
        classAverage: r.class_average != null ? Number(r.class_average) : null,
        rank: r.rank_in_class,
        classSize: r.class_size,
        councilDecision: r.council_decision,
        honor: r.honor,
        absences: r.absences_count ?? 0,
        submittedAt: r.submitted_at,
        warnings,
      }
    })

    setState((s) => ({ ...s, bulletins, isLoading: false, error: null }))
  }, [])

  // ── Documents à signer ──────────────────────────────────────────────────────

  const loadDocuments = useCallback(async () => {
    const { data, error } = await supabase
      .from('document_requests')
      .select(`
        id, reference, kind, title, student_name, class_name,
        requester_name, purpose, needed_by, created_at, copies,
        fee_amount, fee_paid
      `)
      .eq('status', 'a_signer')
      .order('needed_by', { ascending: true, nullsFirst: false })

    if (error) {
      // Un échec ici ne doit pas vider la file des bulletins : les deux
      // onglets sont indépendants.
      setState((s) => ({ ...s, documents: [] }))
      return
    }

    const today = new Date()
    const documents: DocumentItem[] = ((data ?? []) as Array<{
      id: string; reference: string; kind: string; title: string
      student_name: string | null; class_name: string | null
      requester_name: string | null; purpose: string | null
      needed_by: string | null; created_at: string; copies: number
      fee_amount: number | null; fee_paid: boolean
    }>).map((r) => {
      const needed = r.needed_by ? new Date(r.needed_by) : null
      const daysLeft = needed
        ? Math.ceil((needed.getTime() - today.getTime()) / 86_400_000)
        : null

      return {
        id: r.id,
        reference: r.reference,
        kind: r.kind,
        title: r.title,
        studentName: r.student_name,
        className: r.class_name,
        requesterName: r.requester_name,
        purpose: r.purpose,
        neededBy: r.needed_by,
        createdAt: r.created_at,
        copies: r.copies ?? 1,
        feeAmount: r.fee_amount != null ? Number(r.fee_amount) : null,
        feePaid: r.fee_paid,
        isUrgent: daysLeft != null && daysLeft <= 2,
      }
    })

    setState((s) => ({ ...s, documents }))
  }, [])

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true }))
    await Promise.all([loadBulletins(), loadDocuments()])
  }, [loadBulletins, loadDocuments])

  useEffect(() => {
    void loadThresholds()
    void reload()
  }, [loadThresholds, reload])

  // ── Realtime : la file bouge pendant qu'on la traite ────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('validation-queue')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bulletin_summaries' },
        () => void loadBulletins())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'document_requests' },
        () => void loadDocuments())
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [loadBulletins, loadDocuments])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const signBulletin = useCallback(async (id: string, comment?: string) => {
    if (!signerId) return { ok: false as const, error: 'Session expirée' }

    setState((s) => ({ ...s, processingId: id }))
    try {
      await signBulletinSummary(id, signerId, comment)
      // Retrait optimiste : la carte disparaît sans attendre le Realtime.
      setState((s) => ({
        ...s,
        bulletins: s.bulletins.filter((b) => b.id !== id),
        processingId: null,
      }))
      return { ok: true as const }
    } catch (e) {
      setState((s) => ({ ...s, processingId: null }))
      return { ok: false as const, error: e instanceof Error ? e.message : 'Échec de la signature' }
    }
  }, [signerId])

  const rejectBulletin = useCallback(async (id: string, reason: string) => {
    setState((s) => ({ ...s, processingId: id }))
    try {
      await rejectBulletinSummary(id, reason)
      setState((s) => ({
        ...s,
        bulletins: s.bulletins.filter((b) => b.id !== id),
        processingId: null,
      }))
      return { ok: true as const }
    } catch (e) {
      setState((s) => ({ ...s, processingId: null }))
      return { ok: false as const, error: e instanceof Error ? e.message : 'Échec du rejet' }
    }
  }, [])

  const signDocument = useCallback(async (id: string) => {
    if (!signerId) return { ok: false as const, error: 'Session expirée' }

    setState((s) => ({ ...s, processingId: id }))
    try {
      await signDocumentRequest(id, signerId)
      setState((s) => ({
        ...s,
        documents: s.documents.filter((d) => d.id !== id),
        processingId: null,
      }))
      return { ok: true as const }
    } catch (e) {
      setState((s) => ({ ...s, processingId: null }))
      return { ok: false as const, error: e instanceof Error ? e.message : 'Échec de la signature' }
    }
  }, [signerId])

  const refuseDocument = useCallback(async (id: string, reason: string) => {
    setState((s) => ({ ...s, processingId: id }))
    try {
      await refuseDocumentRequest(id, reason)
      setState((s) => ({
        ...s,
        documents: s.documents.filter((d) => d.id !== id),
        processingId: null,
      }))
      return { ok: true as const }
    } catch (e) {
      setState((s) => ({ ...s, processingId: null }))
      return { ok: false as const, error: e instanceof Error ? e.message : 'Échec du refus' }
    }
  }, [])

  /**
   * Signature en lot.
   *
   * Ne porte que sur les bulletins **sans anomalie** : signer d'un
   * geste un bulletin dont la moyenne manque reviendrait à valider
   * une erreur de saisie. Les autres restent dans la file, à examiner.
   */
  const signAllClean = useCallback(async () => {
    if (!signerId) return { signed: 0, skipped: 0 }

    const clean = state.bulletins.filter((b) => b.warnings.length === 0)
    const skipped = state.bulletins.length - clean.length
    let signed = 0

    for (const b of clean) {
      try {
        await signBulletinSummary(b.id, signerId)
        signed++
      } catch {
        // On continue : un échec isolé ne doit pas interrompre le lot.
      }
    }

    await loadBulletins()
    return { signed, skipped }
  }, [state.bulletins, signerId, loadBulletins])

  // ── Dérivés d'affichage ─────────────────────────────────────────────────────

  const counts = useMemo(() => ({
    bulletins: state.bulletins.length,
    documents: state.documents.length,
    total: state.bulletins.length + state.documents.length,
    clean: state.bulletins.filter((b) => b.warnings.length === 0).length,
  }), [state.bulletins, state.documents])

  return {
    ...state,
    counts,
    reload,
    signBulletin,
    rejectBulletin,
    signDocument,
    refuseDocument,
    signAllClean,
  }
}

// ── Aide à l'affichage ────────────────────────────────────────────────────────

/**
 * Ton de la pastille de moyenne.
 * Les seuils viennent de l'école : teal au-dessus de l'excellence,
 * ambre au-dessus de l'honneur, rouge sous la moyenne de passage.
 */
export function averageTone(
  average: number | null,
  t: Thresholds
): 'secondary' | 'accent' | 'danger' | 'muted' {
  if (average == null) return 'muted'
  if (average >= t.excellence) return 'secondary'
  if (average >= t.honor) return 'accent'
  if (average < t.pass) return 'danger'
  return 'muted'
}

export function documentKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    certificat_scolarite:    'Certificat de scolarité',
    attestation_inscription: 'Attestation d’inscription',
    releve_notes:            'Relevé de notes',
    bulletin_duplicata:      'Duplicata de bulletin',
    certificat_fin_cycle:    'Certificat de fin de cycle',
    attestation_paiement:    'Attestation de paiement',
    convocation:             'Convocation',
    carte_scolaire:          'Carte scolaire',
    autre:                   'Document',
  }
  return labels[kind] ?? 'Document'
}
