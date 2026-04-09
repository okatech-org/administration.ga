export interface EvolisDevice {
  id: string
  name: string
  displayName: string
  uri: string
  mark: string
  model: string
  isSupervised: boolean
  isOnline: boolean
  link: "tcp" | "usb" | "file"
  driverVersion: string
}

export interface EvolisInfo {
  name: string
  model: string
  modelName: string
  serialNumber: string
  fwVersion: string
  hasFlip: boolean
  hasMagEnc: boolean
  hasContactLessEnc: boolean
  hasSmartEnc: boolean
  hasLaminator: boolean
  hasScanner: boolean
  hasLock: boolean
  hasLcd: boolean
}

export interface EvolisRibbon {
  type: string
  description: string
  remaining: number
  capacity: number
}

export interface PrinterStatus {
  connected: boolean
  ribbon: EvolisRibbon | null
  state: "ready" | "warning" | "error" | "offline"
  errors: string[]
}

export interface PrintResult {
  success: boolean
  errorCode: number
  errorMessage: string | null
}

export type PrintFace = "front" | "back"

export type InputTray = "feeder" | "manual" | "bezel" | "auto"
export type OutputTray = "standard" | "rear" | "error" | "bezel"

export type DuplexType = "DUPLEX_CC" | "DUPLEX_CM" | "DUPLEX_MC" | "DUPLEX_MM"

// --- Magnetic encoding ---

export interface MagTrackData {
  /** Track number (1, 2, or 3) */
  track: 1 | 2 | 3
  /** Data to encode on the track */
  data: string
  /** ISO format (defaults to ISO matching track number) */
  format?: "ISO1" | "ISO2" | "ISO3"
}

// --- NFC / Contactless encoding ---

export type NfcPayloadType = "url" | "text" | "raw"

export interface NfcPayload {
  type: NfcPayloadType
  /** URL, text, or hex-encoded raw APDU data */
  data: string
}

export interface PcscEncoder {
  name: string
  uid: number
}

// --- Printer capabilities ---

export interface PrinterCapabilities {
  hasDuplex: boolean
  hasMagEnc: boolean
  hasNfc: boolean
  hasSmartEnc: boolean
  hasLaminator: boolean
  hasScanner: boolean
  hasLcd: boolean
}

// --- Enhanced print options ---

export interface PrintCardOptions {
  frontBuffer?: ArrayBuffer
  backBuffer?: ArrayBuffer
  frontImagePath?: string
  backImagePath?: string
  duplex?: boolean
  duplexType?: DuplexType
  outputTray?: OutputTray
  magTracks?: MagTrackData[]
  nfcPayload?: NfcPayload
}
