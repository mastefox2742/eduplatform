import {
  X, Mail, Phone, School, Calendar, TrendingUp,
  BookOpen, CheckCircle2, XCircle, MessageSquare,
  AlertTriangle, ExternalLink, Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatDate, formatRelativeDate } from '@/lib/utils'
import type { Student } from '@/pages/direction/StudentsPage'

// Données de démo pour le panneau détail
const DEMO_GRADES = [
  { subject: 'Mathématiques', t1: 14.5, t2: 15.2, t3: null,  coeff: 4 },
  { subject: 'Français',      t1: 12.0, t2: 11.5, t3: null,  coeff: 4 },
  { subject: 'Histoire-Géo',  t1: 13.5, t2: 14.0, t3: null,  coeff: 3 },
  { subject: 'Sciences',      t1: 16.0, t2: 15.5, t3: null,  coeff: 3 },
  { subject: 'Anglais',       t1: 11.5, t2: 12.0, t3: null,  coeff: 3 },
  { subject: 'Sport',         t1: 17.0, t2: 16.5, t3: null,  coeff: 2 },
]

const DEMO_RECENT_EXERCISES = [
  { title: 'Fractions — Simplification',  score: 18, max: 20, date: Date.now() - 86400000,  status: 'completed' },
  { title: 'Conjugaison — Passé composé', score: 14, max: 20, date: Date.now() - 172800000, status: 'completed' },
  { title: 'Géographie — Les fleuves',    score: null,max: 20, date: Date.now() - 259200000, status: 'in_progress' },
  { title: 'Algèbre — Équations 1er dg.', score: 16, max: 20, date: Date.now() - 345600000, status: 'completed' },
]

interface StudentDetailPanelProps {
  student: Student
  onClose: () => void
}

function GradeBar({ value, max = 20 }: { value: number | null; max?: number }) {
  if (value === null) return <span className="text-xs text-gray-300">—</span>
  const pct = (value / max) * 100
  const color = value >= 14 ? 'bg-success-500' : value >= 10 ? 'bg-warning-500' : 'bg-danger-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-xs font-semibold',
        value >= 14 ? 'text-success-700' : value >= 10 ? 'text-warning-700' : 'text-danger-700'
      )}>{value}/20</span>
    </div>
  )
}

export function StudentDetailPanel({ student, onClose }: StudentDetailPanelProps) {
  const completionPct = student.totalExercises > 0
    ? Math.round((student.completedExercises / student.totalExercises) * 100)
    : 0

  const avgT2 = DEMO_GRADES.reduce((s, g) => {
    if (g.t2 === null) return s
    return s + g.t2
  }, 0) / DEMO_GRADES.filter(g => g.t2 !== null).length

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-2xl border-l border-gray-100 flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-start gap-4 px-6 py-5 border-b border-gray-100">
        <Avatar name={student.displayName} size="lg" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">{student.displayName}</h2>
          <p className="text-sm text-gray-500">{student.className} · {student.levelName}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {student.studentNumber}
            </span>
            {student.status === 'active' ? (
              <Badge variant="success">Actif</Badge>
            ) : student.status === 'suspended' ? (
              <Badge variant="danger">Suspendu</Badge>
            ) : (
              <Badge variant="gray">Inactif</Badge>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
          <X size={20} />
        </button>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto">

        {/* Alertes */}
        {student.alerts.length > 0 && (
          <div className="mx-5 mt-5 p-4 rounded-2xl bg-danger-50 border border-danger-100 space-y-2">
            <p className="text-sm font-semibold text-danger-800 flex items-center gap-2">
              <AlertTriangle size={15} /> Points d'attention
            </p>
            {student.alerts.includes('absent_3j') && (
              <p className="text-sm text-danger-700">• Absent depuis 3 jours ou plus — contacter les parents</p>
            )}
            {student.alerts.includes('score_faible') && (
              <p className="text-sm text-danger-700">• Moyenne inférieure à 10 — suivi pédagogique recommandé</p>
            )}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 px-5 mt-5">
          {[
            {
              label: 'Moyenne',
              value: student.avgScore > 0 ? `${student.avgScore}/20` : '—',
              color: student.avgScore >= 14 ? 'text-success-600' : student.avgScore >= 10 ? 'text-warning-600' : 'text-danger-600',
            },
            {
              label: 'Assiduité',
              value: `${student.attendanceRate}%`,
              color: student.attendanceRate >= 90 ? 'text-success-600' : student.attendanceRate >= 75 ? 'text-warning-600' : 'text-danger-600',
            },
            {
              label: 'Exercices',
              value: `${completionPct}%`,
              color: 'text-primary-600',
            },
          ].map((k) => (
            <div key={k.label} className="bg-gray-50 rounded-2xl p-3 text-center">
              <p className={cn('text-xl font-bold', k.color)}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Infos de contact */}
        <div className="px-5 mt-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Contact</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 truncate">{student.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">Parent : {student.parentEmail}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">Inscrit le {formatDate(student.createdAt)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">Dernière activité {formatRelativeDate(student.lastActivity)}</span>
            </div>
          </div>
        </div>

        {/* Notes par matière */}
        <div className="px-5 mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Notes par matière</h3>
            <div className="flex gap-2 text-xs text-gray-400">
              <span>T1</span><span>T2</span>
            </div>
          </div>
          <div className="space-y-2">
            {DEMO_GRADES.map((g) => (
              <div key={g.subject} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-32 truncate flex-shrink-0">{g.subject}</span>
                <div className="flex gap-6 flex-1">
                  <GradeBar value={student.avgScore > 0 ? g.t1 : null} />
                  <GradeBar value={student.avgScore > 0 ? g.t2 : null} />
                </div>
              </div>
            ))}
          </div>

          {student.avgScore > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Moyenne générale T2</span>
              <span className={cn('text-base font-bold',
                avgT2 >= 14 ? 'text-success-600' : avgT2 >= 10 ? 'text-warning-600' : 'text-danger-600'
              )}>{avgT2.toFixed(1)}/20</span>
            </div>
          )}
        </div>

        {/* Exercices récents */}
        <div className="px-5 mt-6 space-y-3 pb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Exercices récents</h3>
          {student.avgScore > 0 ? (
            <div className="space-y-2">
              {DEMO_RECENT_EXERCISES.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                    ex.status === 'completed' ? 'bg-success-100' : 'bg-primary-100'
                  )}>
                    {ex.status === 'completed'
                      ? <CheckCircle2 size={15} className="text-success-600" />
                      : <BookOpen size={15} className="text-primary-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ex.title}</p>
                    <p className="text-xs text-gray-400">{formatRelativeDate(ex.date)}</p>
                  </div>
                  {ex.score !== null ? (
                    <span className={cn('text-sm font-bold flex-shrink-0',
                      ex.score >= 14 ? 'text-success-600' : ex.score >= 10 ? 'text-warning-600' : 'text-danger-600'
                    )}>{ex.score}/{ex.max}</span>
                  ) : (
                    <Badge variant="primary">En cours</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun exercice encore complété</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" leftIcon={<MessageSquare size={14} />}>
          Contacter le parent
        </Button>
        <Button variant="primary" size="sm" className="flex-1" leftIcon={<TrendingUp size={14} />}>
          Voir progression
        </Button>
      </div>
    </div>
  )
}
