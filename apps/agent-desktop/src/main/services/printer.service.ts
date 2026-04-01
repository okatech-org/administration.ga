import { tmpdir } from "node:os"
import { join } from "node:path"
import { writeFile, unlink } from "node:fs/promises"
import { randomBytes } from "node:crypto"
import type {
  EvolisDevice,
  EvolisInfo,
  PrinterStatus,
  PrintResult,
} from "@workspace/desktop-shared/printer-types"
import {
  evolisVersion,
  evolisListDevices,
  evolisOpen,
  evolisClose,
  evolisReserve,
  evolisRelease,
  evolisGetInfo,
  evolisGetRibbon,
  evolisGetState,
  evolisGetErrorName,
  evolisPrintFromPath,
} from "../native/evolis-binding"

const LINK_NAMES: Record<number, "tcp" | "usb" | "file"> = {
  1: "tcp",
  2: "usb",
  3: "file",
}

const MODEL_NAMES: Record<number, string> = {
  7: "Primacy",
  13: "Elypso",
  15: "Zenius",
  33: "Primacy 2",
  43: "Agilia",
}

export class PrinterService {
  private printerHandle: unknown = null
  private printerName: string | null = null
  private connectedInfo: EvolisInfo | null = null

  /** Check if printer is still connected (survives renderer reload) */
  getConnectedInfo(): EvolisInfo | null {
    return this.connectedInfo
  }

  async listDevices(): Promise<EvolisDevice[]> {
    try {
      console.log(`[PrinterService] SDK version: ${evolisVersion()}`)
      const nativeDevices = evolisListDevices()
      console.log(`[PrinterService] Found ${nativeDevices.length} device(s)`)
      return nativeDevices.map((d) => {
        console.log(`[PrinterService] Device: name="${d.name}" displayName="${d.displayName}" model=${d.model}`)
        return {
          id: d.id || d.name,
          name: d.name,
          displayName: d.displayName || d.name || MODEL_NAMES[d.model] || `Evolis (${d.model})`,
          uri: d.uri,
          mark: d.mark.toString(),
          model: MODEL_NAMES[d.model] || `Model ${d.model}`,
          isSupervised: d.isSupervised,
          isOnline: d.isOnline,
          link: LINK_NAMES[d.link] ?? "usb",
          driverVersion: d.driverVersion,
        }
      })
    } catch (err) {
      console.error("[PrinterService] listDevices error:", err)
      throw err
    }
  }

  async connect(name: string): Promise<EvolisInfo> {
    try {
      console.log(`[PrinterService] Opening printer with name: "${name}"`)
      if (!name) {
        throw new Error("Printer name is empty")
      }
      this.printerHandle = evolisOpen(name)
      this.printerName = name

      console.log("[PrinterService] Reserving printer...")
      const session = evolisReserve(this.printerHandle, 5000)
      console.log(`[PrinterService] Session result: ${session}`)

      // Session -11 = EBUSY (printer supervised by EPS2), but we can still query info
      if (session < 0 && session !== -11) {
        console.warn(`[PrinterService] Reserve warning: ${evolisGetErrorName(session)} (${session})`)
      }

      const info = evolisGetInfo(this.printerHandle)
      console.log("[PrinterService] Info:", JSON.stringify(info))

      const result: EvolisInfo = {
        name: info.name || name,
        model: String(info.model ?? ""),
        modelName: info.modelName || MODEL_NAMES[info.model] || name,
        serialNumber: info.serialNumber,
        fwVersion: info.fwVersion,
        hasFlip: info.hasFlip,
        hasMagEnc: info.hasMagEnc,
        hasContactLessEnc: info.hasContactLessEnc,
        hasSmartEnc: info.hasSmartEnc,
        hasLaminator: info.hasLaminator,
        hasScanner: info.hasScanner,
        hasLock: info.hasLock,
      }
      this.connectedInfo = result
      return result
    } catch (err) {
      this.printerHandle = null
      this.printerName = null
      this.connectedInfo = null
      console.error("[PrinterService] connect error:", err)
      throw err
    }
  }

