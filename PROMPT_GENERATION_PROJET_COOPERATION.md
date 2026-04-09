# Prompt d'implémentation — Génération de Documents "Projet de Coopération"

> **Module :** Affaires Diplomatiques — Pipeline IA  
> **Formats de sortie :** DOCX (document principal), PPTX (présentation synthèse), PDF (archivage)  
> **Bibliothèques :** `docx` (DOCX), `pptxgenjs` (PPTX), `chartjs-node-canvas` (graphiques)  
> **Prérequis :** Lire `convex/_generated/ai/guidelines.md` + `DESIGN_CHARTER.md`

---

## Contexte

Le **Projet de Coopération** est la Phase 5 (finale) du pipeline diplomatique pour les Affaires du Consulat du Gabon :

```
CIBLES → PLAN STRATÉGIQUE → LETTRES → RAPPORTS → [PROJET DE COOPÉRATION]
```

Le projet de coopération est pré-structuré depuis le plan stratégique (scénario retenu), puis enrichi itérativement par les rapports de réunion et retours terrain. Quand le projet est approuvé, il génère un dossier complet au **standard des bailleurs de fonds internationaux** (cadre logique, budget, calendrier, risques, suivi-évaluation).

### Données source

Le projet contient :

1. **`metadata`** — titre, institution destinataire, secteur, contexte, partenaire
2. **`projectFramework`** (enrichi) — cadre logique, budget détaillé, calendrier, juridique, parties prenantes, suivi, impact, risques
3. **`stakeholders`** — liste complète des acteurs

La génération utilise **`projectFramework`** comme source principale.

---

## Schéma Convex `projectFrameworkValidator`

```typescript
export const projectFrameworkValidator = v.object({
  // Résumé exécutif
  executiveSummary: v.optional(v.object({
    title: v.string(),
    type: v.string(), // "Projet de développement", "Partenariat technique", etc.
    partner: v.string(),
    country: v.string(),
    sector: v.string(),
    budget: v.number(),
    currency: v.string(), // "EUR", "USD", "XAF"
    duration: v.string(), // "24 mois"
    agreementType: v.string(), // "Bilatéral", "Multilatéral", "Accord d'aide"
    estimatedJobs: v.number(),
    beneficiaries: v.number(),
    description: v.string(),
    kpis: v.array(v.object({
      label: v.string(),
      value: v.string(),
      color: v.string(), // "009E49", "2563EB", etc.
    })),
  })),

  // Contexte et justification
  context: v.optional(v.object({
    national: v.string(), // Contexte national
    justification: v.string(), // Justification du partenariat
    assumptions: v.array(v.string()), // Hypothèses critiques
  })),

  // Cadre logique
  logicalFramework: v.optional(v.object({
    generalObjective: v.string(),
    specificObjective: v.string(),
    results: v.array(v.object({
      id: v.string(), // "R1", "R2", etc.
      title: v.string(),
      description: v.string(),
      indicators: v.array(v.object({
        indicator: v.string(),
        targetValue: v.string(),
        verificationMeans: v.string(),
      })),
      activities: v.array(v.object({
        id: v.string(), // "1.1", "1.2", etc.
        description: v.string(),
      })),
    })),
  })),

  // Budget
  budget: v.optional(v.object({
    total: v.number(),
    currency: v.string(),
    items: v.array(v.object({
      category: v.string(), // "Personnel", "Équipement", etc.
      amount: v.number(),
      percentage: v.number(),
    })),
    sources: v.array(v.object({
      source: v.string(),
      amount: v.number(),
      percentage: v.number(),
    })),
  })),

  // Calendrier
  timeline: v.optional(v.object({
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(),
    phases: v.array(v.object({
      phase: v.string(),
      details: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      milestones: v.array(v.string()),
      deliverables: v.array(v.string()),
    })),
  })),

  // Cadre institutionnel
  institutional: v.optional(v.object({
    agreementType: v.string(),
    legalBasis: v.string(),
    requiredAuthorizations: v.array(v.string()),
    essentialClauses: v.array(v.string()),
  })),

  // Parties prenantes
  stakeholders: v.optional(v.array(v.object({
    name: v.string(),
    role: v.string(),
    organization: v.string(),
    contact: v.string(),
  }))),

  // Suivi et évaluation
  monitoringEvaluation: v.optional(v.object({
    mechanism: v.string(),
    reportingFrequency: v.string(),
    kpis: v.array(v.object({
      indicator: v.string(),
      target: v.string(),
      frequency: v.string(),
    })),
    finalEvaluation: v.string(),
  })),

  // Risques
  risks: v.optional(v.array(v.object({
    risk: v.string(),
    probability: v.string(), // "Faible", "Moyen", "Élevé"
    impact: v.string(),
    mitigation: v.string(),
  }))),

  // Impact
  impact: v.optional(v.object({
    economic: v.string(),
    social: v.string(),
    environmental: v.string(),
    quantifiable: v.array(v.object({
      indicator: v.string(),
      value: v.string(),
    })),
  })),
});
```

---

## DOCUMENT 1 — Projet de Coopération en DOCX

### Dépendances

```bash
npm install docx chartjs-node-canvas chart.js
```

### Constantes et Helpers

