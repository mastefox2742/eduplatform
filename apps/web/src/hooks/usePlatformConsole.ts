/**
 * usePlatformConsole — console de l'éditeur (multi-établissements).
 * Cahier des charges §4.2.
 *
 * ## Pourquoi cet écran n'est pas dans l'espace d'un directeur
 *
 * Un directeur d'établissement administre *son* école. Lui donner la
 * liste des autres écoles clientes, leurs effectifs et leur chiffre
 * d'affaires romprait l'isolation multi-tenant qui est la promesse
 * centrale du produit — et que les politiques RLS font respecter côté
 * base.
 *
 * L'écran est donc rattaché au rôle `ADMIN` (l'éditeur de la
 * plateforme), pas à `DIRECTION`. Un directeur qui atteint cette route
 * reçoit un refus, et la barre de navigation ne la lui montre pas.
 *
 * Côté base, ces tables ne sont de toute façon lisibles que par un
 * `service_role` ou un compte plateforme : même en forçant l'URL, un
 * directeur n'obtiendrait aucune ligne.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabase'
import { PREVIEW_MODE } from '@/config/preview'

export type PlanTier = 'essentiel' | 'standard' | 'premium'
export type TenantStatus = 'actif' | 'essai' | 'suspendu' | 'resilie'

export interface Tenant {
  id: string
  name: string
  city: string
  plan: PlanTier
  status: TenantStatus
  studentCount: number
  staffCount: number
  monthlyFee: number
  currency: string
  since: string
  /** Jours restants avant la fin de l'essai, si applicable. */
  trialDaysLeft: number | null
  /** Dernière activité constatée — une école silencieuse décroche. */
  lastActivityAt: string | null
  storageUsedMb: number
}

export const PLAN_LABELS: Record<PlanTier, string> = {
  essentiel: 'Essentiel',
  standard: 'Standard',
  premium: 'Premium',
}

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  actif: 'Actif',
  essai: 'Période d’essai',
  suspendu: 'Suspendu',
  resilie: 'Résilié',
}

const PREVIEW: Tenant[] = [
  { id: 't1', name: 'Lycée La Référence', city: 'Brazzaville', plan: 'premium', status: 'actif', studentCount: 412, staffCount: 38, monthlyFee: 185_000, currency: 'XOF', since: '2024-09-01', trialDaysLeft: null, lastActivityAt: '2026-08-30T07:40:00Z', storageUsedMb: 2840 },
  { id: 't2', name: 'Collège Les Rapides', city: 'Brazzaville', plan: 'standard', status: 'actif', studentCount: 268, staffCount: 24, monthlyFee: 120_000, currency: 'XOF', since: '2025-01-15', trialDaysLeft: null, lastActivityAt: '2026-08-29T16:10:00Z', storageUsedMb: 1420 },
  { id: 't3', name: 'École Sainte-Marie', city: 'Pointe-Noire', plan: 'standard', status: 'actif', studentCount: 195, staffCount: 19, monthlyFee: 120_000, currency: 'XOF', since: '2025-09-01', trialDaysLeft: null, lastActivityAt: '2026-08-30T06:55:00Z', storageUsedMb: 890 },
  { id: 't4', name: 'Complexe Scolaire Horizon', city: 'Dolisie', plan: 'essentiel', status: 'essai', studentCount: 88, staffCount: 11, monthlyFee: 0, currency: 'XOF', since: '2026-08-12', trialDaysLeft: 12, lastActivityAt: '2026-08-28T09:20:00Z', storageUsedMb: 145 },
  { id: 't5', name: 'Institut Nzambi', city: 'Ouesso', plan: 'essentiel', status: 'suspendu', studentCount: 134, staffCount: 14, monthlyFee: 65_000, currency: 'XOF', since: '2025-03-01', trialDaysLeft: null, lastActivityAt: '2026-07-04T11:00:00Z', storageUsedMb: 610 },
]

export function usePlatformConsole() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (PREVIEW_MODE) {
      setTenants(PREVIEW)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: e } = await supabase
      .from('schools')
      .select('id, name, city, plan, status, student_count, staff_count, monthly_fee, currency, created_at, trial_ends_at, last_activity_at, storage_used_mb')
      .order('name')

    if (e) { setError(e.message); setLoading(false); return }

    const now = Date.now()
    setTenants(((data ?? []) as Array<Record<string, unknown>>).map((r) => {
      const trialEnds = r.trial_ends_at as string | null
      return {
        id: r.id as string,
        name: (r.name as string) ?? '—',
        city: (r.city as string) ?? '—',
        plan: (r.plan as PlanTier) ?? 'essentiel',
        status: (r.status as TenantStatus) ?? 'actif',
        studentCount: Number(r.student_count ?? 0),
        staffCount: Number(r.staff_count ?? 0),
        monthlyFee: Number(r.monthly_fee ?? 0),
        currency: (r.currency as string) ?? 'XOF',
        since: (r.created_at as string) ?? '',
        trialDaysLeft: trialEnds
          ? Math.max(0, Math.ceil((new Date(trialEnds).getTime() - now) / 86_400_000))
          : null,
        lastActivityAt: (r.last_activity_at as string) ?? null,
        storageUsedMb: Number(r.storage_used_mb ?? 0),
      }
    }))
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const stats = useMemo(() => {
    const active = tenants.filter((t) => t.status === 'actif')
    const nowMs = Date.now()
    return {
      total: tenants.length,
      active: active.length,
      trials: tenants.filter((t) => t.status === 'essai').length,
      suspended: tenants.filter((t) => t.status === 'suspendu').length,
      mrr: active.reduce((s, t) => s + t.monthlyFee, 0),
      students: tenants.reduce((s, t) => s + t.studentCount, 0),
      /** Écoles sans aucune activité depuis 30 jours : elles partent. */
      dormant: tenants.filter((t) =>
        t.status !== 'resilie' && t.lastActivityAt != null &&
        (nowMs - new Date(t.lastActivityAt).getTime()) > 30 * 86_400_000
      ).length,
      storageGb: Math.round(tenants.reduce((s, t) => s + t.storageUsedMb, 0) / 1024 * 10) / 10,
    }
  }, [tenants])

  return { tenants, stats, isLoading, error, reload: () => void load() }
}
