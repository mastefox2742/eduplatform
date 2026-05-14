import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, Trash2, ArrowUp, ArrowDown, Eye, Edit2, Copy, CheckCircle2, Circle, AlignLeft, List, ToggleLeft, FileText, Sparkles, X } from 'lucide-react'

type QuestionType = 'mcq' | 'open' | 'fill' | 'truefalse'
type ExerciseStatus = 'draft' | 'published' | 'archived'
type DifficultyLevel = 'easy' | 'medium' | 'hard'

interface MCQOption {
  id: string
  text: string
  isCorrect: boolean
}

interface Question {
  id: string
  type: QuestionType
  text: string
  points: number
  explanation?: string
  options?: MCQOption[]
  correctAnswer?: string
  blanks?: string[]
}

interface Exercise {
  id: string
  title: string
  subject: string
  level: string
  classIds: string[]
  difficulty: DifficultyLevel
  duration: number
  status: ExerciseStatus
  questions: Question[]
  description: string
  totalPoints: number
  createdAt: string
}

const SUBJECTS = ['Mathématiques', 'Français', 'Physique-Chimie', 'SVT', 'Histoire-Géo', 'Anglais', 'Informatique']
const LEVELS   = ['6ème', '5ème', '4ème', '3ème', 'Seconde', 'Première', 'Terminale']
const CLASSES  = ['5ème A', '5ème B', '6ème A', '4ème A']

const DEMO_EXERCISES: Exercise[] = [
  {
    id: 'ex1',
    title: 'Algèbre - Équations du 1er degré',
    subject: 'Mathématiques',
    level: '5ème',
    classIds: ['5ème A', '5ème B'],
    difficulty: 'medium',
    duration: 45,
    status: 'published',
    description: 'Résolution d\'équations simples et problèmes appliqués.',
    totalPoints: 20,
    createdAt: '2026-05-10',
    questions: [],
  },
  {
    id: 'ex2',
    title: 'Fractions et opérations',
    subject: 'Mathématiques',
    level: '6ème',
    classIds: ['6ème A'],
    difficulty: 'easy',
    duration: 30,
    status: 'published',
    description: 'Addition, soustraction et multiplication de fractions.',
    totalPoints: 15,
    createdAt: '2026-05-08',
    questions: [],
  },
  {
    id: 'ex3',
    title: 'Vocabulaire - La météo',
    subject: 'Anglais',
    level: '5ème',
    classIds: ['5ème A'],
    difficulty: 'easy',
    duration: 20,
    status: 'draft',
    description: 'Exercice de vocabulaire sur les conditions météorologiques.',
    totalPoints: 10,
    createdAt: '2026-05-12',
    questions: [],
  },
  {
    id: 'ex4',
    title: 'Géométrie - Théorème de Pythagore',
    subject: 'Mathématiques',
    level: '4ème',
    classIds: ['4ème A'],
    difficulty: 'hard',
    duration: 60,
    status: 'draft',
    description: 'Applications du théorème de Pythagore en géométrie plane.',
    totalPoints: 25,
    createdAt: '2026-05-13',
    questions: [],
  },
]

function newQuestion(type: QuestionType): Question {
  const id = Math.random().toString(36).slice(2)
  if (type === 'mcq') return { id, type, text: '', points: 2, options: [
    { id: 'a', text: '', isCorrect: true },
    { id: 'b', text: '', isCorrect: false },
    { id: 'c', text: '', isCorrect: false },
    { id: 'd', text: '', isCorrect: false },
  ]}
  if (type === 'truefalse') return { id, type, text: '', points: 1, options: [
    { id: 'true', text: 'Vrai', isCorrect: true },
    { id: 'false', text: 'Faux', isCorrect: false },
  ]}
  if (type === 'fill') return { id, type, text: 'La ___ est la distance entre deux points.', points: 2, correctAnswer: 'longueur' }
  return { id, type, text: '', points: 3, explanation: '' }
}

