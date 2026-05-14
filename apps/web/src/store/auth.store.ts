import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { User } from 'firebase/auth'
import type { UserProfile, UserRole } from '@school/shared-types'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  role: UserRole | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      profile: null,
      role: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({ user, isAuthenticated: !!user, isLoading: false }, false, 'setUser'),

      setProfile: (profile) =>
        set({ profile, role: profile?.role ?? null }, false, 'setProfile'),

      setLoading: (isLoading) =>
        set({ isLoading }, false, 'setLoading'),

      logout: () =>
        set({ user: null, profile: null, role: null, isAuthenticated: false }, false, 'logout'),
    }),
    { name: 'auth-store' }
  )
)
