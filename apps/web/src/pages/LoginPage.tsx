import { useState, FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Mail, Lock, School, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/auth.store'
import { useUIStore } from '@/store/ui.store'
import { loginWithEmail } from '@/hooks/useAuth'
import { UserRole } from '@school/shared-types'

export function LoginPage() {
  const { isAuthenticated, role } = useAuthStore()
  const { addToast } = useUIStore()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)

  // Redirect si déjà connecté
  if (isAuthenticated && role) {
    const dest = role === UserRole.STUDENT ? '/student' : role === UserRole.TEACHER ? '/teacher' : '/direction'
    return <Navigate to={dest} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    try {
      await loginWithEmail(email, password)
    } catch (err: unknown) {
      const msg = (err as { code?: string }).code === 'auth/invalid-credential'
        ? 'Email ou mot de passe incorrect.'
        : 'Une erreur est survenue. Réessayez.'
      addToast({ type: 'error', title: 'Connexion impossible', message: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <School size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">EduPlatform</h1>
          <p className="mt-1 text-gray-400">Gestion scolaire assistée par IA</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Bienvenue</h2>
          <p className="text-sm text-gray-500 mb-6">Connectez-vous à votre espace</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Adresse email"
              type="email"
              placeholder="prenom.nom@ecole.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={16} />}
              required
              autoComplete="email"
            />

            <Input
              label="Mot de passe"
              type={showPwd ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button type="button" onClick={() => setShowPwd((v) => !v)}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              required
              autoComplete="current-password"
            />

            <div className="flex justify-end">
              <button type="button" className="text-sm text-primary-600 hover:underline font-medium">
                Mot de passe oublié ?
              </button>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Se connecter
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3 font-medium uppercase tracking-wide">
              Comptes de démonstration
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '👔 Direction', email: 'direction@demo.fr', password: 'demo1234' },
                { label: '📚 Professeur', email: 'prof@demo.fr',      password: 'demo1234' },
              ].map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => { setEmail(demo.email); setPassword(demo.password) }}
                  className="text-xs text-center px-3 py-2 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-600 hover:text-primary-700 transition-colors font-medium"
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          © 2025 EduPlatform · Tous droits réservés
        </p>
      </div>
    </div>
  )
}
