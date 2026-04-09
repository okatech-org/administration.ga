# PROMPT — Générateur de Plan Stratégique Diplomatique (DOCX, PPTX, PDF)

## Contexte Opérationnel

Ce prompt est destiné à un développeur Claude pour **générer automatiquement** des documents professionnels (DOCX, PPTX, PDF) pour un **Plan Stratégique d'Action Diplomatique** dans le contexte des Affaires Diplomatiques du Gabon.

- **Backend :** Convex (mutations, actions, schémas)
- **Formats :** DOCX → PDF via LibreOffice headless | PPTX via pptxgenjs
- **Design :** Charte Graphique NTSAGUI Digital (Soft UI Neumorphique)
- **Méthodologie :** OkaTech R1-R4 (Diagnostic → Analyse → Scénarios → Action)

---

## Schéma Convex : strategicAnalysisValidator

Le schéma définit la structure complète des données pour un plan stratégique:

- **metadata** : Informations de document (titre, auteur, date, institution)
- **executive_summary** : Résumé exécutif avec KPI et scénario retenu
- **diagnostic** : Analyse SWOT du secteur et du Gabon
- **partner_analysis** : Profil du partenaire, complémentarité, historique
- **strategic_objectives** : Vision et objectifs par horizon temporel
- **scenarios** : Trois scénarios (Conservateur, Progressif, Ambitieux) avec scores
- **action_plan** : Actions immédiates, court terme, structurantes
- **budget** : Estimation, répartition, sources de financement
- **risks** : Matrice de risques avec mitigations
- **annexes** : Documents annexes optionnels

---

## Palette Couleurs NTSAGUI Digital

```javascript
const COLORS = {
  // Achromatiques
  BLEU_MARINE:   "1B3A5C",   // Titres H1, en-têtes tableaux
  VERT_FONCE:    "0F766E",   // Titres H2, accents
  VERT_GABON:    "009E49",   // Principal (diplomatique)
  GRIS_FONCE:    "374151",   // Corps de texte
  GRIS_MOYEN:    "6B7280",   // Texte secondaire
  GRIS_CLAIR:    "F9FAFB",   // Fond alterné tableaux
  BLANC:         "FFFFFF",   // Fond principal

  // Teintes pour encadrés
  TINT_GREEN:    "F0FDF4",   // Vert pâle
  TINT_AMBER:    "FEF3C7",   // Ambre pâle
  TINT_BLUE:     "EFF6FF",   // Bleu pâle
  TINT_RED:      "FEF2F2",   // Rouge pâle
};

const CHART_COLORS = ["009E49", "1B3A5C", "D97706", "2563EB", "DC2626", "0F766E", "7C3AED", "059669"];
```

---

## SECTION DOCX — Code Générateur Complet

### Initialisation et Constantes

```javascript
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, PageBreak,
  UnderlineType, AlignmentType, BorderStyle, WidthType, ShadingType, ImageRun } = require("docx");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const fs = require("fs");
const path = require("path");

const PAGE = {
  WIDTH: 12240, HEIGHT: 15840,
  MARGIN_TOP: 1440, MARGIN_BOTTOM: 1440, MARGIN_LEFT: 1440, MARGIN_RIGHT: 1440,
  CONTENT_W: 9360, // 210mm - (2*18mm) en DXA
};

const BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
  left: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
  right: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
  insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
};

const BORDERS_NONE = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
};

const CELL_MARGINS = { top: 120, bottom: 120, left: 160, right: 160 };
```

### Helpers Paragraphes

```javascript
function p(text = "", opts = {}) {
  const { size = 22, bold = false, italics = false, color = COLORS.GRIS_FONCE,
    alignment = AlignmentType.BOTH, spacingBefore = 60, spacingAfter = 120,
    lineHeight = 276 } = opts;

  return new Paragraph({
    text, alignment,
    spacing: { before: spacingBefore, after: spacingAfter, line: lineHeight },
    children: text ? [new TextRun({ text, font: "Calibri", size, bold, italics, color })] : [],
  });
}

function h1(text) {
  return new Paragraph({
    text,
    alignment: AlignmentType.CENTER,
    spacing: { before: 360, after: 240, line: 276 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.VERT_GABON } },
    children: [new TextRun({
      text: text.toUpperCase(),
      font: "Georgia",
      size: 28,
      bold: true,
      color: COLORS.VERT_GABON,
    })],
  });
}

function h2(text) {
  return new Paragraph({
    text, alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 120, line: 276 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.VERT_FONCE } },
    children: [new TextRun({
      text, font: "Calibri", size: 24, bold: true, color: COLORS.VERT_FONCE,
      underline: { type: UnderlineType.SINGLE },
    })],
  });
}

function h3(text) {
  return new Paragraph({
    text, alignment: AlignmentType.LEFT,
    spacing: { before: 160, after: 80, line: 276 },
    children: [new TextRun({ text, font: "Calibri", size: 22, bold: true, color: COLORS.BLEU_MARINE })],
  });
}

function h4(text) {
  return new Paragraph({
    text, alignment: AlignmentType.LEFT,
    spacing: { before: 80, after: 60, line: 276 },
    children: [new TextRun({ text, font: "Calibri", size: 22, bold: true, italics: true, color: COLORS.GRIS_FONCE })],
  });
}

function bullet(text, level = 0) {
  const indents = [0, 720, 1440];
  return new Paragraph({
    text, alignment: AlignmentType.LEFT,
    spacing: { before: 40, after: 40, line: 276 },
    bullet: { level },
    indentation: { left: indents[level], hanging: 360 },
    children: [new TextRun({ text, font: "Calibri", size: 22, color: COLORS.GRIS_FONCE })],
  });
}
```

### Tableaux

```javascript
function makeTable(rows, columnWidths, opts = {}) {
  const { headerBgColor = COLORS.VERT_FONCE, headerTextColor = COLORS.BLANC,
    alternateRows = false, totalRowIndex = -1 } = opts;

  const tableRows = rows.map((row, rowIdx) => {
    const isHeader = rowIdx === 0;
    const isTotal = rowIdx === totalRowIndex;
    const isAlternate = alternateRows && rowIdx % 2 === 1 && !isHeader && !isTotal;

    return new TableRow({
      children: row.map((cell, colIdx) => {
        let bgColor = COLORS.BLANC, textColor = COLORS.GRIS_FONCE, isBold = false;

        if (isHeader) { bgColor = headerBgColor; textColor = headerTextColor; isBold = true; }
        else if (isTotal) { bgColor = COLORS.VERT_GABON; textColor = COLORS.BLANC; isBold = true; }
        else if (isAlternate) { bgColor = COLORS.GRIS_CLAIR; }

        return new TableCell({
          width: { size: columnWidths[colIdx], type: WidthType.DXA },
          shading: { fill: bgColor, type: ShadingType.CLEAR },
          borders: BORDERS,
          margins: CELL_MARGINS,
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: cell, font: "Calibri", size: 22, bold: isBold, color: textColor })],
          })],
        });
      }),
    });
  });

  const colW = Math.floor(PAGE.CONTENT_W / columnWidths.length);
  return new Table({
    width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
    columnWidths: columnWidths.map(() => colW),
    rows: tableRows,
  });
}
```

### Encadrés Colorés

```javascript
function infoBox(title, content, accentColor = COLORS.VERT_GABON) {
  const tintMap = {
    [COLORS.VERT_GABON]: COLORS.TINT_GREEN,
    [COLORS.VERT_FONCE]: COLORS.TINT_GREEN,
    [COLORS.BLEU_MARINE]: COLORS.TINT_BLUE,
    "D97706": COLORS.TINT_AMBER,
  };
  const tint = tintMap[accentColor] || COLORS.GRIS_CLAIR;

  return new Table({
    width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
    columnWidths: [PAGE.CONTENT_W],
    rows: [
      new TableRow({
        children: [new TableCell({
          width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
          shading: { fill: accentColor, type: ShadingType.CLEAR },
          borders: BORDERS,
          margins: CELL_MARGINS,
          children: [new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: title, font: "Calibri", size: 22, bold: true, color: COLORS.BLANC })],
          })],
        })]
      }),
      new TableRow({
        children: [new TableCell({
          width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
          shading: { fill: tint, type: ShadingType.CLEAR },
          borders: BORDERS,
          margins: CELL_MARGINS,
          children: [new Paragraph({
            alignment: AlignmentType.BOTH,
            spacing: { line: 276 },
            children: [new TextRun({ text: content, font: "Calibri", size: 22, color: COLORS.GRIS_FONCE })],
          })],
        })]
      }),
    ],
  });
}
```

