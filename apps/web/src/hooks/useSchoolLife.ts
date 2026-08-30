/**
 * useSchoolLife — discipline, incidents, sorties et autorisations.
 * Cahier des charges §11.2 (discipline), §11.3 (sorties).
 *
 * Deux règles structurent ce domaine :
 *
 *  - **Une sanction se notifie.** Un incident consigné mais jamais
 *    transmis à la famille n'a aucune valeur éducative et se retourne
 *    contre l'établissement au conseil de discipline. L'état
 *    « notifié » est donc distinct de l'état « consigné ».
 *  - **Un élève ne sort pas sans autorisation tracée.** Qui autorise,
 *    quand, et qui récupère l'élève : les trois sont exigés, parce que
 *    c'est la responsabilité de l'école qui est engagée.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'
import { PREVIEW_MODE } from '@/config/preview'

export type IncidentSeverity = 'mineur' | 'moyen' | 'grave'
export type IncidentStatus = 'consigne' | 'sanctionne' | 'notifie' | 'clos'
export type ExitStatus = 'demande' | 'autorise' | 'refuse' | 'sorti' | 'revenu'

export interface Incident {
  id: string
  studentName: string
  className: string
  kind: string
  severity: IncidentSeverity
  description: string
  reportedBy: string
  occurredAt: string
  status: IncidentStatus
  sanction: string | null
  familyNotifiedAt: string | null
}

export interface ExitRequest {
  id: string
  studentName: string
  className: string
  reason: string
  requestedBy: string
  /** Personne qui vient chercher l'élève — exigée avant autorisation. */
  pickupPerson: string | null
  leaveAt: string
  expectedReturnAt: string | null
  status: ExitStatus
  authorizedBy: string | null
}

export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  mineur: 'Mineur',
  moyen: 'Moyen',
  grave: 'Grave',
}

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  consigne: 'Consigné',
  sanctionne: 'Sanctionné',
  notifie: 'Famille notifiée',
  clos: 'Clos',
}

export const EXIT_STATUS_LABELS: Record<ExitStatus, string> = {
  demande: 'En attente',
  autorise: 'Autorisée',
  refuse: 'Refusée',
  sorti: 'Élève sorti',
  revenu: 'Retour constaté',
}

const PREVIEW_INCIDENTS: Incident[] = [
  { id: 'i1', studentName: 'Junior Bantsimba', className: '3ème A', kind: 'Bagarre', severity: 'grave', description: 'Altercation physique avec un camarade pendant la récréation de 10 h. Aucun blessé, séparés par le surveillant.', reportedBy: 'M. Bantsimba Alain (Surveillant Général)', occurredAt: '2026-08-28T10:15:00Z', status: 'sanctionne', sanction: 'Exclusion temporaire de 2 jours', familyNotifiedAt: null },
  { id: 'i2', studentName: 'Elie Nguesso', className: '3ème A', kind: 'Absences répétées', severity: 'moyen', description: '14 absences non justifiées depuis le début du trimestre.', reportedBy: 'Mme Nsimba (Direction)', occurredAt: '2026-08-27T08:00:00Z', status: 'consigne', sanction: null, familyNotifiedAt: null },
  { id: 'i3', studentName: 'Destin Moukoko', className: '3ème A', kind: 'Retards', severity: 'mineur', description: 'Cinquième retard du mois en cours de mathématiques.', reportedBy: 'M. Okemba Jean-Paul', occurredAt: '2026-08-26T07:45:00Z', status: 'notifie', sanction: 'Avertissement oral', familyNotifiedAt: '2026-08-26T12:00:00Z' },
  { id: 'i4', studentName: 'Grace Mampouya', className: '3ème A', kind: 'Téléphone en classe', severity: 'mineur', description: 'Usage du téléphone pendant une évaluation.', reportedBy: 'Mme Mabiala Sylvie', occurredAt: '2026-08-21T09:30:00Z', status: 'clos', sanction: 'Confiscation jusqu’à la fin de journée', familyNotifiedAt: '2026-08-21T16:00:00Z' },
]

const PREVIEW_EXITS: ExitRequest[] = [
  { id: 'e1', studentName: 'Naomi Mabiala', className: '4ème B', reason: 'Rendez-vous médical', requestedBy: 'Mme Mabiala (mère)', pickupPerson: 'Mme Mabiala (mère)', leaveAt: '2026-08-31T10:00:00Z', expectedReturnAt: '2026-08-31T14:00:00Z', status: 'demande', authorizedBy: null },
  { id: 'e2', studentName: 'Chris Ondongo', className: '6ème B', reason: 'Malaise — infirmerie a demandé le retour à domicile', requestedBy: 'Infirmerie', pickupPerson: null, leaveAt: '2026-08-30T11:20:00Z', expectedReturnAt: null, status: 'demande', authorizedBy: null },
  { id: 'e3', studentName: 'Destin Moukoko', className: '3ème A', reason: 'Convocation administrative (pièce d’identité)', requestedBy: 'M. Moukoko (père)', pickupPerson: 'M. Moukoko (père)', leaveAt: '2026-08-29T09:00:00Z', expectedReturnAt: '2026-08-29T12:00:00Z', status: 'revenu', authorizedBy: 'Mme Nsimba' },
]

