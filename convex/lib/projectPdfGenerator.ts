/**
 * Générateur PDF — Projet de Coopération (Archivage)
 *
 * PDF complet avec toutes les sections, utilisant pdf-lib.
 * Pas de dépendance à LibreOffice — rendu natif.
 */

import type { ProjectData } from "./projectDocHelpers";
import { COLORS } from "./projectDocHelpers";

// Couleurs en RGB pour pdf-lib
function hexToRgb(hex: string) {
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return { r, g, b };
}

const C = {
  VERT: hexToRgb(COLORS.VERT_GABON),
  VERT_FONCE: hexToRgb(COLORS.VERT_FONCE),
  BLEU: hexToRgb(COLORS.BLEU_MARINE),
  GRIS_F: hexToRgb(COLORS.GRIS_FONCE),
  GRIS_M: hexToRgb(COLORS.GRIS_MOYEN),
  GRIS_C: hexToRgb(COLORS.GRIS_CLAIR),
  BLANC: hexToRgb(COLORS.BLANC),
  JAUNE: hexToRgb(COLORS.JAUNE_GABON),
  BLEU_G: hexToRgb(COLORS.BLEU_GABON),
  ROUGE: hexToRgb(COLORS.ROUGE_RISQUE),
  BORDER: hexToRgb(COLORS.BORDER_GRAY),
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - 2 * MARGIN;

// ════════════════════════════════════════════════════════════════════════════
// HELPERS PDF
// ════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfLib = any;

interface PdfContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any;
  y: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  font: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fontBold: any;
  rgb: PdfLib["rgb"];
}

function newPage(ctx: PdfContext): void {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
}

function checkPage(ctx: PdfContext, needed = 60): void {
  if (ctx.y < MARGIN + needed) {
    newPage(ctx);
  }
}

function drawGabonBanner(ctx: PdfContext): void {
  const w = PAGE_W;
  const h = PAGE_H;
  ctx.page.drawRectangle({ x: 0, y: h - 8, width: w, height: 8, color: ctx.rgb(C.VERT.r, C.VERT.g, C.VERT.b) });
  ctx.page.drawRectangle({ x: 0, y: h - 16, width: w, height: 8, color: ctx.rgb(C.JAUNE.r, C.JAUNE.g, C.JAUNE.b) });
  ctx.page.drawRectangle({ x: 0, y: h - 24, width: w, height: 8, color: ctx.rgb(C.BLEU_G.r, C.BLEU_G.g, C.BLEU_G.b) });
}

function drawText(ctx: PdfContext, text: string, opts: {
  size?: number; bold?: boolean; color?: { r: number; g: number; b: number };
  x?: number; centered?: boolean;
} = {}): void {
  const { size = 10, bold = false, color = C.GRIS_F, x = MARGIN, centered = false } = opts;
  const usedFont = bold ? ctx.fontBold : ctx.font;
  checkPage(ctx, size + 10);

  if (centered) {
    const textWidth = usedFont.widthOfTextAtSize(text, size);
    const cx = (PAGE_W - textWidth) / 2;
    ctx.page.drawText(text, { x: cx, y: ctx.y, size, font: usedFont, color: ctx.rgb(color.r, color.g, color.b) });
  } else {
    ctx.page.drawText(text, { x, y: ctx.y, size, font: usedFont, color: ctx.rgb(color.r, color.g, color.b) });
  }
  ctx.y -= size + 6;
}

function drawWrapped(ctx: PdfContext, text: string, opts: {
  size?: number; bold?: boolean; color?: { r: number; g: number; b: number };
  x?: number; maxW?: number;
} = {}): void {
  const { size = 10, bold = false, color = C.GRIS_F, x = MARGIN, maxW = CONTENT_W } = opts;
  const usedFont = bold ? ctx.fontBold : ctx.font;
  const words = text.split(" ");
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (usedFont.widthOfTextAtSize(test, size) > maxW) {
      checkPage(ctx, size + 6);
      ctx.page.drawText(line, { x, y: ctx.y, size, font: usedFont, color: ctx.rgb(color.r, color.g, color.b) });
      ctx.y -= size + 4;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) {
    checkPage(ctx, size + 6);
    ctx.page.drawText(line, { x, y: ctx.y, size, font: usedFont, color: ctx.rgb(color.r, color.g, color.b) });
    ctx.y -= size + 4;
  }
  ctx.y -= 6;
}