### KPI Cards

```javascript
function kpiCards(cards) {
  const colW = Math.floor(PAGE.CONTENT_W / cards.length);

  return new Table({
    width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
    columnWidths: cards.map(() => colW),
    rows: [new TableRow({
      children: cards.map(c => new TableCell({
        width: { size: colW, type: WidthType.DXA },
        borders: BORDERS_NONE,
        margins: CELL_MARGINS,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 40, line: 276 },
            children: [new TextRun({ text: c.value, font: "Georgia", size: 56, bold: true, color: c.color || COLORS.VERT_GABON })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 80, line: 276 },
            children: [new TextRun({ text: c.label, font: "Calibri", size: 20, color: COLORS.GRIS_MOYEN })],
          }),
        ],
      }))
    })],
  });
}

function figureCaption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 200, line: 276 },
    children: [new TextRun({ text, font: "Calibri", size: 20, italics: true, color: COLORS.GRIS_MOYEN })],
  });
}
```

### Graphiques ChartJS

```javascript
async function renderPieChart(labels, data, title, width = 700, height = 450) {
  const chartCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: COLORS.BLANC });

  return await chartCanvas.renderToBuffer({
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: CHART_COLORS.slice(0, data.length).map(c => `#${c}`),
        borderColor: COLORS.BLANC,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: title, font: { size: 16, family: "Calibri", weight: "bold" }, color: COLORS.GRIS_FONCE, padding: { top: 10, bottom: 20 } },
        legend: { position: "right", labels: { font: { size: 12, family: "Calibri" }, color: COLORS.GRIS_FONCE, padding: 15 } },
      },
    },
  });
}

async function renderBarChart(labels, data, title, horizontal = false, width = 700, height = 450) {
  const chartCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: COLORS.BLANC });

  return await chartCanvas.renderToBuffer({
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Valeur",
        data,
        backgroundColor: CHART_COLORS.slice(0, data.length).map(c => `#${c}`),
        borderColor: COLORS.GRIS_MOYEN,
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: horizontal ? "y" : "x",
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: title, font: { size: 16, family: "Calibri", weight: "bold" }, color: COLORS.GRIS_FONCE },
        legend: { display: false },
      },
      scales: {
        x: { grid: { display: true, color: "rgba(209, 213, 219, 0.5)" }, ticks: { font: { family: "Calibri", size: 11 }, color: COLORS.GRIS_FONCE } },
        y: { grid: { display: horizontal }, ticks: { font: { family: "Calibri", size: 11 }, color: COLORS.GRIS_FONCE } },
      },
    },
  });
}

async function renderGanttChart(tasks, title, width = 800, height = 400) {
  const chartCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: COLORS.BLANC });

  const labels = tasks.map(t => t.name);
  return await chartCanvas.renderToBuffer({
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: tasks.map(t => t.duration),
        backgroundColor: tasks.map(t => `#${t.color || COLORS.VERT_GABON}`),
        borderColor: COLORS.GRIS_MOYEN,
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: title, font: { size: 16, family: "Calibri", weight: "bold" }, color: COLORS.GRIS_FONCE },
        legend: { display: false },
      },
      scales: {
        x: { stacked: false, grid: { color: "rgba(209, 213, 219, 0.5)" }, ticks: { font: { family: "Calibri", size: 11 } } },
        y: { stacked: false, ticks: { font: { family: "Calibri", size: 11 } } },
      },
    },
  });
}
```

### Page de Garde

```javascript
function generateCoverPage(metadata) {
  const children = [];

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200, line: 276 },
    children: [new TextRun({ text: "RÉPUBLIQUE GABONAISE", font: "Georgia", size: 32, bold: true, color: COLORS.VERT_GABON })],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200, line: 276 },
    children: [new TextRun({ text: "Union – Travail – Justice", font: "Georgia", size: 24, italics: true, color: COLORS.VERT_GABON })],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 400, line: 276 },
    children: [new TextRun({ text: metadata.institution, font: "Calibri", size: 24, bold: true, color: COLORS.GRIS_FONCE })],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 200, line: 276 },
    children: [new TextRun({ text: metadata.title, font: "Georgia", size: 56, bold: true, color: COLORS.VERT_GABON })],
  }));

  if (metadata.subtitle) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 600, line: 276 },
      children: [new TextRun({ text: metadata.subtitle, font: "Georgia", size: 28, italics: true, color: COLORS.VERT_GABON })],
    }));
  }

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 800, after: 80, line: 276 },
    children: [new TextRun({ text: metadata.author, font: "Calibri", size: 22, bold: true, color: COLORS.GRIS_FONCE })],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 400, line: 276 },
    children: [new TextRun({ text: metadata.authorTitle, font: "Calibri", size: 22, italics: true, color: COLORS.GRIS_FONCE })],
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1000, after: 200, line: 276 },
    children: [new TextRun({ text: metadata.date, font: "Calibri", size: 22, color: COLORS.VERT_GABON })],
  }));

  if (metadata.reference) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 1000, line: 276 },
      children: [new TextRun({ text: `Référence: ${metadata.reference}`, font: "Calibri", size: 20, color: COLORS.GRIS_MOYEN })],
    }));
  }

  children.push(new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 2000, after: 0, line: 276 },
    children: [new TextRun({ text: "[   CACHET / SIGNATURE   ]", font: "Calibri", size: 20, italics: true, color: COLORS.GRIS_CLAIR })],
  }));

  return children;
}
```

### Table des Matières

```javascript
function generateTableOfContents() {
  const children = [];
  children.push(h1("SOMMAIRE"));

  const toc = [
    { text: "Partie I. Résumé Exécutif", level: 0 },
    { text: "Partie II. Diagnostic Sectoriel", level: 0 },
    { text: "1. Contexte macroéconomique", level: 1 },
    { text: "2. Forces du Gabon", level: 1 },
    { text: "3. Faiblesses et lacunes", level: 1 },
    { text: "4. Analyse SWOT", level: 1 },
    { text: "Partie III. Analyse du Partenaire", level: 0 },
    { text: "1. Profil et capacités", level: 1 },
    { text: "2. Complémentarité", level: 1 },
    { text: "3. Historique des échanges", level: 1 },
    { text: "A. Échanges commerciaux", level: 2 },
    { text: "B. Coopérations existantes", level: 2 },
    { text: "Partie IV. Objectifs Stratégiques", level: 0 },
    { text: "1. Vision à long terme", level: 1 },
    { text: "2. Objectifs par horizon temporel", level: 1 },
    { text: "A. Court terme (0-12 mois)", level: 2 },
    { text: "B. Moyen terme (1-3 ans)", level: 2 },
    { text: "C. Long terme (3-5 ans)", level: 2 },
    { text: "3. Indicateurs de résultats", level: 1 },
    { text: "Partie V. Scénarios d'Action", level: 0 },
    { text: "1. Scénario A — Conservateur", level: 1 },
    { text: "2. Scénario B — Progressif", level: 1 },
    { text: "3. Scénario C — Ambitieux", level: 1 },
    { text: "4. Analyse comparative", level: 1 },
    { text: "5. Recommandation", level: 1 },
    { text: "Partie VI. Plan d'Action Opérationnel", level: 0 },
    { text: "1. Actions prioritaires", level: 1 },
    { text: "A. Actions immédiates (J+0 à J+90)", level: 2 },
    { text: "B. Actions à court terme (M3-M6)", level: 2 },
    { text: "C. Actions structurantes (M6-M12)", level: 2 },
    { text: "2. Calendrier de mise en œuvre", level: 1 },
    { text: "3. Responsabilités et gouvernance", level: 1 },
    { text: "Partie VII. Budget et Ressources", level: 0 },
    { text: "1. Estimation budgétaire", level: 1 },
    { text: "2. Répartition par poste", level: 1 },
    { text: "3. Sources de financement", level: 1 },
    { text: "4. Analyse coût-bénéfice", level: 1 },
    { text: "Partie VIII. Risques et Mesures", level: 0 },
    { text: "1. Matrice des risques", level: 1 },
    { text: "2. Plan de contingence", level: 1 },
  ];

  toc.forEach(item => {
    const indents = [0, 400, 800, 1200];
    const colors = [COLORS.BLEU_MARINE, COLORS.GRIS_FONCE, COLORS.GRIS_MOYEN, COLORS.GRIS_CLAIR];
    const sizes = [24, 22, 20, 20];
    const bolds = [true, false, false, false];
    const italics = [false, false, false, true];

    children.push(new Paragraph({
      text: item.text,
      alignment: AlignmentType.LEFT,
      spacing: { before: 40, after: 40, line: 276 },
      indentation: { left: indents[item.level] },
      children: [new TextRun({
        text: item.text,
        font: "Calibri",
        size: sizes[item.level],
        bold: bolds[item.level],
        italics: italics[item.level],
        color: colors[item.level],
      })],
    }));
  });

  return children;
}
```

### Générer le Document DOCX Complet

Le document DOCX complet suit cette structure:
1. Page de garde (couverture)
2. Table des matières
3. Partie I — VIII (chacune sur une page distincte)
4. Conclusion et bloc entreprise
5. Styles et formatage global (justifié, Calibri 11pt, espacement 1.15)

### Sauvegarder en DOCX

```javascript
async function saveDOCX(doc, outputPath) {
  return new Promise((resolve, reject) => {
    Packer.toBuffer(doc).then(buffer => {
      fs.writeFileSync(outputPath, buffer);
      resolve(outputPath);
    }).catch(reject);
  });
}
```

---

## SECTION PPTX — Générateur PowerPoint

```javascript
const PptxGenJS = require("pptxgenjs");

