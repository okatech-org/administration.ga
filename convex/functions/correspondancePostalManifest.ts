/**
 * iCorrespondance — Bordereau d'envoi postal
 *
 * Génère un PDF tabulaire listant les courriers sortants d'une organisation
 * sur une période donnée, à imprimer et joindre à la valise diplomatique
 * ou au lot postal pour signature de prise en charge.
 *
 * Format :
 *   - Page A4 paysage
 *   - Cartouche : org émettrice, période, opérateur, totaux
 *   - Tableau : N° / Réf. départ / Date / Destinataire / Objet / Type / Vois
 *   - Bloc signatures : émetteur + transporteur
 */

"use node";

import { v } from "convex/values";
import { authAction } from "../lib/customFunctions";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

// Note : la query getStorageUrl pour récupérer l'URL signée du bordereau
// est définie dans `correspondancePostalManifestQueries.ts` (runtime V8 —
// les queries ne peuvent pas vivre dans un fichier "use node").

const PDF_MIME = "application/pdf";
const TYPE_LABELS: Record<string, string> = {
  note_verbale: "Note Verbale",
  lettre_officielle: "Lettre Officielle",
  circulaire: "Circulaire",
  telegramme: "Télégramme",
  memorandum: "Mémorandum",
  communique: "Communiqué",
};

/**
 * Génère le bordereau d'envoi postal pour une période donnée.
 *
 * Args :
 *   - orgId   : organisation émettrice
 *   - dateFrom: début période (ms timestamp). Défaut = il y a 7 jours.
 *   - dateTo  : fin période (ms timestamp). Défaut = maintenant.
 *
 * Retourne le storageId du PDF généré.
 */