const QTYPE_META: Record<QuestionType, { label: string; icon: typeof AlignLeft; color: string }> = {
  mcq:       { label: 'QCM',              icon: List,       color: 'bg-blue-100 text-blue-700' },
  open:      { label: 'Question ouverte', icon: AlignLeft,  color: 'bg-purple-100 text-purple-700' },
  fill:      { label: 'Texte à trous',    icon: FileText,   color: 'bg-amber-100 text-amber-700' },
  truefalse: { label: 'Vrai / Faux',      icon: ToggleLeft, color: 'bg-green-100 text-green-700' },
}

const DIFF_BADGE: Record<DifficultyLevel, string> = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-red-100 text-red-700',
}
const DIFF_LABEL: Record<DifficultyLevel, string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' }

function QuestionEditor({ q, idx, total, onChange, onMove, onDelete }: {
  q: Question; idx: number; total: number
  onChange: (q: Question) => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(true)
  const meta = QTYPE_META[q.type]

  function toggleCorrect(optId: string) {
    if (!q.options) return
    const opts = q.type === 'mcq'
      ? q.options.map(o => ({ ...o, isCorrect: o.id === optId }))
      : q.options.map(o => ({ ...o, isCorrect: o.id === optId }))
    onChange({ ...q, options: opts })
  }

  function setOptionText(optId: string, text: string) {
    onChange({ ...q, options: q.options!.map(o => o.id === optId ? { ...o, text } : o) })
  }

  function addOption() {
    const newOpt: MCQOption = { id: Math.random().toString(36).slice(2), text: '', isCorrect: false }
    onChange({ ...q, options: [...(q.options || []), newOpt] })
  }

  function removeOption(optId: string) {
    onChange({ ...q, options: q.options!.filter(o => o.id !== optId) })
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
        <span className="text-sm font-bold text-gray-400 w-6">{idx + 1}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
        <span className="flex-1 text-sm text-gray-700 truncate">{q.text || 'Nouvelle question'}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
            <ArrowUp size={14} />
          </button>
          <button onClick={() => onMove(1)} disabled={idx === total - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
            <ArrowDown size={14} />
          </button>
          <button onClick={onDelete} className="p-1 text-red-400 hover:text-red-600">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setOpen(p => !p)} className="p-1 text-gray-400 hover:text-gray-600 ml-1">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="p-4 space-y-4">
          <div className="flex gap-3 items-start">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Énoncé</label>
              <textarea
                value={q.text}
                onChange={e => onChange({ ...q, text: e.target.value })}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Écrivez la question ici..."
              />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Points</label>
              <input
                type="number" min={0.5} step={0.5}
                value={q.points}
                onChange={e => onChange({ ...q, points: parseFloat(e.target.value) || 1 })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* MCQ options */}
          {(q.type === 'mcq' || q.type === 'truefalse') && q.options && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-2 block">
                {q.type === 'mcq' ? 'Propositions (cochez la bonne réponse)' : 'Réponse correcte'}
              </label>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <button onClick={() => toggleCorrect(opt.id)} className="flex-shrink-0">
                      {opt.isCorrect
                        ? <CheckCircle2 size={18} className="text-green-500" />
                        : <Circle size={18} className="text-gray-300" />
                      }
                    </button>
                    {q.type === 'mcq' ? (
                      <>
                        <span className="text-xs text-gray-400 font-mono w-4">{String.fromCharCode(65 + oi)}.</span>
                        <input
                          value={opt.text}
                          onChange={e => setOptionText(opt.id, e.target.value)}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        />
                        {q.options!.length > 2 && (
                          <button onClick={() => removeOption(opt.id)} className="text-gray-300 hover:text-red-400">
                            <X size={14} />
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-gray-700">{opt.text}</span>
                    )}
                  </div>
                ))}
                {q.type === 'mcq' && (
                  <button onClick={addOption} className="text-xs text-primary-600 hover:text-primary-700 font-medium mt-1">
                    + Ajouter une option
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Fill in the blank */}
          {q.type === 'fill' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Texte (utilisez ___ pour les trous)</label>
                <textarea
                  value={q.text}
                  onChange={e => onChange({ ...q, text: e.target.value })}
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="La ___ est..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Réponse(s) correcte(s) (séparées par /)</label>
                <input
                  value={q.correctAnswer || ''}
                  onChange={e => onChange({ ...q, correctAnswer: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="mot1 / mot2"
                />
              </div>
            </div>
          )}

          {/* Open question */}
          {q.type === 'open' && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Éléments de correction (optionnel)</label>
              <textarea
                value={q.explanation || ''}
                onChange={e => onChange({ ...q, explanation: e.target.value })}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Points attendus dans la réponse..."
              />
            </div>
          )}

          {/* Explanation for MCQ */}
          {q.type === 'mcq' && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Explication (optionnel)</label>
              <input
                value={q.explanation || ''}
                onChange={e => onChange({ ...q, explanation: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Pourquoi cette réponse est-elle correcte ?"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ExerciseBuilder({ initial, onBack }: { initial?: Exercise; onBack: () => void }) {
  const [title, setTitle]       = useState(initial?.title || '')
  const [desc, setDesc]         = useState(initial?.description || '')
  const [subject, setSubject]   = useState(initial?.subject || SUBJECTS[0])
  const [level, setLevel]       = useState(initial?.level || LEVELS[0])
  const [classes, setClasses]   = useState<string[]>(initial?.classIds || [])
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initial?.difficulty || 'medium')
  const [duration, setDuration] = useState(initial?.duration || 30)
  const [questions, setQuestions] = useState<Question[]>(initial?.questions || [])
  const [saved, setSaved]       = useState(false)

  function addQuestion(type: QuestionType) {
    setQuestions(qs => [...qs, newQuestion(type)])
  }

  function updateQuestion(idx: number, q: Question) {
    setQuestions(qs => qs.map((old, i) => i === idx ? q : old))
  }

  function moveQuestion(idx: number, dir: -1 | 1) {
    const next = idx + dir
    if (next < 0 || next >= questions.length) return
    setQuestions(qs => {
      const arr = [...qs]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  function deleteQuestion(idx: number) {
    setQuestions(qs => qs.filter((_, i) => i !== idx))
  }

  function toggleClass(cls: string) {
    setClasses(cs => cs.includes(cls) ? cs.filter(c => c !== cls) : [...cs, cls])
  }

  const totalPoints = questions.reduce((s, q) => s + q.points, 0)

  function handleSave(status: 'draft' | 'published') {
    setSaved(true)
    setTimeout(() => { setSaved(false); onBack() }, 800)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowUp size={18} className="rotate-[-90deg]" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 flex-1">
          {initial ? 'Modifier l\'exercice' : 'Nouvel exercice'}
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-300">·</span>
          <span className="font-semibold text-gray-700">{totalPoints} pts</span>
        </div>
        <button onClick={() => handleSave('draft')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
          Brouillon
        </button>
        <button onClick={() => handleSave('published')} className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${saved ? 'bg-green-500' : 'bg-primary-600 hover:bg-primary-700'}`}>
          {saved ? '✓ Publié' : 'Publier'}
        </button>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Meta sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Titre</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Titre de l'exercice" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Consignes générales..." />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Matière</label>
            <select value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Niveau</label>
            <select value={level} onChange={e => setLevel(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
              {LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Classes</label>
            <div className="flex flex-wrap gap-1.5">
              {CLASSES.map(cls => (
                <button key={cls} onClick={() => toggleClass(cls)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${classes.includes(cls) ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:border-primary-400'}`}>
                  {cls}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Difficulté</label>
            <div className="flex gap-1.5">
              {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map(d => (
                <button key={d} onClick={() => setDifficulty(d)}
                  className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors font-medium ${difficulty === d ? DIFF_BADGE[d] + ' border-transparent' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {DIFF_LABEL[d]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Durée (min)</label>
            <input type="number" min={5} step={5} value={duration} onChange={e => setDuration(parseInt(e.target.value) || 30)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>

          {/* AI hint */}
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-purple-600" />
              <span className="text-xs font-semibold text-purple-700">Génération IA</span>
            </div>
            <p className="text-xs text-purple-600">Décrivez un thème et l'IA génèrera des questions automatiquement.</p>
            <button className="mt-2 w-full text-xs py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors">
              Générer des questions
            </button>
          </div>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            {questions.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <List size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-gray-500">Aucune question</p>
                <p className="text-sm">Ajoutez des questions ci-dessous</p>
              </div>
            )}
            {questions.map((q, idx) => (
              <QuestionEditor key={q.id} q={q} idx={idx} total={questions.length}
                onChange={uq => updateQuestion(idx, uq)}
                onMove={dir => moveQuestion(idx, dir)}
                onDelete={() => deleteQuestion(idx)}
              />
            ))}
          </div>

          {/* Add question bar */}
          <div className="mt-4 p-4 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-xs font-medium text-gray-500 mb-3 text-center">Ajouter une question</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {(Object.entries(QTYPE_META) as [QuestionType, typeof QTYPE_META['mcq']][]).map(([type, meta]) => {
                const Icon = meta.icon
                return (
                  <button key={type} onClick={() => addQuestion(type)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors hover:shadow-sm ${meta.color} border-transparent`}>
                    <Icon size={14} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: ExerciseStatus }) {
  if (status === 'published') return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Publié</span>
  if (status === 'archived')  return <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">Archivé</span>
  return <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">Brouillon</span>
}

function ExerciseCard({ ex, onEdit }: { ex: Exercise; onEdit: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={ex.status} />
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_BADGE[ex.difficulty]}`}>
              {DIFF_LABEL[ex.difficulty]}
            </span>
          </div>
          <h3 className="text-base font-semibold text-gray-900 truncate">{ex.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{ex.subject} · {ex.level}</p>
        </div>
      </div>

      {ex.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ex.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
        <span>{ex.totalPoints} pts</span>
        <span>{ex.duration} min</span>
        <span>{ex.classIds.join(', ')}</span>
      </div>

      <div className="flex gap-2">
        <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-100 transition-colors">
          <Edit2 size={12} /> Modifier
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
          <Eye size={12} /> Aperçu
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
          <Copy size={12} /> Dupliquer
        </button>
      </div>
    </div>
  )
}

export function TeacherExercisesPage() {
  const [view, setView] = useState<'list' | 'builder'>('list')
  const [editing, setEditing]   = useState<Exercise | undefined>()
  const [exercises, setExercises] = useState<Exercise[]>(DEMO_EXERCISES)
  const [filter, setFilter] = useState<'all' | ExerciseStatus>('all')

  const counts = {
    all:       exercises.length,
    published: exercises.filter(e => e.status === 'published').length,
    draft:     exercises.filter(e => e.status === 'draft').length,
    archived:  exercises.filter(e => e.status === 'archived').length,
  }

  const filtered = filter === 'all' ? exercises : exercises.filter(e => e.status === filter)

  if (view === 'builder') {
    return (
      <div className="p-6 h-full">
        <ExerciseBuilder initial={editing} onBack={() => { setView('list'); setEditing(undefined) }} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exercices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Créez et gérez vos exercices interactifs</p>
        </div>
        <button
          onClick={() => { setEditing(undefined); setView('builder') }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} /> Nouvel exercice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.all, color: 'text-gray-900' },
          { label: 'Publiés', value: counts.published, color: 'text-green-600' },
          { label: 'Brouillons', value: counts.draft, color: 'text-amber-600' },
          { label: 'Archivés', value: counts.archived, color: 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([['all', 'Tous'], ['published', 'Publiés'], ['draft', 'Brouillons']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label} <span className={`ml-1 text-xs ${filter === key ? 'text-primary-600' : 'text-gray-400'}`}>{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <List size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-gray-500">Aucun exercice</p>
          <p className="text-sm">Créez votre premier exercice</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(ex => (
            <ExerciseCard key={ex.id} ex={ex} onEdit={() => { setEditing(ex); setView('builder') }} />
          ))}
        </div>
      )}
    </div>
  )
}
