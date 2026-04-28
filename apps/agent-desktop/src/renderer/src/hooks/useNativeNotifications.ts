import { useEffect, useRef, useCallback } from "react"
import type { NativeNotification, NotificationCategory } from "@workspace/desktop-shared/notification-types"

/**
 * Hook that bridges Convex real-time notifications with native OS notifications.
 * Mount once inside the authenticated app boundary.
 *
 * `onNavigate` receives a react-router pathname (e.g. `/icorrespondance`). It is
 * invoked when the user clicks an OS notification or when a notification carries
 * a link the app should resolve to an internal route.
 */
export function useNativeNotifications(
  onNavigate: (path: string) => void
) {
  const prevCountRef = useRef<number | null>(null)

  // Handle notification clicks → navigate to the relevant page
  useEffect(() => {
    if (!window.desktopApi?.notifications) return

    const unsubscribe = window.desktopApi.notifications.onNotificationClick((data) => {
      if (!data.link) return

      const path = resolvePath(data.link, data.category)
      if (path) onNavigate(path)
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

/** Map a link path or category to an internal react-router pathname. */
function resolvePath(
  link: string,
  category?: NotificationCategory
): string | null {
  const knownPrefixes = [
    "/icorrespondance",
    "/idocument",
    "/iagenda",
    "/iarchive",
    "/requests",
    "/appointments",
    "/payments",
    "/meetings",
    "/impression",
    "/settings",
  ]

  // Exact match
  if (knownPrefixes.includes(link)) return link
  // Prefix match (keep deep link intact — react-router handles the sub-route)
  for (const prefix of knownPrefixes) {
    if (link.startsWith(prefix + "/") || link.startsWith(prefix + "?")) return link
  }

  // Fallback by category
  if (category) {
    const categoryPaths: Partial<Record<NotificationCategory, string>> = {
      approval: "/icorrespondance",
      appointment: "/appointments",
      payment: "/payments",
      print: "/impression",
      meeting: "/meetings",
      document: "/idocument",
    }
    return categoryPaths[category] ?? null
  }

  return null
}
