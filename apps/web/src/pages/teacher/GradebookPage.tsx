import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Download, Filter, Search, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'

type Trimester = 1 | 2 | 3

interface GradeEntry {
  studentId: string
  score: number | null
  comment?: string
}

interface Assessment {
  id: string
  title: string
  type: 'class' | 'departmental' | 'td' | 'trimester_exam'
  date: string
  maxScore: number
  coefficient: number
  trimester: Trimester
  classId: string
  grades: GradeEntry[]
}

interface Student {
  id: string
  name: string
  classId: string
}

const CLASSES = ['5ème A', '5ème B', '6ème A', '4ème A']

const STUDENTS: Student[] = [
  { id: 's1',  name: 'Awa Diallo',        classId: '5ème A' },
  { id: 's2',  name: 'Mamadou Koné',      classId: '5ème A' },
  { id: 's3',  name: 'Fatoumata Bah',     classId: '5ème A' },
  { id: 's4',  name: 'Ibrahim Sow',       classId: '5ème A' },
  { id: 's5',  name: 'Mariam Camara',     classId: '5ème A' },
  { id: 's6',  name: 'Oumar Traoré',      classId: '5ème A' },
  { id: 's7',  name: 'Kadiatou Balde',    classId: '5ème A' },
  { id: 's8',  name: 'Abdoulaye Diop',    classId: '5ème A' },
  { id: 's9',  name: 'Aissatou Barry',    classId: '5ème B' },
  { id: 's10', name: 'Boubacar Sylla',    classId: '5ème B' },
  { id: 's11', name: 'Hadja Keita',       classId: '5ème B' },
  { id: 's12', name: 'Thierno Baldé',     classId: '5ème B' },
  { id: 's13', name: 'Mariama Bah',       classId: '6ème A' },
  { id: 's14', name: 'Elhadj Camara',     classId: '6ème A' },
  { id: 's15', name: 'Fanta Sow',         classId: '4ème A' },
  { id: 's16', name: 'Sekou Conde',       classId: '4ème A' },
]

function randomScore(max: number, low = 0.3, high = 1.0): number | null {
  if (Math.random() < 0.05) return null
  const pct = low + Math.random() * (high - low)
  return Math.round(pct * max * 2) / 2
}

function buildAssessments(): Assessment[] {
  const classIds = ['5ème A', '5ème B', '6ème A', '4ème A']
  const assessments: Assessment[] = []
  let id = 1

  for (const classId of classIds) {
    const studs = STUDENTS.filter(s => s.classId === classId)

    for (const trimester of [1, 2, 3] as Trimester[]) {
      assessments.push({
        id: `a${id++}`, title: 'Devoir de classe n°1', type: 'class',
        date: `2026-0${trimester * 2 - 1}-15`, maxScore: 20, coefficient: 2,
        trimester, classId,
        grades: studs.map(s => ({ studentId: s.id, score: randomScore(20, 0.35, 0.95) })),
      })
      assessments.push({
        id: `a${id++}`, title: 'Devoir de classe n°2', type: 'class',
        date: `2026-0${trimester * 2}-05`, maxScore: 20, coefficient: 2,
        trimester, classId,
        grades: studs.map(s => ({ studentId: s.id, score: randomScore(20, 0.4, 0.9) })),
      })
      assessments.push({
        id: `a${id++}`, title: 'Travaux dirigés', type: 'td',
        date: `2026-0${trimester * 2}-20`, maxScore: 10, coefficient: 1,
        trimester, classId,
        grades: studs.map(s => ({ studentId: s.id, score: randomScore(10, 0.5, 1.0) })),
      })
      if (trimester < 3) {
        assessments.push({
          id: `a${id++}`, title: `Examen trimestriel T${trimester}`, type: 'trimester_exam',
          date: `2026-0${trimester * 2}-28`, maxScore: 40, coefficient: 4,
          trimester, classId,
          grades: studs.map(s => ({ studentId: s.id, score: randomScore(40, 0.3, 0.92) })),
        })
      }
    }

    assessments.push({
      id: `a${id++}`, title: 'Devoir Départ. Mathématiques', type: 'departmental',
      date: '2026-04-10', maxScore: 20, coefficient: 3,
      trimester: 2, classId,
      grades: studs.map(s => ({ studentId: s.id, score: randomScore(20, 0.28, 0.88) })),
    })
  }

  return assessments
}

const ALL_ASSESSMENTS = buildAssessments()

const TYPE_LABEL: Record<string, string> = {
  class: 'Classe', departmental: 'Départ.', td: 'TD', trimester_exam: 'Examen',
}
const TYPE_COLOR: Record<string, string> = {
  class: 'bg-blue-100 text-blue-700',
  departmental: 'bg-purple-100 text-purple-700',
  td: 'bg-green-100 text-green-700',
  trimester_exam: 'bg-red-100 text-red-700',
}

