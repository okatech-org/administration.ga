import type {
  EvolisDevice,
  EvolisInfo,
  EvolisRibbon,
  PrinterStatus,
  PrintResult,
} from "@workspace/desktop-shared/printer-types"

/**
 * High-level printer service that wraps the N-API Evolis addon.
 *
 * For Phase 1, this uses a STUB implementation that simulates printer behavior.
 * Once the N-API addon is built, the stub calls will be replaced with real SDK calls.
 */
export class PrinterService {
  private connectedPrinter: string | null = null

  async listDevices(): Promise<EvolisDevice[]> {
    // TODO: Replace with real N-API addon call: evolisAddon.listDevices()
    console.log("[PrinterService] Listing devices (stub)")
    return [
      {
        id: "stub-primacy2-001",
        name: "Evolis Primacy 2",
        displayName: "Evolis Primacy 2 (USB)",
        uri: "usb://EVOLIS/Primacy%202",
        mark: "Evolis",
        model: "Primacy 2",
        isSupervised: false,
        isOnline: true,
        link: "usb",
        driverVersion: "7.0.0",
      },
    ]
  }

  async connect(name: string): Promise<EvolisInfo> {
    // TODO: Replace with real N-API addon call:
    // const handle = evolisAddon.open(name)
    // evolisAddon.reserve(handle, 5000)
    // return evolisAddon.getInfo(handle)
    console.log(`[PrinterService] Connecting to: ${name} (stub)`)
    this.connectedPrinter = name
    return {
      name,
      model: "Primacy 2",
      modelName: "Evolis Primacy 2",
      serialNumber: "SN-STUB-001",
      fwVersion: "1.0.0",
      hasFlip: true,
      hasMagEnc: true,
      hasContactLessEnc: false,
      hasSmartEnc: false,
      hasLaminator: false,
      hasScanner: false,
      hasLock: false,
    }
  }

  async disconnect(): Promise<void> {
    // TODO: Replace with real N-API addon call:
    // evolisAddon.release(handle)
    // evolisAddon.close(handle)
    console.log("[PrinterService] Disconnecting (stub)")
    this.connectedPrinter = null
  }

  async getStatus(): Promise<PrinterStatus> {
    if (!this.connectedPrinter) {
      return { connected: false, ribbon: null, state: "offline", errors: [] }
    }

    // TODO: Replace with real N-API addon calls:
    // const ribbon = evolisAddon.getRibbon(handle)
    // const state = evolisAddon.getState(handle)
    const ribbon: EvolisRibbon = {
      type: "YMCKO",
      description: "Color YMCKO",
      remaining: 180,
      capacity: 200,
    }

    return {
      connected: true,
      ribbon,
      state: "ready",
      errors: [],
    }
  }

  async print(options: {
    frontImagePath: string
    backImagePath?: string
    duplex?: boolean
  }): Promise<PrintResult> {
    if (!this.connectedPrinter) {
      return { success: false, errorCode: -1, errorMessage: "No printer connected" }
    }

    // TODO: Replace with real N-API addon calls:
    // evolisAddon.clearErrors(handle)
    // evolisAddon.setInputTray(handle, 'feeder')
    // evolisAddon.setOutputTray(handle, 'standard')
    // evolisAddon.setErrorTray(handle, 'error')
    // evolisAddon.printInitFromDriver(handle)
    // evolisAddon.printSetImagePath(handle, 'front', options.frontImagePath)
    // if (options.duplex && options.backImagePath) {
    //   evolisAddon.printSetSetting(handle, 'Duplex', 'HORIZONTAL')
    //   evolisAddon.printSetSetting(handle, 'GDuplexType', 'DUPLEX_CC')
    //   evolisAddon.printSetImagePath(handle, 'back', options.backImagePath)
    // }
    // const rc = evolisAddon.printExec(handle)

    console.log(`[PrinterService] Printing (stub):`, options)

    return {
      success: true,
      errorCode: 0,
      errorMessage: null,
    }
  }
}