```javascript
"use node";

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, LevelFormat, ImageRun,
  VerticalAlign, convertInchesToTwip, UnderlineType,
} = require("docx");

const fs = require("fs");
const path = require("path");

// ============================================================================
// CONSTANTES
// ============================================================================

const PAGE = {
  WIDTH: 12240,  // 8.5 inches in DXA
  HEIGHT: 15840, // 11 inches in DXA
  MARGIN_TOP: 1440,    // 1 inch
  MARGIN_BOTTOM: 1440,
  MARGIN_LEFT: 1440,
  MARGIN_RIGHT: 1440,
  CONTENT_W: 9360,     // Width minus left/right margins
};

const COLORS = {
  VERT_GABON: "009E49",
  VERT_FONCE: "1B6B4A",
  BLEU_MARINE: "1B3A5C",
  GRIS_FONCE: "374151",
  GRIS_MOYEN: "6B7280",
  GRIS_CLAIR: "F3F4F6",
  GRIS_VERY_LIGHT: "F9FAFB",
  BLANC: "FFFFFF",
  JAUNE_GABON: "FCD116",
  BLEU_GABON: "3A75C4",
  ROUGE_RISQUE: "DC2626",
  AMBER_MOYEN: "D97706",
  VERT_FAIBLE: "059669",
  BORDER_GRAY: "D1D5DB",
  PURPLE: "7C3AED",
};

const FONTS = {
  TITLE: "Georgia",
  HEADING: "Calibri",
  BODY: "Calibri",
};

// Borders for tables
const BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
  left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
  right: { style: BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
  insideVertical: { style: BorderStyle.SINGLE, size: 6, color: COLORS.BORDER_GRAY },
};

const CELL_MARGINS = {
  top: 80,
  bottom: 80,
  left: 120,
  right: 120,
};

// Chart colors
const CHART_COLORS = [
  "009E49", "1B3A5C", "D97706", "2563EB", "DC2626", "0F766E", "7C3AED", "059669"
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Basic paragraph helper
 */
function p(text, opts = {}) {
  const {
    size = 22,
    font = FONTS.BODY,
    color = COLORS.GRIS_FONCE,
    bold = false,
    italic = false,
    alignment = AlignmentType.BOTH,
    spacing = { before: 60, after: 120 },
    lineHeight = 276,
  } = opts;

  return new Paragraph({
    alignment,
    spacing,
    line: lineHeight,
    children: [
      new TextRun({
        text,
        font,
        size,
        bold,
        italic,
        color,
      }),
    ],
  });
}

/**
 * H1: Partie sections
 */
function h1(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 360, after: 240 },
    border: {
      bottom: {
        color: COLORS.VERT_GABON,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 12,
      },
    },
    children: [
      new TextRun({
        text,
        font: FONTS.TITLE,
        size: 28,
        bold: true,
        color: COLORS.VERT_GABON,
      }),
    ],
  });
}

/**
 * H2: Numbered sections
 */
function h2(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 120 },
    border: {
      bottom: {
        color: COLORS.VERT_FONCE,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [
      new TextRun({
        text,
        font: FONTS.HEADING,
        size: 24,
        bold: true,
        color: COLORS.VERT_FONCE,
        underline: {},
      }),
    ],
  });
}

/**
 * H3: Sub-sections
 */
function h3(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 160, after: 80 },
    children: [
      new TextRun({
        text,
        font: FONTS.HEADING,
        size: 22,
        bold: true,
        color: COLORS.BLEU_MARINE,
      }),
    ],
  });
}

/**
 * H4: Detail level
 */
function h4(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 80, after: 60 },
    children: [
      new TextRun({
        text,
        font: FONTS.HEADING,
        size: 22,
        bold: true,
        italic: true,
        color: COLORS.GRIS_FONCE,
      }),
    ],
  });
}

/**
 * Bullet points
 */
function bullet(text, level = 0) {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    spacing: { before: 0, after: 80 },
    line: 276,
    indent: { left: 720 * (level + 1), hanging: 360 },
    children: [
      new TextRun({
        text,
        font: FONTS.BODY,
        size: 22,
        color: COLORS.GRIS_FONCE,
      }),
    ],
  });
}

/**
 * Figure caption
 */
function figureCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 240 },
    children: [
      new TextRun({
        text,
        font: FONTS.BODY,
        size: 20,
        italic: true,
        color: COLORS.GRIS_MOYEN,
      }),
    ],
  });
}

/**
 * Generic table builder
 */
function makeTable(headers, rows, opts = {}) {
  const {
    headerBg = COLORS.BLEU_MARINE,
    headerText = COLORS.BLANC,
    altRowBg = COLORS.GRIS_CLAIR,
    totalRow = null,
  } = opts;

  const colWidths = rows.length > 0
    ? Array(headers.length).fill(Math.floor(PAGE.CONTENT_W / headers.length))
    : Array(headers.length).fill(Math.floor(PAGE.CONTENT_W / headers.length));

  const tableRows = [
    new TableRow({
      children: headers.map((h, idx) =>
        new TableCell({
          borders: BORDERS,
          shading: { fill: headerBg, type: ShadingType.CLEAR },
          margins: CELL_MARGINS,
          width: { size: colWidths[idx], type: WidthType.DXA },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: h,
                  font: FONTS.HEADING,
                  size: 22,
                  bold: true,
                  color: headerText,
                }),
              ],
            }),
          ],
        })
      ),
    }),
  ];

  rows.forEach((row, rowIdx) => {
    const isAltRow = rowIdx % 2 === 1;
    const isTotalRow = totalRow && rowIdx === totalRow;

    tableRows.push(
      new TableRow({
        children: row.map((cell, colIdx) =>
          new TableCell({
            borders: BORDERS,
            shading: isTotalRow
              ? { fill: COLORS.VERT_GABON, type: ShadingType.CLEAR }
              : isAltRow
              ? { fill: altRowBg, type: ShadingType.CLEAR }
              : { fill: COLORS.BLANC, type: ShadingType.CLEAR },
            margins: CELL_MARGINS,
            width: { size: colWidths[colIdx], type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: String(cell),
                    font: FONTS.BODY,
                    size: 22,
                    bold: isTotalRow,
                    color: isTotalRow ? COLORS.BLANC : COLORS.GRIS_FONCE,
                  }),
                ],
              }),
            ],
          })
        ),
      })
    );
  });

  return new Table({
    width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: tableRows,
  });
}

/**
 * Info box with color accent
 */
function infoBox(title, content, accentColor = COLORS.VERT_GABON) {
  const tintMap = {
    [COLORS.VERT_GABON]: "F0FDF4",
    [COLORS.AMBER_MOYEN]: "FEF3C7",
    [COLORS.BLEU_GABON]: "EFF6FF",
    [COLORS.ROUGE_RISQUE]: "FEF2F2",
    [COLORS.VERT_FAIBLE]: "F0FDF4",
  };

  const tint = tintMap[accentColor] || "F9FAFB";

  return new Table({
    width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
    columnWidths: [PAGE.CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: BORDERS,
            shading: { fill: accentColor, type: ShadingType.CLEAR },
            margins: CELL_MARGINS,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: title,
                    font: FONTS.HEADING,
                    size: 22,
                    bold: true,
                    color: COLORS.BLANC,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: BORDERS,
            shading: { fill: tint, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                alignment: AlignmentType.BOTH,
                line: 276,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: content,
                    font: FONTS.BODY,
                    size: 22,
                    color: COLORS.GRIS_FONCE,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * KPI Cards
 */
function kpiCards(cards) {
  const colW = Math.floor(PAGE.CONTENT_W / cards.length);

  return new Table({
    width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
    columnWidths: cards.map(() => colW),
    rows: [
      new TableRow({
        children: cards.map((card) =>
          new TableCell({
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            margins: { top: 80, bottom: 80, left: 40, right: 40 },
            width: { size: colW, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: card.value,
                    font: FONTS.TITLE,
                    size: 56,
                    bold: true,
                    color: card.color,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 0 },
                children: [
                  new TextRun({
                    text: card.label,
                    font: FONTS.BODY,
                    size: 20,
                    color: COLORS.GRIS_MOYEN,
                  }),
                ],
              }),
            ],
          })
        ),
      }),
    ],
  });
}

// ============================================================================
// CHART GENERATION (chartjs-node-canvas)
// ============================================================================

const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

async function renderDoughnutChart(labels, data, title) {
  const chartCanvas = new ChartJSNodeCanvas({
    width: 700,
    height: 450,
    backgroundColour: "white",
  });

  return await chartCanvas.renderToBuffer({
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: CHART_COLORS.slice(0, data.length).map((c) => `#${c}`),
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 16, family: FONTS.HEADING, weight: "bold" },
        },
        legend: {
          position: "right",
          labels: { font: { size: 12, family: FONTS.BODY } },
        },
      },
    },
  });
}

