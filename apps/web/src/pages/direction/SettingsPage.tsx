import { useState } from 'react'
import {
  School, Bell, Shield, Palette, Globe,
  Save, ChevronRight, Check, Mail, Smartphone
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

type Section = 'school' | 'notifications' | 'security' | 'appearance'

function SectionNav({ active, onChange }: { active: Section; onChange: (s: Section) => void }) {
  const items: { key: Section; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'school',        label: 'Établissement',  icon: <School size={16} />,  desc: 'Nom, année, calendrier' },
    { key: 'notifications', label: 'Notifications',  icon: <Bell size={16} />,    desc: 'Alertes et emails' },
    { key: 'security',      label: 'Sécurité',       icon: <Shield size={16} />,  desc: 'Accès et permissions' },
    { key: 'appearance',    label: 'Apparence',      icon: <Palette size={16} />, desc: 'Thème et langue' },
  ]
  return (
    <nav className="w-56 flex-shrink-0 space-y-1">
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
            active === item.key ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <span className={active === item.key ? 'text-primary-600' : 'text-gray-400'}>{item.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-none">{item.label}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.desc}</p>
          </div>
          <ChevronRight size={14} className={active === item.key ? 'text-primary-400' : 'text-gray-200'} />
        </button>
      ))}
    </nav>
  )
}

function Toggle({ value, onChange, label, desc }: {
  value: boolean; onChange: (v: boolean) => void; label: string; desc?: string
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'w-10 h-6 rounded-full transition-colors relative flex-shrink-0',
          value ? 'bg-primary-600' : 'bg-gray-200'
        )}
      >
        <span className={cn(
          'w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm',
          value ? 'translate-x-5' : 'translate-x-1'
        )} />
      </button>
    </div>
  )
}

function SchoolSection() {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name:       'Collège Victor Hugo',
    address:    '12 rue de la Paix, 75001 Paris',
    phone:      '+33 1 42 00 00 00',
    email:      'contact@college-victorhugo.fr',
    year:       '2025-2026',
    startDate:  '2025-09-01',
    endDate:    '2026-06-30',
    maxPerClass:'30',
  })
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Informations de l'établissement</h2>
        <p className="text-sm text-gray-400">Paramètres généraux de votre école</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Identité</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Nom de l'établissement" value={form.name} onChange={e => set('name', e.target.value)} leftIcon={<School size={14} />} />
          </div>
          <div className="col-span-2">
            <Input label="Adresse" value={form.address} onChange={e => set('address', e.target.value)} />
          </div>
          <Input label="Téléphone" value={form.phone} onChange={e => set('phone', e.target.value)} />
          <Input label="Email de contact" type="email" value={form.email} onChange={e => set('email', e.target.value)} leftIcon={<Mail size={14} />} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Année scolaire</h3>
        <div className="grid grid-cols-3 gap-4">
          <Input label="Année en cours" value={form.year} onChange={e => set('year', e.target.value)} leftIcon={<Globe size={14} />} />
          <Input label="Début d'année" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <Input label="Fin d'année" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Paramètres pédagogiques</h3>
        <div className="grid grid-cols-3 gap-4">
          <Input label="Élèves max par classe" type="number" value={form.maxPerClass} onChange={e => set('maxPerClass', e.target.value)} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Système de notation</label>
            <select className="input py-2.5 text-sm">
              <option>Sur 20 points</option>
              <option>Sur 100 points</option>
              <option>A–F (américain)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Nombre de trimestres</label>
            <select className="input py-2.5 text-sm">
              <option>3 trimestres</option>
              <option>2 semestres</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={save} leftIcon={saved ? <Check size={15} /> : <Save size={15} />}>
          {saved ? 'Enregistré !' : 'Enregistrer les modifications'}
        </Button>
      </div>
    </div>
  )
}

function NotificationsSection() {
  const [email,   setEmail]   = useState({ alerts: true,  weekly: true,  absences: true,  newStudent: false })
  const [push,    setPush]    = useState({ alerts: true,  absences: true, messages: true })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-400">Configurez comment et quand vous êtes alerté</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={16} className="text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-700">Notifications par email</h3>
        </div>
        <div className="divide-y divide-gray-50">
          <Toggle value={email.alerts}    onChange={v => setEmail(s => ({ ...s, alerts: v }))}    label="Alertes urgentes"            desc="Élèves absents 3+ jours, moyennes critiques" />
          <Toggle value={email.weekly}    onChange={v => setEmail(s => ({ ...s, weekly: v }))}    label="Rapport hebdomadaire"        desc="Résumé des performances chaque lundi" />
          <Toggle value={email.absences}  onChange={v => setEmail(s => ({ ...s, absences: v }))}  label="Absences non justifiées"     desc="Dès qu'une absence est enregistrée" />
          <Toggle value={email.newStudent}onChange={v => setEmail(s => ({ ...s, newStudent: v }))}label="Nouvel élève inscrit"         desc="Confirmation d'inscription" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone size={16} className="text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-700">Notifications push</h3>
        </div>
        <div className="divide-y divide-gray-50">
          <Toggle value={push.alerts}   onChange={v => setPush(s => ({ ...s, alerts: v }))}   label="Alertes critiques"   desc="Notifications immédiates sur mobile" />
          <Toggle value={push.absences} onChange={v => setPush(s => ({ ...s, absences: v }))} label="Absences du jour"    desc="Récapitulatif en fin de journée" />
          <Toggle value={push.messages} onChange={v => setPush(s => ({ ...s, messages: v }))} label="Messages parents"    desc="Dès réception d'un message" />
        </div>
      </div>
    </div>
  )
}

