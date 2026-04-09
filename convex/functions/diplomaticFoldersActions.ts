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

// ─── Charte graphique diplomatique ─────────────────────────────────────────

const COLORS = {
  BLEU_MARINE: "1B3A5C",
  VERT_FONCE: "0F766E",
  VERT_GABON: "009E49",
  GRIS_FONCE: "374151",
  GRIS_MOYEN: "6B7280",
  GRIS_CLAIR: "F9FAFB",
  BLANC: "FFFFFF",
  JAUNE_GABON: "FCD116",
  BLEU_GABON: "3A75C4",
  ROUGE_RISQUE: "DC2626",
  AMBER_MOYEN: "D97706",
  VERT_FAIBLE: "059669",
  HEADER_TABLE: "1B3A5C",
  HEADER_TEXT: "FFFFFF",
  ROW_ALT: "F9FAFB",
  BORDER: "D1D5DB",
  TINT_GREEN: "F0FDF4",
  TINT_AMBER: "FEF3C7",
  TINT_BLUE: "EFF6FF",
  TINT_RED: "FEF2F2",
};

const FONTS = {
  TITLE: "Georgia",
  HEADING: "Calibri",
  BODY: "Calibri",
};

// Factory pour shadow pptxgenjs (JAMAIS réutiliser un objet shadow)
const makeShadow = () => ({
  type: "outer" as const,
  blur: 4,
  offset: 2,
  angle: 135,
  color: "000000",
  opacity: 0.10,
});

