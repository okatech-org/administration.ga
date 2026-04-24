/**
 * Card Designer Types — mirrors convex/schemas/cardDesigns.ts
 */

export const CARD_WIDTH = 1016
export const CARD_HEIGHT = 648

export type ElementType = "text" | "image" | "qrCode" | "barcode" | "rectangle" | "circle" | "line"
export type TextAlignment = "left" | "center" | "right"
/** Masque de détourage appliqué au rendu d'une image (aperçu ET impression). */
export type ImageMask = "none" | "circle"

export interface CardElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  isLocked: boolean
  isVisible: boolean
  zIndex: number
  // Text
  textContent: string
  fontName: string
  fontSize: number
  textColor: string
  textAlignment: TextAlignment
  isBold: boolean
  isItalic: boolean
  // Dynamic field
  isDynamicField: boolean
  fieldKey: string
  // Image
  imageData: string | null
  /** Masque de détourage de l'image. Optionnel — undefined ≡ "none" pour rétro-compat. */
  mask?: ImageMask
  // Shape
  fillColor: string
  strokeColor: string
  strokeWidth: number
  cornerRadius: number
  // QR / Barcode
  codeContent: string
}

export interface CardDesign {
  name: string
  description?: string
  entityId?: string // Print entity (e.g., "carte-consulaire") — determines available dynamic fields
  backgroundColor: string
  frontBackgroundImage: string | null
  backBackgroundImage: string | null
  backgroundOpacity: number
  frontElements: CardElement[]
  backElements: CardElement[]
  printDuplex: boolean
  magneticTracks: string[]
  version: number
}

export type ActiveFace = "front" | "back"

let _counter = 0

const DEFAULTS: Record<ElementType, Partial<CardElement>> = {
  text: {
    width: 200,
    height: 30,
    textContent: "Texte",
    fontName: "Inter",
    fontSize: 18,
    textColor: "#000000",
    textAlignment: "left",
    isBold: false,
    isItalic: false,
    fillColor: "transparent",
    strokeColor: "transparent",
    strokeWidth: 0,
    cornerRadius: 0,
    imageData: null,
    codeContent: "",
    isDynamicField: false,
    fieldKey: "",
  },
  image: {
    width: 150,
    height: 150,
    textContent: "",
    fontName: "Inter",
    fontSize: 14,
    textColor: "#000000",
    textAlignment: "left",
    isBold: false,
    isItalic: false,
    fillColor: "#e5e7eb",
    strokeColor: "#d1d5db",
    strokeWidth: 1,
    cornerRadius: 0,
    imageData: null,
    mask: "none",
    codeContent: "",
    isDynamicField: false,
    fieldKey: "",
  },
  qrCode: {
    width: 100,
    height: 100,
    textContent: "",
    fontName: "Inter",
    fontSize: 14,
    textColor: "#000000",
    textAlignment: "left",
    isBold: false,
    isItalic: false,
    fillColor: "#ffffff",
    strokeColor: "#000000",
    strokeWidth: 0,
    cornerRadius: 0,
    imageData: null,
    codeContent: "https://consulat.ga/verify",
    isDynamicField: false,
    fieldKey: "",
  },
  barcode: {
    width: 200,
    height: 60,
    textContent: "",
    fontName: "Inter",
    fontSize: 14,
    textColor: "#000000",
    textAlignment: "left",
    isBold: false,
    isItalic: false,
    fillColor: "#ffffff",
    strokeColor: "#000000",
    strokeWidth: 0,
    cornerRadius: 0,
    imageData: null,
    codeContent: "0000000000",
    isDynamicField: false,
    fieldKey: "",
  },
  rectangle: {
    width: 150,
    height: 80,
    textContent: "",
    fontName: "Inter",
    fontSize: 14,
    textColor: "#000000",
    textAlignment: "left",
    isBold: false,
    isItalic: false,
    fillColor: "#009639",
    strokeColor: "#000000",
    strokeWidth: 1,
    cornerRadius: 0,
    imageData: null,
    codeContent: "",
    isDynamicField: false,
    fieldKey: "",
  },
  circle: {
    width: 80,
    height: 80,
    textContent: "",
    fontName: "Inter",
    fontSize: 14,
    textColor: "#000000",
    textAlignment: "left",
    isBold: false,
    isItalic: false,
    fillColor: "#FCD116",
    strokeColor: "#000000",
    strokeWidth: 1,
    cornerRadius: 0,
    imageData: null,
    codeContent: "",
    isDynamicField: false,
    fieldKey: "",
  },
  line: {
    width: 200,
    height: 2,
    textContent: "",
    fontName: "Inter",
    fontSize: 14,
    textColor: "#000000",
    textAlignment: "left",
    isBold: false,
    isItalic: false,
    fillColor: "transparent",
    strokeColor: "#000000",
    strokeWidth: 2,
    cornerRadius: 0,
    imageData: null,
    codeContent: "",
    isDynamicField: false,
    fieldKey: "",
  },
}

export function createDefaultElement(type: ElementType, x = 100, y = 100): CardElement {
  _counter++
  return {
    id: `el_${Date.now()}_${_counter}`,
    type,
    x,
    y,
    rotation: 0,
    isLocked: false,
    isVisible: true,
    zIndex: _counter,
    ...DEFAULTS[type],
  } as CardElement
}
