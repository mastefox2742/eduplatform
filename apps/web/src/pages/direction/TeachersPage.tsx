import { useState, useMemo } from 'react'
import {
  Search, Plus, Download, Upload,
  MoreVertical, BookOpen, Users, Star,
  AlertCircle, ChevronUp, ChevronDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { SeedBanner, LiveBadge } from '@/components/ui/SeedBanner'
import { useLiveTeachers } from '@/hooks/useLiveTeachers'
import { cn, formatRelativeDate } from '@/lib/utils'
import { AddTeacherModal } from '@/components/teachers/AddTeacherModal'
import { TeacherDetailPanel } from '@/components/teachers/TeacherDetailPanel'

export interface Teacher {
  id: string
  displayName: string
  teacherNumber: string
  email: string
  phone: string
  subjects: string[]
  classIds: string[]
  classNames: string[]
  studentsCount: number
  coursesPublished: number
  exercisesCreated: number
  avgClassScore: number
  status: 'active' | 'inactive' | 'on_leave'
  lastActivity: number
  createdAt: number
  specialization: string
}

const DEMO_TEACHERS: Teacher[] = [
  {
    id: '1', displayName: 'Jean Leblanc', teacherNumber: 'PROF-2025-0042',
    email: 'j.leblanc@ecole.fr', phone: '+33 6 11 22 33 44',
    subjects: ['Mathématiques', 'Physique'], classIds: ['6a', '5a', '4b'],
    classNames: ['6ème A', '5ème A', '4ème B'], studentsCount: 72,
    coursesPublished: 14, exercisesCreated: 38, avgClassScore: 13.2,
    status: 'active', lastActivity: Date.now() - 3600000, createdAt: Date.now() - 86400000 * 400,
    specialization: 'Algèbre & Géométrie',
  },
  {
    id: '2', displayName: 'Sophie Moreau', teacherNumber: 'PROF-2025-0017',
    email: 's.moreau@ecole.fr', phone: '+33 6 22 33 44 55',
    subjects: ['Français', 'Littérature'], classIds: ['6a', '6b', '5a'],
    classNames: ['6ème A', '6ème B', '5ème A'], studentsCount: 68,
    coursesPublished: 9, exercisesCreated: 27, avgClassScore: 11.8,
    status: 'active', lastActivity: Date.now() - 7200000, createdAt: Date.now() - 86400000 * 550,
    specialization: 'Littérature contemporaine',
  },
  {
    id: '3', displayName: 'Marc Dupont', teacherNumber: 'PROF-2025-0031',
    email: 'm.dupont@ecole.fr', phone: '+33 6 33 44 55 66',
    subjects: ['Histoire', 'Géographie'], classIds: ['4a', '3a', '3b'],
    classNames: ['4ème A', '3ème A', '3ème B'], studentsCount: 65,
    coursesPublished: 7, exercisesCreated: 19, avgClassScore: 12.5,
    status: 'active', lastActivity: Date.now() - 86400000, createdAt: Date.now() - 86400000 * 720,
    specialization: 'Histoire médiévale',
  },
  {
    id: '4', displayName: 'Fatima Benali', teacherNumber: 'PROF-2025-0058',
    email: 'f.benali@ecole.fr', phone: '+33 6 44 55 66 77',
    subjects: ['Sciences', 'SVT'], classIds: ['5b', '4a', '4c'],
    classNames: ['5ème B', '4ème A', '4ème C'], studentsCount: 70,
    coursesPublished: 11, exercisesCreated: 31, avgClassScore: 14.1,
    status: 'active', lastActivity: Date.now() - 1800000, createdAt: Date.now() - 86400000 * 300,
    specialization: 'Biologie cellulaire',
  },
  {
    id: '5', displayName: 'Pierre Guyot', teacherNumber: 'PROF-2025-0009',
    email: 'p.guyot@ecole.fr', phone: '+33 6 55 66 77 88',
    subjects: ['Anglais'], classIds: ['6a', '6b', '5a', '5b'],
    classNames: ['6ème A', '6ème B', '5ème A', '5ème B'], studentsCount: 90,
    coursesPublished: 6, exercisesCreated: 22, avgClassScore: 12.0,
    status: 'on_leave', lastActivity: Date.now() - 86400000 * 8, createdAt: Date.now() - 86400000 * 900,
    specialization: 'Langue & Civilisation',
  },
  {
    id: '6', displayName: 'Amandine Renard', teacherNumber: 'PROF-2025-0073',
    email: 'a.renard@ecole.fr', phone: '+33 6 66 77 88 99',
    subjects: ['EPS', 'Sport'], classIds: ['6a', '6b', '5a', '4a', '3a'],
    classNames: ['6ème A', '6ème B', '5ème A', '4ème A', '3ème A'], studentsCount: 120,
    coursesPublished: 3, exercisesCreated: 8, avgClassScore: 15.6,
    status: 'active', lastActivity: Date.now() - 10800000, createdAt: Date.now() - 86400000 * 200,
    specialization: 'Athlétisme',
  },
  {
    id: '7', displayName: 'Thomas Klein', teacherNumber: 'PROF-2024-0091',
    email: 't.klein@ecole.fr', phone: '+33 6 77 88 99 00',
    subjects: ['Mathématiques'], classIds: ['3a', '3b'],
    classNames: ['3ème A', '3ème B'], studentsCount: 44,
    coursesPublished: 5, exercisesCreated: 14, avgClassScore: 9.8,
    status: 'inactive', lastActivity: Date.now() - 86400000 * 30, createdAt: Date.now() - 86400000 * 1100,
    specialization: 'Analyse & Fonctions',
  },
  {
    id: '8', displayName: 'Isabelle Fontaine', teacherNumber: 'PROF-2025-0064',
    email: 'i.fontaine@ecole.fr', phone: '+33 6 88 99 00 11',
    subjects: ['Arts plastiques', 'Histoire des arts'], classIds: ['6a', '6b', '5a', '5b', '4a'],
    classNames: ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A'], studentsCount: 115,
    coursesPublished: 4, exercisesCreated: 11, avgClassScore: 14.8,
    status: 'active', lastActivity: Date.now() - 5400000, createdAt: Date.now() - 86400000 * 150,
    specialization: 'Art contemporain',
  },
]

type SortKey = 'name' | 'studentsCount' | 'coursesPublished' | 'avgClassScore' | 'lastActivity'

function StatusDot({ status }: { status: Teacher['status'] }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-sm font-medium',
      status === 'active'   ? 'text-success-700' :
      status === 'on_leave' ? 'text-warning-700' : 'text-gray-400'
    )}>
      <span className={cn(
        'w-2 h-2 rounded-full',
        status === 'active'   ? 'bg-success-500' :
        status === 'on_leave' ? 'bg-warning-400' : 'bg-gray-300'
      )} />
      {status === 'active' ? 'Actif' : status === 'on_leave' ? 'En congé' : 'Inactif'}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  if (score === 0) return <span className="text-gray-300 text-sm">—</span>
  return (
    <span className={cn(
      'text-sm font-bold',
      score >= 14 ? 'text-success-600' : score >= 10 ? 'text-warning-600' : 'text-danger-600'
    )}>
      {score.toFixed(1)}<span className="text-gray-300 font-normal text-xs">/20</span>
    </span>
  )
}

