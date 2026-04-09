//
//  NFCEncodingService.swift
//  AgentMacOS
//
//  NFC/Contactless card encoding via Evolis PC/SC APDU API
//

import Foundation

// MARK: - NFC Data Types

/// Represents a PC/SC encoder discovered on the printer
struct PCScEncoder: Identifiable {
    let id: UInt16
    let name: String
}

/// NFC payload type for encoding
enum NFCPayloadType: String, CaseIterable, Identifiable {
    case url  = "url"
    case text = "text"
    case raw  = "raw"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .url:  return "URL (Web Link)"
        case .text: return "Text"
        case .raw:  return "Raw APDU"
        }
    }
}

/// NFC payload to write to a card
struct NFCPayload {
    let type: NFCPayloadType
    let data: String          // URL, text, or hex-encoded raw APDU
    
    /// Convert the payload to NDEF APDU commands
    func toAPDUCommands() -> [Data] {
        switch type {
        case .url:
            return NFCEncodingService.buildNDEFUrlCommands(url: data)
        case .text:
            return NFCEncodingService.buildNDEFTextCommands(text: data)
        case .raw:
            // Parse hex string to raw APDU data
            if let rawData = Data(hexString: data) {
                return [rawData]
            }
            return []
        }
    }
}

// MARK: - NFC Encoding Errors

enum NFCError: LocalizedError {
    case noEncoders
    case cardNotPresent
    case connectionFailed
    case apduFailed(response: Data)
    case encodingFailed(String)
    case timeout
    
    var errorDescription: String? {
        switch self {
        case .noEncoders:
            return "Aucun encodeur NFC/contactless détecté sur l'imprimante."
        case .cardNotPresent:
            return "Aucune carte NFC détectée au niveau de l'encodeur."
        case .connectionFailed:
            return "Impossible de se connecter à la puce NFC de la carte."
        case .apduFailed(let response):
            return "Commande APDU échouée. Réponse: \(response.hexString)"
        case .encodingFailed(let detail):
            return "Encodage NFC échoué: \(detail)"
        case .timeout:
            return "Délai d'attente dépassé pour la détection de la carte NFC."
        }
    }
}

// MARK: - NFC Encoding Service

/// Service for NFC/Contactless card encoding via Evolis PC/SC API
class NFCEncodingService {
    
    static let shared = NFCEncodingService()
    private init() {}
    
    // MARK: - Encoder Discovery
    
    /// List all available PC/SC encoders on the printer
    func listEncoders(printer handle: UnsafeMutableRawPointer) -> [PCScEncoder] {
        // evolis_pcsc_encoder_t contains a tuple (name) so it has no default init.
        // Must allocate memory manually.
        let maxEncoders = 8
        let encodersPtr = UnsafeMutablePointer<evolis_pcsc_encoder_t>.allocate(capacity: maxEncoders)
        defer { encodersPtr.deallocate() }
        
        let count = evolis_pcsc_list(handle, encodersPtr, maxEncoders)
        
        guard count > 0 else { return [] }
        
        return (0..<Int(count)).map { i in
            PCScEncoder(
                id: encodersPtr[i].uid,
                name: String(cTuple: encodersPtr[i].name)
            )
        }
    }
    
    // MARK: - Full Encoding Workflow
    