export const generatePostalManifest = authAction({
  args: {
    orgId: v.id("orgs"),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ storageId: Id<"_storage"> } | { error: string }> => {
    const dateTo = args.dateTo ?? Date.now();
    const dateFrom = args.dateFrom ?? dateTo - 7 * 24 * 60 * 60 * 1000;

    const data = await ctx.runQuery(
      internal.functions.correspondanceCore._collectPostalManifestData,
      { orgId: args.orgId, dateFrom, dateTo },
    );
    if ("error" in data) return { error: data.error };

    const { orgName, items, operatorName } = data;

    try {
      const { PDFDocument, rgb, StandardFonts, PageSizes } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // A4 paysage
      const [pageHeight, pageWidth] = PageSizes.A4;
      const marginX = 36;
      const marginTop = 50;
      const marginBottom = 50;
      const usableWidth = pageWidth - marginX * 2;

      // Colonnes du tableau (somme = usableWidth)
      const cols = [
        { label: "N°", width: 28 },
        { label: "Réf. départ", width: 90 },
        { label: "Date", width: 70 },
        { label: "Destinataire", width: 180 },
        { label: "Objet", width: 230 },
        { label: "Type", width: 80 },
        { label: "Voie", width: 50 },
        { label: "Visa", width: 40 },
      ];
      // Recalibre dynamiquement si dépassement
      const totalCols = cols.reduce((s, c) => s + c.width, 0);
      const scale = totalCols > usableWidth ? usableWidth / totalCols : 1;
      for (const c of cols) c.width *= scale;

      const formatDateShort = (ts: number) =>
        new Date(ts).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        });
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

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      const drawHeader = () => {
        let y = pageHeight - marginTop;
        // Titre
        page.drawText("BORDEREAU D'ENVOI POSTAL", {
          x: marginX,
          y,
          size: 14,
          font: helveticaBold,
        });
        y -= 18;
        page.drawText(orgName, {
          x: marginX,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.3, 0.3, 0.3),
        });

        // Méta à droite
        const metaLines = [
          `Période : ${formatDateFull(dateFrom)} → ${formatDateFull(dateTo)}`,
          `Total : ${items.length} courrier${items.length > 1 ? "s" : ""}`,
          `Édité le : ${formatDateFull(Date.now())}`,
          `Opérateur : ${operatorName}`,
        ];
        let metaY = pageHeight - marginTop;
        for (const line of metaLines) {
          const w = helvetica.widthOfTextAtSize(line, 9);
          page.drawText(line, {
            x: pageWidth - marginX - w,
            y: metaY,
            size: 9,
            font: helvetica,
            color: rgb(0.25, 0.25, 0.25),
          });
          metaY -= 12;
        }

        return y - 22;
      };

      let cursorY = drawHeader();

      // En-tête tableau
      const drawTableHeader = (yPos: number): number => {
        const rowHeight = 18;
        page.drawRectangle({
          x: marginX,
          y: yPos - rowHeight,
          width: usableWidth,
          height: rowHeight,
          color: rgb(0.92, 0.92, 0.95),
        });
        let x = marginX + 4;
        for (const c of cols) {
          page.drawText(c.label, {
            x,
            y: yPos - rowHeight + 5,
            size: 8,
            font: helveticaBold,
            color: rgb(0.1, 0.1, 0.1),
          });
          x += c.width;
        }
        // Lignes verticales
        let lineX = marginX;
        for (const c of cols) {
          page.drawLine({
            start: { x: lineX, y: yPos },
            end: { x: lineX, y: yPos - rowHeight },
            thickness: 0.4,
            color: rgb(0.5, 0.5, 0.5),
          });
          lineX += c.width;
        }
        page.drawLine({
          start: { x: lineX, y: yPos },
          end: { x: lineX, y: yPos - rowHeight },
          thickness: 0.4,
          color: rgb(0.5, 0.5, 0.5),
        });
        page.drawLine({
          start: { x: marginX, y: yPos },
          end: { x: marginX + usableWidth, y: yPos },
          thickness: 0.4,
          color: rgb(0.5, 0.5, 0.5),
        });
        page.drawLine({
          start: { x: marginX, y: yPos - rowHeight },
          end: { x: marginX + usableWidth, y: yPos - rowHeight },
          thickness: 0.4,
          color: rgb(0.5, 0.5, 0.5),
        });
        return yPos - rowHeight;
      };

      cursorY = drawTableHeader(cursorY);

      const rowHeight = 16;
      for (let i = 0; i < items.length; i++) {
        // Saut de page si plus assez de place pour la ligne + bloc signature
        if (cursorY - rowHeight < marginBottom + 90) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          cursorY = drawHeader();
          cursorY = drawTableHeader(cursorY);
        }

        const item = items[i];
        const recipient = [item.recipientName, item.recipientOrg].filter(Boolean).join(" — ");
        const typeLabel = TYPE_LABELS[item.type] ?? item.type;
        const voie = item.recipientEmail ? "Email" : "Postal";
        const cells = [
          String(i + 1),
          item.reference,
          formatDateShort(item.sentAt ?? item.createdAt),
          truncate(recipient, 38),
          truncate(item.title, 50),
          typeLabel,
          voie,
          "", // visa case vide à signer
        ];

        // Cellules + bordures
        let x = marginX;
        for (let c = 0; c < cols.length; c++) {
          const col = cols[c];
          page.drawText(cells[c] ?? "", {
            x: x + 4,
            y: cursorY - rowHeight + 5,
            size: 8,
            font: c === 0 ? helveticaBold : helvetica,
            color: rgb(0.1, 0.1, 0.1),
          });
          // Verticales
          page.drawLine({
            start: { x, y: cursorY },
            end: { x, y: cursorY - rowHeight },
            thickness: 0.3,
            color: rgb(0.7, 0.7, 0.7),
          });
          x += col.width;
        }
        // Dernière verticale + horizontale du bas
        page.drawLine({
          start: { x, y: cursorY },
          end: { x, y: cursorY - rowHeight },
          thickness: 0.3,
          color: rgb(0.7, 0.7, 0.7),
        });
        page.drawLine({
          start: { x: marginX, y: cursorY - rowHeight },
          end: { x: marginX + usableWidth, y: cursorY - rowHeight },
          thickness: 0.3,
          color: rgb(0.85, 0.85, 0.85),
        });

        cursorY -= rowHeight;
      }

      if (items.length === 0) {
        page.drawText("Aucun courrier expédié sur cette période.", {
          x: marginX,
          y: cursorY - 25,
          size: 10,
          font: helvetica,
          color: rgb(0.5, 0.5, 0.5),
        });
        cursorY -= 30;
      }

      // ── Bloc signatures en bas ──
      const sigBlockY = marginBottom + 60;
      page.drawText("Émetteur", {
        x: marginX,
        y: sigBlockY,
        size: 9,
        font: helveticaBold,
      });
      page.drawText(operatorName, {
        x: marginX,
        y: sigBlockY - 14,
        size: 9,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawLine({
        start: { x: marginX, y: sigBlockY - 38 },
        end: { x: marginX + 220, y: sigBlockY - 38 },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText("Date et signature", {
        x: marginX,
        y: sigBlockY - 50,
        size: 8,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });

      const rightX = pageWidth - marginX - 240;
      page.drawText("Transporteur / Voie diplomatique", {
        x: rightX,
        y: sigBlockY,
        size: 9,
        font: helveticaBold,
      });
      page.drawLine({
        start: { x: rightX, y: sigBlockY - 38 },
        end: { x: rightX + 240, y: sigBlockY - 38 },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText("Nom, date, signature et tampon de prise en charge", {
        x: rightX,
        y: sigBlockY - 50,
        size: 8,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: PDF_MIME });
      const storageId = await ctx.storage.store(blob);

      return { storageId: storageId as Id<"_storage"> };
    } catch (err: any) {
      console.error("[postal-manifest] Erreur:", err);
      return { error: err?.message ?? "Erreur génération bordereau" };
    }
  },
});
