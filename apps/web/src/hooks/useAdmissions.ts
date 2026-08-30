/**
 * useAdmissions — pipeline de candidatures.
 * Cahier des charges §6 (admissions & CRM).
 *
 * Une candidature avance par étapes et ne revient jamais en arrière
 * toute seule : reçue → dossier vérifié → entretien/test → décision →
 * inscrite. Chaque transition est un acte de la direction, jamais un
 * effet de bord.
 *
 * La règle la plus importante de cet écran : **une admission n'est pas
 * une inscription**. Tant que le dossier n'est pas converti en élève
 * inscrit (avec sa classe et sa facture), le candidat ne compte pas
 * dans les effectifs.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'
import { PREVIEW_MODE } from '@/config/preview'

export type ApplicationStage =
  | 'recue' | 'dossier_verifie' | 'entretien' | 'admis' | 'refuse' | 'inscrit'

export interface Application {
  id: string
  reference: string
  studentName: string
  birthDate: string | null
  requestedLevel: string
  previousSchool: string | null
  guardianName: string
  guardianPhone: string | null
  stage: ApplicationStage
  submittedAt: string
  /** Pièces manquantes au dossier — bloque le passage à l'entretien. */
  missingDocuments: string[]
  interviewAt: string | null
  entranceScore: number | null
  decisionNote: string | null
}

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  recue: 'Reçue',
  dossier_verifie: 'Dossier vérifié',
  entretien: 'Entretien / test',
  admis: 'Admis',
  refuse: 'Refusé',
  inscrit: 'Inscrit',
}

/** Ordre du pipeline. `refuse` en sort, il n'a pas de suite. */
export const STAGE_FLOW: ApplicationStage[] =
  ['recue', 'dossier_verifie', 'entretien', 'admis', 'inscrit']

export function nextStage(s: ApplicationStage): ApplicationStage | null {
  const i = STAGE_FLOW.indexOf(s)
  return i >= 0 && i < STAGE_FLOW.length - 1 ? STAGE_FLOW[i + 1] : null
}

const PREVIEW: Application[] = [
  { id: 'a1', reference: 'CND-2026-0041', studentName: 'Merveille Loemba', birthDate: '2012-03-14', requestedLevel: '6ème', previousSchool: 'École Saint-Exupéry', guardianName: 'Mme Loemba Antoinette', guardianPhone: '+242 06 512 33 90', stage: 'recue', submittedAt: '2026-08-26T09:15:00Z', missingDocuments: ['Certificat de naissance', 'Bulletin du CM2'], interviewAt: null, entranceScore: null, decisionNote: null },
  { id: 'a2', reference: 'CND-2026-0042', studentName: 'Prince Mavoungou', birthDate: '2010-11-02', requestedLevel: '4ème', previousSchool: 'Collège Les Rapides', guardianName: 'M. Mavoungou Roger', guardianPhone: '+242 05 447 12 08', stage: 'dossier_verifie', submittedAt: '2026-08-24T11:40:00Z', missingDocuments: [], interviewAt: '2026-09-03T09:00:00Z', entranceScore: null, decisionNote: null },
  { id: 'a3', reference: 'CND-2026-0039', studentName: 'Naomi Tchicaya', birthDate: '2009-06-21', requestedLevel: '3ème', previousSchool: 'Collège de la Paix', guardianName: 'Mme Tchicaya Bernadette', guardianPhone: '+242 06 890 44 12', stage: 'entretien', submittedAt: '2026-08-20T08:00:00Z', missingDocuments: [], interviewAt: '2026-08-28T10:00:00Z', entranceScore: 15.5, decisionNote: null },
  { id: 'a4', reference: 'CND-2026-0035', studentName: 'Gloire Batchi', birthDate: '2011-01-09', requestedLevel: '5ème', previousSchool: null, guardianName: 'M. Batchi Célestin', guardianPhone: '+242 05 220 77 41', stage: 'admis', submittedAt: '2026-08-12T14:20:00Z', missingDocuments: [], interviewAt: '2026-08-19T09:00:00Z', entranceScore: 17.2, decisionNote: 'Excellent dossier, admis sans réserve.' },
  { id: 'a5', reference: 'CND-2026-0030', studentName: 'Chris Ondongo', birthDate: '2012-08-30', requestedLevel: '6ème', previousSchool: 'École Bethléem', guardianName: 'Mme Ondongo Prisca', guardianPhone: '+242 06 331 09 55', stage: 'inscrit', submittedAt: '2026-08-05T10:00:00Z', missingDocuments: [], interviewAt: '2026-08-14T11:00:00Z', entranceScore: 14.0, decisionNote: 'Inscrit en 6ème B.' },
  { id: 'a6', reference: 'CND-2026-0037', studentName: 'Divine Kouka', birthDate: '2010-04-17', requestedLevel: '4ème', previousSchool: 'Collège Moderne', guardianName: 'M. Kouka Fabrice', guardianPhone: '+242 05 118 62 30', stage: 'refuse', submittedAt: '2026-08-15T16:30:00Z', missingDocuments: [], interviewAt: '2026-08-22T14:00:00Z', entranceScore: 6.5, decisionNote: 'Niveau insuffisant en mathématiques et en français.' },
]

