import type { IpcMain } from "electron"
import { app } from "electron"
import { join } from "node:path"
import { mkdir, writeFile } from "node:fs/promises"
import type {
  PrintCardOptions,
  MagTrackData,
  NfcPayload,
} from "@workspace/desktop-shared/printer-types"
import { PrinterService } from "../services/printer.service"

const printerService = new PrinterService()

export function registerPrinterIpc(ipcMain: IpcMain): void {
  // --- Device management ---

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

  ipcMain.handle("printer:get-connected-info", async () => {
    return printerService.getConnectedInfo()
  })

  ipcMain.handle("printer:get-capabilities", async () => {
    return printerService.getCapabilities()
  })

  ipcMain.handle("printer:auto-reconnect", async () => {
    return printerService.autoReconnect()
  })

  // --- Legacy print (backward compatibility) ---

  ipcMain.handle(
    "printer:print",
    async (_event, options: { frontImagePath: string; backImagePath?: string; duplex?: boolean }) => {
      return printerService.print(options)
    }
  )

  ipcMain.handle(
    "printer:print-from-buffer",
    async (_event, options: { frontBuffer: ArrayBuffer; backBuffer?: ArrayBuffer; duplex?: boolean }) => {
      try {
        return await printerService.printFromBuffer({
          frontBuffer: Buffer.from(options.frontBuffer),
          backBuffer: options.backBuffer ? Buffer.from(options.backBuffer) : undefined,
          duplex: options.duplex,
        })
      } catch (err) {
        console.error("[printer:print-from-buffer] Caught crash:", err)
        return { success: false, errorCode: -999, errorMessage: `Crash prevented: ${String(err)}` }
      }
    }
  )

  // --- Enhanced 8-step print card ---

  ipcMain.handle(
    "printer:print-card",
    async (_event, options: PrintCardOptions) => {
      try {
        // Convert ArrayBuffers to Buffers for Node.js compatibility
        const opts: PrintCardOptions = {
          ...options,
          frontBuffer: options.frontBuffer ? Buffer.from(options.frontBuffer) as unknown as ArrayBuffer : undefined,
          backBuffer: options.backBuffer ? Buffer.from(options.backBuffer) as unknown as ArrayBuffer : undefined,
        }
        return await printerService.printCard(opts)
      } catch (err) {
        console.error("[printer:print-card] Error:", err)
        return { success: false, errorCode: -999, errorMessage: String(err) }
      }
    }
  )

  // --- Magnetic encoding ---

  ipcMain.handle(
    "printer:mag-write",
    async (_event, tracks: MagTrackData[]) => {
      return printerService.writeMagTracks(tracks)
    }
  )

  // --- NFC encoding ---

  ipcMain.handle("printer:nfc-list-encoders", async () => {
    return printerService.listNfcEncoders()
  })

  ipcMain.handle(
    "printer:nfc-encode",
    async (_event, payload: NfcPayload) => {
      return printerService.encodeNfc(payload)
    }
  )

  // --- Debug ---

  ipcMain.handle(
    "printer:save-debug-bmp",
    async (_event, options: { frontBuffer: ArrayBuffer; backBuffer?: ArrayBuffer; label?: string }) => {
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
}

/** Call this from main/index.ts on app ready to auto-reconnect */
export function initPrinterAutoReconnect(): void {
  printerService.autoReconnect()
}
