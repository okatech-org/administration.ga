import { app, BrowserWindow, ipcMain, session, nativeTheme } from "electron"
import path from "path"
import { registerPrinterIpc } from "./ipc/printer.ipc"
import { registerNotificationIpc } from "./ipc/notification.ipc"
import { registerFileDialogIpc } from "./ipc/file-dialog.ipc"
import { registerTrayIpc } from "./ipc/tray.ipc"
import { registerClipboardIpc } from "./ipc/clipboard.ipc"
import { registerMenuIpc } from "./ipc/menu.ipc"
import { registerUpdaterIpc } from "./ipc/updater.ipc"
import { registerWindowIpc } from "./ipc/window.ipc"
import { registerContextMenuIpc } from "./ipc/context-menu.ipc"
import { DeepLinkService } from "./services/deep-link.service"
import { WindowStateService } from "./services/window-state.service"

let mainWindow: BrowserWindow | null = null

// Ensure single instance for deep link handling
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

const windowStateService = new WindowStateService()

function createWindow(): BrowserWindow {
  const savedState = windowStateService.load()

  const isMac = process.platform === "darwin"

  mainWindow = new BrowserWindow({
    ...savedState,
    minWidth: 900,
    minHeight: 600,
    title: "Diplomate.ga — Portail Agent Consulaire",
    backgroundColor: isMac ? "#00000000" : "#1A1A1A",
    show: false, // Prevent white flash — show on ready-to-show

    // Frameless window configuration
    ...(isMac
      ? {
          titleBarStyle: "hiddenInset" as const,
          trafficLightPosition: { x: 20, y: 18 },
          vibrancy: "sidebar" as const,
          visualEffectState: "followWindow" as const,
        }
      : {
          frame: false,
        }),

    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      webSecurity: false,
      spellcheck: true,
    },
  })

  // Enable spell checking (French + English)
  session.defaultSession.setSpellCheckerLanguages(["fr", "en-US"])

  // ── Bypass CORS for the Convex backend ────────────────────────────
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ["http://127.0.0.1:3211/*", "https://*.convex.site/*"] },
    (details, callback) => {
      details.requestHeaders["Origin"] = "http://127.0.0.1:3211"
      callback({ requestHeaders: details.requestHeaders })
    }
  )
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ["http://127.0.0.1:3211/*", "https://*.convex.site/*"] },
    (details, callback) => {
      const headers = details.responseHeaders ?? {}
      headers["Access-Control-Allow-Origin"] = ["*"]
      headers["Access-Control-Allow-Headers"] = ["Content-Type, Authorization"]
      headers["Access-Control-Allow-Methods"] = ["GET, POST, PUT, DELETE, OPTIONS"]
      headers["Access-Control-Allow-Credentials"] = ["true"]
      callback({ responseHeaders: headers })
    }
  )

  // Register all IPC handlers
  registerPrinterIpc(ipcMain)
  registerNotificationIpc(ipcMain, mainWindow)
  registerFileDialogIpc(ipcMain, mainWindow)
  registerTrayIpc(ipcMain, mainWindow)
  registerClipboardIpc(ipcMain)
  registerMenuIpc(ipcMain, mainWindow)
  registerUpdaterIpc(ipcMain, mainWindow)
  registerWindowIpc(ipcMain, mainWindow)
  registerContextMenuIpc(ipcMain, mainWindow)

  // ── Window state persistence ──────────────────────────────────────
  mainWindow.on("close", (e) => {
    // Save window bounds before closing
    if (mainWindow && !mainWindow.isDestroyed()) {
      windowStateService.save({
        ...mainWindow.getBounds(),
        isMaximized: mainWindow.isMaximized(),
      })
    }

    // On macOS, hide instead of closing (tray stays active)
    if (process.platform === "darwin" && !(app as any).isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  // Restore maximized state
  if (savedState.isMaximized) {
    mainWindow.maximize()
  }

  // Show window when ready (prevents white flash)
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show()
  })

  // ── Native theme sync ─────────────────────────────────────────────
  const sendTheme = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("system:theme-changed", {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
      })
    }
  }
  nativeTheme.on("updated", sendTheme)

  // Open DevTools in dev
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  // HMR in dev, file in production
  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"))
  }

  return mainWindow
}

// Deep link protocol registration
const deepLinkService = new DeepLinkService(() =>
  mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
)
deepLinkService.register()

// Track quit intent for macOS hide-on-close behavior
app.on("before-quit", () => {
  ;(app as typeof app & { isQuitting: boolean }).isQuitting = true
})

app.whenReady().then(() => {
  const win = createWindow()

  // Forward deep link navigation to renderer
  deepLinkService.setOnNavigateCallback((path) => {
    if (!win.isDestroyed()) {
      win.webContents.send("menu:action", `navigate:${path.split("/")[1]}`)
    }
  })

  app.on("activate", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
