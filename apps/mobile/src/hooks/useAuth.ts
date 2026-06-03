/**
 * useAuth — Authentification Supabase
 * Remplace l'ancienne implémentation Firebase Auth
 *
 * - Session persistée dans AsyncStorage
 * - Profil chargé depuis la table `profiles`
 * - Role et school_id disponibles via user.user_metadata + profile
 * - updatePhoto : upload Supabase Storage + update profil
 */
import { useState, useEffect, useCallback } from 'react'
import { type Session, type User } from '@supabase/supabase-js'
import { supabase, type ProfileRow } from '@/config/supabase'
import * as ImagePicker from 'expo-image-picker'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthState {
  session:         Session | null
  user:            User | null
  profile:         ProfileRow | null
  isLoading:       boolean
  isAuthenticated: boolean
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session:         null,
    user:            null,
    profile:         null,
    isLoading:       true,
    isAuthenticated: false,
  })

  // Charger le profil depuis Supabase
  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('[useAuth] loadProfile error:', error.message)
      return null
    }
    return data as ProfileRow
  }, [])

  useEffect(() => {
    // 1. Récupérer la session existante
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id)
        setState({
          session,
          user:            session.user,
          profile,
          isLoading:       false,
          isAuthenticated: true,
        })
      } else {
        setState(s => ({ ...s, isLoading: false }))
      }
    })

    // 2. Écouter les changements de session (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await loadProfile(session.user.id)
          setState({
            session,
            user:            session.user,
            profile,
            isLoading:       false,
            isAuthenticated: true,
          })
        } else {
          setState({ session: null, user: null, profile: null, isLoading: false, isAuthenticated: false })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile])

  // ── Actions ───────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const updatePhoto = useCallback(async (localUri: string) => {
    if (!state.user) throw new Error('Non connecté')

    const ext      = localUri.split('.').pop() ?? 'jpg'
    const filename = `avatars/${state.user.id}.${ext}`

    // Upload dans Supabase Storage
    const response = await fetch(localUri)
    const blob     = await response.blob()

    const { error: uploadError } = await supabase.storage
      .from('user-media')
      .upload(filename, blob, { upsert: true, contentType: `image/${ext}` })

    if (uploadError) throw uploadError

    // URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('user-media')
      .getPublicUrl(filename)

    // Mettre à jour le profil
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', state.user.id)

    if (updateError) throw updateError

    setState(prev => prev.profile
      ? { ...prev, profile: { ...prev.profile, photo_url: publicUrl } }
      : prev
    )

    return publicUrl
  }, [state.user])

  // ── Propriétés calculées ─────────────────────────────────────────────────

  // Compatibilité avec l'ancien code qui utilisait profile?.schoolId
  const compatProfile = state.profile ? {
    ...state.profile,
    // Aliases pour la compatibilité avec l'ancien code Firebase
    schoolId:    state.profile.school_id,
    displayName: state.profile.display_name,
    photoUrl:    state.profile.photo_url,
    photoURL:    state.profile.photo_url,
    role:        state.profile.role,
    isActive:    state.profile.is_active,
    classId:     state.profile.class_id,
    className:   state.profile.class_name,
    levelId:     state.profile.level_id,
    levelName:   state.profile.level_name,
    studentNumber: state.profile.student_number,
    parentEmail: state.profile.parent_email,
    studentId:   state.profile.class_id, // pour les parents
    childId:     null,
    children:    state.profile.children ?? [],
    createdAt:   new Date(state.profile.created_at).getTime(),
    updatedAt:   new Date(state.profile.updated_at).getTime(),
  } : null

  return {
    ...state,
    profile:      compatProfile,
    rawProfile:   state.profile,
    // Alias uid pour compatibilité
    user:         state.user ? { ...state.user, uid: state.user.id } : null,
    login,
    logout,
    updatePhoto,
  }
}
