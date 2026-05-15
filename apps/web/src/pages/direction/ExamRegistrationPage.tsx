import { useState } from 'react'
import {
  GraduationCap, FileText, CheckCircle2, AlertCircle,
  ExternalLink, Download, Search, ChevronRight,
  BookOpen, Award, ClipboardList, Users, Printer,
  Clock, Info
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExamType = 'CEPE' | 'BEPC' | 'BAC'

interface ExamConfig {
  id:          ExamType
  label:       string
  fullName:    string
  level:       string
  color:       string
  bg:          string
  border:      string
  description: string
  deadline:    string
  conditions:  string[]
  dossier:     { doc: string; obligatoire: boolean; note?: string }[]
  frais:       string
  ministereUrl: string
}

interface EligibleStudent {
  id:       string
  name:     string
  classe:   string
  moy:      number
  absences: number
  eligible: boolean
  dossierStatus: 'non_commencé' | 'en_cours' | 'complet'
}

// ─── Config des examens (République du Congo) ──────────────────────────────────

const EXAMS: ExamConfig[] = [
  {
    id:        'CEPE',
    label:     'CEPE',
    fullName:  'Certificat d\'Études Primaires Élémentaires',
    level:     'CM2',
    color:     'text-emerald-700',
    bg:        'bg-emerald-50',
    border:    'border-emerald-200',
    description: 'Examen sanctionnant la fin du cycle primaire. Organisé par la Direction des Examens et Concours du Ministère de l\'Enseignement Primaire.',
    deadline:  '31 mars 2026',
    conditions: [
      'Être régulièrement inscrit en classe de CM2',
      'Avoir suivi l\'intégralité du programme de CM2',
      'Justifier d\'une assiduité d\'au moins 80% des cours',
      'Avoir une moyenne générale ≥ 8/20 au 2ème trimestre',
      'Ne pas avoir fait l\'objet d\'une exclusion définitive',
    ],
    dossier: [
      { doc: 'Extrait d\'acte de naissance (original + 2 copies)',          obligatoire: true  },
      { doc: 'Certificat de nationalité congolaise',                        obligatoire: true  },
      { doc: 'Certificat de fréquentation scolaire en CM2',                 obligatoire: true  },
      { doc: '4 photos d\'identité récentes (format 4×4)',                  obligatoire: true  },
      { doc: 'Bulletin scolaire du 2ème trimestre (original)',               obligatoire: true  },
      { doc: 'Fiche d\'inscription signée par le directeur d\'école',        obligatoire: true  },
      { doc: 'Quittance de paiement des frais d\'inscription (DFEP)',        obligatoire: true  },
      { doc: 'Certificat médical de moins de 3 mois',                       obligatoire: false, note: 'Recommandé' },
    ],
    frais: '500 FCFA',
    ministereUrl: 'http://www.men.cg',
  },
  {
    id:        'BEPC',
    label:     'BEPC',
    fullName:  'Brevet d\'Études du Premier Cycle',
    level:     '3ème',
    color:     'text-blue-700',
    bg:        'bg-blue-50',
    border:    'border-blue-200',
    description: 'Examen sanctionnant la fin du premier cycle de l\'enseignement secondaire. Organisé par la Direction des Examens et Concours (DEXCO).',
    deadline:  '28 février 2026',
    conditions: [
      'Être régulièrement inscrit en classe de 3ème',
      'Être titulaire du CEPE ou d\'un diplôme équivalent reconnu',
      'Avoir suivi le programme complet du 1er cycle secondaire',
      'Justifier d\'une assiduité d\'au moins 80% des cours',
      'Avoir une moyenne générale ≥ 8/20 au cours du 1er semestre',
      'Ne pas avoir fait l\'objet d\'une exclusion définitive de l\'établissement',
    ],
    dossier: [
      { doc: 'Extrait d\'acte de naissance (original + 2 copies légalisées)',obligatoire: true  },
      { doc: 'Certificat de nationalité congolaise',                         obligatoire: true  },
      { doc: 'Certificat de scolarité en 3ème (année en cours)',              obligatoire: true  },
      { doc: '4 photos d\'identité récentes (format 4×4)',                   obligatoire: true  },
      { doc: 'Diplôme du CEPE (original + copie légalisée)',                 obligatoire: true  },
      { doc: 'Bulletins de notes 1er et 2ème trimestre (originaux)',          obligatoire: true  },
      { doc: 'Fiche d\'inscription signée par le chef d\'établissement',      obligatoire: true  },
      { doc: 'Quittance de paiement des frais d\'inscription (DEXCO)',        obligatoire: true  },
      { doc: 'Certificat médical de moins de 3 mois',                        obligatoire: false, note: 'Recommandé' },
      { doc: 'Autorisation parentale (si élève mineur)',                     obligatoire: false, note: 'Si moins de 18 ans' },
    ],
    frais: '1 500 FCFA',
    ministereUrl: 'https://dexco.cg',
  },
  {
    id:        'BAC',
    label:     'BAC',
    fullName:  'Baccalauréat de l\'Enseignement Secondaire',
    level:     'Terminale',
    color:     'text-purple-700',
    bg:        'bg-purple-50',
    border:    'border-purple-200',
    description: 'Examen sanctionnant la fin du second cycle de l\'enseignement secondaire. Organisé par la DEXCO — Direction des Examens et Concours.',
    deadline:  '31 janvier 2026',
    conditions: [
      'Être régulièrement inscrit en classe de Terminale (A, B, C, D, E ou G)',
      'Être titulaire du BEPC ou d\'un brevet équivalent reconnu',
      'Avoir accompli le cycle complet des classes de Seconde, Première et Terminale',
      'Justifier d\'une assiduité d\'au moins 80% des cours de l\'année',
      'Avoir une moyenne générale ≥ 8/20 au 1er semestre de Terminale',
      'Avoir validé les épreuves de contrôle continu (ECC) dans toutes les matières',
      'Ne pas être en situation d\'exclusion définitive',
    ],
    dossier: [
      { doc: 'Extrait d\'acte de naissance (original + 3 copies légalisées)',  obligatoire: true  },
      { doc: 'Certificat de nationalité congolaise',                           obligatoire: true  },
      { doc: 'Certificat de scolarité en Terminale (année en cours)',           obligatoire: true  },
      { doc: '6 photos d\'identité récentes (format 4×4)',                     obligatoire: true  },
      { doc: 'Diplôme du BEPC (original + copie légalisée)',                   obligatoire: true  },
      { doc: 'Bulletins de notes 1ère et Terminale (1er et 2ème trimestres)',   obligatoire: true  },
      { doc: 'Relevé des notes du contrôle continu (ECC)',                     obligatoire: true  },
      { doc: 'Fiche d\'inscription signée par le proviseur et cachet officiel', obligatoire: true  },
      { doc: 'Quittance de paiement des frais d\'inscription (DEXCO)',          obligatoire: true  },
      { doc: 'Certificat médical de moins de 3 mois',                          obligatoire: true  },
      { doc: 'Attestation de l\'option de série (A/B/C/D/E/G)',                obligatoire: true  },
      { doc: 'Autorisation parentale notariée (si mineur)',                    obligatoire: false, note: 'Si moins de 18 ans' },
    ],
    frais: '3 000 FCFA',
    ministereUrl: 'https://dexco.cg',
  },
]

// ─── Élèves éligibles (demo) ──────────────────────────────────────────────────

const ELIGIBLE_STUDENTS: Record<ExamType, EligibleStudent[]> = {
  CEPE: [
    { id: 'e1', name: 'Emmanuel Moukala',    classe: 'CM2 A', moy: 14.5, absences: 3,  eligible: true,  dossierStatus: 'complet'       },
    { id: 'e2', name: 'Prisca Ndinga',        classe: 'CM2 A', moy: 12.8, absences: 5,  eligible: true,  dossierStatus: 'en_cours'      },
    { id: 'e3', name: 'Freddy Mayoka',        classe: 'CM2 B', moy: 11.2, absences: 8,  eligible: true,  dossierStatus: 'non_commencé'  },
    { id: 'e4', name: 'Ornella Loubaki',      classe: 'CM2 B', moy: 15.9, absences: 1,  eligible: true,  dossierStatus: 'complet'       },
    { id: 'e5', name: 'Christian Mbemba',     classe: 'CM2 A', moy: 7.2,  absences: 24, eligible: false, dossierStatus: 'non_commencé'  },
  ],
  BEPC: [
    { id: 'b1', name: 'Darcel Nguesso',       classe: '3ème A', moy: 13.4, absences: 4,  eligible: true,  dossierStatus: 'complet'       },
    { id: 'b2', name: 'Synthia Makosso',      classe: '3ème A', moy: 11.7, absences: 6,  eligible: true,  dossierStatus: 'en_cours'      },
    { id: 'b3', name: 'Jaurès Nkounkou',      classe: '3ème B', moy: 9.8,  absences: 12, eligible: true,  dossierStatus: 'non_commencé'  },
    { id: 'b4', name: 'Grâce Itoua',          classe: '3ème B', moy: 16.2, absences: 2,  eligible: true,  dossierStatus: 'complet'       },
    { id: 'b5', name: 'Héritier Boukaka',     classe: '3ème A', moy: 14.1, absences: 3,  eligible: true,  dossierStatus: 'en_cours'      },
    { id: 'b6', name: 'Laure Mpassi',         classe: '3ème B', moy: 6.5,  absences: 30, eligible: false, dossierStatus: 'non_commencé'  },
  ],
  BAC: [
    { id: 'c1', name: 'Joël Okombi',          classe: 'Tle D',  moy: 14.8, absences: 5,  eligible: true,  dossierStatus: 'complet'       },
    { id: 'c2', name: 'Régina Moukassa',      classe: 'Tle A',  moy: 13.1, absences: 7,  eligible: true,  dossierStatus: 'en_cours'      },
    { id: 'c3', name: 'Arnaud Taty',          classe: 'Tle C',  moy: 15.6, absences: 2,  eligible: true,  dossierStatus: 'complet'       },
    { id: 'c4', name: 'Marlène Bouanga',      classe: 'Tle D',  moy: 10.4, absences: 14, eligible: true,  dossierStatus: 'non_commencé'  },
    { id: 'c5', name: 'Princely Ngatsono',    classe: 'Tle B',  moy: 12.9, absences: 8,  eligible: true,  dossierStatus: 'en_cours'      },
    { id: 'c6', name: 'Gaëlle Loemba',        classe: 'Tle A',  moy: 17.3, absences: 1,  eligible: true,  dossierStatus: 'complet'       },
    { id: 'c7', name: 'Patrick Ossomba',      classe: 'Tle C',  moy: 7.1,  absences: 28, eligible: false, dossierStatus: 'non_commencé'  },
  ],
}

// ─── Composants ───────────────────────────────────────────────────────────────

function DossierBadge({ status }: { status: EligibleStudent['dossierStatus'] }) {
  if (status === 'complet')     return <Badge variant="success">✓ Complet</Badge>
  if (status === 'en_cours')    return <Badge variant="warning">En cours</Badge>
  return <Badge variant="secondary">Non commencé</Badge>
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function ExamRegistrationPage() {
  const [activeExam, setActiveExam] = useState<ExamType>('BEPC')
  const [search, setSearch]         = useState('')
  const [activeTab, setActiveTab]   = useState<'info' | 'dossier' | 'eleves'>('info')
  const [students, setStudents]     = useState(ELIGIBLE_STUDENTS)

  const exam     = EXAMS.find(e => e.id === activeExam)!
  const eligible = students[activeExam]

  const filtered = eligible.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.classe.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:       eligible.length,
    eligibles:   eligible.filter(s => s.eligible).length,
    complets:    eligible.filter(s => s.dossierStatus === 'complet').length,
    enCours:     eligible.filter(s => s.dossierStatus === 'en_cours').length,
  }

  function marquerDossier(id: string, status: EligibleStudent['dossierStatus']) {
    setStudents(prev => ({
      ...prev,
      [activeExam]: prev[activeExam].map(s => s.id === id ? { ...s, dossierStatus: status } : s),
    }))
  }

  return (
    <div className="space-y-6 max-w-6xl">

      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="text-primary-600" size={26} />
            Inscriptions aux Examens d'État
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            République du Congo — Préparez et soumettez les dossiers d'inscription CEPE · BEPC · BAC
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(exam.ministereUrl, '_blank')}
          className="flex items-center gap-2"
        >
          <ExternalLink size={14} />
          Site du Ministère
        </Button>
      </div>

      {/* Sélecteur d'examen */}
      <div className="grid grid-cols-3 gap-4">
        {EXAMS.map(e => (
          <button
            key={e.id}
            onClick={() => { setActiveExam(e.id); setActiveTab('info') }}
            className={cn(
              'text-left p-5 rounded-2xl border-2 transition-all',
              activeExam === e.id
                ? `${e.border} ${e.bg} shadow-md`
                : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn('text-2xl font-black', e.color)}>{e.label}</span>
              <GraduationCap className={activeExam === e.id ? e.color : 'text-gray-300'} size={22} />
            </div>
            <p className="text-xs font-semibold text-gray-700">{e.level}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-tight">{e.fullName}</p>
            <div className="flex items-center gap-1 mt-3">
              <Clock size={11} className="text-orange-400" />
              <span className="text-xs text-orange-600 font-medium">Date limite : {e.deadline}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Stats de l'examen sélectionné */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Élèves concernés"  value={stats.total}     sub={`Classe de ${exam.level}`} color="text-gray-800" />
        <StatCard label="Éligibles"         value={stats.eligibles} sub="Conditions remplies"       color="text-emerald-600" />
        <StatCard label="Dossiers complets" value={stats.complets}  sub="Prêts à soumettre"          color="text-blue-600" />
        <StatCard label="En cours"          value={stats.enCours}   sub="À compléter"               color="text-orange-500" />
      </div>

      {/* Onglets de contenu */}
      <Card className="overflow-hidden">
        <div className="flex border-b border-gray-100">
          {([
            { id: 'info',    label: 'Conditions & Infos',  icon: Info         },
            { id: 'dossier', label: 'Pièces du dossier',   icon: FileText     },
            { id: 'eleves',  label: `Élèves (${stats.eligibles})`, icon: Users },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-6 py-3.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ── Onglet Conditions ── */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className={cn('rounded-xl p-5 border', exam.bg, exam.border)}>
                <h3 className={cn('font-bold text-base mb-1', exam.color)}>
                  {exam.label} — {exam.fullName}
                </h3>
                <p className="text-sm text-gray-600">{exam.description}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Conditions d'admission
                </h4>
                <ul className="space-y-2">
                  {exam.conditions.map((cond, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                        {i + 1}
                      </span>
                      {cond}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Date limite d'inscription</p>
                  <p className="text-lg font-bold text-orange-800">{exam.deadline}</p>
                  <p className="text-xs text-orange-600 mt-1">Dépôt des dossiers à la DEXCO</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Frais d'inscription</p>
                  <p className="text-lg font-bold text-blue-800">{exam.frais}</p>
                  <p className="text-xs text-blue-600 mt-1">À verser à la caisse du Ministère</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <strong>Inscription en ligne :</strong> Après avoir préparé le dossier complet de chaque élève dans l'onglet <em>Élèves</em>,
                  rendez-vous sur le site officiel du Ministère pour finaliser l'inscription.
                  Le dossier physique devra ensuite être déposé à la Direction Départementale de l'Enseignement.
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setActiveTab('dossier')} className="flex items-center gap-2">
                  <FileText size={15} />
                  Voir les pièces requises
                </Button>
                <Button variant="outline" onClick={() => setActiveTab('eleves')} className="flex items-center gap-2">
                  <Users size={15} />
                  Gérer les élèves
                </Button>
              </div>
            </div>
          )}

          {/* ── Onglet Dossier ── */}
          {activeTab === 'dossier' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">
                  Pièces constitutives du dossier — {exam.label}
                </h4>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Download size={14} />
                  Télécharger la liste (PDF)
                </Button>
              </div>

              <div className="space-y-2">
                {exam.dossier.map((piece, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-xl border',
                      piece.obligatoire
                        ? 'bg-white border-gray-200'
                        : 'bg-gray-50 border-dashed border-gray-200'
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5',
                      piece.obligatoire ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500'
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className={cn('text-sm font-medium', piece.obligatoire ? 'text-gray-900' : 'text-gray-500')}>
                        {piece.doc}
                      </p>
                      {piece.note && (
                        <p className="text-xs text-orange-600 mt-0.5">{piece.note}</p>
                      )}
                    </div>
                    <span className={cn(
                      'text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0',
                      piece.obligatoire
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-500'
                    )}>
                      {piece.obligatoire ? 'Obligatoire' : 'Optionnel'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm font-semibold text-blue-800 mb-1">
                  📋 {exam.dossier.filter(p => p.obligatoire).length} pièces obligatoires · {exam.dossier.filter(p => !p.obligatoire).length} optionnelles
                </p>
                <p className="text-xs text-blue-600">
                  Tous les documents originaux doivent être présentés avec leurs copies légalisées par un officier public compétent.
                </p>
              </div>

              <Button
                onClick={() => window.open(exam.ministereUrl, '_blank')}
                className="flex items-center gap-2 w-full justify-center"
              >
                <ExternalLink size={15} />
                Inscrire les élèves sur le site du Ministère ({exam.label})
              </Button>
            </div>
          )}

          {/* ── Onglet Élèves ── */}
          {activeTab === 'eleves' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Rechercher un élève..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  leftIcon={<Search size={15} />}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 flex-shrink-0"
                  onClick={() => window.open(exam.ministereUrl, '_blank')}
                >
                  <ExternalLink size={14} />
                  Site Ministère
                </Button>
                <Button size="sm" className="flex items-center gap-2 flex-shrink-0">
                  <Printer size={14} />
                  Imprimer liste
                </Button>
              </div>

              {/* Légende */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Éligible
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Non éligible
                </span>
                <span className="ml-auto">
                  {filtered.filter(s => s.eligible).length} / {filtered.length} éligibles
                </span>
              </div>

              {/* Table élèves */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Élève</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Classe</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Moy.</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Abs.</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Éligible</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Dossier</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(s => (
                      <tr key={s.id} className={cn('hover:bg-gray-50 transition-colors', !s.eligible && 'opacity-60')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                              {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="font-medium text-gray-900">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{s.classe}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            'font-semibold',
                            s.moy >= 14 ? 'text-emerald-600' : s.moy >= 10 ? 'text-blue-600' : 'text-red-500'
                          )}>
                            {s.moy.toFixed(1)}/20
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{s.absences}j</td>
                        <td className="px-4 py-3 text-center">
                          {s.eligible
                            ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                            : <AlertCircle  size={16} className="text-red-400 mx-auto"    />
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          <DossierBadge status={s.dossierStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {s.eligible && s.dossierStatus !== 'complet' && (
                              <button
                                onClick={() => marquerDossier(s.id, s.dossierStatus === 'non_commencé' ? 'en_cours' : 'complet')}
                                className="text-xs px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium"
                              >
                                {s.dossierStatus === 'non_commencé' ? 'Commencer' : 'Marquer complet'}
                              </button>
                            )}
                            {s.eligible && s.dossierStatus === 'complet' && (
                              <button
                                onClick={() => window.open(exam.ministereUrl, '_blank')}
                                className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium flex items-center gap-1"
                              >
                                <ExternalLink size={11} />
                                Inscrire
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bouton inscription groupée */}
              {stats.complets > 0 && (
                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div>
                    <p className="font-semibold text-emerald-800">
                      {stats.complets} dossier{stats.complets > 1 ? 's' : ''} complet{stats.complets > 1 ? 's' : ''} prêt{stats.complets > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      Cliquez pour inscrire ces élèves sur le portail du Ministère
                    </p>
                  </div>
                  <Button
                    onClick={() => window.open(exam.ministereUrl, '_blank')}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <ExternalLink size={15} />
                    Inscrire {stats.complets} élève{stats.complets > 1 ? 's' : ''} →
                  </Button>
                </div>
              )}
            </div>
          )}

        </div>
      </Card>

    </div>
  )
}
