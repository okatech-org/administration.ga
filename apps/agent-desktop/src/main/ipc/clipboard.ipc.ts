import type { IpcMain } from "electron"
import { clipboard } from "electron"

export function registerClipboardIpc(ipcMain: IpcMain): void {
  ipcMain.handle("clipboard:write-text", async (_event, text: string) => {
    clipboard.writeText(text)
  })

  ipcMain.handle("clipboard:read-text", async () => {
    return clipboard.readText()
  })

  ipcMain.handle("clipboard:write-image", async (_event, dataUrl: string) => {
    const { nativeImage } = await import("electron")
    const image = nativeImage.createFromDataURL(dataUrl)
    clipboard.writeImage(image)
  })

  ipcMain.handle("clipboard:read-image", async () => {
    const image = clipboard.readImage()
    if (image.isEmpty()) return null
    return image.toDataURL()
  })
}
