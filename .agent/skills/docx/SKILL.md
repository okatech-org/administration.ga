# DOCX — Expert en documents Word

**name:** docx
**description:** Expert en création, lecture et édition de documents Word (.docx). S'active pour: Word doc, .docx, rapport, mémo, lettre, template, document professionnel.

## Vue d'ensemble

Le format `.docx` est un format XML compressé (ZIP) utilisé par Microsoft Word. Cette skill fournit des patterns robustes pour créer, lire et éditer des documents Word programmatiquement avec la bibliothèque `docx` (npm).

## Installation

```bash
npm install docx
npm install mammoth   # pour lecture
npm install jszip xml2js  # pour édition directe
# Pour PDF: libreoffice --headless --convert-to pdf
```

## Création de documents

### Template de base

```typescript
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

const doc = new Document({
  sections: [
    {
      children: [
        new Paragraph({
          text: "Titre du Document",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: "Contenu principal",
          spacing: { line: 360 },
        }),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync("output.docx", buffer);
```

### Paramètres de page

**TOUJOURS** définir la taille US Letter (12240x15840 DXA), JAMAIS utiliser le défaut A4:

```typescript
const doc = new Document({
  sections: [
    {
      page: {
        margin: {
          top: 1440,    // 1 inch = 1440 twips
          bottom: 1440,
          left: 1440,
          right: 1440,
        },
        size: {
          width: 12240,  // 8.5 inches
          height: 15840, // 11 inches (US Letter)
        },
      },
      children: [...],
    },
  ],
});
```

### Styles de titre et paragraphes

```typescript
new Paragraph({
  text: "Titre Principal",
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 240, after: 120 },
  bold: true,
  fontSize: 28,
}),

new Paragraph({
  text: "Sous-titre",
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 120, after: 60 },
  bold: true,
  fontSize: 24,
}),

new Paragraph({
  text: "Paragraphe normal avec espacement",
  spacing: { line: 360, after: 120 },
  alignment: "justified",
}),
```

### Listes à puces

**TOUJOURS** utiliser le système de puces intégré, JAMAIS les caractères Unicode:

```typescript
new Paragraph({
  text: "Premier item",
  bullet: {
    level: 0,
  },
  spacing: { after: 60 },
}),

new Paragraph({
  text: "Deuxième item",
  bullet: {
    level: 0,
  },
}),

new Paragraph({
  text: "Item imbriqué",
  bullet: {
    level: 1,
  },
}),
```

### Tableaux

Les tableaux nécessitent des largeurs **duales** (colonne + cellule):

```typescript
import { Table, TableRow, TableCell, VerticalAlign } from 'docx';

new Table({
  width: {
    size: 100,
    type: "percentage",
  },
  rows: [
    new TableRow({
      cells: [
        new TableCell({
          children: [new Paragraph("Colonne 1")],
          width: { size: 2000, type: "dxa" },
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph("Colonne 2")],
          width: { size: 2000, type: "dxa" },
        }),
      ],
    }),
    new TableRow({
      cells: [
        new TableCell({
          children: [new Paragraph("Données A1")],
          width: { size: 2000, type: "dxa" },
        }),
        new TableCell({
          children: [new Paragraph("Données A2")],
          width: { size: 2000, type: "dxa" },
        }),
      ],
    }),
  ],
}),
```

### Images

Le paramètre `type` est **obligatoire**:

```typescript
import { ImageRun } from 'docx';
import fs from 'fs';

const imageBuffer = fs.readFileSync("path/to/image.png");

new Paragraph({
  children: [
    new ImageRun({
      data: imageBuffer,
      transformation: {
        width: 200,
        height: 150,
      },
      type: "png",  // OBLIGATOIRE: "png", "jpg", "gif", etc.
    }),
  ],
}),
```

### Sauts de page

Les sauts de page DOIVENT être dans un `Paragraph`:

```typescript
new Paragraph({
  pageBreakBefore: true,
  text: "",
}),

// Contenu de la nouvelle page
new Paragraph({
  text: "Contenu après le saut de page",
}),
```

### En-têtes et pieds de page

```typescript
import { Header, Footer } from 'docx';

sections: [
  {
    children: [...],
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            text: "En-tête du document",
            alignment: "center",
            border: {
              bottom: {
                color: "CCCCCC",
                space: 1,
                style: "single",
                size: 6,
              },
            },
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            text: "Page ",
            alignment: "right",
          }),
        ],
      }),
    },
  },
],
```

### Table des matières

```typescript
import { TableOfContents } from 'docx';

new TableOfContents("Table des Matières", {
  hyperlink: true,
  headingLevels: [1, 2],
}),

new Paragraph({ pageBreakBefore: true, text: "" }),

// Contenu avec titres de niveau 1 et 2 pour la TOC
```

