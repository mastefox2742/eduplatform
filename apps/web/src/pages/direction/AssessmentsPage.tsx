import { useState, useMemo, useEffect } from 'react'
import {
  FileText, CheckCircle2, XCircle, Clock, Plus,
  ChevronDown, Send, Eye, Download, AlertTriangle,
  BookOpen, BarChart2, Users, Award, Filter
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { SeedBanner, LiveBadge } from '@/components/ui/SeedBanner'
import { useLiveAssessments } from '@/hooks/useLiveAssessments'
import { cn, formatDate } from '@/lib/utils'
import type { Assessment as SharedAssessment } from '@school/shared-types'

/** Map shared Assessment → page-local Assessment */
function fromShared(a: SharedAssessment): Assessment {
  return {
    id:              a.id,
    title:           a.title,
    type:            a.type,
    subjectName:     a.subjectName,
    teacherName:     a.teacherName,
    classNames:      a.classNames,
    trimester:       a.trimester,
    scheduledDate:   a.scheduledDate,
    duration:        a.duration,
    coefficient:     a.coefficient,
    maxScore:        a.maxScore,
    status:          a.status,
    instructions:    a.instructions,
    submittedAt:     a.submittedAt,
    approvedBy:      a.approvedBy,
    rejectionReason: a.rejectionReason,
    grades:          (a.grades ?? []).map(g => ({ studentName: g.studentName, score: g.score, comment: g.comment })),
    avgScore:        a.avgScore,
  }
}

// ── Types locaux ──────────────────────────────────────────────────────────────

type AssessmentType   = 'departmental' | 'class' | 'trimester_exam'
type AssessmentStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'grading' | 'graded'
type Trimester        = 1 | 2 | 3

interface Grade { studentName: string; score: number | null; comment?: string }

interface Assessment {
  id: string
  title: string
  type: AssessmentType
  subjectName: string
  teacherName: string
  classNames: string[]
  trimester: Trimester
  scheduledDate: number
  duration: number        // minutes
  coefficient: number
  maxScore: number
  status: AssessmentStatus
  instructions: string
  submittedAt?: number
  approvedBy?: string
  rejectionReason?: string
  grades: Grade[]
  avgScore?: number
}

// ── Données démo ──────────────────────────────────────────────────────────────

const now = Date.now()
const day = 86400000

const DEMO: Assessment[] = [
  {
    id: 'a1', type: 'departmental', title: 'Devoir Commun — Mathématiques T2',
    subjectName: 'Mathématiques', teacherName: 'Jean Leblanc',
    classNames: ['6ème A', '6ème B', '5ème A', '5ème B'],
    trimester: 2, scheduledDate: now + day * 5, duration: 120, coefficient: 3, maxScore: 20,
    status: 'approved', instructions: 'Calculatrice autorisée. Justifier toutes les réponses.',
    submittedAt: now - day * 3, approvedBy: 'M. Kourouma',
    grades: [], avgScore: undefined,
  },
  {
    id: 'a2', type: 'departmental', title: 'Devoir Commun — Français T2',
    subjectName: 'Français', teacherName: 'Sophie Moreau',
    classNames: ['6ème A', '6ème B', '5ème A'],
    trimester: 2, scheduledDate: now + day * 8, duration: 180, coefficient: 3, maxScore: 20,
    status: 'submitted', instructions: 'Dictée + rédaction (300 mots minimum).',
    submittedAt: now - day * 1, grades: [],
  },
  {
    id: 'a3', type: 'departmental', title: 'Devoir Commun — Sciences T2',
    subjectName: 'Sciences', teacherName: 'Fatima Benali',
    classNames: ['5ème A', '5ème B', '4ème A'],
    trimester: 2, scheduledDate: now + day * 12, duration: 90, coefficient: 2, maxScore: 20,
    status: 'rejected', instructions: 'QCM + partie rédactionnelle.',
    submittedAt: now - day * 4, rejectionReason: 'Le sujet dépasse le programme de 5ème. Merci de revoir la partie III.',
    grades: [],
  },
  {
    id: 'a4', type: 'class', title: 'Interrogation — Équations du 1er degré',
    subjectName: 'Mathématiques', teacherName: 'Jean Leblanc',
    classNames: ['5ème A'], trimester: 2, scheduledDate: now - day * 2,
    duration: 55, coefficient: 1, maxScore: 20, status: 'graded',
    instructions: 'Sans calculatrice.',
    submittedAt: now - day * 8, approvedBy: 'M. Kourouma',
    grades: [
      { studentName: 'Sofia Mancini',  score: 18 }, { studentName: 'Paul Girard',    score: 14 },
      { studentName: 'Lisa Chen',       score: 16 }, { studentName: 'Noah Bernard',   score: 11 },
      { studentName: 'Jade Martin',     score: 9  }, { studentName: 'Emma Wilson',    score: 15 },
    ],
    avgScore: 13.8,
  },
  {
    id: 'a5', type: 'class', title: 'Rédaction — Mon lieu préféré',
    subjectName: 'Français', teacherName: 'Sophie Moreau',
    classNames: ['6ème A'], trimester: 2, scheduledDate: now - day * 5,
    duration: 55, coefficient: 1, maxScore: 20, status: 'grading',
    instructions: 'Texte de 200 mots minimum. Soignez l\'orthographe.',
    submittedAt: now - day * 12, approvedBy: 'M. Kourouma',
    grades: [
      { studentName: 'Amina Diallo',   score: 8  }, { studentName: 'Chloé Fontaine', score: null },
      { studentName: 'Lucas Martin',   score: 13 }, { studentName: 'Marie Dubois',   score: null },
    ],
    avgScore: undefined,
  },
  {
    id: 'a6', type: 'class', title: 'Contrôle — Les fleuves de France',
    subjectName: 'Histoire-Géo', teacherName: 'Marc Dupont',
    classNames: ['4ème A'], trimester: 2, scheduledDate: now + day * 3,
    duration: 55, coefficient: 1, maxScore: 20, status: 'draft',
    instructions: 'Carte muette à compléter + questions de cours.',
    grades: [],
  },
  {
    id: 'a7', type: 'trimester_exam', title: 'Examen Trimestriel T2 — Mathématiques',
    subjectName: 'Mathématiques', teacherName: 'Jean Leblanc',
    classNames: ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '3ème A'],
    trimester: 2, scheduledDate: now + day * 20, duration: 180, coefficient: 5, maxScore: 20,
    status: 'approved', instructions: 'Calculatrice autorisée. Toutes les questions doivent être répondues.',
    submittedAt: now - day * 10, approvedBy: 'M. Kourouma', grades: [],
  },
  {
    id: 'a8', type: 'trimester_exam', title: 'Examen Trimestriel T2 — Français',
    subjectName: 'Français', teacherName: 'Sophie Moreau',
    classNames: ['6ème A', '6ème B', '5ème A', '3ème A'],
    trimester: 2, scheduledDate: now + day * 22, duration: 180, coefficient: 5, maxScore: 20,
    status: 'submitted', instructions: 'Dictée (6pts) + Commentaire de texte (14pts).',
    submittedAt: now - day * 1, grades: [],
  },
  {
    id: 'a9', type: 'trimester_exam', title: 'Examen Trimestriel T1 — Sciences',
    subjectName: 'Sciences', teacherName: 'Fatima Benali',
    classNames: ['5ème A', '5ème B', '4ème A'],
    trimester: 1, scheduledDate: now - day * 60, duration: 120, coefficient: 4, maxScore: 20,
    status: 'graded', instructions: 'QCM (10pts) + Questions ouvertes (10pts).',
    submittedAt: now - day * 75, approvedBy: 'M. Kourouma',
    grades: [
      { studentName: 'Sofia Mancini',    score: 17 }, { studentName: 'Paul Girard',      score: 12 },
      { studentName: 'Lisa Chen',         score: 15 }, { studentName: 'Marc Petit',       score: 9  },
      { studentName: 'Julie Blanc',       score: 13 }, { studentName: 'Alex Torres',      score: 11 },
    ],
    avgScore: 12.8,
  },
]

