import type {
  EvolisDevice,
  EvolisInfo,
  PrinterStatus,
  PrintResult,
} from "@workspace/desktop-shared/printer-types"
import type {
  NativeNotification,
  NotificationPreferences,
  NotificationClickData,
} from "@workspace/desktop-shared/notification-types"
import type {
  SaveDialogOptions,
  SaveDialogResult,
  OpenDialogOptions,
  OpenDialogResult,
} from "@workspace/desktop-shared/file-dialog-types"

interface TrayStatus {
  unreadMail?: number
  pendingApprovals?: number
  printerName?: string
  printerConnected?: boolean
}

interface DesktopApi {
  printer: {
    listDevices: () => Promise<EvolisDevice[]>
    connect: (name: string) => Promise<EvolisInfo>
    disconnect: () => Promise<void>
    getStatus: () => Promise<PrinterStatus>
    getConnectedInfo: () => Promise<EvolisInfo | null>
    print: (options: {
      frontImagePath: string
      backImagePath?: string
      duplex?: boolean
    }) => Promise<PrintResult>
    printFromBuffer: (options: {
      frontBuffer: ArrayBuffer
      backBuffer?: ArrayBuffer
      duplex?: boolean
    }) => Promise<PrintResult>
  }
  notifications: {
    show: (notification: NativeNotification) => Promise<boolean>
    getPreferences: () => Promise<NotificationPreferences>
    setPreferences: (prefs: NotificationPreferences) => Promise<void>
    onNotificationClick: (cb: (data: NotificationClickData) => void) => () => void
  }
  badge: {
    setCount: (count: number) => Promise<void>
  }
  fileDialog: {
    save: (options: SaveDialogOptions) => Promise<SaveDialogResult>
    open: (options: OpenDialogOptions) => Promise<OpenDialogResult>
  }
  tray: {
    updateStatus: (status: TrayStatus) => Promise<void>
    onAction: (cb: (action: string) => void) => () => void
  }
  clipboard: {
    writeText: (text: string) => Promise<void>
    readText: () => Promise<string>
  }
  menu: {
    onAction: (cb: (action: string) => void) => () => void
  }
  updater: {
    checkForUpdate: () => Promise<void>
    installUpdate: () => Promise<void>
    getVersion: () => Promise<string>
    onStatus: (cb: (status: {
      state: "idle" | "checking" | "available" | "downloading" | "ready" | "error"
      version?: string
      progress?: number
      error?: string
    }) => void) => () => void
  }
}

declare global {
  interface Window {
    desktopApi: DesktopApi
  }
}
