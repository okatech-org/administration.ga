# PPTX — Expert en présentations PowerPoint

**name:** pptx
**description:** Expert en présentations PowerPoint — création, lecture, édition de .pptx, design de slides professionnel. S'active pour: PowerPoint, .pptx, présentation, slides, pitch deck, diaporama.

## Vue d'ensemble

Le format `.pptx` est un format XML compressé utilisé par PowerPoint. Cette skill couvre la création de présentations professionnelles, l'extraction de contenu et la visualisation avec des principes de design établis.

## Installation

```bash
npm install pptxgenjs     # Création (Node.js)
npm install marked        # Markdown to HTML (pour lecture)

# Python alternative
pip install python-pptx   # Lecture/édition basique
pip install pptxgenjs-py  # Wrapper Python

# Pour extraction et aperçus
pip install python-pptx pillow  # Génération de thumbnails
```

## Lecture et extraction de contenu

### Avec pptxgenjs (extraction de texte)

```typescript
import PptxGenJS from 'pptxgenjs';

const prs = new PptxGenJS();
prs.defineLayout({ name: 'LAYOUT1', width: 10, height: 7.5 });

// Pour charger un PPTX existant:
// Note: pptxgenjs ne supporte pas bien la lecture
// Utiliser python-pptx ou extraction XML
```

### Avec Python: python-pptx (lecture)

```python
from pptx import Presentation

prs = Presentation("presentation.pptx")

print(f"Nombre de slides: {len(prs.slides)}")

# Extraire le texte de chaque slide
for slide_idx, slide in enumerate(prs.slides):
    print(f"\n--- Slide {slide_idx + 1} ---")
    for shape in slide.shapes:
        if hasattr(shape, "text"):
            print(shape.text)
```

### Extraction structurée

```python
from pptx import Presentation
import json

prs = Presentation("presentation.pptx")
slides_data = []

for slide_idx, slide in enumerate(prs.slides):
    slide_data = {
        "slide_number": slide_idx + 1,
        "shapes": [],
    }

    for shape in slide.shapes:
        if hasattr(shape, "text"):
            slide_data["shapes"].append({
                "type": shape.shape_type,
                "text": shape.text,
            })

    slides_data.append(slide_data)

# Exporter en JSON
with open("slides_content.json", "w", encoding="utf-8") as f:
    json.dump(slides_data, f, indent=2, ensure_ascii=False)
```

### Génération de thumbnails

```python
from pptx import Presentation
from PIL import Image
import io

prs = Presentation("presentation.pptx")

# Note: python-pptx ne génère pas nativement des aperçus
# Utiliser LibreOffice pour convertir en images
# ou extraire les images intégrées
```

### Extraction avec LibreOffice CLI

```bash
# Convertir chaque slide en image
libreoffice --headless --convert-to png --outdir ./slides/ presentation.pptx
```

## Création de présentations

### Template de base avec pptxgenjs

```typescript
import PptxGenJS from 'pptxgenjs';

const prs = new PptxGenJS();

// Définir la taille
prs.defineLayout({ name: 'STANDARD', width: 10, height: 7.5 });

// Slide titre
const slide1 = prs.addSlide();
slide1.background = { color: '2E75B6' };

slide1.addText('Ma Présentation Professionnelle', {
  x: 0.5,
  y: 2.5,
  w: 9,
  h: 1.5,
  fontSize: 54,
  bold: true,
  color: 'FFFFFF',
  align: 'center',
});

slide1.addText('Sous-titre informatif', {
  x: 0.5,
  y: 4.2,
  w: 9,
  h: 0.8,
  fontSize: 28,
  color: 'E8E8E8',
  align: 'center',
});

// Slide contenu
const slide2 = prs.addSlide();
slide2.background = { color: 'FFFFFF' };

slide2.addText('Plan de la présentation', {
  x: 0.5,
  y: 0.5,
  w: 9,
  h: 0.6,
  fontSize: 44,
  bold: true,
  color: '2E75B6',
});

const bulletPoints = [
  'Introduction au sujet',
  'Points clés et insights',
  'Données et analyse',
  'Recommandations',
];

slide2.addText(bulletPoints.join('\n'), {
  x: 1,
  y: 1.5,
  w: 8.5,
  h: 5,
  fontSize: 20,
  color: '333333',
  bullet: true,
  valign: 'top',
});

// Sauvegarder
await prs.writeFile({ fileName: 'presentation.pptx' });
```

## Principes de design professionnels

### Palette de couleurs (60-30-10 rule)