async function renderBarChart(labels, data, title, horizontal = true) {
  const chartCanvas = new ChartJSNodeCanvas({
    width: 700,
    height: 400,
    backgroundColour: "white",
  });

  return await chartCanvas.renderToBuffer({
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: CHART_COLORS.slice(0, data.length).map((c) => `#${c}`),
        },
      ],
    },
    options: {
      indexAxis: horizontal ? "y" : "x",
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 16, family: FONTS.HEADING, weight: "bold" },
        },
        legend: { display: false },
      },
    },
  });
}

// ============================================================================
// DOCUMENT SECTIONS
// ============================================================================

/**
 * Cover Page
 */
function createCoverPage(data) {
  const sections = [];

  // République Gabonaise
  sections.push(
    p("RÉPUBLIQUE GABONAISE", {
      size: 32,
      font: FONTS.TITLE,
      bold: true,
      color: COLORS.VERT_GABON,
      alignment: AlignmentType.CENTER,
    })
  );

  sections.push(
    p("Union – Travail – Justice", {
      size: 22,
      italic: true,
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 240 },
    })
  );

  // Institution
  sections.push(
    p(data.institution || "Ministère des Affaires Étrangères", {
      size: 22,
      bold: true,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 },
    })
  );

  // Title
  sections.push(
    p("PROJET DE COOPÉRATION", {
      size: 28,
      font: FONTS.TITLE,
      bold: true,
      color: COLORS.VERT_GABON,
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 80 },
    })
  );

  // Subtitle
  sections.push(
    p(data.projectTitle || "Titre du Projet", {
      size: 24,
      italic: true,
      color: COLORS.VERT_FONCE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 360 },
    })
  );

  // Context block
  sections.push(
    p(data.context || "", {
      size: 20,
      italic: true,
      color: COLORS.GRIS_MOYEN,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 360 },
    })
  );

  // Author block
  sections.push(
    p(data.authorName || "Auteur", {
      size: 22,
      bold: true,
      alignment: AlignmentType.CENTER,
      spacing: { before: 480, after: 40 },
    })
  );

  sections.push(
    p(data.authorTitle || "Titre", {
      size: 20,
      italic: true,
      color: COLORS.GRIS_MOYEN,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
    })
  );

  sections.push(
    p(data.authorContact || "contact@example.com", {
      size: 18,
      color: COLORS.GRIS_MOYEN,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 480 },
    })
  );

  // Date
  sections.push(
    p(new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }), {
      size: 22,
      color: COLORS.VERT_GABON,
      bold: true,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
    })
  );

  sections.push(new Paragraph({ children: [new PageBreak()] }));

  return sections;
}

/**
 * Table of Contents
 */
function createTableOfContents() {
  const sections = [];

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "SOMMAIRE",
          font: FONTS.TITLE,
          size: 28,
          bold: true,
          color: COLORS.VERT_GABON,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 },
    })
  );

  const tocEntries = [
    { text: "Thème du projet", level: 0 },
    { text: "Partie I. Résumé Exécutif", level: 0 },
    { text: "1. Présentation générale", level: 1 },
    { text: "2. Indicateurs clés", level: 1 },
    { text: "Partie II. Contexte et Justification", level: 0 },
    { text: "1. Contexte national", level: 1 },
    { text: "2. Justification du partenariat", level: 1 },
    { text: "3. Hypothèses critiques", level: 1 },
    { text: "Partie III. Cadre Logique", level: 0 },
    { text: "1. Objectif général", level: 1 },
    { text: "2. Objectif spécifique", level: 1 },
    { text: "3. Résultats et indicateurs", level: 1 },
    { text: "Partie IV. Description Détaillée des Activités", level: 0 },
    { text: "Partie V. Budget Détaillé", level: 0 },
    { text: "1. Montant total", level: 1 },
    { text: "2. Répartition par poste", level: 1 },
    { text: "3. Sources de financement", level: 1 },
    { text: "Partie VI. Calendrier de Mise en Œuvre", level: 0 },
    { text: "1. Phases du projet", level: 1 },
    { text: "2. Tableau synthèse", level: 1 },
    { text: "Partie VII. Cadre Institutionnel et Juridique", level: 0 },
    { text: "Partie VIII. Parties Prenantes", level: 0 },
    { text: "Partie IX. Suivi et Évaluation", level: 0 },
    { text: "Partie X. Analyse des Risques", level: 0 },
    { text: "Partie XI. Impact Attendu", level: 0 },
  ];

  tocEntries.forEach((entry) => {
    const indents = [0, 400, 800, 1200];
    const colors = [
      COLORS.BLEU_MARINE,
      COLORS.GRIS_FONCE,
      COLORS.GRIS_MOYEN,
      COLORS.GRIS_MOYEN,
    ];
    const sizes = [24, 22, 20, 20];
    const bolds = [true, false, false, false];
    const italics = [false, false, false, true];

    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: entry.text,
            font: FONTS.HEADING,
            size: sizes[entry.level],
            bold: bolds[entry.level],
            italic: italics[entry.level],
            color: colors[entry.level],
          }),
        ],
        alignment: AlignmentType.LEFT,
        indent: { left: indents[entry.level] },
        spacing: { before: 40, after: 60 },
      })
    );
  });

  sections.push(new Paragraph({ children: [new PageBreak()] }));

  return sections;
}

/**
 * Part I: Executive Summary
 */
function createPartExecutiveSummary(data) {
  const sections = [];

  sections.push(h1("Partie I. RÉSUMÉ EXÉCUTIF"));

  sections.push(h2("1. Présentation générale"));

  if (data.executiveSummary) {
    const es = data.executiveSummary;

    sections.push(p(es.description || ""));

    // Summary table
    const summaryRows = [
      ["Intitulé du projet", es.title || ""],
      ["Type", es.type || ""],
      ["Partenaire", es.partner || ""],
      ["Pays bénéficiaire", es.country || ""],
      ["Secteur", es.sector || ""],
      ["Budget", `${es.budget?.toLocaleString()} ${es.currency || "EUR"}`],
      ["Durée", es.duration || ""],
      ["Type d'accord", es.agreementType || ""],
      ["Emplois estimés", String(es.estimatedJobs || 0)],
      ["Bénéficiaires directs", String(es.beneficiaries || 0)],
    ];

    sections.push(
      makeTable(["Critère", "Valeur"], summaryRows, {
        headerBg: COLORS.VERT_GABON,
      })
    );

    sections.push(p(""));

    // KPI Cards
    if (es.kpis && es.kpis.length > 0) {
      sections.push(h2("2. Indicateurs clés"));
      sections.push(
        kpiCards(
          es.kpis.map((kpi) => ({
            value: kpi.value,
            label: kpi.label,
            color: kpi.color,
          }))
        )
      );
      sections.push(p(""));
    }
  }

  return sections;
}

