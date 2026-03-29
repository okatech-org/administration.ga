import type {
  EvolisDevice,
  EvolisInfo,
  PrinterStatus,
  PrintResult,
} from "@workspace/desktop-shared/printer-types"

interface DesktopApi {
  printer: {
    listDevices: () => Promise<EvolisDevice[]>
    connect: (name: string) => Promise<EvolisInfo>
    disconnect: () => Promise<void>
    getStatus: () => Promise<PrinterStatus>
    print: (options: {
      frontImagePath: string
      backImagePath?: string
      duplex?: boolean
    }) => Promise<PrintResult>
  }
}

declare global {
  interface Window {
    desktopApi: DesktopApi
  }
}
