/**
 * Générateur DOCX — Projet de Coopération
 *
 * Document professionnel au standard bailleurs de fonds internationaux.
 * 11 sections + couverture + sommaire + conclusion + annexes.
 */

import type { ProjectData } from "./projectDocHelpers";
import { PAGE, COLORS, FONTS, riskColor, tintForColor } from "./projectDocHelpers";

// ════════════════════════════════════════════════════════════════════════════
// HELPERS DOCX
// ════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocxLib = any;
let D: DocxLib;

async function loadDocx(): Promise<DocxLib> {
  if (!D) D = await import("docx");
  return D;
}

// ─── Paragraphes ────────────────────────────────────────────────────────────

function p(text: string, opts: {
  size?: number; font?: string; color?: string; bold?: boolean;
  italic?: boolean; alignment?: number; spacing?: { before?: number; after?: number };
} = {}) {
  const {
    size = 22, font = FONTS.BODY, color = COLORS.GRIS_FONCE,
    bold = false, italic = false,
    alignment = D.AlignmentType.BOTH,
    spacing = { before: 60, after: 120 },
  } = opts;
  return new D.Paragraph({
    alignment,
    spacing,
    children: [new D.TextRun({ text, font, size, bold, italics: italic, color })],
  });
}

function h1(text: string) {
  return new D.Paragraph({
    alignment: D.AlignmentType.CENTER,
    spacing: { before: 360, after: 240 },
    border: { bottom: { color: COLORS.VERT_GABON, space: 1, style: D.BorderStyle.SINGLE, size: 12 } },
    children: [new D.TextRun({ text, font: FONTS.TITLE, size: 28, bold: true, color: COLORS.VERT_GABON })],
  });
}

function h2(text: string) {
  return new D.Paragraph({
    alignment: D.AlignmentType.LEFT,
    spacing: { before: 240, after: 120 },
    border: { bottom: { color: COLORS.VERT_FONCE, space: 1, style: D.BorderStyle.SINGLE, size: 6 } },
    children: [new D.TextRun({ text, font: FONTS.HEADING, size: 24, bold: true, color: COLORS.VERT_FONCE })],
  });
}

function h3(text: string) {
  return new D.Paragraph({
    alignment: D.AlignmentType.LEFT,
    spacing: { before: 160, after: 80 },
    children: [new D.TextRun({ text, font: FONTS.HEADING, size: 22, bold: true, color: COLORS.BLEU_MARINE })],
  });
}

function h4(text: string) {
  return new D.Paragraph({
    alignment: D.AlignmentType.LEFT,
    spacing: { before: 80, after: 60 },
    children: [new D.TextRun({ text, font: FONTS.HEADING, size: 22, bold: true, italics: true, color: COLORS.GRIS_FONCE })],
  });
}

function bullet(text: string) {
  return new D.Paragraph({
    alignment: D.AlignmentType.BOTH,
    spacing: { before: 0, after: 80 },
    indent: { left: 720, hanging: 360 },
    children: [new D.TextRun({ text: `•  ${text}`, font: FONTS.BODY, size: 22, color: COLORS.GRIS_FONCE })],
  });
}

function figureCaption(text: string) {
  return new D.Paragraph({
    alignment: D.AlignmentType.CENTER,
    spacing: { before: 120, after: 240 },
    children: [new D.TextRun({ text, font: FONTS.BODY, size: 20, italics: true, color: COLORS.GRIS_MOYEN })],
  });
}

function pageBreak() {
  return new D.Paragraph({ children: [new D.PageBreak()] });
}

// ─── Composants avancés ─────────────────────────────────────────────────────

