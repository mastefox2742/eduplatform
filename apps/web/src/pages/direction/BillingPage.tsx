import { useState } from 'react'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Card, StatCard, EmptyState } from '@/components/ui/Card'
import { PageHeader, Tabs, RuleNote, type TabDef } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useBilling, remaining, paidRatio, type Invoice } from '@/hooks/useBilling'
import { formatMoney } from '@/hooks/useHumanResources'
import { cn } from '@/lib/utils'

/**
 * Facturation & impayés — direction.
 * Cahier des charges §14.1.
 *
 * Cet écran répond à « qui doit quoi ». L'écran « Finance & caisse »
 * répond à « qu'a-t-on encaissé » : ce sont deux questions distinctes,
 * portées par deux personnes différentes dans l'établissement.
 *
 * Deux choix d'affichage, tous deux délibérés :
 *
 *  - **Le reste à payer prime sur le montant facturé.** C'est le seul
 *    chiffre sur lequel on agit.
 *  - **Aucun bouton de relance automatique.** Relancer une famille est
 *    un acte social ; l'écran donne le numéro et le contexte, la
 *    décision d'appeler reste humaine (§17).
 */
type BillingTab = 'impayes' | 'toutes' | 'tarifs'

export function BillingPage() {
  const { fees, invoices, stats, isLoading, error, reload } = useBilling()
  const [tab, setTab] = useState<BillingTab>('impayes')
  const [search, setSearch] = useState('')

  const TABS: readonly TabDef<BillingTab>[] = [
    { key: 'impayes', label: 'Impayés', count: stats.lateCount },
    { key: 'toutes', label: 'Toutes les factures', count: invoices.length },
    { key: 'tarifs', label: 'Grille tarifaire', count: fees.length },
  ]

  const late = invoices
    .filter((i) => i.overdueInstallments > 0 && remaining(i) > 0)
    .sort((a, b) => b.overdueInstallments - a.overdueInstallments || remaining(b) - remaining(a))

  const matches = (i: Invoice) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return i.studentName.toLowerCase().includes(q)
      || i.className.toLowerCase().includes(q)
      || i.guardianName.toLowerCase().includes(q)
      || i.number.toLowerCase().includes(q)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Icon name={ICONS.clock} size={20} className="animate-spin mr-2" />
        Chargement de la facturation…
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Facturation & impayés"
        subtitle="Grille tarifaire, factures de scolarité et reste à recouvrer."
        action={
          <Button variant="secondary" size="sm" onClick={reload}
            leftIcon={<Icon name={ICONS.synced} size={16} />}>
            Actualiser
          </Button>
        }
      />

      {error && <RuleNote icon={ICONS.warning} tone="warning">{error}</RuleNote>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Facturé" value={formatMoney(stats.billed)}
          subtitle="Sur l’année en cours" icon={ICONS.bill} tone="neutral" />
        <StatCard title="Encaissé" value={formatMoney(stats.collected)}
          subtitle={`${stats.collectionRate} % du facturé`} icon={ICONS.payment} tone="secondary" />
        <StatCard title="Reste à recouvrer" value={formatMoney(stats.outstanding)}
          subtitle={`${invoices.length - stats.settled} facture(s) non soldée(s)`}
          icon={ICONS.finance} tone={stats.outstanding > 0 ? 'accent' : 'neutral'} />
        <StatCard title="En retard" value={formatMoney(stats.lateAmount)}
          subtitle={`${stats.lateCount} famille(s) concernée(s)`} icon={ICONS.warning}
          tone={stats.lateCount > 0 ? 'danger' : 'neutral'} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab !== 'tarifs' && (
        <div className="relative mb-4 max-w-md">
          <Icon name={ICONS.search} size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Élève, classe, responsable, n° de facture…"
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {tab === 'impayes' && (
        <>
          <RuleNote icon={ICONS.info}>
            Aucune relance n’est envoyée automatiquement. Le numéro du
            responsable est affiché avec le montant exact et l’ancienneté du
            retard : la décision d’appeler, et la manière, restent humaines.
          </RuleNote>

          {late.filter(matches).length === 0 ? (
            <Card>
              <EmptyState icon={ICONS.checkBold} title="Aucun impayé"
                detail="Toutes les échéances arrivées à terme sont réglées." />
            </Card>
          ) : (
            <div className="space-y-3">
              {late.filter(matches).map((i) => (
                <Card key={i.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading font-bold text-foreground">{i.studentName}</p>
                        <Badge variant="secondary" size="sm">{i.className}</Badge>
                        <Badge variant={i.overdueInstallments >= 2 ? 'danger' : 'warning'} size="sm">
                          {i.overdueInstallments} échéance(s) en retard
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {i.number} · échéance du{' '}
                        {new Date(i.dueDate).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {i.guardianName}
                        {i.guardianPhone && (
                          <a href={`tel:${i.guardianPhone.replace(/\s/g, '')}`}
                            className="ml-2 font-bold text-primary hover:underline">
                            {i.guardianPhone}
                          </a>
                        )}
                      </p>
                      <Progress invoice={i} />
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">Reste à payer</p>
                      <p className="font-heading text-2xl font-bold text-destructive tabular">
                        {formatMoney(remaining(i), i.currency)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        sur {formatMoney(i.totalAmount, i.currency)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'toutes' && (
        invoices.filter(matches).length === 0 ? (
          <Card><EmptyState icon={ICONS.bill} title="Aucune facture" /></Card>
        ) : (
          <Card flush className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Élève</th>
                    <th className="px-4 py-3 font-semibold">Facture</th>
                    <th className="px-4 py-3 font-semibold text-right">Facturé</th>
                    <th className="px-4 py-3 font-semibold text-right">Réglé</th>
                    <th className="px-4 py-3 font-semibold text-right">Reste</th>
                    <th className="px-4 py-3 font-semibold">État</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.filter(matches).map((i) => {
                    const rest = remaining(i)
                    return (
                      <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-heading font-bold text-foreground">{i.studentName}</p>
                          <p className="text-xs text-muted-foreground">{i.className}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {i.number}
                          <span className="block text-xs">
                            {new Date(i.dueDate).toLocaleDateString('fr-FR')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular text-muted-foreground">
                          {formatMoney(i.totalAmount, i.currency)}
                        </td>
                        <td className="px-4 py-3 text-right tabular">
                          {formatMoney(i.paidAmount, i.currency)}
                        </td>
                        <td className={cn('px-4 py-3 text-right tabular font-bold',
                          rest > 0 ? 'text-destructive' : 'text-secondary')}>
                          {rest > 0 ? formatMoney(rest, i.currency) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {rest === 0 ? (
                            <Badge variant="success" size="sm">Soldée</Badge>
                          ) : i.overdueInstallments > 0 ? (
                            <Badge variant="danger" size="sm">En retard</Badge>
                          ) : (
                            <Badge variant="warning" size="sm">En cours</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {tab === 'tarifs' && (
        <>
          <RuleNote icon={ICONS.info}>
            Modifier un tarif ne change aucune facture déjà émise. Les factures
            existantes conservent le montant en vigueur au moment de leur
            émission — c’est ce qui rend la comptabilité vérifiable.
          </RuleNote>

          {fees.length === 0 ? (
            <Card>
              <EmptyState icon={ICONS.bill} title="Aucun tarif défini"
                detail="La grille tarifaire de l’année n’a pas encore été saisie." />
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fees.map((f) => (
                <Card key={f.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-foreground">{f.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{f.level}</p>
                    </div>
                    {!f.isActive && <Badge variant="gray" size="sm">Inactif</Badge>}
                  </div>
                  <p className="mt-3 font-heading text-2xl font-bold text-foreground tabular">
                    {formatMoney(f.amount, f.currency)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {f.installmentCount > 1
                      ? `Payable en ${f.installmentCount} tranches de ${formatMoney(Math.round(f.amount / f.installmentCount), f.currency)}`
                      : 'Payable en une fois'}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Progress({ invoice }: { invoice: Invoice }) {
  const pct = paidRatio(invoice)
  return (
    <div className="mt-2 max-w-xs">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-secondary' : 'bg-accent')}
          style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{pct} % réglé</p>
    </div>
  )
}
