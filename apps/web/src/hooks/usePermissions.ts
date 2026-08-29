/**
 * usePermissions — rôles cumulables et contexte actif
 * Cahier des charges §3.1, §3.2, §21.1
 *
 * Une même personne peut être Directeur ET Directeur des Études,
 * ou Secrétaire ET Caissier. L'interface doit donc raisonner en
 * ensemble de rôles, jamais en rôle unique.
 *
 * IMPORTANT — ce hook sert à AFFICHER ou MASQUER, jamais à
 * autoriser. L'autorisation réelle est portée par RLS côté
 * PostgreSQL (§21.1 : « jamais seulement par l'interface »).
 * Masquer un bouton n'empêche personne d'appeler l'API.
 */
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/config/supabase'
import type {
  StaffRole,
  PermissionAction,
  UserRoleRow,
  ActiveContext,
  SchoolCycle,
} from '@school/shared-types'

interface PermissionKey {
  resource: string
  action: PermissionAction
  allowed: boolean
  offlineAllowed: boolean
}

interface PermissionsState {
  roles: StaffRole[]
  assignments: { classId: string; subjectId: string | null }[]
  permissions: PermissionKey[]
  context: ActiveContext | null
  isLoading: boolean
  error: string | null
}

const EMPTY: PermissionsState = {
  roles: [],
  assignments: [],
  permissions: [],
  context: null,
  isLoading: true,
  error: null,
}

export function usePermissions() {
  const [state, setState] = useState<PermissionsState>(EMPTY)

  const load = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user.id

    if (!userId) {
      setState({ ...EMPTY, isLoading: false })
      return
    }

    // Les trois requêtes sont indépendantes : on les lance ensemble.
    const [rolesRes, assignRes, ctxRes] = await Promise.all([
      supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .is('revoked_at', null),
      supabase
        .from('teacher_assignments')
        .select('class_id, subject_id')
        .eq('teacher_id', userId)
        .eq('is_active', true),
      supabase
        .from('user_active_context')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    if (rolesRes.error) {
      setState({ ...EMPTY, isLoading: false, error: rolesRes.error.message })
      return
    }

    const roleRows = (rolesRes.data ?? []) as UserRoleRow[]
    const roles = [...new Set(roleRows.map((r) => r.role))]

    // Les permissions se lisent après, car elles dépendent des rôles.
    // Défauts plateforme (school_id NULL) + surcharge de l'école.
    const permRes = roles.length
      ? await supabase
          .from('role_permissions')
          .select('role, resource, action, allowed, offline_allowed, school_id')
          .in('role', roles)
      : { data: [], error: null }

    // Une surcharge d'école l'emporte sur le défaut plateforme.
    const byKey = new Map<string, PermissionKey>()
    for (const p of (permRes.data ?? []) as Array<{
      resource: string
      action: PermissionAction
      allowed: boolean
      offline_allowed: boolean
      school_id: string | null
    }>) {
      const key = `${p.resource}:${p.action}`
      const existing = byKey.get(key)
      const isOverride = p.school_id !== null

      // On garde la surcharge école ; sinon, un « autorisé » l'emporte
      // sur un « refusé » entre deux rôles cumulés.
      if (!existing || isOverride || p.allowed) {
        byKey.set(key, {
          resource: p.resource,
          action: p.action,
          allowed: p.allowed,
          offlineAllowed: p.offline_allowed,
        })
      }
    }

    setState({
      roles,
      assignments: (assignRes.data ?? []).map((a: { class_id: string; subject_id: string | null }) => ({
        classId: a.class_id,
        subjectId: a.subject_id,
      })),
      permissions: [...byKey.values()],
      context: (ctxRes.data as ActiveContext | null) ?? null,
      isLoading: false,
      error: null,
    })
  }, [])

  useEffect(() => {
    void load()
    const { data: sub } = supabase.auth.onAuthStateChange(() => void load())
    return () => sub.subscription.unsubscribe()
  }, [load])

  // ── Interrogation ───────────────────────────────────────────────────────────

  const hasRole = useCallback(
    (role: StaffRole) => state.roles.includes(role),
    [state.roles]
  )

  const hasAnyRole = useCallback(
    (...roles: StaffRole[]) => roles.some((r) => state.roles.includes(r)),
    [state.roles]
  )

  const can = useCallback(
    (resource: string, action: PermissionAction) =>
      state.permissions.some(
        (p) => p.resource === resource && p.action === action && p.allowed
      ),
    [state.permissions]
  )

  /** L'action est-elle utilisable hors ligne pour ce rôle ? (§19.2) */
  const canOffline = useCallback(
    (resource: string, action: PermissionAction) =>
      state.permissions.some(
        (p) =>
          p.resource === resource &&
          p.action === action &&
          p.allowed &&
          p.offlineAllowed
      ),
    [state.permissions]
  )

  /** §26 : un enseignant ne touche que ses classes et ses matières. */
  const teachesClass = useCallback(
    (classId: string, subjectId?: string) =>
      state.assignments.some(
        (a) =>
          a.classId === classId &&
          (!subjectId || a.subjectId === subjectId || a.subjectId === null)
      ),
    [state.assignments]
  )

  // ── Bascule de contexte sans déconnexion (§3.1) ──────────────────────────────

  const switchContext = useCallback(
    async (next: {
      schoolId?: string
      siteId?: string | null
      academicYear?: string | null
      cycle?: SchoolCycle | null
      activeRole?: StaffRole
    }) => {
      const { data: session } = await supabase.auth.getSession()
      const userId = session.session?.user.id
      if (!userId) return

      // On refuse un rôle que l'utilisateur ne porte pas : cela éviterait
      // une confusion d'affichage, même si RLS refuserait de toute façon.
      if (next.activeRole && !state.roles.includes(next.activeRole)) {
        console.warn('[Permissions] Rôle non détenu :', next.activeRole)
        return
      }

      const { error } = await supabase.from('user_active_context').upsert(
        {
          user_id:       userId,
          school_id:     next.schoolId     ?? state.context?.school_id     ?? null,
          site_id:       next.siteId       ?? state.context?.site_id       ?? null,
          academic_year: next.academicYear ?? state.context?.academic_year ?? null,
          cycle:         next.cycle        ?? state.context?.cycle         ?? null,
          active_role:   next.activeRole   ?? state.context?.active_role   ?? null,
        },
        { onConflict: 'user_id' }
      )

      if (error) {
        console.warn('[Permissions] Bascule de contexte refusée :', error.message)
        return
      }
      await load()
    },
    [state.roles, state.context, load]
  )

  return {
    ...state,
    hasRole,
    hasAnyRole,
    can,
    canOffline,
    teachesClass,
    switchContext,
    reload: load,
    /** Plusieurs casquettes : l'interface doit afficher le sélecteur. */
    isMultiRole: state.roles.length > 1,
  }
}
