import { useState } from 'react'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Card, StatCard, EmptyState } from '@/components/ui/Card'
import { PageHeader, Tabs, RuleNote, type TabDef } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useHumanResources, formatMoney, formatMonth, formatDate,
  CONTRACT_LABELS, LEAVE_KIND_LABELS, PAYROLL_LABELS,
  type PayrollStatus, type LeaveStatus,
} from '@/hooks/useHumanResources'
import { cn } from '@/lib/utils'

/**
 * Ressources humaines — direction.
 * Cahier des charges §18.5 (contrats, paie, congés), §3.3 (validation).
 *
 * Trois règles portées à l'écran, pas seulement dans le code :
 *
 *  - **Un brouillon de paie ne se décaisse pas.** Le passage
 *    brouillon → validé → payé est visible et séquentiel : le bouton
 *    « Marquer payé » n'apparaît qu'après validation.
 *  - **Les heures d'absence expliquent l'écart de salaire.** Un net
 *    inférieur au salaire de base sans explication est une réclamation
 *    garantie ; la colonne « absences » est donc toujours affichée.
 *  - **Un congé demandé n'est pas accordé.** Les deux états ne portent
 *    ni la même couleur ni le même vocabulaire.
 */
type HrTab = 'personnel' | 'paie' | 'conges'

