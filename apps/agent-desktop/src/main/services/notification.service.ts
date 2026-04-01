import { Notification, app, nativeImage } from "electron"
import { readFile, writeFile } from "fs/promises"
import path from "path"
import type {
  NativeNotification,
  NotificationPreferences,
  NotificationClickData,
} from "@workspace/desktop-shared/notification-types"
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@workspace/desktop-shared/notification-types"

export class NotificationService {
  private prefsPath: string
  private prefs: NotificationPreferences | null = null
  private onClickCallback: ((data: NotificationClickData) => void) | null = null

  constructor() {
    this.prefsPath = path.join(app.getPath("userData"), "notification-prefs.json")
  }

  setOnClickCallback(cb: (data: NotificationClickData) => void): void {
    this.onClickCallback = cb
  }

  async show(notification: NativeNotification): Promise<boolean> {
    if (!Notification.isSupported()) return false

    const prefs = await this.getPreferences()
    if (!prefs.enabled) return false
    if (notification.category && !prefs.categories[notification.category]) return false

    const n = new Notification({
      title: notification.title,
      body: notification.body,
      silent: !prefs.sound || notification.sound === false,
      urgency: notification.urgency ?? "normal",
      icon: notification.icon ? nativeImage.createFromPath(notification.icon) : undefined,
    })

    n.on("click", () => {
      this.onClickCallback?.({
        link: notification.link,
        relatedId: notification.relatedId,
        category: notification.category,
      })
    })

    n.show()
    return true
  }

  async getPreferences(): Promise<NotificationPreferences> {
    if (this.prefs) return this.prefs

    try {
      const raw = await readFile(this.prefsPath, "utf-8")
      this.prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) }
    } catch {
      this.prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES }
    }
    return this.prefs!
  }

  async setPreferences(prefs: NotificationPreferences): Promise<void> {
    this.prefs = prefs
    await writeFile(this.prefsPath, JSON.stringify(prefs, null, 2), "utf-8")
  }

  setBadgeCount(count: number): void {
    if (process.platform === "darwin") {
      app.dock.setBadge(count > 0 ? String(count) : "")
    }
    app.setBadgeCount(count)
  }
}
