import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <div className="text-center">
        <p className="text-8xl font-black text-gray-100">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Page introuvable</h1>
        <p className="text-gray-500 mt-2 mb-6">Cette page n'existe pas ou a été déplacée.</p>
        <Link to="/"><Button variant="primary">Retour à l'accueil</Button></Link>
      </div>
    </div>
  )
}
