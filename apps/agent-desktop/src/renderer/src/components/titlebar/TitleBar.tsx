import { Minus, Square, X, Copy } from "lucide-react"
import { useWindowControls } from "../../hooks/useWindowControls"

/**
 * Custom title bar for frameless Electron window.
 * - macOS: transparent drag region (native traffic lights are inset via trafficLightPosition)
 * - Windows/Linux: custom window controls (minimize, maximize, close)
 */
export function TitleBar() {
  const { minimize, maximizeToggle, close, isMaximized, platform } = useWindowControls()

  const isMac = platform === "darwin"

  return (
    <div
      className="h-8 flex items-center shrink-0 select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {isMac ? (
        // macOS: just a drag region — traffic lights are positioned by Electron
        <div className="flex-1 h-full" />
      ) : (
        // Windows/Linux: custom controls
        <>
          <div className="flex-1 h-full flex items-center pl-4">
            <span className="text-xs text-muted-foreground font-medium">
              Diplomate.ga
            </span>
          </div>
          <div
            className="flex h-full"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <button
              onClick={minimize}
              className="w-12 h-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Minimize"
            >
              <Minus className="size-4" />
            </button>
            <button
              onClick={maximizeToggle}
              className="w-12 h-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              aria-label={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Copy className="size-3.5" /> : <Square className="size-3.5" />}
            </button>
            <button
              onClick={close}
              className="w-12 h-full flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
