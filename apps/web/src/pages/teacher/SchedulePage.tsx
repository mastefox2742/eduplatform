import { useState } from 'react'
import { Clock, MapPin, Users, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type SlotType = 'cours' | 'td' | 'examen' | 'reunion' | 'permanence'

interface MySlot {
  id: string
  day: 0 | 1 | 2 | 3 | 4
  startTime: string
  endTime: string
  type: SlotType
  subjectName: string
  className: string
  room: string
  studentsCount: number
}

// ── Données démo (vue prof Jean Leblanc) ─────────────────────────────────────

const MY_SLOTS: MySlot[] = [
  { id: '1',  day: 0, startTime: '08:00', endTime: '09:00', type: 'cours',  subjectName: 'Mathématiques', className: '6ème A',  room: 'Salle 12', studentsCount: 24 },
  { id: '2',  day: 0, startTime: '10:00', endTime: '11:00', type: 'cours',  subjectName: 'Mathématiques', className: '5ème B',  room: 'Salle 14', studentsCount: 25 },
  { id: '3',  day: 1, startTime: '09:00', endTime: '10:00', type: 'cours',  subjectName: 'Mathématiques', className: '6ème A',  room: 'Salle 12', studentsCount: 24 },
  { id: '4',  day: 1, startTime: '13:00', endTime: '14:00', type: 'cours',  subjectName: 'Physique',      className: '4ème A',  room: 'Labo 1',   studentsCount: 23 },
  { id: '5',  day: 2, startTime: '10:00', endTime: '12:00', type: 'examen', subjectName: 'Mathématiques', className: '5ème A',  room: 'Salle 12', studentsCount: 26 },
  { id: '6',  day: 3, startTime: '09:00', endTime: '10:00', type: 'cours',  subjectName: 'Mathématiques', className: '4ème A',  room: 'Salle 12', studentsCount: 23 },
  { id: '7',  day: 3, startTime: '14:00', endTime: '16:00', type: 'td',     subjectName: 'Mathématiques', className: '3ème A',  room: 'Salle 11', studentsCount: 24 },
  { id: '8',  day: 3, startTime: '16:00', endTime: '17:00', type: 'reunion',subjectName: 'Conseil de classe', className: '5ème A', room: 'Salle conf.', studentsCount: 0 },
  { id: '9',  day: 4, startTime: '14:00', endTime: '15:00', type: 'cours',  subjectName: 'Mathématiques', className: '6ème B',  room: 'Salle 12', studentsCount: 22 },
  { id: '10', day: 4, startTime: '15:00', endTime: '16:00', type: 'permanence', subjectName: 'Permanence', className: 'Étude', room: 'Salle 02', studentsCount: 0 },
]

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']

const TYPE_COLORS: Record<SlotType, { bg: string; border: string; text: string; dot: string }> = {
  cours:      { bg: 'bg-primary-50',  border: 'border-primary-300', text: 'text-primary-900', dot: 'bg-primary-500' },
  td:         { bg: 'bg-purple-50',   border: 'border-purple-300',  text: 'text-purple-900',  dot: 'bg-purple-500' },
  examen:     { bg: 'bg-danger-50',   border: 'border-danger-300',  text: 'text-danger-900',  dot: 'bg-danger-500' },
  reunion:    { bg: 'bg-warning-50',  border: 'border-warning-300', text: 'text-warning-900', dot: 'bg-warning-500' },
  permanence: { bg: 'bg-gray-50',     border: 'border-gray-300',    text: 'text-gray-700',    dot: 'bg-gray-400' },
}
const TYPE_LABEL: Record<SlotType, string> = {
  cours: 'Cours', td: 'TD', examen: 'Examen', reunion: 'Réunion', permanence: 'Permanence',
}

function timeToOffset(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h - 8) * 60 + m // minutes since 08:00
}

const TOTAL_MINUTES = 9 * 60 // 08:00 → 17:00

// ── Week stats ────────────────────────────────────────────────────────────────

function weekStats(slots: MySlot[]) {
  let totalMin = 0
  slots.forEach(s => {
    const start = timeToOffset(s.startTime)
    const end   = timeToOffset(s.endTime)
    totalMin += end - start
  })
  const h = Math.floor(totalMin / 60), m = totalMin % 60
  return {
    totalH: m ? `${h}h${String(m).padStart(2,'0')}` : `${h}h`,
    cours:  slots.filter(s => s.type === 'cours').length,
    td:     slots.filter(s => s.type === 'td').length,
    examen: slots.filter(s => s.type === 'examen').length,
    classes: [...new Set(slots.filter(s => s.studentsCount > 0).map(s => s.className))].length,
  }
}

