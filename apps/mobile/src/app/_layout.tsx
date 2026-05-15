import { useEffect } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { useAuth } from '@/hooks/useAuth'
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
      if (!inAuthGroup) router.replace('/(auth)/login')
    } else if (profile) {
      if (inAuthGroup) {
        if (profile.role === UserRole.STUDENT) {
          router.replace('/(student)/')
        } else if (profile.role === UserRole.TEACHER) {
          router.replace('/(teacher)/')
        } else if (profile.role === UserRole.DIRECTION) {
          router.replace('/(direction)/')
        } else {
          router.replace('/(teacher)/')
        }
      }
    }
  }, [user, profile, isLoading, segments])

  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AuthGuard />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="(teacher)" />
          <Stack.Screen name="(direction)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
