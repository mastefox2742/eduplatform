import { useState } from 'react'
import { Icon, ICONS } from '@/components/ui/Icon'
import { Card, EmptyState } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useValidationQueue, averageTone, documentKindLabel,
  type QueueTab, type BulletinItem, type DocumentItem,
} from '@/hooks/useValidationQueue'
import { cn } from '@/lib/utils'

/**
 * Validation des bulletins et documents — direction, web.
 *
 * Cahier des charges §3.3, §13.3, §20.1.
 *
 * Sur téléphone, le directeur traite une carte à la fois. Sur
 * ordinateur, il traite un lot : d'où la sélection multiple, absente du
 * mobile.
 *
 * Les règles restent les mêmes des deux côtés :
 *  - les anomalies sont calculées et affichées avant la signature
 *  - la sélection « tout » ne prend que les bulletins sans anomalie
 *  - un rejet exige un motif
 *  - signer ne publie pas : la publication est un geste distinct (§13.3)
 */
export function DirectionBulletinsPage() {
  const {
    bulletins, documents, thresholds, counts, isLoading, error, processingIds,
    signBulletins, rejectBulletin, signDocument, refuseDocument, reload,
  } = useValidationQueue()

  const [tab, setTab] = useState<QueueTab>('bulletins')
  const [selected, setSelected] = useState<string[]>([])
  const [rejectTarget, setRejectTarget] = useState<
    { id: string; name: string; kind: QueueTab } | null
  >(null)
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  /** Ne prend que les bulletins sans anomalie : signer d'un geste un
   *  bulletin dont la moyenne manque validerait une erreur de saisie. */
  const selectClean = () =>
    setSelected(bulletins.filter((b) => b.warnings.length === 0).map((b) => b.id))

  async function handleSign(ids: string[]) {
    const res = await signBulletins(ids)
    setSelected([])
    setNotice(res.ok
      ? `${res.count} bulletin(s) signé(s). Ils ne sont pas encore visibles des familles : la publication est une étape distincte.`
      : res.error)
  }

  async function confirmReject() {
    if (!rejectTarget) return
    if (reason.trim().length < 5) {
      setNotice('Indiquez ce qui doit être corrigé : l’enseignant ne verra que ce message.')
      return
    }
    const res = rejectTarget.kind === 'bulletins'
      ? await rejectBulletin(rejectTarget.id, reason.trim())
      : await refuseDocument(rejectTarget.id, reason.trim())

    setRejectTarget(null)
    setReason('')
    if (!res.ok) setNotice(res.error)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Chargement de la file…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── En-tête ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold">Validations en attente</h1>
            <span className="chip-primary">{counts.total} éléments</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Bulletins contrôlés par le Directeur des Études et documents préparés
            par le secrétariat.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => void reload()}>
          <Icon name={ICONS.trend} size={15} />
          Actualiser
        </Button>
      </div>

      {/* ── Onglets ─────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {([
          ['bulletins', `Bulletins (${counts.bulletins})`],
          ['documents', `Documents (${counts.documents})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSelected([]) }}
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
      </div>

      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
          <Icon name={ICONS.info} size={16} className="text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground flex-1">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-muted-foreground">
            <Icon name={ICONS.close} size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3">
          <Icon name={ICONS.closeBold} size={16} className="text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* ── Bulletins ───────────────────────────────────────────── */}
      {tab === 'bulletins' && (
        <>
          {bulletins.length > 0 && (
            <Card className="flex flex-wrap items-center justify-between gap-3 bg-secondary/5 border-secondary/25">
              <div className="flex items-center gap-2">
                <Icon name={ICONS.shield} size={18} className="text-secondary" />
                <p className="text-sm text-secondary font-medium">
                  Mode signature électronique actif
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectClean}>
                  Sélectionner les {counts.clean} sans anomalie
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={selected.length === 0}
                  onClick={() => void handleSign(selected)}
                >
                  <Icon name={ICONS.readReceipt} size={15} />
                  Signer la sélection ({selected.length})
                </Button>
              </div>
            </Card>
          )}

          {counts.flagged > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-accent/35 bg-accent/10 px-4 py-3">
              <Icon name={ICONS.warning} size={16} className="text-accent-700 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                <strong className="font-heading">{counts.flagged} bulletin(s) à examiner.</strong>{' '}
                Une anomalie a été détectée : ils sont exclus de la sélection groupée.
              </p>
            </div>
          )}

          {bulletins.length === 0 ? (
            <Card flush>
              <EmptyState
                icon={ICONS.checkBold}
                title="Aucun bulletin en attente"
                detail="Les bulletins apparaîtront ici dès que le Directeur des Études les aura contrôlés."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {bulletins.map((b) => (
                <BulletinRow
                  key={b.id}
                  item={b}
                  thresholds={thresholds}
                  checked={selected.includes(b.id)}
                  busy={processingIds.includes(b.id)}
                  onToggle={() => toggle(b.id)}
                  onSign={() => void handleSign([b.id])}
                  onReject={() =>
                    setRejectTarget({ id: b.id, name: b.studentName, kind: 'bulletins' })
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Documents ───────────────────────────────────────────── */}
      {tab === 'documents' && (
        documents.length === 0 ? (
          <Card flush>
            <EmptyState
              icon={ICONS.document}
              title="Aucun document à signer"
              detail="Les certificats et attestations préparés par le secrétariat arrivent ici."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((d) => (
              <DocumentRow
                key={d.id}
                item={d}
                busy={processingIds.includes(d.id)}
                onSign={() => void signDocument(d.id)}
                onRefuse={() =>
                  setRejectTarget({ id: d.id, name: d.title, kind: 'documents' })
                }
              />
            ))}
          </div>
        )
      )}

      {/* ── Motif de rejet ──────────────────────────────────────── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 p-4">
          <Card className="w-full max-w-lg">
            <h2 className="font-heading text-lg font-bold">
              {rejectTarget.kind === 'bulletins' ? 'Renvoyer le bulletin' : 'Refuser la demande'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{rejectTarget.name}</p>

            <label className="block text-xs font-semibold text-foreground mt-4 mb-1.5">
              {rejectTarget.kind === 'bulletins'
                ? 'Ce que l’enseignant doit corriger'
                : 'Motif du refus, communiqué au demandeur'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Ex. : moyenne de mathématiques manquante"
              className="input resize-none"
            />

            <div className="flex gap-2 mt-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setRejectTarget(null); setReason('') }}
              >
                Annuler
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => void confirmReject()}>
                Envoyer
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Ligne bulletin ────────────────────────────────────────────────────────────

const TONE_CLASS = {
  secondary: 'bg-secondary/12 text-secondary',
  accent:    'bg-accent/18 text-accent-700',
  danger:    'bg-destructive/12 text-destructive',
  muted:     'bg-muted text-muted-foreground',
} as const

function BulletinRow({
  item, thresholds, checked, busy, onToggle, onSign, onReject,
}: {
  item: BulletinItem
  thresholds: { honor: number; excellence: number; pass: number }
  checked: boolean
  busy: boolean
  onToggle: () => void
  onSign: () => void
  onReject: () => void
}) {
  const tone = averageTone(item.average, thresholds)
  const flagged = item.warnings.length > 0

  return (
    <Card
      className={cn(
        'transition-all',
        checked && 'border-primary/50 ring-1 ring-primary/20',
        busy && 'opacity-50'
      )}
    >
      <div className="flex flex-wrap items-start gap-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          disabled={flagged}
          title={flagged ? 'Anomalie détectée : à examiner individuellement' : undefined}
          className="mt-1 size-4 accent-[color:var(--primary)] disabled:opacity-40"
        />

        <div className="flex-1 min-w-[200px]">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading font-bold text-sm">{item.studentName}</h3>
            <span className={cn('chip', TONE_CLASS[tone])}>
              {item.average != null ? `${item.average.toFixed(1)}/20` : '—'}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            {item.className ? `Classe de ${item.className}` : 'Classe non renseignée'}
            {item.periodLabel ? ` · ${item.periodLabel}` : ''}
            {item.controlledBy ? ` · contrôlé par ${item.controlledBy}` : ''}
          </p>

          <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground mt-2">
            {item.rank && item.classSize && <span>Rang {item.rank}/{item.classSize}</span>}
            {item.classAverage != null && <span>Moy. classe {item.classAverage.toFixed(1)}</span>}
            {item.absences > 0 && <span>{item.absences} absence{item.absences > 1 ? 's' : ''}</span>}
          </div>

          <div className="mt-3 rounded-lg bg-background px-3 py-2 text-xs">
            <span className="font-semibold text-foreground">Avis conseil : </span>
            <span className="text-muted-foreground">
              {item.councilDecision ?? 'Non renseigné'}
            </span>
          </div>

          {flagged && (
            <div className="mt-2 rounded-lg bg-accent/10 px-3 py-2 space-y-1">
              {item.warnings.map((w) => (
                <div key={w} className="flex items-center gap-1.5">
                  <Icon name={ICONS.warningBold} size={13} className="text-accent-700" />
                  <span className="text-[11px] text-accent-700">{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" disabled={busy} onClick={onReject}>
            <Icon name={ICONS.close} size={15} className="text-destructive" />
            Rejeter
          </Button>
          <Button variant="primary" size="sm" disabled={busy} onClick={onSign}>
            <Icon name={ICONS.readReceipt} size={15} />
            Signer
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ── Ligne document ────────────────────────────────────────────────────────────

function DocumentRow({
  item, busy, onSign, onRefuse,
}: {
  item: DocumentItem
  busy: boolean
  onSign: () => void
  onRefuse: () => void
}) {
  return (
    <Card className={cn(busy && 'opacity-50')}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon name={ICONS.document} size={22} />
        </div>

        <div className="flex-1 min-w-[200px]">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading font-bold text-sm">
              {documentKindLabel(item.kind)}
            </h3>
            <Badge variant={item.isUrgent ? 'danger' : 'secondary'} size="sm">
              {item.isUrgent ? 'Urgent' : 'Secrétariat'}
            </Badge>
            <span className="font-mono text-[11px] text-muted-foreground">
              {item.reference}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            {item.studentName ?? '—'}{item.className ? ` · ${item.className}` : ''}
          </p>

          <p className="text-xs text-muted-foreground mt-2">
            Demandé par {item.requesterName ?? 'un tiers'} le{' '}
            {new Date(item.createdAt).toLocaleDateString('fr-FR')}
            {item.purpose ? ` · Motif : ${item.purpose}` : ''}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" disabled={busy} onClick={onRefuse}>
            Refuser
          </Button>
          <Button variant="success" size="sm" disabled={busy} onClick={onSign}>
            <Icon name={ICONS.editSquare} size={15} />
            Signer
          </Button>
        </div>
      </div>
    </Card>
  )
}

export default DirectionBulletinsPage
