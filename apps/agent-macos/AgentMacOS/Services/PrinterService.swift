//
//  PrinterService.swift
//  AgentMacOS
//
//  Swift wrapper for Evolis C SDK
//

import Foundation
import AppKit

// MARK: - Enums

/// Duplex type: which printing mode for front and back faces
enum DuplexType: String, CaseIterable, Identifiable {
    case colorColor = "DUPLEX_CC"     // Couleur recto + verso
    case colorMono  = "DUPLEX_CM"     // Couleur recto, N&B verso
    case monoColor  = "DUPLEX_MC"     // N&B recto, couleur verso
    case monoMono   = "DUPLEX_MM"     // N&B recto + verso
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .colorColor: return "Color / Color"
        case .colorMono:  return "Color / B&W"
        case .monoColor:  return "B&W / Color"
        case .monoMono:   return "B&W / B&W"
        }
    }
}

/// Output tray selection
enum OutputTrayOption: String, CaseIterable, Identifiable {
    case standard = "standard"   // Bezel avant
    case rear     = "rear"       // Sortie arrière
    
    var id: String { rawValue }
    
    var evoValue: evolis_outtray_t {
        switch self {
        case .standard: return EVOLIS_OT_STANDARD
        case .rear:     return EVOLIS_OT_REAR
        }
    }
    
    var displayName: String {
        switch self {
        case .standard: return "Front (Bezel)"
        case .rear:     return "Rear"
        }
    }
}

// MARK: - Printer Info

struct PrinterInfo: Identifiable {
    let id: String
    let name: String
    let model: String
    let serialNumber: String
    let firmwareVersion: String
    let hasMagEncoder: Bool
    let hasDuplex: Bool
    let hasContactlessEncoder: Bool
    let hasSmartEncoder: Bool
    let hasLaminator: Bool
    let hasScanner: Bool
    let hasLcd: Bool
}

struct RibbonInfo {
    let type: String
    let remaining: Int
    let capacity: Int
    
    var percentRemaining: Double {
        guard capacity > 0 else { return 0 }
        return Double(remaining) / Double(capacity) * 100
    }
}

// MARK: - Print Job

enum PrintJobStatus: Equatable {
    case pending
    case printing
    case completed
    case failed(String)
    case cancelled
}

struct PrintJob: Identifiable {
    let id: UUID
    let templateName: String
    let recordName: String
    var status: PrintJobStatus
    var progress: Double
    let createdAt: Date
}

// MARK: - Printer Service

@Observable
final class PrinterService {
    
    // MARK: - Properties
    
    private(set) var connectedPrinter: PrinterInfo?
    private(set) var ribbonInfo: RibbonInfo?
    private(set) var isConnected = false
    private(set) var lastError: String?
    
    // Serial queue for printer operations
    private let queue = DispatchQueue(label: "com.easycard.printer", qos: .userInitiated)
    
    // evolis_t* is typedef'd as void* in C, which becomes UnsafeMutableRawPointer in Swift
    private var printerHandle: UnsafeMutableRawPointer?

    /// CUPS queue name for the connected printer (used for lp -d)
    private var connectedCupsName: String?
    
    // UserDefaults key for persisting last printer
    private let lastPrinterKey = "AgentMacOS.LastConnectedPrinter"
    
    /// Last connected printer name (persisted)
    var lastConnectedPrinterName: String? {
        get { UserDefaults.standard.string(forKey: lastPrinterKey) }
        set { UserDefaults.standard.set(newValue, forKey: lastPrinterKey) }
    }
    
    // MARK: - Singleton
    
    static let shared = PrinterService()
    
    private init() {
        // Auto-reconnect to last printer on launch
        autoReconnect()
    }
    
    /// Attempt to reconnect to the last used printer
    func autoReconnect() {
        guard let printerName = lastConnectedPrinterName else {
            print("📢 [PrinterService] No saved printer to reconnect")
            return
        }
        
        print("📢 [PrinterService] Attempting auto-reconnect to: \(printerName)")
        
        // Check if printer is available
        let printers = listPrinters()
        if printers.contains(printerName) {
            if connect(printerName: printerName) {
                print("✅ [PrinterService] Auto-reconnected to \(printerName)")
            } else {
                print("❌ [PrinterService] Failed to auto-reconnect to \(printerName)")
            }
        } else {
            print("⚠️ [PrinterService] Saved printer '\(printerName)' not found. Available: \(printers)")
        }
    }
    
    // MARK: - Connection
    
