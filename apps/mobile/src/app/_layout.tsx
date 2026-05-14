import { useEffect } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@school/shared-types'

function AuthGuard() {
  const { user, profile, isLoading } = useAuth()
  const segments = useSegments()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup    = segments[0] === '(auth)'
    const inStudentGroup = segments[0] === '(student)'

    if (!user) {
      if (!inAuthGroup) router.replace('/(auth)/login')
    } else if (profile) {
      if (inAuthGroup) {
        // Redirige vers le bon espace selon le rôle
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
