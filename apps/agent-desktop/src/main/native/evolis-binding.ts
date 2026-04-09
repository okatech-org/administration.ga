/**
 * Evolis SDK FFI binding using koffi.
 *
 * Loads libevolis dynamically and exposes typed JS functions
 * that call the Evolis C SDK directly.
 */
import koffi from "koffi"
import path from "path"
import { app } from "electron"

// --- Resolve library path ---
function getLibPath(): string {
  const platform = process.platform
  const sdkBase = app.isPackaged
    ? path.join(process.resourcesPath, "evolis-sdk")
    : path.join(__dirname, "../../ressources/evolis-sdk")

  switch (platform) {
    case "darwin":
      return path.join(sdkBase, "macos/lib/libevolis.dylib")
    case "win32":
      return path.join(sdkBase, "windows-x86_64/lib/evolis.dll")
    case "linux":
      return path.join(sdkBase, "linux-x86_64/lib/libevolis.so")
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

// --- Load library ---
let lib: koffi.IKoffiLib

function getLib(): koffi.IKoffiLib {
  if (!lib) {
    const libPath = getLibPath()
    lib = koffi.load(libPath)
  }
  return lib
}

// --- Define C types ---

// evobuf is typedef'd as char in the SDK
// #define evobuf char

// Opaque pointer for evolis_t*
const evolis_t_ptr = "void *"

// evolis_device_t struct
const evolis_device_t = koffi.struct("evolis_device_t", {
  id: koffi.array("char", 128),
  name: koffi.array("char", 256),
  displayName: koffi.array("char", 256),
  uri: koffi.array("char", 512),
  mark: "int",
  model: "int",
  isSupervised: "bool",
  isOnline: "bool",
  link: "int",
  driverVersion: koffi.array("char", 128),
})

// evolis_info_t struct
const evolis_info_t = koffi.struct("evolis_info_t", {
  name: koffi.array("char", 128),
  type: "int",
  mark: "int",
  markName: koffi.array("char", 32),
  model: "int",
  modelName: koffi.array("char", 32),
  modelId: "uint32",
  fwVersion: koffi.array("char", 16),
  serialNumber: koffi.array("char", 16),
  printHeadKitNumber: koffi.array("char", 16),
  zone: koffi.array("char", 16),
  hasFlip: "bool",
  hasEthernet: "bool",
  hasWifi: "bool",
  hasLaminator: "bool",
  hasLaminator2: "bool",
  hasMagEnc: "bool",
  hasJisMagEnc: "bool",
  hasSmartEnc: "bool",
  hasContactLessEnc: "bool",
  hasLcd: "bool",
  hasKineclipse: "bool",
  hasLock: "bool",
  hasScanner: "bool",
  insertionCaps: "uint32",
  ejectionCaps: "uint32",
  rejectionCaps: "uint32",
  lcdFwVersion: koffi.array("char", 16),
  lcdGraphVersion: koffi.array("char", 16),
  scannerFwVersion: koffi.array("char", 64),
})

// evolis_ribbon_t struct
const evolis_ribbon_t = koffi.struct("evolis_ribbon_t", {
  description: koffi.array("char", 64),
  zone: koffi.array("char", 8),
  type: "int",
  capacity: "int",
  remaining: "int",
  progress: "int",
  productCode: koffi.array("char", 16),
  batchNumber: "uint32",
  buildAt: koffi.array("char", 24),
  serialNumber: koffi.array("char", 24),
  internalCode: koffi.array("char", 24),
})

// evolis_status_t struct (from evo-printers.h)
const EVOLIS_STATUS_EX_COUNT = 4
const evolis_status_t = koffi.struct("evolis_status_t", {
  config: "uint32",
  information: "uint32",
  warning: "uint32",
  error: "uint32",
  exts: koffi.array("uint32", EVOLIS_STATUS_EX_COUNT),
  session: "uint16",
})

// evolis_mag_tracks_t struct
// char tracks[3][256] — flattened as 3 separate char[256] fields for correct layout
const evolis_mag_tracks_t = koffi.struct("evolis_mag_tracks_t", {
  track0: koffi.array("char", 256),
  track1: koffi.array("char", 256),
  track2: koffi.array("char", 256),
  formats: koffi.array("int", 3),
  coercivity: "int",
  results: koffi.array("int", 3),
  processTrack: koffi.array("bool", 3),
})

// evolis_pcsc_encoder_t struct
const evolis_pcsc_encoder_t = koffi.struct("evolis_pcsc_encoder_t", {
  name: koffi.array("char", 128),
  uid: "uint16",
})

// --- Declare functions ---

function declareAll() {
  const l = getLib()

  return {
    // Library
    evolis_version: l.func("const char* evolis_version()"),
    evolis_get_error_name: l.func("const char* evolis_get_error_name(int r)"),

    // Device enumeration — variadic: takes model filter list ending with 0
    evolis_get_devices: l.func(
      "int evolis_get_devices(_Out_ void** devices, ...)"
    ),
    evolis_free_devices: l.func("void evolis_free_devices(void* devices)"),

    // Device I/O
    evolis_open: l.func("void* evolis_open(const char* name)"),
    evolis_open_with_mode: l.func(
      "void* evolis_open_with_mode(const char* name, int mode)"
    ),
    evolis_close: l.func("void evolis_close(void* printer)"),
    evolis_reserve: l.func(
      "int evolis_reserve(void* printer, int session, int waitMs)"
    ),
    evolis_release: l.func("int evolis_release(void* printer)"),
    evolis_clear_mechanical_errors: l.func(
      "int evolis_clear_mechanical_errors(void* printer)"
    ),

    // Device info
    evolis_get_info: l.func(
      "int evolis_get_info(void* printer, _Out_ evolis_info_t* info)"
    ),
    evolis_get_ribbon: l.func(
      "int evolis_get_ribbon(void* printer, _Out_ evolis_ribbon_t* ribbon)"
    ),
    evolis_get_state: l.func(
      "int evolis_get_state(void* printer, _Out_ int* major, _Out_ int* minor)"
    ),
    evolis_get_model_name: l.func(
      "const char* evolis_get_model_name(int model)"
    ),
    evolis_get_ribbon_name: l.func(
      "const char* evolis_get_ribbon_name(int rt)"
    ),

    // Trays
    evolis_set_input_tray: l.func(
      "int evolis_set_input_tray(void* printer, int tray)"
    ),
    evolis_set_output_tray: l.func(
      "int evolis_set_output_tray(void* printer, int tray)"
    ),
    evolis_set_error_tray: l.func(
      "int evolis_set_error_tray(void* printer, int tray)"
    ),

    // Session management
    evolis_set_session_management: l.func(
      "void evolis_set_session_management(void* printer, bool on)"
    ),
    evolis_get_session_management: l.func(
      "bool evolis_get_session_management(void* printer)"
    ),

    // Card operations
    evolis_insert: l.func("int evolis_insert(void* printer)"),
    evolis_eject: l.func("int evolis_eject(void* printer)"),
    evolis_reject: l.func("int evolis_reject(void* printer)"),

    // Printing
    evolis_print_init: l.func("int evolis_print_init(void* printer)"),
    evolis_print_init_from_driver_settings: l.func(
      "int evolis_print_init_from_driver_settings(void* printer)"
    ),
    evolis_print_set_imagep: l.func(
      "int evolis_print_set_imagep(void* printer, int face, const char* path)"
    ),
    evolis_print_set_imageb: l.func(
      "int evolis_print_set_imageb(void* printer, int face, const void* data, size_t size)"
    ),
    evolis_print_set_setting: l.func(
      "bool evolis_print_set_setting(void* printer, int key, const char* value)"
    ),
    evolis_print_get_setting: l.func(
      "bool evolis_print_get_setting(void* printer, int key, _Out_ const char** value)"
    ),
    evolis_print_set_auto_eject: l.func(
      "bool evolis_print_set_auto_eject(void* printer, bool on)"
    ),
    evolis_print_exec: l.func("int evolis_print_exec(void* printer)"),
    evolis_print_exect: l.func(
      "int evolis_print_exect(void* printer, int timeout)"
    ),

    // --- Status (evo-printers.h) ---
    evolis_status: l.func(
      "int evolis_status(void* printer, _Out_ evolis_status_t* status)"
    ),

    // --- Card positioning ---
    evolis_set_card_pos: l.func(
      "int evolis_set_card_pos(void* printer, int pos)"
    ),

    // --- Magnetic encoding ---
    evolis_mag_init: l.func(
      "void evolis_mag_init(_Out_ evolis_mag_tracks_t* tracks)"
    ),
    evolis_mag_set_track: l.func(
      "int evolis_mag_set_track(_Inout_ evolis_mag_tracks_t* tracks, int track, int fmt, const char* data)"
    ),
    evolis_mag_write: l.func(
      "int evolis_mag_write(void* printer, _Inout_ evolis_mag_tracks_t* tracks)"
    ),
    evolis_mag_read: l.func(
      "int evolis_mag_read(void* printer, _Inout_ evolis_mag_tracks_t* tracks)"
    ),

    // --- PC/SC (NFC/Contactless) ---
    evolis_pcsc_list: l.func(
      "int evolis_pcsc_list(void* printer, _Out_ evolis_pcsc_encoder_t* encoders, size_t max_size)"
    ),
    evolis_pcsc_wait_card_presentt: l.func(
      "int evolis_pcsc_wait_card_presentt(void* printer, uint16 uid, int timeout_ms)"
    ),
    evolis_pcsc_connect: l.func(
      "int evolis_pcsc_connect(void* printer, uint16 uid, int protocol)"
    ),
    evolis_pcsc_send_apdu: l.func(
      "int evolis_pcsc_send_apdu(void* printer, const char* apdu, size_t apdu_size, _Out_ char* reply, size_t reply_max_size)"
    ),
    evolis_pcsc_disconnect: l.func(
      "int evolis_pcsc_disconnect(void* printer, int disposition)"
    ),
    evolis_pcsc_read_atr: l.func(
      "int evolis_pcsc_read_atr(void* printer, uint16 uid, _Out_ char* atr)"
    ),
  }
}

let fns: ReturnType<typeof declareAll>

function getFns() {
  if (!fns) {
    fns = declareAll()
  }
  return fns
}

// --- High-level typed exports ---

// Enums
const EVOLIS_IT_FEEDER = 1
const EVOLIS_OT_STANDARD = 1
export const EVOLIS_OT_REAR = 512
const EVOLIS_OT_ERROR = 8
const EVOLIS_FA_FRONT = 0
const EVOLIS_FA_BACK = 1

// Card positions
export const EVOLIS_CP_CONTACTLESS = 6

// Magnetic encoding formats
export const EVOLIS_MF_ISO1 = 1
export const EVOLIS_MF_ISO2 = 2
export const EVOLIS_MF_ISO3 = 3

// PC/SC protocols
export const EVOLIS_PCSC_PCL_ANY = 4

// PC/SC disposition
export const EVOLIS_PCSC_DSP_RESET = 2

// Settings keys from evosettings_keys.h — values are enum indices in evosettings_key_e
// IMPORTANT: counted from the X-macro in evosettings_keys.h, starting at Unknown=0
const EVOSETTINGS_KE_Duplex = 19
const EVOSETTINGS_KE_GDuplexType = 40
const EVOSETTINGS_KE_Orientation = 111
const EVOSETTINGS_KE_Resolution = 113
const EVOSETTINGS_KE_PaperSize = 136
const EVOSETTINGS_KE_FBlackManagement = 20
const EVOSETTINGS_KE_FOverlayManagement = 27

export interface NativeEvolisDevice {
  id: string
  name: string
  displayName: string
  uri: string
  mark: number
  model: number
  isSupervised: boolean
  isOnline: boolean
  link: number
  driverVersion: string
}

export function evolisVersion(): string {
  return getFns().evolis_version()
}

export function evolisGetErrorName(code: number): string {
  return getFns().evolis_get_error_name(code)
}

export function evolisListDevices(): NativeEvolisDevice[] {
  const f = getFns()
  const devicesPtr = [null] as [unknown]

  // evolis_get_devices is variadic: pass model filters ending with 0.
  // Passing just 0 means "all models".
  const count = f.evolis_get_devices(devicesPtr, "int", 0)

  if (count <= 0 || !devicesPtr[0]) {
    return []
  }

  const rawArray = koffi.decode(devicesPtr[0], evolis_device_t, count)
  const items = Array.isArray(rawArray) ? rawArray : [rawArray]

  const devices: NativeEvolisDevice[] = items.map((d) => {
    const dev = {
      id: charArrayToString(d.id),
      name: charArrayToString(d.name),
      displayName: charArrayToString(d.displayName),
      uri: charArrayToString(d.uri),
      mark: d.mark,
      model: d.model,
      isSupervised: d.isSupervised,
      isOnline: d.isOnline,
      link: d.link,
      driverVersion: charArrayToString(d.driverVersion),
    }
    console.log("[evolis] Device found:", dev.name, "displayName:", dev.displayName)
    return dev
  })

  f.evolis_free_devices(devicesPtr[0])
  return devices
}

// Open modes (from evolis_open_mode_e)
const EVOLIS_OM_AUTO = 0
const EVOLIS_OM_DIRECT = 1
const EVOLIS_OM_SUPERVISED = 2

export function evolisOpen(name: string, direct = true): unknown {
  // Use DIRECT mode (1) to bypass EPS2 supervision and avoid session conflicts (error 1700).
  // When EPS is running and supervising the printer, AUTO mode routes through EPS
  // which holds a session and blocks direct print_exec calls.
  const mode = direct ? EVOLIS_OM_DIRECT : EVOLIS_OM_AUTO
  console.log(`[evolis] Opening "${name}" with mode ${mode} (${direct ? "DIRECT" : "AUTO"})`)
  const ptr = getFns().evolis_open_with_mode(name, mode)
  if (!ptr) {
    throw new Error(`Failed to open printer: ${name}`)
  }
  // Disable session management so reserve/release checks are bypassed.
  // This prevents conflicts with EPS2 which holds its own session.
  getFns().evolis_set_session_management(ptr, false)
  console.log(`[evolis] Session management disabled`)
  return ptr
}

export function evolisClose(printer: unknown): void {
  getFns().evolis_close(printer)
}

export function evolisReserve(
  printer: unknown,
  waitMs: number = 5000
): number {
  return getFns().evolis_reserve(printer, 0, waitMs)
}

export function evolisRelease(printer: unknown): number {
  return getFns().evolis_release(printer)
}

export function evolisClearErrors(printer: unknown): number {
  return getFns().evolis_clear_mechanical_errors(printer)
}

export interface NativeEvolisInfo {
  name: string
  model: number
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

function charArrayToString(val: unknown): string {
  // koffi may return char[] as string directly or as number array
  if (typeof val === "string") return val
  if (Array.isArray(val)) {
    return String.fromCharCode(...val).replace(/\0.*/, "")
  }
  return String(val ?? "")
}

export function evolisGetInfo(printer: unknown): NativeEvolisInfo {
  const info: Record<string, unknown> = {}
  const rc = getFns().evolis_get_info(printer, info)
  if (rc !== 0) {
    throw new Error(`evolis_get_info failed: ${evolisGetErrorName(rc)} (${rc})`)
  }
  console.log("[evolis] getInfo raw:", JSON.stringify(info).substring(0, 300))
  return {
    name: charArrayToString(info.name),
    model: info.model as number,
    modelName: charArrayToString(info.modelName),
    serialNumber: charArrayToString(info.serialNumber),
    fwVersion: charArrayToString(info.fwVersion),
    hasFlip: !!info.hasFlip,
    hasMagEnc: !!info.hasMagEnc,
    hasContactLessEnc: !!info.hasContactLessEnc,
    hasSmartEnc: !!info.hasSmartEnc,
    hasLaminator: !!info.hasLaminator,
    hasScanner: !!info.hasScanner,
    hasLock: !!info.hasLock,
    hasLcd: !!info.hasLcd,
  }
}

export interface NativeEvolisRibbon {
  type: number
  typeName: string
  description: string
  remaining: number
  capacity: number
}

export function evolisGetRibbon(printer: unknown): NativeEvolisRibbon {
  const ribbon: Record<string, unknown> = {}
  const rc = getFns().evolis_get_ribbon(printer, ribbon)
  if (rc !== 0) {
    throw new Error(
      `evolis_get_ribbon failed: ${evolisGetErrorName(rc)} (${rc})`
    )
  }
  const ribbonType = ribbon.type as number
  return {
    type: ribbonType,
    typeName: getFns().evolis_get_ribbon_name(ribbonType),
    description: charArrayToString(ribbon.description),
    remaining: ribbon.remaining as number,
    capacity: ribbon.capacity as number,
  }
}

export interface NativeEvolisState {
  major: number
  majorString: string
  minor: number
}

const MAJOR_STRINGS: Record<number, string> = {
  0: "off",
  1: "ready",
  2: "warning",
  3: "error",
}

export function evolisGetState(printer: unknown): NativeEvolisState {
  const major = [0]
  const minor = [0]
  getFns().evolis_get_state(printer, major, minor)
  return {
    major: major[0],
    majorString: MAJOR_STRINGS[major[0]] ?? "unknown",
    minor: minor[0],
  }
}

export function evolisSetTrays(printer: unknown): void {
  getFns().evolis_set_input_tray(printer, EVOLIS_IT_FEEDER)
  getFns().evolis_set_output_tray(printer, EVOLIS_OT_STANDARD)
  getFns().evolis_set_error_tray(printer, EVOLIS_OT_ERROR)
}

export function evolisSetInputTray(printer: unknown, tray: number): void {
  getFns().evolis_set_input_tray(printer, tray)
}

export function evolisSetErrorTray(printer: unknown, tray: number): void {
  getFns().evolis_set_error_tray(printer, tray)
}

/** Log a single print setting for diagnostics. */
function logPrintSetting(
  f: ReturnType<typeof declareAll>,
  printer: unknown,
  name: string,
  key: number,
): void {
  try {
    const valuePtr = [null as unknown as string]
    const ok = f.evolis_print_get_setting(printer, key, valuePtr)
    console.log(`[evolis] Setting ${name} (key=${key}): ${ok ? valuePtr[0] : "(not set)"}`)
  } catch {
    console.warn(`[evolis] Could not read setting ${name}`)
  }
}

export function evolisPrintFromPath(
  printer: unknown,
  frontPath: string,
  backPath?: string
): number {
  const f = getFns()

  // Ensure we have a clean session before printing.
  // Release any stale session, then re-reserve.
  try { f.evolis_release(printer) } catch { /* ignore */ }
  const session = f.evolis_reserve(printer, 0, 10000)
  if (session < 0) {
    console.warn(`[evolis] Reserve before print: ${evolisGetErrorName(session)} (${session})`)
    // Continue anyway — some errors like -11 (EPS supervised) are non-fatal in DIRECT mode
  }

  f.evolis_clear_mechanical_errors(printer)
  evolisSetTrays(printer)

  // Initialize print job — try driver settings first, fall back to auto-detect
  const rcInit = f.evolis_print_init_from_driver_settings(printer)
  if (rcInit !== 0) {
    console.warn(`[evolis] init_from_driver_settings failed (${rcInit}), trying evolis_print_init`)
    const rcInit2 = f.evolis_print_init(printer)
    if (rcInit2 !== 0) {
      throw new Error(
        `print_init failed: ${evolisGetErrorName(rcInit2)} (${rcInit2})`
      )
    }
  }

  // Explicitly set print area settings to ensure full CR-80 card printing
  f.evolis_print_set_setting(printer, EVOSETTINGS_KE_PaperSize, "CR80")
  f.evolis_print_set_setting(printer, EVOSETTINGS_KE_Resolution, "DPI300")
  f.evolis_print_set_setting(printer, EVOSETTINGS_KE_Orientation, "LANDSCAPE_CC90")
  f.evolis_print_set_setting(printer, EVOSETTINGS_KE_FOverlayManagement, "FULLVARNISH")

  // Diagnostic: log active print settings
  logPrintSetting(f, printer, "PaperSize", EVOSETTINGS_KE_PaperSize)
  logPrintSetting(f, printer, "Resolution", EVOSETTINGS_KE_Resolution)
  logPrintSetting(f, printer, "Orientation", EVOSETTINGS_KE_Orientation)
  logPrintSetting(f, printer, "Duplex", EVOSETTINGS_KE_Duplex)
  logPrintSetting(f, printer, "FBlackManagement", EVOSETTINGS_KE_FBlackManagement)
  logPrintSetting(f, printer, "FOverlayManagement", EVOSETTINGS_KE_FOverlayManagement)

  // Set front image
  const rcFront = f.evolis_print_set_imagep(printer, EVOLIS_FA_FRONT, frontPath)
  if (rcFront !== 0) {
    throw new Error(
      `set_image front failed: ${evolisGetErrorName(rcFront)} (${rcFront})`
    )
  }

  // Duplex
  if (backPath) {
    f.evolis_print_set_setting(printer, EVOSETTINGS_KE_Duplex, "HORIZONTAL")
    f.evolis_print_set_setting(
      printer,
      EVOSETTINGS_KE_GDuplexType,
      "DUPLEX_CC"
    )
    const rcBack = f.evolis_print_set_imagep(printer, EVOLIS_FA_BACK, backPath)
    if (rcBack !== 0) {
      throw new Error(
        `set_image back failed: ${evolisGetErrorName(rcBack)} (${rcBack})`
      )
    }
  }

  // Execute
  return f.evolis_print_exec(printer)
}

/**
 * Print from raw BMP buffers — matches EasyCard's approach using evolis_print_set_imageb.
 * Avoids writing temporary files to disk.
 */
export function evolisPrintFromBuffer(
  printer: unknown,
  frontBuffer: Buffer,
  backBuffer?: Buffer
): number {
  const f = getFns()

  // Clean session
  try { f.evolis_release(printer) } catch { /* ignore */ }
  const session = f.evolis_reserve(printer, 0, 10000)
  if (session < 0) {
    console.warn(`[evolis] Reserve before print: ${evolisGetErrorName(session)} (${session})`)
  }

  f.evolis_clear_mechanical_errors(printer)
  evolisSetTrays(printer)

  // Initialize print job
  const rcInit = f.evolis_print_init_from_driver_settings(printer)
  if (rcInit !== 0) {
    console.warn(`[evolis] init_from_driver_settings failed (${rcInit}), trying evolis_print_init`)
    const rcInit2 = f.evolis_print_init(printer)
    if (rcInit2 !== 0) {
      throw new Error(
        `print_init failed: ${evolisGetErrorName(rcInit2)} (${rcInit2})`
      )
    }
  }

  // Explicitly set print area settings to ensure full CR-80 card printing
  f.evolis_print_set_setting(printer, EVOSETTINGS_KE_PaperSize, "CR80")
  f.evolis_print_set_setting(printer, EVOSETTINGS_KE_Resolution, "DPI300")
  f.evolis_print_set_setting(printer, EVOSETTINGS_KE_Orientation, "LANDSCAPE_CC90")
  f.evolis_print_set_setting(printer, EVOSETTINGS_KE_FOverlayManagement, "FULLVARNISH")

  // Set front image from buffer
  console.log(`[evolis] Setting front image from buffer (${frontBuffer.length} bytes)`)
  const rcFront = f.evolis_print_set_imageb(printer, EVOLIS_FA_FRONT, frontBuffer, frontBuffer.length)
  if (rcFront !== 0) {
    throw new Error(
      `set_imageb front failed: ${evolisGetErrorName(rcFront)} (${rcFront})`
    )
  }

  // Duplex
  if (backBuffer) {
    f.evolis_print_set_setting(printer, EVOSETTINGS_KE_Duplex, "HORIZONTAL")
    f.evolis_print_set_setting(printer, EVOSETTINGS_KE_GDuplexType, "DUPLEX_CC")
    console.log(`[evolis] Setting back image from buffer (${backBuffer.length} bytes)`)
    const rcBack = f.evolis_print_set_imageb(printer, EVOLIS_FA_BACK, backBuffer, backBuffer.length)
    if (rcBack !== 0) {
      throw new Error(
        `set_imageb back failed: ${evolisGetErrorName(rcBack)} (${rcBack})`
      )
    }
  }

  // Execute
  return f.evolis_print_exec(printer)
}

// --- Print building blocks (for 8-step cardflow) ---

export function evolisPrintInitFromDriverSettings(printer: unknown): number {
  return getFns().evolis_print_init_from_driver_settings(printer)
}

export function evolisPrintInit(printer: unknown): number {
  return getFns().evolis_print_init(printer)
}

export function evolisPrintSetSetting(printer: unknown, key: number, value: string): boolean {
  return getFns().evolis_print_set_setting(printer, key, value)
}

export function evolisPrintSetImageP(printer: unknown, face: number, path: string): number {
  return getFns().evolis_print_set_imagep(printer, face, path)
}

export function evolisPrintExec(printer: unknown): number {
  return getFns().evolis_print_exec(printer)
}

// Re-export setting keys for the service to use
export {
  EVOSETTINGS_KE_Duplex,
  EVOSETTINGS_KE_GDuplexType,
  EVOSETTINGS_KE_Orientation,
  EVOSETTINGS_KE_Resolution,
  EVOSETTINGS_KE_PaperSize,
  EVOSETTINGS_KE_FBlackManagement,
  EVOSETTINGS_KE_FOverlayManagement,
}

export { EVOLIS_FA_FRONT, EVOLIS_FA_BACK }

export function evolisEject(printer: unknown): number {
  return getFns().evolis_eject(printer)
}

export function evolisReject(printer: unknown): number {
  return getFns().evolis_reject(printer)
}

// --- Status ---

export interface NativeEvolisStatus {
  config: number
  information: number
  warning: number
  error: number
  exts: number[]
  session: number
}

export function evolisGetFullStatus(printer: unknown): NativeEvolisStatus {
  const status: Record<string, unknown> = {}
  const rc = getFns().evolis_status(printer, status)
  if (rc !== 0) {
    throw new Error(`evolis_status failed: ${evolisGetErrorName(rc)} (${rc})`)
  }
  return {
    config: (status.config as number) ?? 0,
    information: (status.information as number) ?? 0,
    warning: (status.warning as number) ?? 0,
    error: (status.error as number) ?? 0,
    exts: (status.exts as number[]) ?? [0, 0, 0, 0],
    session: (status.session as number) ?? 0,
  }
}

// --- Output tray ---

export function evolisSetOutputTray(printer: unknown, tray: number): void {
  getFns().evolis_set_output_tray(printer, tray)
}

// --- Card position ---

export function evolisSetCardPos(printer: unknown, pos: number): number {
  return getFns().evolis_set_card_pos(printer, pos)
}

// --- Magnetic encoding ---

export interface MagTracksHandle {
  _raw: Record<string, unknown>
}

export function evolisMagInit(): MagTracksHandle {
  const tracks: Record<string, unknown> = {}
  getFns().evolis_mag_init(tracks)
  return { _raw: tracks }
}

export function evolisMagSetTrack(
  handle: MagTracksHandle,
  trackNum: 0 | 1 | 2,
  format: number,
  data: string,
): number {
  return getFns().evolis_mag_set_track(handle._raw, trackNum, format, data)
}

export function evolisMagWrite(printer: unknown, handle: MagTracksHandle): number {
  return getFns().evolis_mag_write(printer, handle._raw)
}

export function evolisMagRead(printer: unknown): { tracks: MagTracksHandle; rc: number } {
  const tracks: Record<string, unknown> = {}
  getFns().evolis_mag_init(tracks)
  const rc = getFns().evolis_mag_read(printer, tracks)
  return { tracks: { _raw: tracks }, rc }
}

// --- PC/SC (NFC/Contactless) ---

export interface NativePcscEncoder {
  name: string
  uid: number
}

export function evolisPcscList(printer: unknown): NativePcscEncoder[] {
  const maxEncoders = 8
  const encodersBuf = new Array(maxEncoders).fill(null).map(() => ({}))
  const count = getFns().evolis_pcsc_list(printer, encodersBuf, maxEncoders)

  if (count <= 0) return []

  const rawArray = koffi.decode(encodersBuf, evolis_pcsc_encoder_t, count)
  const items = Array.isArray(rawArray) ? rawArray : [rawArray]

  return items.map((e: Record<string, unknown>) => ({
    name: charArrayToString(e.name),
    uid: e.uid as number,
  }))
}

export function evolisPcscWaitCard(
  printer: unknown,
  uid: number,
  timeoutMs: number = 10000,
): number {
  return getFns().evolis_pcsc_wait_card_presentt(printer, uid, timeoutMs)
}

export function evolisPcscConnect(printer: unknown, uid: number): number {
  return getFns().evolis_pcsc_connect(printer, uid, EVOLIS_PCSC_PCL_ANY)
}

export function evolisPcscSendApdu(
  printer: unknown,
  command: Buffer,
): { response: Buffer; rc: number } {
  const replyBuf = Buffer.alloc(256)
  const rc = getFns().evolis_pcsc_send_apdu(
    printer,
    command,
    command.length,
    replyBuf,
    replyBuf.length,
  )
  // rc is the number of bytes in the response (or negative on error)
  if (rc < 0) {
    return { response: Buffer.alloc(0), rc }
  }
  return { response: replyBuf.subarray(0, rc), rc }
}

export function evolisPcscDisconnect(printer: unknown): number {
  return getFns().evolis_pcsc_disconnect(printer, EVOLIS_PCSC_DSP_RESET)
}

export function evolisPcscReadAtr(printer: unknown, uid: number): Buffer | null {
  const atrBuf = Buffer.alloc(33)
  const rc = getFns().evolis_pcsc_read_atr(printer, uid, atrBuf)
  if (rc !== 0) return null
  // Find null terminator
  const nullIdx = atrBuf.indexOf(0)
  return nullIdx >= 0 ? atrBuf.subarray(0, nullIdx) : atrBuf
}
