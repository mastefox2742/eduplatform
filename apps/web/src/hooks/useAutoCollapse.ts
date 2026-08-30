import { useEffect, useRef } from 'react'
import { useUIStore } from '@/store/ui.store'

/**
 * Replie la navigation latérale quand la fenêtre devient étroite.
 *
 * §23 : « la page ne doit jamais défiler horizontalement ». Avec une
 * barre de 288 px, un écran de 800 px ne laisse que 512 px au contenu —
 * les tableaux débordent et la page se met à glisser latéralement.
 *
 * Le seuil est fixé à 1024 px, largeur en dessous de laquelle une barre
 * dépliée coûte plus qu'elle ne rapporte.
 *
 * Le repli automatique ne s'impose qu'une fois par franchissement de
 * seuil : si l'utilisateur rouvre la barre sur un écran étroit, on
 * respecte son choix jusqu'au prochain redimensionnement.
 */
const BREAKPOINT = 1024

export function useAutoCollapse() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const wasNarrow = useRef<boolean | null>(null)
  const collapsedRef = useRef(sidebarCollapsed)
  collapsedRef.current = sidebarCollapsed

  useEffect(() => {
    function apply() {
      const narrow = window.innerWidth < BREAKPOINT

      // Rien à faire tant qu'on ne franchit pas le seuil.
      if (narrow === wasNarrow.current) return
      wasNarrow.current = narrow

      if (narrow && !collapsedRef.current) toggleSidebar()
      if (!narrow && collapsedRef.current) toggleSidebar()
    }

    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [toggleSidebar])
}
