import { useEffect } from "react"

/**
 * Listens for native menu bar actions and dispatches navigation to the given
 * react-router pathname handler.
 */
export function useMenuActions(onNavigate: (path: string) => void) {
  useEffect(() => {
    if (!window.desktopApi?.menu) return

    const unsubscribe = window.desktopApi.menu.onAction((action) => {
      const pathMap: Record<string, string> = {
        "navigate:dashboard": "/",
        "navigate:iboite": "/iboite",
        "navigate:icorrespondance": "/icorrespondance",
        "navigate:idocument": "/idocument",
        "navigate:iagenda": "/iagenda",
        "navigate:impression": "/impression",
        "navigate:settings": "/settings",
      }

      const path = pathMap[action]
      if (path) onNavigate(path)
    })

    return unsubscribe
  }, [onNavigate])
}
