/**
 * Default Card Templates — Pre-built templates for consular cards
 *
 * These templates match the physical pre-printed card stock:
 * - Background design (flag, guillochis, armoiries) is already on the card
 * - The printer only adds the variable data (name, dates, photo, QR, card number)
 *
 * Card dimensions: 1016 × 648 px (CR-80 @ 300 DPI)
 * Orientation: Landscape (card is read horizontally)
 */

import type { CardElement, CardDesign } from "./card-types"

let _counter = 1000

function el(
  type: CardElement["type"],
  overrides: Partial<CardElement>,
): CardElement {
  _counter++
  return {
    id: `tpl_${_counter}`,
    type,
    x: 0,
    y: 0,
    width: 200,
    height: 30,
    rotation: 0,
    isLocked: false,
    isVisible: true,
    zIndex: _counter - 1000,
    textContent: "",
    fontName: "Inter",
    fontSize: 18,
    textColor: "#000000",
    textAlignment: "left" as const,
    isBold: false,
    isItalic: false,
    isDynamicField: false,
    fieldKey: "",
    imageData: null,
    fillColor: "transparent",
    strokeColor: "transparent",
    strokeWidth: 0,
    cornerRadius: 0,
    codeContent: "",
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// Template: Carte Consulaire Gabon (matches pre-printed stock)
// ═══════════════════════════════════════════════════════════════

/**
 * Positions derived from the physical card layout:
 * - The card has a pre-printed background with "CARTE CONSULAIRE" header,
 *   Gabonese flag colors, coat of arms, and guilloche pattern
 * - We only place the variable/dynamic elements that the Evolis prints
 *
 * Layout (landscape, 1016×648):
 *
 *  ┌──────────────────────────────────────────────────────┐
 *  │  CARTE CONSULAIRE (pre-printed)                  [QR]│
 *  │                                                      │
 *  │  ┌──────┐   Nom: MOUSSAVOU                          │
 *  │  │      │   Prénom: Jean-Pierre                      │
 *  │  │ PHOTO│                                            │
 *  │  │      │   Date d'émission:  04/08/2025             │
 *  │  └──────┘   Date d'expiration: 03/08/2028            │
 *  │                                                      │
 *  │                                     FR252812-00323   │
 *  └──────────────────────────────────────────────────────┘
 */

function createCarteConsulaireTemplate(): CardDesign {
  _counter = 1000

  const frontElements: CardElement[] = [
    // ── Photo d'identité ──
    // In the blue circle area, left side of card
    el("image", {
      x: 65,
      y: 155,
      width: 240,
      height: 300,
      isDynamicField: true,
      fieldKey: "citizen.photo",
      fillColor: "#e5e7eb",
      strokeColor: "transparent",
      strokeWidth: 0,
      cornerRadius: 8,
    }),

    // ── Nom (OULABOU) ──
    // Large bold text, right of photo, ~40% down
    el("text", {
      x: 430,
      y: 275,
      width: 420,
      height: 50,
      isDynamicField: true,
      fieldKey: "citizen.lastName",
      fontSize: 38,
      textColor: "#1a1a1a",
      isBold: true,
      textAlignment: "left",
    }),

    // ── Prénom (Marie-Jeanne) ──
    // Below the name
    el("text", {
      x: 430,
      y: 330,
      width: 420,
      height: 45,
      isDynamicField: true,
      fieldKey: "citizen.firstName",
      fontSize: 32,
      textColor: "#1a1a1a",
      isBold: false,
      textAlignment: "left",
    }),

    // ── Date d'émission ──
    // Right of "Date d'émission :" label
    el("text", {
      x: 580,
      y: 400,
      width: 200,
      height: 30,
      isDynamicField: true,
      fieldKey: "card.issuedAt",
      fontSize: 22,
      textColor: "#1a1a1a",
      isBold: true,
      textAlignment: "left",
    }),

    // ── Date d'expiration ──
    // Right of "Date d'expiration :" label
    el("text", {
      x: 610,
      y: 442,
      width: 200,
      height: 30,
      isDynamicField: true,
      fieldKey: "card.expiresAt",
      fontSize: 22,
      textColor: "#1a1a1a",
      isBold: true,
      textAlignment: "left",
    }),

    // ── Numéro de carte (bottom-left, red) ──
    // Bold red text at bottom-left
    el("text", {
      x: 50,
      y: 558,
      width: 370,
      height: 35,
      isDynamicField: true,
      fieldKey: "card.number",
      fontSize: 24,
      textColor: "#C41E3A",
      isBold: true,
      fontName: "Courier New",
      textAlignment: "left",
    }),

    // ── NIP (below card number, red) ──
    el("text", {
      x: 80,
      y: 598,
      width: 300,
      height: 28,
      isDynamicField: true,
      fieldKey: "citizen.nip",
      fontSize: 20,
      textColor: "#C41E3A",
      isBold: true,
      textAlignment: "left",
    }),

    // ── Numéro de carte (vertical, right edge) ──
    // Rotated 90°, runs along the right edge
    el("text", {
      x: 948,
      y: 50,
      width: 500,
      height: 28,
      rotation: 90,
      isDynamicField: true,
      fieldKey: "card.number",
      fontSize: 20,
      textColor: "#1a1a1a",
      isBold: true,
      fontName: "Courier New",
      textAlignment: "left",
    }),

    // ── QR Code (bottom-right) ──
    el("qrCode", {
      x: 855,
      y: 475,
      width: 140,
      height: 140,
      isDynamicField: true,
      fieldKey: "card.qrCode",
      codeContent: "",
      fillColor: "#ffffff",
    }),
  ]

  return {
    name: "Carte Consulaire — Standard",
    description:
      "Modèle standard pour carte consulaire gabonaise. Place les données variables (nom, photo, dates, QR) sur la carte pré-imprimée.",
    backgroundColor: "#ffffff",
    frontBackgroundImage: null,
    backBackgroundImage: null,
    backgroundOpacity: 1,
    frontElements,
    backElements: [],
    printDuplex: false,
    magneticTracks: ["", "", ""],
    version: 1,
  }
}

// ═══════════════════════════════════════════════════════════════
// Template: Carte Consulaire Recto-Verso
// ═══════════════════════════════════════════════════════════════

function createCarteConsulaireRectoVersoTemplate(): CardDesign {
  const base = createCarteConsulaireTemplate()
  _counter = 2000

  const backElements: CardElement[] = [
    // Numéro de carte (back side)
    el("text", {
      x: 50,
      y: 580,
      width: 350,
      height: 25,
      isDynamicField: true,
      fieldKey: "card.number",
      fontSize: 16,
      textColor: "#1a1a1a",
      isBold: true,
      fontName: "Courier New",
      textAlignment: "left",
    }),

    // QR Code (back side, larger)
    el("qrCode", {
      x: 820,
      y: 480,
      width: 140,
      height: 140,
      isDynamicField: true,
      fieldKey: "card.qrCode",
      codeContent: "",
      fillColor: "#ffffff",
    }),
  ]

  return {
    ...base,
    name: "Carte Consulaire — Recto/Verso",
    description:
      "Modèle recto/verso. Recto: données complètes. Verso: QR code et numéro de carte.",
    backElements,
    printDuplex: true,
  }
}

// ═══════════════════════════════════════════════════════════════
// Template: Vide (blank)
// ═══════════════════════════════════════════════════════════════

function createBlankTemplate(): CardDesign {
  return {
    name: "Modèle vide",
    description: "Un modèle vide pour créer votre propre design de carte.",
    backgroundColor: "#ffffff",
    frontBackgroundImage: null,
    backBackgroundImage: null,
    backgroundOpacity: 1,
    frontElements: [],
    backElements: [],
    printDuplex: false,
    magneticTracks: ["", "", ""],
    version: 1,
  }
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

export interface TemplateInfo {
  id: string
  name: string
  description: string
  icon: "card" | "card-duplex" | "blank"
  create: () => CardDesign
}

export const DEFAULT_TEMPLATES: TemplateInfo[] = [
  {
    id: "carte-consulaire-standard",
    name: "Carte Consulaire — Standard",
    description:
      "Données variables (nom, photo, dates, QR, n° carte) sur carte pré-imprimée. Recto uniquement.",
    icon: "card",
    create: createCarteConsulaireTemplate,
  },
  {
    id: "carte-consulaire-recto-verso",
    name: "Carte Consulaire — Recto/Verso",
    description:
      "Recto complet + Verso avec QR et numéro. Impression duplex.",
    icon: "card-duplex",
    create: createCarteConsulaireRectoVersoTemplate,
  },
  {
    id: "blank",
    name: "Modèle vide",
    description: "Commencer de zéro avec un modèle vierge.",
    icon: "blank",
    create: createBlankTemplate,
  },
]
