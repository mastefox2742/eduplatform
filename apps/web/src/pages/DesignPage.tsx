import { useState } from 'react'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Card, StatCard, SectionHeader, AlertRow, EmptyState } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

/**
 * Galerie du design system.
 *
 * Page publique, sans donnée réelle : elle sert de référence visuelle
 * partagée entre le développement et la maquette, et permet de vérifier
 * un composant sans se connecter ni disposer d'un backend.
 *
 * Toutes les valeurs affichées sont fictives et le disent.
 */
export function DesignPage() {
  const [tab, setTab] = useState<'tokens' | 'components' | 'screens'>('tokens')

  return (
    <div className="min-h-screen bg-background">
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-heading font-extrabold text-lg">
                P1
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading text-lg font-bold">Design system</h1>
                  <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    Projetto1
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Référence visuelle · données fictives
                </p>
              </div>
            </div>

            <nav className="flex gap-2">
              {([
                ['tokens', 'Fondations'],
                ['components', 'Composants'],
                ['screens', 'Compositions'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    tab === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {tab === 'tokens' && <TokensSection />}
        {tab === 'components' && <ComponentsSection />}
        {tab === 'screens' && <ScreensSection />}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Les mêmes valeurs sont reprises dans <code className="font-mono text-[11px]">apps/mobile/src/theme</code>.
          Une carte web et une carte mobile doivent être indiscernables sur une capture.
        </p>
      </footer>
    </div>
  )
}

// ── Fondations ────────────────────────────────────────────────────────────────

const PALETTE = [
  { name: 'primary',     hex: '#145DA0', usage: 'Identité, navigation active, actions principales' },
  { name: 'secondary',   hex: '#0F766E', usage: 'Validé, présent, recouvré, réussite' },
  { name: 'accent',      hex: '#F4A62A', usage: 'En attente, XP, échéance proche' },
  { name: 'destructive', hex: '#C2413B', usage: 'Impayé, absence non justifiée, sanction' },
  { name: 'foreground',  hex: '#14213D', usage: 'Texte principal — bleu nuit, pas noir' },
  { name: 'muted-fg',    hex: '#5E7188', usage: 'Texte secondaire' },
  { name: 'border',      hex: '#D8E1EB', usage: 'Bordures — elles séparent, pas les ombres' },
  { name: 'background',  hex: '#F6F8FB', usage: 'Fond d’écran' },
]

function TokensSection() {
  return (
    <div className="space-y-8">
      <section>
        <SectionHeader
          title="Couleurs"
          subtitle="Le ton porte le sens : on doit lire un écran à la couleur avant le texte"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PALETTE.map((c) => (
            <Card key={c.name} className="overflow-hidden" flush>
              <div className="h-16" style={{ backgroundColor: c.hex }} />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-sm">{c.name}</span>
                  <code className="font-mono text-[11px] text-muted-foreground">{c.hex}</code>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{c.usage}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-4 bg-accent/5 border-accent/25">
          <div className="flex items-start gap-3">
            <Icon name={ICONS.warning} size={18} className="text-accent-700 shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              <strong className="font-heading">Il n’y a pas de vert vif.</strong>{' '}
              Ce qui est validé est teal. Un <code className="font-mono text-xs">#22C55E</code> dans
              un écran signale qu’il n’a pas été repris depuis les maquettes.
            </p>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader
          title="Typographie"
          subtitle="Manrope pour ce qui compte, Inter pour le reste"
        />
        <Card className="space-y-4">
          <div>
            <p className="font-heading text-2xl font-bold">Manrope — titres et montants</p>
            <p className="text-xs text-muted-foreground mt-1">
              Titres, valeurs de KPI, noms d’élèves. Un montant en Inter passe inaperçu.
            </p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="font-sans text-base">Inter — texte courant, libellés, tableaux</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les titres de section sont petits et denses (<code className="font-mono text-[11px]">text-sm font-bold</code>) :
              c’est ce qui donne l’allure d’un outil de travail plutôt que d’un site vitrine.
            </p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="font-mono text-sm tabular">1 250 000 FCFA · 14,85/20 · 94,6 %</p>
            <p className="text-xs text-muted-foreground mt-1">
              Chiffres alignés verticalement (<code className="font-mono text-[11px]">tabular-nums</code>) :
              sans cela, les montants sautent d’une ligne à l’autre.
            </p>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Icônes" subtitle="Jeu Solar — outline par défaut, bold pour l’actif" />
        <Card>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-4">
            {[
              ICONS.dashboard, ICONS.students, ICONS.teachers, ICONS.classes,
              ICONS.finance, ICONS.bulletin, ICONS.attendance, ICONS.checklist,
              ICONS.calendar, ICONS.payment, ICONS.warning, ICONS.check,
              ICONS.chat, ICONS.whatsapp, ICONS.fire, ICONS.trophy,
              ICONS.document, ICONS.download, ICONS.settings, ICONS.logout,
            ].map((name) => (
              <div key={name} className="flex flex-col items-center gap-1.5">
                <div className="size-11 rounded-xl bg-muted flex items-center justify-center text-primary">
                  <Icon name={name} size={20} />
                </div>
                <span className="text-[9px] text-muted-foreground text-center leading-tight">
                  {name.split(':')[1]?.replace(/-(outline|bold)$/, '')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}

// ── Composants ────────────────────────────────────────────────────────────────

function ComponentsSection() {
  return (
    <div className="space-y-8">
      <section>
        <SectionHeader title="Boutons" subtitle="Six variantes, quatre tailles" />
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Signer &amp; valider</Button>
            <Button variant="success">Marquer présent</Button>
            <Button variant="danger">Rejeter</Button>
            <Button variant="outline">Examiner</Button>
            <Button variant="secondary">Annuler</Button>
            <Button variant="ghost">Plus tard</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button size="xs">Très petit</Button>
            <Button size="sm">Petit</Button>
            <Button size="md">Moyen</Button>
            <Button size="lg">Grand</Button>
            <Button loading>Enregistrement…</Button>
            <Button disabled>Indisponible</Button>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Pastilles" subtitle="Le statut se lit à la couleur" />
        <Card>
          <div className="flex flex-wrap gap-3">
            <Badge variant="primary">En cours</Badge>
            <Badge variant="success">Validé</Badge>
            <Badge variant="warning">En attente</Badge>
            <Badge variant="danger">En retard</Badge>
            <Badge variant="purple">Examen d’État</Badge>
            <Badge variant="gray">Brouillon</Badge>
            <Badge variant="secondary">Secrétariat</Badge>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Indicateurs" subtitle="Une donnée manquante affiche « — », jamais zéro" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            title="Élèves inscrits"
            value={842}
            subtitle="430 filles · 412 garçons"
            icon={ICONS.students}
            tone="primary"
            trend={{ value: 4.2, label: 'vs année passée' }}
          />
          <StatCard
            title="Assiduité aujourd’hui"
            value="94,6 %"
            subtitle="45 absences · 12 justifiées"
            icon={ICONS.attendance}
            tone="secondary"
          />
          <StatCard
            title="Recouvrement"
            value="84 %"
            subtitle="8,15 M FCFA restants"
            icon={ICONS.finance}
            tone="accent"
            trend={{ value: 8.5, label: 'ce mois' }}
          />
          <StatCard
            title="Décisions en attente"
            value={28}
            subtitle="Bulletins et documents"
            icon={ICONS.warning}
            tone="danger"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Valeurs fictives, reprises de la maquette <code className="font-mono text-[11px]">direction---web-dashboard</code>.
        </p>
      </section>

      <section>
        <SectionHeader title="Alertes" subtitle="Ce qui attend une décision" />
        <Card className="space-y-2.5">
          <AlertRow
            icon={ICONS.bulletin}
            title="28 bulletins à valider"
            detail="Trimestre 2 · collège et lycée"
            tone="primary"
            action={<Icon name={ICONS.chevronRight} size={18} className="text-muted-foreground" />}
          />
          <AlertRow
            icon={ICONS.students}
            title="5 absences inhabituelles"
            detail="À vérifier avant 16 h 00"
            tone="accent"
            action={<Icon name={ICONS.chevronRight} size={18} className="text-muted-foreground" />}
          />
          <AlertRow
            icon={ICONS.finance}
            title="Impayés en cours"
            detail="8 150 000 FCFA restant à recouvrer"
            tone="danger"
            action={<Icon name={ICONS.chevronRight} size={18} className="text-muted-foreground" />}
          />
        </Card>
      </section>

      <section>
        <SectionHeader title="Champs et états" subtitle="§23 : les états doivent être explicites" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="space-y-4">
            <Input label="Nom de l’élève" placeholder="Prénom NOM" />
            <Input label="Numéro de téléphone" placeholder="06 XXX XX XX" />
            <Input label="Champ en erreur" placeholder="—" error="La moyenne doit être comprise entre 0 et 20." />
          </Card>
          <Card flush>
            <EmptyState
              icon={ICONS.checkBold}
              title="Rien ne vous attend"
              detail="Aucune signature, aucun signal en cours. L’établissement tourne."
              action={<Button variant="outline" size="sm">Voir l’historique</Button>}
            />
          </Card>
        </div>
      </section>
    </div>
  )
}

// ── Compositions ──────────────────────────────────────────────────────────────

const PENDING = [
  { cls: 'Terminale C',      n: 34, avg: 13.45, by: 'M. Makosso' },
  { cls: 'Terminale D1',     n: 42, avg: 12.80, by: 'M. Makosso' },
  { cls: '3ème A (Brevet)',  n: 38, avg: 11.90, by: 'Mme Ngoma' },
  { cls: '6ème C',           n: 31, avg: null,  by: null },
]

function ScreensSection() {
  return (
    <div className="space-y-8">
      <section>
        <SectionHeader
          title="Navigation latérale"
          subtitle="Groupée par métier, avec le contexte actif et les compteurs de charge"
        />
        <Card flush className="overflow-hidden">
          <div className="flex">
            <div className="w-72 bg-card border-r border-border p-4 space-y-5">
              <div className="bg-input/70 border border-border rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name={ICONS.calendarBold} size={16} className="text-secondary" />
                  <div className="text-xs">
                    <span className="font-semibold block">Année 2025–2026</span>
                    <span className="text-muted-foreground text-[11px]">Trimestre 2 · En cours</span>
                  </div>
                </div>
                <Icon name={ICONS.chevronDown} size={14} className="text-muted-foreground" />
              </div>

              <div>
                <p className="nav-group-label mb-2">Direction générale</p>
                <div className="nav-item-active mb-1">
                  <Icon name={ICONS.dashboard} size={20} />
                  <span>Tableau de bord</span>
                </div>
                <div className="nav-item justify-between">
                  <div className="flex items-center gap-3">
                    <Icon name={ICONS.bulletin} size={20} className="text-primary" />
                    <span>Validation bulletins</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-bold">28</span>
                </div>
                <div className="nav-item justify-between">
                  <div className="flex items-center gap-3">
                    <Icon name={ICONS.finance} size={20} className="text-primary" />
                    <span>Finance &amp; caisse</span>
                  </div>
                  <span className="text-[11px] text-secondary font-semibold">84 % recouv.</span>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 bg-background">
              <p className="text-sm text-muted-foreground">
                Le contexte — année et trimestre — est rappelé en permanence.
                Sans ce rappel, un utilisateur qui bascule d’année saisit des notes
                dans la mauvaise période sans s’en apercevoir.
              </p>
              <p className="text-sm text-muted-foreground mt-3">
                Les compteurs (« 28 », « 84 % recouv. ») transforment une liste de
                liens en tableau de bord permanent.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader
          title="Tableau — bulletins en attente"
          subtitle="On ne signe un lot qu’en sachant d’où il vient"
        />
        <Card flush>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-input/50 text-left">
                  {['Classe', 'Bulletins', 'Moy. générale', 'Contrôlé par', 'Statut', ''].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PENDING.map((r) => (
                  <tr key={r.cls} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 font-heading font-bold">{r.cls}</td>
                    <td className="px-5 py-3 text-muted-foreground tabular">{r.n} élèves</td>
                    <td className="px-5 py-3 tabular">
                      {r.avg != null ? (
                        <span className={cn('font-semibold', r.avg >= 14 ? 'text-secondary' : r.avg >= 10 ? 'text-foreground' : 'text-destructive')}>
                          {r.avg.toFixed(2)} / 20
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{r.by ?? 'Non renseigné'}</td>
                    <td className="px-5 py-3">
                      <Badge variant={r.avg != null ? 'warning' : 'gray'} size="sm">
                        {r.avg != null ? 'En attente direction' : 'Incomplet'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="outline" size="xs">Examiner</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="text-xs text-muted-foreground mt-3">
          La classe sans moyenne est marquée « Incomplet » : elle est exclue
          de « Valider tout », car signer d’un geste un bulletin dont la moyenne
          manque reviendrait à valider une erreur de saisie.
        </p>
      </section>

      <section>
        <SectionHeader title="Barres de progression" subtitle="Recouvrement et répartition" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <p className="font-heading font-bold text-sm mb-3">Encaissements par canal</p>
            <div className="space-y-3">
              {[
                { label: 'MTN Mobile Money', share: 52.4, color: '#145DA0' },
                { label: 'Airtel Money',     share: 32.9, color: '#0F766E' },
                { label: 'Caisse directe',   share: 14.7, color: '#F4A62A' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{m.label}</span>
                    <span className="text-muted-foreground tabular">{m.share} %</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${m.share}%`, backgroundColor: m.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="font-heading font-bold text-sm mb-3">Répartition par sexe</p>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <div className="bg-primary" style={{ width: '51%' }} />
              <div className="bg-secondary" style={{ width: '49%' }} />
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">430</span> filles (51 %)
              </span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">412</span> garçons (49 %)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Cette répartition figure dans tous les rapports ministériels (§20.2) :
              elle est affichée d’emblée plutôt que calculée à la demande.
            </p>
          </Card>
        </div>
      </section>
    </div>
  )
}

export default DesignPage
