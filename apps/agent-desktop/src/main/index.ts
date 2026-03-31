import { app, BrowserWindow, ipcMain, session } from "electron"
import path from "path"
import { registerPrinterIpc } from "./ipc/printer.ipc"

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Agent Desktop — Gabon Diplomatie",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
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
      // Remove Origin so Convex doesn't see a cross-origin request
      delete details.requestHeaders["Origin"]
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

  // HMR in dev, file in production
  if (!app.isPackaged && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
