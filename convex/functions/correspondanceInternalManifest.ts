/**
 * iCorrespondance — Bordereau de transmission interne
 *
 * Génère un PDF tabulaire listant les courriers ASSIGNÉS au sein de
 * l'organisation sur une période donnée, à signer par l'émetteur du
 * registre et l'agent récepteur. Pendant interne du bordereau postal
 * (pour transmissions inter-services par cahier de transmission).
 *
 * Format identique au bordereau postal (A4 paysage) avec colonnes
 * spécifiques à la transmission interne.
 */

"use node";

import { v } from "convex/values";
import { authAction } from "../lib/customFunctions";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

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
 * Génère le bordereau de transmission interne.
 *
 * Args :
 *   - orgId        : organisation
 *   - dateFrom     : début période (ms timestamp). Défaut = 7 derniers jours.
 *   - dateTo       : fin période (ms timestamp). Défaut = maintenant.
 *   - assignedToId : si fourni, filtre sur les courriers assignés à cet agent.
 *
 * Retourne le storageId du PDF généré.
 */
export const generateInternalTransmissionManifest = authAction({
  args: {
    orgId: v.id("orgs"),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    assignedToId: v.optional(v.id("users")),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ storageId: Id<"_storage"> } | { error: string }> => {
    const dateTo = args.dateTo ?? Date.now();
    const dateFrom = args.dateFrom ?? dateTo - 7 * 24 * 60 * 60 * 1000;

    const data = await ctx.runQuery(
      internal.functions.correspondanceCore._collectInternalManifestData,
      {
        orgId: args.orgId,
        dateFrom,
        dateTo,
        assignedToId: args.assignedToId,
      },
    );
    if ("error" in data) return { error: data.error };

    const { orgName, items, operatorName, assignedAgentName } = data;

    try {
      const { PDFDocument, rgb, StandardFonts, PageSizes } = await import(
        "pdf-lib"
      );
      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // A4 paysage
      const [pageHeight, pageWidth] = PageSizes.A4;
      const marginX = 36;
      const marginTop = 50;
      const marginBottom = 50;
      const usableWidth = pageWidth - marginX * 2;

      const cols = [
        { label: "N°", width: 28 },
        { label: "Réf. arrivée", width: 90 },
        { label: "Réf. expéditeur", width: 90 },
        { label: "Date", width: 70 },
        { label: "Expéditeur", width: 170 },
        { label: "Objet", width: 200 },
        { label: "Type", width: 75 },
        { label: "Agent affecté", width: 110 },
        { label: "Visa", width: 40 },
      ];
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
        page.drawText("BORDEREAU DE TRANSMISSION INTERNE", {
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

        const metaLines = [
          `Période : ${formatDateFull(dateFrom)} → ${formatDateFull(dateTo)}`,
          assignedAgentName ? `Agent : ${assignedAgentName}` : null,
          `Total : ${items.length} courrier${items.length > 1 ? "s" : ""}`,
          `Édité le : ${formatDateFull(Date.now())}`,
          `Émetteur : ${operatorName}`,
        ].filter(Boolean) as string[];
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
        if (cursorY - rowHeight < marginBottom + 90) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          cursorY = drawHeader();
          cursorY = drawTableHeader(cursorY);
        }
        const item = items[i];
        const sender = [item.senderName, item.senderOrg]
          .filter(Boolean)
          .join(" — ");
        const typeLabel = TYPE_LABELS[item.type] ?? item.type;
        const cells = [
          String(i + 1),
          item.arrivalReference ?? "—",
          item.reference,
          formatDateShort(item.assignedAt ?? item.createdAt),
          truncate(sender, 36),
          truncate(item.title, 44),
          typeLabel,
          truncate(item.assignedToName, 22),
          "",
        ];
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
          page.drawLine({
            start: { x, y: cursorY },
            end: { x, y: cursorY - rowHeight },
            thickness: 0.3,
            color: rgb(0.7, 0.7, 0.7),
          });
          x += col.width;
        }
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
        page.drawText("Aucun courrier transmis sur cette période.", {
          x: marginX,
          y: cursorY - 25,
          size: 10,
          font: helvetica,
          color: rgb(0.5, 0.5, 0.5),
        });
        cursorY -= 30;
      }

      // ── Bloc signatures ──
      const sigBlockY = marginBottom + 60;
      page.drawText("Émetteur du registre", {
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
      page.drawText(
        assignedAgentName
          ? `Agent récepteur : ${assignedAgentName}`
          : "Agent(s) récepteur(s)",
        {
          x: rightX,
          y: sigBlockY,
          size: 9,
          font: helveticaBold,
        },
      );
      page.drawLine({
        start: { x: rightX, y: sigBlockY - 38 },
        end: { x: rightX + 240, y: sigBlockY - 38 },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawText("Date, signature et accusé de réception", {
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
      console.error("[internal-manifest] Erreur:", err);
      return {
        error: err?.message ?? "Erreur génération bordereau interne",
      };
    }
  },
});
