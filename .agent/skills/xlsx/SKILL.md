# XLSX — Expert en spreadsheets Excel

**name:** xlsx
**description:** Expert en spreadsheets Excel — création, édition, analyse de fichiers .xlsx, .xlsm, .csv, .tsv avec formules, formatage et visualisation. S'active pour: Excel, .xlsx, spreadsheet, sheet, tableau, données, formule.

## Vue d'ensemble

Excel est l'outil standard pour l'analyse de données et la modélisation financière. Cette skill couvre la création robuste de fichiers Excel avec formules, formatage professionnel et visualisations avec pandas et openpyxl.

## Installation

```bash
# Manipulation de fichiers Excel
pip install openpyxl      # Édition avec formules et formatage
pip install pandas        # Analyse et transformations
pip install xlsxwriter    # Alternative pour création

# Calcul des formules (recalcul)
pip install pycel         # Alternative pour calculs complexes

# Pour conversion PDF
pip install unoconv       # LibreOffice wrapper
```

## Création de spreadsheets

### Template de base avec pandas + openpyxl

```python
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils.dataframe import dataframe_to_rows

# Créer un classeur
wb = Workbook()
ws = wb.active
ws.title = "Rapport"

# Ajouter des données
ws['A1'] = "Titre du Rapport"
ws['A1'].font = Font(size=14, bold=True)

# Tableau de données
df = pd.DataFrame({
    'Mois': ['Jan', 'Fév', 'Mar'],
    'Chiffre Affaires': [100000, 120000, 115000],
    'Coûts': [60000, 72000, 69000],
    'Profit': [40000, 48000, 46000],
})

# Insérer le DataFrame
for r_idx, row in enumerate(dataframe_to_rows(df, index=False, header=True), 3):
    for c_idx, value in enumerate(row, 1):
        ws.cell(row=r_idx, column=c_idx, value=value)

# Sauvegarder
wb.save("rapport.xlsx")
```

### Formatage professionnel

```python
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
from openpyxl import Workbook

wb = Workbook()
ws = wb.active

# En-têtes avec couleur
header_fill = PatternFill(start_color="2E75B6", end_color="2E75B6", fill_type="solid")
header_font = Font(color="FFFFFF", bold=True, size=12)

for col, header in enumerate(['Métrique', 'Q1', 'Q2', 'Q3'], 1):
    cell = ws.cell(row=1, column=col)
    cell.value = header
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal='center', vertical='center')

# Données avec formatage spécifique
data = [
    ['Chiffre Affaires', 100000, 120000, 115000],
    ['Coûts', 60000, 72000, 69000],
    ['Profit Brut', 40000, 48000, 46000],
]

for row_idx, row_data in enumerate(data, 2):
    for col_idx, value in enumerate(row_data, 1):
        cell = ws.cell(row=row_idx, column=col_idx)
        cell.value = value

        if col_idx == 1:
            # Première colonne: texte gras
            cell.font = Font(bold=True)
        else:
            # Colonnes numériques: formatage monétaire
            cell.number_format = '#,##0'

# Bordures
thin_border = Border(
    left=Side(style='thin'),
    right=Side(style='thin'),
    top=Side(style='thin'),
    bottom=Side(style='thin'),
)

for row in ws.iter_rows(min_row=1, max_row=len(data)+1, min_col=1, max_col=4):
    for cell in row:
        cell.border = thin_border
        if cell.row > 1:
            cell.alignment = Alignment(horizontal='right')

wb.save("formatted.xlsx")
```

## Formules Excel

### TOUJOURS utiliser des formules, JAMAIS des valeurs hardcodées

```python
from openpyxl import Workbook
from openpyxl.utils import get_column_letter

wb = Workbook()
ws = wb.active

# Données d'entrée (marquées en bleu)
ws['A1'] = "Données"
ws['A1'].font = Font(color="FFFFFF", bold=True)
ws['A1'].fill = PatternFill(start_color="0066CC", end_color="0066CC", fill_type="solid")

ws['A2'] = "Prix unitaire"
ws['B2'] = 150  # Entrée — formatée en bleu

ws['A3'] = "Quantité"
ws['B3'] = 10   # Entrée — formatée en bleu

ws['A4'] = "TVA (%)"
ws['B4'] = 20   # Entrée — formatée en bleu

# Formatage des entrées
for row in [2, 3, 4]:
    ws[f'B{row}'].fill = PatternFill(start_color="CCCCFF", end_color="CCCCFF", fill_type="solid")
    ws[f'B{row}'].font = Font(color="0066CC", bold=True)

# Formules (marquées en noir)
ws['A6'] = "Montant HT"
ws['B6'] = "=B2*B3"  # Formule

ws['A7'] = "TVA"
ws['B7'] = "=B6*B4/100"  # Formule

ws['A8'] = "Montant TTC"
ws['B8'] = "=B6+B7"  # Formule

# Formatage des formules
for row in [6, 7, 8]:
    ws[f'B{row}'].font = Font(color="000000", bold=True)
    ws[f'B{row}'].number_format = '#,##0.00'

# Lien externe (marqué en rouge)
ws['A10'] = "Taux de change"
ws['B10'] = "='[C:\\prix\\rates.xlsx]Taux'!$B$1"  # Lien externe

ws[f'B10'].font = Font(color="FF0000", bold=True)

wb.save("modele_financier.xlsx")
```

