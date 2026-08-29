import { RouterProvider } from 'react-router-dom'
import { router } from '@/config/router'
import { useAuthInit } from '@/hooks/useAuth'

function AuthInitializer() {
  useAuthInit()
  return null
}

export function App() {
  return (
    <>
      <AuthInitializer />
      <RouterProvider router={router} />
    </>
  )
}