function SecuritySection() {
  const [twoFactor, setTwoFactor] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState('8h')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Sécurité</h2>
        <p className="text-sm text-gray-400">Gérez les accès et la sécurité de la plateforme</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Authentification</h3>
        <div className="divide-y divide-gray-50">
          <Toggle value={twoFactor} onChange={setTwoFactor}
            label="Double authentification (2FA)"
            desc="Recommandé pour tous les comptes direction et professeurs" />
        </div>
        <div className="space-y-1.5 pt-2">
          <label className="block text-sm font-medium text-gray-700">Expiration de session</label>
          <select className="input py-2.5 text-sm max-w-xs" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)}>
            <option value="1h">1 heure</option>
            <option value="4h">4 heures</option>
            <option value="8h">8 heures (recommandé)</option>
            <option value="24h">24 heures</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Permissions par rôle</h3>
        <div className="space-y-3">
          {[
            { role: 'Admin',      color: 'bg-danger-100 text-danger-700',    perms: ['Tout accès', 'Gestion des utilisateurs', 'Paramètres système'] },
            { role: 'Direction',  color: 'bg-primary-100 text-primary-700',  perms: ['Gestion élèves/profs', 'Rapports', 'Paramètres école'] },
            { role: 'Professeur', color: 'bg-success-100 text-success-700',  perms: ['Ses classes', 'Créer cours/exercices', 'Notes'] },
            { role: 'Élève',      color: 'bg-gray-100 text-gray-600',        perms: ['Ses cours', 'Ses exercices', 'Son profil'] },
          ].map(r => (
            <div key={r.role} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
              <span className={cn('text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0', r.color)}>{r.role}</span>
              <div className="flex flex-wrap gap-1.5">
                {r.perms.map(p => (
                  <span key={p} className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded-lg border border-gray-100">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AppearanceSection() {
  const [theme, setTheme]   = useState<'light' | 'dark' | 'auto'>('light')
  const [lang,  setLang]    = useState('fr')
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Apparence</h2>
        <p className="text-sm text-gray-400">Personnalisez l'interface de la plateforme</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Thème</h3>
        <div className="flex gap-3">
          {(['light', 'dark', 'auto'] as const).map(t => (
            <button key={t} onClick={() => setTheme(t)}
              className={cn(
                'flex-1 py-3 rounded-xl border text-sm font-medium transition-colors capitalize',
                theme === t ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              )}>
              {t === 'light' ? '☀️ Clair' : t === 'dark' ? '🌙 Sombre' : '⚙️ Système'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Langue & région</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Langue</label>
            <select className="input py-2.5 text-sm" value={lang} onChange={e => setLang(e.target.value)}>
              <option value="fr">🇫🇷 Français</option>
              <option value="en">🇬🇧 English</option>
              <option value="ar">🇲🇦 العربية</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Fuseau horaire</label>
            <select className="input py-2.5 text-sm">
              <option>Europe/Paris (UTC+1)</option>
              <option>Europe/London (UTC+0)</option>
              <option>Africa/Abidjan (UTC+0)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Densité d'affichage</h3>
        <div className="flex gap-3">
          {(['comfortable', 'compact'] as const).map(d => (
            <button key={d} onClick={() => setDensity(d)}
              className={cn(
                'flex-1 py-3 rounded-xl border text-sm font-medium transition-colors',
                density === d ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              )}>
              {d === 'comfortable' ? 'Confortable' : 'Compact'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const [section, setSection] = useState<Section>('school')

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-400 mt-0.5">Configuration de la plateforme</p>
      </div>

      <div className="flex gap-8">
        <SectionNav active={section} onChange={setSection} />
        <div className="flex-1 min-w-0">
          {section === 'school'        && <SchoolSection />}
          {section === 'notifications' && <NotificationsSection />}
          {section === 'security'      && <SecuritySection />}
          {section === 'appearance'    && <AppearanceSection />}
        </div>
      </div>
    </div>
  )
}
