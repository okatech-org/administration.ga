/**
 * iCorrespondance — Filigrane PDF pour les copies
 *
 * Action Convex qui ajoute un filigrane "COPIE" aux pièces jointes
 * des correspondances copiées (dossier Envoyé).
 */

"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";

/**
 * Générer une version filigranée d'un PDF.
 * Télécharge le PDF depuis Convex Storage, ajoute "COPIE" en filigrane,
 * et stocke la version filigranée.
 */
export const generateWatermarkedPdf = action({
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

      // Charger pdf-lib dynamiquement (action Node)
      const { PDFDocument, rgb, degrees, StandardFonts } = await import("pdf-lib");

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();

        // Filigrane "COPIE" en diagonale, gris transparent
        const text = "COPIE";
        const fontSize = Math.min(width, height) * 0.15;
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

        // Tampon "COPIE CONFORME" en haut à droite
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

        // Date en bas
        const dateText = `Copie générée le ${new Date().toLocaleDateString("fr-FR")}`;
        const dateSize = 8;
        page.drawText(dateText, {
          x: 20,
          y: 15,
          size: dateSize,
          font: helveticaBold,
          color: rgb(0.6, 0.6, 0.6),
          opacity: 0.4,
        });
      }

      // Sauvegarder le PDF modifié
      const modifiedPdfBytes = await pdfDoc.save();

      // Stocker dans Convex Storage
      const watermarkedBlob = new Blob([modifiedPdfBytes as BlobPart], { type: "application/pdf" });
      const watermarkedStorageId = await ctx.storage.store(watermarkedBlob);

      return { watermarkedStorageId: watermarkedStorageId as string };
    } catch (error: any) {
      console.error("[watermark] Error:", error);
      return { error: error?.message ?? "Erreur lors de la génération du filigrane" };
    }
  },
});
