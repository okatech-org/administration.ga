import { app, BrowserWindow, ipcMain, session } from "electron"
import path from "path"
import { registerPrinterIpc } from "./ipc/printer.ipc"
import { registerNotificationIpc } from "./ipc/notification.ipc"
import { registerFileDialogIpc } from "./ipc/file-dialog.ipc"
import { registerTrayIpc } from "./ipc/tray.ipc"
import { registerClipboardIpc } from "./ipc/clipboard.ipc"
import { registerMenuIpc } from "./ipc/menu.ipc"
import { DeepLinkService } from "./services/deep-link.service"
import { registerUpdaterIpc } from "./ipc/updater.ipc"

let mainWindow: BrowserWindow | null = null

// Ensure single instance for deep link handling
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Diplomate.ga — Portail Agent Consulaire",
    backgroundColor: "#1A1A1A",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      // Disable web security so the renderer can call Convex directly
      // without CORS preflight. This is safe — Electron is a native app.
      webSecurity: false,
    },
  })

  // ── Bypass CORS for the Convex backend ────────────────────────────

  // Electron is a native app — CORS restrictions don't apply.
  // The Convex HTTP endpoint doesn't serve OPTIONS preflight responses,
  // so we strip the Origin header on outgoing requests to Convex and
  // inject permissive CORS headers on responses.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ["http://127.0.0.1:3211/*", "https://*.convex.site/*"] },
    (details, callback) => {
      // Set Origin to the Convex site URL itself so Better Auth trusts it
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

  // Register IPC handlers
  registerPrinterIpc(ipcMain)
  registerNotificationIpc(ipcMain, mainWindow)
  registerFileDialogIpc(ipcMain, mainWindow)
  registerTrayIpc(ipcMain, mainWindow)
  registerClipboardIpc(ipcMain)
  registerMenuIpc(ipcMain, mainWindow)
  registerUpdaterIpc(ipcMain, mainWindow)

  // On macOS, hide window instead of closing so tray stays active
  mainWindow.on("close", (e) => {
    if (process.platform === "darwin" && !(app as any).isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

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
