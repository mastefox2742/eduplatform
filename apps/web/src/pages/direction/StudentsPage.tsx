import { useState, useMemo } from 'react'
import {
  Search, Plus, Download, Upload, Filter,
  GraduationCap, ChevronRight, MoreVertical,
  CheckCircle2, XCircle, Clock, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { AddStudentModal } from '@/components/students/AddStudentModal'
import { StudentDetailPanel } from '@/components/students/StudentDetailPanel'
import { SeedBanner, LiveBadge } from '@/components/ui/SeedBanner'
import { useLiveStudents } from '@/hooks/useLiveStudents'
import { cn } from '@/lib/utils'

// ─── Types & données démo ─────────────────────────────────────────────────────

export interface Student {
  id: string
  displayName: string
  studentNumber: string
  email: string
  levelId: string
  levelName: string
  classId: string
  className: string
  parentEmail: string
  avgScore: number
  completedExercises: number
  totalExercises: number
  attendanceRate: number
  status: 'active' | 'inactive' | 'suspended'
  lastActivity: number
  createdAt: number
  alerts: string[]
}

const DEMO_STUDENTS: Student[] = [
  { id: '1', displayName: 'Marie Dubois',      studentNumber: 'ELV-2025-0012', email: 'marie.dubois@ecole.fr',     levelId: 'l6', levelName: '6ème', classId: 'c1', className: '6ème A', parentEmail: 'parent.dubois@gmail.com',    avgScore: 15.2, completedExercises: 42, totalExercises: 50, attendanceRate: 97, status: 'active',   lastActivity: Date.now() - 3600000,   createdAt: Date.now() - 7776000000, alerts: [] },
  { id: '2', displayName: 'Kwamé Asante',      studentNumber: 'ELV-2025-0034', email: 'kwame.asante@ecole.fr',     levelId: 'l5', levelName: '5ème', classId: 'c2', className: '5ème B', parentEmail: 'parent.asante@gmail.com',    avgScore: 8.4,  completedExercises: 18, totalExercises: 45, attendanceRate: 61, status: 'active',   lastActivity: Date.now() - 259200000, createdAt: Date.now() - 7776000000, alerts: ['absent_3j', 'score_faible'] },
  { id: '3', displayName: 'Fatou Sow',          studentNumber: 'ELV-2025-0056', email: 'fatou.sow@ecole.fr',         levelId: 'l4', levelName: '4ème', classId: 'c3', className: '4ème C', parentEmail: 'parent.sow@gmail.com',       avgScore: 13.6, completedExercises: 38, totalExercises: 48, attendanceRate: 91, status: 'active',   lastActivity: Date.now() - 7200000,   createdAt: Date.now() - 6912000000, alerts: [] },
  { id: '4', displayName: 'Lucas Martin',       studentNumber: 'ELV-2025-0078', email: 'lucas.martin@ecole.fr',      levelId: 'l3', levelName: '3ème', classId: 'c4', className: '3ème A', parentEmail: 'parent.martin@gmail.com',    avgScore: 11.8, completedExercises: 30, totalExercises: 52, attendanceRate: 88, status: 'active',   lastActivity: Date.now() - 86400000,  createdAt: Date.now() - 6048000000, alerts: [] },
  { id: '5', displayName: 'Amina Diallo',       studentNumber: 'ELV-2025-0091', email: 'amina.diallo@ecole.fr',      levelId: 'l6', levelName: '6ème', classId: 'c5', className: '6ème B', parentEmail: 'parent.diallo@gmail.com',    avgScore: 9.2,  completedExercises: 22, totalExercises: 50, attendanceRate: 79, status: 'active',   lastActivity: Date.now() - 172800000, createdAt: Date.now() - 7776000000, alerts: ['score_faible'] },
  { id: '6', displayName: 'Théo Lemaire',       studentNumber: 'ELV-2025-0103', email: 'theo.lemaire@ecole.fr',      levelId: 'l5', levelName: '5ème', classId: 'c2', className: '5ème B', parentEmail: 'parent.lemaire@gmail.com',   avgScore: 14.7, completedExercises: 41, totalExercises: 45, attendanceRate: 95, status: 'active',   lastActivity: Date.now() - 3600000,   createdAt: Date.now() - 5184000000, alerts: [] },
  { id: '7', displayName: 'Nadia Benali',       studentNumber: 'ELV-2025-0115', email: 'nadia.benali@ecole.fr',      levelId: 'l4', levelName: '4ème', classId: 'c3', className: '4ème C', parentEmail: 'parent.benali@gmail.com',    avgScore: 16.1, completedExercises: 47, totalExercises: 48, attendanceRate: 99, status: 'active',   lastActivity: Date.now() - 1800000,   createdAt: Date.now() - 6480000000, alerts: [] },
  { id: '8', displayName: 'Samuel Traoré',      studentNumber: 'ELV-2025-0127', email: 'samuel.traore@ecole.fr',     levelId: 'l3', levelName: '3ème', classId: 'c4', className: '3ème A', parentEmail: 'parent.traore@gmail.com',    avgScore: 7.8,  completedExercises: 15, totalExercises: 52, attendanceRate: 55, status: 'suspended',lastActivity: Date.now() - 604800000, createdAt: Date.now() - 5616000000, alerts: ['absent_3j', 'score_faible'] },
  { id: '9', displayName: 'Chloé Fontaine',     studentNumber: 'ELV-2025-0139', email: 'chloe.fontaine@ecole.fr',    levelId: 'l6', levelName: '6ème', classId: 'c1', className: '6ème A', parentEmail: 'parent.fontaine@gmail.com',  avgScore: 12.3, completedExercises: 33, totalExercises: 50, attendanceRate: 84, status: 'active',   lastActivity: Date.now() - 43200000,  createdAt: Date.now() - 7776000000, alerts: [] },
  { id:'10', displayName: 'Ibrahim Coulibaly',  studentNumber: 'ELV-2025-0151', email: 'ibrahim.coulibaly@ecole.fr', levelId: 'l5', levelName: '5ème', classId: 'c6', className: '5ème A', parentEmail: 'parent.coulibaly@gmail.com', avgScore: 10.5, completedExercises: 27, totalExercises: 45, attendanceRate: 82, status: 'active',   lastActivity: Date.now() - 21600000,  createdAt: Date.now() - 4320000000, alerts: [] },
  { id:'11', displayName: 'Zoé Blanchard',      studentNumber: 'ELV-2025-0163', email: 'zoe.blanchard@ecole.fr',     levelId: 'l4', levelName: '4ème', classId: 'c7', className: '4ème A', parentEmail: 'parent.blanchard@gmail.com', avgScore: 17.4, completedExercises: 48, totalExercises: 48, attendanceRate: 100,status: 'active',   lastActivity: Date.now() - 900000,    createdAt: Date.now() - 3888000000, alerts: [] },
  { id:'12', displayName: 'Moussa Konaté',      studentNumber: 'ELV-2025-0175', email: 'moussa.konate@ecole.fr',     levelId: 'l3', levelName: '3ème', classId: 'c8', className: '3ème B', parentEmail: 'parent.konate@gmail.com',    avgScore: 11.2, completedExercises: 29, totalExercises: 52, attendanceRate: 78, status: 'inactive', lastActivity: Date.now() - 1209600000,createdAt: Date.now() - 7776000000, alerts: [] },
]

const LEVELS = ['Tous', '6ème', '5ème', '4ème', '3ème']
const STATUS_OPTIONS = ['Tous', 'Actif', 'Inactif', 'Suspendu']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  if (score >= 14) return <Badge variant="success">{score.toFixed(1)}</Badge>
  if (score >= 10) return <Badge variant="warning">{score.toFixed(1)}</Badge>
  return <Badge variant="danger">{score.toFixed(1)}</Badge>
}

