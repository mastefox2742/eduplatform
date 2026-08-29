import { useColorScheme } from 'react-native'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Palette Projetto1 — identique au web (apps/web/src/styles/globals.css).
 * Source : maquettes export-html.
 *
 * Les noms d'echelle (`gray.500`, `primary`) sont conserves : les
 * ~22 000 lignes d'ecrans mobile les utilisent deja. Seules les
 * valeurs changent, si bien que toute l'application adopte
 * l'identite des maquettes sans etre reecrite.
 */
export const colors = {
  primary:     '#145DA0',   // bleu institutionnel
  primaryDark: '#114E86',
  primaryLight:'#2D8CBE',
  onPrimary:   '#FFFFFF',

  secondary:   '#0F766E',   // teal : valide, recouvre, present
  onSecondary: '#FFFFFF',

  accent:      '#F4A62A',   // ambre : en attente, XP, attention
  onAccent:    '#3B2605',

  success:     '#0F766E',   // les maquettes n'utilisent pas de vert vif
  warning:     '#F4A62A',
  danger:      '#C2413B',
  error:       '#C2413B',   // alias danger
  info:        '#2D8CBE',

  /** Echelle neutre teintee bleu nuit, comme dans les maquettes. */
  gray: {
    50:  '#F6F8FB',
    100: '#F1F5F9',
    200: '#E8EEF5',
    300: '#D8E1EB',
    400: '#A8B6C6',
    500: '#5E7188',
    600: '#455870',
    700: '#2E4157',
    800: '#1E2E44',
    900: '#14213D',
  },

  white: '#FFFFFF',
  black: '#000000',
  background: '#F6F8FB',
  surface:    '#FFFFFF',
  border:     '#D8E1EB',
  muted:      '#E8EEF5',
  mutedText:  '#5E7188',
  text:       '#14213D',

  /** Series de graphiques, alignees sur le web. */
  chart: ['#145DA0', '#0F766E', '#F4A62A', '#7C5CFC', '#D85A8A'],
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
}

/**
 * Rayons alignés sur `--radius: 0.75rem` du web (12 px de base).
 * Les maquettes emploient surtout `rounded-2xl` pour les cartes,
 * d'où un `xl` généreux.
 */
export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  full: 9999,
}

/**
 * Familles typographiques des maquettes.
 * Manrope pour les titres, Inter pour le texte courant.
 *
 * Les polices doivent être chargées au démarrage via `expo-font` ;
 * sans cela, `undefined` renvoie à la police système, ce qui reste
 * lisible mais perd l'identité.
 */
export const fontFamily = {
  heading: 'Manrope_700Bold',
  headingSemi: 'Manrope_600SemiBold',
  body:    'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  mono:    'JetBrainsMono_400Regular',
}

export const fontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  /** Alias de `base` : 14 écrans l'utilisaient déjà sous ce nom. */
  md:   15,
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