function makeTable(headers: string[], rows: string[][], opts: {
  headerBg?: string; headerText?: string; altRowBg?: string;
  colWidths?: number[];
} = {}) {
  const {
    headerBg = COLORS.BLEU_MARINE, headerText = COLORS.BLANC,
    altRowBg = COLORS.GRIS_CLAIR,
  } = opts;
  const colWidths = opts.colWidths || headers.map(() => Math.floor(PAGE.CONTENT_W / headers.length));
  const borders = {
    top: { style: D.BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
    bottom: { style: D.BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
    left: { style: D.BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
    right: { style: D.BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
  };
  const margins = { top: 80, bottom: 80, left: 120, right: 120 };

  return new D.Table({
    width: { size: PAGE.CONTENT_W, type: D.WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new D.TableRow({
        children: headers.map((h, i) => new D.TableCell({
          borders,
          shading: { fill: headerBg, type: D.ShadingType.CLEAR },
          margins,
          width: { size: colWidths[i], type: D.WidthType.DXA },
          children: [new D.Paragraph({
            alignment: D.AlignmentType.CENTER,
            children: [new D.TextRun({ text: h, font: FONTS.HEADING, size: 22, bold: true, color: headerText })],
          })],
        })),
      }),
      ...rows.map((row, ri) => new D.TableRow({
        children: row.map((cell, ci) => new D.TableCell({
          borders,
          shading: ri % 2 === 1 ? { fill: altRowBg, type: D.ShadingType.CLEAR } : undefined,
          margins,
          width: { size: colWidths[ci], type: D.WidthType.DXA },
          children: [new D.Paragraph({
            alignment: D.AlignmentType.CENTER,
            children: [new D.TextRun({ text: String(cell || ""), font: FONTS.BODY, size: 22, color: COLORS.GRIS_FONCE })],
          })],
        })),
      })),
    ],
  });
}

/**
 * Info box avec barre d'accent colorée + fond teinté
 */
function infoBox(title: string, content: string, accentColor = COLORS.VERT_GABON) {
  const tint = tintForColor(accentColor);
  const borders = {
    top: { style: D.BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
    bottom: { style: D.BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
    left: { style: D.BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
    right: { style: D.BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
  };

  return new D.Table({
    width: { size: PAGE.CONTENT_W, type: D.WidthType.DXA },
    columnWidths: [PAGE.CONTENT_W],
    rows: [
      new D.TableRow({
        children: [new D.TableCell({
          borders,
          shading: { fill: accentColor, type: D.ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new D.Paragraph({
            children: [new D.TextRun({ text: title, font: FONTS.HEADING, size: 22, bold: true, color: COLORS.BLANC })],
          })],
        })],
      }),
      new D.TableRow({
        children: [new D.TableCell({
          borders,
          shading: { fill: tint, type: D.ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 160, right: 160 },
          children: [new D.Paragraph({
            alignment: D.AlignmentType.BOTH,
            spacing: { before: 0, after: 0 },
            children: [new D.TextRun({ text: content, font: FONTS.BODY, size: 22, color: COLORS.GRIS_FONCE })],
          })],
        })],
      }),
    ],
  });
}

/**
 * KPI cards — grosses valeurs dans une grille sans bordures
 */
function kpiCards(cards: { label: string; value: string; color: string }[]) {
  const colW = Math.floor(PAGE.CONTENT_W / cards.length);
  const noBorder = { style: D.BorderStyle.NONE, size: 0, color: COLORS.BLANC };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  return new D.Table({
    width: { size: PAGE.CONTENT_W, type: D.WidthType.DXA },
    columnWidths: cards.map(() => colW),
    rows: [new D.TableRow({
      children: cards.map((card) => new D.TableCell({
        borders: noBorders,
        margins: { top: 80, bottom: 80, left: 40, right: 40 },
        width: { size: colW, type: D.WidthType.DXA },
        verticalAlign: D.VerticalAlign.CENTER,
        children: [
          new D.Paragraph({
            alignment: D.AlignmentType.CENTER,
            spacing: { before: 0, after: 0 },
            children: [new D.TextRun({ text: card.value, font: FONTS.TITLE, size: 56, bold: true, color: card.color })],
          }),
          new D.Paragraph({
            alignment: D.AlignmentType.CENTER,
            spacing: { before: 40, after: 0 },
            children: [new D.TextRun({ text: card.label, font: FONTS.BODY, size: 20, color: COLORS.GRIS_MOYEN })],
          }),
        ],
      })),
    })],
  });
}

// ════════════════════════════════════════════════════════════════════════════
// SECTIONS
// ════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createCoverPage(data: ProjectData): any[] {
  return [
    p("RÉPUBLIQUE GABONAISE", { size: 32, font: FONTS.TITLE, bold: true, color: COLORS.VERT_GABON, alignment: D.AlignmentType.CENTER }),
    p("Union – Travail – Justice", { size: 22, italic: true, alignment: D.AlignmentType.CENTER, spacing: { before: 40, after: 240 } }),
    p("Ministère des Affaires Étrangères", { size: 22, bold: true, alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 240 } }),
    p("PROJET DE COOPÉRATION", { size: 28, font: FONTS.TITLE, bold: true, color: COLORS.VERT_GABON, alignment: D.AlignmentType.CENTER, spacing: { before: 360, after: 80 } }),
    p(data.title, { size: 24, italic: true, color: COLORS.VERT_FONCE, alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 360 } }),
    p(`Partenaire : ${data.partnerName} — ${data.partnerCountry}`, { size: 20, italic: true, color: COLORS.GRIS_MOYEN, alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 120 } }),
    p(`Secteur : ${data.partnerSector} | Type : ${data.projectTypeLabel}`, { size: 20, color: COLORS.GRIS_MOYEN, alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 360 } }),
    ...(data.scenarioRetenu ? [p(`Scénario retenu : ${data.scenarioRetenu.toUpperCase()}`, {
      size: 22, bold: true, alignment: D.AlignmentType.CENTER,
      color: data.scenarioRetenu === "ambitieux" ? COLORS.VERT_GABON : data.scenarioRetenu === "realiste" ? COLORS.BLEU_GABON : COLORS.AMBER_MOYEN,
      spacing: { before: 0, after: 240 },
    })] : []),
    p(data.dateStr, { size: 22, color: COLORS.VERT_GABON, bold: true, alignment: D.AlignmentType.CENTER, spacing: { before: 240, after: 120 } }),
    p("DOCUMENT CONFIDENTIEL", { size: 20, bold: true, color: COLORS.ROUGE_RISQUE, alignment: D.AlignmentType.CENTER, spacing: { before: 120, after: 0 } }),
    pageBreak(),
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createTableOfContents(data: ProjectData): any[] {
  const entries: { text: string; level: number }[] = [
    { text: "Partie I. Résumé Exécutif", level: 0 },
    { text: "1. Présentation générale", level: 1 },
    { text: "2. Indicateurs clés", level: 1 },
    { text: "Partie II. Contexte et Justification", level: 0 },
    { text: "1. Contexte national", level: 1 },
    { text: "2. Justification du partenariat", level: 1 },
    ...(data.assumptions.length > 0 ? [{ text: "3. Hypothèses critiques", level: 1 }] : []),
    { text: "Partie III. Cadre Logique", level: 0 },
    { text: "Partie IV. Description Détaillée des Activités", level: 0 },
    { text: "Partie V. Budget Détaillé", level: 0 },
    { text: "Partie VI. Calendrier de Mise en Œuvre", level: 0 },
    { text: "Partie VII. Cadre Institutionnel et Juridique", level: 0 },
    { text: "Partie VIII. Parties Prenantes", level: 0 },
    { text: "Partie IX. Suivi et Évaluation", level: 0 },
    { text: "Partie X. Analyse des Risques", level: 0 },
    { text: "Partie XI. Impact Attendu", level: 0 },
    { text: "Conclusion", level: 0 },
    { text: "Annexes", level: 0 },
  ];

  const sizes = [24, 22];
  const colors = [COLORS.BLEU_MARINE, COLORS.GRIS_FONCE];
  const bolds = [true, false];

  return [
    p("SOMMAIRE", { size: 28, font: FONTS.TITLE, bold: true, color: COLORS.VERT_GABON, alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 240 } }),
    ...entries.map((e) => new D.Paragraph({
      indent: { left: e.level * 400 },
      spacing: { before: 40, after: 60 },
      children: [new D.TextRun({
        text: e.text, font: FONTS.HEADING, size: sizes[e.level],
        bold: bolds[e.level], color: colors[e.level],
      })],
    })),
    pageBreak(),
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPartExecutiveSummary(data: ProjectData): any[] {
  const sections = [
    h1("Partie I. RÉSUMÉ EXÉCUTIF"),
    h2("1. Présentation générale"),
    p(data.description),
    makeTable(["Critère", "Valeur"], [
      ["Intitulé du projet", data.title],
      ["Type", data.projectTypeLabel],
      ["Partenaire", data.partnerName],
      ["Pays", data.partnerCountry],
      ["Secteur", data.partnerSector],
      ["Budget total", `${data.budget} ${data.currency}`],
      ["Durée", data.duration],
      ["Type d'accord", data.agreementType],
      ["Emplois estimés", data.estimatedJobs],
      ["Bénéficiaires", data.beneficiaries],
    ], { headerBg: COLORS.VERT_GABON, colWidths: [3200, 6160] }),
    p(""),
  ];

  if (data.kpis.length > 0) {
    sections.push(h2("2. Indicateurs clés"));
    sections.push(kpiCards(data.kpis));
    sections.push(p(""));
  }

  sections.push(pageBreak());
  return sections;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPartContext(data: ProjectData): any[] {
  const sections = [
    h1("Partie II. CONTEXTE ET JUSTIFICATION"),
    h2("1. Contexte national"),
    p(data.contextNational),
    h2("2. Justification du partenariat"),
    p(data.contextJustification),
  ];

  if (data.assumptions.length > 0) {
    sections.push(h2("3. Hypothèses critiques"));
    for (const a of data.assumptions) sections.push(bullet(a));
  }

  sections.push(pageBreak());
  return sections;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPartLogicalFramework(data: ProjectData): any[] {
  const sections = [
    h1("Partie III. CADRE LOGIQUE"),
    h2("1. Objectif général"),
    p(data.generalObjective),
    h2("2. Objectif spécifique"),
    p(data.specificObjective),
    h2("3. Résultats et indicateurs"),
  ];

  for (const result of data.results) {
    sections.push(h3(`Résultat ${result.id} : ${result.title}`));
    sections.push(p(result.description));

    if (result.indicators.length > 0) {
      sections.push(h4("Indicateurs"));
      sections.push(makeTable(
        ["Indicateur", "Valeur cible", "Moyen de vérification"],
        result.indicators.map((ind) => [ind.indicator, ind.targetValue, ind.verificationMeans]),
        { colWidths: [3500, 2800, 3060] },
      ));
      sections.push(p(""));
    }

    if (result.activities.length > 0) {
      sections.push(h4("Activités"));
      for (const act of result.activities) {
        sections.push(bullet(`${act.id} : ${act.description}`));
      }
      sections.push(p(""));
    }
  }

  sections.push(pageBreak());
  return sections;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPartActivities(data: ProjectData): any[] {
  const sections = [h1("Partie IV. DESCRIPTION DÉTAILLÉE DES ACTIVITÉS")];

  for (const result of data.results) {
    sections.push(h2(`${result.id}. ${result.title}`));
    for (const act of result.activities) {
      sections.push(h3(`Activité ${act.id}`));
      sections.push(p(act.description));
    }
  }

  sections.push(pageBreak());
  return sections;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPartBudget(data: ProjectData): any[] {
  const sections = [
    h1("Partie V. BUDGET DÉTAILLÉ"),
    h2("1. Montant total"),
    infoBox("Budget total du projet", `${data.budgetTotal} ${data.budgetCurrency}`, COLORS.VERT_GABON),
    p(""),
  ];

  if (data.budgetItems.length > 0) {
    sections.push(h2("2. Répartition par poste"));
    sections.push(makeTable(
      ["Poste budgétaire", "Montant", "%"],
      data.budgetItems.map((item) => [item.category, item.amount, `${item.percentage}%`]),
      { colWidths: [4000, 3000, 2360] },
    ));
    sections.push(figureCaption("Tableau — Répartition budgétaire par poste"));
  }

  if (data.budgetSources.length > 0) {
    sections.push(h2("3. Sources de financement"));
    sections.push(makeTable(
      ["Source", "Instrument", "Montant"],
      data.budgetSources.map((s) => [s.source, s.instrument, s.amount]),
      { colWidths: [3200, 3000, 3160] },
    ));
    sections.push(p(""));
  }

  sections.push(pageBreak());
  return sections;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPartTimeline(data: ProjectData): any[] {
  const sections = [
    h1("Partie VI. CALENDRIER DE MISE EN ŒUVRE"),
    p(`Durée totale du projet : ${data.totalDuration}`),
  ];

  if (data.phases.length > 0) {
    sections.push(h2("1. Phases du projet"));

    for (const phase of data.phases) {
      sections.push(h3(phase.phase));
      sections.push(p(phase.details));
      sections.push(p(`Période : ${phase.startDate} — ${phase.endDate}`, { italic: true, color: COLORS.GRIS_MOYEN }));

      if (phase.milestones.length > 0) {
        sections.push(h4("Jalons"));
        for (const m of phase.milestones) sections.push(bullet(m));
      }
      if (phase.deliverables.length > 0) {
        sections.push(h4("Livrables"));
        for (const d of phase.deliverables) sections.push(bullet(d));
      }
      sections.push(p(""));
    }

    sections.push(h2("2. Tableau synthèse"));
    sections.push(makeTable(
      ["Phase", "Début", "Fin", "Livrables principaux"],
      data.phases.map((ph) => [
        ph.phase, ph.startDate, ph.endDate,
        ph.deliverables.slice(0, 2).join("; "),
      ]),
      { colWidths: [2500, 1800, 1800, 3260] },
    ));
    sections.push(p(""));
  }

  sections.push(pageBreak());
  return sections;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPartInstitutional(data: ProjectData): any[] {
  const sections = [
    h1("Partie VII. CADRE INSTITUTIONNEL ET JURIDIQUE"),
    h2("1. Type d'accord"),
    p(data.agreementTypeDetail),
    h2("2. Base juridique"),
    p(data.legalBasis),
  ];

  if (data.requiredAuthorizations.length > 0) {
    sections.push(h2("3. Autorisations requises"));
    for (const a of data.requiredAuthorizations) sections.push(bullet(a));
  }
  if (data.essentialClauses.length > 0) {
    sections.push(h2("4. Clauses essentielles"));
    for (const c of data.essentialClauses) sections.push(bullet(c));
  }

  sections.push(pageBreak());
  return sections;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPartStakeholders(data: ProjectData): any[] {
  const sections = [h1("Partie VIII. PARTIES PRENANTES")];

  if (data.stakeholders.length > 0) {
    sections.push(makeTable(
      ["Nom", "Rôle", "Organisation", "Contact"],
      data.stakeholders.map((s) => [s.name, s.role, s.organization, s.contact]),
      { colWidths: [2500, 2200, 2500, 2160] },
    ));
  } else {
    sections.push(p("Les parties prenantes seront identifiées lors de la phase de formulation."));
  }

  sections.push(pageBreak());
  return sections;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPartMonitoring(data: ProjectData): any[] {
  const sections = [
    h1("Partie IX. SUIVI ET ÉVALUATION"),
    h2("1. Mécanisme de suivi"),
    p(data.monitoringMechanism),
    h2("2. Fréquence des rapports"),
    p(data.reportingFrequency),
  ];

  if (data.monitoringKpis.length > 0) {
    sections.push(h2("3. Indicateurs de performance"));
    sections.push(makeTable(
      ["Indicateur", "Cible", "Fréquence"],
      data.monitoringKpis.map((k) => [k.indicator, k.target, k.frequency]),
      { colWidths: [4000, 3000, 2360] },
    ));
    sections.push(p(""));
  }

  sections.push(h2("4. Évaluation finale"));
  sections.push(p(data.finalEvaluation));
  sections.push(pageBreak());
  return sections;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPartRisks(data: ProjectData): any[] {
  const sections = [h1("Partie X. ANALYSE DES RISQUES")];

  if (data.risks.length > 0) {
    // Tableau des risques avec couleurs
    const colWidths = [1500, 2200, 1000, 1000, 2200, 1460];
    const borders = {
      top: { style: D.BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
      bottom: { style: D.BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
      left: { style: D.BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
      right: { style: D.BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
    };
    const margins = { top: 80, bottom: 80, left: 80, right: 80 };
    const headers = ["Catégorie", "Risque", "Prob.", "Impact", "Atténuation", "Resp."];

    const riskTable = new D.Table({
      width: { size: PAGE.CONTENT_W, type: D.WidthType.DXA },
      columnWidths: colWidths,
      rows: [
        new D.TableRow({
          children: headers.map((h, i) => new D.TableCell({
            borders,
            shading: { fill: COLORS.BLEU_MARINE, type: D.ShadingType.CLEAR },
            margins,
            width: { size: colWidths[i], type: D.WidthType.DXA },
            children: [new D.Paragraph({
              alignment: D.AlignmentType.CENTER,
              children: [new D.TextRun({ text: h, font: FONTS.HEADING, size: 20, bold: true, color: COLORS.BLANC })],
            })],
          })),
        }),
        ...data.risks.map((r, ri) => new D.TableRow({
          children: [
            new D.TableCell({ borders, margins, width: { size: colWidths[0], type: D.WidthType.DXA },
              shading: ri % 2 ? { fill: COLORS.GRIS_CLAIR, type: D.ShadingType.CLEAR } : undefined,
              children: [new D.Paragraph({ children: [new D.TextRun({ text: r.category, font: FONTS.BODY, size: 20, bold: true, color: COLORS.GRIS_FONCE })] })] }),
            new D.TableCell({ borders, margins, width: { size: colWidths[1], type: D.WidthType.DXA },
              shading: ri % 2 ? { fill: COLORS.GRIS_CLAIR, type: D.ShadingType.CLEAR } : undefined,
              children: [new D.Paragraph({ children: [new D.TextRun({ text: r.risk, font: FONTS.BODY, size: 20, color: COLORS.GRIS_FONCE })] })] }),
            new D.TableCell({ borders, margins, width: { size: colWidths[2], type: D.WidthType.DXA },
              shading: ri % 2 ? { fill: COLORS.GRIS_CLAIR, type: D.ShadingType.CLEAR } : undefined,
              children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: r.probability, font: FONTS.BODY, size: 20, bold: true, color: riskColor(r.probability) })] })] }),
            new D.TableCell({ borders, margins, width: { size: colWidths[3], type: D.WidthType.DXA },
              shading: ri % 2 ? { fill: COLORS.GRIS_CLAIR, type: D.ShadingType.CLEAR } : undefined,
              children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: r.impact, font: FONTS.BODY, size: 20, bold: true, color: riskColor(r.impact) })] })] }),
            new D.TableCell({ borders, margins, width: { size: colWidths[4], type: D.WidthType.DXA },
              shading: ri % 2 ? { fill: COLORS.GRIS_CLAIR, type: D.ShadingType.CLEAR } : undefined,
              children: [new D.Paragraph({ children: [new D.TextRun({ text: r.mitigation, font: FONTS.BODY, size: 20, color: COLORS.GRIS_FONCE })] })] }),
            new D.TableCell({ borders, margins, width: { size: colWidths[5], type: D.WidthType.DXA },
              shading: ri % 2 ? { fill: COLORS.GRIS_CLAIR, type: D.ShadingType.CLEAR } : undefined,
              children: [new D.Paragraph({ children: [new D.TextRun({ text: r.responsible, font: FONTS.BODY, size: 20, color: COLORS.GRIS_FONCE })] })] }),
          ],
        })),
      ],
    });

    sections.push(riskTable);
    sections.push(p(""));

    sections.push(infoBox(
      "Plan de contingence",
      "En cas de survenance d'un risque identifié, le projet dispose d'un plan d'atténuation préparé. Les responsables doivent évaluer mensuellement les risques et ajuster le plan d'exécution.",
      COLORS.AMBER_MOYEN,
    ));
  }

  sections.push(pageBreak());
  return sections;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createPartImpact(data: ProjectData): any[] {
  const sections = [h1("Partie XI. IMPACT ATTENDU")];

  if (data.economicImpact.length > 0) {
    sections.push(h2("1. Impact économique"));
    for (const e of data.economicImpact) sections.push(bullet(e));
  }

  if (data.socialImpact.length > 0) {
    sections.push(h2("2. Impact social"));
    for (const s of data.socialImpact) sections.push(bullet(s));
  }

  if (data.environmentalImpact.length > 0) {
    sections.push(h2("3. Impact environnemental"));
    for (const e of data.environmentalImpact) sections.push(bullet(e));
  }

  if (data.quantifiableImpacts.length > 0) {
    sections.push(h2("4. Impacts quantifiables"));
    sections.push(makeTable(
      ["Indicateur", "Valeur"],
      data.quantifiableImpacts.map((q) => [q.indicator, q.value]),
      { colWidths: [5000, 4360] },
    ));
    sections.push(p(""));
  }

  sections.push(pageBreak());
  return sections;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createConclusion(_data: ProjectData): any[] {
  return [
    h1("CONCLUSION"),
    p("Ce projet de coopération constitue une réponse stratégique aux défis de développement identifiés. " +
      "Basé sur une analyse contextualisée et un cadre logique robuste, il propose une approche intégrée " +
      "alliant ressources techniques, financières et institutionnelles. L'engagement des parties prenantes " +
      "et la rigueur du suivi-évaluation garantissent la réussite de la mise en œuvre."),
    p(""),
    infoBox(
      "Note importante",
      "Ce document constitue le dossier de projet complet. Les modifications apportées au cours de la mise en œuvre doivent être formellement approuvées par toutes les parties signataires.",
      COLORS.BLEU_MARINE,
    ),
    pageBreak(),
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createAnnexes(): any[] {
  const annexes = [
    "Plan Stratégique du partenariat (réf. Plan associé)",
    "Fiches des parties prenantes",
    "Termes de référence des experts",
    "Cartographie du secteur",
    "Cadre juridique détaillé",
    "Lettres diplomatiques échangées",
    "Comptes-rendus de réunions",
  ];

  return [
    h1("ANNEXES"),
    p("Les documents suivants sont joints au présent dossier de projet :"),
    ...annexes.map((a, i) => new D.Paragraph({
      spacing: { after: 60 },
      children: [
        new D.TextRun({ text: `Annexe ${i + 1} — `, bold: true, font: FONTS.BODY, size: 22, color: COLORS.VERT_FONCE }),
        new D.TextRun({ text: a, font: FONTS.BODY, size: 22, color: COLORS.GRIS_FONCE }),
      ],
    })),
  ];
}

// ════════════════════════════════════════════════════════════════════════════
// ASSEMBLAGE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Génère le DOCX complet du Projet de Coopération
 * @returns Buffer du fichier DOCX
 */
export async function generateProjectDocx(data: ProjectData): Promise<Buffer> {
  await loadDocx();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const children: any[] = [
    ...createCoverPage(data),
    ...createTableOfContents(data),
    ...createPartExecutiveSummary(data),
    ...createPartContext(data),
    ...createPartLogicalFramework(data),
    ...createPartActivities(data),
    ...createPartBudget(data),
    ...createPartTimeline(data),
    ...createPartInstitutional(data),
    ...createPartStakeholders(data),
    ...createPartMonitoring(data),
    ...createPartRisks(data),
    ...createPartImpact(data),
    ...createConclusion(data),
    ...createAnnexes(),
  ];

  const doc = new D.Document({
    sections: [{
      properties: {
        page: {
          margins: {
            top: PAGE.MARGIN_TOP,
            bottom: PAGE.MARGIN_BOTTOM,
            left: PAGE.MARGIN_LEFT,
            right: PAGE.MARGIN_RIGHT,
          },
        },
      },
      headers: {
        default: new D.Header({
          children: [new D.Paragraph({
            alignment: D.AlignmentType.RIGHT,
            children: [new D.TextRun({
              text: `Projet de Coopération — ${data.partnerName}`,
              font: FONTS.BODY, size: 16, color: COLORS.GRIS_MOYEN, italics: true,
            })],
          })],
        }),
      },
      footers: {
        default: new D.Footer({
          children: [new D.Paragraph({
            alignment: D.AlignmentType.CENTER,
            border: { top: { style: D.BorderStyle.SINGLE, size: 2, color: COLORS.GRIS_CLAIR, space: 4 } },
            children: [
              new D.TextRun({ text: "consulat.ga — Confidentiel — Page ", font: FONTS.BODY, size: 16, color: COLORS.GRIS_MOYEN }),
              new D.TextRun({ children: [D.PageNumber.CURRENT], font: FONTS.BODY, size: 16, color: COLORS.GRIS_MOYEN }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  return await D.Packer.toBuffer(doc);
}