    /// List all available Evolis printers
    func listPrinters() -> [String] {
        var printers: [String] = []
        
        // Use our C wrapper for the variadic function
        var deviceList: UnsafeMutablePointer<evolis_device_t>?
        let count = evolis_get_all_devices(&deviceList)
        
        if count > 0, let devices = deviceList {
            for i in 0..<Int(count) {
                let device = devices[i]
                let name = String(cTuple: device.name)
                if !name.isEmpty {
                    printers.append(name)
                }
            }
            evolis_free_devices(deviceList)
        }
        
        return printers
    }
    
    /// Connect to a printer by name
    func connect(printerName: String) -> Bool {
        disconnect()
        
        printerHandle = evolis_open(printerName)
        
        guard printerHandle != nil else {
            lastError = "Failed to connect to \(printerName)"
            isConnected = false
            return false
        }
        
        isConnected = true
        lastError = nil
        connectedCupsName = printerName

        // Save for auto-reconnect
        lastConnectedPrinterName = printerName
        print("💾 [PrinterService] Saved printer for auto-reconnect: \(printerName)")
        
        // Get printer info
        refreshPrinterInfo()
        
        return true
    }
    
    /// Disconnect from current printer
    func disconnect() {
        if let handle = printerHandle {
            evolis_close(handle)
            printerHandle = nil
        }
        isConnected = false
        connectedPrinter = nil
        connectedCupsName = nil
        ribbonInfo = nil
        // Note: We keep lastConnectedPrinterName for next auto-reconnect
    }
    
    /// Refresh printer information
    func refreshPrinterInfo() {
        guard let handle = printerHandle else { return }
        
        var info = evolis_info_t()
        let result = evolis_get_info(handle, &info)
        
        if result == EVOLIS_RC_OK.rawValue {
            connectedPrinter = PrinterInfo(
                id: String(cTuple: info.serialNumber),
                name: String(cTuple: info.name),
                model: String(cTuple: info.modelName),
                serialNumber: String(cTuple: info.serialNumber),
                firmwareVersion: String(cTuple: info.fwVersion),
                hasMagEncoder: info.hasMagEnc,
                hasDuplex: info.hasFlip,
                hasContactlessEncoder: info.hasContactLessEnc,
                hasSmartEncoder: info.hasSmartEnc,
                hasLaminator: info.hasLaminator,
                hasScanner: info.hasScanner,
                hasLcd: info.hasLcd
            )
        }
        
        // Get ribbon info
        var ribbon = evolis_ribbon_t()
        if evolis_get_ribbon(handle, &ribbon) == EVOLIS_RC_OK.rawValue {
            ribbonInfo = RibbonInfo(
                type: String(cString: evolis_get_ribbon_name(ribbon.type)),
                remaining: Int(ribbon.remaining),
                capacity: Int(ribbon.capacity)
            )
        }
    }
    
    // MARK: - Printing
    
