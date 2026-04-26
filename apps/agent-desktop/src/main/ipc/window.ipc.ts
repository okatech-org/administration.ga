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

  // Always-on-top — utile quand iAsted est ouvert en side-panel et qu'on
  // veut garder la fenêtre Consulat Agent visible par-dessus une autre app
  // (ex. consulter pendant un appel Zoom, lire un PDF dans un autre soft).
  ipcMain.handle("window:get-always-on-top", () => {
    return !mainWindow.isDestroyed() && mainWindow.isAlwaysOnTop()
  })
  ipcMain.handle("window:set-always-on-top", (_event, value: boolean) => {
    if (mainWindow.isDestroyed()) return
    // 'floating' = au-dessus des fenêtres normales sans s'immiscer dans les
    // contextes système (Mission Control / Spotlight). C'est le bon niveau
    // pour un panneau d'assistant qui doit rester visible sans être agressif.
    mainWindow.setAlwaysOnTop(value, "floating")
    mainWindow.webContents.send("window:always-on-top-changed", value)
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
