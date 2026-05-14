import {
  X, Mail, Phone, BookOpen, Calendar,
  Users, Award, BarChart2, MessageSquare,
  CheckCircle2, Clock, TrendingUp, Star
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatDate, formatRelativeDate } from '@/lib/utils'
import type { Teacher } from '@/pages/direction/TeachersPage'

const DEMO_COURSES = [
  { title: 'Algèbre — Équations du 1er degré', subject: 'Mathématiques', sections: 6, published: true,  completionAvg: 78 },
  { title: 'Géométrie — Triangles & angles',   subject: 'Mathématiques', sections: 5, published: true,  completionAvg: 65 },
  { title: 'Fractions — Opérations de base',   subject: 'Mathématiques', sections: 4, published: true,  completionAvg: 82 },
  { title: 'Physique — La lumière',             subject: 'Physique',      sections: 3, published: false, completionAvg: 0  },
]

const DEMO_EXERCISES = [
  { title: 'QCM — Équations linéaires',   subject: 'Mathématiques', submissions: 24, avgScore: 14.2, date: Date.now() - 86400000 * 2 },
  { title: 'Problème ouvert — Géométrie', subject: 'Mathématiques', submissions: 22, avgScore: 11.8, date: Date.now() - 86400000 * 5 },
  { title: 'Exercice — Fractions',        subject: 'Mathématiques', submissions: 26, avgScore: 16.1, date: Date.now() - 86400000 * 9 },
]

interface TeacherDetailPanelProps {
  teacher: Teacher
  onClose: () => void
}

function ScoreBar({ score, max = 20 }: { score: number; max?: number }) {
  const pct = (score / max) * 100
  const color = score >= 14 ? 'bg-success-500' : score >= 10 ? 'bg-warning-500' : 'bg-danger-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-xs font-semibold w-12 text-right',
        score >= 14 ? 'text-success-700' : score >= 10 ? 'text-warning-700' : 'text-danger-700'
      )}>{score.toFixed(1)}/20</span>
    </div>
  )
}

export function TeacherDetailPanel({ teacher, onClose }: TeacherDetailPanelProps) {
  const completionRate = DEMO_COURSES.filter(c => c.published).length > 0
    ? Math.round(DEMO_COURSES.filter(c => c.published).reduce((s, c) => s + c.completionAvg, 0) / DEMO_COURSES.filter(c => c.published).length)
    : 0

  return (
    <div className="w-96 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col h-full sticky top-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 px-6 py-5 border-b border-gray-100">
        <Avatar name={teacher.displayName} size="lg" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">{teacher.displayName}</h2>
          <p className="text-sm text-gray-500 truncate">
            {teacher.subjects.slice(0, 2).join(', ')}{teacher.subjects.length > 2 ? ` +${teacher.subjects.length - 2}` : ''}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {teacher.teacherNumber}
            </span>
            {teacher.status === 'active' ? (
              <Badge variant="success">Actif</Badge>
            ) : teacher.status === 'on_leave' ? (
              <Badge variant="warning">En congé</Badge>
            ) : (
              <Badge variant="gray">Inactif</Badge>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
          <X size={20} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Specialization */}
        {teacher.specialization && (
          <div className="mx-5 mt-5 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary-50 border border-primary-100">
            <Star size={14} className="text-primary-500 flex-shrink-0" />
            <p className="text-sm text-primary-700 font-medium">{teacher.specialization}</p>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 px-5 mt-5">
          {[
            { label: 'Élèves',   value: teacher.studentsCount,    color: 'text-primary-600' },
            { label: 'Cours',    value: teacher.coursesPublished, color: 'text-success-600' },
            { label: 'Moy. cl.', value: teacher.avgClassScore > 0 ? `${teacher.avgClassScore}/20` : '—', color: teacher.avgClassScore >= 14 ? 'text-success-600' : teacher.avgClassScore >= 10 ? 'text-warning-600' : 'text-danger-600' },
          ].map(k => (
            <div key={k.label} className="bg-gray-50 rounded-2xl p-3 text-center">
              <p className={cn('text-xl font-bold', k.color)}>{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="px-5 mt-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Contact</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 truncate">{teacher.email}</span>
            </div>
            {teacher.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">{teacher.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">Rejoint le {formatDate(teacher.createdAt)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-700">Actif {formatRelativeDate(teacher.lastActivity)}</span>
            </div>
          </div>
        </div>

        {/* Classes */}
        <div className="px-5 mt-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Classes assignées ({teacher.classNames.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {teacher.classNames.length > 0 ? (
              teacher.classNames.map(c => (
                <div key={c} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl">
                  <Users size={12} className="text-gray-400" />
                  <span className="text-sm text-gray-700 font-medium">{c}</span>
                </div>
              ))
            ) : (
              <span className="text-sm text-gray-400">Aucune classe assignée</span>
            )}
          </div>
        </div>

        {/* Courses */}
        <div className="px-5 mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cours publiés</h3>
            <span className="text-xs text-gray-400">Complétion moy. {completionRate}%</span>
          </div>
          {teacher.coursesPublished > 0 ? (
            <div className="space-y-2">
              {DEMO_COURSES.map((course, i) => (
                <div key={i} className={cn(
                  'p-3 rounded-xl border transition-colors cursor-pointer hover:border-primary-200',
                  course.published ? 'bg-white border-gray-100' : 'bg-gray-50 border-dashed border-gray-200'
                )}>
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                      course.published ? 'bg-success-100' : 'bg-gray-100'
                    )}>
                      <BookOpen size={13} className={course.published ? 'text-success-600' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{course.title}</p>
                      <p className="text-xs text-gray-400">{course.sections} sections</p>
                    </div>
                    {course.published ? (
                      <Badge variant="success" size="sm">Publié</Badge>
                    ) : (
                      <Badge variant="gray" size="sm">Brouillon</Badge>
                    )}
                  </div>
                  {course.published && (
                    <div className="mt-2 ml-9">
                      <ScoreBar score={course.completionAvg} max={100} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <BookOpen size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun cours publié</p>
            </div>
          )}
        </div>

        {/* Recent exercises */}
        <div className="px-5 mt-6 space-y-3 pb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Exercices récents</h3>
          {teacher.exercisesCreated > 0 ? (
            <div className="space-y-2">
              {DEMO_EXERCISES.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ex.title}</p>
                    <p className="text-xs text-gray-400">{ex.submissions} élèves · {formatRelativeDate(ex.date)}</p>
                  </div>
                  <span className={cn('text-sm font-bold flex-shrink-0',
                    ex.avgScore >= 14 ? 'text-success-600' : ex.avgScore >= 10 ? 'text-warning-600' : 'text-danger-600'
                  )}>{ex.avgScore.toFixed(1)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <BarChart2 size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucun exercice créé</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" leftIcon={<MessageSquare size={14} />}>
          Contacter
        </Button>
        <Button variant="primary" size="sm" className="flex-1" leftIcon={<TrendingUp size={14} />}>
          Voir activité
        </Button>
      </div>
    </div>
  )
}
