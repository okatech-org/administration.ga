import type {
  EvolisDevice,
  EvolisInfo,
  PrintCardOptions,
} from "@workspace/desktop-shared/printer-types"
import type {
  NativeNotification,
} from "@workspace/desktop-shared/notification-types"
import type {
  OpenDialogOptions,
  SaveDialogOptions,
} from "@workspace/desktop-shared/file-dialog-types"

/**
 * Interface publique de `window.desktopApi` exposée par le preload Electron.
 * Les pages partagées feature-detectent via `isDesktop()` avant d'utiliser l'API.
 *
 * Les types détaillés vivent dans @workspace/desktop-shared ; ce fichier
 * ré-agrège et expose l'API côté renderer/web.
 */
export type DesktopApi = {
  printer: {
    listDevices: () => Promise<EvolisDevice[]>
    connect: (name: string) => Promise<void>
    disconnect: () => Promise<void>
    getInfo: () => Promise<EvolisInfo | null>
    printCard: (options: PrintCardOptions) => Promise<{ success: boolean; error?: string }>
    printPdf?: (pdfBuffer: ArrayBuffer, filename?: string) => Promise<{ success: boolean; error?: string }>
  }
  notifications: {
    show: (notification: NativeNotification) => Promise<void>
    setBadgeCount: (count: number) => Promise<void>
  }
  fileDialog: {
    open: (options: OpenDialogOptions) => Promise<string[] | null>
    save: (options: SaveDialogOptions) => Promise<string | null>
  }
  window: {
    minimize: () => Promise<void>
    maximizeToggle: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
    getPlatform: () => Promise<NodeJS.Platform>
  }
  updater: {
    check: () => Promise<void>
    install: () => Promise<void>
    onStatus: (cb: (status: string) => void) => () => void
  }
  tray: {
    updateStatus: (status: { unreadMail?: number; printerReady?: boolean }) => Promise<void>
  }
  clipboard: {
    read: () => Promise<string>
    write: (text: string) => Promise<void>
  }
  menu: {
    onAction: (cb: (action: string) => void) => () => void
  }
  contextMenu: {
    show: (items: Array<{ label: string; id: string; enabled?: boolean }>) => Promise<string | null>
  }
}

declare global {
  interface Window {
    desktopApi?: DesktopApi
  }
}

/** Vrai si l'app tourne dans Electron (preload a injecté `window.desktopApi`). */
export function isDesktop(): boolean {
  return typeof window !== "undefined" && typeof window.desktopApi !== "undefined"
}

/**
 * Accès typé à l'API desktop. Retourne undefined côté web.
 * Toujours vérifier avec `isDesktop()` avant utilisation.
 */
export function getDesktopApi(): DesktopApi | undefined {
  return typeof window !== "undefined" ? window.desktopApi : undefined
}