    /// Perform complete NFC encoding workflow:
    /// 1. Position card at contactless station
    /// 2. Wait for card presence
    /// 3. Connect to NFC chip
    /// 4. Send APDU commands
    /// 5. Disconnect
    func encodeCard(
        printer handle: UnsafeMutableRawPointer,
        payload: NFCPayload
    ) throws {
        print("📡 [NFC] Starting NFC encoding workflow...")
        
        // 1. Discover encoders
        let encoders = listEncoders(printer: handle)
        guard let encoder = encoders.first else {
            print("❌ [NFC] No PC/SC encoders found")
            throw NFCError.noEncoders
        }
        print("📡 [NFC] Found encoder: \(encoder.name) (UID: \(encoder.id))")
        
        // 2. Position card at contactless station
        print("📡 [NFC] Positioning card at contactless station...")
        evolis_set_card_pos(handle, EVOLIS_CP_CONTACTLESS)
        
        // 3. Wait for card presence (10 second timeout)
        print("📡 [NFC] Waiting for card presence...")
        let waitResult = evolis_pcsc_wait_card_presentt(handle, encoder.id, 10000)
        guard waitResult == EVOLIS_RC_OK.rawValue else {
            print("❌ [NFC] Card not detected (timeout or error: \(waitResult))")
            throw NFCError.cardNotPresent
        }
        
        // 4. Connect to the NFC chip
        print("📡 [NFC] Connecting to NFC chip...")
        let connectResult = evolis_pcsc_connect(handle, encoder.id, EVOLIS_PCSC_PCL_ANY)
        guard connectResult == EVOLIS_RC_OK.rawValue else {
            print("❌ [NFC] Connection failed: \(connectResult)")
            throw NFCError.connectionFailed
        }
        
        // 5. Read ATR (Answer To Reset) for diagnostics
        // 5. Read ATR (Answer To Reset) for diagnostics
        // evolis_pcsc_atr_t is char[33], imported as a tuple. Use Data to handle memory.
        var atrData = Data(count: 33) // EVOLIS_PCSC_ATR_MAX_SIZE
        atrData.withUnsafeMutableBytes { atrRawPtr in
            if let atrPtr = atrRawPtr.bindMemory(to: evolis_pcsc_atr_t.self).baseAddress {
                if evolis_pcsc_read_atr(handle, encoder.id, atrPtr) == EVOLIS_RC_OK.rawValue {
                    print("📡 [NFC] ATR read successfully")
                }
            }
        }
        
        // 6. Send APDU commands
        let commands = payload.toAPDUCommands()
        print("📡 [NFC] Sending \(commands.count) APDU command(s)...")
        
        for (index, command) in commands.enumerated() {
            print("📡 [NFC] APDU #\(index + 1): \(command.hexString)")
            let response = try sendAPDU(printer: handle, encoderUID: encoder.id, command: command)
            print("📡 [NFC] Response #\(index + 1): \(response.hexString)")
            
            // Check status word (last 2 bytes) — 90 00 = success
            if response.count >= 2 {
                let sw1 = response[response.count - 2]
                let sw2 = response[response.count - 1]
                if sw1 != 0x90 || sw2 != 0x00 {
                    print("⚠️ [NFC] Non-success status: \(String(format: "%02X %02X", sw1, sw2))")
                    // 61 XX = more data available, 63 CX = counter warnings — not errors
                    if sw1 != 0x61 && sw1 != 0x63 {
                        throw NFCError.apduFailed(response: response)
                    }
                }
            }
        }
        
        // 7. Disconnect
        print("📡 [NFC] Disconnecting from NFC chip...")
        evolis_pcsc_disconnect(handle, EVOLIS_PCSC_DSP_RESET)
        
        print("✅ [NFC] NFC encoding completed successfully")
    }
    
    // MARK: - Low-Level APDU
    
    /// Send a single APDU command and return the response
    func sendAPDU(
        printer handle: UnsafeMutableRawPointer,
        encoderUID: UInt16,
        command: Data
    ) throws -> Data {
        // Convert command to mutable [CChar] (Int8), matching evobuf* type (char*)
        var cmdBuffer = command.map { CChar(bitPattern: $0) }
        var respBuffer = [CChar](repeating: 0, count: 256)
        
        let responseLength = evolis_pcsc_send_apdu(
            handle,
            &cmdBuffer,
            cmdBuffer.count,
            &respBuffer,
            respBuffer.count
        )
        
        if responseLength < 0 {
            throw NFCError.encodingFailed("APDU send failed with code: \(responseLength)")
        }
        
        // Convert [CChar] response back to Data (UInt8)
        let respData = respBuffer.prefix(Int(responseLength)).map { UInt8(bitPattern: $0) }
        return Data(respData)
    }
    
    // MARK: - NDEF Builders
    
    /// Build APDU commands to write a URL as NDEF record
    static func buildNDEFUrlCommands(url: String) -> [Data] {
        var commands: [Data] = []
        
        // Select NDEF application
        commands.append(Data([
            0x00, 0xA4, 0x04, 0x00, 0x07,
            0xD2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01
        ]))
        
        // Select CC file (Capability Container)
        commands.append(Data([0x00, 0xA4, 0x00, 0x0C, 0x02, 0xE1, 0x03]))
        
        // Select NDEF file
        commands.append(Data([0x00, 0xA4, 0x00, 0x0C, 0x02, 0xE1, 0x04]))
        
        // Build NDEF URL record
        let ndefRecord = buildNDEFUrlRecord(url: url)
        
        // Write NDEF message length (2 bytes) + record
        var writeData = Data([
            UInt8((ndefRecord.count >> 8) & 0xFF),
            UInt8(ndefRecord.count & 0xFF)
        ])
        writeData.append(ndefRecord)
        
        // UPDATE BINARY command
        var updateCmd = Data([0x00, 0xD6, 0x00, 0x00, UInt8(writeData.count)])
        updateCmd.append(writeData)
        commands.append(updateCmd)
        
        return commands
    }
    
