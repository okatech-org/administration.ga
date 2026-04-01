import type { IpcMain, BrowserWindow } from "electron"
import { NotificationService } from "../services/notification.service"
import type {
  NativeNotification,
  NotificationPreferences,
} from "@workspace/desktop-shared/notification-types"

const notificationService = new NotificationService()

export function registerNotificationIpc(
  ipcMain: IpcMain,
  mainWindow: BrowserWindow
): void {
  // Forward notification clicks to renderer for navigation
  notificationService.setOnClickCallback((data) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("system:notify:on-click", data)
      // Bring window to front when notification is clicked
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  ipcMain.handle(
    "system:notify",
    async (_event, notification: NativeNotification) => {
      return notificationService.show(notification)
    }
  )

  ipcMain.handle("system:notify:get-prefs", async () => {
    return notificationService.getPreferences()
  })

  ipcMain.handle(
    "system:notify:set-prefs",
    async (_event, prefs: NotificationPreferences) => {
      return notificationService.setPreferences(prefs)
    }
  )

  ipcMain.handle(
    "system:badge:set-count",
    async (_event, count: number) => {
      notificationService.setBadgeCount(count)
    }
  )
}