    /// Print a card with front and optional back images
    /// Note: This method is marked with @MainActor to ensure all SDK calls are executed on the main thread
    @MainActor
    func printCard(
        frontImage: NSImage,
        backImage: NSImage? = nil,
        nfcPayload: NFCPayload? = nil,
        magTracks: [Int: String]? = nil,
        outputTray: OutputTrayOption = .standard,
        duplexType: DuplexType = .colorColor
    ) async throws {
        print("🖨️ [PrinterService] printCard called")
        
        guard let handle = printerHandle else {
            print("❌ [PrinterService] No printer handle")
            throw PrintError.notConnected
        }
        
        print("🖨️ [PrinterService] Printer handle: \(handle)")
        
        // Convert images to BMP data BEFORE entering sync block
        guard let frontData = frontImage.bmpData() else {
            print("❌ [PrinterService] Failed to convert front image to BMP")
            throw PrintError.imageConversionFailed
        }
        print("🖨️ [PrinterService] Front BMP size: \(frontData.count) bytes")
        
        let backData = backImage?.bmpData()
        if backData != nil {
            print("🖨️ [PrinterService] Back BMP size: \(backData!.count) bytes")
        }
        
        // Execute ALL SDK calls on a background serial queue
        // USB communication on macOS often requires main thread access, but Evolis SDK seems to work fine off-main.
        // Using a serial queue ensures only one printer operation happens at a time.
        print("🖨️ [PrinterService] Executing SDK calls on background serial queue")
        
        return try await withCheckedThrowingContinuation { continuation in
            queue.async {
                do {
                    try self.executePrintSync(
                        handle: handle,
                        frontData: frontData,
                        backData: backData,
                        nfcPayload: nfcPayload,
                        outputTray: outputTray,
                        duplexType: duplexType,
                        magTracks: magTracks,
                        cupsName: self.connectedCupsName
                    )
                    
                    // Refresh printer info on the main actor after successful print
                    Task { @MainActor in
                        self.refreshPrinterInfo()
                    }
                    continuation.resume(returning: ())
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    /// Synchronous print execution - keeps all data in scope
    private func executePrintSync(
        handle: UnsafeMutableRawPointer,
        frontData: Data,
        backData: Data?,
        nfcPayload: NFCPayload?,
        outputTray: OutputTrayOption,
        duplexType: DuplexType,
        magTracks: [Int: String]?,
        cupsName: String?
    ) throws {
        // Reserve printer session
        // NOTE: evolis_reserve() returns a session ID (> 0) on success,
        //       NOT EVOLIS_RC_OK. Use EVOLIS_SESSION_IS_OK(s) → (s > 0).
        print("🖨️ [PrinterService] Reserving printer session...")
        let reserveResult = evolis_reserve(handle, 0, 10000)

        guard reserveResult > 0 else {
             print("❌ [PrinterService] Failed to reserve session: \(reserveResult)")
             throw PrintError.sessionReservationFailed(code: reserveResult)
        }
        print("✅ [PrinterService] Session reserved (ID: \(reserveResult))")
        
        defer {
            print("🖨️ [PrinterService] Releasing printer session...")
            evolis_release(handle)
        }
        
        // ===================================================================
        // CARDFLOW ORDER: Clear → Trays → Init → Duplex → Mag → NFC → Print
        // ===================================================================
        
        // 1. Clear any persistent errors from previous failed prints
        print("🖨️ [PrinterService] Step 1/8: Clearing mechanical errors...")
        evolis_clear_mechanical_errors(handle)
        
        // 2. Log full printer status for diagnostics
        print("🖨️ [PrinterService] Step 2/8: Checking printer status...")
        var status = evolis_status_t()
        if evolis_status(handle, &status) == EVOLIS_RC_OK.rawValue {
            print("🖨️ [PrinterService] Printer status — CFG: 0x\(String(status.config, radix: 16)), INF: 0x\(String(status.information, radix: 16)), WAR: 0x\(String(status.warning, radix: 16)), ERR: 0x\(String(status.error, radix: 16))")
            if (status.error & 0x00400000) != 0 {
                print("⚠️ [PrinterService] ERR_BAD_RIBBON flag is set!")
            }
        }
        
        // 3. Set card input/output trays
        print("🖨️ [PrinterService] Step 3/8: Setting trays...")
        evolis_set_input_tray(handle, EVOLIS_IT_FEEDER)
        evolis_set_output_tray(handle, outputTray.evoValue)
        evolis_set_error_tray(handle, EVOLIS_OT_ERROR)
        
        // 4. Initialize print session
        // Use evolis_print_init() first (auto-detects ribbon).
        // Fall back to evolis_print_init_with_ribbon() if that fails.
        // Avoid evolis_print_init_from_driver_settings() — on macOS it reads
        // CUPS driver settings which may be empty or stale.
        print("🖨️ [PrinterService] Step 4/8: Initializing print session...")
        var initResult = evolis_print_init(handle)
        print("🖨️ [PrinterService] evolis_print_init result: \(initResult)")

        if initResult != EVOLIS_RC_OK.rawValue {
            // Fallback: init with the detected ribbon type
            print("⚠️ [PrinterService] print_init failed, trying with ribbon type...")
            var ribbon = evolis_ribbon_t()
            if evolis_get_ribbon(handle, &ribbon) == EVOLIS_RC_OK.rawValue {
                print("🖨️ [PrinterService] Detected ribbon: \(ribbon.type.rawValue)")
                initResult = evolis_print_init_with_ribbon(handle, ribbon.type)
                print("🖨️ [PrinterService] evolis_print_init_with_ribbon result: \(initResult)")
            }
        }

        guard initResult == EVOLIS_RC_OK.rawValue else {
            print("❌ [PrinterService] Print init failed with code: \(initResult)")
            throw PrintError.initFailed(code: initResult)
        }
        
        // 5. Configure duplex settings if back image is provided
        if backData != nil {
            print("🖨️ [PrinterService] Step 5/8: Enabling duplex mode (\(duplexType.rawValue))...")
            evolis_print_set_setting(handle, EVOSETTINGS_KE_Duplex, "HORIZONTAL")
            evolis_print_set_setting(handle, EVOSETTINGS_KE_GDuplexType, duplexType.rawValue)
        } else {
            print("🖨️ [PrinterService] Step 5/8: Simplex mode (no back image)")
        }
        
        // 6. Magnetic encoding (before printing, as per cardflow standard)
        if let magTracks = magTracks, !magTracks.isEmpty {
            print("🖨️ [PrinterService] Step 6/8: Encoding magnetic tracks...")
            var tracks = evolis_mag_tracks_t()
            evolis_mag_init(&tracks)
            
            for (trackNum, data) in magTracks {
                // Ensure track number is 1, 2, or 3
                guard trackNum >= 1 && trackNum <= 3 else { continue }
                
                // The `evolis_mag_set_track` function takes an `int track` parameter.
                // The Evolis SDK header defines `EVOLIS_MT_TRACK1 = 0`, `EVOLIS_MT_TRACK2 = 1`, `EVOLIS_MT_TRACK3 = 2`.
                // So, we need to convert 1-based trackNum to 0-based index for the SDK.
                let sdkTrackIndex = Int32(trackNum - 1)
                
                // Let's assume ISO format standard defaults:
                // Track 1: ISO1 (IATA)
                // Track 2: ISO2 (ABA)
                // Track 3: ISO3 (THRIFT)
                let format: evolis_mag_format_t
                switch trackNum {
                case 1: format = EVOLIS_MF_ISO1
                case 2: format = EVOLIS_MF_ISO2
                case 3: format = EVOLIS_MF_ISO3
                default: format = EVOLIS_MF_ISO1 // Should not happen due to guard
                }
                
                let setResult = evolis_mag_set_track(&tracks, sdkTrackIndex, format, data)
                if setResult != EVOLIS_RC_OK.rawValue {
                   print("⚠️ [PrinterService] Failed to set mag track \(trackNum) with result: \(setResult)")
                }
            }
            
            let magResult = evolis_mag_write(handle, &tracks)
            guard magResult == EVOLIS_RC_OK.rawValue else {
                print("❌ [PrinterService] Magnetic encoding failed: \(magResult)")
                throw PrintError.magneticEncodingFailed(code: magResult)
            }
            print("✅ [PrinterService] Magnetic encoding completed")
        } else {
            print("🖨️ [PrinterService] Step 6/8: No magnetic tracks to encode")
        }
        
        // 7. NFC/Contactless encoding (before printing, as per cardflow standard)
        if let payload = nfcPayload {
            print("🖨️ [PrinterService] Step 7/8: NFC encoding...")
            try NFCEncodingService.shared.encodeCard(printer: handle, payload: payload)
            print("✅ [PrinterService] NFC encoding completed")
        } else {
            print("🖨️ [PrinterService] Step 7/8: No NFC payload to encode")
        }
        
        // 8. Set images and execute print
        print("🖨️ [PrinterService] Step 8/8: Setting images and printing...")
        
        // Set front image
        print("🖨️ [PrinterService] Setting front image (\(frontData.count) bytes)...")
        let frontResult = frontData.withUnsafeBytes { rawPtr -> Int32 in
            let ptr = rawPtr.baseAddress?.assumingMemoryBound(to: CChar.self)
            return evolis_print_set_imageb(handle, EVOLIS_FA_FRONT, ptr, frontData.count)
        }
        print("🖨️ [PrinterService] Front image result: \(frontResult)")
        guard frontResult == EVOLIS_RC_OK.rawValue else {
            print("❌ [PrinterService] Set front image failed with code: \(frontResult)")
            throw PrintError.setImageFailed(face: "front", code: frontResult)
        }
        
        // Set back image if provided
        if let backData = backData {
            print("🖨️ [PrinterService] Setting back image (\(backData.count) bytes)...")
            let backResult = backData.withUnsafeBytes { rawPtr -> Int32 in
                let ptr = rawPtr.baseAddress?.assumingMemoryBound(to: CChar.self)
                return evolis_print_set_imageb(handle, EVOLIS_FA_BACK, ptr, backData.count)
            }
            print("🖨️ [PrinterService] Back image result: \(backResult)")
            guard backResult == EVOLIS_RC_OK.rawValue else {
                print("❌ [PrinterService] Set back image failed with code: \(backResult)")
                throw PrintError.setImageFailed(face: "back", code: backResult)
            }
        }
        
        // Check printer state before executing
        print("🖨️ [PrinterService] Checking printer state...")
        var majorState: evolis_major_state_t = EVOLIS_MJ_OFF
        var minorState: evolis_minor_state_t = EVOLIS_MI_PRINTER_UNKNOWN
        let stateResult = evolis_get_state(handle, &majorState, &minorState)
        if stateResult == EVOLIS_RC_OK.rawValue {
            let majorStr = String(cString: evolis_get_major_string(majorState))
            let minorStr = String(cString: evolis_get_minor_string(minorState))
            print("🖨️ [PrinterService] Printer state - Major: \(majorStr), Minor: \(minorStr)")
        } else {
            print("⚠️ [PrinterService] Could not get printer state: \(stateResult)")
        }
        
        // Log all current print settings for diagnostics
        print("🖨️ [PrinterService] Current settings dump:")
        let settingsToCheck: [(evosettings_key_e, String)] = [
            (EVOSETTINGS_KE_GRibbonType, "GRibbonType"),
            (EVOSETTINGS_KE_Duplex, "Duplex"),
            (EVOSETTINGS_KE_GDuplexType, "GDuplexType"),
            (EVOSETTINGS_KE_Resolution, "Resolution"),
        ]
        for (key, name) in settingsToCheck {
            var valuePtr: UnsafePointer<CChar>?
            let found = evolis_print_get_setting(handle, key, &valuePtr)
            let val = found && valuePtr != nil ? String(cString: valuePtr!) : "(not set)"
            print("   \(name) = \(val)")
        }
        let settingCount = evolis_print_get_setting_count(handle)
        print("🖨️ [PrinterService] Total settings count: \(settingCount)")

        // ===================================================================
        // macOS printing: evolis_print_exec/exect doesn't send to
        // the physical printer on macOS. The working flow is:
        // 1. Generate PRN file via evolis_print_to_file()
        // 2. Send PRN to printer via CUPS: lp -d PRINTER -o raw FILE.prn
        // ===================================================================

        let prnPath = NSTemporaryDirectory() + "evolis_print_\(UUID().uuidString).prn"
        print("🖨️ [PrinterService] Generating PRN file: \(prnPath)")
        let fileResult = evolis_print_to_file(handle, prnPath)
        print("🖨️ [PrinterService] PRN file result: \(fileResult)")

        guard fileResult >= 0 else {
            print("❌ [PrinterService] Failed to generate PRN file: \(fileResult)")
            throw PrintError.printFailed(code: fileResult)
        }

        let fileSize = (try? FileManager.default.attributesOfItem(atPath: prnPath)[.size] as? Int) ?? 0
        print("🖨️ [PrinterService] PRN file size: \(fileSize) bytes")

        guard fileSize > 0 else {
            print("❌ [PrinterService] PRN file is empty")
            throw PrintError.printFailed(code: -1)
        }

        // Determine CUPS queue name
        guard let cupsQueue = cupsName ?? self.lastConnectedPrinterName else {
            print("❌ [PrinterService] No CUPS printer name available")
            throw PrintError.notConnected
        }

        // Enable the CUPS queue (it may be paused to prevent SDK conflicts)
        print("🖨️ [PrinterService] Enabling CUPS queue '\(cupsQueue)'...")
        let enableProcess = Process()
        enableProcess.executableURL = URL(fileURLWithPath: "/usr/sbin/cupsenable")
        enableProcess.arguments = [cupsQueue]
        try? enableProcess.run()
        enableProcess.waitUntilExit()

        // Send PRN to printer via lp
        print("🖨️ [PrinterService] Sending PRN to CUPS: lp -d \(cupsQueue) -o raw \(prnPath)")
        let lpProcess = Process()
        lpProcess.executableURL = URL(fileURLWithPath: "/usr/bin/lp")
        lpProcess.arguments = ["-d", cupsQueue, "-o", "raw", prnPath]

        let lpPipe = Pipe()
        lpProcess.standardOutput = lpPipe
        lpProcess.standardError = lpPipe

        try lpProcess.run()
        lpProcess.waitUntilExit()

        let lpOutput = String(data: lpPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
        print("🖨️ [PrinterService] lp output: \(lpOutput)")
        print("🖨️ [PrinterService] lp exit code: \(lpProcess.terminationStatus)")

        guard lpProcess.terminationStatus == 0 else {
            print("❌ [PrinterService] lp failed with exit code: \(lpProcess.terminationStatus)")
            throw PrintError.printFailed(code: Int32(lpProcess.terminationStatus))
        }

        // Clean up PRN file after a delay (give CUPS time to read it)
        DispatchQueue.global().asyncAfter(deadline: .now() + 10) {
            try? FileManager.default.removeItem(atPath: prnPath)
            print("🧹 [PrinterService] Cleaned up PRN file: \(prnPath)")
        }

        // Optionally pause CUPS queue again to prevent conflicts with SDK
        DispatchQueue.global().asyncAfter(deadline: .now() + 30) {
            let disableProcess = Process()
            disableProcess.executableURL = URL(fileURLWithPath: "/usr/sbin/cupsdisable")
            disableProcess.arguments = [cupsQueue]
            try? disableProcess.run()
            disableProcess.waitUntilExit()
            print("🖨️ [PrinterService] Re-paused CUPS queue '\(cupsQueue)' to prevent SDK conflicts")
        }

        print("✅ [PrinterService] Print job sent to CUPS successfully")
    }
    
    // MARK: - Magnetic Encoding
    
    /// Encode magnetic tracks (3 tracks max)
    func encodeMagnetic(tracks: [String]) async throws {
        guard let handle = printerHandle else {
            throw PrintError.notConnected
        }
        
        var magTracks = evolis_mag_tracks_t()
        evolis_mag_init(&magTracks)
        
        // Set track 1 (ISO1 format)
        if tracks.count > 0 && !tracks[0].isEmpty {
            evolis_mag_set_track(&magTracks, Int32(EVOLIS_MT_TRACK1.rawValue), EVOLIS_MF_ISO1, tracks[0])
        }
        
        // Set track 2 (ISO2 format)
        if tracks.count > 1 && !tracks[1].isEmpty {
            evolis_mag_set_track(&magTracks, Int32(EVOLIS_MT_TRACK2.rawValue), EVOLIS_MF_ISO2, tracks[1])
        }
        
        // Set track 3 (ISO3 format)
        if tracks.count > 2 && !tracks[2].isEmpty {
            evolis_mag_set_track(&magTracks, Int32(EVOLIS_MT_TRACK3.rawValue), EVOLIS_MF_ISO3, tracks[2])
        }
        
        let result = evolis_mag_write(handle, &magTracks)
        guard result == EVOLIS_RC_OK.rawValue else {
            throw PrintError.magneticEncodingFailed(code: result)
        }
    }
    
    // MARK: - Card Operations
    
    /// Insert a card from feeder
    func insertCard() throws {
        guard let handle = printerHandle else {
            throw PrintError.notConnected
        }
        
        let result = evolis_insert(handle)
        guard result == EVOLIS_RC_OK.rawValue else {
            throw PrintError.cardOperationFailed(operation: "insert", code: result)
        }
    }
    
    /// Eject the card to output tray
    func ejectCard() throws {
        guard let handle = printerHandle else {
            throw PrintError.notConnected
        }
        
        let result = evolis_eject(handle)
        guard result == EVOLIS_RC_OK.rawValue else {
            throw PrintError.cardOperationFailed(operation: "eject", code: result)
        }
    }
    
    /// Reject the card to error tray
    func rejectCard() throws {
        guard let handle = printerHandle else {
            throw PrintError.notConnected
        }
        
        let result = evolis_reject(handle)
        guard result == EVOLIS_RC_OK.rawValue else {
            throw PrintError.cardOperationFailed(operation: "reject", code: result)
        }
    }
    
    /// Get printer state
    func getPrinterState() -> (major: String, minor: String)? {
        guard let handle = printerHandle else { return nil }
        
        var major: evolis_major_state_t = EVOLIS_MJ_OFF
        var minor: evolis_minor_state_t = EVOLIS_MI_PRINTER_UNKNOWN
        
        let result = evolis_get_state(handle, &major, &minor)
        if result == EVOLIS_RC_OK.rawValue {
            return (
                major: String(cString: evolis_get_major_string(major)),
                minor: String(cString: evolis_get_minor_string(minor))
            )
        }
        return nil
    }
}

// MARK: - Print Errors

enum PrintError: LocalizedError {
    case notConnected
    case imageConversionFailed
    case initFailed(code: Int32)
    case setImageFailed(face: String, code: Int32)
    case printFailed(code: Int32)
    case magneticEncodingFailed(code: Int32)
    case sessionReservationFailed(code: Int32)
    case cardOperationFailed(operation: String, code: Int32)
    
    var errorDescription: String? {
        switch self {
        case .notConnected:
            return "Imprimante non connectée"
        case .sessionReservationFailed:
            return "Échec de la réservation de session"
        case .imageConversionFailed:
            return "Échec de la conversion de l'image"
        case .initFailed(let code):
            return "Échec d'initialisation: \(Self.describeSdkError(code))"
        case .setImageFailed(let face, let code):
            return "Échec du chargement de l'image \(face): \(Self.describeSdkError(code))"
        case .printFailed(let code):
            return Self.describePrintError(code)
        case .magneticEncodingFailed(let code):
            return "Échec de l'encodage magnétique: \(Self.describeSdkError(code))"
        case .cardOperationFailed(let operation, let code):
            return "Opération \(operation) échouée: \(Self.describeSdkError(code))"
        }
    }
    
    /// User-friendly print error descriptions
    private static func describePrintError(_ code: Int32) -> String {
        switch code {
        case -1:  // EVOLIS_RC_EUNDEFINED
            return "Erreur inconnue. Redémarrez l'imprimante et réessayez."
        case -2:  // EVOLIS_RC_EINTERNAL
            return "Erreur interne du SDK. Contactez le support technique."
        case -3:  // EVOLIS_RC_EPARAMS
            return "Paramètres d'impression invalides."
        case -4:  // EVOLIS_RC_ETIMEOUT
            return "Délai d'attente dépassé. L'imprimante ne répond pas."
        case -20: // EVOLIS_RC_PRINT_EDATA
            return "Données d'image invalides. Vérifiez le design de la carte."
        case -21: // EVOLIS_RC_PRINT_NEEDACTION
            return "L'imprimante nécessite une intervention. Vérifiez le ruban, le capot et le bac à cartes."
        case -22: // EVOLIS_RC_PRINT_EMECHANICAL
            return "Erreur mécanique. Vérifiez qu'il n'y a pas de carte coincée, que le ruban est correctement installé et que le capot est bien fermé."
        case -23: // EVOLIS_RC_PRINT_ENOIMAGE
            return "Aucune image à imprimer. Assurez-vous qu'un design est chargé."
        case -60: // EVOLIS_RC_PRINTER_ENOCOM
            return "Imprimante hors ligne. Vérifiez la connexion USB."
        case -62: // EVOLIS_RC_PRINTER_EOTHER
            return "L'imprimante est utilisée par un autre logiciel. Fermez les autres applications."
        case -63: // EVOLIS_RC_PRINTER_EBUSY
            return "L'imprimante est occupée (CUPS en cours d'impression)."
        default:
            return "Erreur d'impression (code: \(code))"
        }
    }
    
    /// Generic SDK error description
    private static func describeSdkError(_ code: Int32) -> String {
        switch code {
        case 0:   return "Succès"
        case -1:  return "Erreur indéfinie"
        case -2:  return "Erreur interne"
        case -3:  return "Paramètres invalides"
        case -4:  return "Délai dépassé"
        case -60: return "Imprimante hors ligne"
        case -62: return "Imprimante utilisée par autre logiciel"
        case -63: return "Imprimante occupée"
        default:  return "Code \(code)"
        }
    }
}

// MARK: - NSImage Extension for BMP Export

extension NSImage {
    /// Convert NSImage to Evolis-compatible BMP data
    ///
    /// The Evolis C SDK requires a **bottom-up** 24-bit BMP (height > 0).
    /// macOS `NSBitmapImageRep.representation(using: .bmp)` generates **top-down** BMPs
    /// (height < 0), which causes PRINT_EMECHANICAL (-22) errors.
    ///
    /// This method manually constructs the BMP to match the SDK's expected format:
    /// - BITMAPINFOHEADER (40 bytes), positive height (bottom-up row order)
    /// - 24-bit BGR pixels, no compression
    /// - 300 DPI (11811 pixels/meter)
    /// - Dimensions: 1016×648 (CR-80 card)
    func bmpData() -> Data? {
        let targetWidth = 1016
        let targetHeight = 648
        
        // Create color space
        guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else {
            print("❌ [bmpData] Failed to create color space")
            return nil
        }
        
        // Create CGContext — 32-bit RGBX (CGContext doesn't support 24-bit)
        let bytesPerRowSrc = targetWidth * 4
        guard let cgContext = CGContext(
            data: nil,
            width: targetWidth,
            height: targetHeight,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRowSrc,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
        ) else {
            print("❌ [bmpData] Failed to create CGContext")
            return nil
        }
        
        // Fill with white background (in case image has transparency)
        cgContext.setFillColor(CGColor.white)
        cgContext.fill(CGRect(x: 0, y: 0, width: targetWidth, height: targetHeight))
        
        // Draw NSImage into CGContext
        let nsContext = NSGraphicsContext(cgContext: cgContext, flipped: false)
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = nsContext
        
        let targetRect = NSRect(x: 0, y: 0, width: targetWidth, height: targetHeight)
        self.draw(in: targetRect, from: .zero, operation: .sourceOver, fraction: 1.0)
        
        NSGraphicsContext.restoreGraphicsState()
        
        // Get raw pixel data from CGContext
        guard let pixelData = cgContext.data else {
            print("❌ [bmpData] Failed to get pixel data from CGContext")
            return nil
        }
        
        // --- Manually construct bottom-up 24-bit BMP ---
        
        // BMP row size must be aligned to 4 bytes
        let bytesPerRowBmp = targetWidth * 3  // 1016 * 3 = 3048 (already divisible by 4)
        let pixelDataSize = bytesPerRowBmp * targetHeight
        let headerSize = 14 + 40  // BMP file header + BITMAPINFOHEADER
        let fileSize = headerSize + pixelDataSize
        
        var bmpData = Data(capacity: fileSize)
        
        // -- BMP File Header (14 bytes) --
        bmpData.append(contentsOf: [0x42, 0x4D])                        // "BM" magic
        bmpData.append(contentsOf: withUnsafeBytes(of: UInt32(fileSize).littleEndian) { Array($0) })  // File size
        bmpData.append(contentsOf: [0x00, 0x00])                        // Reserved1
        bmpData.append(contentsOf: [0x00, 0x00])                        // Reserved2
        bmpData.append(contentsOf: withUnsafeBytes(of: UInt32(headerSize).littleEndian) { Array($0) })  // Data offset
        
        // -- BITMAPINFOHEADER (40 bytes) --
        bmpData.append(contentsOf: withUnsafeBytes(of: UInt32(40).littleEndian) { Array($0) })  // Header size
        bmpData.append(contentsOf: withUnsafeBytes(of: Int32(targetWidth).littleEndian) { Array($0) })  // Width
        bmpData.append(contentsOf: withUnsafeBytes(of: Int32(targetHeight).littleEndian) { Array($0) })  // Height (POSITIVE = bottom-up!)
        bmpData.append(contentsOf: withUnsafeBytes(of: UInt16(1).littleEndian) { Array($0) })   // Planes
        bmpData.append(contentsOf: withUnsafeBytes(of: UInt16(24).littleEndian) { Array($0) })  // Bits per pixel
        bmpData.append(contentsOf: withUnsafeBytes(of: UInt32(0).littleEndian) { Array($0) })   // Compression (none)
        bmpData.append(contentsOf: withUnsafeBytes(of: UInt32(pixelDataSize).littleEndian) { Array($0) })  // Image size
        bmpData.append(contentsOf: withUnsafeBytes(of: Int32(11811).littleEndian) { Array($0) })  // X pixels/meter (300 DPI)
        bmpData.append(contentsOf: withUnsafeBytes(of: Int32(11811).littleEndian) { Array($0) })  // Y pixels/meter (300 DPI)
        bmpData.append(contentsOf: withUnsafeBytes(of: UInt32(0).littleEndian) { Array($0) })   // Colors used
        bmpData.append(contentsOf: withUnsafeBytes(of: UInt32(0).littleEndian) { Array($0) })   // Important colors
        
        // -- Pixel data: RGBX (32-bit) → BGR (24-bit), bottom-up row order --
        // CGContext stores rows top-to-bottom. BMP bottom-up means we write
        // the LAST CGContext row first, working upward.
        let srcPtr = pixelData.assumingMemoryBound(to: UInt8.self)
        
        for row in stride(from: targetHeight - 1, through: 0, by: -1) {
            let srcRowOffset = row * bytesPerRowSrc
            for col in 0..<targetWidth {
                let srcPixelOffset = srcRowOffset + col * 4
                let r = srcPtr[srcPixelOffset]      // R
                let g = srcPtr[srcPixelOffset + 1]  // G
                let b = srcPtr[srcPixelOffset + 2]  // B
                // Write BGR (BMP byte order)
                bmpData.append(b)
                bmpData.append(g)
                bmpData.append(r)
            }
        }
        
        print("✅ [bmpData] Created Evolis-compatible BMP: \(bmpData.count) bytes (bottom-up, 24-bit, 300 DPI)")
        return bmpData
    }
}

// MARK: - String Extension for C char arrays

extension String {
    /// Initialize from a C char array tuple (fixed-size arrays become tuples in Swift)
    init<T>(cTuple: T) {
        self = withUnsafeBytes(of: cTuple) { rawPtr in
            let ptr = rawPtr.baseAddress!.assumingMemoryBound(to: CChar.self)
            return String(cString: ptr)
        }
    }
}

