import { useEffect, useCallback } from "react"
import type { Route } from "../components/sidebar/AppSidebar"

interface TrayStatus {
  unreadMail?: number
  pendingApprovals?: number
  printerName?: string
  printerConnected?: boolean
}

/**
 * Syncs app state to the system tray icon.
 * Also handles tray menu action clicks → navigation.
 */
export function useTraySync(onNavigate: (route: Route) => void) {
  // Listen for tray action events
  useEffect(() => {
    if (!window.desktopApi?.tray) return

    const unsubscribe = window.desktopApi.tray.onAction((action) => {
      if (action === "navigate:iboite") {
        onNavigate({ page: "iboite" })
      }
    })

    return unsubscribe
  }, [onNavigate])

  /** Push updated status to the tray menu */
  const updateTrayStatus = useCallback(async (status: TrayStatus) => {
    if (!window.desktopApi?.tray) return
    await window.desktopApi.tray.updateStatus(status)
  }, [])

  return { updateTrayStatus }
}
