import { useState, useMemo } from 'react'
import {
  Clock, CheckCircle2, XCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Download, Filter,
  LogIn, LogOut, Calendar, Users
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { SeedBanner, LiveBadge } from '@/components/ui/SeedBanner'
import { useLiveAttendance } from '@/hooks/useLiveAttendance'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'present' | 'late' | 'absent' | 'justified' | 'pending'

interface AttendanceRecord {
  id: string
  teacherId: string
  teacherName: string
  teacherSubjects: string[]
  date: string          // YYYY-MM-DD
  dayLabel: string
  scheduledStart: string // HH:mm
  scheduledEnd: string
  scheduledHours: number
  actualStart: string | null
  actualEnd: string | null
  effectiveHours: number
  status: AttendanceStatus
  justification?: string
}

// ── Données démo ──────────────────────────────────────────────────────────────

function makeTime(h: number, m: number) { return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` }
function timeDiff(start: string, end: string) {
  const [sh,sm] = start.split(':').map(Number)
  const [eh,em] = end.split(':').map(Number)
  return +((eh * 60 + em - sh * 60 - sm) / 60).toFixed(1)
}

const WEEK_DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']

function getWeekDates(offset: number = 0): string[] {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

const TEACHERS = [
  { id: 't1', name: 'Jean Leblanc',       subjects: ['Mathématiques'] },
  { id: 't2', name: 'Sophie Moreau',      subjects: ['Français'] },
  { id: 't3', name: 'Marc Dupont',        subjects: ['Histoire-Géo'] },
  { id: 't4', name: 'Fatima Benali',      subjects: ['Sciences', 'SVT'] },
  { id: 't5', name: 'Pierre Guyot',       subjects: ['Anglais'] },
  { id: 't6', name: 'Amandine Renard',    subjects: ['EPS'] },
  { id: 't7', name: 'Thomas Klein',       subjects: ['Mathématiques'] },
  { id: 't8', name: 'Isabelle Fontaine',  subjects: ['Arts plastiques'] },
]

const SCHEDULES: Record<string, { start: string; end: string }[]> = {
  // day index 0-4 → Mon-Fri
  t1: [
    { start: '08:00', end: '12:00' }, // Mon
    { start: '10:00', end: '13:00' }, // Tue
    { start: '08:00', end: '11:00' }, // Wed
    { start: '09:00', end: '12:00' }, // Thu
    { start: '08:00', end: '10:00' }, // Fri
  ],
  t2: [
    { start: '08:30', end: '11:30' },
    { start: '13:00', end: '16:00' },
    { start: '09:00', end: '12:00' },
    { start: '08:30', end: '11:30' },
    { start: '13:00', end: '15:00' },
  ],
  t3: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }, { start: '09:00', end: '11:00' }, { start: '10:00', end: '13:00' }, { start: '09:00', end: '11:00' }],
  t4: [{ start: '08:00', end: '11:00' }, { start: '09:00', end: '12:00' }, { start: '08:00', end: '12:00' }, { start: '08:00', end: '11:00' }, { start: '09:00', end: '12:00' }],
  t5: [{ start: '10:00', end: '12:00' }, { start: '08:30', end: '11:30' }, { start: '10:00', end: '12:00' }, { start: '13:30', end: '16:30' }, { start: '10:00', end: '12:00' }],
  t6: [{ start: '08:00', end: '17:00' }, { start: '08:00', end: '17:00' }, { start: '08:00', end: '12:00' }, { start: '08:00', end: '17:00' }, { start: '08:00', end: '15:00' }],
  t7: [{ start: '13:00', end: '17:00' }, { start: '13:00', end: '16:00' }, { start: '13:00', end: '17:00' }, { start: '14:00', end: '17:00' }, { start: '13:00', end: '16:00' }],
  t8: [{ start: '10:00', end: '12:00' }, { start: '10:00', end: '12:00' }, { start: '10:00', end: '12:00' }, { start: '10:00', end: '12:00' }, { start: '10:00', end: '12:00' }],
}

function generateRecords(weekDates: string[]): AttendanceRecord[] {
  const isPast = (date: string) => date < new Date().toISOString().slice(0, 10)
  const isToday = (date: string) => date === new Date().toISOString().slice(0, 10)
  const records: AttendanceRecord[] = []

  TEACHERS.forEach(t => {
    weekDates.forEach((date, di) => {
      const sched = SCHEDULES[t.id]?.[di]
      if (!sched) return
      const scheduledHours = timeDiff(sched.start, sched.end)

      let status: AttendanceStatus = 'pending'
      let actualStart: string | null = null
      let actualEnd: string | null = null
      let justification: string | undefined

      if (isPast(date)) {
        // Simulate varied attendance
        const seed = (t.id.charCodeAt(1) + di * 7) % 10
        if (seed <= 1 && t.id === 't5') {
          status = 'absent'; justification = 'Congé maladie'
        } else if (seed === 2) {
          status = 'late'
          const lateMin = 10 + (di * 5)
          const [h, m] = sched.start.split(':').map(Number)
          actualStart = makeTime(h, m + lateMin)
          actualEnd = sched.end
        } else {
          status = 'present'
          actualStart = sched.start
          actualEnd = sched.end
        }
      } else if (isToday(date)) {
        const [h] = sched.start.split(':').map(Number)
        const nowH = new Date().getHours()
        if (nowH >= h) {
          status = 'present'; actualStart = sched.start
        } else {
          status = 'pending'
        }
      }

      const effectiveHours = actualStart && actualEnd ? timeDiff(actualStart, actualEnd) : 0

      records.push({
        id: `${t.id}-${date}`,
        teacherId: t.id, teacherName: t.name, teacherSubjects: t.subjects,
        date, dayLabel: WEEK_DAYS[di],
        scheduledStart: sched.start, scheduledEnd: sched.end, scheduledHours,
        actualStart, actualEnd, effectiveHours,
        status, justification,
      })
    })
  })
  return records
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<AttendanceStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'gray' | 'primary'; dot: string }> = {
  present:  { label: 'Présent',   variant: 'success', dot: 'bg-success-500' },
  late:     { label: 'En retard', variant: 'warning', dot: 'bg-warning-400' },
  absent:   { label: 'Absent',    variant: 'danger',  dot: 'bg-danger-500' },
  justified:{ label: 'Justifié',  variant: 'gray',    dot: 'bg-gray-300' },
  pending:  { label: 'À venir',   variant: 'primary', dot: 'bg-gray-200' },
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const cfg = STATUS_CFG[status]
  return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TeacherAttendancePage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [viewMode, setViewMode]     = useState<'week' | 'teacher'>('week')
  const [filterTeacher, setFilterTeacher] = useState<string>('all')
  const [filterStatus,  setFilterStatus]  = useState<AttendanceStatus | 'all'>('all')

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const generatedRecords = useMemo(() => generateRecords(weekDates), [weekDates])

  // ── Firestore live attendance ────────────────────────────────────────────────
  const { records: liveRecords, isLive, update: liveUpdate } = useLiveAttendance(weekOffset, [])

  // Use Firestore records if available, else generated demo records
  const allRecords: AttendanceRecord[] = useMemo(() => {
    if (liveRecords.length > 0) {
      return liveRecords.map(r => ({
        id: r.id, teacherId: r.teacherId, teacherName: r.teacherName,
        teacherSubjects: [],
        date: r.date, dayLabel: r.dayLabel,
        scheduledStart: r.scheduledStart, scheduledEnd: r.scheduledEnd,
        scheduledHours: r.scheduledHours,
        actualStart: r.actualStart, actualEnd: r.actualEnd,
        effectiveHours: r.effectiveHours,
        status: r.status as AttendanceStatus,
        justification: r.justification,
      }))
    }
    return generatedRecords
  }, [liveRecords, generatedRecords])

  const records = useMemo(() => allRecords.filter(r => {
    if (filterTeacher !== 'all' && r.teacherId !== filterTeacher) return false
    if (filterStatus  !== 'all' && r.status  !== filterStatus)   return false
    return true
  }), [allRecords, filterTeacher, filterStatus])

  const kpis = useMemo(() => {
    const past = allRecords.filter(r => r.status !== 'pending')
    return {
      present:  past.filter(r => r.status === 'present').length,
      late:     past.filter(r => r.status === 'late').length,
      absent:   past.filter(r => r.status === 'absent').length,
      totalSched: +allRecords.reduce((s, r) => s + r.scheduledHours, 0).toFixed(1),
      totalDone:  +allRecords.reduce((s, r) => s + r.effectiveHours, 0).toFixed(1),
    }
  }, [allRecords])

  // Grouped by teacher for teacher view
  const byTeacher = useMemo(() => {
    const map: Record<string, { teacher: typeof TEACHERS[0]; records: AttendanceRecord[] }> = {}
    records.forEach(r => {
      if (!map[r.teacherId]) {
        map[r.teacherId] = { teacher: TEACHERS.find(t => t.id === r.teacherId)!, records: [] }
      }
      map[r.teacherId].records.push(r)
    })
    return Object.values(map)
  }, [records])

  const weekLabel = useMemo(() => {
    const [mon, fri] = [weekDates[0], weekDates[4]]
    const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    return `Semaine du ${fmt(mon)} au ${fmt(fri)}`
  }, [weekDates])

  return (
    <div className="px-8 py-8 max-w-7xl space-y-6">
      <SeedBanner show={!isLive} />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Présence des professeurs</h1>
            <LiveBadge isLive={isLive} />
          </div>
          <p className="text-sm text-gray-400">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>Exporter</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Présences',     value: kpis.present,   color: 'text-success-700', bg: 'bg-success-50',  icon: <CheckCircle2 size={16} className="text-success-600" /> },
          { label: 'Retards',       value: kpis.late,      color: 'text-warning-700', bg: 'bg-warning-50',  icon: <Clock size={16} className="text-warning-500" /> },
          { label: 'Absences',      value: kpis.absent,    color: 'text-danger-700',  bg: 'bg-danger-50',   icon: <XCircle size={16} className="text-danger-500" /> },
          { label: 'H. prévues',    value: `${kpis.totalSched}h`, color: 'text-primary-700', bg: 'bg-primary-50', icon: <Calendar size={16} className="text-primary-600" /> },
          { label: 'H. effectuées', value: `${kpis.totalDone}h`,  color: 'text-purple-700', bg: 'bg-purple-50', icon: <LogOut size={16} className="text-purple-600" /> },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', k.bg)}>{k.icon}</div>
            <div>
              <p className={cn('text-lg font-bold', k.color)}>{k.value}</p>
              <p className="text-xs text-gray-400">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Week navigation */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-white transition-colors">
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors">
            Cette semaine
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-white transition-colors">
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        </div>

        {/* View mode */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(['week', 'teacher'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                viewMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              )}>
              {m === 'week' ? 'Par jour' : 'Par prof'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <select className="input py-2 text-sm"
          value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}>
          <option value="all">Tous les profs</option>
          {TEACHERS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <select className="input py-2 text-sm"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value as AttendanceStatus | 'all')}>
          <option value="all">Tous statuts</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Content */}
      {viewMode === 'week' ? (
        /* ── Vue par jour ── */
        <div className="space-y-3">
          {weekDates.map((date, di) => {
            const dayRecs = records.filter(r => r.date === date)
            if (dayRecs.length === 0) return null
            const isToday = date === new Date().toISOString().slice(0, 10)
            return (
              <div key={date} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className={cn('px-5 py-3 border-b border-gray-50 flex items-center gap-3',
                  isToday ? 'bg-primary-50' : 'bg-gray-50'
                )}>
                  <Calendar size={15} className={isToday ? 'text-primary-600' : 'text-gray-400'} />
                  <span className={cn('text-sm font-bold', isToday ? 'text-primary-700' : 'text-gray-700')}>
                    {WEEK_DAYS[di]} {new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    {isToday && <span className="ml-2 text-xs font-normal text-primary-500">Aujourd'hui</span>}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">{dayRecs.length} créneau{dayRecs.length > 1 ? 'x' : ''}</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-5 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Professeur</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Prévu</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Arrivée</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Départ</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-400 uppercase">H. eff.</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-400 uppercase">Statut</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dayRecs.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={r.teacherName} size="xs" />
                            <div>
                              <p className="font-medium text-gray-800">{r.teacherName}</p>
                              <p className="text-xs text-gray-400">{r.teacherSubjects.join(', ')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {r.scheduledStart} – {r.scheduledEnd}
                          <span className="text-xs text-gray-400 ml-1">({r.scheduledHours}h)</span>
                        </td>
                        <td className="px-4 py-3">
                          {r.actualStart ? (
                            <span className={cn('flex items-center gap-1 font-medium',
                              r.status === 'late' ? 'text-warning-600' : 'text-success-600'
                            )}>
                              <LogIn size={13} /> {r.actualStart}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.actualEnd ? (
                            <span className="flex items-center gap-1 text-gray-600">
                              <LogOut size={13} /> {r.actualEnd}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.effectiveHours > 0 ? (
                            <span className={cn('font-semibold',
                              r.effectiveHours >= r.scheduledHours ? 'text-success-600' : 'text-warning-600'
                            )}>{r.effectiveHours}h</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">
                          {r.justification ?? ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Vue par prof ── */
        <div className="space-y-3">
          {byTeacher.map(({ teacher, records: tRecs }) => {
            const totalSched = +tRecs.reduce((s, r) => s + r.scheduledHours, 0).toFixed(1)
            const totalDone  = +tRecs.reduce((s, r) => s + r.effectiveHours, 0).toFixed(1)
            const absents    = tRecs.filter(r => r.status === 'absent').length
            const lates      = tRecs.filter(r => r.status === 'late').length
            return (
              <div key={teacher.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-4">
                  <Avatar name={teacher.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{teacher.name}</p>
                    <p className="text-xs text-gray-400">{teacher.subjects.join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-primary-600">{totalDone}h<span className="text-gray-400 font-normal">/{totalSched}h</span></p>
                      <p className="text-xs text-gray-400">Heures</p>
                    </div>
                    {absents > 0 && <Badge variant="danger" size="sm">{absents} absence{absents > 1 ? 's' : ''}</Badge>}
                    {lates   > 0 && <Badge variant="warning" size="sm">{lates} retard{lates > 1 ? 's' : ''}</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-5 divide-x divide-gray-50">
                  {tRecs.map(r => (
                    <div key={r.id} className={cn('px-3 py-3',
                      r.status === 'absent'  ? 'bg-danger-50/50' :
                      r.status === 'late'    ? 'bg-warning-50/50' :
                      r.status === 'present' ? '' : 'bg-gray-50/30'
                    )}>
                      <p className="text-xs font-semibold text-gray-500 mb-1">{r.dayLabel}</p>
                      <StatusBadge status={r.status} />
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-300">prévu</span>
                          <span>{r.scheduledStart}–{r.scheduledEnd}</span>
                        </div>
                        {r.actualStart && (
                          <div className="flex items-center gap-1">
                            <LogIn size={10} className={r.status === 'late' ? 'text-warning-500' : 'text-success-500'} />
                            <span className={r.status === 'late' ? 'text-warning-600 font-medium' : ''}>{r.actualStart}</span>
                            {r.actualEnd && <><LogOut size={10} className="text-gray-400 ml-1" /><span>{r.actualEnd}</span></>}
                          </div>
                        )}
                        {r.justification && <p className="text-gray-400 truncate">{r.justification}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
