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

  // Get connected printer info (survives renderer reload)
  ipcMain.handle("printer:get-connected-info", async () => {
    return printerService.getConnectedInfo()
  })

  // Print from raw BMP buffers (renderer sends ArrayBuffer)
  ipcMain.handle(
    "printer:print-from-buffer",
    async (
      _event,
      options: {
        frontBuffer: ArrayBuffer
        backBuffer?: ArrayBuffer
        duplex?: boolean
      }
    ) => {
      try {
        return await printerService.printFromBuffer({
          frontBuffer: Buffer.from(options.frontBuffer),
          backBuffer: options.backBuffer ? Buffer.from(options.backBuffer) : undefined,
          duplex: options.duplex,
        })
      } catch (err) {
        console.error("[printer:print-from-buffer] Caught crash:", err)
        return {
          success: false,
          errorCode: -999,
          errorMessage: `Crash prevented: ${String(err)}`,
        }
      }
    }
  )
}
