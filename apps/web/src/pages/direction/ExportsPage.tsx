/**
 * ExportsPage — Direction : Export universel + Rapports ministériels
 *
 * Interface web pour déclencher les exports XLSX/CSV et générer
 * les documents officiels demandés par le Ministère.
 */
import { useState, useEffect } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getFirestore, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { useAuthStore } from '@/store/auth.store'
import { Download, FileSpreadsheet, FileText, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExportJob {
  id:          string
  dataset:     string
  format:      string
  status:      'queued' | 'processing' | 'done' | 'error'
  rowCount?:   number
  signedUrl?:  string
  filename?:   string
  errorMsg?:   string
  requestedAt: number
  completedAt?: number
}

interface ComplianceResult {
  eligible:         number
  missing:          number
  readyToGenerate:  boolean
  missingList:      { studentId: string; name: string; fields: string[] }[]
}

// ── Config datasets ───────────────────────────────────────────────────────────

const DATASETS = [
  { id: 'students',   label: 'Liste des élèves',        icon: '👨‍🎓', desc: 'Noms, classes, matricules, contacts parents' },
  { id: 'grades',     label: 'Notes & Bulletins',        icon: '📊', desc: 'Moyennes, mentions, appréciations par trimestre' },
  { id: 'attendance', label: 'Présences',                icon: '📋', desc: 'Registre d\'appel par classe et par jour' },
  { id: 'payments',   label: 'Paiements scolarité',      icon: '💳', desc: 'Historique des paiements Mobile Money + reçus' },
]

const REPORTS = [
  { id: 'liste_effectifs',       label: 'Liste des effectifs',        icon: '📄', exam: false },
  { id: 'cepe_inscription',      label: 'Inscription CEPE',           icon: '🎓', exam: true  },
  { id: 'bepc_inscription',      label: 'Inscription BEPC',           icon: '🎓', exam: true  },
  { id: 'bac_inscription',       label: 'Inscription BAC',            icon: '🎓', exam: true  },
  { id: 'statistiques_annuelles',label: 'Statistiques annuelles',     icon: '📈', exam: false },
]

const STATUS_CFG = {
  queued:     { label: 'En file',   color: 'bg-gray-100 text-gray-600',   icon: Clock         },
  processing: { label: 'En cours',  color: 'bg-blue-100 text-blue-700',   icon: RefreshCw     },
  done:       { label: 'Prêt',      color: 'bg-green-100 text-green-700', icon: CheckCircle2  },
  error:      { label: 'Erreur',    color: 'bg-red-100 text-red-700',     icon: AlertCircle   },
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function ExportsPage() {
  const { profile }  = useAuthStore()
  const schoolId     = profile?.schoolId ?? ''
  const functions    = getFunctions(undefined, 'europe-west1')
  const db           = getFirestore()

  const [jobs,          setJobs]          = useState<ExportJob[]>([])
  const [loadingExport, setLoadingExport] = useState<string | null>(null)
  const [loadingReport, setLoadingReport] = useState<string | null>(null)
  const [compliance,    setCompliance]    = useState<Record<string, ComplianceResult>>({})
  const [selectedFormat, setSelectedFormat] = useState<'xlsx' | 'csv'>('xlsx')
  const [academicYear,  setAcademicYear]  = useState('2025-2026')

  const requestExportCF        = httpsCallable(functions, 'requestExport')
  const generateReportCF       = httpsCallable(functions, 'generateMinistryReport')
  const checkComplianceCF      = httpsCallable(functions, 'checkReportCompliance')

  // Écoute des jobs en temps réel
  useEffect(() => {
    if (!schoolId) return
    const q = query(
      collection(db, 'schools', schoolId, 'exportJobs'),
      orderBy('requestedAt', 'desc'),
      limit(20),
    )
    return onSnapshot(q, snap => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExportJob)))
    })
  }, [schoolId])

  // Vérification de conformité pour les rapports d'examen
  useEffect(() => {
    if (!schoolId) return
    REPORTS.filter(r => r.exam).forEach(async r => {
      try {
        const res = await checkComplianceCF({ schoolId, reportType: r.id })
        setCompliance(prev => ({ ...prev, [r.id]: res.data as ComplianceResult }))
      } catch { /* silencieux */ }
    })
  }, [schoolId])

  const handleExport = async (dataset: string) => {
    setLoadingExport(dataset)
    try {
      await requestExportCF({ dataset, format: selectedFormat })
    } catch (e: any) {
      alert(`Erreur : ${e.message}`)
    } finally {
      setLoadingExport(null)
    }
  }

  const handleReport = async (reportType: string, force = false) => {
    setLoadingReport(reportType)
    try {
      const res = await generateReportCF({ schoolId, reportType, academicYear, force }) as any
      const data = res.data
      if (!data.success && data.missingData) {
        const names = data.missingData.slice(0, 5).map((m: any) => `${m.name} (${m.fields.join(', ')})`).join('\n')
        const more  = data.missingData.length > 5 ? `\n… et ${data.missingData.length - 5} autres` : ''
        if (window.confirm(`${data.missingData.length} élève(s) ont des données manquantes :\n${names}${more}\n\nGénérer quand même en ignorant ces élèves ?`)) {
          await handleReport(reportType, true)
        }
        return
      }
      if (data.signedUrl) window.open(data.signedUrl, '_blank')
    } catch (e: any) {
      alert(`Erreur : ${e.message}`)
    } finally {
      setLoadingReport(null)
    }
  }

  const formatTime = (ts: number) => new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  const formatDataset = (d: string) => DATASETS.find(x => x.id === d)?.label ?? d

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exports & Rapports officiels</h1>
        <p className="text-gray-500 mt-1">Générez des fichiers Excel exploitables et des documents conformes au Ministère de l'Éducation</p>
      </div>

      {/* ── Sélecteur format + année ── */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Format :</span>
          {(['xlsx', 'csv'] as const).map(f => (
            <button
              key={f}
              onClick={() => setSelectedFormat(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                selectedFormat === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              .{f.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Année :</span>
          <select
            value={academicYear}
            onChange={e => setAcademicYear(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
          >
            {['2025-2026', '2024-2025', '2023-2024'].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Section 1 : Exports de données ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          Exports de données
          <span className="text-sm font-normal text-gray-400 ml-2">
            Générés en arrière-plan · Notification dès que prêt
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DATASETS.map(ds => (
            <div
              key={ds.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ds.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{ds.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ds.desc}</p>
                </div>
              </div>
              <button
                onClick={() => handleExport(ds.id)}
                disabled={loadingExport === ds.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {loadingExport === ds.id
                  ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  : <Download className="w-3.5 h-3.5" />
                }
                Exporter
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2 : Rapports ministériels ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          Rapports officiels Ministère
          <span className="text-sm font-normal text-gray-400 ml-2">
            Conformes aux formats standards Afrique de l'Ouest
          </span>
        </h2>
        <div className="space-y-2">
          {REPORTS.map(r => {
            const comp    = compliance[r.id]
            const isReady = !r.exam || (comp?.readyToGenerate ?? true)
            return (
              <div key={r.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{r.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{r.label}</p>
                    {r.exam && comp && (
                      <p className={`text-xs mt-0.5 ${isReady ? 'text-green-600' : 'text-amber-600'}`}>
                        {isReady
                          ? `✓ ${comp.eligible} élèves prêts`
                          : `⚠ ${comp.missing} données manquantes sur ${comp.eligible + comp.missing} élèves`
                        }
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleReport(r.id)}
                  disabled={loadingReport === r.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                    isReady
                      ? 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                  }`}
                >
                  {loadingReport === r.id
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <FileText className="w-3.5 h-3.5" />
                  }
                  Générer
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Section 3 : Historique des jobs ── */}
      {jobs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            Exports récents
          </h2>
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Dataset', 'Format', 'Statut', 'Lignes', 'Demandé', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {jobs.map(job => {
                  const cfg = STATUS_CFG[job.status]
                  const Icon = cfg.icon
                  return (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{formatDataset(job.dataset)}</td>
                      <td className="px-4 py-3 text-gray-500 uppercase text-xs font-mono">{job.format}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{job.rowCount?.toLocaleString('fr-FR') ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatTime(job.requestedAt)}</td>
                      <td className="px-4 py-3">
                        {job.status === 'done' && job.signedUrl && (
                          <a
                            href={job.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Télécharger
                          </a>
                        )}
                        {job.status === 'error' && (
                          <span className="text-red-500 text-xs">{job.errorMsg}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  )
}
