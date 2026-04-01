import { Menu, type IpcMain, type BrowserWindow } from "electron"
import type { ContextMenuItem } from "@workspace/desktop-shared/context-menu-types"

export function registerContextMenuIpc(
  ipcMain: IpcMain,
  mainWindow: BrowserWindow
): void {
  ipcMain.handle(
    "context-menu:show",
    (_event, items: ContextMenuItem[]): Promise<string | null> => {
      return new Promise((resolve) => {
        const template = buildTemplate(items, resolve)
        const menu = Menu.buildFromTemplate(template)

        menu.on("menu-will-close", () => {
          // Resolve with null if no item was clicked
          // Use setTimeout to let click handler fire first
          setTimeout(() => resolve(null), 50)
        })

        menu.popup({
          window: mainWindow.isDestroyed() ? undefined : mainWindow,
        })
      })
    }
  )
}

function buildTemplate(
  items: ContextMenuItem[],
  resolve: (id: string | null) => void
): Electron.MenuItemConstructorOptions[] {
  return items.map((item) => {
    if (item.type === "separator") {
      return { type: "separator" as const }
    }
    return {
      label: item.label,
      type: (item.type ?? "normal") as "normal" | "checkbox",
      checked: item.checked,
      enabled: item.enabled ?? true,
      accelerator: item.accelerator,
      submenu: item.submenu
        ? buildTemplate(item.submenu, resolve)
        : undefined,
      click: () => resolve(item.id),
    }
  })
}
