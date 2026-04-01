import { app, type BrowserWindow } from "electron"

const PROTOCOL = "diplomate"

export class DeepLinkService {
  private onNavigateCallback: ((path: string) => void) | null = null

  constructor(private getWindow: () => BrowserWindow | null) {}

  setOnNavigateCallback(cb: (path: string) => void): void {
    this.onNavigateCallback = cb
  }

  register(): void {
    // Register as default handler for diplomate:// URLs
    if (!app.isDefaultProtocolClient(PROTOCOL)) {
      app.setAsDefaultProtocolClient(PROTOCOL)
    }

    // macOS: handle URL open when app is already running
    app.on("open-url", (event, url) => {
      event.preventDefault()
      this.handleUrl(url)
    })

    // Windows/Linux: handle second instance with URL argument
    app.on("second-instance", (_event, argv) => {
      const url = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`))
      if (url) this.handleUrl(url)

      // Focus existing window
      const win = this.getWindow()
      if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
      }
    })
  }

  private handleUrl(url: string): void {
    // Parse diplomate://navigate/iboite/abc123 → /iboite/abc123
    try {
      const parsed = new URL(url)
      if (parsed.host === "navigate") {
        const path = parsed.pathname // e.g. /iboite/abc123
        this.onNavigateCallback?.(path)
      }
    } catch {
      // Invalid URL, ignore
    }
  }
}
