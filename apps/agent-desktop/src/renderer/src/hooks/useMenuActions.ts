import { useEffect } from "react"
import type { Route } from "../components/sidebar/AppSidebar"

/**
 * Listens for native menu bar actions and dispatches navigation.
 */
export function useMenuActions(onNavigate: (route: Route) => void) {
  useEffect(() => {
    if (!window.desktopApi?.menu) return

    const unsubscribe = window.desktopApi.menu.onAction((action) => {
      const routeMap: Record<string, Route> = {
        "navigate:dashboard": { page: "dashboard" },
        "navigate:iboite": { page: "iboite" },
        "navigate:icorrespondance": { page: "icorrespondance" },
        "navigate:idocument": { page: "idocument" },
        "navigate:iagenda": { page: "iagenda" },
        "navigate:impression": { page: "impression" },
        "navigate:settings": { page: "settings" },
      }

      const route = routeMap[action]
      if (route) onNavigate(route)
    })

    return unsubscribe
  }, [onNavigate])
}
