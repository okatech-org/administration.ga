import { Tray, Menu, nativeImage, app, type BrowserWindow } from "electron"
import path from "path"

export interface TrayStatus {
  pendingApprovals?: number
  printerName?: string
  printerConnected?: boolean
}

export class TrayService {
  private tray: Tray | null = null
  private status: TrayStatus = {}
  private onActionCallback: ((action: string) => void) | null = null

  constructor(private getWindow: () => BrowserWindow | null) {}

  setOnActionCallback(cb: (action: string) => void): void {
    this.onActionCallback = cb
  }

  create(): void {
    const iconPath = this.getIconPath()
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 })
    this.tray = new Tray(icon)
    this.tray.setToolTip("Diplomate.ga")

    this.tray.on("click", () => {
      this.showWindow()
    })

    this.rebuildMenu()
  }

  updateStatus(status: Partial<TrayStatus>): void {
    this.status = { ...this.status, ...status }
    this.rebuildMenu()
    this.updateTooltip()
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }

  private showWindow(): void {
    const win = this.getWindow()
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }

  private rebuildMenu(): void {
    if (!this.tray) return

    const { pendingApprovals = 0, printerName, printerConnected } = this.status

    const template: Electron.MenuItemConstructorOptions[] = []

    // Status section
    if (pendingApprovals > 0) {
      template.push({
        label: `${pendingApprovals} approbation${pendingApprovals > 1 ? "s" : ""} en attente`,
        enabled: false,
      })
    }
    if (printerName) {
      template.push({
        label: `Imprimante: ${printerName} (${printerConnected ? "connectee" : "deconnectee"})`,
        enabled: false,
      })
    }

    if (template.length > 0) {
      template.push({ type: "separator" })
    }

    // Actions
    template.push(
      {
        label: "Ouvrir Diplomate.ga",
        click: () => this.showWindow(),
      },
      {
        label: "Scanner peripheriques",
        click: () => {
          this.onActionCallback?.("printer:scan")
        },
      },
      { type: "separator" },
      {
        label: "Quitter",
        click: () => app.quit(),
      }
    )

    this.tray.setContextMenu(Menu.buildFromTemplate(template))
  }

  private updateTooltip(): void {
    if (!this.tray) return
    this.tray.setToolTip("Diplomate.ga")
  }

  private getIconPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "icons", "apple-icon.png")
    }
    return path.join(__dirname, "../../renderer/public/icons/apple-icon.png")
  }
}