export function useSchoolLife() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [exits, setExits] = useState<ExitRequest[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (PREVIEW_MODE) {
      setIncidents(PREVIEW_INCIDENTS)
      setExits(PREVIEW_EXITS)
      setLoading(false)
      return
    }
    setLoading(true)
    const [inc, ex] = await Promise.all([
      supabase.from('discipline_incidents')
        .select('id, student_name, class_name, kind, severity, description, reported_by_name, occurred_at, status, sanction, family_notified_at')
        .order('occurred_at', { ascending: false }).limit(100),
      supabase.from('exit_authorizations')
        .select('id, student_name, class_name, reason, requested_by_name, pickup_person, leave_at, expected_return_at, status, authorized_by_name')
        .order('leave_at', { ascending: false }).limit(100),
    ])

    if (inc.error) { setError(inc.error.message); setLoading(false); return }

    setIncidents(((inc.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      studentName: (r.student_name as string) ?? 'Élève',
      className: (r.class_name as string) ?? '—',
      kind: (r.kind as string) ?? 'Incident',
      severity: (r.severity as IncidentSeverity) ?? 'mineur',
      description: (r.description as string) ?? '',
      reportedBy: (r.reported_by_name as string) ?? '—',
      occurredAt: r.occurred_at as string,
      status: (r.status as IncidentStatus) ?? 'consigne',
      sanction: (r.sanction as string) ?? null,
      familyNotifiedAt: (r.family_notified_at as string) ?? null,
    })))

    setExits(((ex.data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      studentName: (r.student_name as string) ?? 'Élève',
      className: (r.class_name as string) ?? '—',
      reason: (r.reason as string) ?? '',
      requestedBy: (r.requested_by_name as string) ?? '—',
      pickupPerson: (r.pickup_person as string) ?? null,
      leaveAt: r.leave_at as string,
      expectedReturnAt: (r.expected_return_at as string) ?? null,
      status: (r.status as ExitStatus) ?? 'demande',
      authorizedBy: (r.authorized_by_name as string) ?? null,
    })))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  /** Consigne la sanction. Ne notifie pas : c'est un geste distinct. */
  const applySanction = useCallback(async (id: string, sanction: string) => {
    setBusyId(id)
    if (!PREVIEW_MODE) {
      const { error: e } = await supabase.from('discipline_incidents')
        .update({ sanction, status: 'sanctionne' }).eq('id', id)
      if (e) { setBusyId(null); return { ok: false as const, error: e.message } }
    }
    setIncidents((l) => l.map((i) => i.id === id ? { ...i, sanction, status: 'sanctionne' } : i))
    setBusyId(null)
    return { ok: true as const }
  }, [])

  const notifyFamily = useCallback(async (id: string) => {
    setBusyId(id)
    const now = new Date().toISOString()
    if (!PREVIEW_MODE) {
      const { error: e } = await supabase.from('discipline_incidents')
        .update({ status: 'notifie', family_notified_at: now }).eq('id', id)
      if (e) { setBusyId(null); return { ok: false as const, error: e.message } }
    }
    setIncidents((l) => l.map((i) =>
      i.id === id ? { ...i, status: 'notifie', familyNotifiedAt: now } : i))
    setBusyId(null)
    return { ok: true as const }
  }, [])

  const decideExit = useCallback(async (id: string, approve: boolean) => {
    setBusyId(id)
    const status: ExitStatus = approve ? 'autorise' : 'refuse'
    if (!PREVIEW_MODE) {
      const { data: session } = await supabase.auth.getSession()
      const { error: e } = await supabase.from('exit_authorizations')
        .update({ status, authorized_by: session.session?.user.id, authorized_at: new Date().toISOString() })
        .eq('id', id)
      if (e) { setBusyId(null); return { ok: false as const, error: e.message } }
    }
    setExits((l) => l.map((x) => x.id === id ? { ...x, status } : x))
    setBusyId(null)
    return { ok: true as const }
  }, [])

  const counts = useMemo(() => ({
    openIncidents: incidents.filter((i) => i.status !== 'clos').length,
    /** Sanctions posées mais jamais transmises : la faille classique. */
    awaitingNotification: incidents.filter((i) => i.status === 'sanctionne').length,
    graveThisMonth: incidents.filter((i) => i.severity === 'grave').length,
    pendingExits: exits.filter((x) => x.status === 'demande').length,
  }), [incidents, exits])

  return {
    incidents, exits, counts, isLoading, error, busyId,
    applySanction, notifyFamily, decideExit, reload: () => void load(),
  }
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}
