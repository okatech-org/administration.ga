# PDF — Expert en traitement PDF

**name:** pdf
**description:** Expert en traitement PDF — extraction texte/tables, création, fusion, split, formulaires, OCR. S'active pour: .pdf, PDF, rapport, document, extraction, fusion, OCR.

## Vue d'ensemble

Le format PDF est omniprésent pour les documents, rapports et formulaires. Cette skill couvre l'extraction de données, la création, la manipulation et l'OCR de fichiers PDF en utilisant les outils Python les plus efficaces.

## Installation

```bash
# Extraction et manipulation
pip install pypdf pdfplumber

# Création de PDF
pip install reportlab

# OCR pour PDFs scannés
pip install pytesseract pdf2image

# CLI pour opérations simples
pip install qpdf  # ou: apt-get install qpdf (Debian/Ubuntu)

# Utilities
pip install PyPDF2  # alternative à pypdf
```

## Lecture et extraction de texte

### Avec pdfplumber (recommandé)

`pdfplumber` est le meilleur choix pour l'extraction de texte et de tables:

```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    # Itérer sur toutes les pages
    for page_num, page in enumerate(pdf.pages):
        print(f"Page {page_num + 1}")
        text = page.extract_text()
        print(text)
```

### Extraction avec métadonnées

```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    # Métadonnées globales
    metadata = pdf.metadata
    print(f"Titre: {metadata.get('Title', 'N/A')}")
    print(f"Auteur: {metadata.get('Author', 'N/A')}")
    print(f"Nombre de pages: {len(pdf.pages)}")

    # Texte structuré avec numéros de ligne
    for page in pdf.pages:
        text = page.extract_text()
        lines = text.split("\n")
        for line_num, line in enumerate(lines, 1):
            print(f"L{line_num}: {line}")
```

### Extraction de tables

```python
import pdfplumber
import pandas as pd

with pdfplumber.open("document.pdf") as pdf:
    page = pdf.pages[0]

    # Détecter et extraire les tables
    tables = page.extract_tables()

    for table_idx, table in enumerate(tables):
        df = pd.DataFrame(table[1:], columns=table[0])
        print(f"Table {table_idx + 1}:")
        print(df)

        # Exporter en CSV
        df.to_csv(f"table_{table_idx + 1}.csv", index=False)
```

### Extraction avec structures de boîtes

```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    page = pdf.pages[0]

    # Extraire le texte groupé par zones
    cropped = page.crop((50, 50, 500, 200))  # (x0, y0, x1, y1)
    text = cropped.extract_text()
    print(text)
```

## Lecture avec pypdf

Pour les métadonnées et les opérations de bas niveau:

```python
from pypdf import PdfReader

reader = PdfReader("document.pdf")
print(f"Nombre de pages: {len(reader.pages)}")

# Métadonnées
metadata = reader.metadata
print(f"Titre: {metadata.title}")
print(f"Auteur: {metadata.author}")

# Texte brut (moins fiable que pdfplumber)
for page_num, page in enumerate(reader.pages):
    text = page.extract_text()
    print(f"Page {page_num + 1}: {text[:100]}...")
```

## Création de PDF

### Avec reportlab

```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

# Simple PDF avec texte
pdf_path = "output.pdf"
c = canvas.Canvas(pdf_path, pagesize=letter)
width, height = letter

# Ajouter du texte
c.setFont("Helvetica-Bold", 24)
c.drawString(1*inch, height - 1*inch, "Titre du Rapport")

c.setFont("Helvetica", 12)
c.drawString(1*inch, height - 1.5*inch, "Contenu principal du rapport")

c.save()
```

### Avec Platypus (formatage avancé)

```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors

doc = SimpleDocTemplate("output.pdf", pagesize=letter)
story = []
styles = getSampleStyleSheet()

# Titre
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=24,
    textColor=colors.HexColor('#2E75B6'),
    spaceAfter=30,
)
story.append(Paragraph("Rapport d'Analyse", title_style))
story.append(Spacer(1, 0.3*inch))

# Tableau
data = [
    ['Métrique', 'Valeur', 'Statut'],
    ['Performance', '95%', 'Excellent'],
    ['Fiabilité', '99%', 'Excellent'],
    ['Latence', '45ms', 'Bon'],
]
table = Table(data, colWidths=[2*inch, 2*inch, 2*inch])
table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 12),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
]))
story.append(table)
story.append(Spacer(1, 0.3*inch))

# Nouveau paragraphe
story.append(Paragraph("Contenu du rapport", styles['Heading2']))
story.append(Paragraph(
    "Ceci est un paragraphe de contenu avec <b>texte gras</b> et <i>italique</i>.",
    styles['Normal']
))

# Saut de page
story.append(PageBreak())

# Contenu de page 2
story.append(Paragraph("Page 2", styles['Heading1']))

doc.build(story)
```

## Fusion de PDFs

### Avec pypdf

```python
from pypdf import PdfMerger

pdf_list = ["file1.pdf", "file2.pdf", "file3.pdf"]
merger = PdfMerger()

for pdf in pdf_list:
    merger.append(pdf)

merger.write("merged.pdf")
merger.close()
```

### Avec qpdf (CLI)

```bash
qpdf --empty --pages file1.pdf file2.pdf file3.pdf -- merged.pdf
```

## Division de PDF

