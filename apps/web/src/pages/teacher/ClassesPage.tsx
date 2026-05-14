import { useState, useMemo } from 'react'
import {
  Users, TrendingUp, BookOpen, Award, ChevronRight,
  Search, AlertTriangle, CheckCircle2, Clock, X, BarChart2
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatRelativeDate } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClassStudent {
  id: string
  name: string
  studentNumber: string
  avgScore: number
  attendanceRate: number
  exerciseCompletion: number
  lastActivity: number
  alerts: string[]
  status: 'active' | 'inactive'
}

interface MyClass {
  id: string
  name: string
  level: string
  subject: string
  studentsCount: number
  avgScore: number
  attendanceRate: number
  exerciseCompletion: number
  nextSession: string
  students: ClassStudent[]
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const now = Date.now(), day = 86400000

const MY_CLASSES: MyClass[] = [
  {
    id: '5a', name: '5ème A', level: '5ème', subject: 'Mathématiques',
    studentsCount: 26, avgScore: 13.8, attendanceRate: 97, exerciseCompletion: 84,
    nextSession: 'Lundi 08h00 · Salle 12',
    students: [
      { id: 's1', name: 'Sofia Mancini',   studentNumber: 'ELV-2025-1021', avgScore: 16.4, attendanceRate: 100, exerciseCompletion: 95, lastActivity: now - 3600000,   alerts: [],             status: 'active' },
      { id: 's2', name: 'Paul Girard',     studentNumber: 'ELV-2025-1022', avgScore: 12.1, attendanceRate: 96,  exerciseCompletion: 78, lastActivity: now - 86400000,  alerts: [],             status: 'active' },
      { id: 's3', name: 'Lisa Chen',       studentNumber: 'ELV-2025-1023', avgScore: 14.8, attendanceRate: 98,  exerciseCompletion: 88, lastActivity: now - 7200000,   alerts: [],             status: 'active' },
      { id: 's4', name: 'Noah Bernard',    studentNumber: 'ELV-2025-1024', avgScore: 11.2, attendanceRate: 91,  exerciseCompletion: 65, lastActivity: now - 172800000, alerts: [],             status: 'active' },
      { id: 's5', name: 'Jade Martin',     studentNumber: 'ELV-2025-1025', avgScore: 9.0,  attendanceRate: 88,  exerciseCompletion: 52, lastActivity: now - 259200000, alerts: ['score_faible'], status: 'active' },
      { id: 's6', name: 'Emma Wilson',     studentNumber: 'ELV-2025-1026', avgScore: 15.1, attendanceRate: 100, exerciseCompletion: 91, lastActivity: now - 1800000,   alerts: [],             status: 'active' },
      { id: 's7', name: 'Ryan Dupont',     studentNumber: 'ELV-2025-1027', avgScore: 10.2, attendanceRate: 82,  exerciseCompletion: 60, lastActivity: now - day * 4,   alerts: ['absent_3j'],   status: 'active' },
      { id: 's8', name: 'Léa Rousseau',    studentNumber: 'ELV-2025-1028', avgScore: 13.5, attendanceRate: 95,  exerciseCompletion: 80, lastActivity: now - 43200000,  alerts: [],             status: 'active' },
    ],
  },
  {
    id: '5b', name: '5ème B', level: '5ème', subject: 'Mathématiques',
    studentsCount: 25, avgScore: 11.4, attendanceRate: 91, exerciseCompletion: 72,
    nextSession: 'Lundi 10h00 · Salle 14',
    students: [
      { id: 's9',  name: 'Marc Petit',     studentNumber: 'ELV-2025-2011', avgScore: 9.6,  attendanceRate: 86,  exerciseCompletion: 55, lastActivity: now - day * 2,   alerts: ['score_faible'], status: 'active' },
      { id: 's10', name: 'Julie Blanc',    studentNumber: 'ELV-2025-2012', avgScore: 13.2, attendanceRate: 95,  exerciseCompletion: 79, lastActivity: now - 86400000,  alerts: [],             status: 'active' },
      { id: 's11', name: 'Alex Torres',    studentNumber: 'ELV-2025-2013', avgScore: 11.8, attendanceRate: 92,  exerciseCompletion: 73, lastActivity: now - 50000000,  alerts: [],             status: 'active' },
      { id: 's12', name: 'Inès Moreau',    studentNumber: 'ELV-2025-2014', avgScore: 14.5, attendanceRate: 98,  exerciseCompletion: 88, lastActivity: now - 3600000,   alerts: [],             status: 'active' },
      { id: 's13', name: 'Théo Lambert',   studentNumber: 'ELV-2025-2015', avgScore: 8.2,  attendanceRate: 79,  exerciseCompletion: 40, lastActivity: now - day * 6,   alerts: ['score_faible', 'absent_3j'], status: 'active' },
    ],
  },
  {
    id: '6a', name: '6ème A', level: '6ème', subject: 'Mathématiques',
    studentsCount: 24, avgScore: 13.2, attendanceRate: 94, exerciseCompletion: 78,
    nextSession: 'Mardi 09h00 · Salle 12',
    students: [
      { id: 's14', name: 'Amina Diallo',   studentNumber: 'ELV-2025-0101', avgScore: 9.2,  attendanceRate: 79,  exerciseCompletion: 44, lastActivity: now - day * 2,   alerts: ['score_faible'], status: 'active' },
      { id: 's15', name: 'Chloé Fontaine', studentNumber: 'ELV-2025-0139', avgScore: 12.3, attendanceRate: 84,  exerciseCompletion: 68, lastActivity: now - day,       alerts: [],             status: 'active' },
      { id: 's16', name: 'Marie Dubois',   studentNumber: 'ELV-2025-0812', avgScore: 15.2, attendanceRate: 97,  exerciseCompletion: 90, lastActivity: now - 7200000,   alerts: [],             status: 'active' },
      { id: 's17', name: 'Noah Bernard',   studentNumber: 'ELV-2025-0456', avgScore: 13.6, attendanceRate: 93,  exerciseCompletion: 78, lastActivity: now - 28800000,  alerts: [],             status: 'active' },
    ],
  },
  {
    id: '4a', name: '4ème A', level: '4ème', subject: 'Physique',
    studentsCount: 23, avgScore: 12.6, attendanceRate: 93, exerciseCompletion: 79,
    nextSession: 'Mardi 13h00 · Labo 1',
    students: [
      { id: 's18', name: 'Emma Wilson',    studentNumber: 'ELV-2025-4001', avgScore: 15.1, attendanceRate: 100, exerciseCompletion: 91, lastActivity: now - 3600000,   alerts: [],             status: 'active' },
      { id: 's19', name: 'Ryan Dupont',    studentNumber: 'ELV-2025-4002', avgScore: 10.2, attendanceRate: 88,  exerciseCompletion: 61, lastActivity: now - day * 3,   alerts: [],             status: 'active' },
      { id: 's20', name: 'Jade Martin',    studentNumber: 'ELV-2025-4003', avgScore: 13.5, attendanceRate: 94,  exerciseCompletion: 80, lastActivity: now - 14400000,  alerts: [],             status: 'active' },
    ],
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function MiniBar({ value, max = 20, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-xs font-semibold">{value}{max === 20 ? '/20' : '%'}</span>
    </div>
  )
}

function ClassCard({ cls, isSelected, onClick }: {
  cls: MyClass; isSelected: boolean; onClick: () => void
}) {
  const alertCount = cls.students.filter(s => s.alerts.length > 0).length

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md',
        isSelected ? 'border-primary-400 shadow-md ring-1 ring-primary-100' : 'border-gray-100 hover:border-primary-200'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{cls.name}</h3>
          <p className="text-sm text-gray-500">{cls.subject}</p>
        </div>
        <div className="flex items-center gap-2">
          {alertCount > 0 && <Badge variant="danger" size="sm">{alertCount} alerte{alertCount > 1 ? 's' : ''}</Badge>}
          <ChevronRight size={16} className={cn('transition-transform', isSelected ? 'text-primary-500 rotate-90' : 'text-gray-300')} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="bg-gray-50 rounded-xl p-2">
          <p className="font-bold text-gray-800">{cls.studentsCount}</p>
          <p className="text-xs text-gray-400">élèves</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2">
          <p className={cn('font-bold', cls.avgScore >= 14 ? 'text-success-600' : cls.avgScore >= 10 ? 'text-warning-600' : 'text-danger-600')}>
            {cls.avgScore}
          </p>
          <p className="text-xs text-gray-400">moyenne</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2">
          <p className={cn('font-bold', cls.exerciseCompletion >= 80 ? 'text-success-600' : cls.exerciseCompletion >= 60 ? 'text-warning-600' : 'text-danger-600')}>
            {cls.exerciseCompletion}%
          </p>
          <p className="text-xs text-gray-400">exercices</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 pt-3 border-t border-gray-50">
        <Clock size={11} />
        <span>{cls.nextSession}</span>
      </div>
    </div>
  )
}

function StudentDetailPanel({ cls, onClose }: { cls: MyClass; onClose: () => void }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() =>
    cls.students.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase())),
    [cls.students, search]
  )

  const alerts = cls.students.filter(s => s.alerts.length > 0)

  return (
    <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{cls.name} · {cls.subject}</h2>
            <p className="text-sm text-gray-400">{cls.studentsCount} élèves · {cls.nextSession}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" leftIcon={<BarChart2 size={14} />}>Statistiques</Button>
            <Button variant="primary"   size="sm" leftIcon={<BookOpen size={14} />}>Créer un cours</Button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 ml-1"><X size={18} /></button>
          </div>
        </div>

        {/* Class KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Moyenne', value: `${cls.avgScore}/20`, color: cls.avgScore >= 14 ? 'text-success-600' : cls.avgScore >= 10 ? 'text-warning-600' : 'text-danger-600' },
            { label: 'Assiduité', value: `${cls.attendanceRate}%`, color: cls.attendanceRate >= 95 ? 'text-success-600' : 'text-warning-600' },
            { label: 'Exercices', value: `${cls.exerciseCompletion}%`, color: 'text-primary-600' },
            { label: 'Alertes', value: alerts.length, color: alerts.length > 0 ? 'text-danger-600' : 'text-gray-400' },
          ].map(k => (
            <div key={k.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className={cn('text-lg font-bold', k.color)}>{k.value}</p>
              <p className="text-xs text-gray-400">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="p-3 rounded-xl bg-danger-50 border border-danger-100 space-y-1.5">
            <p className="text-xs font-semibold text-danger-800 flex items-center gap-1.5">
              <AlertTriangle size={12} /> {alerts.length} élève{alerts.length > 1 ? 's' : ''} à surveiller
            </p>
            {alerts.map(s => (
              <div key={s.id} className="flex items-center gap-2 text-xs text-danger-700">
                <span className="font-medium">{s.name}</span>
                <span>·</span>
                {s.alerts.includes('score_faible') && <span>Moy. faible ({s.avgScore}/20)</span>}
                {s.alerts.includes('absent_3j')   && <span>Absent(e) depuis 3+ jours</span>}
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative mt-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 py-2 text-sm w-full" placeholder="Rechercher un élève…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Student list */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Élève</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Moyenne</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Assiduité</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Exercices</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Activité</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(s => (
              <tr key={s.id} className={cn('hover:bg-gray-50/50 transition-colors',
                s.alerts.length > 0 && 'bg-danger-50/20'
              )}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.name} size="sm" />
                    <div>
                      <p className="font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.studentNumber}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <MiniBar
                    value={s.avgScore} max={20}
                    color={s.avgScore >= 14 ? 'bg-success-500' : s.avgScore >= 10 ? 'bg-warning-400' : 'bg-danger-500'}
                  />
                </td>
                <td className="px-4 py-3">
                  <MiniBar value={s.attendanceRate} max={100}
                    color={s.attendanceRate >= 90 ? 'bg-success-500' : 'bg-warning-400'} />
                </td>
                <td className="px-4 py-3">
                  <MiniBar value={s.exerciseCompletion} max={100} color="bg-primary-400" />
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">{formatRelativeDate(s.lastActivity)}</td>
                <td className="px-4 py-3">
                  {s.alerts.includes('score_faible') && <Badge variant="danger" size="sm">Moy. faible</Badge>}
                  {s.alerts.includes('absent_3j')   && <Badge variant="warning" size="sm">Absent</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TeacherClassesPage() {
  const [selected, setSelected] = useState<MyClass | null>(MY_CLASSES[0])

  const totalStudents = MY_CLASSES.reduce((s, c) => s + c.studentsCount, 0)
  const totalAlerts   = MY_CLASSES.reduce((s, c) => s + c.students.filter(st => st.alerts.length > 0).length, 0)
  const globalAvg     = +(MY_CLASSES.reduce((s, c) => s + c.avgScore, 0) / MY_CLASSES.length).toFixed(1)

  return (
    <div className="flex flex-col h-full px-8 py-8 gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes classes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {MY_CLASSES.length} classes · {totalStudents} élèves · Moy. {globalAvg}/20
            {totalAlerts > 0 && <span className="text-danger-600 ml-2">· {totalAlerts} alerte{totalAlerts > 1 ? 's' : ''}</span>}
          </p>
        </div>
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* Class list */}
        <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto">
          {MY_CLASSES.map(cls => (
            <ClassCard
              key={cls.id}
              cls={cls}
              isSelected={selected?.id === cls.id}
              onClick={() => setSelected(selected?.id === cls.id ? null : cls)}
            />
          ))}
        </div>

        {/* Detail panel */}
        {selected ? (
          <StudentDetailPanel cls={selected} onClose={() => setSelected(null)} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-300">
            <div className="text-center">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-400">Sélectionnez une classe</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
