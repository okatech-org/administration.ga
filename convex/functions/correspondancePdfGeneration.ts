/**
 * iCorrespondance — Génération PDF officiel
 *
 * Assemble un PDF formaté à partir d'un dossier de correspondance et de la
 * configuration de son type (logo, en-tête, pied de page). Le PDF est stocké
 * dans Convex Storage et ajouté au dossier comme document principal.
 *
 * Lay-out :
 *   ┌─────────────────────────────────────┐
 *   │  [LOGO]              [HEADER TEXT]  │  ← en-tête
 *   ├─────────────────────────────────────┤
 *   │  Réf : DIPL/2026/NV/00042           │
 *   │  Date : 28 avril 2026               │
 *   │                                     │
 *   │           [TYPE]                    │
 *   │                                     │
 *   │  À : <recipient>                    │
 *   │      <recipientOrg>                 │
 *   │                                     │
 *   │  Objet : <title>                    │
 *   │                                     │
 *   │  <body>                             │
 *   │                                     │
 *   │                  <senderName>       │
 *   │                  <senderTitle>      │
 *   ├─────────────────────────────────────┤
 *   │           [FOOTER TEXT]             │
 *   └─────────────────────────────────────┘
 */

"use node";

import { v } from "convex/values";
import { authAction } from "../lib/customFunctions";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const TYPE_LABELS: Record<string, string> = {
  note_verbale: "NOTE VERBALE",
  lettre_officielle: "LETTRE OFFICIELLE",
  circulaire: "CIRCULAIRE",
  telegramme: "TÉLÉGRAMME",
  memorandum: "MÉMORANDUM",
  communique: "COMMUNIQUÉ",
};

const PDF_MIME = "application/pdf";
const PAGE_WIDTH = 595.28; // A4 en points
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 60;
const MARGIN_TOP = 60;
const MARGIN_BOTTOM = 60;

/**
 * Découpe un texte en lignes pour respecter une largeur maximale.
 */
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

/**
 * Génère et attache un PDF officiel comme document principal d'un dossier.
 * Idempotent : si un PDF généré existe déjà, il est remplacé.
 */