```typescript
const colorScheme = {
  dominant: '2E75B6',        // 60% — bleu primaire
  secondary: '70AD47',       // 30% — vert secondaire
  accent: 'E74C3C',          // 10% — rouge accentuation
  background: 'FFFFFF',      // blanc
  text: '333333',            // gris foncé
};

// Appliquer
slide.background = { color: colorScheme.background };
slide.addText('Titre', {
  color: colorScheme.dominant,
  fontSize: 44,
  bold: true,
});
```

### Motifs visuels répétés

```typescript
// Bande de couleur en haut de chaque slide
slide.addShape(prs.ShapeType.rectangle, {
  x: 0,
  y: 0,
  w: '100%',
  h: 0.6,
  fill: { color: colorScheme.dominant },
  line: { type: 'none' },
});

// Ajouter le numéro de slide et le titre
slide.addText('Section: Données', {
  x: 0.5,
  y: 0.15,
  w: 8.5,
  h: 0.3,
  fontSize: 12,
  color: 'FFFFFF',
  bold: true,
});
```

### Typographie cohérente

```typescript
const typography = {
  title: {
    fontSize: 44,
    bold: true,
    color: '2E75B6',
    fontFace: 'Segoe UI',
  },
  subtitle: {
    fontSize: 28,
    bold: false,
    color: '70AD47',
    fontFace: 'Segoe UI',
  },
  body: {
    fontSize: 18,
    bold: false,
    color: '333333',
    fontFace: 'Segoe UI',
    align: 'left',
  },
  caption: {
    fontSize: 12,
    bold: false,
    color: '666666',
    fontFace: 'Segoe UI',
    align: 'center',
  },
};

// Utiliser
slide.addText('Titre Principal', { ...typography.title, x: 0.5, y: 0.8, w: 9 });
slide.addText('Corps de texte', { ...typography.body, x: 0.5, y: 2, w: 9 });
```

### Layouts courants

**Title Slide**:
```typescript
const slide = prs.addSlide();
slide.background = { color: colorScheme.dominant };

slide.addText('Titre de Présentation', {
  x: 0.5,
  y: 2.5,
  w: 9,
  h: 1.5,
  fontSize: 54,
  bold: true,
  color: 'FFFFFF',
  align: 'center',
});
```

**Content Slide with Bullets**:
```typescript
const slide = prs.addSlide();
slide.addShape(prs.ShapeType.rectangle, {
  x: 0,
  y: 0,
  w: '100%',
  h: 0.7,
  fill: { color: colorScheme.dominant },
  line: { type: 'none' },
});

slide.addText('Titre de Section', {
  x: 0.5,
  y: 0.15,
  w: 8.5,
  h: 0.4,
  fontSize: 32,
  bold: true,
  color: 'FFFFFF',
});

slide.addText('Contenu bullet', {
  x: 1,
  y: 1.5,
  w: 8,
  h: 5,
  fontSize: 18,
  bullet: true,
  color: '333333',
});
```

**Two-Column Layout**:
```typescript
const slide = prs.addSlide();

// Colonne gauche
slide.addText('Avantages', {
  x: 0.5,
  y: 0.8,
  w: 4,
  h: 0.5,
  fontSize: 20,
  bold: true,
  color: '2E75B6',
});

const benefits = ['Rapide', 'Fiable', 'Économique'];
slide.addText(benefits.join('\n'), {
  x: 0.5,
  y: 1.5,
  w: 4,
  h: 5,
  fontSize: 16,
  bullet: true,
  color: '333333',
});

// Colonne droite
slide.addText('Défis', {
  x: 5.5,
  y: 0.8,
  w: 4,
  h: 0.5,
  fontSize: 20,
  bold: true,
  color: 'E74C3C',
});

const challenges = ['Complexité', 'Support', 'Maintenance'];
slide.addText(challenges.join('\n'), {
  x: 5.5,
  y: 1.5,
  w: 4,
  h: 5,
  fontSize: 16,
  bullet: true,
  color: '333333',
});
```

**Image-Focused Layout**:
```typescript
const slide = prs.addSlide();
slide.background = { color: 'FFFFFF' };

// Image pleine largeur
slide.addImage({
  path: 'hero-image.jpg',
  x: 0,
  y: 0,
  w: '100%',
  h: 5,
});

// Texte en superposition
slide.addText('Titre Overlay', {
  x: 0.5,
  y: 4,
  w: 9,
  h: 1,
  fontSize: 40,
  bold: true,
  color: 'FFFFFF',
  shadow: {
    type: 'outer',
    blur: 8,
    color: '000000',
    opacity: 0.5,
  },
});
```

