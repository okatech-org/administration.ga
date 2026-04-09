/**
 * NFC/Contactless card encoding via Evolis PC/SC APDU API.
 * Ported from Agent macOS NFCEncodingService.swift.
 */

import type { NfcPayload } from "@workspace/desktop-shared/printer-types"
import {
  evolisSetCardPos,
  evolisPcscList,
  evolisPcscWaitCard,
  evolisPcscConnect,
  evolisPcscSendApdu,
  evolisPcscDisconnect,
  evolisPcscReadAtr,
  EVOLIS_CP_CONTACTLESS,
  type NativePcscEncoder,
} from "../native/evolis-binding"

export class NfcEncodingService {
  /**
   * Full NFC encoding workflow:
   * 1. Discover encoders
   * 2. Position card at contactless station
   * 3. Wait for card presence
   * 4. Connect to NFC chip
   * 5. Read ATR (diagnostics)
   * 6. Send APDU commands
   * 7. Disconnect
   */
  encodeCard(printerHandle: unknown, payload: NfcPayload): void {
    console.log("[NFC] Starting NFC encoding workflow...")

    // 1. Discover encoders
    const encoders = evolisPcscList(printerHandle)
    if (encoders.length === 0) {
      throw new Error("Aucun encodeur NFC/contactless détecté sur l'imprimante.")
    }
    const encoder = encoders[0]
    console.log(`[NFC] Found encoder: ${encoder.name} (UID: ${encoder.uid})`)

    // 2. Position card at contactless station
    console.log("[NFC] Positioning card at contactless station...")
    evolisSetCardPos(printerHandle, EVOLIS_CP_CONTACTLESS)

    // 3. Wait for card presence (10s timeout)
    console.log("[NFC] Waiting for card presence...")
    const waitResult = evolisPcscWaitCard(printerHandle, encoder.uid, 10000)
    if (waitResult !== 0) {
      throw new Error(`Aucune carte NFC détectée (timeout ou erreur: ${waitResult})`)
    }

    // 4. Connect to NFC chip
    console.log("[NFC] Connecting to NFC chip...")
    const connectResult = evolisPcscConnect(printerHandle, encoder.uid)
    if (connectResult !== 0) {
      throw new Error(`Connexion NFC échouée: ${connectResult}`)
    }

    // 5. Read ATR for diagnostics
    const atr = evolisPcscReadAtr(printerHandle, encoder.uid)
    if (atr) {
      console.log(`[NFC] ATR: ${atr.toString("hex").toUpperCase()}`)
    }

    // 6. Send APDU commands
    const commands = this.buildAPDUCommands(payload)
    console.log(`[NFC] Sending ${commands.length} APDU command(s)...`)

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i]
      console.log(`[NFC] APDU #${i + 1}: ${cmd.toString("hex").toUpperCase()}`)

      const { response, rc } = evolisPcscSendApdu(printerHandle, cmd)
      if (rc < 0) {
        throw new Error(`Commande APDU #${i + 1} échouée avec code: ${rc}`)
      }

      console.log(`[NFC] Response #${i + 1}: ${response.toString("hex").toUpperCase()}`)

