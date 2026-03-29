import type { IpcMain } from "electron"
import { PrinterService } from "../services/printer.service"

const printerService = new PrinterService()

export function registerPrinterIpc(ipcMain: IpcMain): void {
  ipcMain.handle("printer:list-devices", async () => {
    return printerService.listDevices()
  })

  ipcMain.handle("printer:connect", async (_event, name: string) => {
    return printerService.connect(name)
  })

  ipcMain.handle("printer:disconnect", async () => {
    return printerService.disconnect()
  })

  ipcMain.handle("printer:get-status", async () => {
    return printerService.getStatus()
  })

  ipcMain.handle(
    "printer:print",
    async (
      _event,
      options: {
        frontImagePath: string
        backImagePath?: string
        duplex?: boolean
      }
    ) => {
      return printerService.print(options)
    }
  )
}
