/**
 * Off-screen Card Renderer — renders a stored CardDesign to BMP buffers.
 *
 * Uses a hidden Konva Stage to render each element (text, image, QR, shapes)
 * then converts the canvas to BMP format for Evolis printing.
 */

import Konva from "konva"
import QRCode from "qrcode"
import { CARD_WIDTH, CARD_HEIGHT, type CardDesign, type CardElement } from "./card-types"
import { resolveFieldValue, type CitizenProfileData } from "./dynamic-fields"
import { canvasToBmp } from "./bmp-encoder"

// ─── Public API ──────────────────────────────────────────────────

export interface RenderResult {
  front: ArrayBuffer
  back?: ArrayBuffer
}

/**
 * Render a card design to BMP buffers.
 */
export async function renderDesignToBmp(
  design: CardDesign,
  fieldValues?: Record<string, string>,
  profileData?: CitizenProfileData | null,
): Promise<RenderResult> {
  const profile: CitizenProfileData = profileData ?? {
    firstName: fieldValues?.firstName,
    lastName: fieldValues?.lastName,
    dateOfBirth: fieldValues?.dateOfBirth,
    placeOfBirth: fieldValues?.placeOfBirth,
    nationality: fieldValues?.nationality,
    sex: fieldValues?.sex,
    nip: fieldValues?.nip,
    photoUrl: fieldValues?.photoUrl,
    cardNumber: fieldValues?.cardNumber,
    cardIssuedAt: fieldValues?.cardIssuedAt,
    cardExpiresAt: fieldValues?.cardExpiresAt,
    consulateName: fieldValues?.consulateName,
    consulateCity: fieldValues?.consulateCity,
    consulateCountry: fieldValues?.consulateCountry,
  }

  console.log("[CardRenderer] Rendering design:", design.name)
  console.log("[CardRenderer] Profile:", JSON.stringify(profile))
  console.log("[CardRenderer] Front elements:", design.frontElements.length)

  const frontBuffer = await renderFace(design.frontElements, design.backgroundColor, profile)

  let backBuffer: ArrayBuffer | undefined
  if (design.printDuplex && design.backElements.length > 0) {
    backBuffer = await renderFace(design.backElements, design.backgroundColor, profile)
  }

  return { front: frontBuffer, back: backBuffer }
}

// ─── Render a single face ────────────────────────────────────────

async function renderFace(
  elements: CardElement[],
  backgroundColor: string,
  profile: CitizenProfileData,
): Promise<ArrayBuffer> {
  const container = document.createElement("div")
  container.style.position = "absolute"
  container.style.left = "-9999px"
  container.style.top = "-9999px"
  container.style.width = `${CARD_WIDTH}px`
  container.style.height = `${CARD_HEIGHT}px`
  document.body.appendChild(container)

  try {
    const stage = new Konva.Stage({
      container,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    })

    const layer = new Konva.Layer()
    stage.add(layer)

    // White background (Evolis prints transparent as white)
    layer.add(new Konva.Rect({
      x: 0, y: 0,
      width: CARD_WIDTH, height: CARD_HEIGHT,
      fill: backgroundColor || "#ffffff",
    }))

    // Render each element (sorted by zIndex)
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex)
    for (const el of sorted) {
      if (!el.isVisible) continue
      try {
        await renderElement(layer, el, profile)
      } catch (err) {
        console.error(`[CardRenderer] Failed to render element ${el.id} (${el.type}):`, err)
      }
    }

    layer.draw()

    const canvas = stage.toCanvas({ pixelRatio: 1 })
    const bmp = canvasToBmp(canvas as unknown as HTMLCanvasElement)

    stage.destroy()

    return bmp.buffer as ArrayBuffer
  } finally {
    document.body.removeChild(container)
  }
}

// ─── Render individual element ───────────────────────────────────

