/**
 * Canvas to BMP encoder — 24-bit uncompressed Windows BMP.
 * No external dependencies. The Evolis SDK expects this exact format.
 *
 * BMP format:
 * - 14-byte file header
 * - 40-byte BITMAPINFOHEADER
 * - Pixel data: rows bottom-to-top, BGR byte order, each row padded to 4-byte alignment
 */

export function canvasToBmp(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext("2d")!
  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const pixels = imageData.data // RGBA

  const rowSize = Math.ceil((width * 3) / 4) * 4 // row bytes padded to 4
  const pixelDataSize = rowSize * height
  const fileSize = 54 + pixelDataSize // 14 + 40 + pixels

  const buf = new ArrayBuffer(fileSize)
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)

  // -- File Header (14 bytes) --
  bytes[0] = 0x42 // 'B'
  bytes[1] = 0x4d // 'M'
  view.setUint32(2, fileSize, true)
  view.setUint32(6, 0, true) // reserved
  view.setUint32(10, 54, true) // pixel data offset

  // -- BITMAPINFOHEADER (40 bytes) --
  view.setUint32(14, 40, true) // header size
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true) // planes
  view.setUint16(28, 24, true) // bits per pixel
  view.setUint32(30, 0, true) // no compression
  view.setUint32(34, pixelDataSize, true)
  view.setInt32(38, 11811, true) // 300 DPI horizontal (pixels/meter)
  view.setInt32(42, 11811, true) // 300 DPI vertical
  view.setUint32(46, 0, true) // colors used
  view.setUint32(50, 0, true) // important colors

  // -- Pixel Data (bottom-to-top, BGR) --
  for (let y = 0; y < height; y++) {
    const srcRow = height - 1 - y // flip vertically
    const dstOffset = 54 + y * rowSize
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcRow * width + x) * 4
      const dstIdx = dstOffset + x * 3
      bytes[dstIdx] = pixels[srcIdx + 2]     // B
      bytes[dstIdx + 1] = pixels[srcIdx + 1] // G
      bytes[dstIdx + 2] = pixels[srcIdx]     // R
    }
    // Padding bytes are already 0 (ArrayBuffer is zero-initialized)
  }

  return new Uint8Array(buf)
}
