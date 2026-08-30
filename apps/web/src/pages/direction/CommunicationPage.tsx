import { useState } from 'react'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Card, StatCard, EmptyState } from '@/components/ui/Card'
import { PageHeader, Tabs, RuleNote, type TabDef } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useCommunication, readRate, CHANNEL_LABELS,
  type Announcement, type Channel,
} from '@/hooks/useCommunication'
import { formatDateTime } from '@/hooks/useSchoolLife'
import { cn } from '@/lib/utils'

/**
 * Communication — annonces et messagerie.
 * Cahier des charges §17.
 *
 * Trois décisions portées à l'écran :
 *
 *  - **Publier est irréversible.** L'annonce part sur les téléphones ;
 *    la confirmation dit combien de familles la recevront et par quel
 *    canal, avant l'envoi et non après.
 *  - **Le taux de lecture est affiché.** Une annonce lue par 20 % des
 *    familles n'a pas été communiquée : il faut le savoir pour relancer
 *    autrement.
 *  - **Un parent qui attend depuis deux jours est signalé.** Passé ce
 *    délai il ne réécrit pas, il se déplace ou il se plaint.
 */
type CommTab = 'annonces' | 'messages'

export function CommunicationPage() {
  const {
    announcements, conversations, stats, isLoading, error, busyId, publish, reload,
  } = useCommunication()

  const [tab, setTab] = useState<CommTab>('annonces')
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Announcement | null>(null)

  const TABS: readonly TabDef<CommTab>[] = [
    { key: 'annonces', label: 'Annonces', count: announcements.length },
    { key: 'messages', label: 'Messages', count: stats.unreadThreads },
  ]

  async function confirmPublish() {
    if (!confirmTarget) return
    const res = await publish(confirmTarget.id)
    setNotice(res.ok
      ? `Annonce publiée à ${confirmTarget.recipientCount} destinataire(s). Elle ne peut plus être retirée des téléphones.`
      : res.error)
    setConfirmTarget(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Icon name={ICONS.clock} size={20} className="animate-spin mr-2" />
        Chargement des communications…
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Communication"
        subtitle="Annonces à l’école et échanges avec les familles."
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
        <StatCard title="Annonces publiées" value={String(stats.published)}
          subtitle="Sur la période" icon={ICONS.megaphone} tone="primary" />
        <StatCard title="Brouillons" value={String(stats.drafts)}
          subtitle="Non envoyés" icon={ICONS.edit}
          tone={stats.drafts > 0 ? 'accent' : 'neutral'} />
        <StatCard title="Messages non lus" value={String(stats.unreadThreads)}
          subtitle="Conversations ouvertes" icon={ICONS.chat}
          tone={stats.unreadThreads > 0 ? 'accent' : 'neutral'} />
        <StatCard title="Sans réponse > 48 h" value={String(stats.stale)}
          subtitle="À traiter en priorité" icon={ICONS.clock}
          tone={stats.stale > 0 ? 'danger' : 'neutral'} />
      </div>

      {stats.stale > 0 && (
        <RuleNote icon={ICONS.warning} tone="warning">
          <strong>{stats.stale} famille(s) attendent une réponse depuis plus de deux
          jours.</strong> Passé ce délai, un parent ne réécrit généralement pas :
          il se déplace à l’école ou porte réclamation.
        </RuleNote>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'annonces' && (
        announcements.length === 0 ? (
          <Card>
            <EmptyState icon={ICONS.megaphone} title="Aucune annonce"
              detail="Les communications à l’école apparaîtront ici." />
          </Card>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading font-bold text-foreground">{a.title}</p>
                      <Badge variant={a.status === 'publie' ? 'success' : 'warning'} size="sm">
                        {a.status === 'publie' ? 'Publiée' : 'Brouillon'}
                      </Badge>
                      <Badge variant="secondary" size="sm">{a.audienceLabel}</Badge>
                    </div>

                    <p className="mt-1.5 text-sm text-muted-foreground">{a.body}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {a.channels.map((c) => <ChannelBadge key={c} channel={c} />)}
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      {a.authorName} · {a.publishedAt
                        ? `publiée le ${formatDateTime(a.publishedAt)}`
                        : `créée le ${formatDateTime(a.createdAt)}`}
                    </p>

                    {a.status === 'publie' && (
                      <div className="mt-2 max-w-xs">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className={cn('h-full rounded-full',
                            readRate(a) >= 70 ? 'bg-secondary' : 'bg-accent')}
                            style={{ width: `${Math.max(readRate(a), 2)}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Lue par {a.readCount} des {a.recipientCount} destinataires
                          {' '}({readRate(a)} %)
                          {readRate(a) < 70 && ' — envisagez un autre canal'}
                        </p>
                      </div>
                    )}
                  </div>

                  {a.status === 'brouillon' && (
                    <Button size="sm" className="shrink-0"
                      onClick={() => setConfirmTarget(a)}
                      leftIcon={<Icon name={ICONS.megaphone} size={14} />}>
                      Publier
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {tab === 'messages' && (
        conversations.length === 0 ? (
          <Card>
            <EmptyState icon={ICONS.chat} title="Aucun message"
              detail="Les échanges avec les familles et les enseignants apparaîtront ici." />
          </Card>
        ) : (
          <div className="space-y-3">
            {[...conversations]
              .sort((a, b) => Number(b.unread) - Number(a.unread) || b.waitingHours - a.waitingHours)
              .map((c) => (
                <Card key={c.id} hoverable>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      c.unread ? 'bg-primary' : 'bg-transparent'
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn('font-heading text-foreground',
                          c.unread ? 'font-bold' : 'font-semibold')}>
                          {c.participantName}
                        </p>
                        {c.unread && c.waitingHours >= 48 && (
                          <Badge variant="danger" size="sm">
                            En attente depuis {Math.floor(c.waitingHours / 24)} j
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{c.participantRole}</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{c.subject}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{c.lastMessage}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(c.lastAt)}</p>
                    </div>
                    <Button size="sm" variant="secondary" className="shrink-0">
                      Répondre
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        )
      )}

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setConfirmTarget(null)}>
          <Card className="w-full max-w-md">
            <div onClick={(e) => e.stopPropagation()}>
              <h2 className="font-heading text-lg font-bold text-foreground">
                Publier « {confirmTarget.title} » ?
              </h2>
              <div className="mt-3 rounded-xl border border-accent/30 bg-accent/10 p-3">
                <p className="text-sm font-bold text-accent-700">
                  {confirmTarget.recipientCount} destinataire(s) — {confirmTarget.audienceLabel}
                </p>
                <p className="mt-1 text-sm text-accent-700">
                  Par {confirmTarget.channels.map((c) => CHANNEL_LABELS[c]).join(', ')}.
                </p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Une annonce publiée arrive immédiatement sur les téléphones et ne
                peut plus en être retirée. Relisez-la avant de confirmer.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConfirmTarget(null)}>
                  Annuler
                </Button>
                <Button size="sm" loading={busyId === confirmTarget.id}
                  onClick={() => void confirmPublish()}>
                  Publier maintenant
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function ChannelBadge({ channel }: { channel: Channel }) {
  const icon = channel === 'sms' ? ICONS.chat
    : channel === 'whatsapp' ? ICONS.whatsapp
    : ICONS.bell
  return (
    <Badge variant={channel === 'app' ? 'primary' : 'secondary'} size="sm">
      <Icon name={icon} size={12} />
      {CHANNEL_LABELS[channel]}
    </Badge>
  )
}
