import { useState } from 'react'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Card, StatCard, EmptyState } from '@/components/ui/Card'
import { PageHeader, Tabs, RuleNote, type TabDef } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  usePlatformConsole, PLAN_LABELS, TENANT_STATUS_LABELS,
  type Tenant, type TenantStatus, type PlanTier,
} from '@/hooks/usePlatformConsole'
import { formatMoney } from '@/hooks/useHumanResources'
import { cn } from '@/lib/utils'

/**
 * Console de l'éditeur — parc des établissements clients.
 * Cahier des charges §4.2.
 *
 * Accessible au seul rôle `ADMIN` (éditeur de la plateforme). Un
 * directeur d'établissement ne doit pas voir les autres écoles : ce
 * serait rompre l'isolation multi-tenant que les politiques RLS font
 * respecter côté base. La route est donc protégée, et la barre de
 * navigation ne l'affiche pas à un directeur.
 */
type PlatformTab = 'toutes' | 'essai' | 'suspendu'

export function PlatformPage() {
  const { tenants, stats, isLoading, error, reload } = usePlatformConsole()
  const [tab, setTab] = useState<PlatformTab>('toutes')

  const TABS: readonly TabDef<PlatformTab>[] = [
    { key: 'toutes', label: 'Tous les établissements', count: stats.total },
    { key: 'essai', label: 'En essai', count: stats.trials },
    { key: 'suspendu', label: 'Suspendus', count: stats.suspended },
  ]

  const visible = tab === 'toutes' ? tenants : tenants.filter((t) => t.status === tab)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Icon name={ICONS.clock} size={20} className="animate-spin mr-2" />
        Chargement du parc…
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Console éditeur"
        subtitle="Établissements clients, abonnements et usage de la plateforme."
        count={`${stats.total} établissements`}
        action={
          <Button variant="secondary" size="sm" onClick={reload}
            leftIcon={<Icon name={ICONS.synced} size={16} />}>
            Actualiser
          </Button>
        }
      />

      {error && <RuleNote icon={ICONS.warning} tone="warning">{error}</RuleNote>}

      <RuleNote icon={ICONS.shield}>
        Cet écran est réservé à l’éditeur de la plateforme. Un directeur
        d’établissement n’y a pas accès : il ne doit voir ni les effectifs ni
        les données des autres écoles. Cette séparation est appliquée par les
        politiques de sécurité de la base, pas seulement par l’interface.
      </RuleNote>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Revenu mensuel récurrent" value={formatMoney(stats.mrr)}
          subtitle={`${stats.active} abonnements actifs`} icon={ICONS.finance} tone="secondary" />
        <StatCard title="Élèves gérés" value={stats.students.toLocaleString('fr-FR')}
          subtitle="Tous établissements" icon={ICONS.students} tone="primary" />
        <StatCard title="En période d’essai" value={String(stats.trials)}
          subtitle="À convertir" icon={ICONS.clock}
          tone={stats.trials > 0 ? 'accent' : 'neutral'} />
        <StatCard title="Comptes dormants" value={String(stats.dormant)}
          subtitle="Sans activité depuis 30 j" icon={ICONS.warning}
          tone={stats.dormant > 0 ? 'danger' : 'neutral'} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={ICONS.home} title="Aucun établissement dans cette catégorie" />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((t) => <TenantCard key={t.id} tenant={t} />)}
        </div>
      )}

      <Card className="mt-6">
        <p className="font-heading font-bold text-sm text-foreground">Stockage</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats.storageGb} Go utilisés sur l’ensemble du parc — bulletins,
          pièces des dossiers d’inscription et justificatifs d’absence.
        </p>
      </Card>
    </div>
  )
}

function TenantCard({ tenant: t }: { tenant: Tenant }) {
  const dormant = t.lastActivityAt != null &&
    (Date.now() - new Date(t.lastActivityAt).getTime()) > 30 * 86_400_000

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading font-bold text-foreground">{t.name}</p>
            <Badge variant="secondary" size="sm">{t.city}</Badge>
            <PlanBadge plan={t.plan} />
            <StatusBadge status={t.status} />
            {dormant && <Badge variant="danger" size="sm">Dormant</Badge>}
          </div>

          <p className="mt-1.5 text-sm text-muted-foreground">
            {t.studentCount} élèves · {t.staffCount} membres du personnel ·{' '}
            {Math.round(t.storageUsedMb)} Mo de stockage
          </p>

          <p className="mt-0.5 text-xs text-muted-foreground">
            Client depuis {t.since ? new Date(t.since).toLocaleDateString('fr-FR') : '—'}
            {t.lastActivityAt &&
              ` · dernière activité ${new Date(t.lastActivityAt).toLocaleDateString('fr-FR')}`}
          </p>

          {t.trialDaysLeft != null && (
            <p className={cn('mt-2 text-sm font-semibold',
              t.trialDaysLeft <= 7 ? 'text-destructive' : 'text-accent-700')}>
              Essai : {t.trialDaysLeft} jour(s) restants
              {t.trialDaysLeft <= 7 && ' — à relancer'}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">Abonnement</p>
          <p className="font-heading text-xl font-bold text-foreground tabular">
            {t.monthlyFee > 0 ? formatMoney(t.monthlyFee, t.currency) : 'Gratuit'}
          </p>
          <p className="text-xs text-muted-foreground">par mois</p>
        </div>
      </div>
    </Card>
  )
}

function PlanBadge({ plan }: { plan: PlanTier }) {
  const map: Record<PlanTier, 'gray' | 'primary' | 'purple'> = {
    essentiel: 'gray', standard: 'primary', premium: 'purple',
  }
  return <Badge variant={map[plan]} size="sm">{PLAN_LABELS[plan]}</Badge>
}

function StatusBadge({ status }: { status: TenantStatus }) {
  const map: Record<TenantStatus, 'success' | 'warning' | 'danger' | 'gray'> = {
    actif: 'success', essai: 'warning', suspendu: 'danger', resilie: 'gray',
  }
  return <Badge variant={map[status]} size="sm">{TENANT_STATUS_LABELS[status]}</Badge>
}
