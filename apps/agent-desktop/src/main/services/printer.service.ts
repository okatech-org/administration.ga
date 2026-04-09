import { tmpdir } from "node:os"
import { join } from "node:path"
import { writeFile, unlink } from "node:fs/promises"
import { existsSync, writeFileSync, readFileSync, mkdirSync } from "node:fs"
import { randomBytes } from "node:crypto"
import { app } from "electron"
import type {
  EvolisDevice,
  EvolisInfo,
  PrinterStatus,
  PrintResult,
  PrintCardOptions,
  MagTrackData,
  NfcPayload,
  PrinterCapabilities,
  DuplexType,
  OutputTray,
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
  evolisClearErrors,
  evolisGetFullStatus,
  evolisMagInit,
  evolisMagSetTrack,
  evolisMagWrite,
  evolisPcscList,
  evolisSetInputTray,
  evolisSetOutputTray as evolisSetOutputTrayRaw,
  evolisSetErrorTray,
  evolisPrintInitFromDriverSettings,
  evolisPrintInit,
  evolisPrintSetSetting,
  evolisPrintSetImageP,
  evolisPrintExec,
  EVOLIS_OT_REAR,
  EVOLIS_MF_ISO1,
  EVOLIS_MF_ISO2,
  EVOLIS_MF_ISO3,
  EVOLIS_FA_FRONT,
  EVOLIS_FA_BACK,
  EVOSETTINGS_KE_Duplex,
  EVOSETTINGS_KE_GDuplexType,
  EVOSETTINGS_KE_Orientation,
  EVOSETTINGS_KE_Resolution,
  EVOSETTINGS_KE_PaperSize,
  EVOSETTINGS_KE_FOverlayManagement,
} from "../native/evolis-binding"
import { NfcEncodingService } from "./nfc-encoding.service"
import { describePrintError, describeSdkError } from "./evolis-errors"

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

const EVOLIS_IT_FEEDER = 1
const EVOLIS_OT_STANDARD = 1
const EVOLIS_OT_ERROR = 8

const OUTPUT_TRAY_MAP: Record<OutputTray, number> = {
  standard: EVOLIS_OT_STANDARD,
  rear: EVOLIS_OT_REAR,
  error: EVOLIS_OT_ERROR,
  bezel: EVOLIS_OT_STANDARD,
}

const MAG_FORMAT_MAP: Record<string, number> = {
  ISO1: EVOLIS_MF_ISO1,
  ISO2: EVOLIS_MF_ISO2,
  ISO3: EVOLIS_MF_ISO3,
}

const DEFAULT_MAG_FORMAT: Record<number, number> = {
  1: EVOLIS_MF_ISO1,
  2: EVOLIS_MF_ISO2,
  3: EVOLIS_MF_ISO3,
}

function getConfigPath(): string {
  const configDir = join(app.getPath("userData"), "printer-config")
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
  return join(configDir, "last-printer.json")
}

export class PrinterService {
  private printerHandle: unknown = null
  private printerName: string | null = null
  private connectedInfo: EvolisInfo | null = null
  private nfcService = new NfcEncodingService()

  getConnectedInfo(): EvolisInfo | null {
    return this.connectedInfo
  }

  getCapabilities(): PrinterCapabilities | null {
    if (!this.connectedInfo) return null
    return {
      hasDuplex: this.connectedInfo.hasFlip,
      hasMagEnc: this.connectedInfo.hasMagEnc,
      hasNfc: this.connectedInfo.hasContactLessEnc,
      hasSmartEnc: this.connectedInfo.hasSmartEnc,
      hasLaminator: this.connectedInfo.hasLaminator,
      hasScanner: this.connectedInfo.hasScanner,
      hasLcd: this.connectedInfo.hasLcd,
    }
  }

  // --- Auto-reconnect ---

  private saveLastPrinter(name: string): void {
    try {
      writeFileSync(getConfigPath(), JSON.stringify({ name }))
      console.log(`[PrinterService] Saved last printer: ${name}`)
    } catch (err) {
      console.warn("[PrinterService] Failed to save last printer:", err)
    }
  }

  private getLastPrinter(): string | null {
    try {
      const configPath = getConfigPath()
      if (!existsSync(configPath)) return null
      const data = JSON.parse(readFileSync(configPath, "utf-8"))
      return data.name ?? null
    } catch {
      return null
    }
  }

