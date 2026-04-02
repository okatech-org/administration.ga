import type { IpcMain } from "electron"
import { app } from "electron"
import { join } from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
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

  // Save BMP to ~/Desktop/evolis-debug/ for visual inspection
  ipcMain.handle(
    "printer:save-debug-bmp",
    async (
      _event,
      options: {
        frontBuffer: ArrayBuffer
        backBuffer?: ArrayBuffer
        label?: string
      }
    ) => {
      try {
        const debugDir = join(app.getPath("desktop"), "evolis-debug")
        await mkdir(debugDir, { recursive: true })
        const ts = new Date().toISOString().replace(/[:.]/g, "-")
        const label = options.label ? `_${options.label}` : ""

        const frontPath = join(debugDir, `front${label}_${ts}.bmp`)
        await writeFile(frontPath, Buffer.from(options.frontBuffer))
        console.log(`[DebugBMP] Saved front (${options.frontBuffer.byteLength} bytes) → ${frontPath}`)

        if (options.backBuffer) {
          const backPath = join(debugDir, `back${label}_${ts}.bmp`)
          await writeFile(backPath, Buffer.from(options.backBuffer))
          console.log(`[DebugBMP] Saved back (${options.backBuffer.byteLength} bytes) → ${backPath}`)
        }
        return { success: true, path: frontPath }
      } catch (err) {
        console.error("[DebugBMP] Error:", err)
        return { success: false, error: String(err) }
      }
    }
  )

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
