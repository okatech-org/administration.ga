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