function ScoreCell({ score, max, editing, onChange }: {
  score: number | null; max: number; editing: boolean
  onChange: (v: number | null) => void
}) {
  const pct = score !== null ? score / max : null
  const color = pct === null ? 'text-gray-300'
    : pct >= 0.7 ? 'text-green-600 font-semibold'
    : pct >= 0.5 ? 'text-amber-600'
    : 'text-red-600 font-semibold'

  if (editing) {
    return (
      <input
        type="number" min={0} max={max} step={0.5}
        defaultValue={score ?? ''}
        onBlur={e => {
          const v = e.target.value === '' ? null : parseFloat(e.target.value)
          onChange(v !== null && !isNaN(v) ? Math.min(max, Math.max(0, v)) : null)
        }}
        className="w-14 text-center text-xs border border-primary-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    )
  }

  return (
    <span className={`text-xs tabular-nums ${color}`}>
      {score !== null ? score : '–'}
    </span>
  )
}

function TrendIcon({ avg, prev }: { avg: number | null; prev: number | null }) {
  if (avg === null || prev === null) return <Minus size={12} className="text-gray-300" />
  if (avg > prev + 0.5) return <TrendingUp size={12} className="text-green-500" />
  if (avg < prev - 0.5) return <TrendingDown size={12} className="text-red-500" />
  return <Minus size={12} className="text-gray-400" />
}

function weighted(scores: { score: number | null; coeff: number; max: number }[]): number | null {
  const valid = scores.filter(s => s.score !== null)
  if (valid.length === 0) return null
  const totalCoeff = valid.reduce((s, v) => s + v.coeff, 0)
  const sumPts = valid.reduce((s, v) => s + (v.score! / v.max) * 20 * v.coeff, 0)
  return Math.round((sumPts / totalCoeff) * 100) / 100
}

export function TeacherGradebookPage() {
  const [classId, setClassId]   = useState('5ème A')
  const [trimester, setTrimester] = useState<Trimester>(2)
  const [editing, setEditing]   = useState(false)
  const [search, setSearch]     = useState('')
  const [grades, setGrades]     = useState<Record<string, Record<string, number | null>>>(() => {
    const m: Record<string, Record<string, number | null>> = {}
    ALL_ASSESSMENTS.forEach(a => {
      m[a.id] = {}
      a.grades.forEach(g => { m[a.id][g.studentId] = g.score })
    })
    return m
  })
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  const students = useMemo(() =>
    STUDENTS.filter(s => s.classId === classId && s.name.toLowerCase().includes(search.toLowerCase())),
    [classId, search]
  )

  const assessments = useMemo(() =>
    ALL_ASSESSMENTS.filter(a => a.classId === classId && a.trimester === trimester),
    [classId, trimester]
  )

  const prevAssessments = useMemo(() =>
    trimester > 1 ? ALL_ASSESSMENTS.filter(a => a.classId === classId && a.trimester === (trimester - 1) as Trimester) : [],
    [classId, trimester]
  )

  function getGrade(assessmentId: string, studentId: string): number | null {
    return grades[assessmentId]?.[studentId] ?? null
  }

  function setGrade(assessmentId: string, studentId: string, score: number | null) {
    setGrades(prev => ({
      ...prev,
      [assessmentId]: { ...prev[assessmentId], [studentId]: score },
    }))
  }

  function studentAvg(studentId: string, assList: typeof assessments): number | null {
    return weighted(assList.map(a => ({
      score: getGrade(a.id, studentId),
      coeff: a.coefficient,
      max: a.maxScore,
    })))
  }

  const classAvg = useMemo(() => {
    const avgs = students.map(s => studentAvg(s.id, assessments)).filter(a => a !== null) as number[]
    return avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length * 100) / 100 : null
  }, [students, assessments, grades])

  const passing = useMemo(() =>
    students.filter(s => { const a = studentAvg(s.id, assessments); return a !== null && a >= 10 }).length,
    [students, assessments, grades]
  )

  const avgColor = classAvg === null ? 'text-gray-400'
    : classAvg >= 14 ? 'text-green-600'
    : classAvg >= 10 ? 'text-amber-600'
    : 'text-red-600'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Carnet de notes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivi des résultats et calcul des moyennes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(e => !e)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${editing ? 'bg-primary-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            {editing ? '✓ Terminer la saisie' : 'Saisir les notes'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download size={16} /> Exporter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {CLASSES.map(cls => (
            <button key={cls} onClick={() => setClassId(cls)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${classId === cls ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {cls}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {([1, 2, 3] as Trimester[]).map(t => (
            <button key={t} onClick={() => setTrimester(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${trimester === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Trimestre {t}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un élève..."
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className={`text-3xl font-bold ${avgColor}`}>{classAvg !== null ? classAvg.toFixed(2) : '–'}</p>
          <p className="text-xs text-gray-500 mt-0.5">Moyenne de classe / 20</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-3xl font-bold text-gray-900">{passing}<span className="text-lg text-gray-400">/{students.length}</span></p>
          <p className="text-xs text-gray-500 mt-0.5">Élèves au-dessus de 10</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-3xl font-bold text-gray-900">{assessments.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Évaluations ce trimestre</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-3xl font-bold text-amber-600">
            {students.filter(s => { const a = studentAvg(s.id, assessments); return a !== null && a < 8 }).length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Élèves en difficulté (&lt; 8)</p>
        </div>
      </div>

      {editing && (
        <div className="flex items-center gap-2 p-3 bg-primary-50 border border-primary-200 rounded-xl text-sm text-primary-700">
          <AlertCircle size={16} className="flex-shrink-0" />
          Mode saisie actif — cliquez sur une case pour modifier la note. Les moyennes se recalculent automatiquement.
        </div>
      )}

      {/* Gradebook table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 bg-gray-50 sticky left-0 w-48 min-w-[12rem]">Élève</th>
                {assessments.map(a => (
                  <th key={a.id} className="px-2 py-3 bg-gray-50 min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLOR[a.type]}`}>{TYPE_LABEL[a.type]}</span>
                      <span className="text-xs font-medium text-gray-700 text-center leading-tight max-w-[72px] truncate" title={a.title}>{a.title}</span>
                      <span className="text-xs text-gray-400">/{a.maxScore} · c{a.coefficient}</span>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 bg-gray-50 min-w-[80px] sticky right-0">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-gray-900">Moy. T{trimester}</span>
                    <span className="text-xs text-gray-400">/20</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map(student => {
                const avg = studentAvg(student.id, assessments)
                const prevAvg = studentAvg(student.id, prevAssessments)
                const avgColor = avg === null ? 'text-gray-400'
                  : avg >= 14 ? 'text-green-600 font-bold'
                  : avg >= 10 ? 'text-amber-600 font-semibold'
                  : 'text-red-600 font-bold'
                const rowBg = avg !== null && avg < 8 ? 'bg-red-50/30' : ''

                return (
                  <tr key={student.id} className={`hover:bg-gray-50/60 transition-colors ${rowBg}`}>
                    <td className="px-4 py-2.5 sticky left-0 bg-white">
                      <div className="flex items-center gap-2">
                        {avg !== null && avg < 8 && <AlertCircle size={12} className="text-red-400 flex-shrink-0" />}
                        <span className="font-medium text-gray-900 text-xs">{student.name}</span>
                      </div>
                    </td>
                    {assessments.map(a => (
                      <td key={a.id} className="px-2 py-2.5 text-center">
                        <ScoreCell
                          score={getGrade(a.id, student.id)}
                          max={a.maxScore}
                          editing={editing}
                          onChange={v => setGrade(a.id, student.id, v)}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-center sticky right-0 bg-white">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`text-sm tabular-nums ${avgColor}`}>
                          {avg !== null ? avg.toFixed(2) : '–'}
                        </span>
                        <TrendIcon avg={avg} prev={prevAvg} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* Class averages row */}
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-4 py-3 text-xs font-bold text-gray-700 sticky left-0 bg-gray-50">Moyenne de classe</td>
                {assessments.map(a => {
                  const scores = students.map(s => getGrade(a.id, s.id)).filter(v => v !== null) as number[]
                  const avg = scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : null
                  const pct = avg !== null ? avg / a.maxScore : null
                  const color = pct === null ? 'text-gray-400'
                    : pct >= 0.7 ? 'text-green-600 font-semibold'
                    : pct >= 0.5 ? 'text-amber-600'
                    : 'text-red-600 font-semibold'
                  return (
                    <td key={a.id} className="px-2 py-3 text-center">
                      <span className={`text-xs tabular-nums ${color}`}>{avg !== null ? avg.toFixed(1) : '–'}</span>
                    </td>
                  )
                })}
                <td className={`px-4 py-3 text-center text-sm font-bold sticky right-0 bg-gray-50 ${avgColor}`}>
                  {classAvg !== null ? classAvg.toFixed(2) : '–'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Distribution chart */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribution des moyennes — Trimestre {trimester}</h3>
        <div className="space-y-2">
          {[
            { label: '≥ 16 (TB)', min: 16, max: 20, color: 'bg-green-500' },
            { label: '14–16 (B)',  min: 14, max: 16, color: 'bg-green-400' },
            { label: '12–14 (AB)', min: 12, max: 14, color: 'bg-lime-400'  },
            { label: '10–12 (P)', min: 10, max: 12, color: 'bg-amber-400' },
            { label: '8–10',      min: 8,  max: 10, color: 'bg-orange-400' },
            { label: '< 8 (F)',   min: 0,  max: 8,  color: 'bg-red-400'   },
          ].map(band => {
            const count = students.filter(s => {
              const a = studentAvg(s.id, assessments)
              return a !== null && a >= band.min && a < band.max
            }).length
            const pct = students.length ? (count / students.length) * 100 : 0
            return (
              <div key={band.label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0">{band.label}</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${band.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-700 w-6 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