/**
 * Part II: Context and Justification
 */
function createPartContext(data) {
  const sections = [];

  sections.push(h1("Partie II. CONTEXTE ET JUSTIFICATION"));

  if (data.context) {
    sections.push(h2("1. Contexte national"));
    sections.push(p(data.context.national || ""));

    sections.push(h2("2. Justification du partenariat"));
    sections.push(p(data.context.justification || ""));

    sections.push(h2("3. Hypothèses critiques"));
    if (data.context.assumptions && data.context.assumptions.length > 0) {
      data.context.assumptions.forEach((assumption) => {
        sections.push(bullet(assumption));
      });
    }
  }

  return sections;
}

/**
 * Part III: Logical Framework
 */
function createPartLogicalFramework(data) {
  const sections = [];

  sections.push(h1("Partie III. CADRE LOGIQUE"));

  if (data.logicalFramework) {
    const lf = data.logicalFramework;

    sections.push(h2("1. Objectif général"));
    sections.push(p(lf.generalObjective || ""));

    sections.push(h2("2. Objectif spécifique"));
    sections.push(p(lf.specificObjective || ""));

    sections.push(h2("3. Résultats et indicateurs"));

    if (lf.results && lf.results.length > 0) {
      lf.results.forEach((result, idx) => {
        sections.push(h3(`Résultat ${result.id}: ${result.title}`));
        sections.push(p(result.description || ""));

        if (result.indicators && result.indicators.length > 0) {
          sections.push(h4("Indicateurs"));

          const indicatorRows = result.indicators.map((ind) => [
            ind.indicator,
            ind.targetValue,
            ind.verificationMeans,
          ]);

          sections.push(
            makeTable(
              ["Indicateur", "Valeur cible", "Moyen de vérification"],
              indicatorRows
            )
          );

          sections.push(p(""));
        }

        if (result.activities && result.activities.length > 0) {
          sections.push(h4("Activités"));

          result.activities.forEach((activity) => {
            sections.push(bullet(`${activity.id}: ${activity.description}`));
          });

          sections.push(p(""));
        }
      });
    }
  }

  return sections;
}

/**
 * Part IV: Detailed Activities
 */
function createPartActivities(data) {
  const sections = [];

  sections.push(h1("Partie IV. DESCRIPTION DÉTAILLÉE DES ACTIVITÉS"));

  if (data.logicalFramework && data.logicalFramework.results) {
    data.logicalFramework.results.forEach((result) => {
      sections.push(h2(`${result.id}. ${result.title}`));

      if (result.activities && result.activities.length > 0) {
        result.activities.forEach((activity) => {
          sections.push(h3(`Activité ${activity.id}`));
          sections.push(p(activity.description || ""));
        });
      }
    });
  }

  return sections;
}

/**
 * Part V: Detailed Budget
 */
async function createPartBudget(data) {
  const sections = [];

  sections.push(h1("Partie V. BUDGET DÉTAILLÉ"));

  if (data.budget) {
    const budget = data.budget;

    sections.push(h2("1. Montant total"));
    sections.push(
      p(`Budget total : ${budget.total?.toLocaleString()} ${budget.currency || "EUR"}`)
    );

    sections.push(h2("2. Répartition par poste"));

    if (budget.items && budget.items.length > 0) {
      const budgetRows = budget.items.map((item) => [
        item.category,
        `${item.amount?.toLocaleString()} ${budget.currency}`,
        `${item.percentage}%`,
      ]);

      sections.push(
        makeTable(["Poste budgétaire", "Montant", "Pourcentage"], budgetRows)
      );

      sections.push(p(""));

      // Budget chart
      try {
        const labels = budget.items.map((item) => item.category);
        const chartData = budget.items.map((item) => item.amount || 0);
        const chartBuffer = await renderDoughnutChart(
          labels,
          chartData,
          "Répartition budgétaire"
        );

        sections.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: "png",
                data: chartBuffer,
                transformation: {
                  width: 400,
                  height: 300,
                },
                altText: {
                  title: "Budget Chart",
                  description: "Répartition budgétaire",
                  name: "budgetChart",
                },
              }),
            ],
          })
        );

        sections.push(figureCaption("Figure 1 — Répartition budgétaire par poste"));
      } catch (err) {
        console.error("Chart error:", err);
      }
    }

    sections.push(h2("3. Sources de financement"));

    if (budget.sources && budget.sources.length > 0) {
      const sourceRows = budget.sources.map((source) => [
        source.source,
        `${source.amount?.toLocaleString()} ${budget.currency}`,
        `${source.percentage}%`,
      ]);

      sections.push(
        makeTable(["Source", "Montant", "Pourcentage"], sourceRows)
      );

      sections.push(p(""));
    }
  }

  return sections;
}

/**
 * Part VI: Implementation Timeline
 */
async function createPartTimeline(data) {
  const sections = [];

  sections.push(h1("Partie VI. CALENDRIER DE MISE EN ŒUVRE"));

  if (data.timeline) {
    const timeline = data.timeline;

    sections.push(h2("1. Phases du projet"));

    if (timeline.phases && timeline.phases.length > 0) {
      timeline.phases.forEach((phase) => {
        sections.push(h3(phase.phase));
        sections.push(p(phase.details || ""));

        if (phase.milestones && phase.milestones.length > 0) {
          sections.push(h4("Jalons"));
          phase.milestones.forEach((milestone) => {
            sections.push(bullet(milestone));
          });
        }

        if (phase.deliverables && phase.deliverables.length > 0) {
          sections.push(h4("Livrables"));
          phase.deliverables.forEach((deliverable) => {
            sections.push(bullet(deliverable));
          });
        }

        sections.push(p(""));
      });
    }

    sections.push(h2("2. Tableau synthèse"));

    if (timeline.phases && timeline.phases.length > 0) {
      const phaseRows = timeline.phases.map((phase) => [
        phase.phase,
        phase.startDate || "",
        phase.endDate || "",
        (phase.deliverables || []).slice(0, 2).join("; "),
      ]);

      sections.push(
        makeTable(["Phase", "Début", "Fin", "Livrables principaux"], phaseRows)
      );

      sections.push(p(""));

      // Gantt-style chart
      try {
        const labels = timeline.phases.map((p) => p.phase);
        const durations = timeline.phases.map((p) => 12); // Months (simplified)
        const ganttBuffer = await renderBarChart(
          labels,
          durations,
          "Calendrier du projet",
          true
        );

        sections.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: "png",
                data: ganttBuffer,
                transformation: {
                  width: 450,
                  height: 300,
                },
                altText: {
                  title: "Timeline Chart",
                  description: "Calendrier du projet",
                  name: "timelineChart",
                },
              }),
            ],
          })
        );

        sections.push(figureCaption("Figure 2 — Calendrier de mise en œuvre"));
      } catch (err) {
        console.error("Chart error:", err);
      }
    }
  }

  return sections;
}

