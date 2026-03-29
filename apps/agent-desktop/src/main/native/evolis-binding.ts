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
      "int evolis_get_info(void* printer, evolis_info_t* info)"
    ),
    evolis_get_ribbon: l.func(
      "int evolis_get_ribbon(void* printer, evolis_ribbon_t* ribbon)"
    ),
    evolis_get_state: l.func(
      "int evolis_get_state(void* printer, int* major, int* minor)"
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
    evolis_print_set_auto_eject: l.func(
      "bool evolis_print_set_auto_eject(void* printer, bool on)"
    ),
    evolis_print_exec: l.func("int evolis_print_exec(void* printer)"),
    evolis_print_exect: l.func(
      "int evolis_print_exect(void* printer, int timeout)"
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
const EVOLIS_OT_ERROR = 8
const EVOLIS_FA_FRONT = 0
const EVOLIS_FA_BACK = 1

// Settings keys for duplex (from evosettings_keys.h)
const EVOSETTINGS_KE_Duplex = 4
const EVOSETTINGS_KE_GDuplexType = 6

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

  const devices: NativeEvolisDevice[] = []

  // Decode the array of evolis_device_t structs
  const rawDevices = koffi.decode(
    devicesPtr[0],
    koffi.pointer(evolis_device_t),
    count
  )

  for (let i = 0; i < count; i++) {
    const d = rawDevices[i]
    devices.push({
      id: String.fromCharCode(...d.id).replace(/\0.*/, ""),
      name: String.fromCharCode(...d.name).replace(/\0.*/, ""),
      displayName: String.fromCharCode(...d.displayName).replace(/\0.*/, ""),
      uri: String.fromCharCode(...d.uri).replace(/\0.*/, ""),
      mark: d.mark,
      model: d.model,
      isSupervised: d.isSupervised,
      isOnline: d.isOnline,
      link: d.link,
      driverVersion: String.fromCharCode(...d.driverVersion).replace(
        /\0.*/,
        ""
      ),
    })
  }

  f.evolis_free_devices(devicesPtr[0])
  return devices
}

export function evolisOpen(name: string): unknown {
  const ptr = getFns().evolis_open(name)
  if (!ptr) {
    throw new Error(`Failed to open printer: ${name}`)
  }
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
}

function charArrayToString(arr: number[]): string {
  return String.fromCharCode(...arr).replace(/\0.*/, "")
}

export function evolisGetInfo(printer: unknown): NativeEvolisInfo {
  const info: Record<string, unknown> = {}
  const rc = getFns().evolis_get_info(printer, info)
  if (rc !== 0) {
    throw new Error(`evolis_get_info failed: ${evolisGetErrorName(rc)} (${rc})`)
  }
  return {
    name: charArrayToString(info.name as number[]),
    model: info.model as number,
    modelName: charArrayToString(info.modelName as number[]),
    serialNumber: charArrayToString(info.serialNumber as number[]),
    fwVersion: charArrayToString(info.fwVersion as number[]),
    hasFlip: info.hasFlip as boolean,
    hasMagEnc: info.hasMagEnc as boolean,
    hasContactLessEnc: info.hasContactLessEnc as boolean,
    hasSmartEnc: info.hasSmartEnc as boolean,
    hasLaminator: info.hasLaminator as boolean,
    hasScanner: info.hasScanner as boolean,
    hasLock: info.hasLock as boolean,
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
    description: charArrayToString(ribbon.description as number[]),
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

export function evolisPrintFromPath(
  printer: unknown,
  frontPath: string,
  backPath?: string
): number {
  const f = getFns()

  f.evolis_clear_mechanical_errors(printer)
  evolisSetTrays(printer)

  const rcInit = f.evolis_print_init_from_driver_settings(printer)
  if (rcInit !== 0) {
    // Fallback to auto-detect init
    const rcInit2 = f.evolis_print_init(printer)
    if (rcInit2 !== 0) {
      throw new Error(
        `print_init failed: ${evolisGetErrorName(rcInit2)} (${rcInit2})`
      )
    }
  }

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

export function evolisEject(printer: unknown): number {
  return getFns().evolis_eject(printer)
}

export function evolisReject(printer: unknown): number {
  return getFns().evolis_reject(printer)
}