    /// Build APDU commands to write text as NDEF record
    static func buildNDEFTextCommands(text: String) -> [Data] {
        var commands: [Data] = []
        
        // Select NDEF application
        commands.append(Data([
            0x00, 0xA4, 0x04, 0x00, 0x07,
            0xD2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01
        ]))
        
        // Select NDEF file
        commands.append(Data([0x00, 0xA4, 0x00, 0x0C, 0x02, 0xE1, 0x04]))
        
        // Build NDEF Text record
        let ndefRecord = buildNDEFTextRecord(text: text)
        
        // Write NDEF message length + record
        var writeData = Data([
            UInt8((ndefRecord.count >> 8) & 0xFF),
            UInt8(ndefRecord.count & 0xFF)
        ])
        writeData.append(ndefRecord)
        
        var updateCmd = Data([0x00, 0xD6, 0x00, 0x00, UInt8(writeData.count)])
        updateCmd.append(writeData)
        commands.append(updateCmd)
        
        return commands
    }
    
    // MARK: - NDEF Record Builders
    
    /// Build an NDEF URL record (TNF=0x01, Type="U")
    private static func buildNDEFUrlRecord(url: String) -> Data {
        // URL prefix codes (NFC Forum)
        let prefixes: [(String, UInt8)] = [
            ("https://www.", 0x02),
            ("http://www.",  0x01),
            ("https://",    0x04),
            ("http://",     0x03),
        ]
        
        var prefixCode: UInt8 = 0x00 // No prefix
        var urlSuffix = url
        
        for (prefix, code) in prefixes {
            if url.lowercased().hasPrefix(prefix) {
                prefixCode = code
                urlSuffix = String(url.dropFirst(prefix.count))
                break
            }
        }
        
        let payloadData = Data([prefixCode]) + Data(urlSuffix.utf8)
        
        // NDEF record: MB=1, ME=1, CF=0, SR=1, IL=0, TNF=0x01
        var record = Data()
        record.append(0xD1) // Flags: MB|ME|SR, TNF=Well-Known
        record.append(0x01) // Type length
        record.append(UInt8(payloadData.count)) // Payload length
        record.append(0x55) // Type: "U" (URI)
        record.append(payloadData)
        
        return record
    }
    
    /// Build an NDEF Text record (TNF=0x01, Type="T")
    private static func buildNDEFTextRecord(text: String) -> Data {
        let langCode = Data("en".utf8) // Language code
        let textData = Data(text.utf8)
        
        // Payload: status byte (lang code length) + lang code + text
        var payload = Data()
        payload.append(UInt8(langCode.count)) // Status byte: UTF-8, lang code length
        payload.append(langCode)
        payload.append(textData)
        
        // NDEF record: MB=1, ME=1, SR=1, TNF=Well-Known
        var record = Data()
        record.append(0xD1) // Flags
        record.append(0x01) // Type length
        record.append(UInt8(payload.count)) // Payload length
        record.append(0x54) // Type: "T" (Text)
        record.append(payload)
        
        return record
    }
}

// MARK: - Data Extensions

extension Data {
    /// Convert Data to hex string
    var hexString: String {
        map { String(format: "%02X", $0) }.joined(separator: " ")
    }
    
    /// Initialize from hex string (e.g. "00A40400")
    init?(hexString: String) {
        let cleaned = hexString.replacingOccurrences(of: " ", with: "")
        guard cleaned.count % 2 == 0 else { return nil }
        
        var data = Data(capacity: cleaned.count / 2)
        var index = cleaned.startIndex
        
        while index < cleaned.endIndex {
            let nextIndex = cleaned.index(index, offsetBy: 2)
            guard let byte = UInt8(cleaned[index..<nextIndex], radix: 16) else { return nil }
            data.append(byte)
            index = nextIndex
        }
        
        self = data
    }
}