### Plages nommées et liens internes

```python
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation

wb = Workbook()
ws = wb.active

# Définir une plage nommée
ws['A1'] = "Catégories"
ws['A2'] = "Produit A"
ws['A3'] = "Produit B"
ws['A4'] = "Produit C"

# Nommer la plage
wb.named_ranges['Categories'] = "'Sheet'!$A$2:$A$4"

# Utiliser la plage nommée dans une formule
ws['C1'] = "Sélection"
ws['C2'] = "=VLOOKUP(C3, Categories, 1, FALSE)"  # Référence à la plage nommée

# Validation des données (liste déroulante)
dv = DataValidation(type="list", formula1="Categories", allow_blank=False)
ws.add_data_validation(dv)
dv.add(ws['C3'])

wb.save("named_ranges.xlsx")
```

## Formatage financier avancé

### Code couleurs pour modèles financiers

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill

wb = Workbook()
ws = wb.active

# Couleur 1: BLEU = Entrées (inputs utilisateur)
blue_fill = PatternFill(start_color="CCCCFF", end_color="CCCCFF", fill_type="solid")
blue_font = Font(color="0066CC", bold=True)

ws['B2'] = 100  # Entrée
ws['B2'].fill = blue_fill
ws['B2'].font = blue_font

# Couleur 2: NOIR = Formules internes
black_font = Font(color="000000", bold=True)

ws['B4'] = "=B2*1.5"
ws['B4'].font = black_font

# Couleur 3: VERT = Liens internes (autres feuilles)
green_font = Font(color="00B050", bold=True)

ws['B6'] = "=OtherSheet!B10"
ws['B6'].font = green_font

# Couleur 4: ROUGE = Liens externes (fichiers externes)
red_font = Font(color="FF0000", bold=True)

ws['B8'] = "='[C:\\external.xlsx]Sheet'!$A$1"
ws['B8'].font = red_font

# Couleur 5: JAUNE = Hypothèses clés
yellow_fill = PatternFill(start_color="FFFF99", end_color="FFFF99", fill_type="solid")

ws['A10'] = "Hypothèse clé"
ws['B10'] = 0.08  # Taux d'inflation
ws['B10'].fill = yellow_fill
ws['B10'].font = Font(bold=True)

wb.save("color_coded_model.xlsx")
```

### Formatage des nombres

```python
from openpyxl import Workbook
from openpyxl.styles import numbers

wb = Workbook()
ws = wb.active

# Années comme texte (jamais comme nombres)
ws['A1'] = "Année"
ws['B1'] = "2024"
ws['B1'].number_format = '@'  # Texte
ws['B2'] = "2025"
ws['B2'].number_format = '@'  # Texte

# Devises avec séparateurs
ws['A3'] = "Montant EUR"
ws['B3'] = 1234567.89
ws['B3'].number_format = '#,##0.00 [€]'  # 1,234,567.89 €

ws['A4'] = "Montant USD"
ws['B4'] = 1234567.89
ws['B4'].number_format = '$#,##0.00'  # $1,234,567.89

# Pourcentages
ws['A5'] = "Taux"
ws['B5'] = 0.125
ws['B5'].number_format = '0.0%'  # 12.5%

# Négatifs avec parenthèses
ws['A6'] = "Perte"
ws['B6'] = -50000
ws['B6'].number_format = '#,##0;(#,##0)'  # (50,000)

wb.save("number_formatting.xlsx")
```

## Lecture et analyse

### Avec pandas

```python
import pandas as pd

# Lire un fichier Excel
df = pd.read_excel("data.xlsx", sheet_name="Ventes")

# Vérifier les données
print(df.head())
print(df.info())
print(df.describe())

# Filtrer
produit_a = df[df['Produit'] == 'A']

# Grouper et agréger
par_mois = df.groupby('Mois')['Chiffre Affaires'].sum()
print(par_mois)

# Exporter en CSV
df.to_csv("export.csv", index=False)
```

### Extraction de plusieurs feuilles

```python
import pandas as pd

# Charger toutes les feuilles
excel_file = pd.ExcelFile("multi_sheet.xlsx")
print(excel_file.sheet_names)

# Charger des feuilles spécifiques
df_ventes = pd.read_excel("multi_sheet.xlsx", sheet_name="Ventes")
df_couts = pd.read_excel("multi_sheet.xlsx", sheet_name="Coûts")

# Fusionner les données
result = df_ventes.merge(df_couts, on="Mois", how="inner")
print(result)
```

## Graphiques

### Créer des graphiques

```python
from openpyxl import Workbook
from openpyxl.chart import LineChart, Reference, BarChart

wb = Workbook()
ws = wb.active