function drawSectionTitle(ctx: PdfContext, text: string): void {
  checkPage(ctx, 40);
  ctx.y -= 12;
  drawText(ctx, text, { size: 14, bold: true, color: C.VERT, centered: true });
  // Ligne verte sous le titre
  ctx.page.drawLine({
    start: { x: MARGIN + 50, y: ctx.y + 2 },
    end: { x: PAGE_W - MARGIN - 50, y: ctx.y + 2 },
    thickness: 1.5, color: ctx.rgb(C.VERT.r, C.VERT.g, C.VERT.b),
  });
  ctx.y -= 10;
}

function drawSubTitle(ctx: PdfContext, text: string): void {
  checkPage(ctx, 30);
  ctx.y -= 6;
  drawText(ctx, text, { size: 12, bold: true, color: C.VERT_FONCE });
  ctx.y -= 2;
}

function drawBullet(ctx: PdfContext, text: string): void {
  drawWrapped(ctx, `•  ${text}`, { x: MARGIN + 15, maxW: CONTENT_W - 15 });
}

function drawSeparator(ctx: PdfContext): void {
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 0.5, color: ctx.rgb(C.BORDER.r, C.BORDER.g, C.BORDER.b),
  });
  ctx.y -= 10;
}

/** Dessine un tableau simple avec header et lignes alternées */
function drawTable(ctx: PdfContext, headers: string[], rows: string[][], colWidths: number[]): void {
  const rowH = 16;
  const headerH = 20;
  const tableW = colWidths.reduce((a, b) => a + b, 0);
  const startX = MARGIN;

  // Vérifier l'espace
  const totalH = headerH + rows.length * rowH + 10;
  checkPage(ctx, Math.min(totalH, 200));

  // Header
  ctx.page.drawRectangle({
    x: startX, y: ctx.y - headerH, width: tableW, height: headerH,
    color: ctx.rgb(C.BLEU.r, C.BLEU.g, C.BLEU.b),
  });

  let colX = startX;
  for (let i = 0; i < headers.length; i++) {
    ctx.page.drawText(headers[i], {
      x: colX + 4, y: ctx.y - headerH + 5,
      size: 8, font: ctx.fontBold, color: ctx.rgb(C.BLANC.r, C.BLANC.g, C.BLANC.b),
    });
    colX += colWidths[i];
  }
  ctx.y -= headerH;

  // Rows
  for (let ri = 0; ri < rows.length; ri++) {
    checkPage(ctx, rowH + 5);

    if (ri % 2 === 1) {
      ctx.page.drawRectangle({
        x: startX, y: ctx.y - rowH, width: tableW, height: rowH,
        color: ctx.rgb(C.GRIS_C.r, C.GRIS_C.g, C.GRIS_C.b),
      });
    }

    colX = startX;
    for (let ci = 0; ci < rows[ri].length; ci++) {
      const cellText = (rows[ri][ci] || "").substring(0, 50);
      ctx.page.drawText(cellText, {
        x: colX + 4, y: ctx.y - rowH + 4,
        size: 8, font: ctx.font, color: ctx.rgb(C.GRIS_F.r, C.GRIS_F.g, C.GRIS_F.b),
      });
      colX += colWidths[ci];
    }
    ctx.y -= rowH;
  }

  // Bordure du tableau
  ctx.page.drawRectangle({
    x: startX, y: ctx.y, width: tableW, height: 0,
    borderColor: ctx.rgb(C.BORDER.r, C.BORDER.g, C.BORDER.b),
    borderWidth: 0.5,
  });
  ctx.y -= 10;
}