/**
 * Part VII: Institutional & Legal Framework
 */
function createPartInstitutional(data) {
  const sections = [];

  sections.push(h1("Partie VII. CADRE INSTITUTIONNEL ET JURIDIQUE"));

  if (data.institutional) {
    const inst = data.institutional;

    sections.push(h2("1. Type d'accord"));
    sections.push(p(inst.agreementType || ""));

    sections.push(h2("2. Base juridique"));
    sections.push(p(inst.legalBasis || ""));

    sections.push(h2("3. Autorisations requises"));
    if (inst.requiredAuthorizations && inst.requiredAuthorizations.length > 0) {
      inst.requiredAuthorizations.forEach((auth) => {
        sections.push(bullet(auth));
      });
    }

    sections.push(h2("4. Clauses essentielles"));
    if (inst.essentialClauses && inst.essentialClauses.length > 0) {
      inst.essentialClauses.forEach((clause) => {
        sections.push(bullet(clause));
      });
    }
  }

  return sections;
}

/**
 * Part VIII: Stakeholders
 */
function createPartStakeholders(data) {
  const sections = [];

  sections.push(h1("Partie VIII. PARTIES PRENANTES"));

  if (data.stakeholders && data.stakeholders.length > 0) {
    const stakeholderRows = data.stakeholders.map((sh) => [
      sh.name,
      sh.role,
      sh.organization,
      sh.contact,
    ]);

    sections.push(
      makeTable(["Nom", "Rôle", "Organisation", "Contact"], stakeholderRows)
    );
  }

  return sections;
}

/**
 * Part IX: Monitoring & Evaluation
 */
function createPartMonitoring(data) {
  const sections = [];

  sections.push(h1("Partie IX. SUIVI ET ÉVALUATION"));

  if (data.monitoringEvaluation) {
    const me = data.monitoringEvaluation;

    sections.push(h2("1. Mécanisme de suivi"));
    sections.push(p(me.mechanism || ""));

    sections.push(h2("2. Fréquence des rapports"));
    sections.push(p(me.reportingFrequency || ""));

    sections.push(h2("3. Indicateurs de performance"));

    if (me.kpis && me.kpis.length > 0) {
      const kpiRows = me.kpis.map((kpi) => [
        kpi.indicator,
        kpi.target,
        kpi.frequency,
      ]);

      sections.push(
        makeTable(
          ["Indicateur", "Cible", "Fréquence"],
          kpiRows
        )
      );

      sections.push(p(""));
    }

    sections.push(h2("4. Évaluation finale"));
    sections.push(p(me.finalEvaluation || ""));
  }

  return sections;
}

/**
 * Part X: Risk Analysis
 */
function createPartRisks(data) {
  const sections = [];

  sections.push(h1("Partie X. ANALYSE DES RISQUES"));

  if (data.risks && data.risks.length > 0) {
    // Risk matrix
    const riskRows = data.risks.map((risk) => [
      risk.risk,
      risk.probability,
      risk.impact,
      risk.mitigation,
    ]);

    sections.push(
      makeTable(
        ["Risque", "Probabilité", "Impact", "Plan d'atténuation"],
        riskRows
      )
    );

    sections.push(p(""));

    // Contingency plan
    sections.push(
      infoBox(
        "Plan de contingence",
        "En cas de survenance d'un risque identifié, le projet dispose d'un plan d'atténuation préparé. Les responsables du projet doivent évaluer mensuellement les risques et ajuster le plan d'exécution en conséquence.",
        COLORS.AMBER_MOYEN
      )
    );
  }

  return sections;
}

/**
 * Part XI: Expected Impact
 */
async function createPartImpact(data) {
  const sections = [];

  sections.push(h1("Partie XI. IMPACT ATTENDU"));

  if (data.impact) {
    const impact = data.impact;

    sections.push(h2("1. Impact économique"));
    sections.push(p(impact.economic || ""));

    sections.push(h2("2. Impact social"));
    sections.push(p(impact.social || ""));

    sections.push(h2("3. Impact environnemental"));
    sections.push(p(impact.environmental || ""));

    if (impact.quantifiable && impact.quantifiable.length > 0) {
      sections.push(h2("4. Impacts quantifiables"));

      const quantRows = impact.quantifiable.map((q) => [q.indicator, q.value]);

      sections.push(makeTable(["Indicateur", "Valeur"], quantRows));

      sections.push(p(""));

      // Impact chart
      try {
        const labels = impact.quantifiable.map((q) => q.indicator);
        const values = impact.quantifiable.map((q) =>
          parseInt(q.value) || 0
        );

        const impactBuffer = await renderBarChart(
          labels,
          values,
          "Impacts quantifiables du projet",
          false
        );

        sections.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: "png",
                data: impactBuffer,
                transformation: {
                  width: 500,
                  height: 350,
                },
                altText: {
                  title: "Impact Chart",
                  description: "Impacts quantifiables",
                  name: "impactChart",
                },
              }),
            ],
          })
        );

        sections.push(figureCaption("Figure 3 — Impacts quantifiables attendus"));
      } catch (err) {
        console.error("Chart error:", err);
      }
    }
  }

  return sections;
}

/**
 * Conclusion
 */
function createConclusion(data) {
  const sections = [];

  sections.push(h1("CONCLUSION"));

  sections.push(
    p(
      "Ce projet de coopération constitue une réponse stratégique aux défis de développement identifiés. Basé sur une analyse contextualisée et un cadre logique robuste, il propose une approche intégrée alliant ressources techniques, financières et institutionnelles. L'engagement des parties prenantes et la rigueur du suivi-évaluation garantissent la réussite de la mise en œuvre."
    )
  );

  sections.push(
    infoBox(
      "Note importante",
      "Ce document constitue le dossier de projet complet. Les modifications apportées au cours de la mise en œuvre doivent être formellement approuvées par toutes les parties signataires.",
      COLORS.BLEU_MARINE
    )
  );

  return sections;
}

// ============================================================================
// MAIN DOCUMENT ASSEMBLY
// ============================================================================

