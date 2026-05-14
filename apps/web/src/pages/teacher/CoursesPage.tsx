import { useState, useMemo } from 'react'
import {
  Plus, BookOpen, Eye, Edit3, Trash2, Copy,
  ChevronDown, ChevronUp, GripVertical, X,
  FileText, Video, HelpCircle, CheckCircle2,
  Users, Clock, BarChart2, Send, Save, ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionType = 'text' | 'video' | 'quiz' | 'file'
type CourseStatus = 'draft' | 'published' | 'archived'

interface CourseSection {
  id: string
  type: SectionType
  title: string
  content: string
  videoUrl?: string
  duration?: number
}

interface Course {
  id: string
  title: string
  subject: string
  level: string
  classNames: string[]
  description: string
  status: CourseStatus
  sections: CourseSection[]
  studentsCount: number
  completionRate: number
  createdAt: number
  updatedAt: number
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const now = Date.now(), day = 86400000

const DEMO_COURSES: Course[] = [
  {
    id: 'c1', title: 'Algèbre — Équations du 1er degré', subject: 'Mathématiques',
    level: '5ème', classNames: ['5ème A', '5ème B'], description: 'Introduction aux équations linéaires avec une inconnue.',
    status: 'published', completionRate: 78, studentsCount: 51,
    createdAt: now - day * 30, updatedAt: now - day * 2,
    sections: [
      { id: 'sc1', type: 'text',  title: 'Introduction',             content: 'Une équation du premier degré est une égalité de la forme ax + b = 0...' },
      { id: 'sc2', type: 'video', title: 'Vidéo explicative',        content: 'Regardez attentivement la résolution étape par étape.', videoUrl: 'https://youtube.com/...', duration: 8 },
      { id: 'sc3', type: 'text',  title: 'Méthode de résolution',    content: '1. Isoler le terme en x\n2. Diviser par le coefficient\n3. Vérifier la solution' },
      { id: 'sc4', type: 'quiz',  title: 'Quiz de compréhension',    content: '3 questions pour vérifier votre compréhension.' },
      { id: 'sc5', type: 'text',  title: 'Exercices d\'application', content: 'Résoudre les équations suivantes...' },
    ],
  },
  {
    id: 'c2', title: 'Géométrie — Triangles et angles', subject: 'Mathématiques',
    level: '5ème', classNames: ['5ème A'], description: 'Propriétés des triangles, somme des angles, triangles particuliers.',
    status: 'published', completionRate: 65, studentsCount: 26,
    createdAt: now - day * 20, updatedAt: now - day * 5,
    sections: [
      { id: 'sc6', type: 'text',  title: 'Les types de triangles',   content: 'Triangle équilatéral, isocèle, rectangle...' },
      { id: 'sc7', type: 'video', title: 'Construction au compas',   content: 'Démonstration de construction géométrique.', videoUrl: 'https://youtube.com/...', duration: 12 },
      { id: 'sc8', type: 'quiz',  title: 'Quiz — Identifier les triangles', content: '5 questions.' },
    ],
  },
  {
    id: 'c3', title: 'Fractions — Opérations de base', subject: 'Mathématiques',
    level: '6ème', classNames: ['6ème A'], description: 'Addition, soustraction, multiplication et division de fractions.',
    status: 'published', completionRate: 82, studentsCount: 24,
    createdAt: now - day * 45, updatedAt: now - day * 10,
    sections: [
      { id: 'sc9',  type: 'text',  title: 'Rappel : qu\'est-ce qu\'une fraction ?', content: 'Une fraction représente une partie d\'un tout...' },
      { id: 'sc10', type: 'text',  title: 'Addition de fractions',   content: 'Pour additionner des fractions, il faut un dénominateur commun...' },
      { id: 'sc11', type: 'quiz',  title: 'Exercices guidés',        content: '4 exercices progressifs.' },
    ],
  },
  {
    id: 'c4', title: 'Physique — La lumière et ses propriétés', subject: 'Physique',
    level: '4ème', classNames: ['4ème A'], description: 'Propagation de la lumière, réflexion, réfraction.',
    status: 'draft', completionRate: 0, studentsCount: 0,
    createdAt: now - day * 3, updatedAt: now - day * 1,
    sections: [
      { id: 'sc12', type: 'text',  title: 'Introduction', content: 'La lumière se propage en ligne droite dans un milieu homogène...' },
    ],
  },
]

const SUBJECTS  = ['Mathématiques', 'Physique']
const MY_CLASSES = ['5ème A', '5ème B', '6ème A', '4ème A']
const LEVELS     = ['6ème', '5ème', '4ème', '3ème']

const SECTION_TYPE_CONFIG: Record<SectionType, { label: string; icon: React.ReactNode; color: string }> = {
  text:  { label: 'Texte',   icon: <FileText size={14} />,  color: 'text-gray-600 bg-gray-100' },
  video: { label: 'Vidéo',   icon: <Video size={14} />,     color: 'text-primary-600 bg-primary-50' },
  quiz:  { label: 'Quiz',    icon: <HelpCircle size={14} />,color: 'text-purple-600 bg-purple-50' },
  file:  { label: 'Fichier', icon: <FileText size={14} />,  color: 'text-warning-600 bg-warning-50' },
}

// ── Course Builder ────────────────────────────────────────────────────────────

function SectionEditor({ section, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  section: CourseSection
  onUpdate: (s: CourseSection) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const [open, setOpen] = useState(true)
  const cfg = SECTION_TYPE_CONFIG[section.type]

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <GripVertical size={16} className="text-gray-300" />
        <span className={cn('flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium', cfg.color)}>
          {cfg.icon} {cfg.label}
        </span>
        <input
          className="flex-1 font-semibold text-gray-800 bg-transparent outline-none text-sm"
          value={section.title}
          onChange={e => onUpdate({ ...section, title: e.target.value })}
          onClick={e => e.stopPropagation()}
          placeholder="Titre de la section"
        />
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onMoveUp}   disabled={isFirst}  className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-20"><ChevronUp size={14} /></button>
          <button onClick={onMoveDown} disabled={isLast}   className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-20"><ChevronDown size={14} /></button>
          <button onClick={onDelete}                       className="p-1 text-gray-300 hover:text-danger-500 transition-colors"><Trash2 size={14} /></button>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </div>

      {open && (
        <div className="p-4 space-y-3">
          {section.type === 'video' && (
            <input
              className="input text-sm py-2 w-full"
              placeholder="URL de la vidéo (YouTube, Vimeo…)"
              value={section.videoUrl ?? ''}
              onChange={e => onUpdate({ ...section, videoUrl: e.target.value })}
            />
          )}
          <textarea
            className="input text-sm py-2.5 w-full resize-none"
            rows={section.type === 'text' ? 5 : 3}
            placeholder={
              section.type === 'text'  ? 'Rédigez le contenu de cette section…' :
              section.type === 'video' ? 'Description de la vidéo (optionnel)…' :
              section.type === 'quiz'  ? 'Description du quiz — les questions seront ajoutées séparément…' :
              'Description du fichier…'
            }
            value={section.content}
            onChange={e => onUpdate({ ...section, content: e.target.value })}
          />
          {section.type === 'video' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Durée (minutes)</label>
              <input type="number" min={1} max={120}
                className="input w-20 text-sm py-1.5"
                value={section.duration ?? ''}
                onChange={e => onUpdate({ ...section, duration: +e.target.value })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CourseBuilder({ course, onSave, onCancel }: {
  course: Course | null
  onSave: (c: Course) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Course>(course ?? {
    id: crypto.randomUUID(), title: '', subject: SUBJECTS[0], level: LEVELS[0],
    classNames: [], description: '', status: 'draft',
    sections: [], studentsCount: 0, completionRate: 0,
    createdAt: Date.now(), updatedAt: Date.now(),
  })

  function setField(k: keyof Course, v: any) { setForm(f => ({ ...f, [k]: v })) }

  function addSection(type: SectionType) {
    const s: CourseSection = { id: crypto.randomUUID(), type, title: '', content: '' }
    setForm(f => ({ ...f, sections: [...f.sections, s] }))
  }

  function updateSection(id: string, updated: CourseSection) {
    setForm(f => ({ ...f, sections: f.sections.map(s => s.id === id ? updated : s) }))
  }

  function deleteSection(id: string) {
    setForm(f => ({ ...f, sections: f.sections.filter(s => s.id !== id) }))
  }

  function moveSection(idx: number, dir: -1 | 1) {
    setForm(f => {
      const ss = [...f.sections]
      ;[ss[idx], ss[idx + dir]] = [ss[idx + dir], ss[idx]]
      return { ...f, sections: ss }
    })
  }

  function toggleClass(c: string) {
    setForm(f => ({
      ...f,
      classNames: f.classNames.includes(c) ? f.classNames.filter(x => x !== c) : [...f.classNames, c]
    }))
  }

  const totalDuration = form.sections.filter(s => s.type === 'video').reduce((sum, s) => sum + (s.duration ?? 0), 0)
  const canPublish = form.title.trim() && form.classNames.length > 0 && form.sections.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <button onClick={onCancel} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium">
          <ArrowLeft size={16} /> Mes cours
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700 truncate">{form.title || 'Nouveau cours'}</span>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={form.status === 'published' ? 'success' : 'gray'} size="sm">
            {form.status === 'published' ? 'Publié' : 'Brouillon'}
          </Badge>
          <Button variant="ghost" size="sm" leftIcon={<Save size={14} />}
            onClick={() => onSave({ ...form, status: 'draft', updatedAt: Date.now() })}>
            Sauvegarder
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Send size={14} />}
            disabled={!canPublish}
            onClick={() => onSave({ ...form, status: 'published', updatedAt: Date.now() })}>
            Publier
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Meta */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Informations générales</h3>
            <Input label="Titre du cours" placeholder="ex: Algèbre — Équations du 1er degré"
              value={form.title} onChange={e => setField('title', e.target.value)} />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Description courte</label>
              <textarea className="input text-sm py-2.5 w-full resize-none" rows={2}
                placeholder="Décrivez en une phrase ce que les élèves vont apprendre…"
                value={form.description} onChange={e => setField('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Matière</label>
                <select className="input py-2.5 text-sm" value={form.subject} onChange={e => setField('subject', e.target.value)}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Niveau</label>
                <select className="input py-2.5 text-sm" value={form.level} onChange={e => setField('level', e.target.value)}>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Durée vidéos</label>
                <div className="input py-2.5 text-sm text-gray-500">
                  {totalDuration > 0 ? `${totalDuration} min` : '—'}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Classes assignées</label>
              <div className="flex flex-wrap gap-2">
                {MY_CLASSES.map(c => (
                  <button key={c} onClick={() => toggleClass(c)}
                    className={cn('px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors',
                      form.classNames.includes(c)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary-300'
                    )}>{c}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                Sections ({form.sections.length})
              </h3>
            </div>

            {form.sections.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                <BookOpen size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">Aucune section — ajoutez du contenu ci-dessous</p>
              </div>
            )}

            {form.sections.map((s, i) => (
              <SectionEditor
                key={s.id}
                section={s}
                onUpdate={updated => updateSection(s.id, updated)}
                onDelete={() => deleteSection(s.id)}
                onMoveUp={() => moveSection(i, -1)}
                onMoveDown={() => moveSection(i, 1)}
                isFirst={i === 0}
                isLast={i === form.sections.length - 1}
              />
            ))}

            {/* Add section buttons */}
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(SECTION_TYPE_CONFIG) as [SectionType, typeof SECTION_TYPE_CONFIG[SectionType]][]).map(([type, cfg]) => (
                <button key={type} onClick={() => addSection(type)}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors hover:shadow-sm', cfg.color, 'border-current/20')}>
                  <Plus size={14} /> {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Course list card ──────────────────────────────────────────────────────────

function CourseCard({ course, onEdit }: { course: Course; onEdit: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-primary-200 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={course.status === 'published' ? 'success' : 'gray'} size="sm">
              {course.status === 'published' ? 'Publié' : 'Brouillon'}
            </Badge>
            <Badge variant="gray" size="sm">{course.level}</Badge>
          </div>
          <h3 className="font-bold text-gray-900 truncate">{course.title}</h3>
          <p className="text-sm text-gray-400 truncate">{course.subject} · {course.classNames.join(', ')}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1"><BookOpen size={11} />{course.sections.length} sections</span>
        {course.status === 'published' && (
          <>
            <span className="flex items-center gap-1"><Users size={11} />{course.studentsCount} élèves</span>
            <span className="flex items-center gap-1"><BarChart2 size={11} />{course.completionRate}% complétion</span>
          </>
        )}
      </div>

      {course.status === 'published' && (
        <div className="mb-3">
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-success-400 rounded-full" style={{ width: `${course.completionRate}%` }} />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-50">
        <Button variant="ghost" size="sm" leftIcon={<Eye size={13} />} className="flex-1">Aperçu</Button>
        <Button variant="secondary" size="sm" leftIcon={<Edit3 size={13} />} className="flex-1" onClick={onEdit}>Modifier</Button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TeacherCoursesPage() {
  const [courses, setCourses] = useState<Course[]>(DEMO_COURSES)
  const [editing, setEditing] = useState<Course | null | 'new'>(null)
  const [filter, setFilter]   = useState<'all' | CourseStatus>('all')

  const filtered = useMemo(() =>
    filter === 'all' ? courses : courses.filter(c => c.status === filter),
    [courses, filter]
  )

  function handleSave(updated: Course) {
    setCourses(prev => {
      const idx = prev.findIndex(c => c.id === updated.id)
      return idx >= 0 ? prev.map(c => c.id === updated.id ? updated : c) : [updated, ...prev]
    })
    setEditing(null)
  }

  if (editing !== null) {
    return (
      <CourseBuilder
        course={editing === 'new' ? null : editing}
        onSave={handleSave}
        onCancel={() => setEditing(null)}
      />
    )
  }

  const published = courses.filter(c => c.status === 'published').length
  const drafts    = courses.filter(c => c.status === 'draft').length

  return (
    <div className="px-8 py-8 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes cours</h1>
          <p className="text-sm text-gray-400 mt-0.5">{published} publiés · {drafts} brouillons</p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setEditing('new')}>
          Créer un cours
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([['all', 'Tous', courses.length], ['published', 'Publiés', published], ['draft', 'Brouillons', drafts]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
              filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}>
            {label}
            <span className={cn('text-xs rounded-full px-1.5 py-0.5', filter === key ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500')}>{count}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => (
          <CourseCard key={c.id} course={c} onEdit={() => setEditing(c)} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-600">Aucun cours dans cette catégorie</p>
            <Button variant="primary" size="sm" className="mt-4" leftIcon={<Plus size={14} />} onClick={() => setEditing('new')}>
              Créer mon premier cours
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
