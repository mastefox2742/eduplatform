import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <div className="text-center">
        <p className="text-6xl mb-4">🔒</p>
        <h1 className="text-2xl font-bold text-gray-900">Accès refusé</h1>
        <p className="text-gray-500 mt-2 mb-6">Vous n'avez pas les permissions pour accéder à cette page.</p>
        <Link to="/"><Button variant="primary">Retour à l'accueil</Button></Link>
      </div>
    </div>
  )
}
