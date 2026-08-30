import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { PreviewBanner } from './PreviewBanner'
import { ToastContainer } from '@/components/ui/Toast'
import { useAutoCollapse } from '@/hooks/useAutoCollapse'

export function AppShell() {
  // Sur écran étroit, la barre latérale se replie d'elle-même : sinon
  // le contenu déborde et la page défile horizontalement (§23).
  useAutoCollapse()

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* N'apparaît qu'en mode aperçu ; sinon le composant ne rend rien. */}
      <PreviewBanner />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          <div className="p-5 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
