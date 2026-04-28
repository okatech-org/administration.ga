import { useCallback } from "react"

interface TrayStatus {
  pendingApprovals?: number
  printerName?: string
  printerConnected?: boolean
}

/**
 * Syncs app state to the system tray icon.
 */
export function useTraySync() {
  /** Push updated status to the tray menu */
  const updateTrayStatus = useCallback(async (status: TrayStatus) => {
    if (!window.desktopApi?.tray) return
    await window.desktopApi.tray.updateStatus(status)
  }, [])

  return { updateTrayStatus }
}