export function useAdmissions() {
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (PREVIEW_MODE) {
      setApplications(PREVIEW)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: e } = await supabase
      .from('applications')
      .select('id, reference, student_name, birth_date, requested_level, previous_school, guardian_name, guardian_phone, stage, submitted_at, missing_documents, interview_at, entrance_score, decision_note')
      .order('submitted_at', { ascending: false })
      .limit(200)

    if (e) { setError(e.message); setLoading(false); return }

    setApplications(((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      reference: (r.reference as string) ?? '—',
      studentName: (r.student_name as string) ?? 'Candidat',
      birthDate: (r.birth_date as string) ?? null,
      requestedLevel: (r.requested_level as string) ?? '—',
      previousSchool: (r.previous_school as string) ?? null,
      guardianName: (r.guardian_name as string) ?? '—',
      guardianPhone: (r.guardian_phone as string) ?? null,
      stage: (r.stage as ApplicationStage) ?? 'recue',
      submittedAt: r.submitted_at as string,
      missingDocuments: (r.missing_documents as string[]) ?? [],
      interviewAt: (r.interview_at as string) ?? null,
      entranceScore: r.entrance_score != null ? Number(r.entrance_score) : null,
      decisionNote: (r.decision_note as string) ?? null,
    })))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const advance = useCallback(async (id: string, to: ApplicationStage, note?: string) => {
    setBusyId(id)
    if (!PREVIEW_MODE) {
      const { data: session } = await supabase.auth.getSession()
      const { error: e } = await supabase.from('applications').update({
        stage: to,
        decision_note: note ?? null,
        decided_by: session.session?.user.id,
        decided_at: new Date().toISOString(),
      }).eq('id', id)
      if (e) { setBusyId(null); return { ok: false as const, error: e.message } }
    }
    setApplications((list) => list.map((a) =>
      a.id === id ? { ...a, stage: to, decisionNote: note ?? a.decisionNote } : a))
    setBusyId(null)
    return { ok: true as const }
  }, [])

  const counts = useMemo(() => {
    const by = {} as Record<ApplicationStage, number>
    for (const k of Object.keys(STAGE_LABELS) as ApplicationStage[]) by[k] = 0
    for (const a of applications) by[a.stage]++
    return {
      by,
      total: applications.length,
      /** Candidats admis mais pas encore inscrits : ce sont eux qu'on perd. */
      admittedNotEnrolled: by.admis,
      incompleteFiles: applications.filter((a) => a.missingDocuments.length > 0).length,
    }
  }, [applications])

  return { applications, counts, isLoading, error, busyId, advance, reload: () => void load() }
}
