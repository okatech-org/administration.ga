import { app } from "electron"

export interface UpdateStatus {
  state: "idle" | "checking" | "available" | "downloading" | "ready" | "error"
  version?: string
  progress?: number
  error?: string
}

type StatusCallback = (status: UpdateStatus) => void

/**
 * Auto-updater service.
 * Requires `electron-updater` package to be installed.
 * Gracefully degrades if the package is not available.
 */
export class UpdaterService {
  private statusCallback: StatusCallback | null = null
  private autoUpdater: any = null
  private checkInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { autoUpdater } = require("electron-updater")
      this.autoUpdater = autoUpdater
      this.autoUpdater.autoDownload = true
      this.autoUpdater.autoInstallOnAppQuit = true
      this.setupListeners()
    } catch {
      console.log("[updater] electron-updater not installed, auto-update disabled")
    }
  }

  setStatusCallback(cb: StatusCallback): void {
    this.statusCallback = cb
  }

  async checkForUpdates(): Promise<void> {
    if (!this.autoUpdater) return
    this.emit({ state: "checking" })
    try {
      await this.autoUpdater.checkForUpdates()
    } catch (err) {
      this.emit({ state: "error", error: String(err) })
    }
  }

  installUpdate(): void {
    if (!this.autoUpdater) return
    this.autoUpdater.quitAndInstall()
  }

  startPeriodicCheck(intervalMs = 4 * 60 * 60 * 1000): void {
    if (!this.autoUpdater) return
    // Initial check after 10 seconds
    setTimeout(() => this.checkForUpdates(), 10_000)
    this.checkInterval = setInterval(() => this.checkForUpdates(), intervalMs)
  }

  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  getVersion(): string {
    return app.getVersion()
  }

  private setupListeners(): void {
    if (!this.autoUpdater) return

    this.autoUpdater.on("update-available", (info: any) => {
      this.emit({ state: "available", version: info.version })
    })

    this.autoUpdater.on("update-not-available", () => {
      this.emit({ state: "idle" })
    })

    this.autoUpdater.on("download-progress", (progress: any) => {
      this.emit({ state: "downloading", progress: progress.percent })
    })

    this.autoUpdater.on("update-downloaded", (info: any) => {
      this.emit({ state: "ready", version: info.version })
    })

    this.autoUpdater.on("error", (err: Error) => {
      this.emit({ state: "error", error: err.message })
    })
  }

  private emit(status: UpdateStatus): void {
    this.statusCallback?.(status)
  }
}
