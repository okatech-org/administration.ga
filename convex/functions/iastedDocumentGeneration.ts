/**
 * iAsted — Génération de documents standalone (hors correspondance officielle)
 *
 * Pipeline pdf-lib pour les templates qui n'ont pas besoin d'un
 * `correspondanceItem` (attestations, certificats, laissez-passer). Le PDF
 * généré est stocké dans Convex Storage et le `storageId` retourné. Le caller
 * (typiquement `realtimeToolExecutor.generateDocument`) se charge de
 * persister le document dans la table `documents` via
 * `documents.createFromIAsted`.
 *
 * Itération 1 : 3 templates hardcodés. La généralisation (configuration
 * dynamique côté admin) est hors-scope de cette itération.
 */

"use node";

import { v } from "convex/values";
import { authAction } from "../lib/customFunctions";
import type { Id } from "../_generated/dataModel";

// ── Constantes de mise en page (alignées avec correspondancePdfGeneration) ──
const PAGE_WIDTH = 595.28; // A4 points
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 60;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 60;

/** Templates supportés en itération 1 (extensible par ajout dans cet enum + TEMPLATE_DEFINITIONS). */
const SUPPORTED_TEMPLATE_CODES = [
  "attestation_residence",
  "laissez_passer_consulaire",
  "certificat_inscription_consulaire",
] as const;
type TemplateCode = (typeof SUPPORTED_TEMPLATE_CODES)[number];

interface TemplateDefinition {
  title: string;
  intro: (recipientName: string) => string;
  body: (recipientName: string, params?: Record<string, string>) => string;
  closing: string;
}

const TEMPLATE_DEFINITIONS: Record<TemplateCode, TemplateDefinition> = {
  attestation_residence: {
    title: "ATTESTATION DE RÉSIDENCE",
    intro: (_name) =>
      `Le soussigné, Représentant officiel de la République Gabonaise, atteste par la présente que :`,
    body: (name) =>
      `${name}\n\nest régulièrement inscrit(e) au registre consulaire de cette circonscription et y réside effectivement à la date d'émission du présent document.\n\nLa présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.`,
    closing: "Fait en notre Mission, à toutes fins utiles.",
  },
  laissez_passer_consulaire: {
    title: "LAISSEZ-PASSER CONSULAIRE",
    intro: (_name) =>
      `Les autorités consulaires gabonaises requièrent et prient les autorités compétentes de laisser passer librement, sans délai ni entrave, le ressortissant désigné ci-après :`,
    body: (name) =>
      `${name}\n\nde nationalité gabonaise, et de lui accorder, en cas de besoin, toute assistance et protection.\n\nLe présent laissez-passer tient lieu de document de voyage temporaire, dans l'attente de la délivrance d'un titre de voyage régulier.`,
    closing: "Délivré pour servir et valoir ce que de droit.",
  },
  certificat_inscription_consulaire: {
    title: "CERTIFICAT D'INSCRIPTION CONSULAIRE",
    intro: (_name) =>
      `Le soussigné certifie que la personne désignée ci-après figure régulièrement sur le registre des Gabonais établis hors du territoire national :`,
    body: (name) =>
      `${name}\n\nLe présent certificat est délivré pour faire valoir ses droits auprès des administrations gabonaises et étrangères, conformément à la réglementation en vigueur.`,
    closing: "Pour servir et valoir ce que de droit.",
  },
};

