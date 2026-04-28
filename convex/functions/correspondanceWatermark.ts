/**
 * iCorrespondance — Filigrane PDF pour les copies
 *
 * Action Convex qui ajoute un filigrane "COPIE" aux pièces jointes
 * des correspondances copiées (dossier Envoyé).
 */

"use node";

import { v } from "convex/values";
import { authAction } from "../lib/customFunctions";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const PDF_MIME = "application/pdf";

/**
 * Génère un PDF filigrané à partir des octets fournis.
 * Helper réutilisé par les deux actions ci-dessous.
 */
async function buildWatermarkedPdf(pdfBytes: ArrayBuffer): Promise<Uint8Array> {
  const { PDFDocument, rgb, degrees, StandardFonts } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) * 0.15;
    const text = "COPIE";
    const textWidth = helveticaBold.widthOfTextAtSize(text, fontSize);

    page.drawText(text, {
      x: (width - textWidth * Math.cos(Math.PI / 6)) / 2,
      y: height / 2 - fontSize / 2,
      size: fontSize,
      font: helveticaBold,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.3,
      rotate: degrees(45),
    });

    const stampText = "COPIE CONFORME";
    const stampSize = 10;
    page.drawText(stampText, {
      x: width - helveticaBold.widthOfTextAtSize(stampText, stampSize) - 20,
      y: height - 30,
      size: stampSize,
      font: helveticaBold,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.5,
    });

    const dateText = `Copie générée le ${new Date().toLocaleDateString("fr-FR")}`;
    page.drawText(dateText, {
      x: 20,
      y: 15,
      size: 8,
      font: helveticaBold,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.4,
    });
  }

  return await pdfDoc.save();
}

/**
 * Générer une version filigranée d'un PDF.
 * Télécharge le PDF depuis Convex Storage, ajoute "COPIE" en filigrane,
 * et stocke la version filigranée.
 *
 * Requiert authentification (authAction).
 */
export const generateWatermarkedPdf = authAction({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<{ watermarkedStorageId: string } | { error: string }> => {
    try {
      // Télécharger le PDF original
      const blob = await ctx.storage.get(args.storageId);
      if (!blob) {
        return { error: "Fichier introuvable dans le storage" };
      }

      const pdfBytes = await blob.arrayBuffer();
      const modifiedPdfBytes = await buildWatermarkedPdf(pdfBytes);

      const watermarkedBlob = new Blob([modifiedPdfBytes as BlobPart], { type: PDF_MIME });
      const watermarkedStorageId = await ctx.storage.store(watermarkedBlob);

      return { watermarkedStorageId: watermarkedStorageId as string };
    } catch (error: any) {
      console.error("[watermark] Error:", error);
      return { error: error?.message ?? "Erreur lors de la génération du filigrane" };
    }
  },
});

/**
 * Applique le filigrane "COPIE" sur tous les PDFs d'une copie de correspondance.
 * Appelée automatiquement après l'envoi (le destinataire reçoit l'original sans
 * filigrane, l'expéditeur conserve une copie filigranée).
 *
 * Pour chaque document PDF :
 *   1. Télécharge depuis storage
 *   2. Génère la version filigranée
 *   3. Stocke la nouvelle version
 *   4. Patch l'item avec le nouveau storageId
 */
export const applyWatermarksToCopy = internalAction({
  args: {
    copyItemId: v.id("correspondanceItems"),
  },
  handler: async (ctx, args): Promise<{ watermarked: number; skipped: number; errors: number }> => {
    const item = await ctx.runQuery(internal.functions.correspondanceCore._getItemForWatermark, {
      itemId: args.copyItemId,
    });
    if (!item) return { watermarked: 0, skipped: 0, errors: 0 };

    const docs = item.documents ?? [];
    const updates: { oldStorageId: string; newStorageId: Id<"_storage"> }[] = [];
    let watermarked = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of docs) {
      if (doc.mimeType !== PDF_MIME) {
        skipped++;
        continue;
      }
      try {
        const blob = await ctx.storage.get(doc.storageId);
        if (!blob) {
          errors++;
          continue;
        }
        const pdfBytes = await blob.arrayBuffer();
        const modifiedPdfBytes = await buildWatermarkedPdf(pdfBytes);
        const watermarkedBlob = new Blob([modifiedPdfBytes as BlobPart], { type: PDF_MIME });
        const newStorageId = await ctx.storage.store(watermarkedBlob);
        updates.push({ oldStorageId: doc.storageId, newStorageId });
        watermarked++;
      } catch (err) {
        console.error("[watermark] Échec sur document", doc.filename, err);
        errors++;
      }
    }

    if (updates.length > 0) {
      await ctx.runMutation(internal.functions.correspondanceCore._replaceWatermarkedStorageIds, {
        itemId: args.copyItemId,
        updates,
      });
    }

    return { watermarked, skipped, errors };
  },
});