// ── Utilitaires ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AssessmentStatus, { label: string; variant: 'gray' | 'warning' | 'primary' | 'success' | 'danger'; icon: React.ReactNode }> = {
  draft:     { label: 'Brouillon',  variant: 'gray',    icon: <FileText size={11} /> },
  submitted: { label: 'En attente', variant: 'warning',  icon: <Clock size={11} /> },
  approved:  { label: 'Approuvé',   variant: 'primary',  icon: <CheckCircle2 size={11} /> },
  rejected:  { label: 'Refusé',     variant: 'danger',   icon: <XCircle size={11} /> },
  grading:   { label: 'Notation…',  variant: 'warning',  icon: <BookOpen size={11} /> },
  graded:    { label: 'Noté',       variant: 'success',  icon: <Award size={11} /> },
}

const TYPE_LABEL: Record<AssessmentType, string> = {
  departmental:  'Départemental',
  class:         'De classe',
  trimester_exam:'Examen trim.',
}

function durationLabel(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`
}

function ScorePill({ score }: { score?: number }) {
  if (score == null) return <span className="text-gray-300 text-sm">—</span>
  return (
    <span className={cn('text-sm font-bold',
      score >= 14 ? 'text-success-600' : score >= 10 ? 'text-warning-600' : 'text-danger-600'
    )}>{score.toFixed(1)}/20</span>
  )
}

// ── Détail / Modal inline ─────────────────────────────────────────────────────

function AssessmentDetail({ item, onClose, onApprove, onReject, onGradeSave }: {
  item: Assessment
  onClose: () => void
  onApprove: (id: string) => void
  onReject:  (id: string, reason: string) => void
  onGradeSave: (id: string, grades: Grade[]) => void
}) {
  const [rejectMode, setRejectMode] = useState(false)
  const [reason, setReason]         = useState(item.rejectionReason ?? '')
  const [grades, setGrades]         = useState<Grade[]>(
    item.grades.length ? item.grades : []
  )

  const cfg = STATUS_CONFIG[item.status]
  const canApprove  = item.status === 'submitted'
  const canGrade    = item.status === 'approved' || item.status === 'grading'
  const isGraded    = item.status === 'graded'
  const gradedCount = grades.filter(g => g.score != null).length
  const avg = gradedCount ? +(grades.filter(g => g.score != null).reduce((s, g) => s + (g.score ?? 0), 0) / gradedCount).toFixed(1) : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant={cfg.variant} size="sm">{cfg.icon}<span className="ml-1">{cfg.label}</span></Badge>
                <Badge variant="gray" size="sm">{TYPE_LABEL[item.type]}</Badge>
                <Badge variant="gray" size="sm">T{item.trimester}</Badge>
                <Badge variant="gray" size="sm">Coeff. {item.coefficient}</Badge>
              </div>
              <h2 className="text-lg font-bold text-gray-900">{item.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {item.subjectName} · {item.teacherName} · {item.classNames.join(', ')}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1">
              <XCircle size={20} />
            </button>
          </div>

          {/* Meta row */}
          <div className="flex gap-4 mt-3 text-sm text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><Clock size={13} /> {durationLabel(item.duration)}</span>
            <span className="flex items-center gap-1"><FileText size={13} /> {item.maxScore} pts max</span>
            <span className="flex items-center gap-1">📅 {formatDate(item.scheduledDate)}</span>
            {item.classNames.length > 1 && <span className="flex items-center gap-1"><Users size={13} /> {item.classNames.length} classes</span>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Instructions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Instructions</h3>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{item.instructions}</p>
          </div>

          {/* Rejection reason (if rejected) */}
          {item.status === 'rejected' && item.rejectionReason && (
            <div className="p-3 rounded-xl bg-danger-50 border border-danger-100">
              <p className="text-sm font-semibold text-danger-800 mb-1">Motif de refus</p>
              <p className="text-sm text-danger-700">{item.rejectionReason}</p>
            </div>
          )}

          {/* Approval info */}
          {item.approvedBy && (
            <div className="flex items-center gap-2 text-sm text-success-700 bg-success-50 rounded-xl p-3 border border-success-100">
              <CheckCircle2 size={14} className="flex-shrink-0" />
              Approuvé par <strong>{item.approvedBy}</strong>
              {item.submittedAt && <span className="text-success-500">· {formatDate(item.submittedAt)}</span>}
            </div>
          )}

          {/* Reject form */}
          {rejectMode && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Motif du refus</label>
              <textarea
                className="input text-sm w-full resize-none py-2.5"
                rows={3}
                placeholder="Expliquez pourquoi ce sujet est refusé…"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setRejectMode(false)}>Annuler</Button>
                <Button variant="danger" size="sm" disabled={!reason.trim()}
                  onClick={() => { onReject(item.id, reason); onClose() }}>
                  Confirmer le refus
                </Button>
              </div>
            </div>
          )}

          {/* Grades table */}
          {(canGrade || isGraded) && item.grades.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Notes</h3>
                {avg != null && (
                  <span className={cn('text-sm font-bold', avg >= 14 ? 'text-success-600' : avg >= 10 ? 'text-warning-600' : 'text-danger-600')}>
                    Moy. {avg}/20 ({gradedCount}/{grades.length} noté{gradedCount > 1 ? 's' : ''})
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Élève</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase">Note /20</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {grades.map((g, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-gray-700">{g.studentName}</td>
                        <td className="px-4 py-2.5 text-right">
                          {canGrade && !isGraded ? (
                            <input
                              type="number" min={0} max={item.maxScore} step={0.5}
                              value={g.score ?? ''}
                              onChange={e => {
                                const v = e.target.value === '' ? null : +e.target.value
                                setGrades(prev => prev.map((x, j) => j === i ? { ...x, score: v } : x))
                              }}
                              className="w-16 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                              placeholder="—"
                            />
                          ) : (
                            <ScorePill score={g.score ?? undefined} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {canGrade && (
                <div className="mt-2 flex justify-end">
                  <Button variant="primary" size="sm" onClick={() => onGradeSave(item.id, grades)}>
                    Enregistrer les notes
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(canApprove || canGrade) && !rejectMode && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
            {canApprove && (
              <>
                <Button variant="danger" size="sm" onClick={() => setRejectMode(true)} leftIcon={<XCircle size={14} />}>
                  Refuser
                </Button>
                <Button variant="success" size="sm" onClick={() => { onApprove(item.id); onClose() }} leftIcon={<CheckCircle2 size={14} />}>
                  Approuver le sujet
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Carte d'assessment ────────────────────────────────────────────────────────

function AssessmentCard({ item, onClick }: { item: Assessment; onClick: () => void }) {
  const cfg = STATUS_CONFIG[item.status]
  const isUpcoming = item.scheduledDate > now
  const daysUntil  = Math.ceil((item.scheduledDate - now) / day)

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-primary-200 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
            <Badge variant="gray" size="sm">Coeff. {item.coefficient}</Badge>
          </div>
          <h3 className="text-sm font-bold text-gray-900 leading-snug">{item.title}</h3>
        </div>
        <Eye size={15} className="text-gray-300 flex-shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 flex-wrap">
        <span className="font-medium text-gray-700">{item.subjectName}</span>
        <span>·</span>
        <Avatar name={item.teacherName} size="xs" />
        <span>{item.teacherName}</span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex gap-3 text-gray-400">
          <span><Clock size={11} className="inline mr-0.5" />{durationLabel(item.duration)}</span>
          <span><Users size={11} className="inline mr-0.5" />{item.classNames.join(', ')}</span>
        </div>
        <div className="flex items-center gap-2">
          {item.avgScore != null && <ScorePill score={item.avgScore} />}
          {isUpcoming ? (
            <span className={cn('font-medium', daysUntil <= 3 ? 'text-danger-600' : 'text-gray-400')}>
              J{daysUntil > 0 ? `-${daysUntil}` : '+0'}
            </span>
          ) : (
            <span className="text-gray-300">{formatDate(item.scheduledDate)}</span>
          )}
        </div>
      </div>

      {/* Rejection warning */}
      {item.status === 'rejected' && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-danger-600 bg-danger-50 rounded-lg px-2 py-1.5">
          <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
          <span className="line-clamp-1">{item.rejectionReason}</span>
        </div>
      )}
    </div>
  )
}

// ── Onglet Moyennes ───────────────────────────────────────────────────────────

function AveragesTab({ items }: { items: Assessment[] }) {
  const graded = items.filter(a => a.status === 'graded' && a.avgScore != null)

  const byClass = useMemo(() => {
    const map: Record<string, { class: string; assessments: { title: string; avg: number; coeff: number; type: AssessmentType }[] }> = {}
    graded.forEach(a => {
      a.classNames.forEach(cn => {
        if (!map[cn]) map[cn] = { class: cn, assessments: [] }
        map[cn].assessments.push({ title: a.title, avg: a.avgScore!, coeff: a.coefficient, type: a.type })
      })
    })
    return Object.values(map).map(c => {
      const totalCoeff = c.assessments.reduce((s, a) => s + a.coeff, 0)
      const weighted   = c.assessments.reduce((s, a) => s + a.avg * a.coeff, 0)
      return { ...c, generalAvg: totalCoeff > 0 ? +(weighted / totalCoeff).toFixed(2) : null }
    })
  }, [graded])

  if (byClass.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <BarChart2 size={36} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium text-gray-600">Aucune note enregistrée</p>
        <p className="text-sm">Les moyennes apparaîtront ici une fois les copies corrigées.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {byClass.map(c => (
        <div key={c.class} className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">{c.class}</h3>
            {c.generalAvg != null && (
              <div className="text-right">
                <p className={cn('text-xl font-bold', c.generalAvg >= 14 ? 'text-success-600' : c.generalAvg >= 10 ? 'text-warning-600' : 'text-danger-600')}>
                  {c.generalAvg}/20
                </p>
                <p className="text-xs text-gray-400">Moyenne pondérée</p>
              </div>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase">Évaluation</th>
                <th className="pb-2 text-center text-xs font-semibold text-gray-400 uppercase">Type</th>
                <th className="pb-2 text-center text-xs font-semibold text-gray-400 uppercase">Coeff.</th>
                <th className="pb-2 text-right text-xs font-semibold text-gray-400 uppercase">Moyenne</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {c.assessments.map((a, i) => (
                <tr key={i}>
                  <td className="py-2.5 text-gray-700 font-medium">{a.title}</td>
                  <td className="py-2.5 text-center">
                    <Badge variant={a.type === 'trimester_exam' ? 'danger' : a.type === 'departmental' ? 'primary' : 'gray'} size="sm">
                      {TYPE_LABEL[a.type]}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-center text-gray-500">{a.coeff}</td>
                  <td className="py-2.5 text-right"><ScorePill score={a.avg} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

type Tab = 'departmental' | 'class' | 'trimester_exam' | 'averages'

export function AssessmentsPage() {
  const [tab,      setTab]      = useState<Tab>('departmental')
  const [trimester,setTrimester]= useState<Trimester | 'all'>(2)
  const [detail,   setDetail]   = useState<Assessment | null>(null)
  const [items,    setItems]    = useState<Assessment[]>(DEMO)

  // ── Firestore live data ─────────────────────────────────────────────────────
  const { assessments: liveItems, isLive, approve: liveApprove, reject: liveReject, grade: liveGrade } = useLiveAssessments([])

  useEffect(() => {
    if (liveItems.length > 0) setItems(liveItems.map(fromShared))
  }, [liveItems])

  function approve(id: string) {
    setItems(prev => prev.map(a => a.id === id
      ? { ...a, status: 'approved', approvedBy: 'M. Kourouma', approvedAt: now }
      : a))
    liveApprove(id)
  }
  function reject(id: string, reason: string) {
    setItems(prev => prev.map(a => a.id === id
      ? { ...a, status: 'rejected', rejectionReason: reason, rejectedAt: now }
      : a))
    liveReject(id, reason)
  }
  function saveGrades(id: string, grades: Grade[]) {
    const gradedCount = grades.filter(g => g.score != null).length
    const avg = gradedCount ? +(grades.filter(g => g.score != null).reduce((s, g) => s + (g.score ?? 0), 0) / gradedCount).toFixed(1) : undefined
    setItems(prev => prev.map(a => a.id === id
      ? { ...a, grades, avgScore: avg, status: gradedCount === grades.length ? 'graded' : 'grading' }
      : a))
    liveGrade(id, grades.map((g, i) => ({ studentId: `s${i}`, studentName: g.studentName, score: g.score, comment: g.comment })), avg ?? 0)
  }

  const filtered = useMemo(() => {
    return items.filter(a => {
      if (tab !== 'averages' && a.type !== tab) return false
      if (trimester !== 'all' && a.trimester !== trimester) return false
      return true
    })
  }, [items, tab, trimester])

  const kpis = {
    pending:  items.filter(a => a.status === 'submitted').length,
    approved: items.filter(a => a.status === 'approved').length,
    graded:   items.filter(a => a.status === 'graded').length,
    rejected: items.filter(a => a.status === 'rejected').length,
  }

  return (
    <div className="px-8 py-8 max-w-6xl space-y-6">
      <SeedBanner show={!isLive} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Devoirs & Examens</h1>
            <LiveBadge isLive={isLive} />
          </div>
          <p className="text-sm text-gray-400">Gestion des évaluations · Année 2025-2026</p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />}>Planifier une évaluation</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'En attente',  value: kpis.pending,  color: 'text-warning-700',  bg: 'bg-warning-50',  icon: <Clock size={18} className="text-warning-500" /> },
          { label: 'Approuvés',   value: kpis.approved, color: 'text-primary-700',  bg: 'bg-primary-50',  icon: <CheckCircle2 size={18} className="text-primary-500" /> },
          { label: 'Notés',       value: kpis.graded,   color: 'text-success-700',  bg: 'bg-success-50',  icon: <Award size={18} className="text-success-500" /> },
          { label: 'Refusés',     value: kpis.rejected, color: 'text-danger-700',   bg: 'bg-danger-50',   icon: <XCircle size={18} className="text-danger-500" /> },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', k.bg)}>{k.icon}</div>
            <div>
              <p className={cn('text-xl font-bold', k.color)}>{k.value}</p>
              <p className="text-xs text-gray-400">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + trimester filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: 'departmental',  label: 'Départementaux' },
            { key: 'class',         label: 'De classe' },
            { key: 'trimester_exam',label: 'Examens trim.' },
            { key: 'averages',      label: 'Calcul de moyennes' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}>{t.label}</button>
          ))}
        </div>

        {tab !== 'averages' && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            {(['all', 1, 2, 3] as const).map(t => (
              <button key={String(t)} onClick={() => setTrimester(t)}
                className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                  trimester === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}>{t === 'all' ? 'Tous' : `T${t}`}</button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {tab === 'averages' ? (
        <AveragesTab items={items} />
      ) : (
        <>
          {/* Pending approvals banner */}
          {tab !== 'averages' && filtered.filter(a => a.status === 'submitted').length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-warning-50 border border-warning-200 rounded-xl">
              <AlertTriangle size={16} className="text-warning-600 flex-shrink-0" />
              <p className="text-sm text-warning-800">
                <strong>{filtered.filter(a => a.status === 'submitted').length} sujet{filtered.filter(a => a.status === 'submitted').length > 1 ? 's' : ''}</strong> en attente de validation — cliquez pour les examiner.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.length === 0 ? (
              <div className="col-span-3 text-center py-16 text-gray-400">
                <FileText size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-gray-600">Aucune évaluation pour ce filtre</p>
              </div>
            ) : (
              filtered.map(a => (
                <AssessmentCard key={a.id} item={a} onClick={() => setDetail(a)} />
              ))
            )}
          </div>
        </>
      )}

      {detail && (
        <AssessmentDetail
          item={detail}
          onClose={() => setDetail(null)}
          onApprove={approve}
          onReject={reject}
          onGradeSave={saveGrades}
        />
      )}
    </div>
  )
}
