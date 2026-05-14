import { Redirect } from 'expo-router'

// Point d'entrée racine → redirige vers login par défaut
// AuthGuard dans _layout.tsx s'occupe du redirect si déjà connecté
export default function Index() {
  return <Redirect href="/(auth)/login" />
}