// ─── Helpers PPTX partagés ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addFooterBand(slide: any) {
  const yb = 5.35;
  const bh = 0.06;
  slide.addShape("rect", { x: 0, y: yb, w: 10, h: bh, fill: { color: COLORS.VERT_GABON } });
  slide.addShape("rect", { x: 0, y: yb + bh, w: 10, h: bh, fill: { color: COLORS.JAUNE_GABON } });
  slide.addShape("rect", { x: 0, y: yb + bh * 2, w: 10, h: bh, fill: { color: COLORS.BLEU_GABON } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addSlideTitle(slide: any, title: string) {
  slide.addText(title, {
    x: 0.5, y: 0.2, w: 9, h: 0.6,
    fontSize: 22, bold: true, color: COLORS.BLEU_MARINE, fontFace: FONTS.TITLE,
  });
  slide.addShape("rect", { x: 0.5, y: 0.8, w: 2, h: 0.04, fill: { color: COLORS.VERT_GABON } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addPageNumber(slide: any, num: number, total: number) {
  slide.addText(`${num} / ${total}`, {
    x: 9, y: 5.1, w: 0.8, h: 0.3,
    fontSize: 8, color: COLORS.GRIS_MOYEN, fontFace: FONTS.BODY, align: "right",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addPptxTable(slide: any, headers: string[], rows: string[][], opts: { y?: number; colW?: number[] } = {}) {
  const tableRows = [
    headers.map(h => ({ text: h, options: { bold: true, color: COLORS.HEADER_TEXT, fill: { color: COLORS.HEADER_TABLE }, fontSize: 9, fontFace: FONTS.BODY } })),
    ...rows.map((row, ri) =>
      row.map(cell => ({
        text: cell || "",
        options: { fontSize: 8, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, fill: { color: ri % 2 ? COLORS.ROW_ALT : COLORS.BLANC } },
      })),
    ),
  ];
  slide.addTable(tableRows, {
    x: 0.5, y: opts.y ?? 1.0, w: 9,
    colW: opts.colW,
    border: { type: "solid", pt: 0.5, color: COLORS.BORDER },
    margin: [4, 6, 4, 6],
    autoPage: false,
  });
}

// ─── Helpers DOCX NTSAGUI Digital ─────────────────────────────────────────

const PAGE = {
  WIDTH: 12240, HEIGHT: 15840,
  MARGIN: 1440,
  CONTENT_W: 9360,
};

const DOC_BORDERS = {
  top: { style: "single" as const, size: 6, color: "D1D5DB" },
  bottom: { style: "single" as const, size: 6, color: "D1D5DB" },
  left: { style: "single" as const, size: 6, color: "D1D5DB" },
  right: { style: "single" as const, size: 6, color: "D1D5DB" },
};

const DOC_BORDERS_NONE = {
  top: { style: "none" as const, size: 0, color: "FFFFFF" },
  bottom: { style: "none" as const, size: 0, color: "FFFFFF" },
  left: { style: "none" as const, size: 0, color: "FFFFFF" },
  right: { style: "none" as const, size: 0, color: "FFFFFF" },
};

const CELL_MARGINS = { top: 120, bottom: 120, left: 160, right: 160 };

// ═════════════════════════════════════════════════════════════════════════════
// FICHE CIBLE → PDF
// ═════════════════════════════════════════════════════════════════════════════

export const generateTargetFiche = rawInternalAction({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

    // Recuperer les donnees
    const target = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetTarget,
      { targetId: args.targetId },
    );
    if (!target) {
      console.error(`[generateTargetFiche] Cible ${args.targetId} introuvable`);
      return;
    }

    const pipeline = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetTargetPipeline,
      { targetId: args.targetId },
    );

    const folder = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderByTarget,
      { targetId: args.targetId },
    );
    if (!folder) {
      console.error(`[generateTargetFiche] Dossier introuvable pour cible ${args.targetId}`);
      return;
    }

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
// PLAN STRATÉGIQUE → PPTX (13 slides) + DOCX + PDF
// ═════════════════════════════════════════════════════════════════════════════

// Couleur risque/probabilite → code couleur
function riskColor(level: string): string {
  if (level === "elevee" || level === "eleve") return COLORS.ROUGE_RISQUE;
  if (level === "moyenne" || level === "moyen") return COLORS.AMBER_MOYEN;
  return COLORS.VERT_FAIBLE;
}

// Label urgence lisible
function urgenceLabel(u: string): string {
  if (u === "immediate") return "Immédiate";
  if (u === "court_terme") return "Court terme";
  return "Moyen terme";
}

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
    if (!plan) {
      console.error(`[generatePlanDocument] Plan ${args.planId} introuvable`);
      return;
    }

    const target = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetTarget,
      { targetId: args.targetId },
    );
    if (!target) {
      console.error(`[generatePlanDocument] Cible ${args.targetId} introuvable`);
      return;
    }

    const folder = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderByTarget,
      { targetId: args.targetId },
    );
    if (!folder) {
      console.error(
        `[generatePlanDocument] Dossier introuvable pour cible ${args.targetId}. Le dossier operateur n'a pas encore ete cree.`,
      );
      return;
    }

    console.log(
      `[generatePlanDocument] Generation documents pour plan ${args.planId}, cible ${target.name}, dossier ${folder._id}`,
    );

    const sanitizedName = sanitizeFilename(plan.title);
    const year = new Date().getFullYear();
    const dateStr = formatDate(Date.now());

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sa = (plan as any).strategicAnalysis as {
      diagnosticSectoriel: {
        contexteMacro: string;
        forcesGabon: string[];
        contraintesGabon: string[];
        partiesPrenantes: { nom: string; role: string; influence: string }[];
        benchmark: { pays: string; description: string; leconsApprises: string }[];
      };
      pointsAveugles: {
        economiePolitique: string;
        risquesGeopolitiques: string;
        facteursSociaux: string;
        contraintesTerrain: string[];
      };
      analyseOperateur: {
        profilComplet: string;
        capacitesCles: string[];
        realisationsMarquantes: { projet: string; pays: string; resultat: string }[];
        presenceAfrique?: string;
        alignementPriorites: string;
      };
      cadrePartenariat: {
        besoinsGabon: { besoin: string; secteur: string; urgence: string; estimationBudget?: string }[];
        offreOperateur: { capacite: string; instrument: string; conditions?: string }[];
        beneficesMutuels: string[];
        modelesFinancement: { type: string; description: string; montantEstime?: string }[];
        scenariosPartenariat: { scenario: string; description: string; investissementEstime?: string; delaiMiseEnOeuvre?: string }[];
      };
      strategieApproche: {
        argumentaire: string[];
        negotiationPoints: string[];
        concessions: string[];
        lignesRouges: string[];
        chronologieApproche: { etape: string; action: string; responsable: string; delai: string }[];
      };
      preparationReunion: {
        agenda: { point: string; duree: string; objectif: string }[];
        dossiersAFournir: string[];
        questionsStrategiques: string[];
        profilsAInviter: string[];
      };
      risques: { risque: string; probabilite: string; impact: string; mitigation: string }[];
    } | undefined;

    // ────────────────────────────────────────────────────────────────────────
    // Branche enrichie : strategicAnalysis existe → PPTX 11 slides + DOCX 8 Parties + PDF
    // ────────────────────────────────────────────────────────────────────────
    if (sa) {
      const TOTAL_SLIDES = 11;
      const scenarioLabels: Record<string, string> = { ambitieux: "Ambitieux", realiste: "Réaliste", minimal: "Minimal" };

      // ── PPTX professionnel (11 slides) NTSAGUI Digital ─────────────────
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      pptx.author = "NTSAGUI Digital — Affaires Diplomatiques";
      pptx.title = plan.title;
      pptx.subject = `Plan Stratégique — ${target.name}`;

      // SLIDE 1 — Couverture (blanc, titre VERT_GABON)
      const s1 = pptx.addSlide();
      s1.addShape("rect", { x: 0, y: 0, w: 10, h: 5.625, fill: { color: COLORS.BLANC } });
      s1.addShape("rect", { x: 0, y: 0, w: 10, h: 0.06, fill: { color: COLORS.VERT_GABON } });
      s1.addShape("rect", { x: 0, y: 0.06, w: 10, h: 0.06, fill: { color: COLORS.JAUNE_GABON } });
      s1.addShape("rect", { x: 0, y: 0.12, w: 10, h: 0.06, fill: { color: COLORS.BLEU_GABON } });
      s1.addText("PLAN STRATÉGIQUE", {
        x: 0.8, y: 1.0, w: 8.4, h: 0.9,
        fontSize: 34, bold: true, color: COLORS.VERT_GABON, fontFace: FONTS.TITLE,
        shadow: makeShadow(),
      });
      s1.addText(plan.title, {
        x: 0.8, y: 1.9, w: 8.4, h: 0.7,
        fontSize: 20, color: COLORS.GRIS_FONCE, fontFace: FONTS.HEADING,
      });
      s1.addShape("rect", { x: 0.8, y: 2.7, w: 3, h: 0.04, fill: { color: COLORS.VERT_GABON } });
      s1.addText(`Cible : ${target.name}`, {
        x: 0.8, y: 3.0, w: 8.4, h: 0.5,
        fontSize: 16, color: COLORS.BLEU_MARINE, fontFace: FONTS.BODY,
      });
      s1.addText(`${target.sector || ""} | ${target.country || ""} | ${dateStr}`, {
        x: 0.8, y: 3.5, w: 8.4, h: 0.4,
        fontSize: 12, color: COLORS.GRIS_MOYEN, fontFace: FONTS.BODY,
      });
      s1.addText("CONFIDENTIEL", {
        x: 0.8, y: 4.6, w: 3, h: 0.35,
        fontSize: 10, bold: true, color: COLORS.ROUGE_RISQUE, fontFace: FONTS.BODY,
      });
      addFooterBand(s1);
      addPageNumber(s1, 1, TOTAL_SLIDES);

      // SLIDE 2 — Sommaire (8 parties)
      const s2 = pptx.addSlide();
      addSlideTitle(s2, "Sommaire");
      addFooterBand(s2);
      addPageNumber(s2, 2, TOTAL_SLIDES);
      const sommaireParts = [
        "I. Résumé Exécutif",
        "II. Diagnostic Sectoriel",
        "III. Analyse du Partenaire",
        "IV. Objectifs Stratégiques",
        "V. Scénarios d'Action",
        "VI. Plan d'Action Opérationnel",
        "VII. Budget et Ressources",
        "VIII. Risques et Mesures d'Atténuation",
      ];
      const sommaireBullets = sommaireParts.map(p => ({
        text: p, options: { fontSize: 14, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, bullet: true as const },
      }));
      s2.addText(sommaireBullets, { x: 1.5, y: 1.1, w: 7, h: 3.8, valign: "top" as const, lineSpacingMultiple: 1.6 });

      // SLIDE 3 — Resume Executif (recap table + KPI cards)
      const s3 = pptx.addSlide();
      addSlideTitle(s3, "I \u2014 Résumé Exécutif");
      addFooterBand(s3);
      addPageNumber(s3, 3, TOTAL_SLIDES);
      const summaryText = plan.summary || sa.diagnosticSectoriel.contexteMacro;
      if (summaryText) {
        addPptxTable(s3,
          ["Élément", "Détail"],
          [
            ["Cible", target.name],
            ["Secteur", target.sector || "N/A"],
            ["Pays", target.country || "N/A"],
            ["Priorité", target.priority || "N/A"],
            ["Catégorie", plan.category],
          ],
          { y: 1.0, colW: [2.5, 6.5] },
        );
      }
      // KPI cards
      const kpiItems = [
        { label: "Score Opportunité", value: `${target.opportunityScore ?? "N/A"}`, unit: "/ 100" },
        { label: "Scénarios", value: `${sa.cadrePartenariat.scenariosPartenariat.length}`, unit: "définis" },
        { label: "Risques", value: `${sa.risques?.length || 0}`, unit: "identifiés" },
      ];
      kpiItems.forEach((kpi, idx) => {
        const kx = 0.5 + idx * 3.1;
        s3.addShape("rect", { x: kx, y: 3.6, w: 2.8, h: 1.2, fill: { color: COLORS.GRIS_CLAIR }, rectRadius: 0.1, shadow: makeShadow() });
        s3.addText(kpi.value, {
          x: kx + 0.1, y: 3.65, w: 2.6, h: 0.6,
          fontSize: 28, bold: true, color: COLORS.VERT_GABON, fontFace: FONTS.TITLE, align: "center",
        });
        s3.addText(`${kpi.label} ${kpi.unit}`, {
          x: kx + 0.1, y: 4.3, w: 2.6, h: 0.35,
          fontSize: 10, color: COLORS.GRIS_MOYEN, fontFace: FONTS.BODY, align: "center",
        });
      });

      // SLIDE 4 — Diagnostic Sectoriel (forces/faiblesses + SWOT + benchmark)
      const s4 = pptx.addSlide();
      addSlideTitle(s4, "II \u2014 Diagnostic Sectoriel");
      addFooterBand(s4);
      addPageNumber(s4, 4, TOTAL_SLIDES);
      s4.addShape("rect", { x: 0.5, y: 1.0, w: 4.2, h: 0.35, fill: { color: COLORS.VERT_FONCE }, rectRadius: 0.05 });
      s4.addText("Forces du Gabon", { x: 0.6, y: 1.02, w: 4, h: 0.3, fontSize: 10, bold: true, color: COLORS.BLANC, fontFace: FONTS.HEADING });
      const forcesBullets = sa.diagnosticSectoriel.forcesGabon.slice(0, 5).map(f => ({
        text: f, options: { fontSize: 9, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, bullet: true as const },
      }));
      s4.addText(forcesBullets, { x: 0.5, y: 1.45, w: 4.2, h: 1.5, valign: "top" as const });
      s4.addShape("rect", { x: 5.3, y: 1.0, w: 4.2, h: 0.35, fill: { color: COLORS.ROUGE_RISQUE }, rectRadius: 0.05 });
      s4.addText("Contraintes", { x: 5.4, y: 1.02, w: 4, h: 0.3, fontSize: 10, bold: true, color: COLORS.BLANC, fontFace: FONTS.HEADING });
      const contraintesBullets = sa.diagnosticSectoriel.contraintesGabon.slice(0, 5).map(c => ({
        text: c, options: { fontSize: 9, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, bullet: true as const },
      }));
      s4.addText(contraintesBullets, { x: 5.3, y: 1.45, w: 4.2, h: 1.5, valign: "top" as const });
      // SWOT summary
      const swotThreats = sa.pointsAveugles.contraintesTerrain.slice(0, 2).join("; ") || sa.pointsAveugles.risquesGeopolitiques.substring(0, 80);
      const swotOpportunities = sa.diagnosticSectoriel.benchmark?.slice(0, 2).map(b => b.leconsApprises.substring(0, 40)).join("; ") || "Benchmark international";
      addPptxTable(s4,
        ["Forces (S)", "Faiblesses (W)"],
        [
          [sa.diagnosticSectoriel.forcesGabon.slice(0, 2).join("; ").substring(0, 80), sa.diagnosticSectoriel.contraintesGabon.slice(0, 2).join("; ").substring(0, 80)],
          [`Opportunités: ${swotOpportunities.substring(0, 70)}`, `Menaces: ${swotThreats.substring(0, 70)}`],
        ],
        { y: 3.1, colW: [4.5, 4.5] },
      );
      if (sa.diagnosticSectoriel.benchmark?.length) {
        addPptxTable(s4,
          ["Pays", "Leçons apprises"],
          sa.diagnosticSectoriel.benchmark.slice(0, 2).map(b => [b.pays, b.leconsApprises.substring(0, 80)]),
          { y: 4.4, colW: [2, 7] },
        );
      }

      // SLIDE 5 — Analyse Partenaire
      const s5 = pptx.addSlide();
      addSlideTitle(s5, "III \u2014 Analyse du Partenaire");
      addFooterBand(s5);
      addPageNumber(s5, 5, TOTAL_SLIDES);
      s5.addText(sa.analyseOperateur.profilComplet.substring(0, 400) + (sa.analyseOperateur.profilComplet.length > 400 ? "..." : ""), {
        x: 0.5, y: 1.0, w: 5.5, h: 1.2,
        fontSize: 10, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, lineSpacingMultiple: 1.2, valign: "top",
      });
      s5.addShape("rect", { x: 6.3, y: 1.0, w: 3.2, h: 2.0, fill: { color: COLORS.GRIS_CLAIR }, rectRadius: 0.1, shadow: makeShadow() });
      s5.addText("Capacités Clés", {
        x: 6.4, y: 1.05, w: 3, h: 0.3,
        fontSize: 10, bold: true, color: COLORS.VERT_FONCE, fontFace: FONTS.HEADING, align: "center",
      });
      const capBullets = sa.analyseOperateur.capacitesCles.slice(0, 5).map(c => ({
        text: c, options: { fontSize: 8, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, bullet: true as const },
      }));
      s5.addText(capBullets, { x: 6.4, y: 1.4, w: 3, h: 1.5, valign: "top" as const });
      if (sa.analyseOperateur.realisationsMarquantes?.length) {
        addPptxTable(s5,
          ["Projet", "Pays", "Résultat"],
          sa.analyseOperateur.realisationsMarquantes.slice(0, 4).map(r => [r.projet.substring(0, 40), r.pays, r.resultat.substring(0, 50)]),
          { y: 3.3, colW: [3.5, 1.5, 4] },
        );
      }

      // SLIDE 6 — Objectifs Strategiques
      const s6 = pptx.addSlide();
      addSlideTitle(s6, "IV \u2014 Objectifs Stratégiques");
      addFooterBand(s6);
      addPageNumber(s6, 6, TOTAL_SLIDES);
      if (sa.analyseOperateur.alignementPriorites) {
        s6.addText(`Vision : ${sa.analyseOperateur.alignementPriorites.substring(0, 300)}`, {
          x: 0.5, y: 1.0, w: 9, h: 0.8,
          fontSize: 10, italic: true, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, lineSpacingMultiple: 1.2, valign: "top",
        });
      }
      const objectivesRows: string[][] = [];
      if (plan.objectives?.length) {
        for (const obj of plan.objectives as { title: string; status: string; horizon?: string }[]) {
          objectivesRows.push([obj.title, obj.horizon || "Court terme", obj.status === "completed" ? "Atteint" : obj.status === "in_progress" ? "En cours" : "A faire"]);
        }
      }
      for (const bm of sa.cadrePartenariat.beneficesMutuels.slice(0, 3)) {
        objectivesRows.push([bm.substring(0, 60), "Long terme", "Planifié"]);
      }
      if (objectivesRows.length) {
        addPptxTable(s6,
          ["Objectif", "Horizon", "Statut"],
          objectivesRows.slice(0, 8),
          { y: 2.0, colW: [5, 2, 2] },
        );
      }

      // SLIDE 7 — Scenarios d'Action
      const s7 = pptx.addSlide();
      addSlideTitle(s7, "V \u2014 Scénarios d'Action");
      addFooterBand(s7);
      addPageNumber(s7, 7, TOTAL_SLIDES);
      const scenarioColors: Record<string, string> = { ambitieux: COLORS.BLEU_GABON, realiste: COLORS.VERT_GABON, minimal: COLORS.AMBER_MOYEN };
      sa.cadrePartenariat.scenariosPartenariat.slice(0, 3).forEach((sc, idx) => {
        const sx = 0.5 + idx * 3.1;
        s7.addShape("rect", { x: sx, y: 1.0, w: 2.8, h: 2.5, fill: { color: COLORS.BLANC }, rectRadius: 0.1, shadow: makeShadow() });
        s7.addShape("rect", { x: sx, y: 1.0, w: 2.8, h: 0.4, fill: { color: scenarioColors[sc.scenario] || COLORS.GRIS_MOYEN }, rectRadius: 0.1 });
        s7.addText(scenarioLabels[sc.scenario] || sc.scenario, {
          x: sx + 0.1, y: 1.03, w: 2.6, h: 0.35,
          fontSize: 12, bold: true, color: COLORS.BLANC, fontFace: FONTS.HEADING, align: "center",
        });
        s7.addText(sc.description.substring(0, 180) + (sc.description.length > 180 ? "..." : ""), {
          x: sx + 0.15, y: 1.5, w: 2.5, h: 1.3,
          fontSize: 8, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, lineSpacingMultiple: 1.2, valign: "top",
        });
        if (sc.investissementEstime) {
          s7.addText(`Invest. : ${sc.investissementEstime}`, {
            x: sx + 0.15, y: 2.85, w: 2.5, h: 0.25,
            fontSize: 8, bold: true, color: COLORS.VERT_FONCE, fontFace: FONTS.BODY,
          });
        }
        if (sc.delaiMiseEnOeuvre) {
          s7.addText(`Délai : ${sc.delaiMiseEnOeuvre}`, {
            x: sx + 0.15, y: 3.1, w: 2.5, h: 0.25,
            fontSize: 8, color: COLORS.GRIS_MOYEN, fontFace: FONTS.BODY,
          });
        }
      });
      if (sa.cadrePartenariat.scenariosPartenariat.length > 1) {
        addPptxTable(s7,
          ["Scénario", "Investissement", "Délai"],
          sa.cadrePartenariat.scenariosPartenariat.slice(0, 3).map(sc => [
            scenarioLabels[sc.scenario] || sc.scenario,
            sc.investissementEstime || "N/A",
            sc.delaiMiseEnOeuvre || "N/A",
          ]),
          { y: 3.6, colW: [3, 3, 3] },
        );
      }

      // SLIDE 8 — Plan d'Action (chronologie + preparation reunion)
      const s8 = pptx.addSlide();
      addSlideTitle(s8, "VI \u2014 Plan d'Action Opérationnel");
      addFooterBand(s8);
      addPageNumber(s8, 8, TOTAL_SLIDES);
      if (sa.strategieApproche.chronologieApproche?.length) {
        addPptxTable(s8,
          ["Étape", "Action", "Responsable", "Délai"],
          sa.strategieApproche.chronologieApproche.slice(0, 5).map(c => [c.etape, c.action.substring(0, 50), c.responsable, c.delai]),
          { y: 1.0, colW: [1.5, 4, 2, 1.5] },
        );
      }
      const prepY = 1.0 + Math.min(sa.strategieApproche.chronologieApproche?.length || 0, 5) * 0.35 + 0.8;
      if (sa.preparationReunion.agenda?.length) {
        s8.addText("Préparation de réunion :", {
          x: 0.5, y: prepY, w: 4.5, h: 0.3,
          fontSize: 10, bold: true, color: COLORS.VERT_FONCE, fontFace: FONTS.HEADING,
        });
        const agendaBullets = sa.preparationReunion.agenda.slice(0, 3).map(a => ({
          text: `${a.point} (${a.duree})`, options: { fontSize: 8, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, bullet: true as const },
        }));
        s8.addText(agendaBullets, { x: 0.5, y: prepY + 0.35, w: 4.5, h: 1.2, valign: "top" as const });
      }
      if (sa.preparationReunion.profilsAInviter?.length) {
        s8.addText("Délégation :", {
          x: 5.3, y: prepY, w: 4.2, h: 0.3,
          fontSize: 10, bold: true, color: COLORS.VERT_FONCE, fontFace: FONTS.HEADING,
        });
        const delegBullets = sa.preparationReunion.profilsAInviter.slice(0, 4).map(p => ({
          text: p, options: { fontSize: 8, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, bullet: true as const },
        }));
        s8.addText(delegBullets, { x: 5.3, y: prepY + 0.35, w: 4.2, h: 1.2, valign: "top" as const });
      }

      // SLIDE 9 — Budget et Ressources
      const s9 = pptx.addSlide();
      addSlideTitle(s9, "VII \u2014 Budget et Ressources");
      addFooterBand(s9);
      addPageNumber(s9, 9, TOTAL_SLIDES);
      addPptxTable(s9,
        ["Type de financement", "Description", "Montant estimé"],
        sa.cadrePartenariat.modelesFinancement.slice(0, 5).map(m => [
          m.type, m.description.substring(0, 70), m.montantEstime || "À déterminer",
        ]),
        { y: 1.0, colW: [2.5, 4.5, 2] },
      );
      if (sa.cadrePartenariat.besoinsGabon?.length) {
        addPptxTable(s9,
          ["Besoin", "Secteur", "Urgence", "Budget"],
          sa.cadrePartenariat.besoinsGabon.slice(0, 4).map(b => [
            b.besoin.substring(0, 40), b.secteur, urgenceLabel(b.urgence), b.estimationBudget || "N/A",
          ]),
          { y: 3.2, colW: [3, 2, 2, 2] },
        );
      }

      // SLIDE 10 — Risques (colored risk matrix)
      const s10 = pptx.addSlide();
      addSlideTitle(s10, "VIII \u2014 Risques et Mesures");
      addFooterBand(s10);
      addPageNumber(s10, 10, TOTAL_SLIDES);
      if (sa.risques?.length) {
        const riskHeaders = ["Risque", "Probabilité", "Impact", "Mitigation"];
        const riskDataRows = sa.risques.slice(0, 6).map(r => [
          r.risque.substring(0, 50), r.probabilite, r.impact, r.mitigation.substring(0, 60),
        ]);
        const riskTableRows = [
          riskHeaders.map(h => ({ text: h, options: { bold: true, color: COLORS.HEADER_TEXT, fill: { color: COLORS.VERT_FONCE }, fontSize: 9, fontFace: FONTS.BODY } })),
          ...riskDataRows.map((row, ri) => row.map((cell, ci) => ({
            text: cell || "",
            options: {
              fontSize: 8, fontFace: FONTS.BODY,
              color: (ci === 1 || ci === 2) ? riskColor(cell) : COLORS.GRIS_FONCE,
              bold: ci === 1 || ci === 2,
              fill: { color: ri % 2 ? COLORS.ROW_ALT : COLORS.BLANC },
            },
          }))),
        ];
        s10.addTable(riskTableRows, {
          x: 0.5, y: 1.0, w: 9,
          colW: [2.5, 1.5, 1.5, 3.5],
          border: { type: "solid", pt: 0.5, color: COLORS.BORDER },
          margin: [4, 6, 4, 6],
          autoPage: false,
        });
      }

      // SLIDE 11 — Conclusion (4 piliers + call to action)
      const s11 = pptx.addSlide();
      addSlideTitle(s11, "Conclusion & Prochaines Étapes");
      addFooterBand(s11);
      addPageNumber(s11, 11, TOTAL_SLIDES);
      const pillars = [
        { title: "Diagnostic", icon: "Analyse sectorielle complète", accent: COLORS.BLEU_GABON },
        { title: "Partenariat", icon: `${sa.cadrePartenariat.scenariosPartenariat.length} scénarios définis`, accent: COLORS.VERT_GABON },
        { title: "Action", icon: `${sa.strategieApproche.chronologieApproche?.length || 0} étapes planifiées`, accent: COLORS.AMBER_MOYEN },
        { title: "Risques", icon: `${sa.risques?.length || 0} risques mitigés`, accent: COLORS.ROUGE_RISQUE },
      ];
      pillars.forEach((p, idx) => {
        const px = 0.5 + idx * 2.35;
        s11.addShape("rect", { x: px, y: 1.0, w: 2.1, h: 1.8, fill: { color: COLORS.BLANC }, rectRadius: 0.1, shadow: makeShadow() });
        s11.addShape("rect", { x: px, y: 1.0, w: 2.1, h: 0.35, fill: { color: p.accent }, rectRadius: 0.08 });
        s11.addText(p.title, {
          x: px + 0.1, y: 1.03, w: 1.9, h: 0.3,
          fontSize: 11, bold: true, color: COLORS.BLANC, fontFace: FONTS.HEADING, align: "center",
        });
        s11.addText(p.icon, {
          x: px + 0.1, y: 1.5, w: 1.9, h: 0.6,
          fontSize: 9, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, align: "center", valign: "middle",
        });
      });
      s11.addShape("rect", { x: 0.5, y: 3.2, w: 9, h: 1.5, fill: { color: COLORS.GRIS_CLAIR }, rectRadius: 0.1, shadow: makeShadow() });
      s11.addText("Recommandation", {
        x: 0.7, y: 3.3, w: 8.6, h: 0.35,
        fontSize: 12, bold: true, color: COLORS.VERT_GABON, fontFace: FONTS.HEADING,
      });
      if (sa.strategieApproche.chronologieApproche?.length) {
        const nextStepsBullets = sa.strategieApproche.chronologieApproche.slice(0, 3).map(ch => ({
          text: `${ch.etape} : ${ch.action} (${ch.delai})`,
          options: { fontSize: 9, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, bullet: true as const },
        }));
        s11.addText(nextStepsBullets, { x: 0.7, y: 3.7, w: 8.6, h: 1.0, valign: "top" as const });
      }

      // Sauvegarde PPTX
      const pptxBuffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
      const pptxBlob = new Blob([pptxBuffer as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      const pptxStorageId = await ctx.storage.store(pptxBlob);
      await ctx.runMutation(
        internal.functions.diplomaticFolders.internalAddDocument,
        {
          orgId: plan.orgId, folderId: folder._id, targetId: args.targetId,
          sourceType: "plan", sourceId: args.planId,
          subfolder: "Plans Stratégiques",
          filename: `Plan_${plan.category}_${sanitizedName}_${year}.pptx`,
          format: "pptx", storageId: pptxStorageId, sizeBytes: pptxBuffer.length,
        },
      );

      // ── DOCX professionnel — 8 Parties NTSAGUI Digital ─────────────────
      const {
        Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle,
        Header, Footer, PageNumber: DocxPageNumber, NumberFormat, PageBreak,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } = await import("docx") as any;

      const bodyPara = (text: string, opts?: { bold?: boolean; italic?: boolean; spacing?: number }) =>
        new Paragraph({
          alignment: AlignmentType.BOTH,
          children: [new TextRun({ text, size: 22, font: FONTS.BODY, bold: opts?.bold, italics: opts?.italic, color: COLORS.GRIS_FONCE })],
          spacing: { after: opts?.spacing ?? 120, line: 276 },
        });

      const docH1 = (text: string) =>
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: text.toUpperCase(), size: 28, font: FONTS.TITLE, bold: true, color: COLORS.VERT_GABON })],
          spacing: { before: 400, after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.VERT_GABON } },
        });

      const docH2 = (text: string) =>
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text, size: 24, font: FONTS.HEADING, bold: true, underline: {}, color: COLORS.VERT_FONCE })],
          spacing: { before: 200, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.VERT_FONCE } },
        });

      const docH3 = (text: string) =>
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text, size: 22, font: FONTS.HEADING, bold: true, color: COLORS.BLEU_MARINE })],
          spacing: { before: 160, after: 80 },
        });

      const docH4 = (text: string) =>
        new Paragraph({
          children: [new TextRun({ text, size: 22, font: FONTS.HEADING, bold: true, italics: true, color: COLORS.GRIS_FONCE })],
          spacing: { before: 120, after: 60 },
        });

      const bulletPara = (text: string) =>
        new Paragraph({
          alignment: AlignmentType.BOTH,
          children: [new TextRun({ text, size: 22, font: FONTS.BODY, color: COLORS.GRIS_FONCE })],
          bullet: { level: 0 },
          spacing: { after: 60, line: 276 },
        });

      const mkCell = (text: string, opts?: { bold?: boolean; fill?: string; width?: number; color?: string }) =>
        new TableCell({
          width: { size: opts?.width ?? Math.floor(PAGE.CONTENT_W / 3), type: WidthType.DXA },
          shading: opts?.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
          borders: DOC_BORDERS,
          children: [new Paragraph({
            children: [new TextRun({
              text, size: 20, font: FONTS.BODY,
              bold: opts?.bold, color: opts?.color ?? COLORS.GRIS_FONCE,
            })],
            spacing: { before: 40, after: 40 },
          })],
          margins: CELL_MARGINS,
        });

      const mkTable = (headers: string[], rows: string[][], colWidths: number[]) =>
        new Table({
          columnWidths: colWidths,
          rows: [
            new TableRow({
              children: headers.map((h: string, i: number) => mkCell(h, { bold: true, fill: COLORS.VERT_FONCE, color: COLORS.HEADER_TEXT, width: colWidths[i] })),
              tableHeader: true,
            }),
            ...rows.map((row: string[], ri: number) =>
              new TableRow({
                children: row.map((cell: string, ci: number) => mkCell(cell, { width: colWidths[ci], fill: ri % 2 ? COLORS.ROW_ALT : undefined })),
              }),
            ),
          ],
          width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
        });

      // InfoBox: Table 1-col 2-rows, accent header + tint body
      const infoBox = (title: string, content: string, accentColor: string, tintColor: string) =>
        new Table({
          columnWidths: [PAGE.CONTENT_W],
          rows: [
            new TableRow({
              children: [new TableCell({
                width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
                shading: { fill: accentColor, type: ShadingType.CLEAR, color: "auto" },
                borders: DOC_BORDERS_NONE,
                children: [new Paragraph({
                  children: [new TextRun({ text: title, size: 22, font: FONTS.HEADING, bold: true, color: COLORS.BLANC })],
                  spacing: { before: 60, after: 60 },
                })],
                margins: CELL_MARGINS,
              })],
            }),
            new TableRow({
              children: [new TableCell({
                width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
                shading: { fill: tintColor, type: ShadingType.CLEAR, color: "auto" },
                borders: DOC_BORDERS_NONE,
                children: [new Paragraph({
                  alignment: AlignmentType.BOTH,
                  children: [new TextRun({ text: content, size: 22, font: FONTS.BODY, color: COLORS.GRIS_FONCE })],
                  spacing: { before: 80, after: 80, line: 276 },
                })],
                margins: CELL_MARGINS,
              })],
            }),
          ],
          width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
        });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docChildren: any[] = [];

      // ─── COVER PAGE ───
      docChildren.push(
        new Paragraph({ spacing: { before: 1600 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "RÉPUBLIQUE GABONAISE", size: 26, font: FONTS.HEADING, bold: true, color: COLORS.VERT_GABON })], spacing: { after: 60 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Union \u2013 Travail \u2013 Justice", size: 20, font: FONTS.BODY, italics: true, color: COLORS.GRIS_MOYEN })], spacing: { after: 500 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PLAN STRATÉGIQUE", size: 44, font: FONTS.TITLE, bold: true, color: COLORS.VERT_GABON })], spacing: { after: 200 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: plan.title, size: 28, font: FONTS.HEADING, color: COLORS.GRIS_FONCE })], spacing: { after: 200 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Cible : ${target.name}`, size: 24, font: FONTS.BODY, color: COLORS.BLEU_MARINE })], spacing: { after: 100 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Auteur : NTSAGUI Digital`, size: 20, font: FONTS.BODY, color: COLORS.GRIS_MOYEN })], spacing: { after: 60 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Date : ${dateStr}`, size: 20, font: FONTS.BODY, color: COLORS.GRIS_MOYEN })], spacing: { after: 60 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Réf. : PS-${plan.category}-${year}-${target.name.substring(0, 10).replace(/\s/g, "")}`, size: 20, font: FONTS.BODY, color: COLORS.GRIS_MOYEN })], spacing: { after: 400 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CONFIDENTIEL", size: 24, font: FONTS.HEADING, bold: true, color: COLORS.ROUGE_RISQUE })], spacing: { after: 200 } }),
        new Paragraph({ children: [new PageBreak()] }),
      );

      // ─── TABLE OF CONTENTS ───
      const tocEntries = [
        { num: "I", title: "Résumé Exécutif", subs: ["Synthèse", "Indicateurs clés"] },
        { num: "II", title: "Diagnostic Sectoriel", subs: ["Contexte", "Forces et faiblesses", "SWOT", "Parties prenantes", "Benchmark"] },
        { num: "III", title: "Analyse du Partenaire", subs: ["Profil", "Capacités", "Réalisations", "Présence en Afrique"] },
        { num: "IV", title: "Objectifs Stratégiques", subs: ["Vision", "Court terme", "Moyen terme", "Long terme"] },
        { num: "V", title: "Scénarios d'Action", subs: ["Scénarios", "Comparaison", "Recommandation"] },
        { num: "VI", title: "Plan d'Action Opérationnel", subs: ["Chronologie", "Préparation de réunion"] },
        { num: "VII", title: "Budget et Ressources", subs: ["Modèles de financement", "Besoins et budgets"] },
        { num: "VIII", title: "Risques et Mesures", subs: ["Matrice des risques", "Plan de contingence"] },
      ];
      docChildren.push(
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TABLE DES MATIÈRES", size: 28, font: FONTS.TITLE, bold: true, color: COLORS.VERT_GABON })], spacing: { before: 200, after: 300 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.VERT_GABON } } }),
      );
      for (const entry of tocEntries) {
        docChildren.push(new Paragraph({ spacing: { after: 80 }, tabStops: [{ type: "right" as const, position: PAGE.CONTENT_W, leader: "dot" as const }], children: [new TextRun({ text: `Partie ${entry.num}. ${entry.title}`, size: 22, font: FONTS.BODY, bold: true, color: COLORS.GRIS_FONCE })] }));
        for (const sub of entry.subs) {
          docChildren.push(new Paragraph({ spacing: { after: 40 }, indent: { left: 400 }, children: [new TextRun({ text: `\u2022 ${sub}`, size: 20, font: FONTS.BODY, color: COLORS.GRIS_MOYEN })] }));
        }
      }
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));

      // ─── PARTIE I : RÉSUMÉ EXÉCUTIF ───
      docChildren.push(docH1("Partie I \u2014 Résumé Exécutif"));
      docChildren.push(docH2("1.1 Synthèse"));
      if (plan.summary) docChildren.push(bodyPara(plan.summary));
      docChildren.push(bodyPara(`Ce plan stratégique vise à structurer l'approche diplomatique envers ${target.name} dans le secteur ${target.sector || "non spécifié"} (${target.country || "N/A"}).`));
      docChildren.push(docH2("1.2 Indicateurs Clés"));
      docChildren.push(mkTable(["Indicateur", "Valeur"], [["Score d'opportunité", `${target.opportunityScore ?? "N/A"} / 100`], ["Secteur", target.sector || "N/A"], ["Pays", target.country || "N/A"], ["Priorité", target.priority || "N/A"], ["Scénarios définis", `${sa.cadrePartenariat.scenariosPartenariat.length}`], ["Risques identifiés", `${sa.risques?.length || 0}`]], [4000, 5360]));
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));

      // ─── PARTIE II : DIAGNOSTIC SECTORIEL ───
      docChildren.push(docH1("Partie II \u2014 Diagnostic Sectoriel"));
      docChildren.push(docH2("2.1 Contexte Macro-économique"));
      docChildren.push(bodyPara(sa.diagnosticSectoriel.contexteMacro));
      docChildren.push(docH2("2.2 Forces et Faiblesses"));
      docChildren.push(docH3("Forces du Gabon"));
      for (const f of sa.diagnosticSectoriel.forcesGabon) docChildren.push(bulletPara(f));
      docChildren.push(docH3("Contraintes"));
      for (const ct of sa.diagnosticSectoriel.contraintesGabon) docChildren.push(bulletPara(ct));
      docChildren.push(docH2("2.3 Analyse SWOT"));
      const docSwotS = sa.diagnosticSectoriel.forcesGabon.slice(0, 3).join("; ");
      const docSwotW = sa.diagnosticSectoriel.contraintesGabon.slice(0, 3).join("; ");
      const docSwotO = sa.diagnosticSectoriel.benchmark?.slice(0, 2).map(b => b.leconsApprises).join("; ") || "Opportunités benchmark";
      const docSwotT = [sa.pointsAveugles.risquesGeopolitiques.substring(0, 100), ...sa.pointsAveugles.contraintesTerrain.slice(0, 2)].join("; ");
      docChildren.push(mkTable(["", "Positif", "Négatif"], [["Interne", `Forces: ${docSwotS.substring(0, 120)}`, `Faiblesses: ${docSwotW.substring(0, 120)}`], ["Externe", `Opportunités: ${docSwotO.substring(0, 120)}`, `Menaces: ${docSwotT.substring(0, 120)}`]], [1500, 3930, 3930]));
      if (sa.diagnosticSectoriel.partiesPrenantes?.length) {
        docChildren.push(docH2("2.4 Parties Prenantes"));
        docChildren.push(mkTable(["Nom", "Rôle", "Influence"], sa.diagnosticSectoriel.partiesPrenantes.map(pp => [pp.nom, pp.role, pp.influence]), [3000, 3500, 2860]));
      }
      if (sa.diagnosticSectoriel.benchmark?.length) {
        docChildren.push(docH2("2.5 Benchmark International"));
        docChildren.push(mkTable(["Pays", "Description", "Leçons apprises"], sa.diagnosticSectoriel.benchmark.map(b => [b.pays, b.description, b.leconsApprises]), [2000, 3680, 3680]));
      }
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));

      // ─── PARTIE III : ANALYSE DU PARTENAIRE ───
      docChildren.push(docH1("Partie III \u2014 Analyse du Partenaire"));
      docChildren.push(docH2("3.1 Profil"));
      docChildren.push(infoBox("Profil de l'opérateur", sa.analyseOperateur.profilComplet, COLORS.VERT_FONCE, COLORS.TINT_GREEN));
      docChildren.push(new Paragraph({ spacing: { before: 160 } }));
      docChildren.push(docH2("3.2 Capacités Clés"));
      for (const cap of sa.analyseOperateur.capacitesCles) docChildren.push(bulletPara(cap));
      if (sa.analyseOperateur.realisationsMarquantes?.length) {
        docChildren.push(docH2("3.3 Réalisations Marquantes"));
        docChildren.push(mkTable(["Projet", "Pays", "Résultat"], sa.analyseOperateur.realisationsMarquantes.map(r => [r.projet, r.pays, r.resultat]), [3000, 2000, 4360]));
      }
      if (sa.analyseOperateur.presenceAfrique) {
        docChildren.push(docH2("3.4 Présence en Afrique"));
        docChildren.push(bodyPara(sa.analyseOperateur.presenceAfrique));
      }
      docChildren.push(docH2("3.5 Offre de l'Opérateur"));
      if (sa.cadrePartenariat.offreOperateur?.length) {
        docChildren.push(mkTable(["Capacité", "Instrument", "Conditions"], sa.cadrePartenariat.offreOperateur.map(o => [o.capacite, o.instrument, o.conditions || "\u2014"]), [3000, 3180, 3180]));
      }
      docChildren.push(docH2("3.6 Alignement avec les Priorités"));
      docChildren.push(bodyPara(sa.analyseOperateur.alignementPriorites));
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));

      // ─── PARTIE IV : OBJECTIFS STRATÉGIQUES ───
      docChildren.push(docH1("Partie IV \u2014 Objectifs Stratégiques"));
      if (sa.analyseOperateur.alignementPriorites) {
        docChildren.push(docH2("4.1 Vision"));
        docChildren.push(infoBox("Vision stratégique", sa.analyseOperateur.alignementPriorites, COLORS.BLEU_MARINE, COLORS.TINT_BLUE));
        docChildren.push(new Paragraph({ spacing: { before: 160 } }));
      }
      const allObjectives: { title: string; horizon: string; status: string }[] = [];
      if (plan.objectives?.length) {
        for (const obj of plan.objectives as { title: string; status: string; horizon?: string }[]) {
          allObjectives.push({ title: obj.title, horizon: obj.horizon || "Court terme", status: obj.status === "completed" ? "Atteint" : obj.status === "in_progress" ? "En cours" : "A faire" });
        }
      }
      for (const bm of sa.cadrePartenariat.beneficesMutuels.slice(0, 3)) {
        allObjectives.push({ title: bm, horizon: "Long terme", status: "Planifié" });
      }
      const shortTerm = allObjectives.filter(o => o.horizon.toLowerCase().includes("court"));
      const mediumTerm = allObjectives.filter(o => o.horizon.toLowerCase().includes("moyen"));
      const longTerm = allObjectives.filter(o => o.horizon.toLowerCase().includes("long") || o.status === "Planifié");
      if (shortTerm.length) { docChildren.push(docH2("4.2 Objectifs Court Terme")); for (const o of shortTerm) docChildren.push(bulletPara(`${o.title} \u2014 ${o.status}`)); }
      if (mediumTerm.length) { docChildren.push(docH2("4.3 Objectifs Moyen Terme")); for (const o of mediumTerm) docChildren.push(bulletPara(`${o.title} \u2014 ${o.status}`)); }
      if (longTerm.length) { docChildren.push(docH2("4.4 Objectifs Long Terme")); for (const o of longTerm) docChildren.push(bulletPara(`${o.title} \u2014 ${o.status}`)); }
      if (allObjectives.length) { docChildren.push(docH2("4.5 Tableau Récapitulatif")); docChildren.push(mkTable(["Objectif", "Horizon", "Statut"], allObjectives.map(o => [o.title, o.horizon, o.status]), [5000, 2180, 2180])); }
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));

      // ─── PARTIE V : SCÉNARIOS D'ACTION ───
      docChildren.push(docH1("Partie V \u2014 Scénarios d'Action"));
      sa.cadrePartenariat.scenariosPartenariat.forEach((sc, idx) => {
        const scLabel = scenarioLabels[sc.scenario] || sc.scenario;
        const scAccent = sc.scenario === "ambitieux" ? COLORS.BLEU_GABON : sc.scenario === "realiste" ? COLORS.VERT_GABON : COLORS.AMBER_MOYEN;
        const scTint = sc.scenario === "ambitieux" ? COLORS.TINT_BLUE : sc.scenario === "realiste" ? COLORS.TINT_GREEN : COLORS.TINT_AMBER;
        docChildren.push(docH2(`5.${idx + 1} Scénario ${scLabel}`));
        docChildren.push(infoBox(`Scénario ${scLabel}`, `${sc.description}${sc.investissementEstime ? ` | Investissement : ${sc.investissementEstime}` : ""}${sc.delaiMiseEnOeuvre ? ` | Délai : ${sc.delaiMiseEnOeuvre}` : ""}`, scAccent, scTint));
        docChildren.push(new Paragraph({ spacing: { before: 120 } }));
      });
      if (sa.cadrePartenariat.scenariosPartenariat.length > 1) {
        docChildren.push(docH2("5.4 Tableau Comparatif"));
        docChildren.push(mkTable(["Scénario", "Investissement", "Délai", "Description"], sa.cadrePartenariat.scenariosPartenariat.map(sc => [scenarioLabels[sc.scenario] || sc.scenario, sc.investissementEstime || "N/A", sc.delaiMiseEnOeuvre || "N/A", sc.description.substring(0, 80)]), [1800, 2000, 1800, 3760]));
      }
      docChildren.push(docH2("5.5 Recommandation"));
      const recommendedScenario = sa.cadrePartenariat.scenariosPartenariat.find(s => s.scenario === "realiste") || sa.cadrePartenariat.scenariosPartenariat[0];
      if (recommendedScenario) { docChildren.push(infoBox("Scénario recommandé", `Le scénario ${scenarioLabels[recommendedScenario.scenario] || recommendedScenario.scenario} est recommandé comme point de départ des négociations. ${recommendedScenario.description.substring(0, 200)}`, COLORS.VERT_GABON, COLORS.TINT_GREEN)); }
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));

      // ─── PARTIE VI : PLAN D'ACTION OPÉRATIONNEL ───
      docChildren.push(docH1("Partie VI \u2014 Plan d'Action Opérationnel"));
      if (sa.strategieApproche.chronologieApproche?.length) { docChildren.push(docH2("6.1 Chronologie d'Approche")); docChildren.push(mkTable(["Étape", "Action", "Responsable", "Délai"], sa.strategieApproche.chronologieApproche.map(ch => [ch.etape, ch.action, ch.responsable, ch.delai]), [1800, 3500, 2060, 2000])); }
      docChildren.push(docH2("6.2 Points de Négociation"));
      docChildren.push(docH3("Arguments clés"));
      for (const a of sa.strategieApproche.argumentaire) docChildren.push(bulletPara(a));
      docChildren.push(docH3("Demandes"));
      for (const n of sa.strategieApproche.negotiationPoints) docChildren.push(bulletPara(n));
      docChildren.push(docH3("Concessions possibles"));
      for (const co of sa.strategieApproche.concessions) docChildren.push(bulletPara(co));
      if (sa.strategieApproche.lignesRouges?.length) { docChildren.push(docH3("Lignes rouges")); for (const lr of sa.strategieApproche.lignesRouges) docChildren.push(bulletPara(lr)); }
      docChildren.push(docH2("6.3 Préparation de Réunion"));
      if (sa.preparationReunion.agenda?.length) { docChildren.push(docH3("Agenda")); docChildren.push(mkTable(["Point", "Durée", "Objectif"], sa.preparationReunion.agenda.map(a => [a.point, a.duree, a.objectif]), [3500, 1500, 4360])); }
      if (sa.preparationReunion.dossiersAFournir?.length) { docChildren.push(docH3("Documents à préparer")); for (const d of sa.preparationReunion.dossiersAFournir) docChildren.push(bulletPara(d)); }
      if (sa.preparationReunion.questionsStrategiques?.length) { docChildren.push(docH3("Questions stratégiques")); for (const q of sa.preparationReunion.questionsStrategiques) docChildren.push(bulletPara(q)); }
      if (sa.preparationReunion.profilsAInviter?.length) { docChildren.push(docH3("Délégation recommandée")); for (const pr of sa.preparationReunion.profilsAInviter) docChildren.push(bulletPara(pr)); }
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));

      // ─── PARTIE VII : BUDGET ET RESSOURCES ───
      docChildren.push(docH1("Partie VII \u2014 Budget et Ressources"));
      docChildren.push(docH2("7.1 Modèles de Financement"));
      if (sa.cadrePartenariat.modelesFinancement?.length) { docChildren.push(mkTable(["Type", "Description", "Montant estimé"], sa.cadrePartenariat.modelesFinancement.map(m => [m.type, m.description, m.montantEstime || "À déterminer"]), [2500, 4860, 2000])); }
      docChildren.push(docH2("7.2 Besoins et Budgets"));
      if (sa.cadrePartenariat.besoinsGabon?.length) { docChildren.push(mkTable(["Besoin", "Secteur", "Urgence", "Budget estimé"], sa.cadrePartenariat.besoinsGabon.map(b => [b.besoin, b.secteur, urgenceLabel(b.urgence), b.estimationBudget || "N/A"]), [2800, 2060, 2000, 2500])); }
      docChildren.push(docH2("7.3 Analyse Coût-Bénéfice"));
      docChildren.push(docH3("Bénéfices mutuels attendus"));
      for (const bm of sa.cadrePartenariat.beneficesMutuels) docChildren.push(bulletPara(bm));
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));

      // ─── PARTIE VIII : RISQUES ET MESURES ───
      docChildren.push(docH1("Partie VIII \u2014 Risques et Mesures d'Atténuation"));
      docChildren.push(docH2("8.1 Matrice des Risques"));
      if (sa.risques?.length) { docChildren.push(mkTable(["Risque", "Probabilité", "Impact", "Mitigation"], sa.risques.map(r => [r.risque, r.probabilite, r.impact, r.mitigation]), [2500, 1500, 1500, 3860])); }
      docChildren.push(docH2("8.2 Plan de Contingence"));
      const highRisks = sa.risques?.filter(r => r.probabilite === "elevee" || r.impact === "eleve") || [];
      if (highRisks.length) { docChildren.push(infoBox("Risques prioritaires", highRisks.map(r => `${r.risque}: ${r.mitigation}`).join(" | "), COLORS.ROUGE_RISQUE, COLORS.TINT_RED)); }
      else { docChildren.push(bodyPara("Aucun risque de niveau élevé identifié. Le plan de contingence standard s'applique.")); }
      docChildren.push(docH2("8.3 Points d'Attention"));
      docChildren.push(docH4("Économie politique"));
      docChildren.push(bodyPara(sa.pointsAveugles.economiePolitique));
      docChildren.push(docH4("Risques géopolitiques"));
      docChildren.push(bodyPara(sa.pointsAveugles.risquesGeopolitiques));
      docChildren.push(docH4("Facteurs sociaux"));
      docChildren.push(bodyPara(sa.pointsAveugles.facteursSociaux));
      if (sa.pointsAveugles.contraintesTerrain?.length) { docChildren.push(docH4("Contraintes terrain")); for (const ct of sa.pointsAveugles.contraintesTerrain) docChildren.push(bulletPara(ct)); }
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));

      // ─── CONCLUSION ───
      docChildren.push(docH1("Conclusion"));
      docChildren.push(bodyPara(`Ce plan stratégique fournit un cadre complet pour l'engagement diplomatique avec ${target.name}. Il couvre le diagnostic sectoriel, l'analyse du partenaire, les objectifs stratégiques, les scénarios d'action, le plan opérationnel, le budget et l'analyse des risques.`));
      docChildren.push(bodyPara("Les prochaines étapes recommandées sont :"));
      if (sa.strategieApproche.chronologieApproche?.length) { for (const ch of sa.strategieApproche.chronologieApproche.slice(0, 5)) { docChildren.push(bulletPara(`${ch.etape} : ${ch.action} (${ch.responsable}, ${ch.delai})`)); } }
      docChildren.push(new Paragraph({ spacing: { before: 400 } }));
      docChildren.push(infoBox("NTSAGUI Digital \u2014 Affaires Diplomatiques", `Document généré le ${dateStr} pour ${target.name}. Tous droits réservés. Ce document est confidentiel et destiné exclusivement aux parties autorisées.`, COLORS.VERT_FONCE, COLORS.TINT_GREEN));

      // ─── BUILD DOCX ───
      const docxDoc = new Document({
        styles: { default: { heading1: { run: { size: 28, font: FONTS.TITLE, bold: true, color: COLORS.VERT_GABON }, paragraph: { spacing: { before: 400, after: 200 } } }, heading2: { run: { size: 24, font: FONTS.HEADING, bold: true, color: COLORS.VERT_FONCE }, paragraph: { spacing: { before: 200, after: 120 } } }, heading3: { run: { size: 22, font: FONTS.HEADING, bold: true, color: COLORS.BLEU_MARINE }, paragraph: { spacing: { before: 160, after: 80 } } } } },
        sections: [{
          properties: { page: { size: { width: PAGE.WIDTH, height: PAGE.HEIGHT }, margin: { top: PAGE.MARGIN, bottom: PAGE.MARGIN, left: PAGE.MARGIN, right: PAGE.MARGIN }, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
          headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Plan Stratégique \u2014 ${target.name}`, size: 16, font: FONTS.BODY, italics: true, color: COLORS.GRIS_MOYEN })] })] }) },
          footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NTSAGUI Digital \u2014 Confidentiel \u2014 Page ", size: 16, font: FONTS.BODY, color: COLORS.GRIS_MOYEN }), new TextRun({ children: [DocxPageNumber.CURRENT], size: 16, font: FONTS.BODY, color: COLORS.GRIS_MOYEN })] })] }) },
          children: docChildren,
        }],
      });

      const docxBuffer = await Packer.toBuffer(docxDoc);
      const docxBlob = new Blob([docxBuffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const docxStorageId = await ctx.storage.store(docxBlob);
      await ctx.runMutation(internal.functions.diplomaticFolders.internalAddDocument, { orgId: plan.orgId, folderId: folder._id, targetId: args.targetId, sourceType: "plan", sourceId: args.planId, subfolder: "Plans Stratégiques", filename: `Plan_${plan.category}_${sanitizedName}_${year}.docx`, format: "docx", storageId: docxStorageId, sizeBytes: docxBuffer.length, isDraft: true });

      // ── PDF archival (couleurs VERT_GABON) ─────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PDFDocument: PDFDoc, StandardFonts: StdFonts, rgb: pdfRgb } = require("pdf-lib");
      const archPdf = await PDFDoc.create();
      const pFont = await archPdf.embedFont(StdFonts.Helvetica);
      const pFontBold = await archPdf.embedFont(StdFonts.HelveticaBold);
      let pPage = archPdf.addPage([595.28, 841.89]);
      const { width: pw, height: ph } = pPage.getSize();
      let py = ph - 50;
      const gabonGreenRgb = pdfRgb(0, 158 / 255, 73 / 255);
      const stripeH = 8;
      pPage.drawRectangle({ x: 0, y: ph - stripeH, width: pw, height: stripeH, color: pdfRgb(GABON_GREEN.r / 255, GABON_GREEN.g / 255, GABON_GREEN.b / 255) });
      pPage.drawRectangle({ x: 0, y: ph - stripeH * 2, width: pw, height: stripeH, color: pdfRgb(GABON_YELLOW.r / 255, GABON_YELLOW.g / 255, GABON_YELLOW.b / 255) });
      pPage.drawRectangle({ x: 0, y: ph - stripeH * 3, width: pw, height: stripeH, color: pdfRgb(GABON_BLUE.r / 255, GABON_BLUE.g / 255, GABON_BLUE.b / 255) });
      py = ph - 60;
      pPage.drawText("PLAN STRATÉGIQUE", { x: 50, y: py, size: 18, font: pFontBold, color: gabonGreenRgb }); py -= 25;
      pPage.drawText(plan.title, { x: 50, y: py, size: 14, font: pFontBold, color: pdfRgb(0.2, 0.2, 0.2) }); py -= 20;
      pPage.drawText(`Cible : ${target.name} | ${plan.category} | ${dateStr}`, { x: 50, y: py, size: 10, font: pFont, color: pdfRgb(0.4, 0.4, 0.4) }); py -= 10;
      pPage.drawLine({ start: { x: 50, y: py }, end: { x: pw - 50, y: py }, thickness: 1, color: gabonGreenRgb }); py -= 25;

      const pdfWrap = (text: string, curY: number): number => {
        const words = text.split(" "); let line = ""; let wy = curY;
        for (const word of words) { const testLine = line ? `${line} ${word}` : word; if (pFont.widthOfTextAtSize(testLine, 10) > pw - 120) { pPage.drawText(line, { x: 60, y: wy, size: 10, font: pFont, color: pdfRgb(0.2, 0.2, 0.2) }); wy -= 14; line = word; if (wy < 60) { pPage = archPdf.addPage([595.28, 841.89]); wy = ph - 50; } } else { line = testLine; } }
        if (line) { pPage.drawText(line, { x: 60, y: wy, size: 10, font: pFont, color: pdfRgb(0.2, 0.2, 0.2) }); wy -= 14; } return wy;
      };
      const pdfSec = (title: string) => { if (py < 100) { pPage = archPdf.addPage([595.28, 841.89]); py = ph - 50; } pPage.drawText(title, { x: 50, y: py, size: 12, font: pFontBold, color: gabonGreenRgb }); py -= 20; };

      if (plan.summary) { pdfSec("I. Résumé Exécutif"); py = pdfWrap(plan.summary, py); py -= 10; }
      pdfSec("II. Diagnostic Sectoriel"); py = pdfWrap(sa.diagnosticSectoriel.contexteMacro, py); py -= 8;
      for (const f of sa.diagnosticSectoriel.forcesGabon.slice(0, 6)) { if (py < 60) { pPage = archPdf.addPage([595.28, 841.89]); py = ph - 50; } pPage.drawText(`+ ${f}`, { x: 60, y: py, size: 10, font: pFont, color: pdfRgb(0.0, 0.4, 0.2) }); py -= 14; }
      for (const ct of sa.diagnosticSectoriel.contraintesGabon.slice(0, 6)) { if (py < 60) { pPage = archPdf.addPage([595.28, 841.89]); py = ph - 50; } pPage.drawText(`- ${ct}`, { x: 60, y: py, size: 10, font: pFont, color: pdfRgb(0.6, 0.1, 0.1) }); py -= 14; }
      py -= 10;
      pdfSec("III. Analyse du Partenaire"); py = pdfWrap(sa.analyseOperateur.profilComplet, py); py -= 10;
      pdfSec("IV. Objectifs");
      if (plan.objectives?.length) { for (const obj of plan.objectives as { title: string; status: string }[]) { if (py < 60) { pPage = archPdf.addPage([595.28, 841.89]); py = ph - 50; } const mark = obj.status === "completed" ? "[OK]" : obj.status === "in_progress" ? "[->]" : "[ ]"; pPage.drawText(`${mark} ${obj.title}`, { x: 60, y: py, size: 10, font: pFont, color: pdfRgb(0.2, 0.2, 0.2) }); py -= 14; } } py -= 10;
      pdfSec("V. Scénarios");
      for (const sc of sa.cadrePartenariat.scenariosPartenariat.slice(0, 3)) { if (py < 60) { pPage = archPdf.addPage([595.28, 841.89]); py = ph - 50; } pPage.drawText(`* ${scenarioLabels[sc.scenario] || sc.scenario}: ${sc.description.substring(0, 80)}`, { x: 60, y: py, size: 10, font: pFont, color: pdfRgb(0.2, 0.2, 0.2) }); py -= 14; } py -= 10;
      pdfSec("VI. Plan d'Action");
      for (const ch of (sa.strategieApproche.chronologieApproche || []).slice(0, 6)) { if (py < 60) { pPage = archPdf.addPage([595.28, 841.89]); py = ph - 50; } pPage.drawText(`> ${ch.etape}: ${ch.action} (${ch.delai})`, { x: 60, y: py, size: 10, font: pFont, color: pdfRgb(0.2, 0.2, 0.2) }); py -= 14; } py -= 10;
      pdfSec("VII. Budget");
      for (const b of sa.cadrePartenariat.besoinsGabon.slice(0, 6)) { if (py < 60) { pPage = archPdf.addPage([595.28, 841.89]); py = ph - 50; } pPage.drawText(`* ${b.besoin} (${b.secteur}) — ${b.estimationBudget || "N/A"}`, { x: 60, y: py, size: 10, font: pFont, color: pdfRgb(0.2, 0.2, 0.2) }); py -= 14; } py -= 10;
      if (sa.risques?.length) { pdfSec("VIII. Risques"); for (const r of sa.risques.slice(0, 6)) { if (py < 60) { pPage = archPdf.addPage([595.28, 841.89]); py = ph - 50; } pPage.drawText(`[${r.probabilite}/${r.impact}] ${r.risque}`, { x: 60, y: py, size: 10, font: pFont, color: pdfRgb(0.2, 0.2, 0.2) }); py -= 14; py = pdfWrap(`  Mitigation: ${r.mitigation}`, py); py -= 6; } }

      const totalPdfPages = archPdf.getPageCount();
      for (let i = 0; i < totalPdfPages; i++) { const pg = archPdf.getPage(i); pg.drawText(`NTSAGUI Digital \u2014 Plan Stratégique \u2014 Confidentiel | Page ${i + 1}/${totalPdfPages}`, { x: 50, y: 25, size: 8, font: pFont, color: pdfRgb(0.5, 0.5, 0.5) }); }

      const archPdfBytes = await archPdf.save();
      const archPdfBlob = new Blob([archPdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const archPdfStorageId = await ctx.storage.store(archPdfBlob);
      await ctx.runMutation(internal.functions.diplomaticFolders.internalAddDocument, { orgId: plan.orgId, folderId: folder._id, targetId: args.targetId, sourceType: "plan", sourceId: args.planId, subfolder: "Plans Stratégiques", filename: `Plan_${plan.category}_${sanitizedName}_${year}.pdf`, format: "pdf", storageId: archPdfStorageId, sizeBytes: archPdfBytes.length });

      console.log(`[generatePlanDocument] PPTX 11 slides + DOCX 8 Parties + PDF generes pour plan ${args.planId}`);
      return;
    }

    // ────────────────────────────────────────────────────────────────────────
    // Fallback : pas de strategicAnalysis → ancien comportement (PDF + PPTX basiques)
    // ────────────────────────────────────────────────────────────────────────

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    let y = height - 50;

    const stripeHFb = 8;
    page.drawRectangle({ x: 0, y: height - stripeHFb, width, height: stripeHFb, color: rgb(GABON_GREEN.r / 255, GABON_GREEN.g / 255, GABON_GREEN.b / 255) });
    page.drawRectangle({ x: 0, y: height - stripeHFb * 2, width, height: stripeHFb, color: rgb(GABON_YELLOW.r / 255, GABON_YELLOW.g / 255, GABON_YELLOW.b / 255) });
    page.drawRectangle({ x: 0, y: height - stripeHFb * 3, width, height: stripeHFb, color: rgb(GABON_BLUE.r / 255, GABON_BLUE.g / 255, GABON_BLUE.b / 255) });
    y = height - 60;

    page.drawText("PLAN STRATÉGIQUE", { x: 50, y, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= 25;
    page.drawText(plan.title, { x: 50, y, size: 14, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    y -= 20;
    page.drawText(`Cible : ${target.name} | Catégorie : ${plan.category} | ${year}`, { x: 50, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 10;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 25;

    const drawWrappedText = (text: string, startY: number, maxWidth: number): number => {
      const words = text.split(" ");
      let line = "";
      let currentY = startY;
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(testLine, 10) > maxWidth) {
          page.drawText(line, { x: 60, y: currentY, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
          currentY -= 14; line = word;
          if (currentY < 60) { page = pdfDoc.addPage([595.28, 841.89]); currentY = height - 50; }
        } else { line = testLine; }
      }
      if (line) { page.drawText(line, { x: 60, y: currentY, size: 10, font, color: rgb(0.2, 0.2, 0.2) }); currentY -= 14; }
      return currentY;
    };

    if (plan.summary) {
      page.drawText("Résumé", { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
      y = drawWrappedText(plan.summary, y, width - 120);
      y -= 15;
    }

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
        if (y < 100) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50; }
        page.drawText(section.title, { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
        y -= 18;
        for (const item of section.items) {
          page.drawText(`* ${item}`, { x: 60, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
          y -= 14;
          if (y < 60) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50; }
        }
        y -= 10;
      }
    }

    if (plan.objectives?.length) {
      if (y < 100) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50; }
      page.drawText("Objectifs", { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
      for (const obj of plan.objectives) {
        const statusMark = obj.status === "completed" ? "[OK]" : obj.status === "in_progress" ? "[->]" : "[ ]";
        page.drawText(`${statusMark} ${obj.title}`, { x: 60, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
        y -= 14;
        if (y < 60) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50; }
      }
    }

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
        orgId: plan.orgId, folderId: folder._id, targetId: args.targetId,
        sourceType: "plan", sourceId: args.planId,
        subfolder: "Plans Stratégiques",
        filename: `Plan_${plan.category}_${sanitizedName}_${year}.pdf`,
        format: "pdf", storageId: pdfStorageId, sizeBytes: pdfBytes.length,
      },
    );

    // PPTX basique (fallback)
    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_16x9";
    pptx.author = "Consulat.ga";
    pptx.title = plan.title;

    const slide1 = pptx.addSlide();
    slide1.addShape("rect", { x: 0, y: 0, w: 10, h: 0.08, fill: { color: COLORS.VERT_GABON } });
    slide1.addShape("rect", { x: 0, y: 0.08, w: 10, h: 0.08, fill: { color: COLORS.JAUNE_GABON } });
    slide1.addShape("rect", { x: 0, y: 0.16, w: 10, h: 0.08, fill: { color: COLORS.BLEU_GABON } });
    slide1.addText("PLAN STRATÉGIQUE", {
      x: 0.5, y: 1.5, w: 9, h: 1,
      fontSize: 28, bold: true, color: COLORS.BLEU_MARINE, fontFace: FONTS.TITLE,
    });
    slide1.addText(plan.title, { x: 0.5, y: 2.5, w: 9, h: 0.8, fontSize: 20, color: COLORS.GRIS_FONCE, fontFace: FONTS.HEADING });
    slide1.addText(`Cible : ${target.name} | ${plan.category} | ${year}`, {
      x: 0.5, y: 3.5, w: 9, h: 0.5, fontSize: 12, color: COLORS.GRIS_MOYEN, fontFace: FONTS.BODY,
    });
    addFooterBand(slide1);

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
        addSlideTitle(slide, s.title);
        const bulletText = s.items.map((item) => ({
          text: item,
          options: { fontSize: 12, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, bullet: true as const },
        }));
        slide.addText(bulletText, { x: 0.5, y: 1.0, w: 9, h: 4 });
        addFooterBand(slide);
      }
    }

    if (plan.objectives?.length) {
      const slide = pptx.addSlide();
      addSlideTitle(slide, "Objectifs");
      const objText = plan.objectives.map((obj: { title: string; status: string }) => ({
        text: `${obj.title} — ${obj.status}`,
        options: { fontSize: 12, color: COLORS.GRIS_FONCE, fontFace: FONTS.BODY, bullet: true as const },
      }));
      slide.addText(objText, { x: 0.5, y: 1.0, w: 9, h: 4 });
      addFooterBand(slide);
    }

    const pptxBuffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
    const pptxBlob = new Blob([pptxBuffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const pptxStorageId = await ctx.storage.store(pptxBlob);
    await ctx.runMutation(
      internal.functions.diplomaticFolders.internalAddDocument,
      {
        orgId: plan.orgId, folderId: folder._id, targetId: args.targetId,
        sourceType: "plan", sourceId: args.planId,
        subfolder: "Plans Stratégiques",
        filename: `Plan_${plan.category}_${sanitizedName}_${year}.pptx`,
        format: "pptx", storageId: pptxStorageId, sizeBytes: pptxBuffer.length,
      },
    );

    console.log(`[generatePlanDocument] PDF + PPTX basiques generes pour plan ${args.planId} (pas de strategicAnalysis)`);
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
    if (!letter) {
      console.error(`[generateLetterDocument] Lettre ${args.letterId} introuvable`);
      return;
    }

    const folder = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderByTarget,
      { targetId: args.targetId },
    );
    if (!folder) {
      console.error(`[generateLetterDocument] Dossier introuvable pour cible ${args.targetId}`);
      return;
    }

    // Protection : ne pas generer un document vide
    const content = letter.content || letter.aiDraftContent;
    if (!content) {
      console.error(`[generateLetterDocument] Aucun contenu pour lettre ${args.letterId} — generation ignoree`);
      return;
    }

    const sanitizedRef = sanitizeFilename(letter.reference);
    const sanitizedType = sanitizeFilename(letter.type);

    // ── DOCX ──
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } =
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
        isDraft: true,
      },
    );

    // ── PDF ──
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFDocument, StandardFonts, rgb: pdfRgb } = require("pdf-lib");
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
    if (!report) {
      console.error(`[generateReportDocument] Rapport ${args.reportId} introuvable`);
      return;
    }

    const folder = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderByTarget,
      { targetId: args.targetId },
    );
    if (!folder) {
      console.error(`[generateReportDocument] Dossier introuvable pour cible ${args.targetId}`);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");
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
// PROJET → DOCX (11 sections) + PPTX (8 slides) + PDF (complet)
// Générateurs extraits dans convex/lib/project{Docx,Pptx,Pdf}Generator.ts
// ═════════════════════════════════════════════════════════════════════════════

export const generateProjectDocument = rawInternalAction({
  args: {
    projectId: v.id("diplomaticProjects"),
    targetId: v.id("diplomaticTargets"),
  },
  handler: async (ctx, args) => {
    // Imports des générateurs extraits
    const { normalizeProjectData, sanitizeFilename: sanitizeFn } = await import("../lib/projectDocHelpers");
    const { generateProjectDocx } = await import("../lib/projectDocxGenerator");
    const { generateProjectPptx } = await import("../lib/projectPptxGenerator");
    const { generateProjectPdf } = await import("../lib/projectPdfGenerator");

    const project: any = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetProject,
      { projectId: args.projectId },
    );
    if (!project) {
      console.error(`[generateProjectDocument] Projet ${args.projectId} introuvable`);
      return;
    }

    const target: any = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetTarget,
      { targetId: args.targetId },
    );
    if (!target) {
      console.error(`[generateProjectDocument] Cible ${args.targetId} introuvable`);
      return;
    }

    const folder: any = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderByTarget,
      { targetId: args.targetId },
    );
    if (!folder) {
      console.error(`[generateProjectDocument] Dossier introuvable pour cible ${args.targetId}`);
      return;
    }

    const sanitizedRef = sanitizeFn(project.reference);
    const sanitizedTitle = sanitizeFn(project.title);

    // Normaliser les données projet (schema FR → interface normalisée)
    const data = normalizeProjectData(project, target);

    // ── PDF uniquement → dossier cible (génération automatique) ──
    try {
      console.log(`[generateProjectDocument] Debut generation PDF pour ${project.title}...`);
      const pdfBytes = await generateProjectPdf(data);
      console.log(`[generateProjectDocument] PDF genere, taille: ${pdfBytes.length} bytes`);
      const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const pdfStorageId = await ctx.storage.store(pdfBlob);
      await ctx.runMutation(internal.functions.diplomaticFolders.internalAddDocument, {
        orgId: project.orgId, folderId: folder._id, targetId: args.targetId,
        sourceType: "project", sourceId: args.projectId, subfolder: "Projets",
        filename: `Projet_${sanitizedRef}_${sanitizedTitle}.pdf`,
        format: "pdf", storageId: pdfStorageId, sizeBytes: pdfBytes.length,
      });
      console.log(`[generateProjectDocument] PDF stocke et enregistre pour ${project.title}`);
    } catch (err) {
      console.error("[generateProjectDocument] Erreur PDF:", err instanceof Error ? `${err.message}\n${err.stack}` : err);
    }
  },
});

/**
 * Génère un DOCX brouillon du projet → iDocument en statut "pending" (Brouillon)
 * Déclenché manuellement par l'utilisateur via le bouton "Générer le .docx"
 */
export const generateProjectDocxDraft = rawInternalAction({
  args: {
    projectId: v.id("diplomaticProjects"),
    targetId: v.id("diplomaticTargets"),
  },
  handler: async (ctx, args) => {
    const { normalizeProjectData, sanitizeFilename: sanitizeFn } = await import("../lib/projectDocHelpers");
    const { generateProjectDocx } = await import("../lib/projectDocxGenerator");

    const project: any = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetProject,
      { projectId: args.projectId },
    );
    if (!project) {
      console.error(`[generateProjectDocxDraft] Projet ${args.projectId} introuvable`);
      return;
    }

    const target: any = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetTarget,
      { targetId: args.targetId },
    );
    if (!target) {
      console.error(`[generateProjectDocxDraft] Cible ${args.targetId} introuvable`);
      return;
    }

    const folder: any = await ctx.runQuery(
      internal.functions.diplomaticFolders.internalGetFolderByTarget,
      { targetId: args.targetId },
    );
    if (!folder) {
      console.error(`[generateProjectDocxDraft] Dossier introuvable pour cible ${args.targetId}`);
      return;
    }

    const sanitizedRef = sanitizeFn(project.reference);
    const sanitizedTitle = sanitizeFn(project.title);
    const data = normalizeProjectData(project, target);

    // Générer le DOCX
    const docxBuffer = await generateProjectDocx(data);
    const docxBlob = new Blob([docxBuffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const docxStorageId = await ctx.storage.store(docxBlob);

    // Enregistrer comme brouillon (pending) dans le dossier cible
    await ctx.runMutation(internal.functions.diplomaticFolders.internalAddDocument, {
      orgId: project.orgId, folderId: folder._id, targetId: args.targetId,
      sourceType: "project", sourceId: args.projectId, subfolder: "Projets",
      filename: `Projet_${sanitizedRef}_${sanitizedTitle}.docx`,
      format: "docx", storageId: docxStorageId, sizeBytes: docxBuffer.byteLength,
      isDraft: true,
    });

    console.log(`[generateProjectDocxDraft] DOCX brouillon genere pour ${project.title}`);
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
