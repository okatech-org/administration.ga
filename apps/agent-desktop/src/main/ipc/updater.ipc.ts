import type { IpcMain, BrowserWindow } from "electron"
import { UpdaterService } from "../services/updater.service"

export function registerUpdaterIpc(
  ipcMain: IpcMain,
  mainWindow: BrowserWindow
): void {
  const updaterService = new UpdaterService()

  // Forward update status changes to renderer
  updaterService.setStatusCallback((status) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("system:update-status", status)
    }
  })

  // Start periodic update checks
  updaterService.startPeriodicCheck()

  ipcMain.handle("system:check-update", async () => {
    await updaterService.checkForUpdates()
  })

  ipcMain.handle("system:install-update", async () => {
    updaterService.installUpdate()
  })

  ipcMain.handle("system:get-version", async () => {
    return updaterService.getVersion()
  })
}