function SortHeader({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-600 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className="flex flex-col">
          <ChevronUp   size={10} className={active && dir === 'asc'  ? 'text-primary-600' : 'text-gray-200'} />
          <ChevronDown size={10} className={active && dir === 'desc' ? 'text-primary-600' : 'text-gray-200'} />
        </span>
      </span>
    </th>
  )
}

export function TeachersPage() {
  const [search, setSearch]           = useState('')
  const [subjectFilter, setSubject]   = useState('Tous')
  const [statusFilter, setStatus]     = useState('Tous')
  const [sortKey, setSortKey]         = useState<SortKey>('name')
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected]       = useState<Teacher | null>(null)
  const [showAddModal, setShowAdd]    = useState(false)

  const { teachers, loading, isLive, add: addLive } = useLiveTeachers(DEMO_TEACHERS)

  const allSubjects = useMemo(() => {
    const s = new Set<string>()
    teachers.forEach(t => t.subjects.forEach(sub => s.add(sub)))
    return ['Tous', ...Array.from(s).sort()]
  }, [teachers])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const displayed = useMemo(() => {
    return teachers
      .filter(t => {
        const q = search.toLowerCase()
        if (q && !t.displayName.toLowerCase().includes(q) &&
            !t.teacherNumber.toLowerCase().includes(q) &&
            !t.subjects.some(s => s.toLowerCase().includes(q))) return false
        if (subjectFilter !== 'Tous' && !t.subjects.includes(subjectFilter)) return false
        if (statusFilter === 'Actifs'    && t.status !== 'active')   return false
        if (statusFilter === 'En congé'  && t.status !== 'on_leave') return false
        if (statusFilter === 'Inactifs'  && t.status !== 'inactive') return false
        return true
      })
      .sort((a, b) => {
        let va: number | string, vb: number | string
        switch (sortKey) {
          case 'name':            va = a.displayName;      vb = b.displayName;      break
          case 'studentsCount':   va = a.studentsCount;    vb = b.studentsCount;    break
          case 'coursesPublished':va = a.coursesPublished; vb = b.coursesPublished; break
          case 'avgClassScore':   va = a.avgClassScore;    vb = b.avgClassScore;    break
          case 'lastActivity':    va = a.lastActivity;     vb = b.lastActivity;     break
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ? 1 : -1
        return 0
      })
  }, [teachers, search, subjectFilter, statusFilter, sortKey, sortDir])

  const kpis = useMemo(() => ({
    total:    teachers.length,
    actifs:   teachers.filter(t => t.status === 'active').length,
    onLeave:  teachers.filter(t => t.status === 'on_leave').length,
    avgScore: teachers.length
      ? +(teachers.reduce((s, t) => s + t.avgClassScore, 0) / teachers.length).toFixed(1)
      : 0,
  }), [teachers])

  function handleAdd(t: Teacher) {
    addLive(t)
    setShowAdd(false)
    setSelected(t)
  }

  return (
    <div className="flex h-full">
      <div className={cn('flex-1 flex flex-col min-h-0 transition-all', selected ? 'mr-0' : '')}>

        {/* Header */}
        <div className="px-8 pt-8 pb-0">
          <SeedBanner show={!isLive} />

          <div className="flex items-start justify-between mb-6 mt-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">Gestion des professeurs</h1>
                <LiveBadge isLive={isLive} />
              </div>
              <p className="text-sm text-gray-400">
                {teachers.length} professeurs · Année 2025-2026
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" leftIcon={<Upload size={14} />}>Importer CSV</Button>
              <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>Exporter</Button>
              <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
                Ajouter un prof
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { icon: <Users size={18} className="text-primary-600" />,  label: 'Total',     value: kpis.total,   color: 'text-primary-700',  bg: 'bg-primary-50' },
              { icon: <Star  size={18} className="text-success-600" />,  label: 'Actifs',    value: kpis.actifs,  color: 'text-success-700',  bg: 'bg-success-50' },
              { icon: <AlertCircle size={18} className="text-warning-500" />, label: 'En congé', value: kpis.onLeave, color: 'text-warning-700', bg: 'bg-warning-50' },
              { icon: <BookOpen size={18} className="text-purple-600" />,label: 'Moy. classe', value: `${kpis.avgScore}/20`, color: 'text-purple-700', bg: 'bg-purple-50' },
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
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-52 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9 py-2 text-sm w-full"
                placeholder="Rechercher par nom, matière..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              {['Tous', 'Mathématiques', 'Français', 'Sciences', 'Anglais', 'Histoire'].map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                    subjectFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >{s}</button>
              ))}
            </div>
            <select
              className="input py-2 text-sm"
              value={statusFilter}
              onChange={e => setStatus(e.target.value)}
            >
              {['Tous', 'Actifs', 'En congé', 'Inactifs'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-8 pb-8">
          <p className="text-xs text-gray-400 mb-3">{displayed.length} professeur{displayed.length > 1 ? 's' : ''} affiché{displayed.length > 1 ? 's' : ''}</p>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <SortHeader label="Professeur"   sortKey="name"             current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Matières</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Classes</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                  <SortHeader label="Élèves"        sortKey="studentsCount"    current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Cours"          sortKey="coursesPublished" current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Moy. classe"    sortKey="avgClassScore"    current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortHeader label="Activité"       sortKey="lastActivity"     current={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => setSelected(selected?.id === t.id ? null : t)}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-primary-50/40',
                      selected?.id === t.id && 'bg-primary-50 border-l-2 border-primary-500'
                    )}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={t.displayName} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{t.displayName}</p>
                          <p className="text-xs text-gray-400 font-mono">{t.teacherNumber}</p>
                        </div>
                      </div>
                    </td>
                    {/* Subjects */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.subjects.slice(0, 2).map(s => (
                          <Badge key={s} variant="primary" size="sm">{s}</Badge>
                        ))}
                        {t.subjects.length > 2 && (
                          <Badge variant="gray" size="sm">+{t.subjects.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                    {/* Classes */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.classNames.slice(0, 2).map(c => (
                          <span key={c} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{c}</span>
                        ))}
                        {t.classNames.length > 2 && (
                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-lg">+{t.classNames.length - 2}</span>
                        )}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3"><StatusDot status={t.status} /></td>
                    {/* Students */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-700">{t.studentsCount}</span>
                    </td>
                    {/* Courses */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <BookOpen size={13} className="text-gray-300" />
                        <span className="text-sm text-gray-700">{t.coursesPublished}</span>
                      </div>
                    </td>
                    {/* Avg score */}
                    <td className="px-4 py-3"><ScoreBadge score={t.avgClassScore} /></td>
                    {/* Activity */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">{formatRelativeDate(t.lastActivity)}</span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <button
                        onClick={e => e.stopPropagation()}
                        className="text-gray-300 hover:text-gray-500 transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-400">
                      <Search size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aucun professeur trouvé</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <TeacherDetailPanel teacher={selected} onClose={() => setSelected(null)} />
      )}

      {/* Add modal */}
      {showAddModal && (
        <AddTeacherModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />
      )}
    </div>
  )
}
