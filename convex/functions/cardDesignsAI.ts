"use node";

/**
 * Card Designs — Agent IA de génération
 *
 * Action Convex qui prend un fichier de référence (image ou PDF) et/ou des
 * instructions textuelles, et génère un design de carte conforme au format
 * attendu par l'éditeur Konva (apps/agent-desktop/src/renderer/src/lib/card-types.ts).
 *
 * Le system prompt décrit explicitement :
 *   - Le canvas (1016×648)
 *   - Les types d'éléments disponibles
 *   - Les champs dynamiques de l'entité sélectionnée
 *   - Les contraintes de la charte graphique
 *
 * Sortie : un objet JSON (frontElements, backElements, backgroundColor).
 * Les éléments seront normalisés côté client en les mergeant avec
 * createDefaultElement() — donc une sortie partiellement incomplète est
 * tolérée et auto-complétée avec les valeurs par défaut.
 */

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import { authAction } from "../lib/customFunctions";

// ─── Référentiel des champs dynamiques ─────────────────────────────
// Doit rester synchronisé avec apps/agent-desktop/.../lib/dynamic-fields.ts

const DYNAMIC_FIELDS_BY_ENTITY: Record<string, { key: string; label: string; category: string; type: "text" | "image" | "qrCode" }[]> = {
  "carte-consulaire": [
    { key: "citizen.firstName", label: "Prénom", category: "Identité", type: "text" },
    { key: "citizen.lastName", label: "Nom", category: "Identité", type: "text" },
    { key: "citizen.fullName", label: "Nom complet", category: "Identité", type: "text" },
    { key: "citizen.dateOfBirth", label: "Date de naissance", category: "Identité", type: "text" },
    { key: "citizen.placeOfBirth", label: "Lieu de naissance", category: "Identité", type: "text" },
    { key: "citizen.nationality", label: "Nationalité", category: "Identité", type: "text" },
    { key: "citizen.sex", label: "Sexe", category: "Identité", type: "text" },
    { key: "citizen.nip", label: "NIP", category: "Identité", type: "text" },
    { key: "card.number", label: "N° Carte", category: "Document", type: "text" },
    { key: "card.issuedAt", label: "Date d'émission", category: "Document", type: "text" },
    { key: "card.expiresAt", label: "Date d'expiration", category: "Document", type: "text" },
    { key: "card.qrCode", label: "QR Code de vérification", category: "Document", type: "qrCode" },
    { key: "consulate.name", label: "Nom du consulat", category: "Consulat", type: "text" },
    { key: "consulate.city", label: "Ville", category: "Consulat", type: "text" },
    { key: "consulate.country", label: "Pays", category: "Consulat", type: "text" },
    { key: "citizen.photo", label: "Photo d'identité", category: "Photo", type: "image" },
  ],
};

// ─── System prompt builder ────────────────────────────────────────

