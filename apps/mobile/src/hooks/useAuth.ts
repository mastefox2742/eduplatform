import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import { uploadProfilePhoto } from '@/services/storage'
import type { UserProfile } from '@school/shared-types'

interface AuthState {
  user:            User | null
  profile:         UserProfile | null
  isLoading:       boolean
  isAuthenticated: boolean
}

export function useAuth(): AuthState & {
  login:       (email: string, password: string) => Promise<void>
  logout:      () => Promise<void>
  updatePhoto: (localUri: string) => Promise<void>
} {
  const [state, setState] = useState<AuthState>({
    user:            null,
    profile:         null,
    isLoading:       true,
    isAuthenticated: false,
  })

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ user: null, profile: null, isLoading: false, isAuthenticated: false })
        return
      }

      // Utilisateur connecté — on charge le profil depuis Firestore (une seule fois, pas de listener)
      setState(prev => ({ ...prev, user: firebaseUser, isAuthenticated: true }))

      try {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (snap.exists()) {
          setState(prev => ({
            ...prev,
            profile:   { id: snap.id, ...snap.data() } as UserProfile,
            isLoading: false,
          }))
        } else {
          // Pas de profil Firestore — on crée un profil minimal depuis le token
          const { claims } = await firebaseUser.getIdTokenResult()
          setState(prev => ({
            ...prev,
            profile: claims.role ? {
              id:          firebaseUser.uid,
              email:       firebaseUser.email ?? '',
              displayName: firebaseUser.displayName ?? firebaseUser.email ?? '',
              role:        claims.role as UserProfile['role'],
              schoolId:    claims.schoolId as string,
              isActive:    true,
              createdAt:   Date.now(),
              updatedAt:   Date.now(),
            } : null,
            isLoading: false,
          }))
        }
      } catch {
        // En cas d'erreur réseau on continue sans profil
        setState(prev => ({ ...prev, isLoading: false }))
      }
    })

    return () => unsubAuth()
  }, [])

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
  }

  // Met à jour la photo de profil : upload Storage + mise à jour Firestore + état local
  const updatePhoto = async (localUri: string) => {
    if (!state.user) throw new Error('Non connecté')
    const photoURL = await uploadProfilePhoto(state.user.uid, localUri)
    await updateDoc(doc(db, 'users', state.user.uid), {
      photoURL,
      updatedAt: Date.now(),
    })
    setState(prev => prev.profile
      ? { ...prev, profile: { ...prev.profile, photoURL } }
      : prev
    )
  }

  return { ...state, login, logout, updatePhoto }
}
