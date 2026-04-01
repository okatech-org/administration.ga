import { type IpcMain, type BrowserWindow, type Session } from "electron"

export function registerWindowIpc(
  ipcMain: IpcMain,
  mainWindow: BrowserWindow
): void {
  ipcMain.handle("window:minimize", () => {
    if (!mainWindow.isDestroyed()) mainWindow.minimize()
  })

  ipcMain.handle("window:maximize-toggle", () => {
    if (mainWindow.isDestroyed()) return
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.handle("window:close", () => {
    if (!mainWindow.isDestroyed()) mainWindow.close()
  })

  ipcMain.handle("window:is-maximized", () => {
    return !mainWindow.isDestroyed() && mainWindow.isMaximized()
  })

  ipcMain.handle("window:get-platform", () => {
    return process.platform
  })

  // Progress bar (for print jobs, uploads)
  ipcMain.handle("system:set-progress", (_event, value: number) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(value)
    }
  })

  // Spell check
  ipcMain.handle("system:set-spell-check", (_event, enabled: boolean) => {
    const ses = mainWindow.webContents.session
    if (enabled) {
      ses.setSpellCheckerLanguages(["fr", "en-US"])
    } else {
      ses.setSpellCheckerLanguages([])
    }
  })

  ipcMain.handle("system:get-spell-check", () => {
    return mainWindow.webContents.session.getSpellCheckerLanguages().length > 0
  })

  // Forward maximize state changes to renderer
  mainWindow.on("maximize", () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("window:maximized-changed", true)
    }
  })
  mainWindow.on("unmaximize", () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("window:maximized-changed", false)
    }
  })
}