async function generateProjectDocument(projectData) {
  let children = [];

  // Cover page
  children.push(...createCoverPage(projectData));

  // Table of contents
  children.push(...createTableOfContents());

  // Executive Summary
  children.push(...createPartExecutiveSummary(projectData));

  // Context
  children.push(...createPartContext(projectData));

  // Logical Framework
  children.push(...createPartLogicalFramework(projectData));

  // Activities
  children.push(...createPartActivities(projectData));

  // Budget
  children.push(...await createPartBudget(projectData));

  // Timeline
  children.push(...await createPartTimeline(projectData));

  // Institutional
  children.push(...createPartInstitutional(projectData));

  // Stakeholders
  children.push(...createPartStakeholders(projectData));

  // Monitoring
  children.push(...createPartMonitoring(projectData));

  // Risks
  children.push(...createPartRisks(projectData));

  // Impact
  children.push(...await createPartImpact(projectData));

  // Conclusion
  children.push(...createConclusion(projectData));

  // Document
  const doc = new Document({
    sections: [
      {
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
        children,
      },
    ],
  });

  return doc;
}

// Export for use
module.exports = { generateProjectDocument, Packer };
```

---

## DOCUMENT 2 — Présentation en PPTX

### Dépendances

```bash
npm install pptxgenjs
```

### Code Complet

```javascript
"use node";

const PptxGenJS = require("pptxgenjs");

async function generateProjectPresentation(projectData) {
  const pres = new PptxGenJS();

  // Master slide settings
  pres.defineLayout({
    name: "BLANK",
    width: 10,
    height: 7.5,
  });

  pres.layout = "BLANK";

  // Color scheme
  const COLORS_PPTX = {
    VERT_GABON: "009E49",
    BLEU_MARINE: "1B3A5C",
    GRIS_FONCE: "374151",
    BLANC: "FFFFFF",
    GRIS_CLAIR: "F3F4F6",
  };

  // Slide 1: Cover
  let slide = pres.addSlide();
  slide.background = { color: COLORS_PPTX.BLANC };

  slide.addText("PROJET DE COOPÉRATION", {
    x: 0.5,
    y: 2,
    w: 9,
    h: 1,
    fontSize: 48,
    bold: true,
    color: COLORS_PPTX.VERT_GABON,
    align: "center",
    fontFace: "Georgia",
  });

  slide.addText(projectData.projectTitle || "Titre", {
    x: 0.5,
    y: 3.2,
    w: 9,
    h: 0.8,
    fontSize: 28,
    color: COLORS_PPTX.BLEU_MARINE,
    align: "center",
    italic: true,
  });

  slide.addText(
    new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    {
      x: 0.5,
      y: 6.5,
      w: 9,
      h: 0.5,
      fontSize: 16,
      color: COLORS_PPTX.VERT_GABON,
      align: "center",
    }
  );

  // Slide 2: Summary (KPIs)
  slide = pres.addSlide();
  slide.background = { color: COLORS_PPTX.BLANC };

  slide.addText("RÉSUMÉ DU PROJET", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.5,
    fontSize: 36,
    bold: true,
    color: COLORS_PPTX.VERT_GABON,
    fontFace: "Georgia",
  });

  if (
    projectData.executiveSummary &&
    projectData.executiveSummary.kpis &&
    projectData.executiveSummary.kpis.length > 0
  ) {
    const kpis = projectData.executiveSummary.kpis;
    const colW = 2;
    const rowH = 1.2;

    kpis.slice(0, 4).forEach((kpi, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);

      slide.addShape(pres.ShapeType.rect, {
        x: 0.5 + col * colW * 2.5,
        y: 1.5 + row * rowH * 2,
        w: colW * 2.2,
        h: rowH * 1.8,
        fill: { color: kpi.color },
        line: { color: "D1D5DB" },
      });

      slide.addText(kpi.value, {
        x: 0.5 + col * colW * 2.5,
        y: 1.7 + row * rowH * 2,
        w: colW * 2.2,
        h: 0.7,
        fontSize: 32,
        bold: true,
        color: "FFFFFF",
        align: "center",
      });

      slide.addText(kpi.label, {
        x: 0.5 + col * colW * 2.5,
        y: 2.5 + row * rowH * 2,
        w: colW * 2.2,
        h: 0.7,
        fontSize: 12,
        color: "FFFFFF",
        align: "center",
      });
    });
  }

  // Slide 3: Logical Framework
  slide = pres.addSlide();
  slide.background = { color: COLORS_PPTX.BLANC };

  slide.addText("CADRE LOGIQUE", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.5,
    fontSize: 36,
    bold: true,
    color: COLORS_PPTX.VERT_GABON,
    fontFace: "Georgia",
  });

  if (
    projectData.logicalFramework &&
    projectData.logicalFramework.results
  ) {
    const results = projectData.logicalFramework.results.slice(0, 3);

    results.forEach((result, idx) => {
      const y = 1.3 + idx * 1.8;

      slide.addShape(pres.ShapeType.rect, {
        x: 0.5,
        y,
        w: 9,
        h: 1.5,
        fill: { color: COLORS_PPTX.GRIS_CLAIR },
        line: { color: COLORS_PPTX.VERT_GABON, width: 2 },
      });

      slide.addText(`${result.id}: ${result.title}`, {
        x: 0.7,
        y: y + 0.1,
        w: 8.6,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: COLORS_PPTX.VERT_GABON,
      });

      slide.addText(result.description || "", {
        x: 0.7,
        y: y + 0.55,
        w: 8.6,
        h: 0.9,
        fontSize: 11,
        color: COLORS_PPTX.GRIS_FONCE,
      });
    });
  }

  // Slide 4: Budget
  slide = pres.addSlide();
  slide.background = { color: COLORS_PPTX.BLANC };

  slide.addText("BUDGET", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.5,
    fontSize: 36,
    bold: true,
    color: COLORS_PPTX.VERT_GABON,
    fontFace: "Georgia",
  });

  if (projectData.budget && projectData.budget.items) {
    const tableData = [
      [
        {
          text: "Poste",
          options: {
            fill: { color: COLORS_PPTX.VERT_GABON },
            fontFace: "Calibri",
            fontSize: 12,
            bold: true,
            color: "FFFFFF",
          },
        },
        {
          text: "Montant",
          options: {
            fill: { color: COLORS_PPTX.VERT_GABON },
            fontFace: "Calibri",
            fontSize: 12,
            bold: true,
            color: "FFFFFF",
          },
        },
        {
          text: "%",
          options: {
            fill: { color: COLORS_PPTX.VERT_GABON },
            fontFace: "Calibri",
            fontSize: 12,
            bold: true,
            color: "FFFFFF",
          },
        },
      ],
    ];

    projectData.budget.items.forEach((item) => {
      tableData.push([
        {
          text: item.category,
          options: { fontSize: 11 },
        },
        {
          text: `${item.amount?.toLocaleString()}`,
          options: { fontSize: 11 },
        },
        {
          text: `${item.percentage}%`,
          options: { fontSize: 11 },
        },
      ]);
    });

    slide.addTable(tableData, {
      x: 0.5,
      y: 1.2,
      w: 9,
      h: 5.5,
      border: { pt: 1, color: "D1D5DB" },
      rowH: 0.35,
    });
  }

  // Slide 5: Timeline
  slide = pres.addSlide();
  slide.background = { color: COLORS_PPTX.BLANC };

  slide.addText("CALENDRIER", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.5,
    fontSize: 36,
    bold: true,
    color: COLORS_PPTX.VERT_GABON,
    fontFace: "Georgia",
  });

  if (projectData.timeline && projectData.timeline.phases) {
    const phases = projectData.timeline.phases;

    phases.forEach((phase, idx) => {
      const y = 1.3 + idx * 1.0;

      slide.addShape(pres.ShapeType.rect, {
        x: 0.5,
        y,
        w: 0.8,
        h: 0.8,
        fill: { color: COLORS_PPTX.VERT_GABON },
      });

      slide.addText(String(idx + 1), {
        x: 0.5,
        y,
        w: 0.8,
        h: 0.8,
        fontSize: 14,
        bold: true,
        color: "FFFFFF",
        align: "center",
        valign: "middle",
      });

      slide.addText(phase.phase, {
        x: 1.5,
        y,
        w: 7,
        h: 0.4,
        fontSize: 13,
        bold: true,
        color: COLORS_PPTX.VERT_GABON,
      });

      slide.addText(`${phase.startDate} → ${phase.endDate}`, {
        x: 1.5,
        y: y + 0.4,
        w: 7,
        h: 0.35,
        fontSize: 10,
        color: COLORS_PPTX.GRIS_FONCE,
        italic: true,
      });
    });
  }

  // Slide 6: Risks
  slide = pres.addSlide();
  slide.background = { color: COLORS_PPTX.BLANC };

  slide.addText("ANALYSE DES RISQUES", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.5,
    fontSize: 36,
    bold: true,
    color: COLORS_PPTX.VERT_GABON,
    fontFace: "Georgia",
  });

  if (projectData.risks && projectData.risks.length > 0) {
    const risks = projectData.risks.slice(0, 4);

    risks.forEach((risk, idx) => {
      const y = 1.3 + idx * 1.3;

      const riskColor = risk.probability === "Élevé" ? "DC2626" : 
                        risk.probability === "Moyen" ? "D97706" : "059669";

      slide.addShape(pres.ShapeType.rect, {
        x: 0.5,
        y,
        w: 9,
        h: 1.1,
        fill: { color: COLORS_PPTX.GRIS_CLAIR },
        line: { color: riskColor, width: 3 },
      });

      slide.addText(risk.risk, {
        x: 0.7,
        y: y + 0.1,
        w: 8.6,
        h: 0.4,
        fontSize: 12,
        bold: true,
        color: riskColor,
      });

      slide.addText(`Atténuation: ${risk.mitigation}`, {
        x: 0.7,
        y: y + 0.5,
        w: 8.6,
        h: 0.5,
        fontSize: 10,
        color: COLORS_PPTX.GRIS_FONCE,
      });
    });
  }

  // Slide 7: Expected Impact
  slide = pres.addSlide();
  slide.background = { color: COLORS_PPTX.BLANC };

  slide.addText("IMPACTS ATTENDUS", {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.5,
    fontSize: 36,
    bold: true,
    color: COLORS_PPTX.VERT_GABON,
    fontFace: "Georgia",
  });

  if (projectData.impact) {
    const impacts = [
      { title: "Économique", text: projectData.impact.economic },
      { title: "Social", text: projectData.impact.social },
      { title: "Environnemental", text: projectData.impact.environmental },
    ];

    impacts.forEach((imp, idx) => {
      const col = idx;
      const x = 0.5 + col * 3.1;

      slide.addShape(pres.ShapeType.rect, {
        x,
        y: 1.3,
        w: 2.9,
        h: 5.2,
        fill: { color: COLORS_PPTX.GRIS_CLAIR },
        line: { color: COLORS_PPTX.VERT_GABON },
      });

      slide.addText(imp.title, {
        x: x + 0.1,
        y: 1.4,
        w: 2.7,
        h: 0.4,
        fontSize: 14,
        bold: true,
        color: COLORS_PPTX.VERT_GABON,
        align: "center",
      });

      slide.addText(imp.text || "", {
        x: x + 0.1,
        y: 1.9,
        w: 2.7,
        h: 4.5,
        fontSize: 11,
        color: COLORS_PPTX.GRIS_FONCE,
      });
    });
  }

  // Slide 8: Conclusion
  slide = pres.addSlide();
  slide.background = { color: COLORS_PPTX.VERT_GABON };

  slide.addText("MERCI", {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1,
    fontSize: 48,
    bold: true,
    color: "FFFFFF",
    align: "center",
    fontFace: "Georgia",
  });

  slide.addText("Questions & Discussions", {
    x: 0.5,
    y: 3.7,
    w: 9,
    h: 0.5,
    fontSize: 20,
    color: "FFFFFF",
    align: "center",
    italic: true,
  });

  return pres;
}

