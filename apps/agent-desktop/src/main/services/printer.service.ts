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
  evolisClearErrors,
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

export class PrinterService {
  private printerHandle: unknown = null
  private printerName: string | null = null

  async listDevices(): Promise<EvolisDevice[]> {
    try {
      console.log(`[PrinterService] SDK version: ${evolisVersion()}`)
      const nativeDevices = evolisListDevices()
      return nativeDevices.map((d) => ({
        id: d.id,
        name: d.name,
        displayName: d.displayName || d.name,
        uri: d.uri,
        mark: d.mark.toString(),
        model: d.model.toString(),
        isSupervised: d.isSupervised,
        isOnline: d.isOnline,
        link: LINK_NAMES[d.link] ?? "usb",
        driverVersion: d.driverVersion,
      }))
    } catch (err) {
      console.error("[PrinterService] listDevices error:", err)
      throw err
    }
  }

  async connect(name: string): Promise<EvolisInfo> {
    try {
      console.log(`[PrinterService] Opening: ${name}`)
      this.printerHandle = evolisOpen(name)
      this.printerName = name

      console.log("[PrinterService] Reserving printer...")
      const session = evolisReserve(this.printerHandle, 5000)
      console.log(`[PrinterService] Session: ${session}`)

      const info = evolisGetInfo(this.printerHandle)
      console.log("[PrinterService] Info:", info)

      return {
        name: info.name,
        model: info.model.toString(),
        modelName: info.modelName,
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
    } catch (err) {
      this.printerHandle = null
      this.printerName = null
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
}
