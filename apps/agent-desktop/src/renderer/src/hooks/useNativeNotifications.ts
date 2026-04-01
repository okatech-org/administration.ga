import { useEffect, useRef, useCallback } from "react"
import type { NativeNotification, NotificationCategory } from "@workspace/desktop-shared/notification-types"
import type { Route } from "../components/sidebar/AppSidebar"

/**
 * Hook that bridges Convex real-time notifications with native OS notifications.
 * Mount once inside the authenticated app boundary.
 */
export function useNativeNotifications(
  onNavigate: (route: Route) => void
) {
  const prevCountRef = useRef<number | null>(null)

  // Handle notification clicks → navigate to the relevant page
  useEffect(() => {
    if (!window.desktopApi?.notifications) return

    const unsubscribe = window.desktopApi.notifications.onNotificationClick((data) => {
      if (!data.link) return

      // Map link/category to internal route
      const route = resolveRoute(data.link, data.category)
      if (route) onNavigate(route)
    })

    return unsubscribe
  }, [onNavigate])

  /** Show a native OS notification */
  const showNotification = useCallback(
    async (notification: NativeNotification) => {
      if (!window.desktopApi?.notifications) return false
      return window.desktopApi.notifications.show(notification)
    },
    []
  )

  /** Update the macOS dock badge count */
  const setBadgeCount = useCallback((count: number) => {
    if (!window.desktopApi?.badge) return
    // Only update when count actually changes
    if (prevCountRef.current === count) return
    prevCountRef.current = count
    window.desktopApi.badge.setCount(count)
  }, [])

  return { showNotification, setBadgeCount }
}

/** Map a link path or category to an internal Route */
function resolveRoute(
  link: string,
  category?: NotificationCategory
): Route | null {
  // Direct page mappings from link paths
  const pageMap: Record<string, Route> = {
    "/iboite": { page: "iboite" },
    "/icorrespondance": { page: "icorrespondance" },
    "/idocument": { page: "idocument" },
    "/iagenda": { page: "iagenda" },
    "/iarchive": { page: "iarchive" },
    "/requests": { page: "requests" },
    "/appointments": { page: "appointments" },
    "/payments": { page: "payments" },
    "/meetings": { page: "meetings" },
    "/impression": { page: "impression" },
    "/settings": { page: "settings" },
  }

  // Try exact match first
  if (pageMap[link]) return pageMap[link]

  // Try prefix match (e.g. "/requests/abc123" → requests page)
  for (const [prefix, route] of Object.entries(pageMap)) {
    if (link.startsWith(prefix)) return route
  }

  // Fallback by category
  if (category) {
    const categoryRoutes: Partial<Record<NotificationCategory, Route>> = {
      mail: { page: "iboite" },
      approval: { page: "icorrespondance" },
      appointment: { page: "appointments" },
      payment: { page: "payments" },
      print: { page: "impression" },
      meeting: { page: "meetings" },
      document: { page: "idocument" },
    }
    return categoryRoutes[category] ?? null
  }

  return null
}
