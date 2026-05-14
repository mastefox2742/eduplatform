/**
 * Displays a banner when Firebase is configured but the collection is empty.
 * Provides a one-click "seed demo data" button.
 */
import { useState } from 'react'
import { Database, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { seedDemoData } from '@/services/seed.service'
import { FIREBASE_READY } from '@/services/firebase.config'

interface SeedBannerProps {
  /** Show only when Firebase is configured but data is empty */
  show: boolean
}

export function SeedBanner({ show }: SeedBannerProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  if (!FIREBASE_READY || !show) return null

  async function handleSeed() {
    setStatus('loading')
    const result = await seedDemoData()
    if (result.success) {
      setStatus('done')
    } else {
      setStatus('error')
      setErrMsg(result.error ?? 'Erreur inconnue')
    }
  }

  if (status === 'done') {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
        <CheckCircle2 size={16} className="flex-shrink-0" />
        <span>Données initialisées avec succès. Les pages se mettent à jour automatiquement.</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        <AlertTriangle size={16} className="flex-shrink-0" />
        <span>Erreur lors de l'initialisation : {errMsg}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="flex items-center gap-3">
        <Database size={18} className="text-blue-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Firebase connecté — base de données vide</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Cliquez sur "Initialiser" pour peupler Firestore avec des données de démonstration complètes.
          </p>
        </div>
      </div>
      <button
        onClick={handleSeed}
        disabled={status === 'loading'}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex-shrink-0"
      >
        {status === 'loading'
          ? <><Loader2 size={14} className="animate-spin" /> Initialisation...</>
          : <><Database size={14} /> Initialiser les données</>
        }
      </button>
    </div>
  )
}

/** Small badge showing if data is live from Firestore */
export function LiveBadge({ isLive }: { isLive: boolean }) {
  if (!FIREBASE_READY) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Démo locale
      </span>
    )
  }
  if (!isLive) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Base vide
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      Firestore live
    </span>
  )
}