/** Découpe un texte en lignes en respectant la largeur disponible. */
function wrapText(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(" ");
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function isSupportedTemplate(code: string): code is TemplateCode {
  return (SUPPORTED_TEMPLATE_CODES as readonly string[]).includes(code);
}

/**
 * Génère un PDF standalone pour les templates iAsted hors correspondance.
 * Retourne le `storageId` du PDF stocké dans Convex Storage + sa taille.
 */
export const generateIAstedStandalonePdf = authAction({
  args: {
    templateCode: v.string(),
    recipientName: v.string(),
    orgName: v.optional(v.string()),
    params: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (
    ctx,
    args,
  ): Promise<
    | { storageId: Id<"_storage">; filename: string; sizeBytes: number; mimeType: string; title: string }
    | { error: string }
  > => {
    if (!isSupportedTemplate(args.templateCode)) {
      return {
        error: `Template inconnu : ${args.templateCode}. Templates disponibles : ${SUPPORTED_TEMPLATE_CODES.join(", ")}.`,
      };
    }
    const template = TEMPLATE_DEFINITIONS[args.templateCode];
    const recipientName = args.recipientName.trim();
    if (!recipientName) {
      return { error: "Nom du bénéficiaire manquant." };
    }

    const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const usableWidth = PAGE_WIDTH - MARGIN_X * 2;
    let cursorY = PAGE_HEIGHT - MARGIN_TOP;

    // En-tête : nom de l'organisation (org name si fourni)
    const headerText = args.orgName ?? "République Gabonaise";
    const headerWidth = helveticaBold.widthOfTextAtSize(headerText, 12);
    page.drawText(headerText, {
      x: (PAGE_WIDTH - headerWidth) / 2,
      y: cursorY,
      size: 12,
      font: helveticaBold,
      color: rgb(0.15, 0.15, 0.15),
    });
    cursorY -= 30;

    // Ligne de séparation
    page.drawLine({
      start: { x: MARGIN_X, y: cursorY },
      end: { x: PAGE_WIDTH - MARGIN_X, y: cursorY },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    cursorY -= 40;

    // Titre du document (centré, gras, majuscules)
    const titleWidth = helveticaBold.widthOfTextAtSize(template.title, 18);
    page.drawText(template.title, {
      x: (PAGE_WIDTH - titleWidth) / 2,
      y: cursorY,
      size: 18,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    cursorY -= 50;

    // Intro
    const introLines = wrapText(template.intro(recipientName), helvetica, 11, usableWidth);
    for (const line of introLines) {
      page.drawText(line, {
        x: MARGIN_X,
        y: cursorY,
        size: 11,
        font: helvetica,
        color: rgb(0.15, 0.15, 0.15),
      });
      cursorY -= 16;
    }
    cursorY -= 12;

    // Corps (centré sur le nom du bénéficiaire)
    const bodyLines = wrapText(template.body(recipientName, args.params), helvetica, 11, usableWidth);
    for (const line of bodyLines) {
      page.drawText(line, {
        x: MARGIN_X,
        y: cursorY,
        size: 11,
        font: helvetica,
        color: rgb(0.15, 0.15, 0.15),
      });
      cursorY -= 16;
    }
    cursorY -= 24;

    // Clôture
    const closingLines = wrapText(template.closing, helvetica, 11, usableWidth);
    for (const line of closingLines) {
      page.drawText(line, {
        x: MARGIN_X,
        y: cursorY,
        size: 11,
        font: helvetica,
        color: rgb(0.15, 0.15, 0.15),
      });
      cursorY -= 16;
    }
    cursorY -= 50;

    // Bloc date + signature (aligné à droite)
    const today = new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const dateText = `Fait le ${today}`;
    const dateWidth = helvetica.widthOfTextAtSize(dateText, 11);
    page.drawText(dateText, {
      x: PAGE_WIDTH - MARGIN_X - dateWidth,
      y: cursorY,
      size: 11,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    cursorY -= 50;

    const signatureText = "Signature et cachet";
    const sigWidth = helvetica.widthOfTextAtSize(signatureText, 10);
    page.drawText(signatureText, {
      x: PAGE_WIDTH - MARGIN_X - sigWidth,
      y: cursorY,
      size: 10,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Pied de page
    const footerText = "Document généré par iAsted — consulat.ga";
    const footerWidth = helvetica.widthOfTextAtSize(footerText, 8);
    page.drawText(footerText, {
      x: (PAGE_WIDTH - footerWidth) / 2,
      y: MARGIN_BOTTOM,
      size: 8,
      font: helvetica,
      color: rgb(0.6, 0.6, 0.6),
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
    const storageId = await ctx.storage.store(blob);
    const filename = `${args.templateCode}-${recipientName.replace(/[^a-zA-Z0-9-]+/g, "_").slice(0, 40)}.pdf`;

    return {
      storageId,
      filename,
      sizeBytes: pdfBytes.byteLength,
      mimeType: "application/pdf",
      title: template.title,
    };
  },
});
