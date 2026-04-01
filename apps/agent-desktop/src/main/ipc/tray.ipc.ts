import type { IpcMain, BrowserWindow } from "electron"
import { TrayService, type TrayStatus } from "../services/tray.service"

export function registerTrayIpc(
  ipcMain: IpcMain,
  mainWindow: BrowserWindow
): TrayService {
  const trayService = new TrayService(() =>
    mainWindow.isDestroyed() ? null : mainWindow
  )

  // Forward tray actions to renderer
  trayService.setOnActionCallback((action) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("tray:action", action)
    }
  })

  trayService.create()

  ipcMain.handle(
    "tray:update-status",
    async (_event, status: Partial<TrayStatus>) => {
      trayService.updateStatus(status)
    }
  )

  return trayService
}
