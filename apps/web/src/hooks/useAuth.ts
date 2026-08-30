import { useEffect } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import { supabase, usesSupabase } from '@/config/supabase'
import { useAuthStore } from '@/store/auth.store'
import { PREVIEW_MODE, previewIdentity } from '@/config/preview'
import type { UserProfile } from '@school/shared-types'

// ─── Verticale identité sur Supabase ──────────────────────────────────────────
// Quand `VITE_SB_IDENTITE=true`, l'authentification et le profil viennent de
// Supabase (session JWT indispensable pour que la RLS laisse lire quoi que ce
// soit). Firebase reste inerte. Tant que le drapeau est à false, on garde le
// chemin Firebase historique, intact.

/** Charge le profil applicatif depuis la table `profiles` (Supabase). */
async function loadSupabaseProfile(userId: string, email: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, school_id, display_name, photo_url, is_active')
    .eq('id', userId)
    .single()

  if (error || !data || !data.school_id) return null

  return {
    id:          userId,
    email,
    displayName: data.display_name ?? email,
    photoUrl:    data.photo_url ?? undefined,
    role:        data.role,                    // user_role ↔ UserRole (1:1)
    schoolId:    data.school_id,
    isActive:    data.is_active ?? true,
    createdAt:   Date.now(),
    updatedAt:   Date.now(),
  } as UserProfile
}

// ─── Auth listener global ─────────────────────────────────────────────────────
// Doit être monté une seule fois dans App.tsx via <AuthProvider>
export function useAuthInit() {
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    // Mode aperçu : on ne contacte aucun backend et on pose une identité
    // fictive, le temps de relire les écrans. Désarmé en production
    // (voir config/preview.ts).
    if (PREVIEW_MODE) {
      const identity = previewIdentity()
      setProfile({
        id: 'apercu',
        email: identity.email,
        displayName: identity.displayName,
        role: identity.role,
        schoolId: 'apercu',
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as never)
      setLoading(false)
      return
    }

    // ── Chemin Supabase (verticale identité) ───────────────────────────────
    if (usesSupabase('identite')) {
      setLoading(true)

      const apply = async (session: { user?: { id: string; email?: string } } | null) => {
        if (!session?.user) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }
        setUser(session.user as never)
        const profile = await loadSupabaseProfile(session.user.id, session.user.email ?? '')
        setProfile(profile as never)
        setLoading(false)
      }

      supabase.auth.getSession().then(({ data }) => apply(data.session as never))
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        apply(session as never)
      })

      return () => sub.subscription.unsubscribe()
    }

    // ── Chemin Firebase (historique) ───────────────────────────────────────
    setLoading(true)
    let unsubProfile: (() => void) | null = null

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubProfile?.()
      unsubProfile = null

      if (!firebaseUser) {
        setUser(null)
        setProfile(null)
        return
      }

      try {
        await firebaseUser.getIdTokenResult(true)
        setUser(firebaseUser)
      } catch {
        setUser(firebaseUser)
      }

      const profileRef = doc(db, 'users', firebaseUser.uid)
      unsubProfile = onSnapshot(
        profileRef,
        (snap) => {
          if (snap.exists()) {
            setProfile({ id: snap.id, ...snap.data() } as UserProfile)
          } else {
            firebaseUser.getIdTokenResult().then((tokenResult) => {
              const { role, schoolId } = tokenResult.claims
              if (role && schoolId) {
                setProfile({
                  id:          firebaseUser.uid,
                  email:       firebaseUser.email ?? '',
                  displayName: firebaseUser.displayName ?? '',
                  role:        role as UserProfile['role'],
                  schoolId:    schoolId as string,
                  isActive:    true,
                  createdAt:   Date.now(),
                  updatedAt:   Date.now(),
                })
              } else {
                setProfile(null)
              }
            }).catch(() => setProfile(null))
          }
        },
        (err) => {
          console.error('[useAuthInit] Firestore profile error:', err)
          firebaseUser.getIdTokenResult().then((tokenResult) => {
            const { role, schoolId } = tokenResult.claims
            if (role && schoolId) {
              setProfile({
                id:          firebaseUser.uid,
                email:       firebaseUser.email ?? '',
                displayName: firebaseUser.displayName ?? '',
                role:        role as UserProfile['role'],
                schoolId:    schoolId as string,
                isActive:    true,
                createdAt:   Date.now(),
                updatedAt:   Date.now(),
              })
            }
          }).catch(() => {})
        }
      )
    })

    return () => {
      unsubAuth()
      unsubProfile?.()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── Hook simple pour lire l'état auth ───────────────────────────────────────
export function useAuth() {
  return useAuthStore()
}

// ─── Actions auth ─────────────────────────────────────────────────────────────
export async function loginWithEmail(email: string, password: string) {
  if (usesSupabase('identite')) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return
  }
  const cred = await signInWithEmailAndPassword(auth, email, password)
  await cred.user.getIdToken(true)
  return cred
}

export async function logout() {
  if (usesSupabase('identite')) {
    await supabase.auth.signOut()
    return
  }
  return signOut(auth)
}
