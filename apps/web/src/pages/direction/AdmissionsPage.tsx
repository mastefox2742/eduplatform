import { useState } from 'react'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Card, StatCard, EmptyState } from '@/components/ui/Card'
import { PageHeader, Tabs, RuleNote, type TabDef } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useAdmissions, STAGE_LABELS, STAGE_FLOW, nextStage,
  type Application, type ApplicationStage,
} from '@/hooks/useAdmissions'
import { cn } from '@/lib/utils'

/**
 * Admissions — direction.
 * Cahier des charges §6.
 *
 * Deux règles portées à l'écran :
 *
 *  - **Un dossier incomplet ne passe pas à l'entretien.** Le bouton
 *    d'avancement est désactivé tant qu'une pièce manque, et les pièces
 *    manquantes sont nommées : « dossier incomplet » n'aide personne.
 *  - **Admis n'est pas inscrit.** Un candidat admis qui ne s'inscrit
 *    pas est une place perdue ; l'écran le compte séparément et le
 *    signale.
 */
type StageFilter = ApplicationStage | 'tous'

export function AdmissionsPage() {
  const { applications, counts, isLoading, error, busyId, advance, reload } = useAdmissions()
  const [filter, setFilter] = useState<StageFilter>('tous')
  const [notice, setNotice] = useState<string | null>(null)
  const [refuseTarget, setRefuseTarget] = useState<Application | null>(null)
  const [refuseNote, setRefuseNote] = useState('')

  const TABS: readonly TabDef<StageFilter>[] = [
    { key: 'tous', label: 'Toutes', count: counts.total },
    ...STAGE_FLOW.map((s) => ({ key: s as StageFilter, label: STAGE_LABELS[s], count: counts.by[s] })),
    { key: 'refuse' as StageFilter, label: 'Refusées', count: counts.by.refuse },
  ]

  const visible = filter === 'tous'
    ? applications
    : applications.filter((a) => a.stage === filter)

  async function onAdvance(a: Application) {
    const to = nextStage(a.stage)
    if (!to) return
    const res = await advance(a.id, to)
    setNotice(res.ok
      ? to === 'inscrit'
        ? `${a.studentName} est inscrit. Sa fiche élève et sa facture de scolarité sont à créer.`
        : `${a.studentName} passe à l’étape « ${STAGE_LABELS[to]} ».`
      : res.error)
  }

  async function confirmRefuse() {
    if (!refuseTarget) return
    if (refuseNote.trim().length < 5) {
      setNotice('Indiquez le motif : la famille recevra cette réponse.')
      return
    }
    const res = await advance(refuseTarget.id, 'refuse', refuseNote.trim())
    setNotice(res.ok ? `Candidature de ${refuseTarget.studentName} refusée.` : res.error)
    setRefuseTarget(null)
    setRefuseNote('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Icon name={ICONS.clock} size={20} className="animate-spin mr-2" />
        Chargement des candidatures…
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Admissions"
        subtitle="Candidatures, vérification des dossiers, entretiens et décisions."
        count={`${counts.total} dossiers`}
        action={
          <Button variant="secondary" size="sm" onClick={reload}
            leftIcon={<Icon name={ICONS.synced} size={16} />}>
            Actualiser
          </Button>
        }
      />

      {error && <RuleNote icon={ICONS.warning} tone="warning">{error}</RuleNote>}

      {notice && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-secondary/30 bg-secondary/10 p-3 text-sm text-foreground">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground">
            <Icon name={ICONS.close} size={16} />
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Candidatures reçues" value={String(counts.total)}
          subtitle="Toutes étapes" icon={ICONS.document} tone="primary" />
        <StatCard title="Dossiers incomplets" value={String(counts.incompleteFiles)}
          subtitle="Pièces manquantes" icon={ICONS.warning}
          tone={counts.incompleteFiles > 0 ? 'accent' : 'neutral'} />
        <StatCard title="Admis non inscrits" value={String(counts.admittedNotEnrolled)}
          subtitle="Places à confirmer" icon={ICONS.userCheck}
          tone={counts.admittedNotEnrolled > 0 ? 'accent' : 'neutral'} />
        <StatCard title="Inscriptions finalisées" value={String(counts.by.inscrit)}
          subtitle="Élèves ajoutés" icon={ICONS.checkBold} tone="secondary" />
      </div>

      {counts.admittedNotEnrolled > 0 && (
        <RuleNote icon={ICONS.warning} tone="warning">
          <strong>{counts.admittedNotEnrolled} candidat(s) admis ne sont pas encore
          inscrits.</strong> Une admission ne réserve pas la place : tant que
          l’inscription n’est pas finalisée, l’élève ne compte pas dans les
          effectifs et la place reste disponible.
        </RuleNote>
      )}

      <Tabs tabs={TABS} active={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={ICONS.document} title="Aucune candidature à cette étape"
            detail="Changez de filtre pour voir les autres dossiers." />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => (
            <ApplicationCard key={a.id} app={a} busy={busyId === a.id}
              onAdvance={() => void onAdvance(a)}
              onRefuse={() => { setRefuseTarget(a); setRefuseNote('') }} />
          ))}
        </div>
      )}

      {refuseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setRefuseTarget(null)}>
          <Card className="w-full max-w-md">
            <div onClick={(e) => e.stopPropagation()}>
              <h2 className="font-heading text-lg font-bold text-foreground">
                Refuser la candidature de {refuseTarget.studentName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ce motif figurera dans la réponse envoyée à la famille.
              </p>
              <textarea
                value={refuseNote}
                onChange={(e) => setRefuseNote(e.target.value)}
                rows={4}
                placeholder="Motif du refus…"
                className="mt-3 w-full rounded-xl border border-border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setRefuseTarget(null)}>
                  Annuler
                </Button>
                <Button variant="danger" size="sm"
                  disabled={refuseNote.trim().length < 5}
                  onClick={() => void confirmRefuse()}>
                  Confirmer le refus
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function ApplicationCard({
  app, busy, onAdvance, onRefuse,
}: {
  app: Application
  busy: boolean
  onAdvance: () => void
  onRefuse: () => void
}) {
  const to = nextStage(app.stage)
  const blocked = app.missingDocuments.length > 0
  const closed = app.stage === 'refuse' || app.stage === 'inscrit'

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading font-bold text-foreground">{app.studentName}</p>
            <Badge variant="secondary" size="sm">{app.requestedLevel}</Badge>
            <StageBadge stage={app.stage} />
            <span className="text-xs text-muted-foreground">{app.reference}</span>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Responsable : {app.guardianName}
            {app.guardianPhone && ` · ${app.guardianPhone}`}
          </p>
          {app.previousSchool && (
            <p className="text-sm text-muted-foreground">
              Établissement précédent : {app.previousSchool}
            </p>
          )}

          {app.entranceScore != null && (
            <p className="mt-1 text-sm">
              Test d’entrée :{' '}
              <span className={cn('font-bold', app.entranceScore >= 10 ? 'text-secondary' : 'text-destructive')}>
                {app.entranceScore.toFixed(1)}/20
              </span>
            </p>
          )}

          {blocked && (
            <div className="mt-2 rounded-xl border border-accent/30 bg-accent/10 p-2.5">
              <p className="text-xs font-bold text-accent-700">
                Dossier incomplet — {app.missingDocuments.length} pièce(s) manquante(s)
              </p>
              <ul className="mt-1 list-inside list-disc text-xs text-accent-700">
                {app.missingDocuments.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </div>
          )}

          {app.decisionNote && (
            <p className="mt-2 text-sm text-foreground">{app.decisionNote}</p>
          )}
        </div>

        {!closed && (
          <div className="flex shrink-0 flex-col items-end gap-2">
            {to && (
              <Button size="sm" loading={busy}
                disabled={blocked}
                title={blocked ? 'Complétez le dossier avant de passer à l’étape suivante' : undefined}
                onClick={onAdvance}
                rightIcon={<Icon name={ICONS.chevronRight} size={14} />}>
                {STAGE_LABELS[to]}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onRefuse}>
              Refuser
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

function StageBadge({ stage }: { stage: ApplicationStage }) {
  const map: Record<ApplicationStage, 'gray' | 'primary' | 'warning' | 'success' | 'danger'> = {
    recue: 'gray',
    dossier_verifie: 'primary',
    entretien: 'warning',
    admis: 'success',
    inscrit: 'success',
    refuse: 'danger',
  }
  return <Badge variant={map[stage]} size="sm">{STAGE_LABELS[stage]}</Badge>
}
