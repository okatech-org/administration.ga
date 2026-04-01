import { contextBridge, ipcRenderer } from "electron"
import type {
  NativeNotification,
  NotificationPreferences,
  NotificationClickData,
} from "@workspace/desktop-shared/notification-types"
import type {
  SaveDialogOptions,
  OpenDialogOptions,
} from "@workspace/desktop-shared/file-dialog-types"
import type { ContextMenuItem } from "@workspace/desktop-shared/context-menu-types"

const printerApi = {
  listDevices: () => ipcRenderer.invoke("printer:list-devices"),
  connect: (name: string) => ipcRenderer.invoke("printer:connect", name),
  disconnect: () => ipcRenderer.invoke("printer:disconnect"),
  getStatus: () => ipcRenderer.invoke("printer:get-status"),
  getConnectedInfo: () => ipcRenderer.invoke("printer:get-connected-info"),
  print: (options: {
    frontImagePath: string
    backImagePath?: string
    duplex?: boolean
  }) => ipcRenderer.invoke("printer:print", options),
  printFromBuffer: (options: {
    frontBuffer: ArrayBuffer
    backBuffer?: ArrayBuffer
    duplex?: boolean
  }) => ipcRenderer.invoke("printer:print-from-buffer", options),
}

const notificationsApi = {
  show: (n: NativeNotification) => ipcRenderer.invoke("system:notify", n),
  getPreferences: () =>
    ipcRenderer.invoke("system:notify:get-prefs") as Promise<NotificationPreferences>,
  setPreferences: (prefs: NotificationPreferences) =>
    ipcRenderer.invoke("system:notify:set-prefs", prefs),
  onNotificationClick: (cb: (data: NotificationClickData) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: NotificationClickData) => cb(data)
    ipcRenderer.on("system:notify:on-click", handler)
    return () => {
      ipcRenderer.removeListener("system:notify:on-click", handler)
    }
  },
}

const badgeApi = {
  setCount: (count: number) => ipcRenderer.invoke("system:badge:set-count", count),
}

const fileDialogApi = {
  save: (options: SaveDialogOptions) => ipcRenderer.invoke("file:save-dialog", options),
  open: (options: OpenDialogOptions) => ipcRenderer.invoke("file:open-dialog", options),
}

const trayApi = {
  updateStatus: (status: {
    unreadMail?: number
    pendingApprovals?: number
    printerName?: string
    printerConnected?: boolean
  }) => ipcRenderer.invoke("tray:update-status", status),
  onAction: (cb: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => cb(action)
    ipcRenderer.on("tray:action", handler)
    return () => {
      ipcRenderer.removeListener("tray:action", handler)
    }
  },
}

const clipboardApi = {
  writeText: (text: string) => ipcRenderer.invoke("clipboard:write-text", text),
  readText: () => ipcRenderer.invoke("clipboard:read-text") as Promise<string>,
}

const menuApi = {
  onAction: (cb: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => cb(action)
    ipcRenderer.on("menu:action", handler)
    return () => {
      ipcRenderer.removeListener("menu:action", handler)
    }
  },
}

const updaterApi = {
  checkForUpdate: () => ipcRenderer.invoke("system:check-update"),
  installUpdate: () => ipcRenderer.invoke("system:install-update"),
  getVersion: () => ipcRenderer.invoke("system:get-version") as Promise<string>,
  onStatus: (cb: (status: { state: string; version?: string; progress?: number; error?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: any) => cb(status)
    ipcRenderer.on("system:update-status", handler)
    return () => {
      ipcRenderer.removeListener("system:update-status", handler)
    }
  },
}

const windowApi = {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximizeToggle: () => ipcRenderer.invoke("window:maximize-toggle"),
  close: () => ipcRenderer.invoke("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:is-maximized") as Promise<boolean>,
  getPlatform: () => ipcRenderer.invoke("window:get-platform") as Promise<string>,
  setProgressBar: (value: number) => ipcRenderer.invoke("system:set-progress", value),
  onMaximizedChanged: (cb: (isMaximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, val: boolean) => cb(val)
    ipcRenderer.on("window:maximized-changed", handler)
    return () => {
      ipcRenderer.removeListener("window:maximized-changed", handler)
    }
  },
  onThemeChanged: (cb: (data: { shouldUseDarkColors: boolean }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => cb(data)
    ipcRenderer.on("system:theme-changed", handler)
    return () => {
      ipcRenderer.removeListener("system:theme-changed", handler)
    }
  },
}

const spellCheckApi = {
  setEnabled: (enabled: boolean) => ipcRenderer.invoke("system:set-spell-check", enabled),
  isEnabled: () => ipcRenderer.invoke("system:get-spell-check") as Promise<boolean>,
}

const contextMenuApi = {
  show: (items: ContextMenuItem[]) =>
    ipcRenderer.invoke("context-menu:show", items) as Promise<string | null>,
}

contextBridge.exposeInMainWorld("desktopApi", {
  printer: printerApi,
  notifications: notificationsApi,
  badge: badgeApi,
  fileDialog: fileDialogApi,
  tray: trayApi,
  clipboard: clipboardApi,
  menu: menuApi,
  updater: updaterApi,
  window: windowApi,
  spellCheck: spellCheckApi,
  contextMenu: contextMenuApi,
})

export type DesktopApi = {
  printer: typeof printerApi
  notifications: typeof notificationsApi
  badge: typeof badgeApi
  fileDialog: typeof fileDialogApi
  tray: typeof trayApi
  clipboard: typeof clipboardApi
  menu: typeof menuApi
  updater: typeof updaterApi
  window: typeof windowApi
  spellCheck: typeof spellCheckApi
  contextMenu: typeof contextMenuApi
}