async function generateStrategicPlanPptx(data) {
  const pres = new PptxGenJS();

  const colors = {
    primary: "009E49",
    accent: "1B3A5C",
    dark: "0F766E",
    gray: "374151",
    light: "F9FAFB",
  };

  // Slide 1: Couverture
  let slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };
  
  slide.addText("PLAN STRATÉGIQUE", {
    x: 0.5, y: 1.5, w: 9, h: 0.6,
    fontSize: 44, bold: true, color: colors.primary, align: "center", fontFace: "Georgia",
  });
  
  slide.addText(data.metadata.title, {
    x: 0.5, y: 2.3, w: 9, h: 0.8,
    fontSize: 32, italic: true, color: colors.primary, align: "center", fontFace: "Georgia",
  });
  
  slide.addText(data.metadata.institution, {
    x: 0.5, y: 3.3, w: 9, h: 0.4,
    fontSize: 18, color: colors.gray, align: "center", fontFace: "Calibri",
  });
  
  slide.addText(data.metadata.date, {
    x: 0.5, y: 4.5, w: 9, h: 0.3,
    fontSize: 14, color: colors.primary, align: "center", fontFace: "Calibri",
  });

  // Slide 2: Sommaire
  slide = pres.addSlide();
  slide.background = { color: "FFFFFF" };
  
  slide.addText("SOMMAIRE", {
    x: 0.5, y: 0.4, w: 9, h: 0.4,
    fontSize: 32, bold: true, color: colors.primary, fontFace: "Georgia",
  });
  
  const tocItems = [
    "I. Résumé Exécutif",
    "II. Diagnostic Sectoriel",
    "III. Analyse du Partenaire",
    "IV. Objectifs Stratégiques",
    "V. Scénarios d'Action",
    "VI. Plan d'Action Opérationnel",
    "VII. Budget et Ressources",
    "VIII. Risques et Mesures",
  ];
  
  tocItems.forEach((item, idx) => {
    slide.addText(item, {
      x: 1, y: 1.1 + idx * 0.45, w: 8, h: 0.35,
      fontSize: 16, color: colors.gray, fontFace: "Calibri",
    });
  });

  // Slide 3 et suivants: Contenu par partie (Résumé, Diagnostic, Partenaire, Objectifs, Scénarios, Action, Budget, Risques, Conclusion)

  return pres;
}

async function savePPTX(pres, outputPath) {
  return new Promise((resolve, reject) => {
    pres.writeFile({ fileName: outputPath }).then(() => {
      resolve(outputPath);
    }).catch(reject);
  });
}
```

---

## SECTION PDF — Stratégie de Conversion

```javascript
const { spawn } = require("child_process");

async function convertDOCXToPDF(docxPath, pdfOutputPath) {
  return new Promise((resolve, reject) => {
    const libreOffice = spawn("libreoffice", [
      "--headless",
      "--convert-to", "pdf",
      "--outdir", path.dirname(pdfOutputPath),
      docxPath,
    ]);

    libreOffice.on("close", (code) => {
      if (code === 0) {
        resolve(pdfOutputPath);
      } else {
        reject(new Error(`LibreOffice conversion failed with code ${code}`));
      }
    });

    libreOffice.on("error", (err) => {
      reject(err);
    });
  });
}

async function generateAllFormats(data, outputDir) {
  const timestamp = new Date().toISOString().split("T")[0];
  
  const docxPath = path.join(outputDir, `PlanStrategique_${timestamp}.docx`);
  const doc = await generateStrategicPlanDocx(data);
  await saveDOCX(doc, docxPath);
  
  const pptxPath = path.join(outputDir, `PlanStrategique_${timestamp}.pptx`);
  const pres = await generateStrategicPlanPptx(data);
  await savePPTX(pres, pptxPath);
  
  const pdfPath = path.join(outputDir, `PlanStrategique_${timestamp}.pdf`);
  await convertDOCXToPDF(docxPath, pdfPath);
  
  return { docxPath, pptxPath, pdfPath };
}
```

---

## SECTION CONVEX — Intégration Backend

```javascript
// convex/strategicPlan.ts

import { mutation, internalAction } from "./_generated/server";
import { v } from "convex/values";

export const generateStrategicPlan = mutation({
  args: { data: v.any() },
  handler: async (ctx, args) => {
    const id = crypto.randomUUID();
    
    await ctx.db.insert("strategicPlans", {
      _id: id,
      data: args.data,
      createdAt: Date.now(),
      status: "pending",
    });
    
    return id;
  },
});

