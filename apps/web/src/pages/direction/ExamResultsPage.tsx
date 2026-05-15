import { useState, useMemo } from 'react'
import {
  GraduationCap, Search, ExternalLink, Download,
  TrendingUp, Users, CheckCircle2, XCircle,
  Trophy, Award, Star, Filter, RefreshCw, Medal,
  ChevronUp, ChevronDown, ChevronsUpDown
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExamType = 'CEPE' | 'BEPC' | 'BAC'
type Mention  = 'Passable' | 'Assez Bien' | 'Bien' | 'Très Bien' | 'Excellent'
type Statut   = 'Admis' | 'Ajourné' | 'Absent'
type SortKey  = 'name' | 'moyenne' | 'rang' | 'statut'
type SortDir  = 'asc' | 'desc'

interface ExamResult {
  id:        string
  name:      string
  matricule: string
  classe:    string
  serie?:    string
  moyenne:   number | null   // null = absent
  statut:    Statut
  mention?:  Mention
  rang?:     number
  annee:     string
}

// ─── Données démo ─────────────────────────────────────────────────────────────

const RESULTS: Record<ExamType, ExamResult[]> = {
  CEPE: [
    { id:'c1',  name:'Prisca Okemba',       matricule:'CEPE-2026-0001', classe:'CM2-A', moyenne:16.5, statut:'Admis',    mention:'Bien',       rang:1,  annee:'2026' },
    { id:'c2',  name:'Merveille Nkodia',    matricule:'CEPE-2026-0002', classe:'CM2-A', moyenne:15.2, statut:'Admis',    mention:'Assez Bien', rang:2,  annee:'2026' },
    { id:'c3',  name:'Joëlle Massamba',     matricule:'CEPE-2026-0003', classe:'CM2-B', moyenne:18.0, statut:'Admis',    mention:'Excellent',  rang:3,  annee:'2026' },
    { id:'c4',  name:'Rébecca Malonga',     matricule:'CEPE-2026-0004', classe:'CM2-A', moyenne:14.1, statut:'Admis',    mention:'Assez Bien', rang:4,  annee:'2026' },
    { id:'c5',  name:'Christophe Loubelo',  matricule:'CEPE-2026-0005', classe:'CM2-B', moyenne:12.8, statut:'Admis',    mention:'Passable',   rang:5,  annee:'2026' },
    { id:'c6',  name:'Daniella Moukengué',  matricule:'CEPE-2026-0006', classe:'CM2-A', moyenne:17.4, statut:'Admis',    mention:'Très Bien',  rang:6,  annee:'2026' },
    { id:'c7',  name:'Gauthier Biyela',     matricule:'CEPE-2026-0007', classe:'CM2-B', moyenne:9.5,  statut:'Ajourné', rang:undefined,        annee:'2026' },
    { id:'c8',  name:'Nadège Ngoyi',        matricule:'CEPE-2026-0008', classe:'CM2-A', moyenne:11.0, statut:'Admis',    mention:'Passable',   rang:7,  annee:'2026' },
    { id:'c9',  name:'Franck Mbouala',      matricule:'CEPE-2026-0009', classe:'CM2-B', moyenne:8.2,  statut:'Ajourné', annee:'2026' },
    { id:'c10', name:'Gloire Louzolo',      matricule:'CEPE-2026-0010', classe:'CM2-A', moyenne:null, statut:'Absent',  annee:'2026' },
    { id:'c11', name:'Élodie Nzouzi',       matricule:'CEPE-2026-0011', classe:'CM2-B', moyenne:13.5, statut:'Admis',    mention:'Passable',   rang:8,  annee:'2026' },
    { id:'c12', name:'Brice Moutombo',      matricule:'CEPE-2026-0012', classe:'CM2-A', moyenne:19.0, statut:'Admis',    mention:'Excellent',  rang:1,  annee:'2026' },
  ],
  BEPC: [
    { id:'b1',  name:'Cédric Nkoukou',      matricule:'BEPC-2026-0001', classe:'3ème-A', serie:'Général', moyenne:15.8, statut:'Admis',    mention:'Bien',       rang:1,  annee:'2026' },
    { id:'b2',  name:'Arielle Moussavou',   matricule:'BEPC-2026-0002', classe:'3ème-B', serie:'Général', moyenne:14.3, statut:'Admis',    mention:'Assez Bien', rang:2,  annee:'2026' },
    { id:'b3',  name:'Junior Nziénou',      matricule:'BEPC-2026-0003', classe:'3ème-A', serie:'Général', moyenne:17.6, statut:'Admis',    mention:'Très Bien',  rang:3,  annee:'2026' },
    { id:'b4',  name:'Flore Bouabouala',    matricule:'BEPC-2026-0004', classe:'3ème-C', serie:'Général', moyenne:10.5, statut:'Admis',    mention:'Passable',   rang:4,  annee:'2026' },
    { id:'b5',  name:'Romaric Taty',        matricule:'BEPC-2026-0005', classe:'3ème-B', serie:'Général', moyenne:7.8,  statut:'Ajourné', annee:'2026' },
    { id:'b6',  name:'Chantal Mpoukou',     matricule:'BEPC-2026-0006', classe:'3ème-A', serie:'Général', moyenne:18.2, statut:'Admis',    mention:'Excellent',  rang:5,  annee:'2026' },
    { id:'b7',  name:'Valère Loemba',       matricule:'BEPC-2026-0007', classe:'3ème-C', serie:'Général', moyenne:null, statut:'Absent',  annee:'2026' },
    { id:'b8',  name:'Laëtitia Nganga',     matricule:'BEPC-2026-0008', classe:'3ème-B', serie:'Général', moyenne:12.0, statut:'Admis',    mention:'Passable',   rang:6,  annee:'2026' },
    { id:'b9',  name:'Olivier Batéké',      matricule:'BEPC-2026-0009', classe:'3ème-A', serie:'Général', moyenne:9.1,  statut:'Ajourné', annee:'2026' },
    { id:'b10', name:'Patience Mbemba',     matricule:'BEPC-2026-0010', classe:'3ème-C', serie:'Général', moyenne:16.0, statut:'Admis',    mention:'Bien',       rang:7,  annee:'2026' },
  ],
  BAC: [
    { id:'a1',  name:'Lydiane Nzolani',     matricule:'BAC-2026-0001', classe:'Terminale', serie:'D', moyenne:16.2, statut:'Admis',    mention:'Bien',       rang:1,  annee:'2026' },
    { id:'a2',  name:'Arnaud Kibangou',     matricule:'BAC-2026-0002', classe:'Terminale', serie:'C', moyenne:18.5, statut:'Admis',    mention:'Excellent',  rang:2,  annee:'2026' },
    { id:'a3',  name:'Sylvie Makoumbou',    matricule:'BAC-2026-0003', classe:'Terminale', serie:'A', moyenne:14.0, statut:'Admis',    mention:'Assez Bien', rang:3,  annee:'2026' },
    { id:'a4',  name:'Patrick Moukala',     matricule:'BAC-2026-0004', classe:'Terminale', serie:'D', moyenne:9.4,  statut:'Ajourné', annee:'2026' },
    { id:'a5',  name:'Dayana Bansimba',     matricule:'BAC-2026-0005', classe:'Terminale', serie:'B', moyenne:17.8, statut:'Admis',    mention:'Très Bien',  rang:4,  annee:'2026' },
    { id:'a6',  name:'Raoul Ndzinga',       matricule:'BAC-2026-0006', classe:'Terminale', serie:'C', moyenne:11.5, statut:'Admis',    mention:'Passable',   rang:5,  annee:'2026' },
    { id:'a7',  name:'Charlène Lufwa',      matricule:'BAC-2026-0007', classe:'Terminale', serie:'A', moyenne:null, statut:'Absent',  annee:'2026' },
    { id:'a8',  name:'Fernand Mboukou',     matricule:'BAC-2026-0008', classe:'Terminale', serie:'D', moyenne:13.3, statut:'Admis',    mention:'Passable',   rang:6,  annee:'2026' },
    { id:'a9',  name:'Gisèle Koubemba',     matricule:'BAC-2026-0009', classe:'Terminale', serie:'B', moyenne:8.7,  statut:'Ajourné', annee:'2026' },
    { id:'a10', name:'Serge Mbanzoulou',    matricule:'BAC-2026-0010', classe:'Terminale', serie:'C', moyenne:15.5, statut:'Admis',    mention:'Bien',       rang:7,  annee:'2026' },
    { id:'a11', name:'Jolie Ngoye',         matricule:'BAC-2026-0011', classe:'Terminale', serie:'D', moyenne:19.1, statut:'Admis',    mention:'Excellent',  rang:8,  annee:'2026' },
    { id:'a12', name:'Elvis Kinounou',      matricule:'BAC-2026-0012', classe:'Terminale', serie:'A', moyenne:6.8,  statut:'Ajourné', annee:'2026' },
  ],
}

const EXAM_CONFIG: Record<ExamType, { fullName: string; level: string; color: string; bg: string; border: string; badgeColor: string }> = {
  CEPE: { fullName: 'Certificat d\'Études Primaires Élémentaires', level: 'CM2',        color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', badgeColor: 'bg-green-100 text-green-800'  },
  BEPC: { fullName: 'Brevet d\'Études du Premier Cycle',           level: '3ème',       color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  badgeColor: 'bg-blue-100 text-blue-800'    },
  BAC:  { fullName: 'Baccalauréat de l\'Enseignement Secondaire',  level: 'Terminale',  color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', badgeColor: 'bg-purple-100 text-purple-800' },
}

const YEARS = ['2026', '2025', '2024']

const MENTION_COLOR: Record<Mention, string> = {
  'Passable':   'bg-yellow-100 text-yellow-800',
  'Assez Bien': 'bg-orange-100 text-orange-800',
  'Bien':       'bg-blue-100 text-blue-800',
  'Très Bien':  'bg-indigo-100 text-indigo-800',
  'Excellent':  'bg-purple-100 text-purple-800',
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ExamResultsPage() {
  const [exam,   setExam]   = useState<ExamType>('BEPC')
  const [annee,  setAnnee]  = useState('2026')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'tous' | 'Admis' | 'Ajourné' | 'Absent'>('tous')
  const [sort,   setSort]   = useState<{ key: SortKey; dir: SortDir }>({ key: 'rang', dir: 'asc' })

  const cfg = EXAM_CONFIG[exam]
  const raw = RESULTS[exam]

  // Stats
  const total    = raw.length
  const admis    = raw.filter(r => r.statut === 'Admis').length
  const ajourne  = raw.filter(r => r.statut === 'Ajourné').length
  const absent   = raw.filter(r => r.statut === 'Absent').length
  const tauxReussite = total > 0 ? Math.round((admis / (total - absent)) * 100) : 0
  const moyGeneral = (() => {
    const notes = raw.filter(r => r.moyenne !== null).map(r => r.moyenne as number)
    return notes.length ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(2) : '—'
  })()
  const best = raw.filter(r => r.statut === 'Admis' && r.moyenne !== null)
    .sort((a, b) => (b.moyenne ?? 0) - (a.moyenne ?? 0))[0]

  // Filtrage + tri
  const filtered = useMemo(() => {
    let list = [...raw]
    if (filter !== 'tous') list = list.filter(r => r.statut === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.matricule.toLowerCase().includes(q) ||
        r.classe.toLowerCase().includes(q)
      )
    }
    list.sort((a, b) => {
      let cmp = 0
      if (sort.key === 'name')    cmp = a.name.localeCompare(b.name)
      if (sort.key === 'moyenne') cmp = (a.moyenne ?? -1) - (b.moyenne ?? -1)
      if (sort.key === 'rang')    cmp = (a.rang ?? 9999) - (b.rang ?? 9999)
      if (sort.key === 'statut')  cmp = a.statut.localeCompare(b.statut)
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return list
  }, [raw, filter, search, sort])

  function toggleSort(key: SortKey) {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }
    )
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sort.key !== k) return <ChevronsUpDown size={12} className="text-gray-400" />
    return sort.dir === 'asc'
      ? <ChevronUp size={12} className="text-primary-600" />
      : <ChevronDown size={12} className="text-primary-600" />
  }

  function exportCSV() {
    const header = ['Matricule', 'Nom', 'Classe', 'Série', 'Moyenne', 'Statut', 'Mention', 'Rang']
    const rows = filtered.map(r => [
      r.matricule, r.name, r.classe, r.serie ?? '—',
      r.moyenne ?? 'Absent', r.statut, r.mention ?? '—', r.rang ?? '—'
    ])
    const csv = [header, ...rows].map(r => r.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `resultats_${exam}_${annee}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy size={26} className="text-yellow-500" />
            Résultats des examens d'État
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Consultez les résultats officiels CEPE · BEPC · BAC — République du Congo
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Année */}
          <select
            value={annee}
            onChange={e => setAnnee(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {YEARS.map(y => (
              <option key={y} value={y}>Session {y}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download size={14} className="mr-1.5" /> Exporter CSV
          </Button>
          <Button
            size="sm"
            onClick={() => window.open('https://inscription.e-meppsa.net/', '_blank')}
          >
            <ExternalLink size={14} className="mr-1.5" /> Portail officiel
          </Button>
        </div>
      </div>

      {/* Sélecteur d'examen */}
      <div className="grid grid-cols-3 gap-4">
        {(['CEPE', 'BEPC', 'BAC'] as ExamType[]).map(e => {
          const c = EXAM_CONFIG[e]
          const res = RESULTS[e]
          const pct = Math.round((res.filter(r => r.statut === 'Admis').length / res.filter(r => r.statut !== 'Absent').length) * 100)
          return (
            <button
              key={e}
              onClick={() => setExam(e)}
              className={cn(
                'rounded-2xl border-2 p-4 text-left transition-all cursor-pointer',
                exam === e ? `${c.border} ${c.bg} shadow-md` : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-2xl font-bold', exam === e ? c.color : 'text-gray-700')}>{e}</span>
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', c.badgeColor)}>{c.level}</span>
              </div>
              <p className="text-xs text-gray-500 mb-3 line-clamp-1">{c.fullName}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{pct}% de réussite</span>
                <span className="text-xs text-gray-400">{res.length} candidats</span>
              </div>
              {/* Barre de progression */}
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', e === 'CEPE' ? 'bg-green-500' : e === 'BEPC' ? 'bg-blue-500' : 'bg-purple-500')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          )
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <Users size={20} className="mx-auto mb-1 text-gray-400" />
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500">Total candidats</p>
        </Card>
        <Card className="p-4 text-center bg-green-50 border-green-100">
          <CheckCircle2 size={20} className="mx-auto mb-1 text-green-500" />
          <p className="text-2xl font-bold text-green-700">{admis}</p>
          <p className="text-xs text-green-600">Admis</p>
        </Card>
        <Card className="p-4 text-center bg-red-50 border-red-100">
          <XCircle size={20} className="mx-auto mb-1 text-red-400" />
          <p className="text-2xl font-bold text-red-600">{ajourne}</p>
          <p className="text-xs text-red-500">Ajournés</p>
        </Card>
        <Card className="p-4 text-center bg-yellow-50 border-yellow-100">
          <TrendingUp size={20} className="mx-auto mb-1 text-yellow-500" />
          <p className="text-2xl font-bold text-yellow-700">{tauxReussite}%</p>
          <p className="text-xs text-yellow-600">Taux de réussite</p>
        </Card>
        <Card className="p-4 text-center bg-indigo-50 border-indigo-100">
          <Star size={20} className="mx-auto mb-1 text-indigo-500" />
          <p className="text-2xl font-bold text-indigo-700">{moyGeneral}</p>
          <p className="text-xs text-indigo-600">Moy. générale</p>
        </Card>
      </div>

      {/* Major de promotion */}
      {best && (
        <Card className={cn('p-4 border-2', cfg.border, cfg.bg)}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0 shadow">
              <Medal size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">🏅 Major de promotion — {exam} {annee}</p>
              <p className={cn('text-lg font-bold mt-0.5', cfg.color)}>{best.name}</p>
              <p className="text-sm text-gray-500">{best.classe}{best.serie ? ` · Série ${best.serie}` : ''} · Matricule : {best.matricule}</p>
            </div>
            <div className="text-right">
              <p className={cn('text-3xl font-bold', cfg.color)}>{best.moyenne}/20</p>
              {best.mention && (
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', MENTION_COLOR[best.mention])}>
                  {best.mention}
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Filtres + recherche */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un élève, matricule…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-gray-400" />
          {(['tous', 'Admis', 'Ajourné', 'Absent'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
                filter === f
                  ? f === 'Admis'   ? 'bg-green-600 text-white border-green-600'
                  : f === 'Ajourné' ? 'bg-red-500 text-white border-red-500'
                  : f === 'Absent'  ? 'bg-yellow-500 text-white border-yellow-500'
                  : 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              )}
            >
              {f === 'tous' ? 'Tous' : f}
              {f !== 'tous' && (
                <span className="ml-1 opacity-70">
                  ({f === 'Admis' ? admis : f === 'Ajourné' ? ajourne : absent})
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setSearch(''); setFilter('tous'); setSort({ key: 'rang', dir: 'asc' }) }}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
        >
          <RefreshCw size={12} /> Réinitialiser
        </button>
      </div>

      {/* Tableau des résultats */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 w-10">#</th>
                <th
                  className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                  onClick={() => toggleSort('name')}
                >
                  <span className="flex items-center gap-1">Élève <SortIcon k="name" /></span>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Matricule</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Classe</th>
                {exam === 'BAC' && <th className="px-4 py-3 text-left font-semibold text-gray-600">Série</th>}
                <th
                  className="px-4 py-3 text-center font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                  onClick={() => toggleSort('moyenne')}
                >
                  <span className="flex items-center justify-center gap-1">Moyenne <SortIcon k="moyenne" /></span>
                </th>
                <th
                  className="px-4 py-3 text-center font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                  onClick={() => toggleSort('rang')}
                >
                  <span className="flex items-center justify-center gap-1">Rang <SortIcon k="rang" /></span>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Mention</th>
                <th
                  className="px-4 py-3 text-center font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                  onClick={() => toggleSort('statut')}
                >
                  <span className="flex items-center justify-center gap-1">Statut <SortIcon k="statut" /></span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={exam === 'BAC' ? 9 : 8} className="px-4 py-12 text-center text-gray-400">
                    <GraduationCap size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Aucun résultat trouvé</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={cn(
                      'transition-colors hover:bg-gray-50',
                      r.statut === 'Admis'   && 'bg-white',
                      r.statut === 'Ajourné' && 'bg-red-50/40',
                      r.statut === 'Absent'  && 'bg-gray-50/60 opacity-70'
                    )}
                  >
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {r.rang === 1 && <Trophy size={14} className="text-yellow-500 flex-shrink-0" />}
                        <span className="font-medium text-gray-900">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.matricule}</td>
                    <td className="px-4 py-3 text-gray-600">{r.classe}</td>
                    {exam === 'BAC' && <td className="px-4 py-3 text-gray-600">{r.serie ?? '—'}</td>}
                    <td className="px-4 py-3 text-center">
                      {r.moyenne !== null ? (
                        <span className={cn(
                          'font-bold tabular-nums',
                          r.moyenne >= 16 ? 'text-purple-700'
                          : r.moyenne >= 14 ? 'text-blue-700'
                          : r.moyenne >= 12 ? 'text-green-700'
                          : r.moyenne >= 10 ? 'text-yellow-700'
                          : 'text-red-600'
                        )}>
                          {r.moyenne.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">Absent</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.rang ? (
                        <span className={cn(
                          'font-bold text-xs',
                          r.rang === 1 ? 'text-yellow-600' : r.rang <= 3 ? 'text-orange-500' : 'text-gray-600'
                        )}>
                          {r.rang === 1 ? '🥇' : r.rang === 2 ? '🥈' : r.rang === 3 ? '🥉' : `${r.rang}e`}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.mention ? (
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', MENTION_COLOR[r.mention])}>
                          {r.mention}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
                        r.statut === 'Admis'   ? 'bg-green-100 text-green-700'
                        : r.statut === 'Ajourné' ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-500'
                      )}>
                        {r.statut === 'Admis'   && <CheckCircle2 size={11} />}
                        {r.statut === 'Ajourné' && <XCircle size={11} />}
                        {r.statut}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer tableau */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>{filtered.length} résultat{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</span>
          <span>{exam} — Session {annee} — République du Congo (MEPPSA)</span>
        </div>
      </Card>

      {/* Lien portail officiel */}
      <Card className="p-4 bg-gradient-to-r from-primary-50 to-blue-50 border-primary-100">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Award size={20} className="text-primary-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Vérifier les résultats officiels</p>
              <p className="text-xs text-gray-500">Portail officiel MEPPSA — République du Congo</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => window.open('https://inscription.e-meppsa.net/', '_blank')}
          >
            <ExternalLink size={14} className="mr-1.5" />
            Ouvrir le portail MEPPSA
          </Button>
        </div>
      </Card>
    </div>
  )
}
