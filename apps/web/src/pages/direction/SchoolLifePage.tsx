import { useState } from 'react'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Card, StatCard, EmptyState } from '@/components/ui/Card'
import { PageHeader, Tabs, RuleNote, type TabDef } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useSchoolLife, formatDateTime,
  SEVERITY_LABELS, INCIDENT_STATUS_LABELS, EXIT_STATUS_LABELS,
  type Incident, type ExitRequest, type IncidentSeverity, type IncidentStatus, type ExitStatus,
} from '@/hooks/useSchoolLife'

/**
 * Vie scolaire — discipline et sorties.
 * Cahier des charges §11.2, §11.3.
 *
 * Les deux règles que l'écran rend visibles :
 *
 *  - **Sanctionner n'est pas notifier.** Une sanction non transmise à
 *    la famille n'a pas d'effet et ne tient pas devant un conseil de
 *    discipline. L'écran compte les sanctions en attente de
 *    notification et les met en tête.
 *  - **Aucune sortie sans personne désignée.** Autoriser une sortie
 *    sans savoir qui vient chercher l'élève engage la responsabilité de
 *    l'école ; le bouton reste bloqué tant que le nom manque.
 */
type LifeTab = 'incidents' | 'sorties'

export function SchoolLifePage() {
  const {
    incidents, exits, counts, isLoading, error, busyId,
    applySanction, notifyFamily, decideExit, reload,
  } = useSchoolLife()

  const [tab, setTab] = useState<LifeTab>('incidents')
  const [notice, setNotice] = useState<string | null>(null)
  const [sanctionTarget, setSanctionTarget] = useState<Incident | null>(null)
  const [sanctionText, setSanctionText] = useState('')

  const TABS: readonly TabDef<LifeTab>[] = [
    { key: 'incidents', label: 'Discipline', count: counts.openIncidents },
    { key: 'sorties', label: 'Sorties', count: counts.pendingExits },
  ]

  async function confirmSanction() {
    if (!sanctionTarget) return
    if (sanctionText.trim().length < 5) {
      setNotice('Décrivez la sanction : elle sera transmise telle quelle à la famille.')
      return
    }
    const res = await applySanction(sanctionTarget.id, sanctionText.trim())
    setNotice(res.ok
      ? `Sanction consignée pour ${sanctionTarget.studentName}. Elle n’est pas encore transmise : notifiez la famille.`
      : res.error)
    setSanctionTarget(null)
    setSanctionText('')
  }

  async function onNotify(i: Incident) {
    const res = await notifyFamily(i.id)
    setNotice(res.ok ? `Famille de ${i.studentName} notifiée.` : res.error)
  }

  async function onDecideExit(x: ExitRequest, approve: boolean) {
    const res = await decideExit(x.id, approve)
    setNotice(res.ok
      ? approve
        ? `Sortie de ${x.studentName} autorisée. ${x.pickupPerson} est la seule personne habilitée à le récupérer.`
        : `Sortie de ${x.studentName} refusée.`
      : res.error)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Icon name={ICONS.clock} size={20} className="animate-spin mr-2" />
        Chargement de la vie scolaire…
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Vie scolaire"
        subtitle="Incidents, sanctions et autorisations de sortie."
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
        <StatCard title="Incidents ouverts" value={String(counts.openIncidents)}
          subtitle="Non clos" icon={ICONS.discipline}
          tone={counts.openIncidents > 0 ? 'accent' : 'neutral'} />
        <StatCard title="Familles à notifier" value={String(counts.awaitingNotification)}
          subtitle="Sanctions non transmises" icon={ICONS.bell}
          tone={counts.awaitingNotification > 0 ? 'danger' : 'neutral'} />
        <StatCard title="Incidents graves" value={String(counts.graveThisMonth)}
          subtitle="Sur la période" icon={ICONS.warningBold}
          tone={counts.graveThisMonth > 0 ? 'danger' : 'neutral'} />
        <StatCard title="Sorties à décider" value={String(counts.pendingExits)}
          subtitle="Demandes en attente" icon={ICONS.logout}
          tone={counts.pendingExits > 0 ? 'accent' : 'neutral'} />
      </div>

      {counts.awaitingNotification > 0 && (
        <RuleNote icon={ICONS.warning} tone="warning">
          <strong>{counts.awaitingNotification} sanction(s) consignée(s) mais jamais
          transmise(s) à la famille.</strong> Une sanction non notifiée n’a pas
          d’effet éducatif et ne tient pas devant un conseil de discipline.
        </RuleNote>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'incidents' && (
        incidents.length === 0 ? (
          <Card>
            <EmptyState icon={ICONS.discipline} title="Aucun incident consigné"
              detail="Les signalements des enseignants et surveillants arriveront ici." />
          </Card>
        ) : (
          <div className="space-y-3">
            {incidents.map((i) => (
              <Card key={i.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading font-bold text-foreground">{i.studentName}</p>
                      <Badge variant="secondary" size="sm">{i.className}</Badge>
                      <SeverityBadge severity={i.severity} />
                      <IncidentBadge status={i.status} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">{i.kind}</p>
                    <p className="text-sm text-muted-foreground">{i.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Signalé par {i.reportedBy} · {formatDateTime(i.occurredAt)}
                    </p>

                    {i.sanction && (
                      <div className="mt-2 rounded-xl border border-border bg-muted/40 p-2.5">
                        <p className="text-xs font-bold text-foreground">Sanction : {i.sanction}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {i.familyNotifiedAt
                            ? `Famille notifiée le ${formatDateTime(i.familyNotifiedAt)}`
                            : 'Famille pas encore notifiée'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    {i.status === 'consigne' && (
                      <Button size="sm"
                        onClick={() => { setSanctionTarget(i); setSanctionText('') }}>
                        Décider la sanction
                      </Button>
                    )}
                    {i.status === 'sanctionne' && (
                      <Button size="sm" variant="success" loading={busyId === i.id}
                        onClick={() => void onNotify(i)}
                        leftIcon={<Icon name={ICONS.bell} size={14} />}>
                        Notifier la famille
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'sorties' && (
        <>
          <RuleNote icon={ICONS.shield}>
            Une sortie ne peut être autorisée que si la personne qui vient
            chercher l’élève est nommée. Sans ce nom, c’est la responsabilité de
            l’établissement qui est engagée.
          </RuleNote>

          {exits.length === 0 ? (
            <Card>
              <EmptyState icon={ICONS.logout} title="Aucune demande de sortie"
                detail="Les demandes des familles et de l’infirmerie arriveront ici." />
            </Card>
          ) : (
            <div className="space-y-3">
              {exits.map((x) => {
                const blocked = !x.pickupPerson
                return (
                  <Card key={x.id}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-heading font-bold text-foreground">{x.studentName}</p>
                          <Badge variant="secondary" size="sm">{x.className}</Badge>
                          <ExitBadge status={x.status} />
                        </div>
                        <p className="mt-1 text-sm text-foreground">{x.reason}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Sortie prévue le {formatDateTime(x.leaveAt)}
                          {x.expectedReturnAt && ` · retour attendu ${formatDateTime(x.expectedReturnAt)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Demandé par {x.requestedBy}
                          {x.authorizedBy && ` · autorisé par ${x.authorizedBy}`}
                        </p>

                        {blocked ? (
                          <div className="mt-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5">
                            <p className="text-xs font-bold text-destructive">
                              Personne responsable non désignée
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Contactez la famille pour savoir qui vient chercher l’élève.
                              Aucune autorisation possible avant.
                            </p>
                          </div>
                        ) : (
                          <p className="mt-1 text-sm">
                            Récupéré par :{' '}
                            <span className="font-bold text-foreground">{x.pickupPerson}</span>
                          </p>
                        )}
                      </div>

                      {x.status === 'demande' && (
                        <div className="flex shrink-0 gap-2">
                          <Button size="sm" variant="danger"
                            onClick={() => void onDecideExit(x, false)}>
                            Refuser
                          </Button>
                          <Button size="sm" variant="success" loading={busyId === x.id}
                            disabled={blocked}
                            title={blocked ? 'Désignez d’abord la personne responsable' : undefined}
                            onClick={() => void onDecideExit(x, true)}>
                            Autoriser
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {sanctionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setSanctionTarget(null)}>
          <Card className="w-full max-w-md">
            <div onClick={(e) => e.stopPropagation()}>
              <h2 className="font-heading text-lg font-bold text-foreground">
                Sanction — {sanctionTarget.studentName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Consigner la sanction ne la transmet pas. La notification à la
                famille reste une étape distincte, à faire ensuite.
              </p>
              <textarea
                value={sanctionText}
                onChange={(e) => setSanctionText(e.target.value)}
                rows={3}
                placeholder="Ex. : exclusion temporaire de 2 jours"
                className="mt-3 w-full rounded-xl border border-border bg-card p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSanctionTarget(null)}>
                  Annuler
                </Button>
                <Button size="sm" disabled={sanctionText.trim().length < 5}
                  onClick={() => void confirmSanction()}>
                  Consigner
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const map: Record<IncidentSeverity, 'gray' | 'warning' | 'danger'> = {
    mineur: 'gray', moyen: 'warning', grave: 'danger',
  }
  return <Badge variant={map[severity]} size="sm">{SEVERITY_LABELS[severity]}</Badge>
}

function IncidentBadge({ status }: { status: IncidentStatus }) {
  const map: Record<IncidentStatus, 'gray' | 'warning' | 'primary' | 'success'> = {
    consigne: 'gray', sanctionne: 'warning', notifie: 'primary', clos: 'success',
  }
  return <Badge variant={map[status]} size="sm">{INCIDENT_STATUS_LABELS[status]}</Badge>
}

function ExitBadge({ status }: { status: ExitStatus }) {
  const map: Record<ExitStatus, 'gray' | 'warning' | 'danger' | 'primary' | 'success'> = {
    demande: 'warning', autorise: 'primary', refuse: 'danger',
    sorti: 'gray', revenu: 'success',
  }
  return <Badge variant={map[status]} size="sm">{EXIT_STATUS_LABELS[status]}</Badge>
}
