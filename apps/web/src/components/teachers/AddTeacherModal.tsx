import { useState } from 'react'
import { X, RefreshCw, Copy, Check, User, Mail, Phone, BookOpen, Lock, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Teacher } from '@/pages/direction/TeachersPage'

const ALL_SUBJECTS = [
  'Mathématiques', 'Français', 'Anglais', 'Histoire', 'Géographie',
  'Sciences', 'SVT', 'Physique', 'Chimie', 'EPS', 'Arts plastiques',
  'Musique', 'Technologie', 'Informatique', 'Philosophie', 'Littérature',
]

const ALL_CLASSES = [
  '6ème A', '6ème B', '6ème C',
  '5ème A', '5ème B',
  '4ème A', '4ème B', '4ème C',
  '3ème A', '3ème B',
]

function generateTeacherNumber(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 900 + 100)
  return `PROF-${year}-${String(rand).padStart(4, '0')}`
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

interface AddTeacherModalProps {
  onClose: () => void
  onAdd: (teacher: Teacher) => void
}

export function AddTeacherModal({ onClose, onAdd }: AddTeacherModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [copied, setCopied] = useState<string | null>(null)
  const [subjectInput, setSubjectInput] = useState('')
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false)

  const [form, setForm] = useState({
    firstName:      '',
    lastName:       '',
    email:          '',
    phone:          '',
    specialization: '',
    subjects:       [] as string[],
    classNames:     [] as string[],
  })

  const [genState, setGenState] = useState({
    teacherNumber: generateTeacherNumber(),
    tempPassword:  generateTempPassword(),
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleSubject(s: string) {
    setForm(f => ({
      ...f,
      subjects: f.subjects.includes(s)
        ? f.subjects.filter(x => x !== s)
        : [...f.subjects, s],
    }))
  }

  function toggleClass(c: string) {
    setForm(f => ({
      ...f,
      classNames: f.classNames.includes(c)
        ? f.classNames.filter(x => x !== c)
        : [...f.classNames, c],
    }))
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function regenerate() {
    setGenState({ teacherNumber: generateTeacherNumber(), tempPassword: generateTempPassword() })
  }

  const filteredSubjects = ALL_SUBJECTS.filter(
    s => s.toLowerCase().includes(subjectInput.toLowerCase()) && !form.subjects.includes(s)
  )

  function handleSubmit() {
    const email = form.email.trim() ||
      `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@ecole.fr`
        .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '')

    const newTeacher: Teacher = {
      id:               crypto.randomUUID(),
      displayName:      `${form.firstName} ${form.lastName}`,
      teacherNumber:    genState.teacherNumber,
      email,
      phone:            form.phone,
      subjects:         form.subjects.length ? form.subjects : ['Non défini'],
      classIds:         form.classNames.map(c => c.toLowerCase().replace(/\s/g, '_')),
      classNames:       form.classNames,
      studentsCount:    0,
      coursesPublished: 0,
      exercisesCreated: 0,
      avgClassScore:    0,
      status:           'active',
      lastActivity:     Date.now(),
      createdAt:        Date.now(),
      specialization:   form.specialization,
    }
    onAdd(newTeacher)
  }

  const canNext = form.firstName.trim() && form.lastName.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ajouter un professeur</h2>
            <p className="text-sm text-gray-400">
              Étape {step}/2 — {step === 1 ? 'Informations & matières' : 'Identifiants générés'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-7 pt-4 flex gap-2">
          {[1, 2].map(s => (
            <div key={s} className={cn('h-1.5 flex-1 rounded-full transition-colors', s <= step ? 'bg-primary-600' : 'bg-gray-100')} />
          ))}
        </div>

        <div className="px-7 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {step === 1 ? (
            <>
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <Input label="Prénom" placeholder="Jean" value={form.firstName}
                  onChange={e => set('firstName', e.target.value)} leftIcon={<User size={14} />} />
                <Input label="Nom de famille" placeholder="Leblanc" value={form.lastName}
                  onChange={e => set('lastName', e.target.value)} />
              </div>

              {/* Email */}
              <Input label="Email (optionnel — auto-généré si vide)" type="email"
                placeholder="j.leblanc@ecole.fr" value={form.email}
                onChange={e => set('email', e.target.value)} leftIcon={<Mail size={14} />} />

              {/* Phone */}
              <Input label="Téléphone (optionnel)" type="tel"
                placeholder="+33 6 12 34 56 78" value={form.phone}
                onChange={e => set('phone', e.target.value)} leftIcon={<Phone size={14} />} />

              {/* Specialization */}
              <Input label="Spécialisation (optionnel)"
                placeholder="ex: Algèbre & Géométrie" value={form.specialization}
                onChange={e => set('specialization', e.target.value)} leftIcon={<BookOpen size={14} />} />

              {/* Subjects */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Matières enseignées</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.subjects.map(s => (
                    <span key={s} className="flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-xl border border-primary-100">
                      {s}
                      <button onClick={() => toggleSubject(s)} className="hover:text-danger-600 transition-colors">
                        <Trash2 size={10} />
                      </button>
                    </span>
                  ))}
                  {form.subjects.length === 0 && (
                    <span className="text-xs text-gray-400">Aucune matière sélectionnée</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    className="input py-2 text-sm w-full"
                    placeholder="Rechercher une matière..."
                    value={subjectInput}
                    onChange={e => { setSubjectInput(e.target.value); setShowSubjectDropdown(true) }}
                    onFocus={() => setShowSubjectDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSubjectDropdown(false), 150)}
                  />
                  {showSubjectDropdown && filteredSubjects.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {filteredSubjects.map(s => (
                        <button
                          key={s}
                          onMouseDown={() => { toggleSubject(s); setSubjectInput('') }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-primary-50 transition-colors"
                        >
                          <Plus size={12} className="text-primary-500" /> {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Classes */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Classes assignées</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CLASSES.map(c => (
                    <button
                      key={c}
                      onClick={() => toggleClass(c)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border',
                        form.classNames.includes(c)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary-300'
                      )}
                    >{c}</button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Recap */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                  {form.firstName[0]}{form.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{form.firstName} {form.lastName}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {form.subjects.slice(0, 2).join(', ')}{form.subjects.length > 2 ? ` +${form.subjects.length - 2}` : ''}
                  </p>
                </div>
                <Badge variant="success">Actif</Badge>
              </div>

              {/* Classes recap */}
              {form.classNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.classNames.map(c => (
                    <span key={c} className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-xl border border-primary-100">{c}</span>
                  ))}
                </div>
              )}

              {/* Teacher number */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Numéro professeur (auto-généré)</label>
                  <button onClick={regenerate} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
                    <RefreshCw size={12} /> Regénérer
                  </button>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 font-mono text-sm text-gray-900">
                  <span className="flex-1">{genState.teacherNumber}</span>
                  <button onClick={() => copyToClipboard(genState.teacherNumber, 'num')}
                    className="text-gray-400 hover:text-primary-600 transition-colors">
                    {copied === 'num' ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Temp password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Lock size={14} className="text-gray-400" /> Mot de passe temporaire
                </label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 font-mono text-sm text-gray-900">
                  <span className="flex-1 tracking-widest">{genState.tempPassword}</span>
                  <button onClick={() => copyToClipboard(genState.tempPassword, 'pwd')}
                    className="text-gray-400 hover:text-primary-600 transition-colors">
                    {copied === 'pwd' ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 px-3 py-2.5 rounded-xl bg-warning-50 border border-warning-100 text-xs text-warning-700">
                <span className="flex-shrink-0">⚠️</span>
                <p>Transmettez ces identifiants au professeur. Il devra changer son mot de passe à la première connexion.</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-5 border-t border-gray-100">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={onClose}>Annuler</Button>
              <Button variant="primary" onClick={() => setStep(2)} disabled={!canNext}>
                Suivant → Générer les accès
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>← Retour</Button>
              <Button variant="primary" onClick={handleSubmit} leftIcon={<Check size={15} />}>
                Créer le professeur
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