async function renderElement(
  layer: Konva.Layer,
  el: CardElement,
  profile: CitizenProfileData,
): Promise<void> {
  const commonConfig = {
    x: el.x,
    y: el.y,
    rotation: el.rotation,
  }

  switch (el.type) {
    case "text": {
      const displayText = el.isDynamicField
        ? resolveFieldValue(el.fieldKey, profile)
        : el.textContent

      console.log(`[CardRenderer] TEXT "${el.fieldKey || 'static'}" = "${displayText}" @ (${el.x},${el.y}) w=${el.width} fs=${el.fontSize}`)

      const text = new Konva.Text({
        ...commonConfig,
        text: displayText,
        width: el.width,
        // Don't set height — let text flow naturally without clipping
        fontSize: el.fontSize,
        fontFamily: el.fontName || "Arial",
        fontStyle: `${el.isBold ? "bold" : ""} ${el.isItalic ? "italic" : ""}`.trim() || "normal",
        fill: el.textColor || "#000000",
        align: el.textAlignment || "left",
        wrap: "none",
      })
      layer.add(text)
      break
    }

    case "image": {
      let imageSrc = el.imageData
      if (el.isDynamicField) {
        const resolved = resolveFieldValue(el.fieldKey, profile)
        if (resolved && resolved !== "") imageSrc = resolved
      }

      console.log(`[CardRenderer] IMAGE "${el.fieldKey || 'static'}" src=${imageSrc ? (imageSrc.length > 80 ? imageSrc.substring(0, 80) + "..." : imageSrc) : "null"} @ (${el.x},${el.y}) ${el.width}×${el.height}`)

      if (imageSrc) {
        try {
          const img = await loadImageFromUrl(imageSrc)
          layer.add(new Konva.Image({
            ...commonConfig,
            image: img,
            width: el.width,
            height: el.height,
            cornerRadius: el.cornerRadius,
          }))
          console.log(`[CardRenderer] IMAGE loaded OK: ${img.width}×${img.height}`)
        } catch (err) {
          console.error(`[CardRenderer] IMAGE FAILED to load:`, err)
          renderPlaceholder(layer, el, commonConfig)
        }
      } else {
        console.log(`[CardRenderer] IMAGE no source, rendering placeholder`)
        renderPlaceholder(layer, el, commonConfig)
      }
      break
    }

    case "qrCode": {
      const content = el.isDynamicField
        ? resolveFieldValue(el.fieldKey, profile)
        : el.codeContent

      console.log(`[CardRenderer] QR "${el.fieldKey || 'static'}" = "${content}" @ (${el.x},${el.y}) ${el.width}×${el.height}`)

      if (content) {
        try {
          const qrDataUrl = await QRCode.toDataURL(content, {
            width: Math.max(el.width, 200), // Generate at high res
            margin: 0,
            color: { dark: "#000000", light: "#ffffff" },
          })
          const img = await loadImageFromDataUrl(qrDataUrl)
          layer.add(new Konva.Image({
            ...commonConfig,
            image: img,
            width: el.width,
            height: el.height,
          }))
        } catch (err) {
          console.error(`[CardRenderer] QR FAILED:`, err)
          renderPlaceholder(layer, el, commonConfig)
        }
      }
      break
    }

    case "rectangle": {
      layer.add(new Konva.Rect({
        ...commonConfig,
        width: el.width,
        height: el.height,
        fill: el.fillColor,
        stroke: el.strokeColor,
        strokeWidth: el.strokeWidth,
        cornerRadius: el.cornerRadius,
      }))
      break
    }

    case "circle": {
      layer.add(new Konva.Circle({
        x: el.x + el.width / 2,
        y: el.y + el.height / 2,
        rotation: el.rotation,
        radius: el.width / 2,
        fill: el.fillColor,
        stroke: el.strokeColor,
        strokeWidth: el.strokeWidth,
      }))
      break
    }

    case "line": {
      layer.add(new Konva.Line({
        ...commonConfig,
        points: [0, 0, el.width, 0],
        stroke: el.strokeColor,
        strokeWidth: el.strokeWidth || 2,
      }))
      break
    }

    case "barcode": {
      const barcodeText = el.isDynamicField
        ? resolveFieldValue(el.fieldKey, profile)
        : el.codeContent

      layer.add(new Konva.Text({
        ...commonConfig,
        text: barcodeText,
        width: el.width,
        fontSize: 14,
        fontFamily: "Courier New",
        fill: "#000000",
        align: "center",
        verticalAlign: "middle",
      }))
      break
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function renderPlaceholder(
  layer: Konva.Layer,
  el: CardElement,
  config: { x: number; y: number; rotation: number },
): void {
  layer.add(new Konva.Rect({
    ...config,
    width: el.width,
    height: el.height,
    fill: el.fillColor || "#e5e7eb",
    stroke: el.strokeColor || "#d1d5db",
    strokeWidth: el.strokeWidth || 1,
    cornerRadius: el.cornerRadius,
  }))
}

/**
 * Load image from URL — handles both HTTP URLs and data URLs.
 * For HTTP URLs (like Convex storage), fetch as blob first to avoid CORS issues.
 */
async function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  // Data URLs can be loaded directly
  if (src.startsWith("data:")) {
    return loadImageFromDataUrl(src)
  }

  // HTTP URLs: fetch as blob first (avoids CORS issues in Electron)
  console.log(`[CardRenderer] Fetching image from URL: ${src.substring(0, 80)}...`)
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching image`)
  }
  const blob = await response.blob()
  const dataUrl = await blobToDataUrl(blob)
  return loadImageFromDataUrl(dataUrl)
}

function loadImageFromDataUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error(`Image load error: ${e}`))
    img.src = src
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
