/**
 * Off-screen Card Renderer — renders a stored CardDesign to BMP buffers.
 *
 * Uses a hidden Konva Stage to render each element (text, image, QR, shapes)
 * then converts the canvas to BMP format for Evolis printing.
 *
 * This replicates what DesignerCanvas does visually, but without React components.
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
 *
 * @param design - The full card design (with elements, backgrounds, etc.)
 * @param fieldValues - Key-value map of dynamic fields (from print job)
 * @param profileData - Optional citizen profile for resolving fields
 * @returns { front: ArrayBuffer, back?: ArrayBuffer } — BMP buffers ready for printing
 */
export async function renderDesignToBmp(
  design: CardDesign,
  fieldValues?: Record<string, string>,
  profileData?: CitizenProfileData | null,
): Promise<RenderResult> {
  // Build a profile from fieldValues for resolveFieldValue()
  const profile: CitizenProfileData = profileData ?? {
    firstName: fieldValues?.firstName,
    lastName: fieldValues?.lastName,
    cardNumber: fieldValues?.cardNumber,
    nip: fieldValues?.nip,
    cardIssuedAt: fieldValues?.cardIssuedAt,
    cardExpiresAt: fieldValues?.cardExpiresAt,
    consulateName: fieldValues?.consulateName,
    consulateCity: fieldValues?.consulateCity,
    consulateCountry: fieldValues?.consulateCountry,
  }

  // Render front
  const frontBuffer = await renderFace(design.frontElements, design.backgroundColor, profile)

  // Render back (if duplex)
  let backBuffer: ArrayBuffer | undefined
  if (design.printDuplex && design.backElements.length > 0) {
    backBuffer = await renderFace(design.backElements, design.backgroundColor, profile)
  }

  return { front: frontBuffer, back: backBuffer }
}

// ─── Internal ────────────────────────────────────────────────────

async function renderFace(
  elements: CardElement[],
  backgroundColor: string,
  profile: CitizenProfileData,
): Promise<ArrayBuffer> {
  // Create a hidden container
  const container = document.createElement("div")
  container.style.position = "absolute"
  container.style.left = "-9999px"
  container.style.top = "-9999px"
  container.style.width = `${CARD_WIDTH}px`
  container.style.height = `${CARD_HEIGHT}px`
  document.body.appendChild(container)

  try {
    // Create Konva Stage
    const stage = new Konva.Stage({
      container,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    })

    const layer = new Konva.Layer()
    stage.add(layer)

    // Background
    const bg = new Konva.Rect({
      x: 0,
      y: 0,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fill: backgroundColor || "#ffffff",
    })
    layer.add(bg)

    // Render each element
    for (const el of elements) {
      if (!el.isVisible) continue
      await renderElement(layer, el, profile)
    }

    layer.draw()

    // Export to canvas then BMP
    const canvas = stage.toCanvas({ pixelRatio: 1 })
    const bmp = canvasToBmp(canvas as unknown as HTMLCanvasElement)

    // Cleanup
    stage.destroy()

    return bmp.buffer as ArrayBuffer
  } finally {
    document.body.removeChild(container)
  }
}

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

      const text = new Konva.Text({
        ...commonConfig,
        text: displayText,
        width: el.width,
        fontSize: el.fontSize,
        fontFamily: el.fontName,
        fontStyle: `${el.isBold ? "bold" : "normal"} ${el.isItalic ? "italic" : ""}`,
        fill: el.textColor,
        align: el.textAlignment,
      })
      layer.add(text)
      break
    }

    case "image": {
      // For dynamic photo fields, try to load from profile
      let imageSrc = el.imageData
      if (el.isDynamicField && el.fieldKey === "citizen.photo") {
        const resolved = resolveFieldValue(el.fieldKey, profile)
        if (resolved) imageSrc = resolved
      }

      if (imageSrc) {
        try {
          const img = await loadImage(imageSrc)
          const kImage = new Konva.Image({
            ...commonConfig,
            image: img,
            width: el.width,
            height: el.height,
            cornerRadius: el.cornerRadius,
          })
          layer.add(kImage)
        } catch {
          // Image failed to load — render placeholder
          renderPlaceholderRect(layer, el, commonConfig)
        }
      } else {
        renderPlaceholderRect(layer, el, commonConfig)
      }
      break
    }

    case "qrCode": {
      const content = el.isDynamicField
        ? resolveFieldValue(el.fieldKey, profile)
        : el.codeContent

      if (content) {
        try {
          const qrDataUrl = await QRCode.toDataURL(content, {
            width: el.width,
            margin: 0,
            color: { dark: "#000000", light: el.fillColor || "#ffffff" },
          })
          const img = await loadImage(qrDataUrl)
          const kImage = new Konva.Image({
            ...commonConfig,
            image: img,
            width: el.width,
            height: el.height,
          })
          layer.add(kImage)
        } catch {
          renderPlaceholderRect(layer, el, commonConfig)
        }
      }
      break
    }

    case "rectangle": {
      const rect = new Konva.Rect({
        ...commonConfig,
        width: el.width,
        height: el.height,
        fill: el.fillColor,
        stroke: el.strokeColor,
        strokeWidth: el.strokeWidth,
        cornerRadius: el.cornerRadius,
      })
      layer.add(rect)
      break
    }

    case "circle": {
      const circle = new Konva.Circle({
        x: el.x + el.width / 2,
        y: el.y + el.height / 2,
        rotation: el.rotation,
        radius: el.width / 2,
        fill: el.fillColor,
        stroke: el.strokeColor,
        strokeWidth: el.strokeWidth,
      })
      layer.add(circle)
      break
    }

    case "line": {
      const line = new Konva.Line({
        ...commonConfig,
        points: [0, 0, el.width, 0],
        stroke: el.strokeColor,
        strokeWidth: el.strokeWidth || 2,
      })
      layer.add(line)
      break
    }

    case "barcode": {
      // Simple placeholder for barcode — text representation
      const barcodeText = el.isDynamicField
        ? resolveFieldValue(el.fieldKey, profile)
        : el.codeContent

      const text = new Konva.Text({
        ...commonConfig,
        text: barcodeText,
        width: el.width,
        height: el.height,
        fontSize: 14,
        fontFamily: "Courier New",
        fill: "#000000",
        align: "center",
        verticalAlign: "middle",
      })
      layer.add(text)
      break
    }
  }
}

function renderPlaceholderRect(
  layer: Konva.Layer,
  el: CardElement,
  config: { x: number; y: number; rotation: number },
): void {
  const rect = new Konva.Rect({
    ...config,
    width: el.width,
    height: el.height,
    fill: el.fillColor || "#e5e7eb",
    stroke: el.strokeColor || "#d1d5db",
    strokeWidth: el.strokeWidth || 1,
    cornerRadius: el.cornerRadius,
  })
  layer.add(rect)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image`))
    img.src = src
  })
}
