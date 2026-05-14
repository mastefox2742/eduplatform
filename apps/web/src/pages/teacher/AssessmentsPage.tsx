import { useState, useMemo, useEffect } from 'react'
import {
  Plus, FileText, CheckCircle2, XCircle, Clock,
  Send, Upload, Eye, BookOpen, Award, AlertTriangle, X
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SeedBanner, LiveBadge } from '@/components/ui/SeedBanner'
import { useLiveTeacherAssessments } from '@/hooks/useLiveAssessments'
import { useAuthStore } from '@/store/auth.store'
import { cn, formatDate } from '@/lib/utils'
import type { Assessment as SharedAssessment } from '@school/shared-types'

function fromShared(a: SharedAssessment): TeacherAssessment {
  return {
    id: a.id, title: a.title,
    type: (a.type === 'trimester_exam' ? 'class' : a.type) as 'class' | 'departmental',
    subjectName: a.subjectName, classNames: a.classNames,
    trimester: a.trimester, scheduledDate: a.scheduledDate,
    duration: a.duration, coefficient: a.coefficient, maxScore: a.maxScore,
    status: a.status as TeacherAssessment['status'],
    instructions: a.instructions, rejectionReason: a.rejectionReason, avgScore: a.avgScore,
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AssessmentType   = 'class' | 'departmental'
type AssessmentStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'grading' | 'graded'

interface TeacherAssessment {
  id: string
  title: string
  type: AssessmentType
  subjectName: string
  classNames: string[]
  trimester: 1 | 2 | 3
  scheduledDate: number
  duration: number
  coefficient: number
  maxScore: number
  status: AssessmentStatus
  instructions: string
  rejectionReason?: string
  avgScore?: number
  gradedCount?: number
  totalStudents?: number
}

// ── Données démo ──────────────────────────────────────────────────────────────

const now = Date.now(), day = 86400000

const DEMO: TeacherAssessment[] = [
  {
    id: 'ta1', type: 'class', title: 'Interrogation — Équations du 1er degré',
    subjectName: 'Mathématiques', classNames: ['5ème A'],
    trimester: 2, scheduledDate: now - day * 2, duration: 55, coefficient: 1, maxScore: 20,
    status: 'graded', instructions: 'Sans calculatrice.', avgScore: 13.8, gradedCount: 22, totalStudents: 22,
  },
  {
    id: 'ta2', type: 'departmental', title: 'Devoir Commun — Mathématiques T2',
    subjectName: 'Mathématiques', classNames: ['6ème A', '6ème B', '5ème A', '5ème B'],
    trimester: 2, scheduledDate: now + day * 5, duration: 120, coefficient: 3, maxScore: 20,
    status: 'approved', instructions: 'Calculatrice autorisée.',
  },
  {
    id: 'ta3', type: 'class', title: 'Contrôle — Géométrie : triangles',
    subjectName: 'Mathématiques', classNames: ['5ème B'],
    trimester: 2, scheduledDate: now + day * 7, duration: 55, coefficient: 1, maxScore: 20,
    status: 'submitted', instructions: 'Règle et compas obligatoires.',
  },
  {
    id: 'ta4', type: 'class', title: 'Devoir maison — Fractions',
    subjectName: 'Mathématiques', classNames: ['6ème A'],
    trimester: 2, scheduledDate: now + day * 14, duration: 0, coefficient: 1, maxScore: 20,
    status: 'draft', instructions: 'Travail individuel. Rendu en classe.',
  },
  {
    id: 'ta5', type: 'class', title: 'Contrôle — Puissances',
    subjectName: 'Physique', classNames: ['4ème A'],
    trimester: 2, scheduledDate: now + day * 3, duration: 55, coefficient: 1, maxScore: 20,
    status: 'rejected', instructions: 'Sans calculatrice.',
    rejectionReason: 'La partie III dépasse le programme de 4ème. Merci de retirer les exercices sur les racines carrées.',
  },
  {
    id: 'ta6', type: 'class', title: 'Rédaction — Algèbre linéaire',
    subjectName: 'Mathématiques', classNames: ['5ème A'],
    trimester: 2, scheduledDate: now - day * 10, duration: 55, coefficient: 1, maxScore: 20,
    status: 'grading', instructions: 'Développer la démonstration.',
    gradedCount: 14, totalStudents: 22,
  },
]

// ── Sous-composants ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<AssessmentStatus, { label: string; variant: 'gray' | 'warning' | 'primary' | 'success' | 'danger' }> = {
  draft:     { label: 'Brouillon',  variant: 'gray' },
  submitted: { label: 'En attente', variant: 'warning' },
  approved:  { label: 'Approuvé',   variant: 'primary' },
  rejected:  { label: 'Refusé',     variant: 'danger' },
  grading:   { label: 'Notation…',  variant: 'warning' },
  graded:    { label: 'Noté',       variant: 'success' },
}

function durationLabel(min: number) {
  if (min === 0) return 'DM'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`
}

// ── Formulaire de soumission ──────────────────────────────────────────────────

const MY_CLASSES  = ['5ème A', '5ème B', '6ème A', '6ème B', '4ème A']
const MY_SUBJECTS = ['Mathématiques', 'Physique']

function SubmitForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (a: TeacherAssessment) => void }) {
  const [form, setForm] = useState({
    title:        '',
    type:         'class' as AssessmentType,
    subjectName:  MY_SUBJECTS[0],
    classNames:   [] as string[],
    trimester:    2 as 1 | 2 | 3,
    scheduledDate:'',
    duration:     55,
    coefficient:  1,
    maxScore:     20,
    instructions: '',
    asDraft:      false,
  })

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }
  function toggleClass(c: string) {
    setForm(f => ({ ...f, classNames: f.classNames.includes(c) ? f.classNames.filter(x => x !== c) : [...f.classNames, c] }))
  }

  const canSubmit = form.title.trim() && form.classNames.length > 0 && form.instructions.trim()

  function handleSubmit(draft: boolean) {
    onSubmit({
      id: crypto.randomUUID(),
      ...form,
      scheduledDate: form.scheduledDate ? new Date(form.scheduledDate).getTime() : Date.now() + 86400000 * 7,
      status: draft ? 'draft' : 'submitted',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">

        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Soumettre un sujet</h2>
            <p className="text-sm text-gray-400">Le sujet sera envoyé à la direction pour validation</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
          <Input label="Titre de l'évaluation" placeholder="ex: Contrôle — Équations du 1er degré"
            value={form.title} onChange={e => set('title', e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select className="input py-2.5 text-sm" value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="class">Devoir de classe</option>
                <option value="departmental">Devoir départemental</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Matière</label>
              <select className="input py-2.5 text-sm" value={form.subjectName} onChange={e => set('subjectName', e.target.value)}>
                {MY_SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Classes concernées</label>
            <div className="flex flex-wrap gap-2">
              {MY_CLASSES.map(c => (
                <button key={c} onClick={() => toggleClass(c)}
                  className={cn('px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors',
                    form.classNames.includes(c) ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary-300'
                  )}>{c}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Trimestre</label>
              <select className="input py-2.5 text-sm" value={form.trimester} onChange={e => set('trimester', +e.target.value)}>
                <option value={1}>Trimestre 1</option>
                <option value={2}>Trimestre 2</option>
                <option value={3}>Trimestre 3</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Durée</label>
              <select className="input py-2.5 text-sm" value={form.duration} onChange={e => set('duration', +e.target.value)}>
                <option value={0}>Devoir maison</option>
                <option value={30}>30 min</option>
                <option value={55}>55 min (1h)</option>
                <option value={110}>1h50 (2h)</option>
                <option value={180}>3h</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Coefficient</label>
              <select className="input py-2.5 text-sm" value={form.coefficient} onChange={e => set('coefficient', +e.target.value)}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <Input label="Date prévue" type="date" value={form.scheduledDate}
            onChange={e => set('scheduledDate', e.target.value)} />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Instructions & consignes</label>
            <textarea
              className="input text-sm w-full resize-none py-2.5"
              rows={4}
              placeholder="Décrivez les consignes, matériel autorisé, objectifs pédagogiques…"
              value={form.instructions}
              onChange={e => set('instructions', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary-50 border border-primary-100">
            <Upload size={14} className="text-primary-500 flex-shrink-0" />
            <p className="text-sm text-primary-700">
              <strong>Fichier sujet</strong> — Vous pourrez attacher le PDF du sujet après validation.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-7 py-5 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleSubmit(true)} disabled={!form.title.trim()}>
              Enregistrer brouillon
            </Button>
            <Button variant="primary" leftIcon={<Send size={14} />} onClick={() => handleSubmit(false)} disabled={!canSubmit}>
              Soumettre à la direction
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TeacherAssessmentsPage() {
  const { profile } = useAuthStore()
  const teacherId = profile?.id ?? null

  const [items, setItems]     = useState<TeacherAssessment[]>(DEMO)
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab]           = useState<'all' | AssessmentStatus>('all')

  // ── Firestore live data ─────────────────────────────────────────────────────
  const { assessments: liveItems, isLive, submit: liveSubmit, add: liveAdd } =
    useLiveTeacherAssessments(teacherId, [])

  useEffect(() => {
    if (liveItems.length > 0) setItems(liveItems.map(fromShared))
  }, [liveItems])

  const filtered = useMemo(() => tab === 'all' ? items : items.filter(a => a.status === tab), [items, tab])

  const kpis = {
    draft:     items.filter(a => a.status === 'draft').length,
    submitted: items.filter(a => a.status === 'submitted').length,
    rejected:  items.filter(a => a.status === 'rejected').length,
    grading:   items.filter(a => a.status === 'grading').length,
  }

  return (
    <div className="px-8 py-8 max-w-5xl space-y-6">
      <SeedBanner show={!isLive} />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Mes évaluations</h1>
            <LiveBadge isLive={isLive} />
          </div>
          <p className="text-sm text-gray-400">Devoirs & examens · Année 2025-2026</p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowForm(true)}>
          Soumettre un sujet
        </Button>
      </div>

      {/* Alerts */}
      {kpis.rejected > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-danger-50 border border-danger-200 rounded-xl">
          <AlertTriangle size={16} className="text-danger-600 flex-shrink-0" />
          <p className="text-sm text-danger-800">
            <strong>{kpis.rejected} sujet{kpis.rejected > 1 ? 's' : ''} refusé{kpis.rejected > 1 ? 's' : ''}</strong> par la direction — relisez les motifs et corrigez.
          </p>
        </div>
      )}
      {kpis.grading > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-warning-50 border border-warning-200 rounded-xl">
          <BookOpen size={16} className="text-warning-600 flex-shrink-0" />
          <p className="text-sm text-warning-800">
            <strong>{kpis.grading} évaluation{kpis.grading > 1 ? 's' : ''}</strong> en cours de notation — des copies attendent.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { key: 'all',       label: 'Toutes', count: items.length },
          { key: 'draft',     label: 'Brouillons', count: kpis.draft },
          { key: 'submitted', label: 'En attente', count: kpis.submitted },
          { key: 'grading',   label: 'Notation', count: kpis.grading },
          { key: 'graded',    label: 'Notées', count: items.filter(a => a.status === 'graded').length },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}>
            {t.label}
            {t.count > 0 && <span className={cn('text-xs rounded-full px-1.5 py-0.5',
              tab === t.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'
            )}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map(a => {
          const cfg = STATUS_CFG[a.status]
          const isRejected = a.status === 'rejected'
          const isGrading  = a.status === 'grading'
          const isGraded   = a.status === 'graded'
          const daysUntil  = Math.ceil((a.scheduledDate - now) / day)

          return (
            <div key={a.id} className={cn(
              'bg-white rounded-2xl border p-5 transition-all',
              isRejected ? 'border-danger-200 bg-danger-50/30' : 'border-gray-100 hover:border-primary-200 hover:shadow-sm'
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                    <Badge variant="gray" size="sm">{a.type === 'class' ? 'De classe' : 'Départemental'}</Badge>
                    <Badge variant="gray" size="sm">T{a.trimester}</Badge>
                    <Badge variant="gray" size="sm">Coeff. {a.coefficient}</Badge>
                  </div>
                  <h3 className="font-bold text-gray-900">{a.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {a.subjectName} · {a.classNames.join(', ')} · {durationLabel(a.duration)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {a.avgScore != null && (
                    <span className={cn('text-lg font-bold',
                      a.avgScore >= 14 ? 'text-success-600' : a.avgScore >= 10 ? 'text-warning-600' : 'text-danger-600'
                    )}>{a.avgScore}/20</span>
                  )}
                  {daysUntil > 0 && a.status !== 'graded' && (
                    <span className={cn('text-sm font-medium', daysUntil <= 3 ? 'text-danger-600' : 'text-gray-400')}>
                      J-{daysUntil}
                    </span>
                  )}
                  {daysUntil <= 0 && <span className="text-xs text-gray-400">{formatDate(a.scheduledDate)}</span>}
                </div>
              </div>

              {/* Rejection reason */}
              {isRejected && a.rejectionReason && (
                <div className="mt-3 flex items-start gap-2 text-sm text-danger-700 bg-danger-50 rounded-xl p-3 border border-danger-100">
                  <XCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-0.5">Motif du refus</p>
                    <p>{a.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Grading progress */}
              {(isGrading || isGraded) && a.gradedCount != null && a.totalStudents != null && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-success-500 rounded-full"
                      style={{ width: `${(a.gradedCount / a.totalStudents) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {a.gradedCount}/{a.totalStudents} copies notées
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                {a.status === 'draft' && (
                  <Button variant="primary" size="sm" leftIcon={<Send size={13} />}
                    onClick={() => setItems(prev => prev.map(x => x.id === a.id ? { ...x, status: 'submitted' } : x))}>
                    Soumettre à la direction
                  </Button>
                )}
                {a.status === 'rejected' && (
                  <Button variant="secondary" size="sm" leftIcon={<FileText size={13} />}>
                    Modifier le sujet
                  </Button>
                )}
                {isGrading && (
                  <Button variant="primary" size="sm" leftIcon={<Award size={13} />}>
                    Continuer la notation
                  </Button>
                )}
                {a.status === 'approved' && (
                  <Button variant="secondary" size="sm" leftIcon={<Upload size={13} />}>
                    Attacher le PDF
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <SubmitForm
          onClose={() => setShowForm(false)}
          onSubmit={a => setItems(prev => [a, ...prev])}
        />
      )}
    </div>
  )
}