export const exportDocuments = internalAction({
  args: { planId: v.string() },
  handler: async (ctx, args) => {
    const plan = await ctx.runQuery(async (dbCtx) => {
      return await dbCtx.db.get(args.planId);
    });
    
    if (!plan) throw new Error("Plan not found");
    
    const outputDir = path.join(process.cwd(), ".generated");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    
    try {
      const formats = await generateAllFormats(plan.data, outputDir);
      
      await ctx.runMutation(async (dbCtx) => {
        await dbCtx.db.patch(args.planId, {
          status: "completed",
          outputs: formats,
          updatedAt: Date.now(),
        });
      });
      
      return formats;
    } catch (err) {
      await ctx.runMutation(async (dbCtx) => {
        await dbCtx.db.patch(args.planId, {
          status: "failed",
          error: err.message,
          updatedAt: Date.now(),
        });
      });
      throw err;
    }
  },
});
```

---

## Instructions de Mise en Œuvre

1. **Dépendances :**
   ```bash
   npm install docx pptxgenjs chartjs-node-canvas chart.js
   sudo apt-get install libreoffice
   ```

2. **Code :**
   - Copier tous les helpers et fonctions dans `lib/docGenerator.ts`
   - Ajouter mutations/actions dans `convex/strategicPlan.ts`
   - Créer table `strategicPlans` dans Convex

3. **UI React :**
   - Créer formulaire aligné sur données
   - Appeler `generateStrategicPlan` puis `exportDocuments`
   - Afficher liens de téléchargement DOCX/PPTX/PDF

4. **Règles Critiques :**
   - WidthType.DXA uniquement (pas PERCENTAGE)
   - Texte justifié (AlignmentType.BOTH)
   - Graphiques: PNG via ChartJS + ImageRun
   - Encadrés: Table 1 colonne, 2 lignes
   - PageBreak dans Paragraph distinct
   - Puces: indentation explicite par niveau


---

## Fonction Principale: generateStrategicPlanDocx()

Cette fonction orchestrate la création du document complet:

```javascript
async function generateStrategicPlanDocx(data) {
  const children = [];

  // 1. PAGE DE GARDE
  children.push(...generateCoverPage(data.metadata));
  children.push(new PageBreak());

  // 2. TABLE DES MATIÈRES
  children.push(...generateTableOfContents());
  children.push(new PageBreak());

  // 3. PARTIE I. RÉSUMÉ EXÉCUTIF
  children.push(h1("Partie I. RÉSUMÉ EXÉCUTIF"));
  children.push(p(""));
  
  // Tableau récapitulatif
  const summaryTableData = [
    ["Champ", "Valeur"],
    ["Cible", data.executive_summary.target],
    ["Pays", data.executive_summary.countries.join(", ")],
    ["Secteur", data.executive_summary.sector],
    ["Durée", data.executive_summary.duration],
    ["Budget", data.executive_summary.budget || "À définir"],
    ["Scénario retenu", data.executive_summary.retained_scenario],
  ];
  
  children.push(makeTable(summaryTableData, [4680, 4680], {
    headerBgColor: COLORS.VERT_GABON,
    alternateRows: true,
  }));
  children.push(p(""));

  if (data.executive_summary.kpi && data.executive_summary.kpi.length > 0) {
    children.push(kpiCards(data.executive_summary.kpi));
    children.push(p(""));
  }

  children.push(new PageBreak());

  // 4. PARTIE II. DIAGNOSTIC SECTORIEL
  children.push(h1("Partie II. DIAGNOSTIC SECTORIEL"));
  children.push(p(""));

  children.push(h2("1. Contexte macroéconomique"));
  children.push(p(data.diagnostic.context));
  children.push(p(""));

  children.push(h2("2. Forces du Gabon dans ce secteur"));
  data.diagnostic.strengths.forEach(strength => {
    children.push(bullet(strength));
  });
  children.push(p(""));

  children.push(h2("3. Faiblesses et lacunes identifiées"));
  data.diagnostic.weaknesses.forEach(weakness => {
    children.push(bullet(weakness));
  });
  children.push(p(""));

  children.push(h2("4. Analyse SWOT"));
  children.push(p(""));
  
  const swot = data.diagnostic.swot_analysis;
  const swotTable = [
    ["", "Positif", "Négatif"],
    ["Interne", swot.strengths.join("\n"), swot.weaknesses.join("\n")],
    ["Externe", swot.opportunities.join("\n"), swot.threats.join("\n")],
  ];
  
  children.push(makeTable(swotTable, [3120, 3120, 3120], {
    headerBgColor: COLORS.BLEU_MARINE,
  }));
  children.push(p(""));

  children.push(new PageBreak());

  // 5. PARTIE III. ANALYSE DU PARTENAIRE
  children.push(h1("Partie III. ANALYSE DU PARTENAIRE"));
  children.push(p(""));

  children.push(h2("1. Profil et capacités"));
  children.push(p(data.partner_analysis.profile));
  children.push(p(""));

  children.push(h3("Capacités clés"));
  children.push(p(data.partner_analysis.capabilities));
  children.push(p(""));

  children.push(h2("2. Complémentarité avec le Gabon"));
  children.push(p(data.partner_analysis.complementarity));
  children.push(p(""));

  children.push(h2("3. Historique des échanges"));
  
  children.push(h3("A. Échanges commerciaux"));
  children.push(p(data.partner_analysis.trade_history.commercial));
  children.push(p(""));

  children.push(h3("B. Coopérations existantes"));
  data.partner_analysis.trade_history.cooperation.forEach(coop => {
    children.push(bullet(coop));
  });
  children.push(p(""));

  children.push(new PageBreak());

  // 6. PARTIE IV. OBJECTIFS STRATÉGIQUES
  children.push(h1("Partie IV. OBJECTIFS STRATÉGIQUES"));
  children.push(p(""));

  children.push(h2("1. Vision à long terme"));
  children.push(p(data.strategic_objectives.vision));
  children.push(p(""));

  children.push(h2("2. Objectifs par horizon temporel"));
  
  children.push(h3("A. Court terme (0-12 mois)"));
  data.strategic_objectives.short_term.forEach(obj => {
    children.push(bullet(obj));
  });
  children.push(p(""));

  children.push(h3("B. Moyen terme (1-3 ans)"));
  data.strategic_objectives.medium_term.forEach(obj => {
    children.push(bullet(obj));
  });
  children.push(p(""));

  children.push(h3("C. Long terme (3-5 ans)"));
  data.strategic_objectives.long_term.forEach(obj => {
    children.push(bullet(obj));
  });
  children.push(p(""));

  children.push(h2("3. Indicateurs de résultats attendus"));
  data.strategic_objectives.expected_results.forEach(result => {
    children.push(bullet(result));
  });
  children.push(p(""));

  children.push(new PageBreak());

  // 7. PARTIE V. SCÉNARIOS D'ACTION
  children.push(h1("Partie V. SCÉNARIOS D'ACTION"));
  children.push(p(""));

  data.scenarios.forEach((scenario, idx) => {
    children.push(h2(`${idx + 1}. ${scenario.name}`));
    children.push(p(scenario.description));
    
    children.push(h3("Caractéristiques"));
    children.push(bullet(`Impact: ${scenario.impact_score}/100`, 0));
    children.push(bullet(`Faisabilité: ${scenario.feasibility_score}/100`, 0));
    if (scenario.budget) children.push(bullet(`Budget: ${scenario.budget}`, 0));
    
    children.push(h3("Risques"));
    scenario.risks.forEach(risk => {
      children.push(bullet(risk, 1));
    });
    children.push(p(""));
  });

  children.push(h2("4. Analyse comparative des scénarios"));
  children.push(p(""));
  
  const compTableData = [
    ["Scénario", "Impact", "Faisabilité"],
    ...data.scenarios.map(s => [s.name, `${s.impact_score}/100`, `${s.feasibility_score}/100`]),
  ];
  
  children.push(makeTable(compTableData, [3120, 3120, 3120], {
    headerBgColor: COLORS.VERT_FONCE,
  }));
  children.push(p(""));

  // Graphique barres impact
  try {
    const impactLabels = data.scenarios.map(s => s.name);
    const impactData = data.scenarios.map(s => s.impact_score);
    const impactBuffer = await renderBarChart(impactLabels, impactData, "Scores d'Impact par Scénario", false, 700, 400);
    
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type: "png",
        data: impactBuffer,
        transformation: { width: 500, height: 300 },
        altText: { title: "Graphique", description: "Impact", name: "chart-impact" },
      })],
    }));
    children.push(figureCaption("Figure 1 — Scores d'impact par scénario"));
  } catch (err) {
    console.warn("Erreur rendu graphique impact:", err.message);
  }
  children.push(p(""));

  children.push(h2("5. Recommandation et scénario retenu"));
  children.push(p(data.executive_summary.retained_scenario));
  children.push(p(""));

  children.push(new PageBreak());

  // 8. PARTIE VI. PLAN D'ACTION OPÉRATIONNEL
  children.push(h1("Partie VI. PLAN D'ACTION OPÉRATIONNEL"));
  children.push(p(""));

  children.push(h2("1. Actions prioritaires"));
  
  children.push(h3("A. Actions immédiates (J+0 à J+90)"));
  data.action_plan.immediate_actions.forEach(action => {
    children.push(h4(action.title));
    children.push(bullet(`Description: ${action.description}`, 1));
    children.push(bullet(`Timeline: ${action.timeline}`, 1));
    children.push(bullet(`Responsable: ${action.responsible}`, 1));
  });
  children.push(p(""));

  children.push(h3("B. Actions à court terme (M3-M6)"));
  data.action_plan.short_term_actions.forEach(action => {
    children.push(h4(action.title));
    children.push(bullet(`Description: ${action.description}`, 1));
    children.push(bullet(`Timeline: ${action.timeline}`, 1));
    children.push(bullet(`Responsable: ${action.responsible}`, 1));
  });
  children.push(p(""));

  children.push(h3("C. Actions structurantes (M6-M12)"));
  data.action_plan.structural_actions.forEach(action => {
    children.push(h4(action.title));
    children.push(bullet(`Description: ${action.description}`, 1));
    children.push(bullet(`Timeline: ${action.timeline}`, 1));
    children.push(bullet(`Responsable: ${action.responsible}`, 1));
  });
  children.push(p(""));

  children.push(h2("2. Calendrier de mise en œuvre"));
  children.push(p(""));
  
  const allActions = [
    ...data.action_plan.immediate_actions.map(a => ({
      name: a.title.substring(0, 25),
      start: 0,
      duration: 3,
      color: COLORS.VERT_GABON,
    })),
    ...data.action_plan.short_term_actions.map(a => ({
      name: a.title.substring(0, 25),
      start: 3,
      duration: 3,
      color: COLORS.VERT_FONCE,
    })),
    ...data.action_plan.structural_actions.map(a => ({
      name: a.title.substring(0, 25),
      start: 6,
      duration: 6,
      color: COLORS.BLEU_MARINE,
    })),
  ];
  
  try {
    const ganttBuffer = await renderGanttChart(allActions, "Calendrier de mise en œuvre", 800, 500);
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type: "png",
        data: ganttBuffer,
        transformation: { width: 600, height: 400 },
        altText: { title: "Graphique", description: "Gantt", name: "chart-gantt" },
      })],
    }));
    children.push(figureCaption("Figure 2 — Calendrier de mise en œuvre (mois)"));
  } catch (err) {
    console.warn("Erreur rendu Gantt:", err.message);
  }
  children.push(p(""));

  children.push(h2("3. Responsabilités et gouvernance"));
  children.push(infoBox(
    "Pilotage et Gouvernance",
    "Un comité de pilotage sera constitué pour assurer le suivi des actions, la résolution des blocages et l'ajustement du plan. Réunions mensuelles prévues.",
    COLORS.BLEU_MARINE
  ));
  children.push(p(""));

  children.push(new PageBreak());

  // 9. PARTIE VII. BUDGET ET RESSOURCES
  children.push(h1("Partie VII. BUDGET ET RESSOURCES"));
  children.push(p(""));

  children.push(h2("1. Estimation budgétaire"));
  children.push(p(`Budget total: ${data.budget.total}`));
  children.push(p(""));

  children.push(h2("2. Répartition par poste"));
  
  const budgetTableData = [
    ["Catégorie", "Montant", "Pourcentage"],
    ...data.budget.breakdown.map(b => [b.category, b.amount, `${b.percentage}%`]),
  ];
  
  children.push(makeTable(budgetTableData, [3120, 3120, 3120], {
    headerBgColor: COLORS.VERT_FONCE,
    alternateRows: true,
  }));
  children.push(p(""));

  try {
    const budgetLabels = data.budget.breakdown.map(b => b.category);
    const budgetData = data.budget.breakdown.map(b => b.percentage);
    const pieBuffer = await renderPieChart(budgetLabels, budgetData, "Répartition budgétaire", 700, 450);
    
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type: "png",
        data: pieBuffer,
        transformation: { width: 500, height: 350 },
        altText: { title: "Graphique", description: "Pie", name: "chart-pie" },
      })],
    }));
    children.push(figureCaption("Figure 3 — Répartition budgétaire par poste"));
  } catch (err) {
    console.warn("Erreur rendu camembert:", err.message);
  }
  children.push(p(""));

  children.push(h2("3. Sources de financement"));
  data.budget.financing_sources.forEach(source => {
    children.push(bullet(source));
  });
  children.push(p(""));

  children.push(h2("4. Analyse coût-bénéfice"));
  children.push(p(data.budget.cost_benefit_analysis));
  children.push(p(""));

  children.push(new PageBreak());

  // 10. PARTIE VIII. RISQUES ET MESURES DE MITIGATION
  children.push(h1("Partie VIII. RISQUES ET MESURES DE MITIGATION"));
  children.push(p(""));

  children.push(h2("1. Matrice des risques"));
  
  const riskTableData = [
    ["Risque", "Probabilité", "Impact", "Mitigation"],
    ...data.risks.map(r => [r.risk, r.probability, r.impact, r.mitigation]),
  ];
  
  children.push(makeTable(riskTableData, [2340, 2340, 2340, 2340], {
    headerBgColor: COLORS.BLEU_MARINE,
  }));
  children.push(p(""));

  children.push(h2("2. Plan de contingence"));
  children.push(infoBox(
    "Plan de Contingence",
    "En cas de déviation majeure par rapport au plan, un comité extraordinaire sera convoqué pour réévaluer les actions et ajuster les priorités. Une réserve de 15% du budget est maintenue pour absorber les chocs imprévus.",
    COLORS.VERT_FONCE
  ));
  children.push(p(""));

  children.push(new PageBreak());

  // 11. CONCLUSION
  children.push(h1("CONCLUSION"));
  children.push(p(""));
  
  children.push(p(
    "Ce Plan Stratégique constitue une feuille de route claire et pragmatique pour le développement des relations diplomatiques et des partenariats stratégiques du Gabon. " +
    "Fondé sur une analyse rigoureuse du contexte macroéconomique et des capacités du pays, il propose des scénarios d'action réalistes et mesurables."
  ));
  children.push(p(""));
  
  children.push(p(
    "La mise en œuvre réussie de ce plan repose sur: (1) l'engagement politique de haut niveau, (2) la mobilisation des ressources nécessaires, " +
    "(3) un pilotage efficace et réactif, et (4) une communication transparente avec tous les stakeholders."
  ));
  children.push(p(""));

  // Bloc entreprise
  children.push(new Table({
    width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
    columnWidths: [PAGE.CONTENT_W],
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: PAGE.CONTENT_W, type: WidthType.DXA },
        borders: BORDERS,
        margins: CELL_MARGINS,
        shading: { fill: COLORS.GRIS_CLAIR, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({
              text: "NTSAGUI Digital",
              font: "Calibri",
              size: 24,
              bold: true,
              color: COLORS.VERT_GABON,
            })],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 40, after: 40, line: 276 },
            children: [new TextRun({
              text: "Expert-Conseil en Stratégie et Transformation Numérique",
              font: "Calibri",
              size: 20,
              italics: true,
              color: COLORS.GRIS_FONCE,
            })],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 40, after: 0, line: 276 },
            children: [new TextRun({
              text: "Libreville, République Gabonaise",
              font: "Calibri",
              size: 20,
              color: COLORS.GRIS_FONCE,
            })],
          }),
        ],
      })]
    })],
  }));

  children.push(p(""));
  children.push(new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 200, after: 0, line: 276 },
    children: [new TextRun({
      text: "[Tampon / Signature]",
      font: "Calibri",
      size: 20,
      italics: true,
      color: COLORS.GRIS_CLAIR,
    })],
  }));

  // ASSEMBLAGE DOCUMENT FINAL
  const doc = new Document({
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
        children,
      },
    }],
    styles: {
      default: {
        document: {
          name: "Normal",
          basedOn: "Normal",
          next: "Normal",
          run: {
            font: "Calibri",
            size: 22,
            color: COLORS.GRIS_FONCE,
          },
          paragraph: {
            alignment: AlignmentType.BOTH,
            spacing: { line: 276, before: 60, after: 120 },
          },
        },
      },
    },
  });

  return doc;
}
```

---

## Annexe: Exemple de Données Test

```javascript
const sampleData = {
  metadata: {
    title: "Plan Stratégique Gabon-Cameroun",
    subtitle: "Renforcement des Partenariats Diplomatiques",
    institution: "Ministère des Affaires Étrangères du Gabon",
    author: "Ambassador Jean-Claude Mvembe",
    authorTitle: "Ambassadeur du Gabon au Cameroun",
    date: "2026-04-09",
    reference: "DOC/MAE/2026/PS-001",
    confidential: true,
  },
  executive_summary: {
    target: "Renforcer les relations bilatérales et élargir la coopération",
    countries: ["Gabon", "Cameroun"],
    sector: "Commerce, Investissement et Coopération Régionale",
    duration: "1-3 ans",
    budget: "2 500 000€",
    retained_scenario: "Progressif",
    kpi: [
      { value: "15", label: "Accords signés", color: "009E49" },
      { value: "500M€", label: "Investissements", color: "1B3A5C" },
      { value: "50%", label: "Croissance commerce", color: "D97706" },
    ],
  },
  diagnostic: {
    context: "Contexte économique favorable avec opportunités d'intégration régionale dans le cadre CEMAC...",
    strengths: [
      "Richesses naturelles et ressources minérales",
      "Position géographique stratégique",
      "Stabilité politique relative",
    ],
    weaknesses: [
      "Infrastructure de transport limitée",
      "Manque de diversification économique",
      "Ressources humaines qualifiées insuffisantes",
    ],
    swot_analysis: {
      strengths: ["Ressources forestières et minérales", "Stabilité institutionnelle", "Proximité régionale"],
      weaknesses: ["Diversification économique", "Infrastructure routière", "Capacités de production"],
      opportunities: ["Intégration CEMAC", "Accords commerciaux", "Investissements étrangers"],
      threats: ["Volatilité des prix des matières premières", "Concurrence régionale", "Instabilité géopolitique"],
    },
  },
  partner_analysis: {
    profile: "Économie émergente avec potentiel de croissance, riche en ressources naturelles...",
    capabilities: "Secteurs clés: énergie, agriculture, infrastructure, services financiers...",
    complementarity: "Opportunités synergiques dans l'énergie, l'agriculture et les infrastructures...",
    trade_history: {
      commercial: "Échanges commerciaux en hausse de 12% annuellement sur les 3 dernières années...",
      cooperation: [
        "Accord de libre-échange CEMAC",
        "Partenariat énergétique (gaz naturel)",
        "Coopération forestière et environnementale",
      ],
    },
  },
  strategic_objectives: {
    vision: "Établir un partenariat stratégique durable fondé sur complémentarité économique et partage de valeurs...",
    short_term: [
      "Faciliter les procédures de visa pour les hommes d'affaires",
      "Créer une commission bilatérale de haut niveau",
      "Organiser missions exploratoires sectorielles",
    ],
    medium_term: [
      "Établir une zone de libre-échange bilatérale",
      "Développer corridors de transport transfrontaliers",
      "Créer fonds d'investissement conjoint",
    ],
    long_term: [
      "Envisager intégration économique profonde",
      "Harmoniser cadres juridiques et réglementaires",
      "Établir institutions régionales communes",
    ],
    expected_results: [
      "10 000 emplois créés",
      "Augmentation de 50% des échanges commerciaux",
      "5 nouveaux projets d'infrastructure",
    ],
  },
  scenarios: [
    {
      name: "Conservateur",
      description: "Maintien du statu quo avec ajustements mineurs. Accords limités et évolution lente.",
      impact_score: 40,
      feasibility_score: 90,
      budget: "800 000€",
      risks: ["Manque d'impulsion politique", "Opportunités manquées"],
    },
    {
      name: "Progressif",
      description: "Initiatives phares avec engagement politique modéré. Projets structurants prioritaires.",
      impact_score: 70,
      feasibility_score: 70,
      budget: "2 500 000€",
      risks: ["Résistances sectorielles", "Financement limité"],
    },
    {
      name: "Ambitieux",
      description: "Transformation complète avec intégration économique profonde et investissements massifs.",
      impact_score: 90,
      feasibility_score: 50,
      budget: "5 000 000€",
      risks: ["Exigences politiques élevées", "Risques financiers", "Complexité institutionnelle"],
    },
  ],
  action_plan: {
    immediate_actions: [
      {
        title: "Mission préparatoire",
        description: "Évaluer priorités, identifier partenaires clés et obstacles",
        timeline: "J+0 à J+30",
        responsible: "Ambassador + Equipe diplomatique",
      },
      {
        title: "Réunion de lancement",
        description: "Présenter plan au gouvernement camerounais et solliciter engagement",
        timeline: "J+30 à J+90",
        responsible: "Minister of Foreign Affairs",
      },
    ],
    short_term_actions: [
      {
        title: "Accord cadre",
        description: "Négocier et signer accord global de coopération",
        timeline: "M3-M6",
        responsible: "Diplomatic Commission",
      },
      {
        title: "Commission bilatérale",
        description: "Constituer commission permanente de suivi",
        timeline: "M3-M6",
        responsible: "Both Governments",
      },
    ],
    structural_actions: [
      {
        title: "Zone de libre-échange",
        description: "Élaborer cadre juridique et négocier détails",
        timeline: "M6-M12",
        responsible: "CEMAC Secretariat + Governments",
      },
      {
        title: "Corridors d'infrastructure",
        description: "Identifier projets d'infrastructure transfrontaliers prioritaires",
        timeline: "M6-M12",
        responsible: "Ministry of Infrastructure",
      },
    ],
  },
  budget: {
    total: "2 500 000€",
    breakdown: [
      { category: "Missions diplomatiques", amount: "625 000€", percentage: 25 },
      { category: "Études et consultations", amount: "500 000€", percentage: 20 },
      { category: "Infrastructure et équipements", amount: "1 000 000€", percentage: 40 },
      { category: "Formation et renforcement capacités", amount: "375 000€", percentage: 15 },
    ],
    financing_sources: [
      "Budget diplomatique national (60%)",
      "Partenaires de développement (25%)",
      "Fonds privés et investisseurs (15%)",
    ],
    cost_benefit_analysis: "ROI positif attendu dès année 2, avec retombées économiques cumulatives de 500M€ sur 5 ans...",
  },
  risks: [
    {
      risk: "Instabilité politique locale",
      probability: "Moyen",
      impact: "Élevé",
      mitigation: "Suivi régulier des développements politiques et ajustement de la stratégie",
    },
    {
      risk: "Manque de financement",
      probability: "Moyen",
      impact: "Moyen",
      mitigation: "Diversifier sources de financement et chercher partenaires additionnels",
    },
    {
      risk: "Résistances commerciales internes",
      probability: "Élevé",
      impact: "Moyen",
      mitigation: "Impliquer acteurs privés dans conception du plan et formations de sensibilisation",
    },
  ],
};
```

---

## Checklist de Mise en Œuvre Finale

- [ ] Dépendances npm installées (docx, pptxgenjs, chartjs-node-canvas, chart.js)
- [ ] LibreOffice installé et testé en mode headless
- [ ] Code DOCX copié dans `lib/docGenerator.ts`
- [ ] Code PPTX intégré et testé
- [ ] Mutations Convex créées et déployées
- [ ] Table `strategicPlans` créée en DB
- [ ] UI React créée avec formulaire de saisie
- [ ] Test end-to-end exécuté avec données d'exemple
- [ ] Documents générés vérifiés (DOCX, PPTX, PDF)
- [ ] En-têtes/pieds de page validés
- [ ] Graphiques embarqués testés
- [ ] Tableaux et encadrés contrôlés
- [ ] Performance optimisée (génération < 30 secondes)
- [ ] Documentation mise à jour pour les utilisateurs


---

## Détails Additionnels : Intégration PPTX Complète

Le générateur PPTX doit inclure les slides suivants avec contenu détaillé:

```
Slide 3: Résumé Exécutif
- KPI Cards (3-4 chiffres principaux)
- Tableau: Cible, Secteur, Durée, Budget
- Scénario retenu en évidence

