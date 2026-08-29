import { Icon, ICONS } from '@/components/ui/Icon'
import { Card, SectionHeader, EmptyState } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useSchoolOverview, formatMillions, formatFull, formatTime,
} from '@/hooks/useSchoolOverview'
import { cn } from '@/lib/utils'

/**
 * Poste de pilotage — direction, web.
 * Repris de la maquette `design/maquettes/direction---web-dashboard.html`.
 *
 * Cahier des charges §8.1, §8.2, §20.2.
 *
 * Le web sert au pilotage, pas à la consultation : le directeur y
 * passe du temps assis, avec des tableaux et des ratios. D'où trois
 * partis pris que le mobile ne prend pas :
 *
 *  - La répartition par sexe et par niveau est affichée d'emblée :
 *    elle est exigée dans tous les rapports ministériels (§20.2).
 *  - Le recouvrement est rapporté à ce qui a été facturé, pas donné
 *    en valeur brute — c'est le ratio qui déclenche une décision.
 *  - Les bulletins en attente sont listés par classe, avec qui les a
 *    contrôlés : on ne signe un lot qu'en sachant d'où il vient.
 */
export function DirectionOverviewPage() {
  const {
    schoolName, academicYear, periodLabel,
    enrollment, attendance, collection,
    pendingClasses, validatedCount, pendingCount,
    lastUpdated, isLoading, error, reload,
  } = useSchoolOverview()

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Chargement de l’établissement…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Vue d’ensemble
            </h1>
            {periodLabel && (
              <span className="chip-primary">{periodLabel}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {schoolName ?? 'Établissement'}
            {academicYear ? ` · Année ${academicYear}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Dernière mise à jour : {formatTime(lastUpdated)}
          </span>
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            <Icon name={ICONS.trend} size={15} />
            Actualiser
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
          <Icon name={ICONS.closeBold} size={16} className="text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* ── Indicateurs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Effectifs */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Élèves inscrits</p>
              <p className="font-heading text-3xl font-bold text-foreground tabular mt-1">
                {enrollment.total}
              </p>
            </div>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon name={ICONS.students} size={20} />
            </div>
          </div>

          {/* §20.2 : la répartition par sexe figure dans tout rapport. */}
          {enrollment.total > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="bg-primary"
                  style={{ width: `${(enrollment.girls / enrollment.total) * 100}%` }}
                />
                <div
                  className="bg-secondary"
                  style={{ width: `${(enrollment.boys / enrollment.total) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{enrollment.girls}</span> filles
                  {' '}({Math.round((enrollment.girls / enrollment.total) * 100)} %)
                </span>
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{enrollment.boys}</span> garçons
                  {' '}({Math.round((enrollment.boys / enrollment.total) * 100)} %)
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Assiduité */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assiduité aujourd’hui</p>
              <p className="font-heading text-3xl font-bold text-foreground tabular mt-1">
                {attendance.rate != null ? `${attendance.rate} %` : '—'}
              </p>
              {/* Le seul « — » qui mérite une explication : sans elle,
                  le directeur croit à une panne. */}
              {attendance.rate == null && (
                <p className="text-xs text-muted-foreground mt-0.5 italic">
                  Aucun appel saisi pour l’instant
                </p>
              )}
            </div>
            <div className="size-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
              <Icon name={ICONS.attendance} size={20} />
            </div>
          </div>

          {attendance.rate != null && (
            <div className="mt-4 flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground tabular">{attendance.present}</span> présents
                {' '}/ {attendance.expected}
              </span>
              <span className="text-destructive font-semibold tabular">
                {attendance.absent} absences
              </span>
              {attendance.justified > 0 && (
                <span className="text-muted-foreground tabular">
                  {attendance.justified} justifiées
                </span>
              )}
            </div>
          )}
        </Card>

        {/* Recouvrement */}
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Recouvrement</p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="font-heading text-3xl font-bold text-foreground tabular">
                  {collection.rate} %
                </p>
                <span className="text-sm text-muted-foreground tabular">
                  {formatMillions(collection.collected)} FCFA
                </span>
              </div>
            </div>
            <div
              className={cn(
                'size-10 rounded-xl flex items-center justify-center',
                collection.rate >= 80
                  ? 'bg-secondary/10 text-secondary'
                  : 'bg-accent/15 text-accent-700'
              )}
            >
              <Icon name={ICONS.finance} size={20} />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  collection.rate >= 80 ? 'bg-secondary' : 'bg-accent'
                )}
                style={{ width: `${Math.min(100, collection.rate)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Facturé : <span className="tabular">{formatMillions(collection.expected)}</span>
              </span>
              <span className="font-semibold text-destructive tabular">
                {formatMillions(collection.remaining)} restants
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Répartition ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Effectifs par niveau */}
        <Card>
          <SectionHeader
            title="Effectifs par niveau"
            subtitle="Base des rapports ministériels"
          />
          {enrollment.byCycle.length === 0 ? (
            <EmptyState
              icon={ICONS.classes}
              title="Aucune inscription active"
              detail="Les effectifs apparaîtront après les premières inscriptions."
            />
          ) : (
            <div className="space-y-3">
              {enrollment.byCycle.map((c) => (
                <div key={c.cycle}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{c.cycle}</span>
                    <span className="text-muted-foreground tabular">
                      {c.count} élève{c.count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(c.count / enrollment.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Répartition des encaissements */}
        <Card>
          <SectionHeader
            title="Encaissements par canal"
            subtitle="Mobile Money, carte et caisse"
          />
          {collection.byMethod.length === 0 ? (
            <EmptyState
              icon={ICONS.payment}
              title="Aucun encaissement"
              detail="Les paiements confirmés apparaîtront ici."
            />
          ) : (
            <div className="space-y-3">
              {collection.byMethod.map((m, i) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{m.label}</span>
                    <span className="text-muted-foreground tabular">
                      {formatFull(m.amount)} FCFA · {m.share} %
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${m.share}%`,
                        backgroundColor: ['#145DA0', '#0F766E', '#F4A62A', '#7C5CFC', '#D85A8A'][i % 5],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Bulletins à signer ──────────────────────────────────── */}
      <Card flush>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-4">
          <div>
            <h2 className="font-heading font-bold text-sm text-foreground">
              Bulletins en attente de signature
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {validatedCount} déjà validé{validatedCount > 1 ? 's' : ''} ·{' '}
              {pendingCount} en attente de la direction
            </p>
          </div>

          {pendingCount > 0 && (
            <Button variant="primary" size="sm">
              <Icon name={ICONS.readReceipt} size={15} />
              Signer la sélection ({pendingCount})
            </Button>
          )}
        </div>

        {pendingClasses.length === 0 ? (
          <div className="border-t border-border">
            <EmptyState
              icon={ICONS.checkBold}
              title="Aucun bulletin en attente"
              detail="Tous les bulletins contrôlés par le DE ont été signés."
            />
          </div>
        ) : (
          /* Le tableau scrolle dans son conteneur : la page ne défile
             jamais horizontalement (§23). */
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-input/50 text-left">
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Classe</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Bulletins</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Moy. générale</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Contrôlé par</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Statut</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pendingClasses.map((c) => (
                  <tr
                    key={c.classId}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-5 py-3 font-heading font-bold text-foreground">
                      {c.className}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground tabular">
                      {c.count} élève{c.count > 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-3 tabular">
                      {c.average != null ? (
                        <span
                          className={cn(
                            'font-semibold',
                            c.average >= 14 ? 'text-secondary'
                              : c.average >= 10 ? 'text-foreground'
                              : 'text-destructive'
                          )}
                        >
                          {c.average.toFixed(2)} / 20
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {c.controlledBy ?? 'Non renseigné'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="warning" size="sm">En attente direction</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="outline" size="xs">Examiner</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default DirectionOverviewPage