function getWeekDates(offset: number) {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TeacherSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const weekDates = getWeekDates(weekOffset)
  const stats = weekStats(MY_SLOTS)

  const todayDay = ((new Date().getDay() + 6) % 7) as 0|1|2|3|4

  const weekLabel = (() => {
    const today = new Date()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    return `${fmt(monday)} – ${fmt(friday)}`
  })()

  return (
    <div className="px-8 py-8 space-y-5 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon emploi du temps</h1>
          <p className="text-sm text-gray-400 mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>Exporter</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 flex-wrap">
        {[
          { label: 'Heures cette semaine', value: stats.totalH, color: 'text-primary-700' },
          { label: 'Cours', value: stats.cours,  color: 'text-primary-600' },
          { label: 'TD',    value: stats.td,     color: 'text-purple-600' },
          { label: 'Examens', value: stats.examen, color: 'text-danger-600' },
          { label: 'Classes', value: stats.classes, color: 'text-gray-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex items-center gap-2">
            <span className={cn('font-bold text-lg', s.color)}>{s.value}</span>
            <span className="text-xs text-gray-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-white transition-colors">
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-white">
            {weekOffset === 0 ? 'Cette semaine' : weekOffset < 0 ? `Il y a ${Math.abs(weekOffset)} sem.` : `Dans ${weekOffset} sem.`}
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-white transition-colors">
            <ChevronRight size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 ml-auto">
          {(['grid', 'list'] as const).map(m => (
            <button key={m} onClick={() => setView(m)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                view === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              )}>
              {m === 'grid' ? 'Grille' : 'Liste'}
            </button>
          ))}
        </div>
      </div>

      {view === 'grid' ? (
        /* ── Grille ── */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-auto">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
              <div className="border-r border-gray-100" />
              {DAYS.map((d, i) => (
                <div key={d} className={cn('py-3 text-center border-r border-gray-50',
                  weekOffset === 0 && i === todayDay ? 'bg-primary-50' : ''
                )}>
                  <p className={cn('text-sm font-semibold',
                    weekOffset === 0 && i === todayDay ? 'text-primary-700' : 'text-gray-600'
                  )}>{d}</p>
                  <p className="text-xs text-gray-400">{weekDates[i]}</p>
                  {weekOffset === 0 && i === todayDay && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500 mt-0.5" />
                  )}
                </div>
              ))}
            </div>

            {/* Body */}
            <div className="grid" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
              {/* Hours */}
              <div className="border-r border-gray-100">
                {HOURS.map(h => (
                  <div key={h} style={{ height: '60px' }} className="border-b border-gray-50 flex items-start justify-end pr-2 pt-1">
                    <span className="text-xs text-gray-400">{h}</span>
                  </div>
                ))}
              </div>

              {/* Day cols */}
              {([0,1,2,3,4] as const).map(day => (
                <div key={day} className={cn('relative border-r border-gray-50',
                  weekOffset === 0 && day === todayDay ? 'bg-primary-50/20' : ''
                )}>
                  {HOURS.map(h => (
                    <div key={h} style={{ height: '60px' }} className="border-b border-gray-50" />
                  ))}
                  {MY_SLOTS.filter(s => s.day === day).map(slot => {
                    const startMin = timeToOffset(slot.startTime)
                    const endMin   = timeToOffset(slot.endTime)
                    const durationMin = endMin - startMin
                    const c = TYPE_COLORS[slot.type]
                    return (
                      <div key={slot.id}
                        className={cn('absolute left-0.5 right-0.5 rounded-xl border px-2 py-1.5 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity', c.bg, c.border, c.text)}
                        style={{
                          top:    `${startMin}px`,
                          height: `${durationMin - 2}px`,
                        }}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
                          <span className="text-[10px] font-semibold opacity-70">{TYPE_LABEL[slot.type]}</span>
                        </div>
                        <p className="font-bold text-xs leading-tight truncate">{slot.subjectName}</p>
                        {durationMin >= 60 && (
                          <>
                            <p className="text-[10px] truncate opacity-70">{slot.className}</p>
                            <p className="text-[10px] truncate opacity-60">{slot.room}</p>
                          </>
                        )}
                        {durationMin < 60 && (
                          <p className="text-[10px] truncate opacity-60">{slot.className} · {slot.room}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Liste par jour ── */
        <div className="space-y-4">
          {DAYS.map((day, di) => {
            const daySlots = MY_SLOTS.filter(s => s.day === di).sort((a, b) => a.startTime.localeCompare(b.startTime))
            if (daySlots.length === 0) return null
            const isToday = weekOffset === 0 && di === todayDay
            return (
              <div key={day} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className={cn('px-5 py-3 border-b border-gray-50 flex items-center gap-3',
                  isToday ? 'bg-primary-50' : 'bg-gray-50'
                )}>
                  <span className={cn('text-sm font-bold', isToday ? 'text-primary-700' : 'text-gray-700')}>
                    {day} {weekDates[di]}
                    {isToday && <span className="ml-2 text-xs font-normal text-primary-500">Aujourd'hui</span>}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">{daySlots.length} créneau{daySlots.length > 1 ? 'x' : ''}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {daySlots.map(slot => {
                    const c = TYPE_COLORS[slot.type]
                    return (
                      <div key={slot.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div className={cn('w-1 self-stretch rounded-full flex-shrink-0', c.dot)} />
                        <div className="w-24 flex-shrink-0">
                          <p className="text-sm font-semibold text-gray-700">{slot.startTime}</p>
                          <p className="text-xs text-gray-400">{slot.endTime}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{slot.subjectName}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span className="flex items-center gap-1"><Users size={11} />{slot.className}</span>
                            <span className="flex items-center gap-1"><MapPin size={11} />{slot.room}</span>
                            {slot.studentsCount > 0 && <span>{slot.studentsCount} élèves</span>}
                          </div>
                        </div>
                        <Badge variant={
                          slot.type === 'cours' ? 'primary' : slot.type === 'td' ? 'purple' :
                          slot.type === 'examen' ? 'danger' : slot.type === 'reunion' ? 'warning' : 'gray'
                        } size="sm">{TYPE_LABEL[slot.type]}</Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