## Ajout d'éléments avancés

### Tableaux

```typescript
const tableData = [
  [
    { text: 'Métrique', options: { bold: true, color: 'FFFFFF', fill: '2E75B6' } },
    { text: 'Q1', options: { bold: true, color: 'FFFFFF', fill: '2E75B6' } },
    { text: 'Q2', options: { bold: true, color: 'FFFFFF', fill: '2E75B6' } },
  ],
  [
    { text: 'Chiffre d\'affaires', options: { color: '333333' } },
    { text: '€1.2M', options: { color: '333333' } },
    { text: '€1.5M', options: { color: '333333' } },
  ],
  [
    { text: 'Croissance', options: { color: '333333' } },
    { text: '+15%', options: { color: '70AD47' } },
    { text: '+18%', options: { color: '70AD47' } },
  ],
];

slide.addTable(tableData, {
  x: 1,
  y: 1.5,
  w: 8,
  h: 4,
  border: { pt: 1, color: 'CCCCCC' },
  rowH: 0.8,
  align: 'center',
  valign: 'middle',
});
```

### Graphiques

```typescript
const chartData = [{
  name: 'Série 1',
  labels: ['Jan', 'Fév', 'Mar', 'Avr'],
  values: [10, 20, 15, 25],
}];

slide.addChart(prs.ChartType.line, chartData, {
  x: 1,
  y: 1.5,
  w: 8,
  h: 4,
  chartColors: ['2E75B6'],
  showLegend: true,
});
```

### Notes de présentation

```typescript
const slide = prs.addSlide();
slide.addText('Contenu visible', {
  x: 0.5,
  y: 0.5,
  w: 9,
  h: 1,
  fontSize: 24,
  bold: true,
});

// Notes (visibles uniquement en mode présentation)
slide.notes = {
  content: 'Point clé à développer: Expliquer le contexte du problème.',
  textBody: {
    anchor: 'top',
  },
};
```

## Anti-patterns

❌ **JAMAIS** créer des slides texte uniquement:
```typescript
// MAUVAIS:
slide.addText('Bullet 1\nBullet 2\nBullet 3\nBullet 4\nBullet 5', {
  fontSize: 16,
});
```

✅ **FAIRE** ajouter des visuels:
```typescript
// Slide avec image et peu de texte
slide.addImage({ path: 'icon.png', x: 0.5, y: 1, w: 1.5, h: 1.5 });
slide.addText('Concept clé', { x: 2.2, y: 1, w: 7.3, h: 1.5 });
```

❌ **NE PAS** mélanger les couleurs sans cohérence:
```typescript
// MAUVAIS: Trop de couleurs
slide.addText('...', { color: 'FF0000' });
slide.addText('...', { color: '00FF00' });
slide.addText('...', { color: '0000FF' });
```

✅ **FAIRE** utiliser une palette limitée:
```typescript
// BON: 3 couleurs cohérentes
slide.addText('...', { color: colorScheme.dominant });
slide.addText('...', { color: colorScheme.secondary });
slide.addText('...', { color: colorScheme.accent });
```

❌ **NE PAS** charger manuellement les modifications:
```typescript
// MAUVAIS: Édition brute du XML
// ... manipulation manuelle
```

✅ **FAIRE** utiliser python-pptx pour édition:
```python
from pptx import Presentation

prs = Presentation("template.pptx")
slide = prs.slides[0]
for shape in slide.shapes:
    if shape.has_text_frame:
        shape.text = "Nouveau texte"

prs.save("modified.pptx")
```

## Qualité d'assurance visuelle

Avant de finaliser une présentation, utiliser des sous-agents pour un relecture:

```typescript
// Workflow QA multi-agents
const qaChecklist = [
  "Vérifier la cohérence des couleurs à travers tous les slides",
  "Confirmer que tous les textes sont lisibles (taille minimale 18pt pour corps)",
  "S'assurer que chaque slide a un point clé visuel ou un graphique",
  "Vérifier l'alignement et l'espacement",
  "Relire l'orthographe et la grammaire",
];

// Lancer un sous-agent pour QA visuelle
// await subagent.review(prs, qaChecklist);
```

## Ressources

- [pptxgenjs](https://gitbucket.org/gitbucket/gitbucket/-/blob/master/doc/en/api.md)
- [python-pptx](https://python-pptx.readthedocs.io/)
- [Slide Design Best Practices](https://www.presentation-design.com/)
- [Microsoft Design Guidelines](https://www.microsoft.com/design/)