module.exports = { generateProjectPresentation };
```

---

## DOCUMENT 3 — PDF (Conversion Strategy)

### Approche

Le PDF est généré via conversion du DOCX exporté :

```bash
npm install libreoffice-convert
```

### Code d'intégration

```javascript
const convert = require("libreoffice-convert");
const fs = require("fs");
const path = require("path");
const { Packer } = require("docx");

async function convertDocxToPdf(docxBuffer) {
  return new Promise((resolve, reject) => {
    convert.convert(docxBuffer, ".pdf", undefined, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

async function savePdfFile(projectData, outputPath) {
  const { generateProjectDocument, Packer } = require("./docx-generator");
  
  const doc = await generateProjectDocument(projectData);
  const docxBuffer = await Packer.toBuffer(doc);
  const pdfBuffer = await convertDocxToPdf(docxBuffer);
  
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`PDF saved: ${outputPath}`);
}

module.exports = { convertDocxToPdf, savePdfFile };
```

---

## SECTION CONVEX — Intégration Backend

### Schema Definition

```typescript
// convex/projects.ts
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { internal } from "./_generated/api";

// Validator for project framework (see above)
export const projectFrameworkValidator = v.object({
  executiveSummary: v.optional(v.object({
    title: v.string(),
    type: v.string(),
    partner: v.string(),
    country: v.string(),
    sector: v.string(),
    budget: v.number(),
    currency: v.string(),
    duration: v.string(),
    agreementType: v.string(),
    estimatedJobs: v.number(),
    beneficiaries: v.number(),
    description: v.string(),
    kpis: v.optional(v.array(v.object({
      label: v.string(),
      value: v.string(),
      color: v.string(),
    }))),
  })),
  context: v.optional(v.object({
    national: v.string(),
    justification: v.string(),
    assumptions: v.array(v.string()),
  })),
  logicalFramework: v.optional(v.object({
    generalObjective: v.string(),
    specificObjective: v.string(),
    results: v.array(v.object({
      id: v.string(),
      title: v.string(),
      description: v.string(),
      indicators: v.array(v.object({
        indicator: v.string(),
        targetValue: v.string(),
        verificationMeans: v.string(),
      })),
      activities: v.array(v.object({
        id: v.string(),
        description: v.string(),
      })),
    })),
  })),
  budget: v.optional(v.object({
    total: v.number(),
    currency: v.string(),
    items: v.array(v.object({
      category: v.string(),
      amount: v.number(),
      percentage: v.number(),
    })),
    sources: v.array(v.object({
      source: v.string(),
      amount: v.number(),
      percentage: v.number(),
    })),
  })),
  timeline: v.optional(v.object({
    startDate: v.string(),
    endDate: v.string(),
    phases: v.array(v.object({
      phase: v.string(),
      details: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      milestones: v.array(v.string()),
      deliverables: v.array(v.string()),
    })),
  })),
  institutional: v.optional(v.object({
    agreementType: v.string(),
    legalBasis: v.string(),
    requiredAuthorizations: v.array(v.string()),
    essentialClauses: v.array(v.string()),
  })),
  stakeholders: v.optional(v.array(v.object({
    name: v.string(),
    role: v.string(),
    organization: v.string(),
    contact: v.string(),
  }))),
  monitoringEvaluation: v.optional(v.object({
    mechanism: v.string(),
    reportingFrequency: v.string(),
    kpis: v.array(v.object({
      indicator: v.string(),
      target: v.string(),
      frequency: v.string(),
    })),
    finalEvaluation: v.string(),
  })),
  risks: v.optional(v.array(v.object({
    risk: v.string(),
    probability: v.string(),
    impact: v.string(),
    mitigation: v.string(),
  }))),
  impact: v.optional(v.object({
    economic: v.string(),
    social: v.string(),
    environmental: v.string(),
    quantifiable: v.array(v.object({
      indicator: v.string(),
      value: v.string(),
    })),
  })),
});

// Create project
export const createProject = mutation({
  args: {
    title: v.string(),
    institution: v.string(),
    projectTitle: v.string(),
    context: v.string(),
    projectFramework: projectFrameworkValidator,
    authorName: v.string(),
    authorTitle: v.string(),
    authorContact: v.string(),
  },
  handler: async (ctx, args) => {
    const projectId = await ctx.db.insert("projects", {
      title: args.title,
      institution: args.institution,
      projectTitle: args.projectTitle,
      context: args.context,
      projectFramework: args.projectFramework,
      authorName: args.authorName,
      authorTitle: args.authorTitle,
      authorContact: args.authorContact,
      createdAt: Date.now(),
      status: "draft",
    });

    return projectId;
  },
});

// Update project framework
export const updateProjectFramework = mutation({
  args: {
    projectId: v.id("projects"),
    projectFramework: projectFrameworkValidator,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      projectFramework: args.projectFramework,
      updatedAt: Date.now(),
    });
  },
});

// Get project
export const getProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

// Generate documents (action)
export const generateDocuments = action({
  args: {
    projectId: v.id("projects"),
    formats: v.array(v.union(v.literal("docx"), v.literal("pptx"), v.literal("pdf"))),
  },
  handler: async (ctx, args) => {
    const project = await ctx.runQuery(internal.projects.getProject, {
      projectId: args.projectId,
    });

    const results = {};

    for (const format of args.formats) {
      if (format === "docx") {
        const { generateProjectDocument, Packer } = require("./docx-generator");
        const doc = await generateProjectDocument(project);
        const buffer = await Packer.toBuffer(doc);
        results.docx = buffer;
      }

      if (format === "pptx") {
        const { generateProjectPresentation } = require("./pptx-generator");
        const pres = await generateProjectPresentation(project);
        const buffer = await pres.toBuffer();
        results.pptx = buffer;
      }

      if (format === "pdf") {
        const { generateProjectDocument, Packer } = require("./docx-generator");
        const { convertDocxToPdf } = require("./pdf-converter");
        const doc = await generateProjectDocument(project);
        const docxBuffer = await Packer.toBuffer(doc);
        const pdfBuffer = await convertDocxToPdf(docxBuffer);
        results.pdf = pdfBuffer;
      }
    }

    return results;
  },
});
```

### React Hook

```typescript
// hooks/useProjectGeneration.ts
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useProjectGeneration() {
  const generateDocs = useMutation(api.projects.generateDocuments);

  async function generate(projectId, formats = ["docx", "pptx", "pdf"]) {
    try {
      const results = await generateDocs({
        projectId,
        formats: formats as any,
      });

      // Download files
      Object.entries(results).forEach(([format, buffer]: [string, any]) => {
        const blob = new Blob([buffer], {
          "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "pdf": "application/pdf",
        }[format] || "application/octet-stream");

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `projet-cooperation.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error("Generation error:", error);
      throw error;
    }
  }

  return { generate };
}
```

---

## Règles Critiques d'Implémentation

1. **WidthType.DXA uniquement** — JAMAIS WidthType.PERCENTAGE
2. **Dual widths sur tables** — columnWidths + cell width
3. **ShadingType.CLEAR obligatoire** — JAMAIS SOLID
4. **Paragraphes séparés** — JAMAIS \n
5. **PageBreak dans Paragraph** — `new Paragraph({ children: [new PageBreak()] })`
6. **ImageRun avec type: "png"** — OBLIGATOIRE
7. **Tab stops pour headers/footers** — JAMAIS de tables
8. **AlignmentType.BOTH partout** — Justifié pour corps
9. **chartjs-node-canvas** — npm install obligatoire
10. **Convex guidelines** — Lire `convex/_generated/ai/guidelines.md` en premier

---

## Référence Rapide — Utilisateurs Claude

1. **Lire le contexte** : Données du projet depuis Convex (schéma validé)
2. **Générer DOCX** : Appeler `generateProjectDocument(projectData)` + `Packer.toBuffer()`
3. **Générer PPTX** : Appeler `generateProjectPresentation(projectData)` + `.toBuffer()`
4. **Convertir PDF** : DOCX → PDF via LibreOffice headless
5. **Déployer Convex** : `npx convex deploy`
6. **Télécharger** : Buffers via React hook → Downloads

---

**Fin du Prompt — Document complet et exhaustif prêt pour implémentation.**