  async disconnect(): Promise<void> {
    if (this.printerHandle) {
      try {
        evolisRelease(this.printerHandle)
      } catch {
        // Ignore release errors
      }
      try {
        evolisClose(this.printerHandle)
      } catch {
        // Ignore close errors
      }
      this.printerHandle = null
      this.printerName = null
      this.connectedInfo = null
      console.log("[PrinterService] Disconnected")
    }
  }

  async getStatus(): Promise<PrinterStatus> {
    if (!this.printerHandle) {
      return { connected: false, ribbon: null, state: "offline", errors: [] }
    }

    try {
      const ribbon = evolisGetRibbon(this.printerHandle)
      const state = evolisGetState(this.printerHandle)

      const stateMap: Record<string, "ready" | "warning" | "error" | "offline"> = {
        ready: "ready",
        warning: "warning",
        error: "error",
        off: "offline",
      }

      return {
        connected: true,
        ribbon: {
          type: ribbon.typeName,
          description: ribbon.description,
          remaining: ribbon.remaining,
          capacity: ribbon.capacity,
        },
        state: stateMap[state.majorString] ?? "offline",
        errors: [],
      }
    } catch (err) {
      console.error("[PrinterService] getStatus error:", err)
      return {
        connected: true,
        ribbon: null,
        state: "error",
        errors: [String(err)],
      }
    }
  }

  async print(options: {
    frontImagePath: string
    backImagePath?: string
    duplex?: boolean
  }): Promise<PrintResult> {
    if (!this.printerHandle) {
      return {
        success: false,
        errorCode: -1,
        errorMessage: "Aucune imprimante connectee",
      }
    }

    try {
      console.log("[PrinterService] Printing:", options)

      const rc = evolisPrintFromPath(
        this.printerHandle,
        options.frontImagePath,
        options.duplex ? options.backImagePath : undefined
      )

      if (rc !== 0) {
        const errName = evolisGetErrorName(rc)
        return {
          success: false,
          errorCode: rc,
          errorMessage: `Erreur impression: ${errName} (code ${rc})`,
        }
      }

      return { success: true, errorCode: 0, errorMessage: null }
    } catch (err) {
      console.error("[PrinterService] print error:", err)
      return {
        success: false,
        errorCode: -999,
        errorMessage: String(err),
      }
    }
  }

  /** Print from raw BMP buffers (writes temp files, prints, cleans up) */
  async printFromBuffer(options: {
    frontBuffer: Buffer
    backBuffer?: Buffer
    duplex?: boolean
  }): Promise<PrintResult> {
    if (!this.printerHandle) {
      return {
        success: false,
        errorCode: -1,
        errorMessage: "Aucune imprimante connectée",
      }
    }

    const id = randomBytes(6).toString("hex")
    const frontPath = join(tmpdir(), `evolis_front_${id}.bmp`)
    const backPath = options.backBuffer
      ? join(tmpdir(), `evolis_back_${id}.bmp`)
      : undefined

    try {
      console.log(`[PrinterService] printFromBuffer: writing ${options.frontBuffer.length} bytes to ${frontPath}`)
      await writeFile(frontPath, options.frontBuffer)
      if (options.backBuffer && backPath) {
        console.log(`[PrinterService] printFromBuffer: writing back ${options.backBuffer.length} bytes to ${backPath}`)
        await writeFile(backPath, options.backBuffer)
      }

      const result = await this.print({
        frontImagePath: frontPath,
        backImagePath: backPath,
        duplex: options.duplex,
      })

      return result
    } catch (err) {
      console.error("[PrinterService] printFromBuffer error:", err)
      return {
        success: false,
        errorCode: -999,
        errorMessage: `Erreur printFromBuffer: ${String(err)}`,
      }
    } finally {
      // Cleanup temp files
      try { await unlink(frontPath) } catch { /* ignore */ }
      if (backPath) {
        try { await unlink(backPath) } catch { /* ignore */ }
      }
    }
  }
}
