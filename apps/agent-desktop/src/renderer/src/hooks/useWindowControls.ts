import { useEffect, useState, useCallback } from "react"

/**
 * Hook for native window controls (minimize, maximize, close).
 * Used by the custom title bar on Windows/Linux.
 */
export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [platform, setPlatform] = useState<string>("darwin")

  useEffect(() => {
    if (!window.desktopApi?.window) return

    window.desktopApi.window.getPlatform().then(setPlatform)
    window.desktopApi.window.isMaximized().then(setIsMaximized)

    const unsubscribe = window.desktopApi.window.onMaximizedChanged(setIsMaximized)
    return unsubscribe
  }, [])

  const minimize = useCallback(() => {
    window.desktopApi?.window?.minimize()
  }, [])

  const maximizeToggle = useCallback(() => {
    window.desktopApi?.window?.maximizeToggle()
  }, [])

  const close = useCallback(() => {
    window.desktopApi?.window?.close()
  }, [])

  return { minimize, maximizeToggle, close, isMaximized, platform }
}