### Avec pypdf

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("document.pdf")
writer = PdfWriter()

# Extraire les pages 0-5 (pages 1-6)
for page_num in range(6):
    writer.add_page(reader.pages[page_num])

with open("pages_1_to_6.pdf", "wb") as f:
    writer.write(f)
```

### Avec qpdf (CLI)

```bash
# Extraire les pages 1-6
qpdf document.pdf --pages . 1-6 -- output.pdf

# Extraire des pages spécifiques
qpdf document.pdf --pages . 1,3,5 -- output.pdf
```

## Rotation de pages

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("document.pdf")
writer = PdfWriter()

for page_num, page in enumerate(reader.pages):
    if page_num == 0:  # Rotater la première page
        page.rotate_clockwise(90)
    writer.add_page(page)

with open("rotated.pdf", "wb") as f:
    writer.write(f)
```

## Ajout de filigranes

```python
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from io import BytesIO

# Créer un filigrane
packet = BytesIO()
can = canvas.Canvas(packet, pagesize=letter)
can.setFillAlpha(0.3)
can.setFont("Helvetica", 60)
can.rotate(45)
can.drawString(200, 100, "CONFIDENTIEL")
can.save()
packet.seek(0)

# Appliquer le filigrane
from pypdf import PdfReader as PdfReaderLib
watermark = PdfReaderLib(packet)

reader = PdfReader("document.pdf")
writer = PdfWriter()

for page in reader.pages:
    page.merge_page(watermark.pages[0])
    writer.add_page(page)

with open("watermarked.pdf", "wb") as f:
    writer.write(f)
```

## Remplissage de formulaires PDF

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("form.pdf")
writer = PdfWriter()

# Lire les champs du formulaire
if reader.get_fields():
    for field_name in reader.get_fields().keys():
        print(f"Champ: {field_name}")

# Remplir les champs
writer.append_pages_from_reader(reader)
writer.update_page_form_field_values(
    writer.pages[0],
    {
        "name": "Jean Dupont",
        "email": "jean@example.com",
        "date": "2025-03-30",
    }
)

with open("form_filled.pdf", "wb") as f:
    writer.write(f)
```

## OCR pour PDFs scannés

### Avec Tesseract et pdf2image

```bash
# Installation (Debian/Ubuntu)
apt-get install tesseract-ocr

# macOS avec Homebrew
brew install tesseract
```

```python
from pdf2image import convert_from_path
import pytesseract
from PIL import Image

# Convertir PDF en images
images = convert_from_path("scanned.pdf")

# Appliquer OCR à chaque page
full_text = ""
for page_num, image in enumerate(images):
    print(f"Traitement page {page_num + 1}...")
    text = pytesseract.image_to_string(image, lang='fra')
    full_text += f"\n--- Page {page_num + 1} ---\n{text}"

# Sauvegarder le texte
with open("extracted_text.txt", "w", encoding="utf-8") as f:
    f.write(full_text)

# Créer un PDF avec OCR (PDF/A)
with open("ocr_output.pdf", "wb") as f:
    images[0].save(f, "PDF", save_all=True, append_images=images[1:])
```

### OCR direct avec pdf2image + PIL

```python
from pdf2image import convert_from_path
import pytesseract
import cv2
import numpy as np

images = convert_from_path("scanned.pdf", dpi=300)

for page_num, image in enumerate(images):
    # Pré-traitement pour améliorer OCR
    img_array = np.array(image)
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)

    # OCR sur l'image pré-traitée
    text = pytesseract.image_to_string(thresh, lang='fra')
    print(f"Page {page_num + 1}:\n{text}")
```

## Extraction de plage de pages

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("document.pdf")
writer = PdfWriter()

# Extraire pages 10-20
for page_num in range(10, 21):  # 0-indexed, donc 10-20 = 11e-21e page
    if page_num < len(reader.pages):
        writer.add_page(reader.pages[page_num])

with open("pages_11_to_21.pdf", "wb") as f:
    writer.write(f)
```

## Anti-patterns

❌ **NE PAS** utiliser pypdf pour l'extraction de texte (peu fiable):
```python
from pypdf import PdfReader
text = PdfReader("doc.pdf").pages[0].extract_text()  # MAUVAIS
```

✅ **FAIRE** utiliser pdfplumber:
```python
import pdfplumber
with pdfplumber.open("doc.pdf") as pdf:
    text = pdf.pages[0].extract_text()  # BON
```

❌ **NE PAS** oublier le context manager (fuite de mémoire):
```python
pdf = pdfplumber.open("doc.pdf")
text = pdf.pages[0].extract_text()  # MAUVAIS
```

✅ **FAIRE** utiliser with:
```python
with pdfplumber.open("doc.pdf") as pdf:
    text = pdf.pages[0].extract_text()  # BON
```

❌ **NE PAS** traiter l'OCR sans pré-traitement (résultats bruts):
```python
text = pytesseract.image_to_string(image)  # MAUVAIS
```

✅ **FAIRE** appliquer le pré-traitement:
```python
gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
_, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
text = pytesseract.image_to_string(thresh)  # BON
```

## Ressources

- [pdfplumber](https://github.com/jsvine/pdfplumber)
- [pypdf](https://github.com/py-pdf/pypdf)
- [reportlab](https://www.reportlab.com/)
- [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki)
- [qpdf](https://qpdf.sourceforge.io/)
