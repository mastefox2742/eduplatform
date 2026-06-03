import { useColorScheme } from 'react-native'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const colors = {
  primary:   '#2563eb',   // blue-600
  primaryDark: '#1d4ed8', // blue-700
  secondary: '#7c3aed',   // violet-600
  success:   '#16a34a',   // green-600
  warning:   '#d97706',   // amber-600
  danger:    '#dc2626',   // red-600
  error:     '#dc2626',   // alias danger
  info:      '#0891b2',   // cyan-600

  gray: {
    50:  '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  white: '#ffffff',
  black: '#000000',
  background: '#f8fafc',
  surface:    '#ffffff',
  border:     '#e2e8f0',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
}

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,
}

export const fontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  lg:   17,
  xl:   20,
  '2xl': 24,
  '3xl': 30,
}

export const fontWeight = {
  normal:    '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
}

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
}

export const darkColors = {
  primary:   '#3b82f6',
  primaryDark: '#2563eb',
  secondary: '#8b5cf6',
  success:   '#22c55e',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  error:     '#ef4444',
  info:      '#06b6d4',

  gray: {
    50:  '#111827',
    100: '#1f2937',
    200: '#374151',
    300: '#4b5563',
    400: '#6b7280',
    500: '#9ca3af',
    600: '#d1d5db',
    700: '#e5e7eb',
    800: '#f3f4f6',
    900: '#f9fafb',
  },

  white: '#1e293b',
  black: '#ffffff',
  background: '#0f172a',
  surface:    '#1e293b',
  border:     '#334155',
}

interface ThemeState {
  themeMode: 'light' | 'dark' | 'system'
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeMode: 'light', // Par défaut en mode clair
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

export function useTheme() {
  const scheme = useColorScheme()
  const themeMode = useThemeStore((state) => state.themeMode)
  const setThemeMode = useThemeStore((state) => state.setThemeMode)
  
  const isDark = themeMode === 'system' ? scheme === 'dark' : themeMode === 'dark'

  return {
    colors: isDark ? darkColors : colors,
    isDark,
    themeMode,
    setThemeMode
  }
}
