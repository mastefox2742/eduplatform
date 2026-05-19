import { useEffect } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/theme'
import { UserRole } from '@school/shared-types'

// Empêche le splash de se masquer automatiquement avant que l'app soit prête
SplashScreen.preventAutoHideAsync()

function AuthGuard() {
  const { user, profile, isLoading } = useAuth()
  const segments = useSegments()

  useEffect(() => {
    if (isLoading) return

    // L'app est prête → on masque le splash screen
    SplashScreen.hideAsync()

    const inAuthGroup = segments[0] === '(auth)'

    if (!user) {
      // Pas connecté → login
      if (!inAuthGroup) router.replace('/(auth)/login')
    } else if (profile) {
      // Connecté + profil chargé → redirection selon le rôle
      if (inAuthGroup) {
        if (profile.role === UserRole.STUDENT) {
          router.replace('/(student)/')
        } else if (profile.role === UserRole.TEACHER) {
          router.replace('/(teacher)/')
        } else if (profile.role === UserRole.DIRECTION) {
          router.replace('/(direction)/')
        } else if (profile.role === UserRole.PARENT) {
          router.replace('/(parent)/')
        } else {
          router.replace('/(teacher)/')
        }
      }
      // Note sécurité : si user != null mais profile == null (erreur réseau Firestore),
      // on ne redirige pas — les Firestore Security Rules (JWT claims) protègent les données.
    }
  }, [user, profile, isLoading, segments])

  return null
}

export default function RootLayout() {
  const { isDark, colors } = useTheme()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ backgroundColor: colors.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="(teacher)" />
          <Stack.Screen name="(direction)" />
          <Stack.Screen name="(parent)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