export function HrPage() {
  const {
    staff, payroll, leaves, month, stats, isLoading, error, busyId,
    validatePayslip, markPaid, decideLeave, reload,
  } = useHumanResources()

  const [tab, setTab] = useState<HrTab>('personnel')
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [refuseTarget, setRefuseTarget] = useState<{ id: string; name: string } | null>(null)
  const [refuseNote, setRefuseNote] = useState('')

  const TABS: readonly TabDef<HrTab>[] = [
    { key: 'personnel', label: 'Personnel', count: stats.headcount },
    { key: 'paie', label: 'Paie', count: payroll.length },
    { key: 'conges', label: 'Congés', count: stats.pendingLeaves },
  ]

  const filtered = staff.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      s.fullName.toLowerCase().includes(q) ||
      (s.jobTitle ?? '').toLowerCase().includes(q) ||
      (s.department ?? '').toLowerCase().includes(q) ||
      (s.employeeNum ?? '').toLowerCase().includes(q)
    )
  })

  async function onValidate(id: string, name: string) {
    const res = await validatePayslip(id)
    setNotice(res.ok
      ? `Paie de ${name} validée. Elle peut maintenant être décaissée.`
      : res.error)
  }

  async function onPay(id: string, name: string) {
    const res = await markPaid(id)
    setNotice(res.ok ? `Paie de ${name} marquée comme payée.` : res.error)
  }

  async function onApprove(id: string, name: string) {
    const res = await decideLeave(id, true)
    setNotice(res.ok
      ? `Congé de ${name} approuvé. Le solde est décompté.`
      : res.error)
  }

  async function confirmRefuse() {
    if (!refuseTarget) return
    if (refuseNote.trim().length < 5) {
      setNotice('Indiquez le motif : c’est la seule explication que recevra l’agent.')
      return
    }
    const res = await decideLeave(refuseTarget.id, false, refuseNote.trim())
    setNotice(res.ok ? `Demande de ${refuseTarget.name} refusée.` : res.error)
    setRefuseTarget(null)
    setRefuseNote('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Icon name={ICONS.clock} size={20} className="animate-spin mr-2" />
        Chargement des données du personnel…
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Ressources humaines"
        subtitle="Personnel, contrats, paie mensuelle et congés."
        count={`${stats.headcount} agents`}
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
        <StatCard title="Effectif actif" value={String(stats.headcount)}
          subtitle="Agents en poste" icon={ICONS.teachers} tone="primary" />
        <StatCard title={`Masse salariale — ${formatMonth(month)}`}
          value={formatMoney(stats.massSalary)} subtitle="Net à payer"
          icon={ICONS.finance} tone="secondary" />
        <StatCard title="Paies à valider" value={String(stats.toValidate)}
          subtitle="Brouillons en attente" icon={ICONS.checklist}
          tone={stats.toValidate > 0 ? 'accent' : 'neutral'} />
        <StatCard title="Congés à décider" value={String(stats.pendingLeaves)}
          subtitle="Demandes reçues" icon={ICONS.calendar}
          tone={stats.pendingLeaves > 0 ? 'accent' : 'neutral'} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'personnel' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Icon name={ICONS.search} size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, fonction, matricule…"
                className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stats.byDepartment.map((d) => (
                <Badge key={d.name} variant="secondary" size="sm">
                  {d.name} · {d.count}
                </Badge>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState icon={ICONS.teachers} title="Aucun agent trouvé"
                detail="Modifiez la recherche ou vérifiez le service sélectionné." />
            </Card>
          ) : (
            <Card flush className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Agent</th>
                      <th className="px-4 py-3 font-semibold">Service</th>
                      <th className="px-4 py-3 font-semibold">Contrat</th>
                      <th className="px-4 py-3 font-semibold text-right">Salaire de base</th>
                      <th className="px-4 py-3 font-semibold text-right">H/sem</th>
                      <th className="px-4 py-3 font-semibold text-right">Congés restants</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-heading font-bold text-foreground">{s.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.jobTitle ?? '—'}
                            {s.employeeNum && ` · ${s.employeeNum}`}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{s.department ?? '—'}</td>
                        <td className="px-4 py-3">
                          {s.contractType ? (
                            <Badge variant={s.contractType === 'permanent' ? 'primary' : 'secondary'} size="sm">
                              {CONTRACT_LABELS[s.contractType]}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular">{formatMoney(s.baseSalary)}</td>
                        <td className="px-4 py-3 text-right tabular text-muted-foreground">
                          {s.hoursWeek ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular">
                          {s.leaveRemaining == null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={cn(s.leaveRemaining === 0 && 'font-bold text-destructive')}>
                              {s.leaveRemaining} j
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'paie' && (
        <>
          <RuleNote icon={ICONS.shield}>
            Un bulletin en <strong>brouillon</strong> ne peut pas être décaissé. Il doit
            d’abord être validé : c’est cette validation qui engage l’établissement.
            L’écart entre le salaire de base et le net s’explique par les heures
            d’absence, affichées ci-dessous.
          </RuleNote>

          {payroll.length === 0 ? (
            <Card>
              <EmptyState icon={ICONS.finance} title={`Aucune paie pour ${formatMonth(month)}`}
                detail="La paie du mois n’a pas encore été générée." />
            </Card>
          ) : (
            <Card flush className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Agent</th>
                      <th className="px-4 py-3 font-semibold text-right">H. prévues</th>
                      <th className="px-4 py-3 font-semibold text-right">H. faites</th>
                      <th className="px-4 py-3 font-semibold text-right">Absences</th>
                      <th className="px-4 py-3 font-semibold text-right">Net à payer</th>
                      <th className="px-4 py-3 font-semibold">État</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payroll.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-heading font-bold text-foreground">{p.staffName}</td>
                        <td className="px-4 py-3 text-right tabular text-muted-foreground">{p.scheduledHours}</td>
                        <td className="px-4 py-3 text-right tabular">{p.effectiveHours}</td>
                        <td className="px-4 py-3 text-right tabular">
                          {p.absenceHours > 0 ? (
                            <span className="font-bold text-destructive">−{p.absenceHours} h</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular font-bold">
                          {formatMoney(p.netAmount, p.currency)}
                        </td>
                        <td className="px-4 py-3"><PayrollBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-right">
                          {p.status === 'draft' && (
                            <Button size="xs" loading={busyId === p.id}
                              onClick={() => void onValidate(p.id, p.staffName)}>
                              Valider
                            </Button>
                          )}
                          {p.status === 'validated' && (
                            <Button size="xs" variant="success" loading={busyId === p.id}
                              onClick={() => void onPay(p.id, p.staffName)}>
                              Marquer payé
                            </Button>
                          )}
                          {p.status === 'paid' && (
                            <span className="text-xs text-muted-foreground">Clôturé</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'conges' && (
        <>
          <RuleNote icon={ICONS.info}>
            Une demande reçue n’est pas un congé accordé : le solde de l’agent
            n’est décompté qu’à l’approbation. Un refus exige un motif, seul
            message que recevra l’agent.
          </RuleNote>

          {leaves.length === 0 ? (
            <Card>
              <EmptyState icon={ICONS.calendar} title="Aucune demande de congé"
                detail="Les demandes du personnel apparaîtront ici." />
            </Card>
          ) : (
            <div className="space-y-3">
              {leaves.map((l) => (
                <Card key={l.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading font-bold text-foreground">{l.staffName}</p>
                        <Badge variant="secondary" size="sm">
                          {LEAVE_KIND_LABELS[l.kind] ?? l.kind}
                        </Badge>
                        <LeaveBadge status={l.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Du {formatDate(l.dateFrom)} au {formatDate(l.dateTo)} · {l.daysCount} jour(s)
                      </p>
                      {l.reason && <p className="mt-1 text-sm text-foreground">{l.reason}</p>}
                    </div>

                    {l.status === 'demande' && (
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="danger"
                          onClick={() => { setRefuseTarget({ id: l.id, name: l.staffName }); setRefuseNote('') }}
                          leftIcon={<Icon name={ICONS.close} size={14} />}>
                          Refuser
                        </Button>
                        <Button size="sm" variant="success" loading={busyId === l.id}
                          onClick={() => void onApprove(l.id, l.staffName)}
                          leftIcon={<Icon name={ICONS.check} size={14} />}>
                          Approuver
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {refuseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setRefuseTarget(null)}>
          <Card className="w-full max-w-md">
            <div onClick={(e) => e.stopPropagation()}>
              <h2 className="font-heading text-lg font-bold text-foreground">
                Refuser la demande de {refuseTarget.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Le motif est transmis tel quel à l’agent. Soyez précis : c’est la
                seule explication qu’il recevra.
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

function PayrollBadge({ status }: { status: PayrollStatus }) {
  const variant = status === 'paid' ? 'success' : status === 'validated' ? 'primary' : 'warning'
  return <Badge variant={variant} size="sm">{PAYROLL_LABELS[status]}</Badge>
}

function LeaveBadge({ status }: { status: LeaveStatus }) {
  const map: Record<LeaveStatus, { v: 'success' | 'warning' | 'danger' | 'gray'; l: string }> = {
    demande: { v: 'warning', l: 'En attente' },
    approuve: { v: 'success', l: 'Approuvé' },
    refuse: { v: 'danger', l: 'Refusé' },
    annule: { v: 'gray', l: 'Annulé' },
  }
  const m = map[status]
  return <Badge variant={m.v} size="sm">{m.l}</Badge>
}
