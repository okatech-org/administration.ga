import type { IpcMain, BrowserWindow } from "electron"
import { FileDialogService } from "../services/file-dialog.service"
import type {
  SaveDialogOptions,
  OpenDialogOptions,
} from "@workspace/desktop-shared/file-dialog-types"

export function registerFileDialogIpc(
  ipcMain: IpcMain,
  mainWindow: BrowserWindow
): void {
  const fileDialogService = new FileDialogService(() =>
    mainWindow.isDestroyed() ? null : mainWindow
  )

  ipcMain.handle(
    "file:save-dialog",
    async (_event, options: SaveDialogOptions) => {
      return fileDialogService.saveWithDialog(options)
    }
  )

  ipcMain.handle(
    "file:open-dialog",
    async (_event, options: OpenDialogOptions) => {
      return fileDialogService.openWithDialog(options)
    }
  )
}