function addPageFooters(ctx: PdfContext): void {
  const totalPages = ctx.doc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const pg = ctx.doc.getPage(i);
    pg.drawText(`Consulat.ga — Projet de Coopération — Confidentiel | Page ${i + 1}/${totalPages}`, {
      x: MARGIN, y: 20, size: 7, font: ctx.font,
      color: ctx.rgb(C.GRIS_M.r, C.GRIS_M.g, C.GRIS_M.b),
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GÉNÉRATEUR PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export async function generateProjectPdf(data: ProjectData): Promise<Uint8Array> {
  // Import dynamique — pdf-lib est un module CommonJS dans le runtime Node Convex
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  let PDFDocument: any, StandardFonts: any, rgb: any;
  try {
    const pdfLib = require("pdf-lib");
    PDFDocument = pdfLib.PDFDocument;
    StandardFonts = pdfLib.StandardFonts;
    rgb = pdfLib.rgb;
  } catch {
    // Fallback : import ESM
    const pdfLib = await import("pdf-lib");
    PDFDocument = pdfLib.PDFDocument;
    StandardFonts = pdfLib.StandardFonts;
    rgb = pdfLib.rgb;
  }

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: PdfContext = { doc, page: null, y: 0, font, fontBold, rgb };

  // ═══ PAGE DE COUVERTURE ═══
  newPage(ctx);
  drawGabonBanner(ctx);
  ctx.y = PAGE_H - 60;

  drawText(ctx, "RÉPUBLIQUE GABONAISE", { size: 16, bold: true, color: C.VERT, centered: true });
  drawText(ctx, "Union – Travail – Justice", { size: 10, color: C.GRIS_M, centered: true });
  ctx.y -= 10;
  drawText(ctx, "Ministère des Affaires Étrangères", { size: 10, bold: true, color: C.GRIS_F, centered: true });
  ctx.y -= 40;
  drawText(ctx, "PROJET DE COOPÉRATION", { size: 20, bold: true, color: C.VERT, centered: true });
  ctx.y -= 10;
  drawText(ctx, data.title, { size: 14, bold: true, color: C.BLEU, centered: true });
  ctx.y -= 20;
  drawText(ctx, `Partenaire : ${data.partnerName} — ${data.partnerCountry}`, { size: 10, color: C.GRIS_M, centered: true });
  drawText(ctx, `Secteur : ${data.partnerSector} | Type : ${data.projectTypeLabel}`, { size: 10, color: C.GRIS_M, centered: true });
  ctx.y -= 20;
  if (data.scenarioRetenu) {
    const scenColor = hexToRgb(data.scenarioRetenu === "ambitieux" ? COLORS.VERT_GABON : data.scenarioRetenu === "realiste" ? COLORS.BLEU_GABON : COLORS.AMBER_MOYEN);
    drawText(ctx, `Scénario retenu : ${data.scenarioRetenu.toUpperCase()}`, { size: 11, bold: true, color: scenColor, centered: true });
  }
  ctx.y -= 40;
  drawText(ctx, data.dateStr, { size: 11, bold: true, color: C.VERT, centered: true });
  drawText(ctx, "DOCUMENT CONFIDENTIEL", { size: 10, bold: true, color: C.ROUGE, centered: true });

  // ═══ SOMMAIRE ═══
  newPage(ctx);
  drawSectionTitle(ctx, "SOMMAIRE");
  const tocEntries = [
    "Partie I. Résumé Exécutif",
    "Partie II. Contexte et Justification",
    "Partie III. Cadre Logique",
    "Partie IV. Description des Activités",
    "Partie V. Budget Détaillé",
    "Partie VI. Calendrier",
    "Partie VII. Cadre Juridique",
    "Partie VIII. Parties Prenantes",
    "Partie IX. Suivi et Évaluation",
    "Partie X. Analyse des Risques",
    "Partie XI. Impact Attendu",
    "Conclusion",
  ];
  for (const entry of tocEntries) {
    drawText(ctx, entry, { size: 10, bold: true, color: C.BLEU });
  }

  // ═══ PARTIE I — RÉSUMÉ EXÉCUTIF ═══
  newPage(ctx);
  drawSectionTitle(ctx, "Partie I. RÉSUMÉ EXÉCUTIF");
  drawWrapped(ctx, data.description);
  ctx.y -= 10;

  drawTable(ctx, ["Critère", "Valeur"], [
    ["Intitulé", data.title],
    ["Type", data.projectTypeLabel],
    ["Partenaire", data.partnerName],
    ["Pays", data.partnerCountry],
    ["Secteur", data.partnerSector],
    ["Budget", `${data.budget} ${data.currency}`],
    ["Durée", data.duration],
    ["Emplois estimés", data.estimatedJobs],
    ["Bénéficiaires", data.beneficiaries],
  ], [200, CONTENT_W - 200]);

  // ═══ PARTIE II — CONTEXTE ═══
  newPage(ctx);
  drawSectionTitle(ctx, "Partie II. CONTEXTE ET JUSTIFICATION");
  drawSubTitle(ctx, "1. Contexte national");
  drawWrapped(ctx, data.contextNational);
  drawSubTitle(ctx, "2. Justification du partenariat");
  drawWrapped(ctx, data.contextJustification);
  if (data.assumptions.length > 0) {
    drawSubTitle(ctx, "3. Hypothèses critiques");
    for (const a of data.assumptions) drawBullet(ctx, a);
  }

  // ═══ PARTIE III — CADRE LOGIQUE ═══
  newPage(ctx);
  drawSectionTitle(ctx, "Partie III. CADRE LOGIQUE");
  drawSubTitle(ctx, "Objectif général");
  drawWrapped(ctx, data.generalObjective);
  drawSubTitle(ctx, "Objectif spécifique");
  drawWrapped(ctx, data.specificObjective);

  for (const result of data.results) {
    drawSubTitle(ctx, `Résultat ${result.id} : ${result.title}`);
    if (result.indicators.length > 0) {
      drawTable(ctx,
        ["Indicateur", "Cible", "Vérification"],
        result.indicators.map((ind) => [ind.indicator, ind.targetValue, ind.verificationMeans]),
        [180, 150, 165],
      );
    }
    if (result.activities.length > 0) {
      drawText(ctx, "Activités :", { size: 9, bold: true, color: C.GRIS_F });
      for (const act of result.activities) drawBullet(ctx, `${act.id} : ${act.description}`);
    }
  }

  // ═══ PARTIE IV — ACTIVITÉS ═══
  newPage(ctx);
  drawSectionTitle(ctx, "Partie IV. DESCRIPTION DES ACTIVITÉS");
  for (const result of data.results) {
    drawSubTitle(ctx, `${result.id}. ${result.title}`);
    for (const act of result.activities) {
      drawText(ctx, `Activité ${act.id}`, { size: 10, bold: true, color: C.BLEU });
      drawWrapped(ctx, act.description);
    }
  }

  // ═══ PARTIE V — BUDGET ═══
  newPage(ctx);
  drawSectionTitle(ctx, "Partie V. BUDGET DÉTAILLÉ");
  drawText(ctx, `Budget total : ${data.budgetTotal} ${data.budgetCurrency}`, { size: 12, bold: true, color: C.VERT });
  ctx.y -= 10;

  if (data.budgetItems.length > 0) {
    drawSubTitle(ctx, "Répartition par poste");
    drawTable(ctx,
      ["Poste", "Montant", "%"],
      data.budgetItems.map((item) => [item.category, item.amount, `${item.percentage}%`]),
      [220, 150, 125],
    );
  }

  if (data.budgetSources.length > 0) {
    drawSubTitle(ctx, "Sources de financement");
    drawTable(ctx,
      ["Source", "Instrument", "Montant"],
      data.budgetSources.map((s) => [s.source, s.instrument, s.amount]),
      [170, 170, 155],
    );
  }

  // ═══ PARTIE VI — CALENDRIER ═══
  newPage(ctx);
  drawSectionTitle(ctx, "Partie VI. CALENDRIER");
  drawText(ctx, `Durée totale : ${data.totalDuration}`, { size: 11, bold: true, color: C.VERT });
  ctx.y -= 10;

  if (data.phases.length > 0) {
    drawTable(ctx,
      ["Phase", "Début", "Fin", "Livrables"],
      data.phases.map((ph) => [ph.phase, ph.startDate, ph.endDate, ph.deliverables.slice(0, 2).join("; ")]),
      [130, 80, 80, 205],
    );
  }

  // ═══ PARTIE VII — JURIDIQUE ═══
  newPage(ctx);
  drawSectionTitle(ctx, "Partie VII. CADRE JURIDIQUE");
  drawSubTitle(ctx, "Type d'accord");
  drawWrapped(ctx, data.agreementTypeDetail);
  drawSubTitle(ctx, "Base juridique");
  drawWrapped(ctx, data.legalBasis);
  if (data.requiredAuthorizations.length > 0) {
    drawSubTitle(ctx, "Autorisations requises");
    for (const a of data.requiredAuthorizations) drawBullet(ctx, a);
  }
  if (data.essentialClauses.length > 0) {
    drawSubTitle(ctx, "Clauses essentielles");
    for (const c of data.essentialClauses) drawBullet(ctx, c);
  }

  // ═══ PARTIE VIII — PARTIES PRENANTES ═══
  newPage(ctx);
  drawSectionTitle(ctx, "Partie VIII. PARTIES PRENANTES");
  if (data.stakeholders.length > 0) {
    drawTable(ctx,
      ["Nom", "Rôle", "Organisation", "Contact"],
      data.stakeholders.map((s) => [s.name, s.role, s.organization, s.contact]),
      [130, 110, 130, 125],
    );
  }

  // ═══ PARTIE IX — SUIVI ET ÉVALUATION ═══
  newPage(ctx);
  drawSectionTitle(ctx, "Partie IX. SUIVI ET ÉVALUATION");
  drawSubTitle(ctx, "Mécanisme de suivi");
  drawWrapped(ctx, data.monitoringMechanism);
  drawSubTitle(ctx, "Fréquence des rapports");
  drawWrapped(ctx, data.reportingFrequency);

  if (data.monitoringKpis.length > 0) {
    drawSubTitle(ctx, "Indicateurs de performance");
    drawTable(ctx,
      ["KPI", "Cible", "Fréquence"],
      data.monitoringKpis.map((k) => [k.indicator, k.target, k.frequency]),
      [200, 150, 145],
    );
  }

  drawSubTitle(ctx, "Évaluation finale");
  drawWrapped(ctx, data.finalEvaluation);

  // ═══ PARTIE X — RISQUES ═══
  newPage(ctx);
  drawSectionTitle(ctx, "Partie X. ANALYSE DES RISQUES");
  if (data.risks.length > 0) {
    drawTable(ctx,
      ["Catégorie", "Risque", "Prob.", "Impact", "Atténuation"],
      data.risks.map((r) => [r.category, r.risk, r.probability, r.impact, r.mitigation]),
      [70, 120, 50, 50, 205],
    );
  }

  // ═══ PARTIE XI — IMPACT ═══
  newPage(ctx);
  drawSectionTitle(ctx, "Partie XI. IMPACT ATTENDU");

  if (data.economicImpact.length > 0) {
    drawSubTitle(ctx, "Impact économique");
    for (const e of data.economicImpact) drawBullet(ctx, e);
  }
  if (data.socialImpact.length > 0) {
    drawSubTitle(ctx, "Impact social");
    for (const s of data.socialImpact) drawBullet(ctx, s);
  }
  if (data.environmentalImpact.length > 0) {
    drawSubTitle(ctx, "Impact environnemental");
    for (const e of data.environmentalImpact) drawBullet(ctx, e);
  }
  if (data.quantifiableImpacts.length > 0) {
    drawSubTitle(ctx, "Impacts quantifiables");
    drawTable(ctx,
      ["Indicateur", "Valeur"],
      data.quantifiableImpacts.map((q) => [q.indicator, q.value]),
      [250, 245],
    );
  }

  // ═══ CONCLUSION ═══
  drawSeparator(ctx);
  drawSectionTitle(ctx, "CONCLUSION");
  drawWrapped(ctx, "Ce projet de coopération constitue une réponse stratégique aux défis de développement identifiés. " +
    "Basé sur une analyse contextualisée et un cadre logique robuste, il propose une approche intégrée " +
    "alliant ressources techniques, financières et institutionnelles.");

  // ═══ PIEDS DE PAGE ═══
  addPageFooters(ctx);

  return await doc.save();
}
