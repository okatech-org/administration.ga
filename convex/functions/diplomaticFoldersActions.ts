"use node";

/**
 * Dossiers Opérateurs Économiques — Actions Node.js
 *
 * Génération de documents (PDF, DOCX, PPTX) et export ZIP.
 * Ce fichier est séparé car il utilise "use node" (incompatible avec queries/mutations).
 *
 * Formats par phase :
 * - Fiche cible : PDF
 * - Plan stratégique : PDF + PPTX
 * - Lettre : DOCX + PDF
 * - Rapport : PDF
 * - Projet : DOCX + PDF
 */

import { v } from "convex/values";
import { internalAction as rawInternalAction } from "../_generated/server";
import { authAction } from "../lib/customFunctions";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

// ─── Couleurs Gabon (décoratif uniquement) ───────────────────────────────────
const GABON_GREEN = { r: 0, g: 158, b: 73 };
const GABON_YELLOW = { r: 252, g: 209, b: 22 };
const GABON_BLUE = { r: 58, g: 117, b: 196 };

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9À-ÿ\s._-]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 80);
}

function formatDate(ts?: number): string {
  if (!ts) return "N/A";
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// FICHE CIBLE → PDF
// ═════════════════════════════════════════════════════════════════════════════

export const generateTargetFiche = rawInternalAction({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

    // Récupérer les données
    const target = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetTarget,
      { targetId: args.targetId },
    );
    if (!target) return;

    const pipeline = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetTargetPipeline,
      { targetId: args.targetId },
    );

    const folder = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderByTarget,
      { targetId: args.targetId },
    );
    if (!folder) return;

    // Construire le PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 10;
    const titleSize = 14;
    const sectionSize = 12;

    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    let y = height - 50;

    // Bandeau tricolore gabonais (décoratif)
    const stripeH = 8;
    page.drawRectangle({
      x: 0, y: height - stripeH, width, height: stripeH,
      color: rgb(GABON_GREEN.r / 255, GABON_GREEN.g / 255, GABON_GREEN.b / 255),
    });
    page.drawRectangle({
      x: 0, y: height - stripeH * 2, width, height: stripeH,
      color: rgb(GABON_YELLOW.r / 255, GABON_YELLOW.g / 255, GABON_YELLOW.b / 255),
    });
    page.drawRectangle({
      x: 0, y: height - stripeH * 3, width, height: stripeH,
      color: rgb(GABON_BLUE.r / 255, GABON_BLUE.g / 255, GABON_BLUE.b / 255),
    });

    y = height - 60;

    // Titre
    page.drawText("FICHE OPÉRATEUR ÉCONOMIQUE", {
      x: 50, y, size: titleSize, font: fontBold, color: rgb(0.1, 0.1, 0.1),
    });
    y -= 30;

    // Ligne séparatrice
    page.drawLine({
      start: { x: 50, y }, end: { x: width - 50, y },
      thickness: 1, color: rgb(0.8, 0.8, 0.8),
    });
    y -= 25;

    // Section Identification
    const drawSection = (title: string) => {
      if (y < 80) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }
      page.drawText(title, {
        x: 50, y, size: sectionSize, font: fontBold, color: rgb(0.2, 0.2, 0.2),
      });
      y -= 20;
    };

    const drawField = (label: string, value: string | undefined | null) => {
      if (!value) return;
      if (y < 60) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }
      page.drawText(`${label} :`, {
        x: 60, y, size: fontSize, font: fontBold, color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText(value, {
        x: 200, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1),
      });
      y -= 16;
    };

    drawSection("IDENTIFICATION");
    drawField("Nom", target.name);
    drawField("Type", target.type);
    drawField("Secteur", target.sector);
    drawField("Pays", target.country);
    drawField("Ville", target.city);
    drawField("Site web", target.website);
    y -= 10;

    drawSection("CONTACT");
    drawField("Nom", target.contactName);
    drawField("Titre", target.contactTitle);
    drawField("Email", target.contactEmail);
    drawField("Téléphone", target.contactPhone);
    y -= 10;

    drawSection("ÉVALUATION");
    drawField("Priorité", target.priority);
    drawField("Score d'opportunité", target.opportunityScore?.toString());
    drawField("Phase pipeline", target.pipelinePhase);
    drawField("Statut", target.status);
    y -= 10;

    if (target.matchReason || target.description) {
      drawSection("ANALYSE IA");
      if (target.description) {
        // Découper le texte long en lignes
        const words = target.description.split(" ");
        let line = "";
        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(testLine, fontSize) > width - 120) {
            page.drawText(line, {
              x: 60, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2),
            });
            y -= 14;
            line = word;
            if (y < 60) {
              page = pdfDoc.addPage([595.28, 841.89]);
              y = height - 50;
            }
          } else {
            line = testLine;
          }
        }
        if (line) {
          page.drawText(line, {
            x: 60, y, size: fontSize, font, color: rgb(0.2, 0.2, 0.2),
          });
          y -= 14;
        }
        y -= 6;
      }
      if (target.matchReason) {
        drawField("Raison du match", target.matchReason);
      }
      if (target.tags?.length) {
        drawField("Tags", target.tags.join(", "));
      }
      y -= 10;
    }

    if (target.aiDiscoveryData) {
      drawSection("DONNÉES DÉCOUVERTE IA");
      drawField("Source", target.aiDiscoveryData.source);
      drawField("Requête", target.aiDiscoveryData.searchQuery);
      drawField("Confiance IA", `${(target.aiDiscoveryData.aiConfidence * 100).toFixed(0)}%`);
      drawField("Priorité exécutive", target.aiDiscoveryData.executivePriority);
      drawField("Découvert le", formatDate(target.aiDiscoveryData.discoveredAt));
      y -= 10;
    }

    drawSection("PIPELINE");
    drawField("Plans stratégiques", pipeline.plans.length.toString());
    drawField("Lettres de contact", pipeline.letters.length.toString());
    drawField("Projets", pipeline.projects.length.toString());

    // Pied de page
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const p = pdfDoc.getPage(i);
      p.drawText(`Consulat.ga — Affaires Diplomatiques | Page ${i + 1}/${totalPages}`, {
        x: 50, y: 25, size: 8, font, color: rgb(0.5, 0.5, 0.5),
      });
      p.drawText(`Généré le ${formatDate(Date.now())}`, {
        x: width - 200, y: 25, size: 8, font, color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Sauvegarder
    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const storageId = await ctx.storage.store(pdfBlob);

    const sanitizedName = sanitizeFilename(target.name);
    await ctx.runMutation(
      internal.functions.diplomaticFolders.internalAddDocument,
      {
        orgId: target.orgId,
        folderId: folder._id,
        targetId: args.targetId,
        sourceType: "fiche",
        sourceId: args.targetId,
        subfolder: "",
        filename: `Fiche_Cible_${sanitizedName}.pdf`,
        format: "pdf",
        storageId,
        sizeBytes: pdfBytes.length,
      },
    );
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PLAN STRATÉGIQUE → PDF + PPTX
// ═════════════════════════════════════════════════════════════════════════════

export const generatePlanDocument = rawInternalAction({
  args: {
    planId: v.id("diplomaticPlans"),
    targetId: v.id("diplomaticTargets"),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetPlan,
      { planId: args.planId },
    );
    if (!plan) return;

    const target = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetTarget,
      { targetId: args.targetId },
    );
    if (!target) return;

    const folder = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderByTarget,
      { targetId: args.targetId },
    );
    if (!folder) return;

    const sanitizedName = sanitizeFilename(plan.title);
    const year = new Date().getFullYear();

    // ── PDF ──
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    let y = height - 50;

    // Bandeau tricolore
    const stripeH = 8;
    page.drawRectangle({ x: 0, y: height - stripeH, width, height: stripeH, color: rgb(GABON_GREEN.r / 255, GABON_GREEN.g / 255, GABON_GREEN.b / 255) });
    page.drawRectangle({ x: 0, y: height - stripeH * 2, width, height: stripeH, color: rgb(GABON_YELLOW.r / 255, GABON_YELLOW.g / 255, GABON_YELLOW.b / 255) });
    page.drawRectangle({ x: 0, y: height - stripeH * 3, width, height: stripeH, color: rgb(GABON_BLUE.r / 255, GABON_BLUE.g / 255, GABON_BLUE.b / 255) });
    y = height - 60;

    // Page de garde
    page.drawText("PLAN STRATÉGIQUE", {
      x: 50, y, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1),
    });
    y -= 25;
    page.drawText(plan.title, {
      x: 50, y, size: 14, font: fontBold, color: rgb(0.2, 0.2, 0.2),
    });
    y -= 20;
    page.drawText(`Cible : ${target.name} | Catégorie : ${plan.category} | ${year}`, {
      x: 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4),
    });
    y -= 10;

    page.drawLine({
      start: { x: 50, y }, end: { x: width - 50, y },
      thickness: 1, color: rgb(0.8, 0.8, 0.8),
    });
    y -= 25;

    const drawWrappedText = (text: string, startY: number, maxWidth: number): number => {
      const words = text.split(" ");
      let line = "";
      let currentY = startY;
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(testLine, 10) > maxWidth) {
          page.drawText(line, { x: 60, y: currentY, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
          currentY -= 14;
          line = word;
          if (currentY < 60) {
            page = pdfDoc.addPage([595.28, 841.89]);
            currentY = height - 50;
          }
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, { x: 60, y: currentY, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
        currentY -= 14;
      }
      return currentY;
    };

    if (plan.summary) {
      page.drawText("Résumé", { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
      y = drawWrappedText(plan.summary, y, width - 120);
      y -= 15;
    }

    // Contenu IA
    const ai = plan.aiGeneratedContent;
    if (ai) {
      const sections: Array<{ title: string; items: string[] }> = [
        { title: "Besoins du pays", items: ai.countryNeeds },
        { title: "Capacités opérateur", items: ai.operatorCapabilities },
        { title: "Bénéfices mutuels", items: ai.mutualBenefits },
        { title: "Points de négociation", items: ai.negotiationPoints },
        { title: "Agenda de réunion", items: ai.meetingAgenda },
        { title: "Risques identifiés", items: ai.risks },
      ];

      for (const section of sections) {
        if (!section.items?.length) continue;
        if (y < 100) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - 50;
        }
        page.drawText(section.title, { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
        y -= 18;
        for (const item of section.items) {
          page.drawText(`• ${item}`, { x: 60, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
          y -= 14;
          if (y < 60) {
            page = pdfDoc.addPage([595.28, 841.89]);
            y = height - 50;
          }
        }
        y -= 10;
      }
    }

    // Objectifs
    if (plan.objectives?.length) {
      if (y < 100) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 50;
      }
      page.drawText("Objectifs", { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
      for (const obj of plan.objectives) {
        const statusEmoji = obj.status === "completed" ? "✓" : obj.status === "in_progress" ? "→" : "○";
        page.drawText(`${statusEmoji} ${obj.title} [${obj.status}]`, {
          x: 60, y, size: 10, font, color: rgb(0.2, 0.2, 0.2),
        });
        y -= 14;
        if (y < 60) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = height - 50;
        }
      }
    }

    // Pieds de page
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const p = pdfDoc.getPage(i);
      p.drawText(`Consulat.ga — Plan Stratégique | Page ${i + 1}/${totalPages}`, {
        x: 50, y: 25, size: 8, font, color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const pdfStorageId = await ctx.storage.store(pdfBlob);

    await ctx.runMutation(
      internal.functions.diplomaticFolders.internalAddDocument,
      {
        orgId: plan.orgId,
        folderId: folder._id,
        targetId: args.targetId,
        sourceType: "plan",
        sourceId: args.planId,
        subfolder: "Plans Stratégiques",
        filename: `Plan_${plan.category}_${sanitizedName}_${year}.pdf`,
        format: "pdf",
        storageId: pdfStorageId,
        sizeBytes: pdfBytes.length,
      },
    );

    // ── PPTX ──
    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_16x9";
    pptx.author = "Consulat.ga";
    pptx.title = plan.title;

    // Slide 1 : Couverture
    const slide1 = pptx.addSlide();
    slide1.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.3,
      fill: { color: "009E49" },
    });
    slide1.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0.3, w: "100%", h: 0.3,
      fill: { color: "FCD116" },
    });
    slide1.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0.6, w: "100%", h: 0.3,
      fill: { color: "3A75C4" },
    });
    slide1.addText("PLAN STRATÉGIQUE", {
      x: 0.5, y: 1.5, w: 9, h: 1,
      fontSize: 28, bold: true, color: "1a1a1a",
    });
    slide1.addText(plan.title, {
      x: 0.5, y: 2.5, w: 9, h: 0.8,
      fontSize: 20, color: "333333",
    });
    slide1.addText(`Cible : ${target.name} | ${plan.category} | ${year}`, {
      x: 0.5, y: 3.5, w: 9, h: 0.5,
      fontSize: 12, color: "666666",
    });

    // Slides IA
    if (ai) {
      const aiSlides: Array<{ title: string; items: string[] }> = [
        { title: "Besoins du pays", items: ai.countryNeeds },
        { title: "Capacités de l'opérateur", items: ai.operatorCapabilities },
        { title: "Bénéfices mutuels", items: ai.mutualBenefits },
        { title: "Points de négociation", items: ai.negotiationPoints },
        { title: "Agenda de réunion", items: ai.meetingAgenda },
        { title: "Risques identifiés", items: ai.risks },
      ];

      for (const s of aiSlides) {
        if (!s.items?.length) continue;
        const slide = pptx.addSlide();
        slide.addText(s.title, {
          x: 0.5, y: 0.3, w: 9, h: 0.8,
          fontSize: 22, bold: true, color: "1a1a1a",
        });
        const bulletText = s.items.map((item) => ({
          text: item,
          options: { fontSize: 14, color: "333333", bullet: true as const },
        }));
        slide.addText(bulletText, {
          x: 0.5, y: 1.3, w: 9, h: 4,
        });
      }
    }

    // Slide objectifs
    if (plan.objectives?.length) {
      const slide = pptx.addSlide();
      slide.addText("Objectifs", {
        x: 0.5, y: 0.3, w: 9, h: 0.8,
        fontSize: 22, bold: true, color: "1a1a1a",
      });
      const objText = plan.objectives.map((obj: { title: string; status: string }) => ({
        text: `${obj.title} — ${obj.status}`,
        options: { fontSize: 14, color: "333333", bullet: true as const },
      }));
      slide.addText(objText, { x: 0.5, y: 1.3, w: 9, h: 4 });
    }

    const pptxBuffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
    const pptxBlob = new Blob([pptxBuffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const pptxStorageId = await ctx.storage.store(pptxBlob);

    await ctx.runMutation(
      internal.functions.diplomaticFolders.internalAddDocument,
      {
        orgId: plan.orgId,
        folderId: folder._id,
        targetId: args.targetId,
        sourceType: "plan",
        sourceId: args.planId,
        subfolder: "Plans Stratégiques",
        filename: `Plan_${plan.category}_${sanitizedName}_${year}.pptx`,
        format: "pptx",
        storageId: pptxStorageId,
        sizeBytes: pptxBuffer.length,
      },
    );
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// LETTRE → DOCX + PDF
// ═════════════════════════════════════════════════════════════════════════════

export const generateLetterDocument = rawInternalAction({
  args: {
    letterId: v.id("diplomaticLetters"),
    targetId: v.id("diplomaticTargets"),
  },
  handler: async (ctx, args) => {
    const letter = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetLetter,
      { letterId: args.letterId },
    );
    if (!letter) return;

    const folder = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderByTarget,
      { targetId: args.targetId },
    );
    if (!folder) return;

    const sanitizedRef = sanitizeFilename(letter.reference);
    const sanitizedType = sanitizeFilename(letter.type);

    // ── DOCX ──
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } =
      await import("docx");

    const content = letter.content || letter.aiDraftContent || "";

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
            },
          },
          children: [
            // En-tête
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "CONSULAT GÉNÉRAL DE LA RÉPUBLIQUE GABONAISE", bold: true, size: 22, font: "Arial" }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Service des Affaires Diplomatiques", size: 18, font: "Arial", color: "666666" }),
              ],
              spacing: { after: 400 },
            }),
            // Référence
            new Paragraph({
              children: [
                new TextRun({ text: `Réf. : ${letter.reference}`, size: 20, font: "Arial", bold: true }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Date : ${formatDate(letter.createdAt)}`, size: 20, font: "Arial" }),
              ],
              spacing: { after: 400 },
            }),
            // Destinataire
            new Paragraph({
              children: [
                new TextRun({ text: `À l'attention de ${letter.recipientName}`, size: 20, font: "Arial", bold: true }),
              ],
            }),
            ...(letter.recipientTitle
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({ text: letter.recipientTitle, size: 20, font: "Arial" }),
                    ],
                  }),
                ]
              : []),
            ...(letter.recipientOrg
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({ text: letter.recipientOrg, size: 20, font: "Arial" }),
                    ],
                    spacing: { after: 400 },
                  }),
                ]
              : []),
            // Objet
            new Paragraph({
              children: [
                new TextRun({ text: "Objet : ", size: 20, font: "Arial", bold: true }),
                new TextRun({ text: letter.subject, size: 20, font: "Arial" }),
              ],
              spacing: { after: 400 },
            }),
            // Corps
            ...content.split("\n").map(
              (line: string) =>
                new Paragraph({
                  children: [new TextRun({ text: line, size: 20, font: "Arial" })],
                  spacing: { after: 120 },
                }),
            ),
          ],
        },
      ],
    });

    const docxBuffer = await Packer.toBuffer(doc);
    const docxBlob = new Blob([docxBuffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const docxStorageId = await ctx.storage.store(docxBlob);

    await ctx.runMutation(
      internal.functions.diplomaticFolders.internalAddDocument,
      {
        orgId: letter.orgId,
        folderId: folder._id,
        targetId: args.targetId,
        sourceType: "letter",
        sourceId: args.letterId,
        subfolder: "Lettres",
        filename: `${sanitizedRef}_${sanitizedType}.docx`,
        format: "docx",
        storageId: docxStorageId,
        sizeBytes: docxBuffer.byteLength,
      },
    );

    // ── PDF ──
    const { PDFDocument, StandardFonts, rgb: pdfRgb } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.create();
    const pdfFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pdfFontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([595.28, 841.89]);
    const { width: w, height: h } = page.getSize();
    let y = h - 50;

    // Bandeau tricolore
    page.drawRectangle({ x: 0, y: h - 8, width: w, height: 8, color: pdfRgb(GABON_GREEN.r / 255, GABON_GREEN.g / 255, GABON_GREEN.b / 255) });
    page.drawRectangle({ x: 0, y: h - 16, width: w, height: 8, color: pdfRgb(GABON_YELLOW.r / 255, GABON_YELLOW.g / 255, GABON_YELLOW.b / 255) });
    page.drawRectangle({ x: 0, y: h - 24, width: w, height: 8, color: pdfRgb(GABON_BLUE.r / 255, GABON_BLUE.g / 255, GABON_BLUE.b / 255) });
    y = h - 50;

    page.drawText("CONSULAT GÉNÉRAL DE LA RÉPUBLIQUE GABONAISE", {
      x: 100, y, size: 11, font: pdfFontBold, color: pdfRgb(0.1, 0.1, 0.1),
    });
    y -= 18;
    page.drawText("Service des Affaires Diplomatiques", {
      x: 160, y, size: 9, font: pdfFont, color: pdfRgb(0.4, 0.4, 0.4),
    });
    y -= 30;

    page.drawText(`Réf. : ${letter.reference}`, { x: 50, y, size: 10, font: pdfFontBold, color: pdfRgb(0.1, 0.1, 0.1) });
    y -= 16;
    page.drawText(`Date : ${formatDate(letter.createdAt)}`, { x: 50, y, size: 10, font: pdfFont, color: pdfRgb(0.2, 0.2, 0.2) });
    y -= 25;

    page.drawText(`À l'attention de ${letter.recipientName}`, { x: 50, y, size: 10, font: pdfFontBold, color: pdfRgb(0.1, 0.1, 0.1) });
    y -= 14;
    if (letter.recipientTitle) {
      page.drawText(letter.recipientTitle, { x: 50, y, size: 10, font: pdfFont, color: pdfRgb(0.2, 0.2, 0.2) });
      y -= 14;
    }
    if (letter.recipientOrg) {
      page.drawText(letter.recipientOrg, { x: 50, y, size: 10, font: pdfFont, color: pdfRgb(0.2, 0.2, 0.2) });
      y -= 14;
    }
    y -= 15;

    page.drawText(`Objet : ${letter.subject}`, { x: 50, y, size: 10, font: pdfFontBold, color: pdfRgb(0.1, 0.1, 0.1) });
    y -= 25;

    // Corps du texte
    const lines = content.split("\n");
    for (const line of lines) {
      const words = line.split(" ");
      let textLine = "";
      for (const word of words) {
        const test = textLine ? `${textLine} ${word}` : word;
        if (pdfFont.widthOfTextAtSize(test, 10) > w - 100) {
          page.drawText(textLine, { x: 50, y, size: 10, font: pdfFont, color: pdfRgb(0.1, 0.1, 0.1) });
          y -= 14;
          textLine = word;
          if (y < 60) {
            page = pdfDoc.addPage([595.28, 841.89]);
            y = h - 50;
          }
        } else {
          textLine = test;
        }
      }
      if (textLine) {
        page.drawText(textLine, { x: 50, y, size: 10, font: pdfFont, color: pdfRgb(0.1, 0.1, 0.1) });
        y -= 14;
      }
      y -= 4;
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const pdfStorageId = await ctx.storage.store(pdfBlob);

    await ctx.runMutation(
      internal.functions.diplomaticFolders.internalAddDocument,
      {
        orgId: letter.orgId,
        folderId: folder._id,
        targetId: args.targetId,
        sourceType: "letter",
        sourceId: args.letterId,
        subfolder: "Lettres",
        filename: `${sanitizedRef}_${sanitizedType}.pdf`,
        format: "pdf",
        storageId: pdfStorageId,
        sizeBytes: pdfBytes.length,
      },
    );
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// RAPPORT → PDF
// ═════════════════════════════════════════════════════════════════════════════

export const generateReportDocument = rawInternalAction({
  args: {
    reportId: v.id("diplomaticReports"),
    targetId: v.id("diplomaticTargets"),
  },
  handler: async (ctx, args) => {
    const report = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetReport,
      { reportId: args.reportId },
    );
    if (!report) return;

    const folder = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderByTarget,
      { targetId: args.targetId },
    );
    if (!folder) return;

    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    let y = height - 50;

    // Bandeau tricolore
    page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: rgb(GABON_GREEN.r / 255, GABON_GREEN.g / 255, GABON_GREEN.b / 255) });
    page.drawRectangle({ x: 0, y: height - 16, width, height: 8, color: rgb(GABON_YELLOW.r / 255, GABON_YELLOW.g / 255, GABON_YELLOW.b / 255) });
    page.drawRectangle({ x: 0, y: height - 24, width, height: 8, color: rgb(GABON_BLUE.r / 255, GABON_BLUE.g / 255, GABON_BLUE.b / 255) });
    y = height - 60;

    // Titre
    page.drawText("RAPPORT", { x: 50, y, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= 25;
    page.drawText(report.title, { x: 50, y, size: 14, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    y -= 20;
    page.drawText(`Type : ${report.type} | Destinataire : ${report.recipient} | ${report.period || ""}`, {
      x: 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4),
    });
    y -= 10;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 25;

    // Sommaire exécutif
    const summary = report.aiGeneratedSummary || report.summary;
    if (summary) {
      page.drawText("Sommaire exécutif", { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
      const words = summary.split(" ");
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, 10) > width - 120) {
          page.drawText(line, { x: 60, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
          y -= 14;
          line = word;
          if (y < 60) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50; }
        } else { line = test; }
      }
      if (line) { page.drawText(line, { x: 60, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) }); y -= 14; }
      y -= 15;
    }

    // Statistiques
    if (report.statistics) {
      page.drawText("Statistiques", { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
      const stats = report.statistics;
      const statLines = [
        `Cibles totales : ${stats.totalTargets}`,
        `Cibles contactées : ${stats.contactedTargets}`,
        `Réunions tenues : ${stats.meetingsHeld}`,
        `Projets initiés : ${stats.projectsInitiated}`,
      ];
      for (const sl of statLines) {
        page.drawText(`• ${sl}`, { x: 60, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
        y -= 14;
      }
      y -= 15;
    }

    // Corps
    const content = report.content;
    if (content) {
      page.drawText("Contenu", { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
      const contentLines = content.split("\n");
      for (const cl of contentLines) {
        const words = cl.split(" ");
        let line = "";
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(test, 10) > width - 120) {
            page.drawText(line, { x: 60, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
            y -= 14;
            line = word;
            if (y < 60) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50; }
          } else { line = test; }
        }
        if (line) { page.drawText(line, { x: 60, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) }); y -= 14; }
        y -= 4;
      }
    }

    // Pieds de page
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const p = pdfDoc.getPage(i);
      p.drawText(`Consulat.ga — Rapport | Page ${i + 1}/${totalPages}`, {
        x: 50, y: 25, size: 8, font, color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const storageId = await ctx.storage.store(pdfBlob);

    const sanitizedTitle = sanitizeFilename(report.title);
    const period = report.period ? sanitizeFilename(report.period) : new Date().getFullYear().toString();

    await ctx.runMutation(
      internal.functions.diplomaticFolders.internalAddDocument,
      {
        orgId: report.orgId,
        folderId: folder._id,
        targetId: args.targetId,
        sourceType: "report",
        sourceId: args.reportId,
        subfolder: "Rapports",
        filename: `Rapport_${report.type}_${period}.pdf`,
        format: "pdf",
        storageId,
        sizeBytes: pdfBytes.length,
      },
    );
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PROJET → DOCX + PDF
// ═════════════════════════════════════════════════════════════════════════════

export const generateProjectDocument = rawInternalAction({
  args: {
    projectId: v.id("diplomaticProjects"),
    targetId: v.id("diplomaticTargets"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetProject,
      { projectId: args.projectId },
    );
    if (!project) return;

    const target = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetTarget,
      { targetId: args.targetId },
    );
    if (!target) return;

    const folder = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderByTarget,
      { targetId: args.targetId },
    );
    if (!folder) return;

    const sanitizedRef = sanitizeFilename(project.reference);
    const sanitizedTitle = sanitizeFilename(project.title);

    // ── DOCX ──
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } =
      await import("docx");

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
            },
          },
          children: [
            // Titre
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "PROJET DE COOPÉRATION", bold: true, size: 28, font: "Arial" }),
              ],
              spacing: { after: 200 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: project.title, bold: true, size: 24, font: "Arial", color: "333333" }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `Réf. ${project.reference} | ${project.projectType} | Cible : ${target.name}`, size: 18, font: "Arial", color: "666666" }),
              ],
              spacing: { after: 400 },
            }),
            // Description
            ...(project.description
              ? [
                  new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    children: [new TextRun({ text: "Description", bold: true, size: 24, font: "Arial" })],
                    spacing: { after: 200 },
                  }),
                  ...project.description.split("\n").map(
                    (line: string) =>
                      new Paragraph({
                        children: [new TextRun({ text: line, size: 20, font: "Arial" })],
                        spacing: { after: 100 },
                      }),
                  ),
                ]
              : []),
            // Objectifs
            ...(project.objectives?.length
              ? [
                  new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    children: [new TextRun({ text: "Objectifs", bold: true, size: 24, font: "Arial" })],
                    spacing: { before: 300, after: 200 },
                  }),
                  ...project.objectives.map(
                    (obj: { title: string; status: string; deadline?: number }) =>
                      new Paragraph({
                        children: [
                          new TextRun({ text: `• ${obj.title}`, size: 20, font: "Arial" }),
                          new TextRun({ text: ` [${obj.status}]`, size: 20, font: "Arial", color: "666666" }),
                          ...(obj.deadline
                            ? [new TextRun({ text: ` — Échéance : ${formatDate(obj.deadline)}`, size: 18, font: "Arial", color: "999999" })]
                            : []),
                        ],
                        spacing: { after: 80 },
                      }),
                  ),
                ]
              : []),
            // Parties prenantes
            ...(project.stakeholders?.length
              ? [
                  new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    children: [new TextRun({ text: "Parties prenantes", bold: true, size: 24, font: "Arial" })],
                    spacing: { before: 300, after: 200 },
                  }),
                  ...project.stakeholders.map(
                    (s: { name: string; role: string; organization: string; contact?: string }) =>
                      new Paragraph({
                        children: [
                          new TextRun({ text: `• ${s.name}`, bold: true, size: 20, font: "Arial" }),
                          new TextRun({ text: ` — ${s.role}, ${s.organization}`, size: 20, font: "Arial" }),
                          ...(s.contact ? [new TextRun({ text: ` (${s.contact})`, size: 18, font: "Arial", color: "666666" })] : []),
                        ],
                        spacing: { after: 80 },
                      }),
                  ),
                ]
              : []),
            // Budget et dates
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text: "Informations clés", bold: true, size: 24, font: "Arial" })],
              spacing: { before: 300, after: 200 },
            }),
            ...(project.budget
              ? [new Paragraph({ children: [new TextRun({ text: `Budget : ${project.budget}`, size: 20, font: "Arial" })], spacing: { after: 80 } })]
              : []),
            ...(project.startDate
              ? [new Paragraph({ children: [new TextRun({ text: `Date début : ${formatDate(project.startDate)}`, size: 20, font: "Arial" })], spacing: { after: 80 } })]
              : []),
            ...(project.endDate
              ? [new Paragraph({ children: [new TextRun({ text: `Date fin : ${formatDate(project.endDate)}`, size: 20, font: "Arial" })], spacing: { after: 80 } })]
              : []),
            // Validation
            ...(project.validatedBy
              ? [
                  new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    children: [new TextRun({ text: "Validation", bold: true, size: 24, font: "Arial" })],
                    spacing: { before: 300, after: 200 },
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({ text: `Validé par : ${project.validatedBy}`, size: 20, font: "Arial" }),
                    ],
                    spacing: { after: 80 },
                  }),
                  ...(project.validationDate
                    ? [new Paragraph({ children: [new TextRun({ text: `Date : ${formatDate(project.validationDate)}`, size: 20, font: "Arial" })], spacing: { after: 80 } })]
                    : []),
                  ...(project.validationNotes
                    ? [new Paragraph({ children: [new TextRun({ text: `Notes : ${project.validationNotes}`, size: 20, font: "Arial" })], spacing: { after: 80 } })]
                    : []),
                ]
              : []),
          ],
        },
      ],
    });

    const docxBuffer = await Packer.toBuffer(doc);
    const docxBlob = new Blob([docxBuffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const docxStorageId = await ctx.storage.store(docxBlob);

    await ctx.runMutation(
      internal.functions.diplomaticFolders.internalAddDocument,
      {
        orgId: project.orgId,
        folderId: folder._id,
        targetId: args.targetId,
        sourceType: "project",
        sourceId: args.projectId,
        subfolder: "Projets",
        filename: `Projet_${sanitizedRef}_${sanitizedTitle}.docx`,
        format: "docx",
        storageId: docxStorageId,
        sizeBytes: docxBuffer.byteLength,
      },
    );

    // ── PDF ──
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.create();
    const pdfFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pdfFontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    let y = height - 50;

    // Bandeau tricolore
    page.drawRectangle({ x: 0, y: height - 8, width, height: 8, color: rgb(GABON_GREEN.r / 255, GABON_GREEN.g / 255, GABON_GREEN.b / 255) });
    page.drawRectangle({ x: 0, y: height - 16, width, height: 8, color: rgb(GABON_YELLOW.r / 255, GABON_YELLOW.g / 255, GABON_YELLOW.b / 255) });
    page.drawRectangle({ x: 0, y: height - 24, width, height: 8, color: rgb(GABON_BLUE.r / 255, GABON_BLUE.g / 255, GABON_BLUE.b / 255) });
    y = height - 60;

    page.drawText("PROJET DE COOPÉRATION", { x: 50, y, size: 18, font: pdfFontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= 25;
    page.drawText(project.title, { x: 50, y, size: 14, font: pdfFontBold, color: rgb(0.2, 0.2, 0.2) });
    y -= 20;
    page.drawText(`Réf. ${project.reference} | ${project.projectType} | Cible : ${target.name}`, {
      x: 50, y, size: 10, font: pdfFont, color: rgb(0.4, 0.4, 0.4),
    });
    y -= 10;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 25;

    const drawPdfWrapped = (text: string) => {
      const words = text.split(" ");
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (pdfFont.widthOfTextAtSize(test, 10) > width - 120) {
          page.drawText(line, { x: 60, y, size: 10, font: pdfFont, color: rgb(0.2, 0.2, 0.2) });
          y -= 14;
          line = word;
          if (y < 60) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50; }
        } else { line = test; }
      }
      if (line) { page.drawText(line, { x: 60, y, size: 10, font: pdfFont, color: rgb(0.2, 0.2, 0.2) }); y -= 14; }
    };

    if (project.description) {
      page.drawText("Description", { x: 50, y, size: 12, font: pdfFontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
      drawPdfWrapped(project.description);
      y -= 15;
    }

    if (project.objectives?.length) {
      page.drawText("Objectifs", { x: 50, y, size: 12, font: pdfFontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
      for (const obj of project.objectives) {
        page.drawText(`• ${obj.title} [${obj.status}]`, { x: 60, y, size: 10, font: pdfFont, color: rgb(0.2, 0.2, 0.2) });
        y -= 14;
        if (y < 60) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50; }
      }
      y -= 10;
    }

    if (project.stakeholders?.length) {
      page.drawText("Parties prenantes", { x: 50, y, size: 12, font: pdfFontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
      for (const s of project.stakeholders) {
        page.drawText(`• ${s.name} — ${s.role}, ${s.organization}`, { x: 60, y, size: 10, font: pdfFont, color: rgb(0.2, 0.2, 0.2) });
        y -= 14;
        if (y < 60) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50; }
      }
      y -= 10;
    }

    page.drawText("Informations clés", { x: 50, y, size: 12, font: pdfFontBold, color: rgb(0.2, 0.2, 0.2) });
    y -= 18;
    if (project.budget) { page.drawText(`Budget : ${project.budget}`, { x: 60, y, size: 10, font: pdfFont, color: rgb(0.2, 0.2, 0.2) }); y -= 14; }
    if (project.startDate) { page.drawText(`Début : ${formatDate(project.startDate)}`, { x: 60, y, size: 10, font: pdfFont, color: rgb(0.2, 0.2, 0.2) }); y -= 14; }
    if (project.endDate) { page.drawText(`Fin : ${formatDate(project.endDate)}`, { x: 60, y, size: 10, font: pdfFont, color: rgb(0.2, 0.2, 0.2) }); y -= 14; }

    if (project.validatedBy) {
      y -= 10;
      page.drawText("Validation", { x: 50, y, size: 12, font: pdfFontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
      page.drawText(`Validé par : ${project.validatedBy}`, { x: 60, y, size: 10, font: pdfFont, color: rgb(0.2, 0.2, 0.2) });
      y -= 14;
      if (project.validationDate) { page.drawText(`Date : ${formatDate(project.validationDate)}`, { x: 60, y, size: 10, font: pdfFont, color: rgb(0.2, 0.2, 0.2) }); y -= 14; }
    }

    // Pieds de page
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const p = pdfDoc.getPage(i);
      p.drawText(`Consulat.ga — Projet | Page ${i + 1}/${totalPages}`, {
        x: 50, y: 25, size: 8, font: pdfFont, color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const pdfStorageId = await ctx.storage.store(pdfBlob);

    await ctx.runMutation(
      internal.functions.diplomaticFolders.internalAddDocument,
      {
        orgId: project.orgId,
        folderId: folder._id,
        targetId: args.targetId,
        sourceType: "project",
        sourceId: args.projectId,
        subfolder: "Projets",
        filename: `Projet_${sanitizedRef}_${sanitizedTitle}.pdf`,
        format: "pdf",
        storageId: pdfStorageId,
        sizeBytes: pdfBytes.length,
      },
    );
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT ZIP
// ═════════════════════════════════════════════════════════════════════════════

export const exportAsZip = rawInternalAction({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args): Promise<{ zipUrl: string | null; zipStorageId: Id<"_storage">; fileCount: number }> => {
    const target: any = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetTarget,
      { targetId: args.targetId },
    );
    if (!target) throw new Error("Cible introuvable");

    const folder: any = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderByTarget,
      { targetId: args.targetId },
    );
    if (!folder) throw new Error("Dossier introuvable pour cette cible");

    const documents: any[] = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderDocuments,
      { folderId: folder._id },
    );

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    const basePath = `Opérateurs Économiques/${target.sector || "Autre"}/${target.name}`;

    for (const doc of documents) {
      const fileData = await ctx.storage.get(doc.storageId);
      if (!fileData) continue;

      const arrayBuffer = await fileData.arrayBuffer();
      const filePath = doc.subfolder
        ? `${basePath}/${doc.subfolder}/${doc.filename}`
        : `${basePath}/${doc.filename}`;

      zip.file(filePath, arrayBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const zipBlob = new Blob([zipBuffer as BlobPart], { type: "application/zip" });
    const zipStorageId = await ctx.storage.store(zipBlob);

    await ctx.runMutation(
      internal.functions.diplomaticFolders.internalMarkExported,
      { folderId: folder._id },
    );

    const zipUrl = await ctx.storage.getUrl(zipStorageId);
    return { zipUrl, zipStorageId, fileCount: documents.length };
  },
});
