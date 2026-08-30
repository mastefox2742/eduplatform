import { useState } from 'react'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Card, StatCard, EmptyState } from '@/components/ui/Card'
import { PageHeader, Tabs, RuleNote, type TabDef } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useRiskSignals, SIGNAL_LABELS,
  type StudentAtRisk, type RiskLevel, type SignalKind,
} from '@/hooks/useRiskSignals'
import { formatDateTime } from '@/hooks/useSchoolLife'
import { cn } from '@/lib/utils'

/**
 * Élèves en difficulté — direction.
 * Cahier des charges §7.3.
 *
 * Ce que cet écran fait, et ce qu'il refuse de faire :
 *
 *  - Il **combine** résultats, assiduité, comportement et scolarité.
 *    Pris isolément aucun de ces signaux ne dit grand-chose ; c'est
 *    leur accumulation qui désigne un décrochage.
 *  - Il **ne décide rien**. Aucune action automatique n'est déclenchée
 *    par un score. L'écran nomme l'élève, donne les faits datés et le
 *    numéro du responsable : la suite appartient à l'équipe.
 *
 * Le score est affiché avec son détail, jamais seul. Un chiffre sans
 * justification serait pris pour un jugement sur l'élève.
 */
type RiskTab = 'eleve' | 'modere' | 'tous'

export function RiskPage() {
  const { students, stats, isLoading, error, busyId, logContact, reload } = useRiskSignals()
  const [tab, setTab] = useState<RiskTab>('eleve')
  const [notice, setNotice] = useState<string | null>(null)

  const TABS: readonly TabDef<RiskTab>[] = [
    { key: 'eleve', label: 'Risque élevé', count: stats.high },
    { key: 'modere', label: 'Risque modéré', count: stats.moderate },
    { key: 'tous', label: 'Tous', count: stats.total },
  ]

  const visible = tab === 'tous' ? students : students.filter((s) => s.level === tab)

  async function onContact(s: StudentAtRisk) {
    const res = await logContact(s.id)
    setNotice(res.ok
      ? `Échange consigné pour ${s.studentName}. Le signalement reste ouvert : le risque ne disparaît pas parce qu’un contact a eu lieu.`
      : res.error)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Icon name={ICONS.clock} size={20} className="animate-spin mr-2" />
        Analyse des signaux…
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Élèves en difficulté"
        subtitle="Repérage du décrochage à partir des résultats, de l’assiduité, du comportement et de la scolarité."
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

      <RuleNote icon={ICONS.info}>
        Ce score ne déclenche aucune décision automatique et ne juge pas
        l’élève : il indique à qui parler en premier. Chaque signal est daté et
        vérifiable, pour que l’échange avec la famille parte de faits.
      </RuleNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Risque élevé" value={String(stats.high)}
          subtitle="Signaux cumulés" icon={ICONS.warningBold}
          tone={stats.high > 0 ? 'danger' : 'neutral'} />
        <StatCard title="Risque modéré" value={String(stats.moderate)}
          subtitle="À surveiller" icon={ICONS.eye}
          tone={stats.moderate > 0 ? 'accent' : 'neutral'} />
        <StatCard title="Jamais contactés" value={String(stats.neverContacted)}
          subtitle="Risque élevé, aucun échange" icon={ICONS.chat}
          tone={stats.neverContacted > 0 ? 'danger' : 'neutral'} />
        <StatCard title="Élèves suivis" value={String(stats.total)}
          subtitle="Tous niveaux de risque" icon={ICONS.students} tone="primary" />
      </div>

      {stats.neverContacted > 0 && (
        <RuleNote icon={ICONS.warning} tone="warning">
          <strong>{stats.neverContacted} élève(s) à risque élevé n’ont jamais fait
          l’objet d’un échange avec la famille.</strong> C’est là que le
          décrochage se joue : un signal repéré mais jamais suivi d’une
          conversation ne change rien.
        </RuleNote>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={ICONS.checkBold} title="Aucun élève à ce niveau de risque"
            detail="Les signaux sont recalculés à chaque saisie de note, d’absence ou de paiement." />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => (
            <Card key={s.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading font-bold text-foreground">{s.studentName}</p>
                    <Badge variant="secondary" size="sm">{s.className}</Badge>
                    <LevelBadge level={s.level} />
                    {!s.lastContactAt && s.level === 'eleve' && (
                      <Badge variant="danger" size="sm">Jamais contacté</Badge>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.guardianName}
                    {s.guardianPhone && (
                      <a href={`tel:${s.guardianPhone.replace(/\s/g, '')}`}
                        className="ml-2 font-bold text-primary hover:underline">
                        {s.guardianPhone}
                      </a>
                    )}
                  </p>

                  <ul className="mt-3 space-y-1.5">
                    {s.signals.map((sig, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <SignalIcon kind={sig.kind} />
                        <span className="min-w-0">
                          <span className="font-semibold text-foreground">
                            {SIGNAL_LABELS[sig.kind]}
                          </span>
                          <span className="text-muted-foreground"> — {sig.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {s.lastContactAt
                      ? `Dernier échange avec la famille : ${formatDateTime(s.lastContactAt)}`
                      : 'Aucun échange consigné avec la famille'}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-3">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Score de risque</p>
                    <p className={cn('font-heading text-3xl font-bold tabular',
                      s.level === 'eleve' ? 'text-destructive'
                        : s.level === 'modere' ? 'text-accent-700' : 'text-muted-foreground')}>
                      {s.score}
                    </p>
                    {s.averageTrend != null && (
                      <p className={cn('text-xs font-semibold',
                        s.averageTrend < 0 ? 'text-destructive' : 'text-secondary')}>
                        {s.averageTrend >= 0 ? '↑' : '↓'} {Math.abs(s.averageTrend).toFixed(1)} pt
                        <span className="font-normal text-muted-foreground"> de moyenne</span>
                      </p>
                    )}
                  </div>

                  <Button size="sm" variant="secondary" loading={busyId === s.id}
                    onClick={() => void onContact(s)}
                    leftIcon={<Icon name={ICONS.chat} size={14} />}>
                    Consigner un échange
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function LevelBadge({ level }: { level: RiskLevel }) {
  const map: Record<RiskLevel, { v: 'danger' | 'warning' | 'gray'; l: string }> = {
    eleve: { v: 'danger', l: 'Risque élevé' },
    modere: { v: 'warning', l: 'Risque modéré' },
    faible: { v: 'gray', l: 'Risque faible' },
  }
  const m = map[level]
  return <Badge variant={m.v} size="sm">{m.l}</Badge>
}

function SignalIcon({ kind }: { kind: SignalKind }) {
  const icon = kind === 'notes' ? ICONS.grades
    : kind === 'absences' ? ICONS.attendance
    : kind === 'discipline' ? ICONS.discipline
    : ICONS.finance
  return (
    <Icon name={icon} size={16}
      className="mt-0.5 shrink-0 text-muted-foreground" />
  )
}