Slide 4: Diagnostic Sectoriel
- Colonne gauche: Forces du Gabon
- Colonne droite: Faiblesses identifiées
- Analyse SWOT 2x2 si espace

Slide 5: Partenaire
- Profil court (3-4 points)
- Historique commercial
- Complémentarité clé

Slide 6: Objectifs Stratégiques
- Vision long terme
- Trois horizons (court/moyen/long)
- Indicateurs clés

Slide 7: Scénarios
- Tableau comparatif: Impact vs Faisabilité
- Scores visuels par scénario
- Recommandation mise en avant

Slide 8: Plan d'Action
- Actions immédiates (top 2-3)
- Calendrier Gantt simplifié
- Responsabilités clés

Slide 9: Budget
- Mini-tableau répartition (top 4 catégories)
- Montant total en évidence
- Camembert si place

Slide 10: Risques
- Matrice probabilité/impact (3-4 risques)
- Mitigations clés
- Plan de contingence

Slide 11: Conclusion
- Énoncé de vision synthétisé
- 4 piliers de mise en œuvre
- Appel à l'action
```

---

## Architecture des Fichiers de Sortie

```
.generated/
├── PlanStrategique_2026-04-09.docx  (1.5-2MB)
├── PlanStrategique_2026-04-09.pptx  (800KB-1MB)
└── PlanStrategique_2026-04-09.pdf   (2-3MB)
```

### Format DOCX
- Pages: 35-50 (selon volume de contenu)
- Sections: 8 parties principales + annexes
- Images: 3 graphiques ChartJS embarqués
- Tableaux: 8-12 tableaux professionnels
- Styles: Calibri 11pt justifié, interligne 1.15

### Format PPTX
- Slides: 11-15 (couverture + sommaire + 8-12 contenu + conclusion)
- Résolution: 1920x1080 (16:9)
- Couleurs: Palette NTSAGUI Digital achromatique
- Animations: Aucune (professionnalisme)

### Format PDF
- Généré depuis DOCX via LibreOffice
- Préservation de la mise en forme
- Conversion: DOCX → PDF directe
- Taille: 2-3MB selon nombre d'images

---

## Gestion des Erreurs et Fallbacks

Le générateur doit gérer gracieusement:

1. **Graphiques ChartJS manquants** → afficher texte brut "Graphique non disponible"
2. **LibreOffice non disponible** → retourner DOCX uniquement, avertir utilisateur
3. **Données manquantes** → utiliser valeurs par défaut ("À remplir", "À définir")
4. **Répertoire de sortie inaccessible** → créer répertoire automatiquement
5. **Limites de taille PPTX** → réduire nombre de points de balle, compresser images

---

## Performance et Optimisation

- **Génération DOCX:** 10-15 secondes (dépend nombre graphiques)
- **Génération PPTX:** 5-8 secondes
- **Conversion DOCX→PDF:** 8-12 secondes
- **Total:** 25-35 secondes pour les 3 formats

### Optimisations possibles:
- Cacher les graphiques ChartJS si données simples
- Limiter détail des SWOT à 4 items par quadrant
- Pré-générer templates PPTX
- Cache des conversions PDF (si même source DOCX)

---

## Règles de Style Documentaires NTSAGUI (Détaillé)

### Police de Caractères
- **Georgia** : Titres H1 (Parties), page de garde, signatures (28pt-56pt)
- **Calibri** : Corps texte, tableaux, titres H2-H4 (11pt-24pt)
- Pas de polices mixtes au sein d'une section
- Pas d'italiques pour le corps sauf mentions légales

### Espacement Paragraphes
- **Avant section**: 360 DXA (0.25 pouce)
- **Après section**: 240 DXA (0.167 pouce)
- **Interligne**: 276 DXA (1.15) dans tout le document
- **Justification**: AlignmentType.BOTH pour 100% du corps de texte

### Couleurs - Hiérarchie
```
Niveau 1 (H1 Parties)  → VERT_GABON (#009E49) gras 28pt Georgia
Niveau 2 (H2 Sections) → VERT_FONCE (#0F766E) souligné 24pt Calibri
Niveau 3 (H3 Sub)      → BLEU_MARINE (#1B3A5C) gras 22pt Calibri
Niveau 4 (H4 Detail)   → GRIS_FONCE (#374151) italique gras 22pt Calibri
Corps (Paragraphes)    → GRIS_FONCE (#374151) régulier 11pt Calibri
Texte secondaire       → GRIS_MOYEN (#6B7280) régulier 10pt Calibri
```

### Tableaux - Formatage Standard
- **En-têtes** : Fond VERT_FONCE ou BLEU_MARINE, texte BLANC, gras, centré
- **Lignes de données** : Blanc ou alternance GRIS_CLAIR
- **Ligne TOTAL** (optionnel) : Fond VERT_GABON, texte BLANC, gras, centré
- **Bordures** : Gris léger (#D1D5DB) tout autour et entre cellules
- **Cellules marges** : 120pt top/bottom, 160pt left/right (espacement interne)
- **Alignement contenu** : BOTH (justifié) pour texte, CENTER pour nombres

### Encadrés Colorés (Info Boxes)
Pattern obligatoire : Table 1 colonne, 2 rangées
- **Rangée 1** (titre) : Fond couleur primaire, texte BLANC gras 11pt
- **Rangée 2** (contenu) : Fond teinte pâle de la couleur, texte gris foncé justifié
- Couleurs de teinte selon accent:
  - Vert primaire → F0FDF4 (vert pâle)
  - Bleu → EFF6FF (bleu pâle)
  - Ambre → FEF3C7 (jaune pâle)
  - Rouge → FEF2F2 (rouge pâle)

### KPI Cards
- Tableau sans bordures visibles, 4 colonnes max
- Valeur numérique en Georgia 56pt gras, couleur spécifique
- Label en Calibri 10pt gris moyen centré
- Espacement vertical: 80pt avant, 80pt après

### Graphiques ChartJS
Tous les graphiques:
- Fond blanc pur (#FFFFFF)
- Titre Calibri 16pt gras gris foncé
- Légende Calibri 12pt gris foncé
- Pas de grille de fonds
- Couleurs CHART_COLORS standard
- Résolution PNG: 700x450 pour pie, 700x400 pour bar

### Titres de Figures
- Centré, Calibri 10pt italique gris moyen
- Format : "Figure N — Description courte"
- Exemple : "Figure 1 — Scores d'impact par scénario"
- Espacement: 80pt avant, 200pt après

---

## Convex Schema Complet pour Base de Données

```javascript
// convex/schema.ts

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  strategicPlans: defineTable({
    // Métadonnées du plan
    data: v.object({
      metadata: v.object({
        title: v.string(),
        subtitle: v.optional(v.string()),
        institution: v.string(),
        author: v.string(),
        authorTitle: v.string(),
        date: v.string(),
        reference: v.optional(v.string()),
        confidential: v.optional(v.boolean()),
      }),

      // Résumé exécutif avec KPI
      executive_summary: v.object({
        target: v.string(),
        countries: v.array(v.string()),
        sector: v.string(),
        duration: v.string(),
        budget: v.optional(v.string()),
        retained_scenario: v.string(),
        kpi: v.array(v.object({
          value: v.string(),
          label: v.string(),
          color: v.optional(v.string()),
        })),
      }),

      // Diagnostic SWOT
      diagnostic: v.object({
        context: v.string(),
        strengths: v.array(v.string()),
        weaknesses: v.array(v.string()),
        swot_analysis: v.object({
          strengths: v.array(v.string()),
          weaknesses: v.array(v.string()),
          opportunities: v.array(v.string()),
          threats: v.array(v.string()),
        }),
      }),

      // Analyse du partenaire
      partner_analysis: v.object({
        profile: v.string(),
        capabilities: v.string(),
        complementarity: v.string(),
        trade_history: v.object({
          commercial: v.string(),
          cooperation: v.array(v.string()),
        }),
      }),

      // Objectifs stratégiques
      strategic_objectives: v.object({
        vision: v.string(),
        short_term: v.array(v.string()),
        medium_term: v.array(v.string()),
        long_term: v.array(v.string()),
        expected_results: v.array(v.string()),
      }),

      // Scénarios d'action
      scenarios: v.array(v.object({
        name: v.string(),
        description: v.string(),
        impact_score: v.number(),
        feasibility_score: v.number(),
        budget: v.optional(v.string()),
        risks: v.array(v.string()),
      })),

      // Plan d'action opérationnel
      action_plan: v.object({
        immediate_actions: v.array(v.object({
          title: v.string(),
          description: v.string(),
          timeline: v.string(),
          responsible: v.string(),
        })),
        short_term_actions: v.array(v.object({
          title: v.string(),
          description: v.string(),
          timeline: v.string(),
          responsible: v.string(),
        })),
        structural_actions: v.array(v.object({
          title: v.string(),
          description: v.string(),
          timeline: v.string(),
          responsible: v.string(),
        })),
      }),

      // Budget et ressources
      budget: v.object({
        total: v.string(),
        breakdown: v.array(v.object({
          category: v.string(),
          amount: v.string(),
          percentage: v.number(),
        })),
        financing_sources: v.array(v.string()),
        cost_benefit_analysis: v.string(),
      }),

      // Risques et mitigations
      risks: v.array(v.object({
        risk: v.string(),
        probability: v.string(),
        impact: v.string(),
        mitigation: v.string(),
      })),

      // Annexes optionnelles
      annexes: v.optional(v.array(v.object({
        title: v.string(),
        content: v.string(),
      }))),
    }),

    // Status du plan
    status: v.union(
      v.literal("pending"),    // En attente de génération
      v.literal("generating"), // Génération en cours
      v.literal("completed"),  // Généré avec succès
      v.literal("failed")      // Erreur de génération
    ),

    // Outputs générés
    outputs: v.optional(v.object({
      docxPath: v.string(),
      pptxPath: v.string(),
      pdfPath: v.string(),
    })),

    // Message d'erreur si applicable
    error: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
});
```

---

## Documentation pour Utilisateurs Finaux

### Guide de Saisie des Données

1. **Métadonnées** : Remplir titre, institution, auteur, date
2. **Executive Summary** : Saisir 3-4 KPI avec couleurs (codes hex)
3. **Diagnostic** : Lister 3-4 forces, 3-4 faiblesses, 4x4 SWOT
4. **Partenaire** : Description concise, 3-5 coopérations existantes
5. **Objectifs** : Vision + 3 objectifs par horizon temporel
6. **Scénarios** : 3 scénarios avec scores 0-100 et risques
7. **Actions** : 2-3 actions par phase (immédiate, court terme, structurante)
8. **Budget** : Montant total + répartition (max 5 postes)
9. **Risques** : 3-5 risques avec probabilité/impact et mitigation

### Paramètres Optionnels
- Sous-titre (si multi-pays ou thème complexe)
- Référence documentaire (code archivage)
- Confidentiel (booléen pour marquage)
- Annexes (documents supplémentaires)

### Temps de Génération
- DOCX: 10-15 secondes
- PPTX: 5-8 secondes
- PDF: 8-12 secondes
- Total: ~25-35 secondes

### Téléchargement des Documents
Après génération, les trois fichiers sont disponibles en téléchargement:
- Clic droit → Enregistrer sous
- Ou drag-drop vers email/partage


---

## Troubleshooting et FAQ Technique

### Q1: Le graphique ChartJS ne s'affiche pas
**Réponse**: Vérifier que:
1. ChartJS et chartjs-node-canvas sont installés
2. Les données passées ne sont pas vides
3. L'accent couleur est un code hex valide
4. Pas d'erreur réseau lors de la génération

**Fallback**: Le texte "Graphique non disponible" s'affiche à la place

### Q2: Conversion DOCX→PDF échoue
**Réponse**: Vérifier que:
1. LibreOffice est installé (`libreoffice --version`)
2. Le répertoire de sortie existe et est accessible
3. Pas d'autre processus LibreOffice en cours
4. Espace disque disponible (min 500MB)

**Fallback**: Retourner DOCX uniquement, avertir utilisateur

### Q3: Les tableaux sortent mal en PDF
**Réponse**: Probablement due à LibreOffice. Tester:
1. Générer DOCX avec Word en local
2. Ouvrir et convertir manuellement en PDF
3. Vérifier colonnes min 2, max 5
4. Réduire volume de texte par cellule

### Q4: Performance faible (>60 secondes)
**Réponse**: 
1. Réduire nombre de graphiques (max 3)
2. Limiter données de tableau (max 10 lignes visibles)
3. Utiliser serveur plus puissant pour LibreOffice
4. Pré-générer templates PPTX

### Q5: Fichiers générés corruptus
**Réponse**: Vérifier que:
1. Buffer Packer.toBuffer() n'a pas erreur
2. Pas d'interruption réseau lors écriture
3. Permissions fichier permettent écriture
4. Pas de caractères invalides (accents mal encodés)

---

## Exemples de Code: Intégration UI React

```javascript
// components/StrategicPlanForm.tsx

import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function StrategicPlanForm() {
  const [formData, setFormData] = useState({
    metadata: {
      title: '',
      institution: '',
      author: '',
      authorTitle: '',
      date: new Date().toISOString().split('T')[0],
    },
    // ... autres champs
  });

  const [loading, setLoading] = useState(false);
  const [outputs, setOutputs] = useState(null);

  const generatePlan = useMutation(api.strategicPlan.generateStrategicPlan);
  const exportDocs = useMutation(api.strategicPlan.exportDocuments);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Étape 1: Générer le plan
      const planId = await generatePlan({ data: formData });

      // Étape 2: Exporter les documents
      const formats = await exportDocs({ planId });

      setOutputs(formats);
      console.log('Documents générés:', formats);
    } catch (error) {
      console.error('Erreur génération:', error);
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
        {/* Champs de formulaire */}
        <input
          type="text"
          placeholder="Titre du plan"
          value={formData.metadata.title}
          onChange={(e) => setFormData({
            ...formData,
            metadata: { ...formData.metadata, title: e.target.value }
          })}
        />
        {/* ... autres champs */}

        <button type="submit" disabled={loading}>
          {loading ? 'Génération...' : 'Générer documents'}
        </button>
      </form>

      {outputs && (
        <div className="outputs">
          <h3>Documents générés:</h3>
          <a href={outputs.docxPath} download>Télécharger DOCX</a>
          <a href={outputs.pptxPath} download>Télécharger PPTX</a>
          <a href={outputs.pdfPath} download>Télécharger PDF</a>
        </div>
      )}
    </div>
  );
}
```

---

## Tests et Validation

### Test Unitaire: Génération DOCX

```javascript
describe('generateStrategicPlanDocx', () => {
  it('devrait générer document DOCX valide', async () => {
    const doc = await generateStrategicPlanDocx(sampleData);
    expect(doc).toBeDefined();
    expect(doc.sections.length).toBe(1);
  });

  it('devrait inclure toutes les 8 parties', async () => {
    const doc = await generateStrategicPlanDocx(sampleData);
    const content = JSON.stringify(doc);
    expect(content).toContain('Partie I');
    expect(content).toContain('Partie VIII');
  });

  it('devrait embarquer graphiques ChartJS', async () => {
    const doc = await generateStrategicPlanDocx(sampleData);
    // Vérifier présence ImageRun
    const hasImages = JSON.stringify(doc).includes('ImageRun');
    expect(hasImages).toBe(true);
  });
});
```

### Test Intégration: Flux Complet

```javascript
describe('Flux complet DOCX→PDF', () => {
  it('devrait générer tous les 3 formats', async () => {
    const formats = await generateAllFormats(sampleData, '/tmp/test');
    expect(formats.docxPath).toBeDefined();
    expect(formats.pptxPath).toBeDefined();
    expect(formats.pdfPath).toBeDefined();

    // Vérifier fichiers existent
    const fs = require('fs');
    expect(fs.existsSync(formats.docxPath)).toBe(true);
    expect(fs.existsSync(formats.pptxPath)).toBe(true);
    expect(fs.existsSync(formats.pdfPath)).toBe(true);
  });

  it('PDF doit être valide', async () => {
    const formats = await generateAllFormats(sampleData, '/tmp/test');
    const fs = require('fs');
    const pdfBuffer = fs.readFileSync(formats.pdfPath);
    
    // Vérifier signature PDF
    expect(pdfBuffer.toString('utf8', 0, 4)).toContain('%PDF');
  });
});
```

---

## Maintenance et Evolution Future

### Extensions Possibles (Phase 2)

1. **Multilingual Support**
   - Ajouter paramètre `language` (fr, en, es)
   - Traduire titres et étiquettes
   - Adapter formats numériques/devises

2. **Templates Personnalisés**
   - Charger logo depuis URL
   - Couleurs entièrement customisables
   - Fonts additionnelles (Helvetica, Times)

3. **Export Supplémentaires**
   - Excel (.xlsx) pour tableaux budgétaires
   - HTML interactif pour consultation
   - JSON pour intégration CMS

4. **Intégration IA**
   - Suggestion automatique de scénarios via LLM
   - Analyse SWOT générée par Gemini
   - Rédaction de risques via IA

5. **Versioning et Historique**
   - Garder trace des versions précédentes
   - Diff entre versions
   - Rollback à version antérieure

### Migration vers Production

1. **Validation Données**
   - Schéma JSON Convex strict
   - Tests de longueur/format pour champs
   - Validation énumérations (probabilité, impact)

2. **Performance**
   - Cache des graphiques générés
   - Pool d'instances LibreOffice
   - Queue asynchrone pour conversions PDF

3. **Monitoring**
   - Logs de génération (timing, erreurs)
   - Métriques: temps moyen, taux d'erreur
   - Alertes si performance dégradée

4. **Sécurité**
   - Isoler processus LibreOffice (sandbox)
   - Limiter taille des fichiers entrée
   - Antivirus sur outputs générés
   - Authentification utilisateur obligatoire

---

## Ressources Externes et Documentation

- **docx-js**: https://github.com/dolanmiu/docx
- **pptxgenjs**: https://gitbrent.github.io/PptxGenJS/
- **ChartJS**: https://www.chartjs.org/
- **chartjs-node-canvas**: https://github.com/SeanSobey/ChartjsNodeCanvas
- **LibreOffice CLI**: https://help.libreoffice.org/

---

## Notes Finales et Best Practices

### Code Quality
- Utiliser TypeScript strict mode pour type safety
- Linter ESLint + Prettier pour formatage
- Pre-commit hooks pour tests automatiques

### Documentation
- Commenter fonctions complexes (generateCoverPage, makeTable)
- Documenter paramètres avec exemples
- Maintenir changelog des modifications

### Versioning
- Bumper version si changement structure données
- Backward compatibility pour anciennes versions
- Migration scripts si schema change

### Support Utilisateurs
- FAQ disponible pour cas communs
- Logs détaillés pour debugging
- Option "re-générer depuis historique"

