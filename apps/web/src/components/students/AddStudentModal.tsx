import { useState } from 'react'
import { X, RefreshCw, Copy, Check, User, Mail, Phone, School, Lock, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { supabase, usesSupabase } from '@/config/supabase'
import { useClasses } from '@/hooks/useClasses'
import type { Student } from '@/pages/direction/StudentsPage'

// Repli statique quand la verticale identité n'est pas sur Supabase (mode démo
// local / Firebase). En mode Supabase, les classes viennent de la base.
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
  const supabaseMode = usesSupabase('identite')
  const { classes: sbClasses } = useClasses()

  const [step, setStep] = useState<1 | 2>(1)
  const [copied, setCopied] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [form, setForm] = useState({
    firstName:   '',
    lastName:    '',
    parentEmail: '',
    phone:       '',
    level:       '6ème',
    className:   '6ème A',
    classId:     '',          // Supabase : identifiant réel de la classe
  })

  // Identifiants : générés par le serveur (Supabase) ou localement (démo).
  const [genState, setGenState] = useState({
    studentNumber: generateStudentNumber(),
    tempPassword:  generateTempPassword(),
    email:         '',
  })

  function set(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (!supabaseMode && field === 'level') next.className = CLASSES[value]?.[0] ?? ''
      return next
    })
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function regenerate() {
    setGenState((g) => ({
      ...g,
      studentNumber: generateStudentNumber(),
      tempPassword:  generateTempPassword(),
    }))
  }

  // ── Étape 1 → 2 ──────────────────────────────────────────────────────────
  async function handleNext() {
    if (!supabaseMode) { setStep(2); return }

    // Inscription réelle via l'Edge Function enroll-student.
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { data, error } = await supabase.functions.invoke('enroll-student', {
        body: {
          firstName:   form.firstName,
          lastName:    form.lastName,
          classId:     form.classId || null,
          parentEmail: form.parentEmail || null,
          parentName:  form.parentEmail ? `Tuteur de ${form.firstName} ${form.lastName}` : null,
          phone:       form.phone || null,
        },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(String(data.detail ?? data.error))

      setGenState({
        studentNumber: data.matricule,
        tempPassword:  data.tempPassword,
        email:         data.email,
      })
      setStep(2)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Échec de l’inscription')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Étape 2 : confirmer (rafraîchit la liste) ────────────────────────────
  function handleFinish() {
    const selected = sbClasses.find((c) => c.id === form.classId)
    const newStudent: Student = {
      id:                 crypto.randomUUID(),   // remplacé au refetch par l'id réel
      displayName:        `${form.firstName} ${form.lastName}`,
      studentNumber:      genState.studentNumber,
      email:              genState.email || '',
      levelId:            selected?.levelId ?? form.level.toLowerCase(),
      levelName:          selected?.levelName ?? form.level,
      classId:            form.classId || form.className,
      className:          selected?.name ?? form.className,
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
    onClose()
  }

  const canNext = supabaseMode
    ? form.firstName.trim() && form.lastName.trim() && form.classId
    : form.firstName.trim() && form.lastName.trim() && form.parentEmail.trim() && form.level && form.className

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Inscrire un élève</h2>
            <p className="text-sm text-gray-400">
              Étape {step}/2 — {step === 1 ? 'Informations' : 'Identifiants générés'}
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

              <Input
                label={supabaseMode ? 'Email du parent / tuteur (optionnel)' : 'Email du parent / tuteur'}
                type="email"
                placeholder="parent@gmail.com"
                value={form.parentEmail}
                onChange={(e) => set('parentEmail', e.target.value)}
                leftIcon={<Mail size={14} />}
              />

              <Input
                label="Téléphone (optionnel)"
                type="tel"
                placeholder="+242 06 123 4567"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                leftIcon={<Phone size={14} />}
              />

              {supabaseMode ? (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Classe</label>
                  <select
                    value={form.classId}
                    onChange={(e) => set('classId', e.target.value)}
                    className="input py-2.5 text-sm"
                  >
                    <option value="">— Choisir une classe —</option>
                    {sbClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {sbClasses.length === 0 && (
                    <p className="text-xs text-gray-400">Aucune classe trouvée pour cette école.</p>
                  )}
                </div>
              ) : (
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
              )}

              {submitError && (
                <div className="flex gap-2 px-3 py-2.5 rounded-xl bg-danger-50 border border-danger-100 text-xs text-danger-700">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <p>{submitError}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                  {form.firstName[0]}{form.lastName[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{form.firstName} {form.lastName}</p>
                  <p className="text-sm text-gray-500">
                    {supabaseMode
                      ? (sbClasses.find((c) => c.id === form.classId)?.name ?? '')
                      : `${form.className} · ${form.level}`}
                  </p>
                </div>
                <Badge variant="success" className="ml-auto">Inscrit</Badge>
              </div>

              {/* Numéro élève */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <School size={14} className="text-gray-400" />
                    Matricule {supabaseMode ? '(officiel)' : '(auto-généré)'}
                  </label>
                  {!supabaseMode && (
                    <button
                      onClick={regenerate}
                      className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium"
                    >
                      <RefreshCw size={12} /> Regénérer
                    </button>
                  )}
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

              {/* Identifiant de connexion (Supabase) */}
              {supabaseMode && genState.email && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Mail size={14} className="text-gray-400" />
                    Identifiant de connexion
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 font-mono text-sm text-gray-900">
                    <span className="flex-1 truncate">{genState.email}</span>
                    <button
                      onClick={() => copyToClipboard(genState.email, 'mail')}
                      className="text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      {copied === 'mail' ? <Check size={14} className="text-success-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

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
                onClick={handleNext}
                disabled={!canNext || submitting}
                leftIcon={submitting ? <Loader2 size={15} className="animate-spin" /> : undefined}
              >
                {supabaseMode
                  ? (submitting ? 'Inscription…' : 'Inscrire l’élève')
                  : 'Suivant → Générer les accès'}
              </Button>
            </>
          ) : (
            <>
              {!supabaseMode && (
                <Button variant="ghost" onClick={() => setStep(1)}>← Retour</Button>
              )}
              <Button
                variant="primary"
                onClick={handleFinish}
                leftIcon={<Check size={15} />}
                className={supabaseMode ? 'ml-auto' : ''}
              >
                Terminer
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
