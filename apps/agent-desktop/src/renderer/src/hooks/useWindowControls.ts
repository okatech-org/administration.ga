import { useEffect, useState, useCallback } from "react"

/**
 * Hook for native window controls (minimize, maximize, close, always-on-top).
 * Used by the custom title bar on Windows/Linux + iAsted side panel toggle.
 */
export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false)
  const [platform, setPlatform] = useState<string>("darwin")

  useEffect(() => {
    if (!window.desktopApi?.window) return

    window.desktopApi.window.getPlatform().then(setPlatform)
    window.desktopApi.window.isMaximized().then(setIsMaximized)
    window.desktopApi.window.getAlwaysOnTop?.().then(setIsAlwaysOnTop)

    const unsubMax = window.desktopApi.window.onMaximizedChanged(setIsMaximized)
    const unsubTop =
      window.desktopApi.window.onAlwaysOnTopChanged?.(setIsAlwaysOnTop) ??
      (() => {})
    return () => {
      unsubMax()
      unsubTop()
    }
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

  const toggleAlwaysOnTop = useCallback(() => {
    setIsAlwaysOnTop((curr) => {
      const next = !curr
      window.desktopApi?.window?.setAlwaysOnTop?.(next)
      return next
    })
  }, [])

  return {
    minimize,
    maximizeToggle,
    close,
    isMaximized,
    isAlwaysOnTop,
    toggleAlwaysOnTop,
    platform,
  }
}
