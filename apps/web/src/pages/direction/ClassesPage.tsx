import { useState, useMemo } from 'react'
import {
  Users, BookOpen, TrendingUp, ChevronRight,
  Search, Plus, X, GraduationCap, Award,
  BarChart2, UserCheck, AlertTriangle
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

interface SchoolClass {
  id: string
  name: string
  level: string
  mainTeacher: string
  teacherSubject: string
  studentsCount: number
  maxStudents: number
  avgScore: number
  attendanceRate: number
  exerciseCompletion: number
  alertCount: number
  subjects: { name: string; teacher: string; avgScore: number }[]
  students: { name: string; avgScore: number; status: 'active' | 'inactive' | 'suspended' }[]
}

const DEMO_CLASSES: SchoolClass[] = [
  {
    id: '6a', name: '6ème A', level: '6ème',
    mainTeacher: 'Sophie Moreau', teacherSubject: 'Français',
    studentsCount: 24, maxStudents: 30, avgScore: 13.2, attendanceRate: 94, exerciseCompletion: 78, alertCount: 1,
    subjects: [
      { name: 'Mathématiques', teacher: 'Jean Leblanc',     avgScore: 14.1 },
      { name: 'Français',      teacher: 'Sophie Moreau',    avgScore: 12.5 },
      { name: 'Anglais',       teacher: 'Pierre Guyot',     avgScore: 13.0 },
      { name: 'Histoire-Géo',  teacher: 'Marc Dupont',      avgScore: 13.5 },
      { name: 'Sciences',      teacher: 'Fatima Benali',    avgScore: 14.8 },
      { name: 'EPS',           teacher: 'Amandine Renard',  avgScore: 16.2 },
    ],
    students: [
      { name: 'Amina Diallo',       avgScore: 9.2,  status: 'active' },
      { name: 'Chloé Fontaine',     avgScore: 12.3, status: 'active' },
      { name: 'Lucas Martin',       avgScore: 11.8, status: 'active' },
      { name: 'Marie Dubois',       avgScore: 15.2, status: 'active' },
      { name: 'Noah Bernard',       avgScore: 13.6, status: 'active' },
    ],
  },
  {
    id: '6b', name: '6ème B', level: '6ème',
    mainTeacher: 'Sophie Moreau', teacherSubject: 'Français',
    studentsCount: 22, maxStudents: 30, avgScore: 12.1, attendanceRate: 88, exerciseCompletion: 65, alertCount: 3,
    subjects: [
      { name: 'Mathématiques', teacher: 'Jean Leblanc',     avgScore: 11.8 },
      { name: 'Français',      teacher: 'Sophie Moreau',    avgScore: 12.0 },
      { name: 'Anglais',       teacher: 'Pierre Guyot',     avgScore: 11.5 },
      { name: 'Sciences',      teacher: 'Fatima Benali',    avgScore: 13.2 },
      { name: 'EPS',           teacher: 'Amandine Renard',  avgScore: 15.8 },
    ],
    students: [
      { name: 'Ibrahim Coulibaly', avgScore: 10.5, status: 'active' },
      { name: 'Fatou Sow',         avgScore: 13.6, status: 'active' },
      { name: 'Kwamé Asante',      avgScore: 8.4,  status: 'active' },
    ],
  },
  {
    id: '5a', name: '5ème A', level: '5ème',
    mainTeacher: 'Jean Leblanc', teacherSubject: 'Mathématiques',
    studentsCount: 26, maxStudents: 30, avgScore: 13.8, attendanceRate: 97, exerciseCompletion: 84, alertCount: 0,
    subjects: [
      { name: 'Mathématiques', teacher: 'Jean Leblanc',     avgScore: 14.5 },
      { name: 'Français',      teacher: 'Sophie Moreau',    avgScore: 13.2 },
      { name: 'Sciences',      teacher: 'Fatima Benali',    avgScore: 14.9 },
      { name: 'Anglais',       teacher: 'Pierre Guyot',     avgScore: 12.8 },
      { name: 'EPS',           teacher: 'Amandine Renard',  avgScore: 16.0 },
    ],
    students: [
      { name: 'Sofia Mancini',   avgScore: 16.4, status: 'active' },
      { name: 'Paul Girard',     avgScore: 12.1, status: 'active' },
      { name: 'Lisa Chen',       avgScore: 14.8, status: 'active' },
    ],
  },
  {
    id: '5b', name: '5ème B', level: '5ème',
    mainTeacher: 'Fatima Benali', teacherSubject: 'Sciences',
    studentsCount: 25, maxStudents: 30, avgScore: 11.4, attendanceRate: 91, exerciseCompletion: 72, alertCount: 2,
    subjects: [
      { name: 'Mathématiques', teacher: 'Thomas Klein',     avgScore: 10.8 },
      { name: 'Sciences',      teacher: 'Fatima Benali',    avgScore: 13.1 },
      { name: 'Anglais',       teacher: 'Pierre Guyot',     avgScore: 11.2 },
      { name: 'EPS',           teacher: 'Amandine Renard',  avgScore: 15.5 },
    ],
    students: [
      { name: 'Marc Petit',    avgScore: 9.6,  status: 'active' },
      { name: 'Julie Blanc',   avgScore: 13.2, status: 'active' },
      { name: 'Alex Torres',   avgScore: 11.8, status: 'active' },
    ],
  },
  {
    id: '4a', name: '4ème A', level: '4ème',
    mainTeacher: 'Marc Dupont', teacherSubject: 'Histoire-Géo',
    studentsCount: 23, maxStudents: 28, avgScore: 12.6, attendanceRate: 93, exerciseCompletion: 79, alertCount: 1,
    subjects: [
      { name: 'Mathématiques', teacher: 'Jean Leblanc',     avgScore: 13.2 },
      { name: 'Histoire-Géo',  teacher: 'Marc Dupont',      avgScore: 12.8 },
      { name: 'Sciences',      teacher: 'Fatima Benali',    avgScore: 14.1 },
      { name: 'Anglais',       teacher: 'Pierre Guyot',     avgScore: 11.4 },
    ],
    students: [
      { name: 'Emma Wilson',   avgScore: 15.1, status: 'active' },
      { name: 'Ryan Dupont',   avgScore: 10.2, status: 'active' },
      { name: 'Jade Martin',   avgScore: 13.5, status: 'active' },
    ],
  },
  {
    id: '3a', name: '3ème A', level: '3ème',
    mainTeacher: 'Marc Dupont', teacherSubject: 'Histoire-Géo',
    studentsCount: 24, maxStudents: 28, avgScore: 11.9, attendanceRate: 89, exerciseCompletion: 68, alertCount: 2,
    subjects: [
      { name: 'Mathématiques', teacher: 'Thomas Klein',     avgScore: 9.8 },
      { name: 'Histoire-Géo',  teacher: 'Marc Dupont',      avgScore: 12.5 },
      { name: 'Français',      teacher: 'Sophie Moreau',    avgScore: 12.1 },
      { name: 'EPS',           teacher: 'Amandine Renard',  avgScore: 15.9 },
    ],
    students: [
      { name: 'Tom Rousseau',   avgScore: 8.6,  status: 'active' },
      { name: 'Camille Noir',   avgScore: 14.3, status: 'active' },
      { name: 'Alexis Faure',   avgScore: 11.7, status: 'active' },
    ],
  },
]

const LEVELS = ['Tous', '6ème', '5ème', '4ème', '3ème']

function ScoreBar({ score, max = 20, height = 'h-1.5' }: { score: number; max?: number; height?: string }) {
  const pct = (score / max) * 100
  const color = score >= 14 ? 'bg-success-500' : score >= 10 ? 'bg-warning-500' : 'bg-danger-500'
  return (
    <div className={cn('w-full bg-gray-100 rounded-full overflow-hidden', height)}>
      <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

function ClassDetailPanel({ cls, onClose }: { cls: SchoolClass; onClose: () => void }) {
  const fillRate = Math.round((cls.studentsCount / cls.maxStudents) * 100)

  return (
    <div className="w-96 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col h-full sticky top-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 px-6 py-5 border-b border-gray-100">
        <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
          <GraduationCap size={22} className="text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900">{cls.name}</h2>
          <p className="text-sm text-gray-500">Prof. principal · {cls.mainTeacher}</p>
          <p className="text-xs text-gray-400">{cls.teacherSubject}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Alerts */}
        {cls.alertCount > 0 && (
          <div className="mx-5 mt-5 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-danger-50 border border-danger-100">
            <AlertTriangle size={14} className="text-danger-500 flex-shrink-0" />
            <p className="text-sm text-danger-700 font-medium">{cls.alertCount} élève{cls.alertCount > 1 ? 's' : ''} nécessitent un suivi</p>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 px-5 mt-5">
          {[
            { label: 'Élèves',      value: `${cls.studentsCount}/${cls.maxStudents}`, sub: `${fillRate}% remplie`,   color: 'text-primary-600' },
            { label: 'Moy. générale', value: `${cls.avgScore}/20`, sub: cls.avgScore >= 14 ? 'Excellent' : cls.avgScore >= 10 ? 'Correct' : 'À surveiller', color: cls.avgScore >= 14 ? 'text-success-600' : cls.avgScore >= 10 ? 'text-warning-600' : 'text-danger-600' },
            { label: 'Assiduité',   value: `${cls.attendanceRate}%`, sub: cls.attendanceRate >= 95 ? 'Très bonne' : 'Correcte', color: cls.attendanceRate >= 90 ? 'text-success-600' : 'text-warning-600' },
            { label: 'Exercices',   value: `${cls.exerciseCompletion}%`, sub: 'Taux complétion', color: 'text-purple-600' },
          ].map(k => (
            <div key={k.label} className="bg-gray-50 rounded-2xl p-3">
              <p className={cn('text-lg font-bold', k.color)}>{k.value}</p>
              <p className="text-xs font-medium text-gray-500">{k.label}</p>
              <p className="text-xs text-gray-400">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Subjects */}
        <div className="px-5 mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Moyennes par matière</h3>
          <div className="space-y-2.5">
            {cls.subjects.map(s => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{s.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{s.teacher}</span>
                  </div>
                  <span className={cn('text-sm font-bold',
                    s.avgScore >= 14 ? 'text-success-600' : s.avgScore >= 10 ? 'text-warning-600' : 'text-danger-600'
                  )}>{s.avgScore}/20</span>
                </div>
                <ScoreBar score={s.avgScore} />
              </div>
            ))}
          </div>
        </div>

        {/* Students sample */}
        <div className="px-5 mt-6 space-y-3 pb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Élèves ({cls.studentsCount})</h3>
            <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">Voir tous →</button>
          </div>
          <div className="space-y-2">
            {cls.students.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                <Avatar name={s.name} size="sm" />
                <span className="flex-1 text-sm font-medium text-gray-700">{s.name}</span>
                <span className={cn('text-sm font-bold',
                  s.avgScore >= 14 ? 'text-success-600' : s.avgScore >= 10 ? 'text-warning-600' : 'text-danger-600'
                )}>{s.avgScore}/20</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" leftIcon={<Users size={14} />}>
          Gérer les élèves
        </Button>
        <Button variant="primary" size="sm" className="flex-1" leftIcon={<BarChart2 size={14} />}>
          Voir rapports
        </Button>
      </div>
    </div>
  )
}

export function ClassesPage() {
  const [levelFilter, setLevel] = useState('Tous')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<SchoolClass | null>(null)

  const displayed = useMemo(() => DEMO_CLASSES.filter(c => {
    if (levelFilter !== 'Tous' && c.level !== levelFilter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.mainTeacher.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [levelFilter, search])

  const kpis = useMemo(() => ({
    total:   DEMO_CLASSES.length,
    students: DEMO_CLASSES.reduce((s, c) => s + c.studentsCount, 0),
    avgScore: +(DEMO_CLASSES.reduce((s, c) => s + c.avgScore, 0) / DEMO_CLASSES.length).toFixed(1),
    alerts:   DEMO_CLASSES.reduce((s, c) => s + c.alertCount, 0),
  }), [])

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-8 pt-8 pb-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des classes</h1>
              <p className="text-sm text-gray-400 mt-0.5">{DEMO_CLASSES.length} classes · Année 2025-2026</p>
            </div>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />}>Créer une classe</Button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { icon: <BookOpen size={18} className="text-primary-600" />,   label: 'Classes',    value: kpis.total,          color: 'text-primary-700',  bg: 'bg-primary-50' },
              { icon: <Users size={18} className="text-success-600" />,       label: 'Élèves',     value: kpis.students,       color: 'text-success-700',  bg: 'bg-success-50' },
              { icon: <Award size={18} className="text-purple-600" />,        label: 'Moy. gén.',  value: `${kpis.avgScore}/20`, color: 'text-purple-700', bg: 'bg-purple-50' },
              { icon: <AlertTriangle size={18} className="text-danger-500" />,label: 'Alertes',    value: kpis.alerts,         color: 'text-danger-700',   bg: 'bg-danger-50' },
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

          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9 py-2 text-sm w-full" placeholder="Classe, professeur..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {LEVELS.map(l => (
              <button key={l} onClick={() => setLevel(l)}
                className={cn('px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
                  levelFilter === l ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}>{l}</button>
            ))}
          </div>
        </div>

        {/* Cards grid */}
        <div className="flex-1 overflow-auto px-8 pb-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {displayed.map(cls => (
              <div
                key={cls.id}
                onClick={() => setSelected(selected?.id === cls.id ? null : cls)}
                className={cn(
                  'bg-white rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md hover:border-primary-200',
                  selected?.id === cls.id ? 'border-primary-400 shadow-md ring-1 ring-primary-200' : 'border-gray-100'
                )}
              >
                {/* Class header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                      <GraduationCap size={18} className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{cls.name}</h3>
                      <p className="text-xs text-gray-400">{cls.mainTeacher}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {cls.alertCount > 0 && (
                      <Badge variant="danger" size="sm">{cls.alertCount} alerte{cls.alertCount > 1 ? 's' : ''}</Badge>
                    )}
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center">
                    <p className="text-base font-bold text-gray-800">{cls.studentsCount}</p>
                    <p className="text-xs text-gray-400">élèves</p>
                  </div>
                  <div className="text-center">
                    <p className={cn('text-base font-bold',
                      cls.avgScore >= 14 ? 'text-success-600' : cls.avgScore >= 10 ? 'text-warning-600' : 'text-danger-600'
                    )}>{cls.avgScore}</p>
                    <p className="text-xs text-gray-400">moyenne</p>
                  </div>
                  <div className="text-center">
                    <p className={cn('text-base font-bold',
                      cls.attendanceRate >= 95 ? 'text-success-600' : cls.attendanceRate >= 85 ? 'text-warning-600' : 'text-danger-600'
                    )}>{cls.attendanceRate}%</p>
                    <p className="text-xs text-gray-400">assiduité</p>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Remplissage</span>
                    <span>{cls.studentsCount}/{cls.maxStudents}</span>
                  </div>
                  <ScoreBar score={cls.studentsCount} max={cls.maxStudents} height="h-1.5" />
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1 mt-2">
                    <span>Complétion exercices</span>
                    <span>{cls.exerciseCompletion}%</span>
                  </div>
                  <ScoreBar score={cls.exerciseCompletion} max={100} height="h-1.5" />
                </div>

                {/* Subjects mini-badges */}
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-50">
                  {cls.subjects.slice(0, 4).map(s => (
                    <span key={s.name} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">{s.name}</span>
                  ))}
                  {cls.subjects.length > 4 && (
                    <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-lg">+{cls.subjects.length - 4}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected && <ClassDetailPanel cls={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