  async autoReconnect(): Promise<void> {
    const lastPrinter = this.getLastPrinter()
    if (!lastPrinter) {
      console.log("[PrinterService] No saved printer to reconnect")
      return
    }

    console.log(`[PrinterService] Attempting auto-reconnect to: ${lastPrinter}`)
    try {
      const devices = await this.listDevices()
      const found = devices.find((d) => d.name === lastPrinter)
      if (found) {
        await this.connect(lastPrinter)
        console.log(`[PrinterService] Auto-reconnected to ${lastPrinter}`)
      } else {
        console.log(`[PrinterService] Saved printer '${lastPrinter}' not available`)
      }
    } catch (err) {
      console.warn("[PrinterService] Auto-reconnect failed:", err)
    }
  }

  // --- Device management ---

  async listDevices(): Promise<EvolisDevice[]> {
    try {
      console.log(`[PrinterService] SDK version: ${evolisVersion()}`)
      const nativeDevices = evolisListDevices()
      console.log(`[PrinterService] Found ${nativeDevices.length} device(s)`)
      return nativeDevices.map((d) => ({
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
      }))
    } catch (err) {
      console.error("[PrinterService] listDevices error:", err)
      throw err
    }
  }

  async connect(name: string): Promise<EvolisInfo> {
    try {
      console.log(`[PrinterService] Opening printer with name: "${name}"`)
      if (!name) throw new Error("Printer name is empty")
      this.printerHandle = evolisOpen(name)
      this.printerName = name

      console.log("[PrinterService] Reserving printer...")
      const session = evolisReserve(this.printerHandle, 5000)
      console.log(`[PrinterService] Session result: ${session}`)

      if (session < 0 && session !== -11) {
        console.warn(`[PrinterService] Reserve warning: ${evolisGetErrorName(session)} (${session})`)
      }

      const info = evolisGetInfo(this.printerHandle)
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
        hasLcd: info.hasLcd,
      }
      this.connectedInfo = result
      this.saveLastPrinter(name)
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
      try { evolisRelease(this.printerHandle) } catch { /* ignore */ }
      try { evolisClose(this.printerHandle) } catch { /* ignore */ }
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
        ready: "ready", warning: "warning", error: "error", off: "offline",
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
      return { connected: true, ribbon: null, state: "error", errors: [String(err)] }
    }
  }

  // ===================================================================
  // 8-STEP CARDFLOW: Clear → Status → Trays → Init → Duplex → Mag → NFC → Print
  // Ported from Agent macOS PrinterService.executePrintSync()
  // ===================================================================

  async printCard(options: PrintCardOptions): Promise<PrintResult> {
    if (!this.printerHandle) {
      return { success: false, errorCode: -1, errorMessage: "Aucune imprimante connectée" }
    }

    const id = randomBytes(6).toString("hex")
    let frontPath = options.frontImagePath
    let backPath = options.backImagePath
    const tmpPaths: string[] = []

    try {
      // Write buffers to temp files if needed
      if (options.frontBuffer && !frontPath) {
        frontPath = join(tmpdir(), `evolis_front_${id}.bmp`)
        await writeFile(frontPath, Buffer.from(options.frontBuffer))
        tmpPaths.push(frontPath)
        console.log(`[PrinterService] Front buffer (${options.frontBuffer.byteLength} bytes) → ${frontPath}`)
      }
      if (options.backBuffer && !backPath) {
        backPath = join(tmpdir(), `evolis_back_${id}.bmp`)
        await writeFile(backPath, Buffer.from(options.backBuffer))
        tmpPaths.push(backPath)
        console.log(`[PrinterService] Back buffer (${options.backBuffer.byteLength} bytes) → ${backPath}`)
      }

      if (!frontPath) {
        return { success: false, errorCode: -2, errorMessage: "Aucune image recto fournie" }
      }

      return this.executePrintCardFlow(frontPath, backPath, options)
    } catch (err) {
      console.error("[PrinterService] printCard error:", err)
      return { success: false, errorCode: -999, errorMessage: String(err) }
    } finally {
      if (tmpPaths.length > 0) {
        setTimeout(async () => {
          for (const p of tmpPaths) {
            try { await unlink(p) } catch { /* ignore */ }
          }
          console.log("[PrinterService] Cleaned up temp files")
        }, 5000)
      }
    }
  }

  private executePrintCardFlow(
    frontPath: string,
    backPath: string | undefined,
    options: PrintCardOptions,
  ): PrintResult {
    const handle = this.printerHandle!

    // Clean session — release any stale session, then re-reserve
    try { evolisRelease(handle) } catch { /* ignore */ }
    const session = evolisReserve(handle, 10000)
    if (session < 0) {
      console.warn(`[PrinterService] Reserve: ${evolisGetErrorName(session)} (${session})`)
      // Continue — some errors like -11 (EPS supervised) are non-fatal in DIRECT mode
    }

    // Step 1/8: Clear mechanical errors
    console.log("[PrinterService] Step 1/8: Clearing mechanical errors...")
    evolisClearErrors(handle)

    // Step 2/8: Check printer status
    console.log("[PrinterService] Step 2/8: Checking printer status...")
    try {
      const status = evolisGetFullStatus(handle)
      console.log(
        `[PrinterService] Status — CFG: 0x${status.config.toString(16)}, INF: 0x${status.information.toString(16)}, WAR: 0x${status.warning.toString(16)}, ERR: 0x${status.error.toString(16)}`
      )
      if ((status.error & 0x00400000) !== 0) {
        console.warn("[PrinterService] ERR_BAD_RIBBON flag is set!")
      }
    } catch (err) {
      console.warn("[PrinterService] Status check failed (non-fatal):", err)
    }

    // Step 3/8: Set card input/output trays
    console.log("[PrinterService] Step 3/8: Setting trays...")
    evolisSetInputTray(handle, EVOLIS_IT_FEEDER)
    const outputTrayValue = options.outputTray ? (OUTPUT_TRAY_MAP[options.outputTray] ?? EVOLIS_OT_STANDARD) : EVOLIS_OT_STANDARD
    evolisSetOutputTrayRaw(handle, outputTrayValue)
    evolisSetErrorTray(handle, EVOLIS_OT_ERROR)

    // Step 4/8: Initialize print session from driver settings
    console.log("[PrinterService] Step 4/8: Initializing print session...")
    let rcInit = evolisPrintInitFromDriverSettings(handle)
    if (rcInit !== 0) {
      console.warn(`[PrinterService] init_from_driver_settings failed (${rcInit}), trying evolis_print_init`)
      rcInit = evolisPrintInit(handle)
      if (rcInit !== 0) {
        return {
          success: false,
          errorCode: rcInit,
          errorMessage: `Initialisation: ${describeSdkError(rcInit)}`,
        }
      }
    }

    // Set print area settings
    evolisPrintSetSetting(handle, EVOSETTINGS_KE_PaperSize, "CR80")
    evolisPrintSetSetting(handle, EVOSETTINGS_KE_Resolution, "DPI300")
    evolisPrintSetSetting(handle, EVOSETTINGS_KE_Orientation, "LANDSCAPE_CC90")
    evolisPrintSetSetting(handle, EVOSETTINGS_KE_FOverlayManagement, "FULLVARNISH")

    // Step 5/8: Configure duplex
    const hasDuplex = backPath && options.duplex !== false
    if (hasDuplex) {
      const duplexType: DuplexType = options.duplexType ?? "DUPLEX_CC"
      console.log(`[PrinterService] Step 5/8: Duplex mode (${duplexType})...`)
      evolisPrintSetSetting(handle, EVOSETTINGS_KE_Duplex, "HORIZONTAL")
      evolisPrintSetSetting(handle, EVOSETTINGS_KE_GDuplexType, duplexType)
    } else {
      console.log("[PrinterService] Step 5/8: Simplex mode")
    }

    // Step 6/8: Magnetic encoding
    if (options.magTracks && options.magTracks.length > 0) {
      console.log(`[PrinterService] Step 6/8: Encoding ${options.magTracks.length} magnetic track(s)...`)
      const magResult = this.encodeMagTracks(handle, options.magTracks)
      if (magResult !== 0) {
        return {
          success: false,
          errorCode: magResult,
          errorMessage: `Encodage magnétique: ${describeSdkError(magResult)}`,
        }
      }
      console.log("[PrinterService] Magnetic encoding completed")
    } else {
      console.log("[PrinterService] Step 6/8: No magnetic tracks")
    }

    // Step 7/8: NFC/Contactless encoding
    if (options.nfcPayload) {
      console.log("[PrinterService] Step 7/8: NFC encoding...")
      try {
        this.nfcService.encodeCard(handle, options.nfcPayload)
        console.log("[PrinterService] NFC encoding completed")
      } catch (err) {
        return {
          success: false,
          errorCode: -50,
          errorMessage: `Encodage NFC échoué: ${String(err)}`,
        }
      }
    } else {
      console.log("[PrinterService] Step 7/8: No NFC payload")
    }

    // Step 8/8: Set images and execute print
    console.log("[PrinterService] Step 8/8: Setting images and printing...")

    const rcFront = evolisPrintSetImageP(handle, EVOLIS_FA_FRONT, frontPath)
    if (rcFront !== 0) {
      return {
        success: false,
        errorCode: rcFront,
        errorMessage: `Image recto: ${describeSdkError(rcFront)}`,
      }
    }

    if (hasDuplex && backPath) {
      const rcBack = evolisPrintSetImageP(handle, EVOLIS_FA_BACK, backPath)
      if (rcBack !== 0) {
        return {
          success: false,
          errorCode: rcBack,
          errorMessage: `Image verso: ${describeSdkError(rcBack)}`,
        }
      }
    }

    const rcExec = evolisPrintExec(handle)
    if (rcExec !== 0) {
      return { success: false, errorCode: rcExec, errorMessage: describePrintError(rcExec) }
    }

    console.log("[PrinterService] Print job executed successfully")
    return { success: true, errorCode: 0, errorMessage: null }
  }

  private encodeMagTracks(printer: unknown, tracks: MagTrackData[]): number {
    const magHandle = evolisMagInit()

    for (const track of tracks) {
      const trackIdx = (track.track - 1) as 0 | 1 | 2
      const format = track.format
        ? (MAG_FORMAT_MAP[track.format] ?? DEFAULT_MAG_FORMAT[track.track])
        : DEFAULT_MAG_FORMAT[track.track]

      const rc = evolisMagSetTrack(magHandle, trackIdx, format, track.data)
      if (rc !== 0) {
        console.warn(`[PrinterService] Failed to set mag track ${track.track}: ${evolisGetErrorName(rc)} (${rc})`)
      }
    }

    return evolisMagWrite(printer, magHandle)
  }

  // --- Legacy methods (backward compatibility) ---

  async print(options: {
    frontImagePath: string
    backImagePath?: string
    duplex?: boolean
  }): Promise<PrintResult> {
    return this.printCard({
      frontImagePath: options.frontImagePath,
      backImagePath: options.backImagePath,
      duplex: options.duplex,
    })
  }

  async printFromBuffer(options: {
    frontBuffer: Buffer
    backBuffer?: Buffer
    duplex?: boolean
  }): Promise<PrintResult> {
    return this.printCard({
      frontBuffer: options.frontBuffer,
      backBuffer: options.backBuffer,
      duplex: options.duplex,
    })
  }

  // --- NFC convenience methods ---

  listNfcEncoders() {
    if (!this.printerHandle) return []
    return evolisPcscList(this.printerHandle)
  }

  encodeNfc(payload: NfcPayload): PrintResult {
    if (!this.printerHandle) {
      return { success: false, errorCode: -1, errorMessage: "Aucune imprimante connectée" }
    }
    try {
      this.nfcService.encodeCard(this.printerHandle, payload)
      return { success: true, errorCode: 0, errorMessage: null }
    } catch (err) {
      return { success: false, errorCode: -50, errorMessage: String(err) }
    }
  }

  // --- Mag convenience methods ---

  writeMagTracks(tracks: MagTrackData[]): PrintResult {
    if (!this.printerHandle) {
      return { success: false, errorCode: -1, errorMessage: "Aucune imprimante connectée" }
    }
    const rc = this.encodeMagTracks(this.printerHandle, tracks)
    if (rc !== 0) {
      return {
        success: false,
        errorCode: rc,
        errorMessage: `Encodage magnétique: ${describeSdkError(rc)}`,
      }
    }
    return { success: true, errorCode: 0, errorMessage: null }
  }
}
