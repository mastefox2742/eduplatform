import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { registerIcons } from './components/ui/icons.generated'
import './styles/globals.css'

// Les icônes sont enregistrées avant le premier rendu. Sans cela,
// `@iconify/react` irait les chercher sur api.iconify.design : hors
// ligne, l'interface perdrait toutes ses icônes (§19).
registerIcons()

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