export const generateOfficialPdf = authAction({
  args: {
    itemId: v.id("correspondanceItems"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ storageId: Id<"_storage">; replaced: boolean } | { error: string }> => {
    const data = await ctx.runQuery(
      internal.functions.correspondanceCore._getItemForPdfGeneration,
      { itemId: args.itemId },
    );
    if (!data) return { error: "Dossier introuvable" };

    const { item, typeConfig, orgName } = data;

    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      const usableWidth = PAGE_WIDTH - MARGIN_X * 2;
      let cursorY = PAGE_HEIGHT - MARGIN_TOP;

      // Logo (si présent)
      const logoStorageId = typeConfig?.headerConfig?.logoStorageId;
      if (logoStorageId) {
        const logoBlob = await ctx.storage.get(logoStorageId as Id<"_storage">);
        if (logoBlob) {
          try {
            const logoBytes = await logoBlob.arrayBuffer();
            const logoMime = (logoBlob as any).type ?? "";
            let logoImage;
            if (logoMime.includes("png") || logoMime === "") {
              try {
                logoImage = await pdfDoc.embedPng(logoBytes);
              } catch {
                logoImage = await pdfDoc.embedJpg(logoBytes);
              }
            } else {
              logoImage = await pdfDoc.embedJpg(logoBytes);
            }
            const logoMaxHeight = 60;
            const ratio = logoImage.width / logoImage.height;
            const logoHeight = Math.min(logoMaxHeight, logoImage.height);
            const logoWidth = logoHeight * ratio;
            page.drawImage(logoImage, {
              x: MARGIN_X,
              y: cursorY - logoHeight,
              width: logoWidth,
              height: logoHeight,
            });
          } catch (err) {
            console.warn("[pdf] Logo non-décodable, ignoré:", err);
          }
        }
      }

      // En-tête texte (à droite du logo)
      const headerText = typeConfig?.headerConfig?.headerText ?? orgName ?? "";
      if (headerText) {
        const lines = wrapText(headerText, helveticaBold, 11, usableWidth - 100);
        let y = cursorY - 12;
        for (const line of lines) {
          const lineWidth = helveticaBold.widthOfTextAtSize(line, 11);
          page.drawText(line, {
            x: PAGE_WIDTH - MARGIN_X - lineWidth,
            y,
            size: 11,
            font: helveticaBold,
            color: rgb(0.15, 0.15, 0.15),
          });
          y -= 14;
        }
      }

      cursorY -= 80;

      // Ligne de séparation
      page.drawLine({
        start: { x: MARGIN_X, y: cursorY },
        end: { x: PAGE_WIDTH - MARGIN_X, y: cursorY },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });

      cursorY -= 25;

      // Méta : référence + date
      const dateStr = new Date(item.createdAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      page.drawText(`Réf. : ${item.reference}`, {
        x: MARGIN_X,
        y: cursorY,
        size: 10,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
      });
      const dateText = `Date : ${dateStr}`;
      page.drawText(dateText, {
        x: PAGE_WIDTH - MARGIN_X - helvetica.widthOfTextAtSize(dateText, 10),
        y: cursorY,
        size: 10,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
      });
      cursorY -= 35;

      // Type (centré, gras)
      const typeLabel = TYPE_LABELS[item.type] ?? item.type.toUpperCase();
      const typeWidth = helveticaBold.widthOfTextAtSize(typeLabel, 14);
      page.drawText(typeLabel, {
        x: (PAGE_WIDTH - typeWidth) / 2,
        y: cursorY,
        size: 14,
        font: helveticaBold,
        color: rgb(0, 0, 0),
      });
      cursorY -= 35;

      // Bloc destinataire
      page.drawText("À :", {
        x: MARGIN_X,
        y: cursorY,
        size: 10,
        font: helveticaBold,
      });
      page.drawText(item.recipientName, {
        x: MARGIN_X + 25,
        y: cursorY,
        size: 11,
        font: helvetica,
      });
      cursorY -= 14;
      if (item.recipientOrg) {
        page.drawText(item.recipientOrg, {
          x: MARGIN_X + 25,
          y: cursorY,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });
        cursorY -= 14;
      }
      cursorY -= 15;

      // Objet
      page.drawText("Objet : ", {
        x: MARGIN_X,
        y: cursorY,
        size: 10,
        font: helveticaBold,
      });
      const objectIndent = MARGIN_X + helveticaBold.widthOfTextAtSize("Objet : ", 10);
      const objectLines = wrapText(item.title, helvetica, 11, usableWidth - 50);
      for (let i = 0; i < objectLines.length; i++) {
        page.drawText(objectLines[i], {
          x: i === 0 ? objectIndent : MARGIN_X,
          y: cursorY,
          size: 11,
          font: helvetica,
        });
        cursorY -= 15;
      }
      cursorY -= 15;

      // Corps (item.comment)
      if (item.comment) {
        const bodyLines = wrapText(item.comment, helvetica, 11, usableWidth);
        for (const line of bodyLines) {
          if (cursorY < MARGIN_BOTTOM + 80) break;
          page.drawText(line, {
            x: MARGIN_X,
            y: cursorY,
            size: 11,
            font: helvetica,
            color: rgb(0.1, 0.1, 0.1),
          });
          cursorY -= 16;
        }
      }

      // Bloc signature en bas à droite
      const signatureY = MARGIN_BOTTOM + 80;
      page.drawText(item.senderName, {
        x: PAGE_WIDTH - MARGIN_X - 200,
        y: signatureY,
        size: 11,
        font: helveticaBold,
      });
      if (item.senderOrg) {
        page.drawText(item.senderOrg, {
          x: PAGE_WIDTH - MARGIN_X - 200,
          y: signatureY - 14,
          size: 9,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });
      }

      // Pied de page
      const footerText = typeConfig?.headerConfig?.footerText;
      if (footerText) {
        page.drawLine({
          start: { x: MARGIN_X, y: MARGIN_BOTTOM + 25 },
          end: { x: PAGE_WIDTH - MARGIN_X, y: MARGIN_BOTTOM + 25 },
          thickness: 0.5,
          color: rgb(0.7, 0.7, 0.7),
        });
        const footerLines = wrapText(footerText, helvetica, 8, usableWidth);
        let footerY = MARGIN_BOTTOM + 12;
        for (const line of footerLines.slice(0, 2)) {
          const lineWidth = helvetica.widthOfTextAtSize(line, 8);
          page.drawText(line, {
            x: (PAGE_WIDTH - lineWidth) / 2,
            y: footerY,
            size: 8,
            font: helvetica,
            color: rgb(0.5, 0.5, 0.5),
          });
          footerY -= 10;
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: PDF_MIME });
      const newStorageId = await ctx.storage.store(blob);

      // Attacher comme document principal
      const result = await ctx.runMutation(
        internal.functions.correspondanceCore._attachGeneratedPdf,
        {
          itemId: args.itemId,
          storageId: newStorageId as Id<"_storage">,
          filename: `${item.reference.replace(/\//g, "_")}.pdf`,
          sizeBytes: pdfBytes.byteLength,
        },
      );

      return { storageId: newStorageId as Id<"_storage">, replaced: result.replaced };
    } catch (err: any) {
      console.error("[pdf-generation] Erreur:", err);
      return { error: err?.message ?? "Erreur génération PDF" };
    }
  },
});