### Numérotation des pages

```typescript
import { PageNumber } from 'docx';

footers: {
  default: new Footer({
    children: [
      new Paragraph({
        alignment: "center",
        children: [
          new PageNumber(),
        ],
      }),
    ],
  }),
},
```

### Guillemets intelligents

Utiliser des guillemets droits dans le code — Word les convertit automatiquement:

```typescript
new Paragraph({
  children: [
    new TextRun({
      text: 'Exemple avec "guillemets intelligents".',
    }),
  ],
}),
```

### Suivi des modifications

```typescript
new Paragraph({
  children: [
    new TextRun({
      text: "Texte inséré avec suivi",
      insert: {
        date: new Date(),
        author: "Claude",
      },
    }),
  ],
}),

new Paragraph({
  children: [
    new TextRun({
      text: "Texte supprimé",
      delete: {
        date: new Date(),
        author: "Claude",
      },
    }),
  ],
}),
```

## Lecture et analyse de documents

### Avec Mammoth (recommandé pour texte)

```bash
npm install mammoth
```

```typescript
import mammoth from 'mammoth';

const buffer = fs.readFileSync("input.docx");
const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer });
console.log(html);
```

### Avec Pandoc (conversion universelle)

```bash
pandoc input.docx -t plain -o output.txt
pandoc input.docx -t json -o output.json
```

### Lecture directe du ZIP/XML

```typescript
import JSZip from 'jszip';
import xml2js from 'xml2js';

const zip = new JSZip();
const docxBuffer = fs.readFileSync("input.docx");
const docxZip = await zip.loadAsync(docxBuffer);
const docxmlContent = await docxZip.file("word/document.xml").async("string");
const parser = new xml2js.Parser();
const docxml = await parser.parseStringPromise(docxmlContent);
// Naviguer dans docxml.Document.body[0].p
```

## Édition de documents existants

Approche par manipulation XML directe:

```typescript
import JSZip from 'jszip';
import fs from 'fs';

const zip = new JSZip();
const docxBuffer = fs.readFileSync("input.docx");
await zip.loadAsync(docxBuffer);

// Modifier le contenu XML
let docxmlStr = await zip.file("word/document.xml").async("string");
// Manipulation avec regex ou parseur XML
docxmlStr = docxmlStr.replace(/old/g, "new");

zip.file("word/document.xml", docxmlStr);

const newBuffer = await zip.generateAsync({ type: "nodebuffer" });
fs.writeFileSync("output.docx", newBuffer);
```

## Conversion en PDF

```bash
# Linux/macOS
libreoffice --headless --convert-to pdf:writer_pdf_Export input.docx --outdir ./

# Windows
"C:\Program Files\LibreOffice\program\soffice.exe" --headless --convert-to pdf input.docx
```

Node.js avec `libreoffice-convert`:

```bash
npm install libreoffice-convert
```

```typescript
import convert from 'libreoffice-convert';

const docxBuffer = fs.readFileSync("input.docx");
const pdfBuffer = await convert({
  data: docxBuffer,
  format: "pdf",
  tmpOptions: { unsafeCleanup: true },
});
fs.writeFileSync("output.pdf", pdfBuffer);
```

## Anti-patterns

❌ **NE PAS** utiliser de caractères Unicode pour les puces:
```typescript
new Paragraph({ text: "• Item" })  // MAUVAIS
```

✅ **FAIRE** utiliser le système intégré:
```typescript
new Paragraph({
  text: "Item",
  bullet: { level: 0 },
})  // BON
```

❌ **NE PAS** oublier la taille de page:
```typescript
sections: [{ children: [...] }]  // Default A4 — MAUVAIS
```

✅ **FAIRE** spécifier US Letter:
```typescript
sections: [{
  page: {
    size: {
      width: 12240,
      height: 15840,
    },
  },
  children: [...],
}]  // BON
```

❌ **NE PAS** oublier le paramètre `type` pour les images:
```typescript
new ImageRun({ data: buffer })  // MAUVAIS
```

✅ **FAIRE** toujours spécifier le type:
```typescript
new ImageRun({
  data: buffer,
  type: "png",
})  // BON
```

❌ **NE PAS** placer un PageBreak en dehors d'un Paragraph:
```typescript
children: [
  new PageBreak(),  // MAUVAIS
  new Paragraph(...),
]
```

✅ **FAIRE** l'envelopper:
```typescript
children: [
  new Paragraph({ pageBreakBefore: true, text: "" }),  // BON
  new Paragraph(...),
]
```

## Ressources

- [docx-js NPM](https://github.com/dolanmiu/docx)
- [Mammoth.js](https://github.com/mwilson/mammoth.js)
- [Pandoc](https://pandoc.org/)