function StatusDot({ status }: { status: Student['status'] }) {
  const map = {
    active:    { color: 'bg-success-500', label: 'Actif'    },
    inactive:  { color: 'bg-gray-400',    label: 'Inactif'  },
    suspended: { color: 'bg-danger-500',  label: 'Suspendu' },
  }
  const { color, label } = map[status]
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', color)} />
      <span className="text-sm text-gray-600">{label}</span>
    </span>
  )
}

function AttendancePill({ rate }: { rate: number }) {
  const color = rate >= 90 ? 'text-success-700 bg-success-50' : rate >= 75 ? 'text-warning-700 bg-warning-50' : 'text-danger-700 bg-danger-50'
  return <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', color)}>{rate}%</span>
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function StudentsPage() {
  const [search, setSearch]             = useState('')
  const [levelFilter, setLevelFilter]   = useState('Tous')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [showModal, setShowModal]       = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [sortBy, setSortBy]             = useState<'name' | 'score' | 'attendance'>('name')
  const [alertOnly, setAlertOnly]       = useState(false)

  const { students, loading, isLive, add: addLive, update: updateLive } = useLiveStudents(DEMO_STUDENTS)

  const filtered = useMemo(() => {
    let list = [...students]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) =>
        s.displayName.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
      )
    }
    if (levelFilter !== 'Tous') list = list.filter((s) => s.levelName === levelFilter)
    if (statusFilter !== 'Tous') {
      const map: Record<string, Student['status']> = { Actif: 'active', Inactif: 'inactive', Suspendu: 'suspended' }
      list = list.filter((s) => s.status === map[statusFilter])
    }
    if (alertOnly) list = list.filter((s) => s.alerts.length > 0)

    list.sort((a, b) => {
      if (sortBy === 'score')      return b.avgScore - a.avgScore
      if (sortBy === 'attendance') return b.attendanceRate - a.attendanceRate
      return a.displayName.localeCompare(b.displayName, 'fr')
    })
    return list
  }, [students, search, levelFilter, statusFilter, alertOnly, sortBy])

  const alertCount   = students.filter((s) => s.alerts.length > 0).length
  const avgClassScore = (students.reduce((s, e) => s + e.avgScore, 0) / students.length).toFixed(1)

  function handleAddStudent(newStudent: Student) {
    addLive(newStudent)
    setShowModal(false)
    setSelectedStudent(newStudent)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <SeedBanner show={!isLive} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des élèves</h1>
            <LiveBadge isLive={isLive} />
          </div>
          <p className="text-gray-500">{students.length} élèves inscrits · Année 2025-2026</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Upload size={14} />}>
            Importer CSV
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>
            Exporter
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowModal(true)}>
            Ajouter un élève
          </Button>
        </div>
      </div>

      {/* KPI résumé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total inscrits',   value: students.length,                         icon: <GraduationCap size={18} className="text-primary-600" />, bg: 'bg-primary-50' },
          { label: 'Actifs',           value: students.filter(s=>s.status==='active').length,   icon: <CheckCircle2 size={18} className="text-success-600" />, bg: 'bg-success-50' },
          { label: 'En alerte',        value: alertCount,                              icon: <XCircle      size={18} className="text-danger-600"  />, bg: 'bg-danger-50'  },
          { label: 'Moyenne générale', value: `${avgClassScore}/20`,                   icon: <Sparkles     size={18} className="text-warning-600" />, bg: 'bg-warning-50' },
        ].map((k) => (
          <Card key={k.label} className="flex items-center gap-3 p-4">
            <div className={cn('p-2 rounded-xl flex-shrink-0', k.bg)}>{k.icon}</div>
            <div>
              <p className="text-xl font-bold text-gray-900">{k.value}</p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-64">
            <Input
              placeholder="Rechercher par nom, numéro, classe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={15} />}
            />
          </div>

          {/* Niveau */}
          <div className="flex gap-1.5 flex-wrap">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  levelFilter === l ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Statut */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input py-2 w-36 text-sm"
          >
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>

          {/* Tri */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="input py-2 w-44 text-sm"
          >
            <option value="name">Trier : Nom A→Z</option>
            <option value="score">Trier : Meilleure moyenne</option>
            <option value="attendance">Trier : Meilleure assiduité</option>
          </select>

          {/* Alertes only */}
          <button
            onClick={() => setAlertOnly((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              alertOnly
                ? 'bg-danger-600 text-white border-danger-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-danger-300 hover:text-danger-600'
            )}
          >
            <XCircle size={14} />
            Alertes ({alertCount})
          </button>
        </div>
      </Card>

      {/* Résultat */}
      <p className="text-sm text-gray-500 -mt-2">
        {filtered.length} élève{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
      </p>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                {['Élève', 'Classe', 'Statut', 'Moyenne', 'Assiduité', 'Exercices', 'Alertes', ''].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <p className="text-4xl mb-3">🔍</p>
                    <p className="font-semibold text-gray-600">Aucun élève trouvé</p>
                    <p className="text-sm text-gray-400 mt-1">Modifiez vos filtres de recherche</p>
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={cn(
                      'hover:bg-primary-50/40 cursor-pointer transition-colors group',
                      selectedStudent?.id === student.id && 'bg-primary-50 border-l-2 border-primary-500'
                    )}
                  >
                    {/* Élève */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.displayName} size="md" />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{student.displayName}</p>
                          <p className="text-xs text-gray-400 font-mono">{student.studentNumber}</p>
                        </div>
                      </div>
                    </td>

                    {/* Classe */}
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{student.className}</p>
                        <p className="text-xs text-gray-400">{student.levelName}</p>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="px-5 py-4">
                      <StatusDot status={student.status} />
                    </td>

                    {/* Moyenne */}
                    <td className="px-5 py-4">
                      <ScoreBadge score={student.avgScore} />
                    </td>

                    {/* Assiduité */}
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <AttendancePill rate={student.attendanceRate} />
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              student.attendanceRate >= 90 ? 'bg-success-500' :
                              student.attendanceRate >= 75 ? 'bg-warning-500' : 'bg-danger-500'
                            )}
                            style={{ width: `${student.attendanceRate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Exercices */}
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-700">
                        {student.completedExercises}<span className="text-gray-400">/{student.totalExercises}</span>
                      </p>
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-primary-400 rounded-full"
                          style={{ width: `${(student.completedExercises / student.totalExercises) * 100}%` }}
                        />
                      </div>
                    </td>

                    {/* Alertes */}
                    <td className="px-5 py-4">
                      {student.alerts.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {student.alerts.includes('absent_3j') && (
                            <Badge variant="danger">⚠ Absent 3j+</Badge>
                          )}
                          {student.alerts.includes('score_faible') && (
                            <Badge variant="warning">📉 Moy. &lt;10</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4">
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal ajout élève */}
      {showModal && (
        <AddStudentModal
          onClose={() => setShowModal(false)}
          onAdd={handleAddStudent}
        />
      )}

      {/* Panneau détail élève */}
      {selectedStudent && (
        <StudentDetailPanel
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  )
}