      // Check status word (last 2 bytes) — 90 00 = success
      if (response.length >= 2) {
        const sw1 = response[response.length - 2]
        const sw2 = response[response.length - 1]
        if (sw1 !== 0x90 || sw2 !== 0x00) {
          console.warn(`[NFC] Non-success status: ${sw1.toString(16).padStart(2, "0")} ${sw2.toString(16).padStart(2, "0")}`)
          // 61 XX = more data, 63 CX = counter warnings — not errors
          if (sw1 !== 0x61 && sw1 !== 0x63) {
            throw new Error(`Commande APDU échouée. Réponse: ${response.toString("hex").toUpperCase()}`)
          }
        }
      }
    }

    // 7. Disconnect
    console.log("[NFC] Disconnecting from NFC chip...")
    evolisPcscDisconnect(printerHandle)

    console.log("[NFC] NFC encoding completed successfully")
  }

  private buildAPDUCommands(payload: NfcPayload): Buffer[] {
    switch (payload.type) {
      case "url":
        return NfcEncodingService.buildNDEFUrlCommands(payload.data)
      case "text":
        return NfcEncodingService.buildNDEFTextCommands(payload.data)
      case "raw":
        return NfcEncodingService.parseRawHex(payload.data)
    }
  }

  // --- NDEF URL Record ---

  static buildNDEFUrlCommands(url: string): Buffer[] {
    const commands: Buffer[] = []

    // Select NDEF application
    commands.push(Buffer.from([
      0x00, 0xA4, 0x04, 0x00, 0x07,
      0xD2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01,
    ]))

    // Select CC file (Capability Container)
    commands.push(Buffer.from([0x00, 0xA4, 0x00, 0x0C, 0x02, 0xE1, 0x03]))

    // Select NDEF file
    commands.push(Buffer.from([0x00, 0xA4, 0x00, 0x0C, 0x02, 0xE1, 0x04]))

    // Build NDEF URL record
    const ndefRecord = NfcEncodingService.buildNDEFUrlRecord(url)

    // Write NDEF message: length (2 bytes) + record
    const writeData = Buffer.alloc(2 + ndefRecord.length)
    writeData.writeUInt8((ndefRecord.length >> 8) & 0xff, 0)
    writeData.writeUInt8(ndefRecord.length & 0xff, 1)
    ndefRecord.copy(writeData, 2)

    // UPDATE BINARY command
    const updateCmd = Buffer.alloc(5 + writeData.length)
    updateCmd.writeUInt8(0x00, 0)
    updateCmd.writeUInt8(0xD6, 1)
    updateCmd.writeUInt8(0x00, 2)
    updateCmd.writeUInt8(0x00, 3)
    updateCmd.writeUInt8(writeData.length, 4)
    writeData.copy(updateCmd, 5)
    commands.push(updateCmd)

    return commands
  }

  private static buildNDEFUrlRecord(url: string): Buffer {
    const prefixes: [string, number][] = [
      ["https://www.", 0x02],
      ["http://www.", 0x01],
      ["https://", 0x04],
      ["http://", 0x03],
    ]

    let prefixCode = 0x00
    let urlSuffix = url

    for (const [prefix, code] of prefixes) {
      if (url.toLowerCase().startsWith(prefix)) {
        prefixCode = code
        urlSuffix = url.substring(prefix.length)
        break
      }
    }

    const suffixBuf = Buffer.from(urlSuffix, "utf-8")
    const payloadData = Buffer.alloc(1 + suffixBuf.length)
    payloadData.writeUInt8(prefixCode, 0)
    suffixBuf.copy(payloadData, 1)

    // NDEF record: MB=1, ME=1, CF=0, SR=1, IL=0, TNF=0x01
    const record = Buffer.alloc(4 + payloadData.length)
    record.writeUInt8(0xD1, 0) // Flags: MB|ME|SR, TNF=Well-Known
    record.writeUInt8(0x01, 1) // Type length
    record.writeUInt8(payloadData.length, 2) // Payload length
    record.writeUInt8(0x55, 3) // Type: "U" (URI)
    payloadData.copy(record, 4)

    return record
  }

  // --- NDEF Text Record ---

  static buildNDEFTextCommands(text: string): Buffer[] {
    const commands: Buffer[] = []

    // Select NDEF application
    commands.push(Buffer.from([
      0x00, 0xA4, 0x04, 0x00, 0x07,
      0xD2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01,
    ]))

    // Select NDEF file
    commands.push(Buffer.from([0x00, 0xA4, 0x00, 0x0C, 0x02, 0xE1, 0x04]))

    // Build NDEF Text record
    const ndefRecord = NfcEncodingService.buildNDEFTextRecord(text)

    // Write NDEF message
    const writeData = Buffer.alloc(2 + ndefRecord.length)
    writeData.writeUInt8((ndefRecord.length >> 8) & 0xff, 0)
    writeData.writeUInt8(ndefRecord.length & 0xff, 1)
    ndefRecord.copy(writeData, 2)

    const updateCmd = Buffer.alloc(5 + writeData.length)
    updateCmd.writeUInt8(0x00, 0)
    updateCmd.writeUInt8(0xD6, 1)
    updateCmd.writeUInt8(0x00, 2)
    updateCmd.writeUInt8(0x00, 3)
    updateCmd.writeUInt8(writeData.length, 4)
    writeData.copy(updateCmd, 5)
    commands.push(updateCmd)

    return commands
  }

  private static buildNDEFTextRecord(text: string): Buffer {
    const langCode = Buffer.from("en", "utf-8")
    const textData = Buffer.from(text, "utf-8")

    // Payload: status byte (lang code length) + lang code + text
    const payload = Buffer.alloc(1 + langCode.length + textData.length)
    payload.writeUInt8(langCode.length, 0)
    langCode.copy(payload, 1)
    textData.copy(payload, 1 + langCode.length)

    // NDEF record: MB=1, ME=1, SR=1, TNF=Well-Known
    const record = Buffer.alloc(4 + payload.length)
    record.writeUInt8(0xD1, 0) // Flags
    record.writeUInt8(0x01, 1) // Type length
    record.writeUInt8(payload.length, 2) // Payload length
    record.writeUInt8(0x54, 3) // Type: "T" (Text)
    payload.copy(record, 4)

    return record
  }

  // --- Raw APDU ---

  private static parseRawHex(hexString: string): Buffer[] {
    const cleaned = hexString.replace(/\s+/g, "")
    if (cleaned.length === 0 || cleaned.length % 2 !== 0) return []
    return [Buffer.from(cleaned, "hex")]
  }
}
