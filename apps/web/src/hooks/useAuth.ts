import { useEffect } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import { useAuthStore } from '@/store/auth.store'
import { PREVIEW_MODE, previewIdentity } from '@/config/preview'
import type { UserProfile } from '@school/shared-types'

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

    setLoading(true)
    let unsubProfile: (() => void) | null = null

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Nettoyer l'ancien listener de profil
      unsubProfile?.()
      unsubProfile = null

      if (!firebaseUser) {
        setUser(null)
        setProfile(null)
        return
      }

      // Force le refresh du token pour récupérer les Custom Claims
      // (les claims sont définis via Admin SDK après la création du compte)
      try {
        const tokenResult = await firebaseUser.getIdTokenResult(true)
        const claims = tokenResult.claims

        // Si les custom claims sont présents dans le token, on les utilise
        // directement (plus rapide que d'attendre Firestore)
        if (claims.role && claims.schoolId) {
          setUser(firebaseUser)
          // On continue pour charger le profil complet depuis Firestore
        } else {
          // Pas encore de custom claims → compte pas encore configuré
          setUser(firebaseUser)
        }
      } catch {
        setUser(firebaseUser)
      }

      // S'abonner au profil Firestore users/{uid} en temps réel
      const profileRef = doc(db, 'users', firebaseUser.uid)
      unsubProfile = onSnapshot(
        profileRef,
        (snap) => {
          if (snap.exists()) {
            setProfile({ id: snap.id, ...snap.data() } as UserProfile)
          } else {
            // Profil pas encore créé (normal juste après la création du compte)
            // On crée un profil temporaire depuis les custom claims du token
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
          // Fallback sur les custom claims si Firestore échoue
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
  const cred = await signInWithEmailAndPassword(auth, email, password)
  // Force refresh immédiat des custom claims après login
  await cred.user.getIdToken(true)
  return cred
}

export async function logout() {
  return signOut(auth)
}
