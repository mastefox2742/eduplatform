import { useState } from 'react'
import { X, RefreshCw, Copy, Check, User, Mail, Phone, School, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { Student } from '@/pages/direction/StudentsPage'

const LEVELS = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']
const CLASSES: Record<string, string[]> = {
  '6ème': ['6ème A', '6ème B', '6ème C'],
  '5ème': ['5ème A', '5ème B'],
  '4ème': ['4ème A', '4ème B', '4ème C'],
  '3ème': ['3ème A', '3ème B'],
  '2nde': ['2nde A', '2nde B'],
  '1ère': ['1ère S', '1ère L', '1ère ES'],
  'Terminale': ['Terminale S', 'Terminale L', 'Terminale ES'],
}

function generateStudentNumber(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `ELV-${year}-${rand}`
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

interface AddStudentModalProps {
  onClose: () => void
  onAdd: (student: Student) => void
}

export function AddStudentModal({ onClose, onAdd }: AddStudentModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [copied, setCopied] = useState<string | null>(null)

  const [form, setForm] = useState({
    firstName:   '',
    lastName:    '',
    parentEmail: '',
    phone:       '',
    level:       '6ème',
    className:   '6ème A',
  })

  const [generated] = useState({
    studentNumber: generateStudentNumber(),
    tempPassword:  generateTempPassword(),
  })

  const [genState, setGenState] = useState(generated)

  function set(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'level') next.className = CLASSES[value]?.[0] ?? ''
      return next
    })
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function regenerate() {
    setGenState({
      studentNumber: generateStudentNumber(),
      tempPassword:  generateTempPassword(),
    })
  }

  function handleSubmit() {
    const email = `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@ecole.fr`
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '')

    const newStudent: Student = {
      id:                 crypto.randomUUID(),
      displayName:        `${form.firstName} ${form.lastName}`,
      studentNumber:      genState.studentNumber,
      email,
      levelId:            form.level.toLowerCase().replace('è', 'e').replace('è', 'e'),
      levelName:          form.level,
      classId:            form.className.toLowerCase().replace(/\s/g, '_'),
      className:          form.className,
      parentEmail:        form.parentEmail,
      avgScore:           0,
      completedExercises: 0,
      totalExercises:     0,
      attendanceRate:     100,
      status:             'active',
      lastActivity:       Date.now(),
      createdAt:          Date.now(),
      alerts:             [],
    }
    onAdd(newStudent)
  }

  const canNext = form.firstName.trim() && form.lastName.trim() &&
                  form.parentEmail.trim() && form.level && form.className

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ajouter un élève</h2>
            <p className="text-sm text-gray-400">
              Étape {step}/2 — {step === 1 ? 'Informations personnelles' : 'Identifiants générés'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-7 pt-4 flex gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                s <= step ? 'bg-primary-600' : 'bg-gray-100'
              )}
            />
          ))}
        </div>

        <div className="px-7 py-5 space-y-4">
          {step === 1 ? (
            <>
              {/* Nom & Prénom */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Prénom"
                  placeholder="Marie"
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  leftIcon={<User size={14} />}
                />
                <Input
                  label="Nom de famille"
                  placeholder="Dubois"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                />
              </div>

              {/* Email parent */}
              <Input
                label="Email du parent / tuteur"
                type="email"
                placeholder="parent@gmail.com"
                value={form.parentEmail}
                onChange={(e) => set('parentEmail', e.target.value)}
                leftIcon={<Mail size={14} />}
              />

              {/* Téléphone (optionnel) */}
              <Input
                label="Téléphone (optionnel)"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                leftIcon={<Phone size={14} />}
              />

              {/* Niveau & Classe */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Niveau</label>
                  <select
                    value={form.level}
                    onChange={(e) => set('level', e.target.value)}
                    className="input py-2.5 text-sm"
                  >
                    {LEVELS.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Classe</label>
                  <select
                    value={form.className}
                    onChange={(e) => set('className', e.target.value)}
                    className="input py-2.5 text-sm"
                  >
                    {(CLASSES[form.level] ?? []).map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Aperçu email auto-généré */}
              {form.firstName && form.lastName && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary-50 border border-primary-100">
                  <Mail size={14} className="text-primary-500 flex-shrink-0" />
                  <p className="text-sm text-primary-700">
                    Email élève : <strong>
                      {`${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@ecole.fr`
                        .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '')}
                    </strong>
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Récapitulatif */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                  {form.firstName[0]}{form.lastName[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{form.firstName} {form.lastName}</p>
                  <p className="text-sm text-gray-500">{form.className} · {form.level}</p>
                </div>
                <Badge variant="success" className="ml-auto">Actif</Badge>
              </div>

              {/* Numéro élève */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <School size={14} className="text-gray-400" />
                    Numéro d'élève (auto-généré)
                  </label>
                  <button
                    onClick={regenerate}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
                  >
                    <RefreshCw size={12} /> Regénérer
                  </button>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 font-mono text-sm text-gray-900">
                  <span className="flex-1">{genState.studentNumber}</span>
                  <button
                    onClick={() => copyToClipboard(genState.studentNumber, 'num')}
                    className="text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    {copied === 'num' ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Mot de passe temporaire */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Lock size={14} className="text-gray-400" />
                  Mot de passe temporaire
                </label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 font-mono text-sm text-gray-900">
                  <span className="flex-1 tracking-widest">{genState.tempPassword}</span>
                  <button
                    onClick={() => copyToClipboard(genState.tempPassword, 'pwd')}
                    className="text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    {copied === 'pwd' ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Note */}
              <div className="flex gap-2 px-3 py-2.5 rounded-xl bg-warning-50 border border-warning-100 text-xs text-warning-700">
                <span className="flex-shrink-0">⚠️</span>
                <p>Notez ces identifiants avant de fermer. L'élève devra changer son mot de passe à la première connexion.</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-5 border-t border-gray-100">
          {step === 1 ? (
            <>
              <Button variant="ghost" onClick={onClose}>Annuler</Button>
              <Button
                variant="primary"
                onClick={() => setStep(2)}
                disabled={!canNext}
              >
                Suivant → Générer les accès
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>← Retour</Button>
              <Button variant="primary" onClick={handleSubmit} leftIcon={<Check size={15} />}>
                Créer l'élève
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
