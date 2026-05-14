import { useState, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SeedBanner, LiveBadge } from '@/components/ui/SeedBanner'
import { useLiveSchedule } from '@/hooks/useLiveSchedule'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type SlotType = 'cours' | 'td' | 'examen' | 'reunion' | 'permanence'

interface ScheduleSlot {
  id: string
  day: 0 | 1 | 2 | 3 | 4
  startTime: string   // HH:mm
  endTime: string
  type: SlotType
  subjectName: string
  teacherName: string
  className: string
  room: string
}

// ── Données démo ──────────────────────────────────────────────────────────────

const DEMO_SLOTS: ScheduleSlot[] = [
  // Lundi
  { id: 's1',  day: 0, startTime: '08:00', endTime: '09:00', type: 'cours',       subjectName: 'Mathématiques',   teacherName: 'Jean Leblanc',      className: '6ème A',  room: 'Salle 12' },
  { id: 's2',  day: 0, startTime: '09:00', endTime: '10:00', type: 'cours',       subjectName: 'Français',        teacherName: 'Sophie Moreau',     className: '6ème B',  room: 'Salle 08' },
  { id: 's3',  day: 0, startTime: '10:00', endTime: '11:00', type: 'cours',       subjectName: 'Sciences',        teacherName: 'Fatima Benali',     className: '5ème A',  room: 'Labo 1'   },
  { id: 's4',  day: 0, startTime: '10:00', endTime: '11:00', type: 'cours',       subjectName: 'Mathématiques',   teacherName: 'Jean Leblanc',      className: '5ème B',  room: 'Salle 14' },
  { id: 's5',  day: 0, startTime: '11:00', endTime: '12:00', type: 'cours',       subjectName: 'Histoire-Géo',    teacherName: 'Marc Dupont',       className: '4ème A',  room: 'Salle 06' },
  { id: 's6',  day: 0, startTime: '13:00', endTime: '14:00', type: 'cours',       subjectName: 'Anglais',         teacherName: 'Pierre Guyot',      className: '6ème A',  room: 'Salle 09' },
  { id: 's7',  day: 0, startTime: '14:00', endTime: '15:00', type: 'td',          subjectName: 'Mathématiques',   teacherName: 'Thomas Klein',      className: '3ème A',  room: 'Salle 11' },
  { id: 's8',  day: 0, startTime: '15:00', endTime: '16:00', type: 'cours',       subjectName: 'Arts plastiques', teacherName: 'Isabelle Fontaine', className: '5ème A',  room: 'Atelier'  },
  { id: 's9',  day: 0, startTime: '16:00', endTime: '17:00', type: 'reunion',     subjectName: 'Réunion pédago.', teacherName: 'Direction',         className: 'Tous',    room: 'Salle conf.' },

  // Mardi
  { id: 's10', day: 1, startTime: '08:00', endTime: '09:00', type: 'cours',       subjectName: 'Français',        teacherName: 'Sophie Moreau',     className: '5ème A',  room: 'Salle 08' },
  { id: 's11', day: 1, startTime: '08:00', endTime: '09:00', type: 'cours',       subjectName: 'EPS',             teacherName: 'Amandine Renard',   className: '6ème A',  room: 'Gymnase'  },
  { id: 's12', day: 1, startTime: '09:00', endTime: '10:00', type: 'cours',       subjectName: 'Mathématiques',   teacherName: 'Jean Leblanc',      className: '6ème A',  room: 'Salle 12' },
  { id: 's13', day: 1, startTime: '10:00', endTime: '11:00', type: 'cours',       subjectName: 'Sciences',        teacherName: 'Fatima Benali',     className: '4ème A',  room: 'Labo 1'   },
  { id: 's14', day: 1, startTime: '13:00', endTime: '15:00', type: 'td',          subjectName: 'Français',        teacherName: 'Sophie Moreau',     className: '6ème B',  room: 'Salle 08' },
  { id: 's15', day: 1, startTime: '15:00', endTime: '16:00', type: 'cours',       subjectName: 'Anglais',         teacherName: 'Pierre Guyot',      className: '5ème A',  room: 'Salle 09' },
  { id: 's16', day: 1, startTime: '16:00', endTime: '17:00', type: 'cours',       subjectName: 'Histoire-Géo',    teacherName: 'Marc Dupont',       className: '3ème A',  room: 'Salle 06' },

  // Mercredi
  { id: 's17', day: 2, startTime: '08:00', endTime: '09:00', type: 'cours',       subjectName: 'Mathématiques',   teacherName: 'Thomas Klein',      className: '3ème B',  room: 'Salle 11' },
  { id: 's18', day: 2, startTime: '09:00', endTime: '10:00', type: 'cours',       subjectName: 'Sciences',        teacherName: 'Fatima Benali',     className: '5ème B',  room: 'Labo 1'   },
  { id: 's19', day: 2, startTime: '09:00', endTime: '10:00', type: 'cours',       subjectName: 'Français',        teacherName: 'Sophie Moreau',     className: '6ème A',  room: 'Salle 08' },
  { id: 's20', day: 2, startTime: '10:00', endTime: '12:00', type: 'examen',      subjectName: 'Mathématiques',   teacherName: 'Jean Leblanc',      className: '5ème A',  room: 'Salle 12' },

  // Jeudi
  { id: 's21', day: 3, startTime: '08:00', endTime: '09:00', type: 'cours',       subjectName: 'EPS',             teacherName: 'Amandine Renard',   className: '5ème A',  room: 'Gymnase'  },
  { id: 's22', day: 3, startTime: '09:00', endTime: '10:00', type: 'cours',       subjectName: 'Mathématiques',   teacherName: 'Jean Leblanc',      className: '4ème A',  room: 'Salle 12' },
  { id: 's23', day: 3, startTime: '09:00', endTime: '10:00', type: 'cours',       subjectName: 'Anglais',         teacherName: 'Pierre Guyot',      className: '6ème B',  room: 'Salle 09' },
  { id: 's24', day: 3, startTime: '10:00', endTime: '11:00', type: 'cours',       subjectName: 'Histoire-Géo',    teacherName: 'Marc Dupont',       className: '4ème A',  room: 'Salle 06' },
  { id: 's25', day: 3, startTime: '13:00', endTime: '14:00', type: 'cours',       subjectName: 'Sciences',        teacherName: 'Fatima Benali',     className: '6ème A',  room: 'Labo 1'   },
  { id: 's26', day: 3, startTime: '14:00', endTime: '16:00', type: 'td',          subjectName: 'Mathématiques',   teacherName: 'Thomas Klein',      className: '3ème A',  room: 'Salle 11' },
  { id: 's27', day: 3, startTime: '16:00', endTime: '17:00', type: 'permanence',  subjectName: 'Permanence',      teacherName: 'Thomas Klein',      className: 'Étude',   room: 'Salle 02' },

  // Vendredi
  { id: 's28', day: 4, startTime: '08:00', endTime: '09:00', type: 'cours',       subjectName: 'Français',        teacherName: 'Sophie Moreau',     className: '4ème A',  room: 'Salle 08' },
  { id: 's29', day: 4, startTime: '09:00', endTime: '10:00', type: 'cours',       subjectName: 'Arts plastiques', teacherName: 'Isabelle Fontaine', className: '6ème B',  room: 'Atelier'  },
  { id: 's30', day: 4, startTime: '09:00', endTime: '11:00', type: 'examen',      subjectName: 'Français',        teacherName: 'Sophie Moreau',     className: '6ème B',  room: 'Salle 08' },
  { id: 's31', day: 4, startTime: '13:00', endTime: '14:00', type: 'cours',       subjectName: 'EPS',             teacherName: 'Amandine Renard',   className: '4ème A',  room: 'Gymnase'  },
  { id: 's32', day: 4, startTime: '14:00', endTime: '15:00', type: 'cours',       subjectName: 'Mathématiques',   teacherName: 'Jean Leblanc',      className: '6ème B',  room: 'Salle 12' },
  { id: 's33', day: 4, startTime: '15:00', endTime: '17:00', type: 'td',          subjectName: 'Sciences',        teacherName: 'Fatima Benali',     className: '3ème A',  room: 'Labo 1'   },
]

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const HOURS = Array.from({ length: 10 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`)

const TYPE_COLORS: Record<SlotType, string> = {
  cours:       'bg-primary-100 border-primary-300 text-primary-900',
  td:          'bg-purple-100  border-purple-300  text-purple-900',
  examen:      'bg-danger-100  border-danger-300  text-danger-900',
  reunion:     'bg-warning-100 border-warning-300 text-warning-900',
  permanence:  'bg-gray-100    border-gray-300    text-gray-700',
}
const TYPE_DOT: Record<SlotType, string> = {
  cours:       'bg-primary-500',
  td:          'bg-purple-500',
  examen:      'bg-danger-500',
  reunion:     'bg-warning-500',
  permanence:  'bg-gray-400',
}
const TYPE_LABEL: Record<SlotType, string> = {
  cours:      'Cours',
  td:         'TD',
  examen:     'Examen',
  reunion:    'Réunion',
  permanence: 'Permanence',
}

const ALL_CLASSES   = ['Toutes', '6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '3ème A', '3ème B']
const ALL_TEACHERS  = ['Tous', 'Jean Leblanc', 'Sophie Moreau', 'Marc Dupont', 'Fatima Benali', 'Pierre Guyot', 'Amandine Renard', 'Thomas Klein', 'Isabelle Fontaine']

// ── Grid helpers ──────────────────────────────────────────────────────────────

function timeToRow(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h - 8) * 2 + Math.round(m / 30) // 30min slots
}

function SlotCard({ slot, compact = false }: { slot: ScheduleSlot; compact?: boolean }) {
  const startRow = timeToRow(slot.startTime) + 1
  const endRow   = timeToRow(slot.endTime) + 1
  const span     = endRow - startRow

  return (
    <div
      className={cn(
        'absolute left-0.5 right-0.5 rounded-xl border px-2 py-1.5 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity',
        TYPE_COLORS[slot.type],
        span === 1 ? 'text-xs' : 'text-xs'
      )}
      style={{
        top:    `calc(${(startRow - 1) * 30}px + 1px)`,
        height: `calc(${span * 30}px - 2px)`,
      }}
    >
      <p className="font-bold leading-tight truncate">{slot.subjectName}</p>
      {span >= 2 && <p className="truncate text-[10px] opacity-70">{slot.className}</p>}
      {span >= 2 && <p className="truncate text-[10px] opacity-60">{slot.teacherName}</p>}
      {span >= 3 && <p className="truncate text-[10px] opacity-50">{slot.room}</p>}
      {span === 1 && <p className="truncate text-[10px] opacity-60">{slot.className} · {slot.room}</p>}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SchedulePage() {
  const [filterClass,   setFilterClass]   = useState('Toutes')
  const [filterTeacher, setFilterTeacher] = useState('Tous')
  const [filterType,    setFilterType]    = useState<SlotType | 'all'>('all')

  // ── Firestore live schedule ──────────────────────────────────────────────────
  const { slots: liveSlots, isLive } = useLiveSchedule(DEMO_SLOTS as any)
  // Map shared ScheduleSlot → local ScheduleSlot (pick required fields)
  const slots: ScheduleSlot[] = liveSlots.map(s => ({
    id: s.id, day: s.day as ScheduleSlot['day'],
    startTime: s.startTime, endTime: s.endTime,
    type: s.type as SlotType,
    subjectName: s.subjectName, teacherName: s.teacherName,
    className: s.className, room: s.room,
  }))

  const filtered = useMemo(() => slots.filter(s => {
    if (filterClass   !== 'Toutes' && s.className   !== filterClass)   return false
    if (filterTeacher !== 'Tous'   && s.teacherName !== filterTeacher) return false
    if (filterType    !== 'all'    && s.type        !== filterType)     return false
    return true
  }), [slots, filterClass, filterTeacher, filterType])

  const slotsByDay = useMemo(() => {
    const map: Record<number, ScheduleSlot[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] }
    filtered.forEach(s => map[s.day].push(s))
    return map
  }, [filtered])

  const counts = {
    cours:  slots.filter(s => s.type === 'cours').length,
    td:     slots.filter(s => s.type === 'td').length,
    examen: slots.filter(s => s.type === 'examen').length,
    total:  slots.length,
  }

  return (
    <div className="px-8 py-8 space-y-5 max-w-full">
      <SeedBanner show={!isLive} />

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Emplois du temps</h1>
            <LiveBadge isLive={isLive} />
          </div>
          <p className="text-sm text-gray-400">Semaine type · Cours, TD, Examens</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>Exporter PDF</Button>
          <Button variant="primary"   size="sm" leftIcon={<Plus size={14} />}>Ajouter un créneau</Button>
        </div>
      </div>

      {/* Legend + counts */}
      <div className="flex items-center gap-4 flex-wrap">
        {(Object.entries(TYPE_COLORS) as [SlotType, string][]).map(([type]) => (
          <button key={type}
            onClick={() => setFilterType(filterType === type ? 'all' : type)}
            className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors',
              filterType === type ? TYPE_COLORS[type] : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', TYPE_DOT[type])} />
            {TYPE_LABEL[type]}
            <span className="text-gray-400 font-normal">({slots.filter(s => s.type === type).length})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={14} className="text-gray-400" />
        <select className="input py-2 text-sm"
          value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          {ALL_CLASSES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input py-2 text-sm"
          value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}>
          {ALL_TEACHERS.map(t => <option key={t}>{t}</option>)}
        </select>
        {(filterClass !== 'Toutes' || filterTeacher !== 'Tous' || filterType !== 'all') && (
          <button onClick={() => { setFilterClass('Toutes'); setFilterTeacher('Tous'); setFilterType('all') }}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium">
            Réinitialiser les filtres
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} créneau{filtered.length > 1 ? 'x' : ''} affiché{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-auto">
        <div className="min-w-[900px]">
          {/* Header row */}
          <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
            <div className="border-r border-gray-100" />
            {DAYS.map(d => {
              const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' })
              const isToday = today.charAt(0).toUpperCase() + today.slice(1) === d
              return (
                <div key={d} className={cn('py-3 text-center text-sm font-semibold border-r border-gray-50',
                  isToday ? 'text-primary-700 bg-primary-50' : 'text-gray-600'
                )}>
                  {d}
                  {isToday && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 inline-block align-middle" />}
                </div>
              )
            })}
          </div>

          {/* Body */}
          <div className="grid" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
            {/* Time labels */}
            <div className="border-r border-gray-100">
              {HOURS.map((h, i) => (
                <div key={h} style={{ height: '60px' }}
                  className="border-b border-gray-50 flex items-start justify-end pr-2 pt-1">
                  <span className="text-xs text-gray-400">{h}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {([0, 1, 2, 3, 4] as const).map(day => (
              <div key={day} className="relative border-r border-gray-50">
                {/* Hour lines */}
                {HOURS.map((h, i) => (
                  <div key={h} style={{ height: '60px' }} className="border-b border-gray-50" />
                ))}
                {/* 30-min lines */}
                {HOURS.map((h, i) => (
                  <div key={`${h}-half`}
                    style={{ position: 'absolute', top: `${i * 60 + 30}px`, left: 0, right: 0, height: '1px' }}
                    className="border-b border-gray-50 border-dashed opacity-50"
                  />
                ))}
                {/* Slots */}
                <div className="absolute inset-0">
                  {slotsByDay[day].map(slot => (
                    <SlotCard key={slot.id} slot={slot} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
