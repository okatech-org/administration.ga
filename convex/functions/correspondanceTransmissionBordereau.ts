/**
 * iCorrespondance — Bordereau de transmission par dossier
 *
 * Action interne planifiée par `transmitCorrespondance` (mode forward cross-org).
 * Génère un PDF A4 portrait qui accompagne la transmission d'un dossier vers
 * une autre organisation : provenance, destinataire, liste des documents,
 * commentaire de transmission et deux zones de signature.
 *
 * Le storageId généré est apposé sur la copie forwarder via
 * `_setBordereauStorageId` pour téléchargement depuis le panneau Détails.
 */

"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const PDF_MIME = "application/pdf";

const CONFIDENTIALITE_LABELS: Record<string, string> = {
  standard: "Standard",
  confidentiel: "CONFIDENTIEL",
  secret: "SECRET",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

export const generateTransmissionBordereau = internalAction({
  args: { forwardCopyId: v.id("correspondanceItems") },
  handler: async (ctx, args): Promise<{ storageId: Id<"_storage"> } | { error: string }> => {
    const data = await ctx.runQuery(
      internal.functions.correspondanceCore._collectTransmissionBordereauData,
      { forwardCopyId: args.forwardCopyId },
    );
    if ("error" in data) return { error: data.error };

    try {
      const { PDFDocument, rgb, StandardFonts, PageSizes } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

      // A4 portrait
      const [pageWidth, pageHeight] = PageSizes.A4;
      const marginX = 50;
      const marginTop = 60;
      const marginBottom = 60;

      const formatDateFull = (ts: number) =>
        new Date(ts).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

      const truncate = (text: string | undefined, maxChars: number): string => {
        if (!text) return "";
        return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
      };

      // Wrap simple : découpe un texte en lignes de N caractères max (mots préservés)
      const wrapText = (text: string, maxChars: number): string[] => {
        const words = text.split(/\s+/);
        const lines: string[] = [];
        let current = "";
        for (const w of words) {
          if ((current + " " + w).trim().length > maxChars) {
            if (current) lines.push(current);
            current = w;
          } else {
            current = current ? `${current} ${w}` : w;
          }
        }
        if (current) lines.push(current);
        return lines;
      };

      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      let y = pageHeight - marginTop;

      // ── En-tête ──
      page.drawText("BORDEREAU DE TRANSMISSION", {
        x: marginX,
        y,
        size: 16,
        font: helveticaBold,
      });
      y -= 20;

      page.drawText(data.forwardingOrgName, {
        x: marginX,
        y,
        size: 11,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });

      // Bandeau confidentialité (haut-droite)
      const conf = data.confidentialite;
      if (conf === "confidentiel" || conf === "secret") {
        const label = CONFIDENTIALITE_LABELS[conf];
        const w = helveticaBold.widthOfTextAtSize(label, 11);
        page.drawRectangle({
          x: pageWidth - marginX - w - 16,
          y: pageHeight - marginTop - 4,
          width: w + 16,
          height: 24,
          color: rgb(0.85, 0.1, 0.1),
        });
        page.drawText(label, {
          x: pageWidth - marginX - w - 8,
          y: pageHeight - marginTop + 4,
          size: 11,
          font: helveticaBold,
          color: rgb(1, 1, 1),
        });
      }

      y -= 30;
      page.drawLine({
        start: { x: marginX, y },
        end: { x: pageWidth - marginX, y },
        thickness: 1,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 24;

      // ── Bloc identité (gauche : De / droite : À) ──
      const colWidth = (pageWidth - marginX * 2 - 20) / 2;
      const blockTop = y;

      // De
      page.drawText("DE", { x: marginX, y, size: 9, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
      page.drawText(data.forwardingOrgName, {
        x: marginX,
        y: y - 14,
        size: 11,
        font: helveticaBold,
      });
      page.drawText(`Agent : ${data.forwardingActorName}`, {
        x: marginX,
        y: y - 30,
        size: 10,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });

      // À
      const rightX = marginX + colWidth + 20;
      page.drawText("À", { x: rightX, y, size: 9, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
      page.drawText(truncate(data.recipientOrgName, 40), {
        x: rightX,
        y: y - 14,
        size: 11,
        font: helveticaBold,
      });
      page.drawText(`Destinataire : ${truncate(data.recipientName, 40)}`, {
        x: rightX,
        y: y - 30,
        size: 10,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      if (data.recipientEmail) {
        page.drawText(truncate(data.recipientEmail, 40), {
          x: rightX,
          y: y - 44,
          size: 9,
          font: helveticaOblique,
          color: rgb(0.4, 0.4, 0.4),
        });
      }

      y = blockTop - 60;

      // ── Provenance ──
      page.drawLine({
        start: { x: marginX, y },
        end: { x: pageWidth - marginX, y },
        thickness: 0.4,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= 18;
      page.drawText("PROVENANCE", { x: marginX, y, size: 9, font: helveticaBold, color: rgb(0.5, 0.5, 0.5) });
      y -= 14;
      page.drawText(`Dossier d'origine : ${data.originalReference}`, {
        x: marginX,
        y,
        size: 10,
        font: helvetica,
      });
      y -= 14;
      page.drawText(`Expéditeur d'origine : ${truncate(data.originalSenderName, 60)}`, {
        x: marginX,
        y,
        size: 10,
        font: helvetica,
      });
      y -= 14;
      page.drawText(`Nouvelle référence : ${data.newReference}`, {
        x: marginX,
        y,
        size: 10,
        font: helveticaBold,
      });
      y -= 14;
      page.drawText(`Date de transmission : ${formatDateFull(data.transmittedAt)}`, {
        x: marginX,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 24;

      // ── Tableau documents ──
      page.drawLine({
        start: { x: marginX, y },
        end: { x: pageWidth - marginX, y },
        thickness: 0.4,
        color: rgb(0.7, 0.7, 0.7),
      });
      y -= 18;
      page.drawText(`DOCUMENTS TRANSMIS (${data.documents.length})`, {
        x: marginX,
        y,
        size: 9,
        font: helveticaBold,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 18;

      const usableWidth = pageWidth - marginX * 2;
      const cols = [
        { label: "N°", width: 30 },
        { label: "Désignation", width: 290 },
        { label: "Type", width: 110 },
        { label: "Taille", width: usableWidth - 30 - 290 - 110 },
      ];

      // Header
      const headerHeight = 18;
      page.drawRectangle({
        x: marginX,
        y: y - headerHeight,
        width: usableWidth,
        height: headerHeight,
        color: rgb(0.93, 0.93, 0.95),
      });
      {
        let x = marginX + 6;
        for (const c of cols) {
          page.drawText(c.label, {
            x,
            y: y - headerHeight + 5,
            size: 8,
            font: helveticaBold,
          });
          x += c.width;
        }
      }
      y -= headerHeight;

      // Lignes
      const rowHeight = 16;
      for (let i = 0; i < data.documents.length; i++) {
        if (y - rowHeight < marginBottom + 130) break; // protège le bloc signatures
        const doc = data.documents[i];
        const label = doc.label ?? doc.filename;
        const cells = [
          String(i + 1),
          truncate(label, 56) + (doc.isMainDocument ? "  [Principal]" : ""),
          truncate(doc.mimeType, 22),
          formatBytes(doc.sizeBytes),
        ];
        let x = marginX + 6;
        for (let c = 0; c < cols.length; c++) {
          page.drawText(cells[c] ?? "", {
            x,
            y: y - rowHeight + 5,
            size: 8,
            font: c === 0 ? helveticaBold : helvetica,
            color: rgb(0.1, 0.1, 0.1),
          });
          x += cols[c].width;
        }
        page.drawLine({
          start: { x: marginX, y: y - rowHeight },
          end: { x: marginX + usableWidth, y: y - rowHeight },
          thickness: 0.3,
          color: rgb(0.85, 0.85, 0.85),
        });
        y -= rowHeight;
      }

      // ── Commentaire ──
      if (data.transmissionComment.trim().length > 0) {
        y -= 18;
        page.drawText("NOTE DE TRANSMISSION", {
          x: marginX,
          y,
          size: 9,
          font: helveticaBold,
          color: rgb(0.5, 0.5, 0.5),
        });
        y -= 14;
        const wrapped = wrapText(data.transmissionComment, 95);
        for (const line of wrapped.slice(0, 6)) {
          page.drawText(line, {
            x: marginX,
            y,
            size: 9,
            font: helvetica,
            color: rgb(0.2, 0.2, 0.2),
          });
          y -= 12;
        }
      }

      // ── Bloc signatures (toujours en bas) ──
      const sigBlockY = marginBottom + 70;
      // Émetteur (gauche)
      page.drawText("ÉMETTEUR", {
        x: marginX,
        y: sigBlockY,
        size: 9,
        font: helveticaBold,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText(data.forwardingActorName, {
        x: marginX,
        y: sigBlockY - 14,
        size: 10,
        font: helvetica,
      });
      page.drawText(data.forwardingOrgName, {
        x: marginX,
        y: sigBlockY - 28,
        size: 9,
        font: helveticaOblique,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawLine({
        start: { x: marginX, y: sigBlockY - 50 },
        end: { x: marginX + 220, y: sigBlockY - 50 },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText("Date et signature", {
        x: marginX,
        y: sigBlockY - 62,
        size: 8,
        font: helveticaOblique,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Récepteur (droite)
      const rxX = pageWidth - marginX - 240;
      page.drawText("RÉCEPTEUR", {
        x: rxX,
        y: sigBlockY,
        size: 9,
        font: helveticaBold,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText(truncate(data.recipientName, 40), {
        x: rxX,
        y: sigBlockY - 14,
        size: 10,
        font: helvetica,
      });
      page.drawText(truncate(data.recipientOrgName, 40), {
        x: rxX,
        y: sigBlockY - 28,
        size: 9,
        font: helveticaOblique,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawLine({
        start: { x: rxX, y: sigBlockY - 50 },
        end: { x: rxX + 240, y: sigBlockY - 50 },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText("Date, signature et accusé de réception", {
        x: rxX,
        y: sigBlockY - 62,
        size: 8,
        font: helveticaOblique,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Édité le
      page.drawText(`Édité le ${formatDateFull(Date.now())}`, {
        x: marginX,
        y: marginBottom - 10,
        size: 7,
        font: helveticaOblique,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: PDF_MIME });
      const storageId = await ctx.storage.store(blob);

      await ctx.runMutation(
        internal.functions.correspondanceCore._setBordereauStorageId,
        { forwardCopyId: args.forwardCopyId, storageId: storageId as Id<"_storage"> },
      );

      return { storageId: storageId as Id<"_storage"> };
    } catch (err: any) {
      console.error("[transmission-bordereau] Erreur:", err);
      return {
        error: err?.message ?? "Erreur lors de la génération du bordereau de transmission",
      };
    }
  },
});
