/**
 * useValidationQueue — file de signature du directeur (web).
 *
 * Cahier des charges §3.3, §13.3, §20.1, §21.4.
 *
 * Pendant du hook mobile du même nom. Le web n'affiche pas les mêmes
 * choses : le directeur y traite un lot, pas une carte à la fois. On
 * expose donc une sélection multiple et des filtres, absents du mobile.
 *
 * Les règles métier, elles, sont identiques des deux côtés :
 *  - les anomalies sont calculées, pas laissées à l'appréciation
 *  - « valider tout » ne porte que sur les bulletins sains
 *  - un rejet exige un motif
 *  - signer ne publie pas (§13.3)
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'
import { PREVIEW_MODE } from '@/config/preview'

// ── Types ─────────────────────────────────────────────────────────────────────

export type QueueTab = 'bulletins' | 'documents'

export interface BulletinItem {
  id: string
  studentName: string
  className: string | null
  periodLabel: string | null
  average: number | null
  classAverage: number | null
  rank: number | null
  classSize: number | null
  councilDecision: string | null
  absences: number
  controlledBy: string | null
  submittedAt: string | null
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
  processingIds: string[]
}

const DEFAULT_THRESHOLDS: Thresholds = { honor: 14, excellence: 16, pass: 10 }

// ── Jeu d'aperçu ──────────────────────────────────────────────────────────────

const PREVIEW_BULLETINS: BulletinItem[] = [
  {
    id: 'b1', studentName: 'Destin Moukoko', className: '3ème A', periodLabel: '2e trimestre',
    average: 14.8, classAverage: 11.9, rank: 3, classSize: 38,
    councilDecision: 'Tableau d’honneur avec félicitations du corps professoral.',
    absences: 2, controlledBy: 'M. Makosso', submittedAt: '2026-08-27T09:12:00Z', warnings: [],
  },
  {
    id: 'b2', studentName: 'Grace Mampouya', className: 'Terminale D', periodLabel: '2e trimestre',
    average: 16.4, classAverage: 12.8, rank: 1, classSize: 42,
    councilDecision: 'Excellent trimestre, profil très prometteur pour le Bac.',
    absences: 0, controlledBy: 'M. Makosso', submittedAt: '2026-08-27T09:20:00Z', warnings: [],
  },
  {
    id: 'b3', studentName: 'Elie Nguesso', className: '3ème A', periodLabel: '2e trimestre',
    average: 9.2, classAverage: 11.9, rank: 31, classSize: 38,
    councilDecision: 'Doit fournir un effort soutenu au troisième trimestre.',
    absences: 14, controlledBy: 'M. Makosso', submittedAt: '2026-08-27T10:02:00Z',
    warnings: ['14 absences ce trimestre'],
  },
  {
    id: 'b4', studentName: 'Junior Bantsimba', className: '6ème B', periodLabel: '2e trimestre',
    average: null, classAverage: 12.1, rank: null, classSize: 31,
    councilDecision: null, absences: 1, controlledBy: null,
    submittedAt: '2026-08-28T08:45:00Z',
    warnings: ['Moyenne générale absente', 'Décision de conseil non renseignée'],
  },
]

const PREVIEW_DOCUMENTS: DocumentItem[] = [
  {
    id: 'd1', reference: 'DOC-2026-00184', kind: 'certificat_scolarite',
    title: 'Certificat de scolarité', studentName: 'Junior Bantsimba', className: '6ème B',
    requesterName: 'M. Bantsimba (père)', purpose: 'Visa ambassade',
    neededBy: '2026-08-31', createdAt: '2026-08-28T07:30:00Z', isUrgent: true,
  },
  {
    id: 'd2', reference: 'DOC-2026-00185', kind: 'attestation_inscription',
    title: 'Attestation d’inscription', studentName: 'Clarisse Makosso', className: 'CM2 B',
    requesterName: 'Mme Makosso (mère)', purpose: 'Dossier bourse communale',
    neededBy: '2026-09-10', createdAt: '2026-08-28T11:05:00Z', isUrgent: false,
  },
]

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useValidationQueue() {
  const [state, setState] = useState<State>({
    bulletins: [], documents: [], thresholds: DEFAULT_THRESHOLDS,
    isLoading: true, error: null, processingIds: [],
  })

  const load = useCallback(async () => {
    if (PREVIEW_MODE) {
      setState({
        bulletins: PREVIEW_BULLETINS,
        documents: PREVIEW_DOCUMENTS,
        thresholds: DEFAULT_THRESHOLDS,
        isLoading: false, error: null, processingIds: [],
      })
      return
    }

    setState((s) => ({ ...s, isLoading: true }))

    const [rulesRes, bulletinsRes, docsRes] = await Promise.all([
      supabase.from('grading_rules')
        .select('honor_threshold, excellence_threshold, pass_threshold')
        .is('level_id', null).maybeSingle(),

      supabase.from('bulletin_summaries')
        .select(`
          id, general_average, class_average, rank_in_class, class_size,
          council_decision, absences_count, submitted_at,
          profiles!bulletin_summaries_student_id_fkey ( display_name ),
          classes ( name ),
          academic_periods ( label )
        `)
        .in('state', ['soumis', 'controle'])
        .order('submitted_at'),

      supabase.from('document_requests')
        .select('id, reference, kind, title, student_name, class_name, requester_name, purpose, needed_by, created_at')
        .eq('status', 'a_signer')
        .order('needed_by', { ascending: true, nullsFirst: false }),
    ])

    if (bulletinsRes.error) {
      setState((s) => ({ ...s, isLoading: false, error: bulletinsRes.error!.message }))
      return
    }

    const bulletins: BulletinItem[] = ((bulletinsRes.data ?? []) as unknown as Array<{
      id: string
      general_average: number | null
      class_average: number | null
      rank_in_class: number | null
      class_size: number | null
      council_decision: string | null
      absences_count: number | null
      submitted_at: string | null
      profiles: { display_name: string | null } | null
      classes: { name: string } | null
      academic_periods: { label: string } | null
    }>).map((r) => {
      // Les anomalies sont calculées ici plutôt qu'affichées à
      // l'aveugle : un directeur qui traite 145 bulletins doit voir
      // lesquels regarder.
      const warnings: string[] = []
      if (r.general_average == null) warnings.push('Moyenne générale absente')
      if (!r.council_decision) warnings.push('Décision de conseil non renseignée')
      if ((r.absences_count ?? 0) > 10) warnings.push(`${r.absences_count} absences ce trimestre`)

      return {
        id: r.id,
        studentName: r.profiles?.display_name ?? 'Élève',
        className: r.classes?.name ?? null,
        periodLabel: r.academic_periods?.label ?? null,
        average: r.general_average != null ? Number(r.general_average) : null,
        classAverage: r.class_average != null ? Number(r.class_average) : null,
        rank: r.rank_in_class,
        classSize: r.class_size,
        councilDecision: r.council_decision,
        absences: r.absences_count ?? 0,
        controlledBy: null,
        submittedAt: r.submitted_at,
        warnings,
      }
    })

    const today = new Date()
    const documents: DocumentItem[] = ((docsRes.data ?? []) as Array<{
      id: string; reference: string; kind: string; title: string
      student_name: string | null; class_name: string | null
      requester_name: string | null; purpose: string | null
      needed_by: string | null; created_at: string
    }>).map((r) => {
      const needed = r.needed_by ? new Date(r.needed_by) : null
      const daysLeft = needed
        ? Math.ceil((needed.getTime() - today.getTime()) / 86_400_000)
        : null
      return {
        id: r.id, reference: r.reference, kind: r.kind, title: r.title,
        studentName: r.student_name, className: r.class_name,
        requesterName: r.requester_name, purpose: r.purpose,
        neededBy: r.needed_by, createdAt: r.created_at,
        isUrgent: daysLeft != null && daysLeft <= 2,
      }
    })

    setState({
      bulletins,
      documents,
      thresholds: {
        honor: Number(rulesRes.data?.honor_threshold ?? 14),
        excellence: Number(rulesRes.data?.excellence_threshold ?? 16),
        pass: Number(rulesRes.data?.pass_threshold ?? 10),
      },
      isLoading: false, error: null, processingIds: [],
    })
  }, [])

  useEffect(() => { void load() }, [load])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const removeLocally = useCallback((ids: string[], kind: QueueTab) => {
    setState((s) => ({
      ...s,
      bulletins: kind === 'bulletins' ? s.bulletins.filter((b) => !ids.includes(b.id)) : s.bulletins,
      documents: kind === 'documents' ? s.documents.filter((d) => !ids.includes(d.id)) : s.documents,
      processingIds: [],
    }))
  }, [])

  const signBulletins = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return { ok: false as const, error: 'Aucun bulletin sélectionné' }
    setState((s) => ({ ...s, processingIds: ids }))

    if (!PREVIEW_MODE) {
      const { data: session } = await supabase.auth.getSession()
      const signer = session.session?.user.id
      const { error } = await supabase
        .from('bulletin_summaries')
        .update({
          state: 'valide',
          validated_by: signer,
          validated_at: new Date().toISOString(),
          signed_by: signer,
        })
        .in('id', ids)

      if (error) {
        setState((s) => ({ ...s, processingIds: [] }))
        return { ok: false as const, error: error.message }
      }
    }

    removeLocally(ids, 'bulletins')
    return { ok: true as const, count: ids.length }
  }, [removeLocally])

  const rejectBulletin = useCallback(async (id: string, reason: string) => {
    setState((s) => ({ ...s, processingIds: [id] }))

    if (!PREVIEW_MODE) {
      const { error } = await supabase
        .from('bulletin_summaries')
        .update({ state: 'rejete', general_comment: reason })
        .eq('id', id)

      if (error) {
        setState((s) => ({ ...s, processingIds: [] }))
        return { ok: false as const, error: error.message }
      }
    }

    removeLocally([id], 'bulletins')
    return { ok: true as const }
  }, [removeLocally])

  const signDocument = useCallback(async (id: string) => {
    setState((s) => ({ ...s, processingIds: [id] }))

    if (!PREVIEW_MODE) {
      const { data: session } = await supabase.auth.getSession()
      const { error } = await supabase
        .from('document_requests')
        .update({
          status: 'signe',
          signed_by: session.session?.user.id,
          signed_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        setState((s) => ({ ...s, processingIds: [] }))
        return { ok: false as const, error: error.message }
      }
    }

    removeLocally([id], 'documents')
    return { ok: true as const }
  }, [removeLocally])

  const refuseDocument = useCallback(async (id: string, reason: string) => {
    setState((s) => ({ ...s, processingIds: [id] }))

    if (!PREVIEW_MODE) {
      const { error } = await supabase
        .from('document_requests')
        .update({ status: 'refuse', refusal_reason: reason })
        .eq('id', id)

      if (error) {
        setState((s) => ({ ...s, processingIds: [] }))
        return { ok: false as const, error: error.message }
      }
    }

    removeLocally([id], 'documents')
    return { ok: true as const }
  }, [removeLocally])

  // ── Dérivés ─────────────────────────────────────────────────────────────────

  const counts = useMemo(() => ({
    bulletins: state.bulletins.length,
    documents: state.documents.length,
    total: state.bulletins.length + state.documents.length,
    clean: state.bulletins.filter((b) => b.warnings.length === 0).length,
    flagged: state.bulletins.filter((b) => b.warnings.length > 0).length,
  }), [state.bulletins, state.documents])

  return {
    ...state,
    counts,
    reload: load,
    signBulletins,
    rejectBulletin,
    signDocument,
    refuseDocument,
  }
}

// ── Aide à l'affichage ────────────────────────────────────────────────────────

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