const CARD_SPEC = `
Tu es un designer expert qui génère le JSON d'un design de carte pour un éditeur Konva.

## Canvas
- Dimensions fixes : 1016 × 648 pixels (largeur × hauteur), format carte bancaire.
- Origine (0, 0) en haut à gauche, Y vers le bas.

## Format de sortie (JSON strict)
{
  "backgroundColor": "#RRGGBB",
  "frontElements": [ CardElement, ... ],
  "backElements": [ CardElement, ... ]
}

## Type CardElement
{
  "id": string (tu peux utiliser "el_1", "el_2"...),
  "type": "text" | "image" | "qrCode" | "barcode" | "rectangle" | "circle" | "line",
  "x": number, "y": number, "width": number, "height": number,
  "rotation": number (0 dans la plupart des cas),
  "isLocked": false,
  "isVisible": true,
  "zIndex": number (ordre d'empilement, plus grand = devant),
  "textContent": string (vide pour image/shape),
  "fontName": "Inter" | "Plus Jakarta Sans" | "DM Sans" | "Arial" | "Helvetica" | "Times New Roman" | "Georgia" | "Courier New",
  "fontSize": number,
  "textColor": "#RRGGBB",
  "textAlignment": "left" | "center" | "right",
  "isBold": boolean,
  "isItalic": boolean,
  "isDynamicField": boolean,
  "fieldKey": string (clé du champ dynamique, voir liste ci-dessous),
  "imageData": null (les images sont remplies côté client),
  "mask": "none" | "circle" (détourage circulaire pour les photos — utilise "circle" pour les photos d'identité circulaires),
  "fillColor": "#RRGGBB" | "transparent",
  "strokeColor": "#RRGGBB" | "transparent",
  "strokeWidth": number,
  "cornerRadius": number (arrondi pour rectangle et image non-masquée),
  "codeContent": string (URL/texte pour qrCode/barcode statique)
}

## Règles d'usage
- Pour afficher des données citoyen/carte/consulat : utilise un élément "text" avec isDynamicField=true et fieldKey=<clé>. textContent peut être "{<clé>}" pour lisibilité.
- Pour la photo d'identité : élément "image" avec isDynamicField=true, fieldKey="citizen.photo", mask="circle" si l'identité visuelle le demande. Dimensions typiques : 200×200 à 280×280.
- Pour le QR de vérification : élément "qrCode" avec isDynamicField=true, fieldKey="card.qrCode". Dimensions typiques : 120×120.
- Ne crée JAMAIS d'élément "image" statique avec imageData (toujours null, le client gère).
- Évite les chevauchements. Respecte une marge de 30px par rapport aux bords.
- zIndex : 0-2 pour les formes de fond, 3-5 pour les textes, 6+ pour photo et QR.

## Charte graphique Consulat.ga (si aucune référence visuelle n'est fournie)
- Palette de gris achromatique : #0F172A (foncé), #475569, #94A3B8, #E2E8F0 (clair)
- Accents : #009639 (vert Gabon), #FCD116 (jaune), #3A75C4 (bleu)
- Polices : "Inter" ou "Plus Jakarta Sans" de préférence
- Pas de dégradés colorés, ombres achromatiques uniquement

## Important
- Réponds UNIQUEMENT avec le JSON, sans texte additionnel, sans markdown fences.
- Si l'utilisateur fournit une image de référence, inspire-toi de sa structure (zones, hiérarchie, palette) — pas besoin de reproduction pixel-perfect.
- Si l'utilisateur fournit une liste de champs, assure-toi que TOUS soient présents sur la carte.
- Si aucun champ n'est demandé, mets au minimum : photo, nom complet, date de naissance, n° carte, QR code, nom du consulat.
- backElements peut être [] si l'utilisateur ne demande pas de verso.
`;

function buildEntitySection(entityId?: string): string {
  const fields = (entityId && DYNAMIC_FIELDS_BY_ENTITY[entityId]) || DYNAMIC_FIELDS_BY_ENTITY["carte-consulaire"];
  const lines = fields.map((f) => `  - ${f.key}  (${f.category} / ${f.type}) — ${f.label}`).join("\n");
  return `## Champs dynamiques disponibles pour l'entité "${entityId ?? "carte-consulaire"}"\n${lines}`;
}

// ─── Types de retour ──────────────────────────────────────────────

interface GeneratedDesign {
  backgroundColor: string;
  frontElements: unknown[];
  backElements: unknown[];
}

export interface GenerateCardDesignResult {
  success: boolean;
  design?: GeneratedDesign;
  error?: string;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
}

// ─── Action ───────────────────────────────────────────────────────

