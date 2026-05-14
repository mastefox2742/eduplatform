import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import type { UserProfile } from '@school/shared-types'

interface AuthState {
  user:            User | null
  profile:         UserProfile | null
  isLoading:       boolean
  isAuthenticated: boolean
}

export function useAuth(): AuthState & {
  login:  (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
} {
  const [state, setState] = useState<AuthState>({
    user:            null,
    profile:         null,
    isLoading:       true,
    isAuthenticated: false,
  })

  useEffect(() => {
    let unsubProfile: (() => void) | null = null

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubProfile?.()
      unsubProfile = null

      if (!firebaseUser) {
        setState({ user: null, profile: null, isLoading: false, isAuthenticated: false })
        return
      }

      // Refresh custom claims
      await firebaseUser.getIdToken(true)

      setState(prev => ({ ...prev, user: firebaseUser, isAuthenticated: true }))

      // Écoute le profil Firestore en temps réel
      unsubProfile = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (snap) => {
          if (snap.exists()) {
            setState(prev => ({
              ...prev,
              profile:   { id: snap.id, ...snap.data() } as UserProfile,
              isLoading: false,
            }))
          } else {
            // Fallback sur custom claims si pas de doc Firestore
            firebaseUser.getIdTokenResult().then(({ claims }) => {
              if (claims.role && claims.schoolId) {
                setState(prev => ({
                  ...prev,
                  profile: {
                    id:          firebaseUser.uid,
                    email:       firebaseUser.email ?? '',
                    displayName: firebaseUser.displayName ?? '',
                    role:        claims.role as UserProfile['role'],
                    schoolId:    claims.schoolId as string,
                    isActive:    true,
                    createdAt:   Date.now(),
                    updatedAt:   Date.now(),
                  },
                  isLoading: false,
                }))
              } else {
                setState(prev => ({ ...prev, isLoading: false }))
              }
            })
          }
        },
        () => setState(prev => ({ ...prev, isLoading: false }))
      )
    })

    return () => {
      unsubAuth()
      unsubProfile?.()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await cred.user.getIdToken(true)
  }

  const logout = async () => {
    await signOut(auth)
  }

  return { ...state, login, logout }
}
