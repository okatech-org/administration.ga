import { useEffect, useState, useCallback } from "react"

interface UpdateStatus {
  state: "idle" | "checking" | "available" | "downloading" | "ready" | "error"
  version?: string
  progress?: number
  error?: string
}

/**
 * Hook for auto-update functionality.
 * Listens for update status from main process.
 */
export function useAutoUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({ state: "idle" })
  const [appVersion, setAppVersion] = useState<string>("")

  // Listen for update status push events from main process
  useEffect(() => {
    if (!window.desktopApi?.updater) return
    const unsubscribe = window.desktopApi.updater.onStatus(setStatus)
    return unsubscribe
  }, [])

  // Get app version on mount
  useEffect(() => {
    if (!window.desktopApi?.updater) return
    window.desktopApi.updater.getVersion().then(setAppVersion).catch(() => {})
  }, [])

  const checkForUpdate = useCallback(async () => {
    if (!window.desktopApi?.updater) return
    await window.desktopApi.updater.checkForUpdate()
  }, [])

  const installUpdate = useCallback(async () => {
    if (!window.desktopApi?.updater) return
    await window.desktopApi.updater.installUpdate()
  }, [])

  return {
    status,
    appVersion,
    updateAvailable: status.state === "available" || status.state === "ready",
    isReady: status.state === "ready",
    isDownloading: status.state === "downloading",
    downloadProgress: status.progress,
    checkForUpdate,
    installUpdate,
  }
}