export const generateCardDesign = authAction({
  args: {
    entityId: v.optional(v.string()),
    /** base64 (sans data:... préfixe) */
    fileBase64: v.optional(v.string()),
    /** image/png, image/jpeg, image/webp, application/pdf */
    fileMimeType: v.optional(v.string()),
    /** Instructions libres de l'utilisateur */
    instructions: v.optional(v.string()),
    /** Liste optionnelle de fieldKey que l'utilisateur veut voir sur la carte */
    requestedFields: v.optional(v.array(v.string())),
  },
  handler: async (_ctx, args): Promise<GenerateCardDesignResult> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { success: false, error: "ANTHROPIC_API_KEY non configurée" };
    }

    if (!args.fileBase64 && !args.instructions) {
      return {
        success: false,
        error: "Fournis au minimum une image/PDF de référence OU des instructions textuelles.",
      };
    }

    const client = new Anthropic({ apiKey });
    const systemPrompt = `${CARD_SPEC}\n\n${buildEntitySection(args.entityId)}`;

    // Construction du message utilisateur multimodal
    // (ContentBlockParam n'est pas exporté dans cette version du SDK — on type explicitement)
    type InputBlock =
      | { type: "text"; text: string }
      | {
          type: "image";
          source: { type: "base64"; media_type: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string };
        }
      | {
          type: "document";
          source: { type: "base64"; media_type: "application/pdf"; data: string };
        };
    const userBlocks: InputBlock[] = [];

    if (args.fileBase64 && args.fileMimeType) {
      const mt = args.fileMimeType;
      if (mt === "application/pdf") {
        userBlocks.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: args.fileBase64 },
        });
      } else if (mt === "image/png" || mt === "image/jpeg" || mt === "image/webp" || mt === "image/gif") {
        userBlocks.push({
          type: "image",
          source: { type: "base64", media_type: mt as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: args.fileBase64 },
        });
      } else {
        return { success: false, error: `MIME type non supporté : ${mt}` };
      }
    }

    const textParts: string[] = [];
    if (args.instructions) {
      textParts.push(`Instructions utilisateur :\n${args.instructions}`);
    }
    if (args.requestedFields && args.requestedFields.length > 0) {
      textParts.push(
        `Champs à faire figurer impérativement sur la carte (fieldKey) :\n${args.requestedFields.map((f) => `  - ${f}`).join("\n")}`,
      );
    }
    if (args.fileBase64) {
      textParts.push(
        args.fileMimeType === "application/pdf"
          ? "Le PDF ci-dessus sert de référence visuelle et/ou textuelle. Extrais les informations pertinentes et génère un design cohérent."
          : "L'image ci-dessus est une référence visuelle. Inspire-toi de sa structure, de sa palette et de sa hiérarchie.",
      );
    }
    textParts.push("Génère maintenant le JSON strict du design, sans texte additionnel.");

    userBlocks.push({ type: "text", text: textParts.join("\n\n") });

    const startedAt = Date.now();
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        temperature: 0.5,
        system: systemPrompt,
        // Cast nécessaire car ContentBlockParam n'est pas exporté publiquement
        // par cette version du SDK — notre InputBlock est conforme au format API.
        messages: [{ role: "user", content: userBlocks as unknown as Anthropic.MessageParam["content"] }],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Appel Claude échoué : ${message}` };
    }
    const latencyMs = Date.now() - startedAt;

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // Parse JSON tolérant (retire les éventuelles fences markdown)
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const body = fenced ? fenced[1] : raw;

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch (err) {
      return {
        success: false,
        error: `Réponse Claude non-JSON : ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Validation minimale de structure — le client normalisera chaque élément
    if (!parsed || typeof parsed !== "object") {
      return { success: false, error: "Réponse Claude : objet JSON attendu." };
    }
    const p = parsed as Record<string, unknown>;
    if (!Array.isArray(p.frontElements)) {
      return { success: false, error: "Réponse Claude : frontElements manquant ou invalide." };
    }

    const design: GeneratedDesign = {
      backgroundColor: typeof p.backgroundColor === "string" ? p.backgroundColor : "#ffffff",
      frontElements: p.frontElements,
      backElements: Array.isArray(p.backElements) ? p.backElements : [],
    };

    return {
      success: true,
      design,
      tokensIn: response.usage.input_tokens ?? 0,
      tokensOut: response.usage.output_tokens ?? 0,
      latencyMs,
    };
  },
});