# Données
ws['A1'] = "Mois"
ws['B1'] = "Ventes"
ws['C1'] = "Coûts"

for row, (month, sales, costs) in enumerate([
    ("Jan", 100, 60),
    ("Fév", 120, 72),
    ("Mar", 115, 69),
], 2):
    ws[f'A{row}'] = month
    ws[f'B{row}'] = sales
    ws[f'C{row}'] = costs

# Graphique en ligne
chart = LineChart()
chart.title = "Ventes vs Coûts"
chart.style = 10
chart.y_axis.title = 'Montant'
chart.x_axis.title = 'Mois'

data = Reference(ws, min_col=2, min_row=1, max_row=4, max_col=3)
categories = Reference(ws, min_col=1, min_row=2, max_row=4)

chart.add_data(data, titles_from_data=True)
chart.set_categories(categories)

ws.add_chart(chart, "A6")

wb.save("chart.xlsx")
```

## Gestion des onglets

### Créer plusieurs feuilles

```python
from openpyxl import Workbook

wb = Workbook()

# Renommer la feuille par défaut
ws1 = wb.active
ws1.title = "Résumé"

# Ajouter des feuilles
ws2 = wb.create_sheet("Détails")
ws3 = wb.create_sheet("Analyse")

# Lier les feuilles
ws1['A1'] = "=Détails!A1"  # Référence à la feuille "Détails"

# Ordonner les feuilles
wb._sheets.sort(key=lambda x: x.title)

wb.save("multi_sheet.xlsx")
```

## Validation des données

### Listes déroulantes et validations

```python
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation

wb = Workbook()
ws = wb.active

# Validation: liste déroulante
dv_product = DataValidation(type="list", formula1='"Produit A,Produit B,Produit C"', allow_blank=False)
ws.add_data_validation(dv_product)
dv_product.add('B2:B10')

# Validation: plage de nombres
dv_quantity = DataValidation(type="whole", operator="greaterThan", formula1="0", allow_blank=False)
ws.add_data_validation(dv_quantity)
dv_quantity.add('C2:C10')

# Validation: format de date
from datetime import datetime
dv_date = DataValidation(type="date", operator="greaterThan", formula1=str(datetime.now()), allow_blank=False)
ws.add_data_validation(dv_date)
dv_date.add('D2:D10')

ws['A1'] = "Produit"
ws['B1'] = "Sélectionnez"
ws['C1'] = "Quantité"
ws['D1'] = "Date"

wb.save("validated.xlsx")
```

## Formatage conditionnel

```python
from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import PatternFill

wb = Workbook()
ws = wb.active

# Ajouter des données
ws['A1'] = "Ventes"
for i, value in enumerate([50, 150, 30, 200, 80], 2):
    ws[f'A{i}'] = value

# Formatage conditionnel: mettre en rouge si < 100
red_fill = PatternFill(start_color="FF0000", end_color="FF0000", fill_type="solid")
rule_bad = CellIsRule(operator='lessThan', formula=['100'], fill=red_fill)
ws.conditional_formatting.add('A2:A6', rule_bad)

# Formatage conditionnel: mettre en vert si >= 150
green_fill = PatternFill(start_color="00B050", end_color="00B050", fill_type="solid")
rule_good = CellIsRule(operator='greaterThanOrEqual', formula=['150'], fill=green_fill)
ws.conditional_formatting.add('A2:A6', rule_good)

wb.save("conditional.xlsx")
```

## Anti-patterns

❌ **NE PAS** hardcoder les valeurs dans les formules:
```python
ws['B1'] = 100 * 1.5  # MAUVAIS — valeur figée
```

✅ **FAIRE** utiliser des formules:
```python
ws['B1'] = "=A1*1.5"  # BON — dynamique
```

❌ **NE PAS** mélanger les formatages numériques:
```python
ws['B1'].number_format = '@'  # Texte
ws['B2'].number_format = '0.00'  # Décimal
```

✅ **FAIRE** harmoniser:
```python
for row in range(1, 10):
    ws[f'B{row}'].number_format = '#,##0.00'  # Cohérent
```

❌ **NE PAS** utiliser des valeurs hardcodées pour les taux:
```python
ws['B1'] = df['sales'] * 0.08  # Taux figé — MAUVAIS
```

✅ **FAIRE** définir des hypothèses modifiables:
```python
ws['B1'] = "Hypothèses"
ws['B2'] = 0.08  # Cellule nommée "TauxTVA"
ws['C1'] = "=Sales*TauxTVA"  # Référence à l'hypothèse
```

## Conversion en PDF

```bash
# Avec LibreOffice
libreoffice --headless --convert-to pdf:calc_pdf_Export input.xlsx --outdir ./

# Ou avec unoconv
unoconv -f pdf input.xlsx
```

## Ressources

- [openpyxl Documentation](https://openpyxl.readthedocs.io/)
- [pandas Documentation](https://pandas.pydata.org/)
- [Excel Best Practices](https://www.excel.com/best-practices)
