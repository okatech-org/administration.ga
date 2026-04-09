---
name: diplomatic-document-generation
description: "Expert en generation de documents diplomatiques professionnels (DOCX, PPTX, PDF) pour le pipeline Affaires Diplomatiques de consulat.ga. S'active automatiquement pour toute generation de fiche cible, plan strategique en presentation, lettre diplomatique, rapport de reunion, projet de cooperation en document Word, export ZIP de dossier operateur, ou mise en forme de documents officiels gabonais. Couvre les formats DOCX (docx-js), PPTX (pptxgenjs), PDF et ZIP (jszip)."
---

# Skill : Generation de Documents Diplomatiques

## Activation Automatique

Ce skill s'active quand la requete contient :
- `generer document`, `creer document`, `export document`
- `fiche cible`, `fiche operateur`, `fiche DOCX`
- `plan PPTX`, `presentation plan strategique`, `slides plan`
- `lettre diplomatique`, `lettre DOCX`, `courrier officiel`
- `rapport DOCX`, `rapport de reunion`, `compte-rendu`
- `projet DOCX`, `document projet`, `dossier projet`
- `export ZIP`, `dossier operateur`, `arborescence documents`
- `mise en forme`, `document officiel`, `format Gabon`

## Reference Principale

Lire IMPERATIVEMENT avant toute action :
1. `PROMPT_DOSSIERS_OPERATEURS.md` — Phase 4 (Generateurs de documents)
2. `PROMPT_PLAN_STRATEGIQUE_ET_PROJET.md` — Partie 3 (Generation de documents)
3. `convex/schemas/diplomaticAffairs.ts` — Tables `diplomaticFoldersTable` et `diplomaticDocumentsTable`

## Bibliotheques Requises

```bash
npm install docx pptxgenjs jszip
```

- **docx** (`docx-js`) — Generation de fichiers Word (.docx)
- **pptxgenjs** — Generation de fichiers PowerPoint (.pptx)
- **jszip** — Compression ZIP pour export de dossiers complets

**IMPORTANT :** Ces generateurs tournent dans des actions Convex (`"use node"`) car ils necessitent Node.js.

## Arborescence des Documents

```
📁 Operateurs Economiques/
    📁 {Secteur}/
        📁 {Nom Cible}/
            📄 Fiche_Cible_{Nom}.docx
            📄 Fiche_Cible_{Nom}.pdf
            📁 Plans Strategiques/
                📄 Plan_{Categorie}_{Nom}_{Annee}.pptx
                📄 Plan_{Categorie}_{Nom}_{Annee}.pdf
            📁 Lettres/
                📄 {Reference}_{Type}.docx
                📄 {Reference}_{Type}.pdf
            📁 Rapports/
                📄 Rapport_{Type}_{Periode}.docx
                📄 Rapport_{Type}_{Periode}.pdf
            📁 Projets/
                📄 Projet_{Reference}_{Titre}.docx
                📄 Projet_{Reference}_{Titre}.pdf
```

## Types de Documents

### 1. Fiche Cible (DOCX)

Document auto-genere a la creation d'une cible. Contient :

- **En-tete** — Bandeau tricolore gabonais (vert/jaune/bleu), logo Republique
- **Identite** — Nom, pays, secteur, type (entreprise/institution/ONG/gouvernement)
- **Description** — Description enrichie par l'IA
- **Chiffres cles** — Tableau (CA, effectifs, annee creation, siege)
- **Presence Afrique** — Carte textuelle des pays d'operation
- **Score de pertinence** — Barre visuelle du score IA
- **Tags** — Liste des tags associes
- **Statut pipeline** — Phase actuelle avec date

**Convention de nommage :** `Fiche_Cible_{NomSansEspaces}.docx`

### 2. Plan Strategique (PPTX — 13 slides)

Presentation PowerPoint structuree :

| Slide | Contenu |
|-------|---------|
| 1 | Page de garde (titre, date, drapeaux) |
| 2 | Resume executif (texte + score alignement) |
| 3 | Diagnostic sectoriel (R1) |
| 4 | Points aveugles (R2) |
| 5 | Profil operateur (R3 — logo, chiffres, realisations) |
| 6 | Besoins du Gabon (tableau priorites) |
| 7 | Offre operateur (instruments financiers) |
| 8 | 3 Scenarios de partenariat (colonnes comparatives) |
| 9 | Strategie d'approche (timeline) |
| 10 | Preparation reunion (agenda) |
| 11 | Matrice des risques (tableau colore) |
| 12 | Prochaines etapes (roadmap) |
| 13 | Contacts et annexes |

**Charte graphique des slides :**
- Fond : blanc (#FFFFFF)
- Titres : bleu marine (#1B3A5C) — Poppins 600
- Corps : gris fonce (#374151) — Inter 400
- Accent 1 : vert Gabon (#009E60) pour les succes
- Accent 2 : jaune Gabon (#FCD116) pour les warnings
- Accent 3 : bleu Gabon (#3A75C4) pour les liens
- Bandeau bas de page : tricolore Gabon (3px)

**Convention de nommage :** `Plan_{Categorie}_{NomCible}_{Annee}.pptx`

### 3. Lettre Diplomatique (DOCX)

Document formel avec :

- **En-tete officiel** — Republique Gabonaise, Ministere, Ambassade/Consulat
- **Reference** — Numero de reference automatique (ex: `MAE/DC/2026/0042`)
- **Destinataire** — Nom, titre, organisation, adresse
- **Objet** — En gras
- **Corps** — Formules protocolaires adaptees au type de lettre
- **Signature** — Bloc signature avec titre, nom, cachet
- **PJ** — Liste des pieces jointes

**Types de lettres :**
- `invitation` — Invitation a une reunion/evenement
- `proposition` — Proposition de partenariat
- `remerciement` — Remerciement post-reunion
- `relance` — Relance apres non-reponse
- `accord` — Confirmation d'accord de principe

**Convention de nommage :** `{Reference}_{Type}.docx`

### 4. Rapport de Reunion (DOCX)

- **En-tete** — Date, lieu, participants (noms + titres)
- **Ordre du jour** — Points abordes
- **Resume des echanges** — Par point d'agenda
- **Decisions prises** — Liste numerotee
- **Actions a mener** — Tableau (action, responsable, delai)
- **Points en suspens** — Questions non resolues
- **Prochaine reunion** — Date et lieu prevus

**Convention de nommage :** `Rapport_{Type}_{Periode}.docx`

### 5. Projet de Cooperation (DOCX — 11 sections)

Document complet (voir skill `diplomatic-project`) :

1. Page de garde
2. Resume executif
3. Contexte et justification
4. Cadre logique (tableau)
5. Description detaillee des activites
6. Budget previsionnel (tableau)
7. Calendrier d'execution
8. Cadre juridique et institutionnel
9. Plan de suivi-evaluation
10. Analyse des risques (matrice)
11. Annexes

**Convention de nommage :** `Projet_{Reference}_{TitreCourt}.docx`

### 6. Export ZIP (Dossier Complet)

Bouton **"Exporter le dossier"** qui :
1. Recupere tous les documents generes pour une cible
2. Les organise dans l'arborescence secteur/cible/sous-dossiers
3. Genere un ZIP telechargeables

**Action Convex :** `generateFolderExport` dans `convex/functions/diplomaticFolders.ts`

## Hooks de Generation Automatique

Les documents sont generes automatiquement via des hooks sur les mutations existantes :

| Evenement | Document genere | Hook dans |
|-----------|----------------|-----------|
| Cible creee | Fiche_Cible.docx | `createTarget` → `ctx.scheduler.runAfter(0, ...)` |
| Plan approuve | Plan_PPTX.pptx | `advancePhase` (strategy) → `ctx.scheduler.runAfter(0, ...)` |
| Lettre validee | Lettre.docx | `updateLetterStatus` (envoyee) → `ctx.scheduler.runAfter(0, ...)` |
| Rapport valide | Rapport.docx | `updateReportStatus` (valide) → `ctx.scheduler.runAfter(0, ...)` |
| Projet approuve | Projet.docx | `updateProjectStatus` (approuve) → `ctx.scheduler.runAfter(0, ...)` |

**Pattern :** `ctx.scheduler.runAfter(0, internal.functions.diplomaticFolders.generateXxx, { ... })`

## Mise en Forme — Regles Gabonaises

### Bandeau Tricolore
- Position : haut de page ou bas de page
- 3 bandes horizontales : vert (#009E60) / jaune (#FCD116) / bleu (#3A75C4)
- Epaisseur : 3px chacune

### Entete Officiel
```
REPUBLIQUE GABONAISE
Union - Travail - Justice
---
MINISTERE DES AFFAIRES ETRANGERES
{Direction/Service}
```

### Polices
- Titres : Poppins Semi-Bold (ou Georgia si non disponible)
- Corps : Inter Regular (ou Calibri si non disponible)
- Taille corps : 11pt minimum
- Interligne : 1.15

### Tableaux
- En-tete : fond bleu marine (#1B3A5C), texte blanc
- Lignes alternees : blanc / gris clair (#F3F4F6)
- Bordures : gris moyen (#D1D5DB), 0.5pt

### Numerotation
- Pages : "Page X sur Y" en bas a droite
- Sections : numerotation decimale (1., 1.1., 1.1.1.)

## Fichiers Concernes

### Nouveau fichier a creer
- `convex/functions/diplomaticFolders.ts` — Gestion des dossiers et generation de documents

### Fichiers a modifier
- `convex/schemas/diplomaticAffairs.ts` — Ajouter `diplomaticFoldersTable` + `diplomaticDocumentsTable`
- `convex/schema.ts` — Enregistrer les 2 nouvelles tables
- `convex/functions/diplomaticAffairs.ts` — Ajouter les hooks `ctx.scheduler.runAfter(0, ...)`

### Frontend
- `FolderExplorer.tsx` — Navigation dans l'arborescence virtuelle
- `FichePreview.tsx` — Apercu de la fiche cible
- `ExportZipButton.tsx` — Bouton d'export ZIP
- `SectorGrid.tsx` — Grille des secteurs avec compteur de cibles

## Rappels Critiques

1. **`"use node"`** — Les generateurs de documents DOIVENT etre dans des actions `"use node"` car docx/pptxgenjs necessitent Node.js
2. **Stockage Convex** — Les fichiers generes sont stockes via `ctx.storage.store()` et references par `storageId` dans la table `diplomaticDocuments`
3. **Taille des fichiers** — Les PPTX et DOCX complexes peuvent peser 1-5 MB. Optimiser les images
4. **PDF** — Pour la conversion DOCX→PDF, utiliser une action externe ou un service tiers (pas de conversion native fiable en Node.js)
5. **Encoding** — Toujours UTF-8, accents francais correctement geres
6. **rawInternalMutation** / **rawInternalQuery** / **rawInternalAction** — Pour les fonctions internes (hooks), utiliser les imports bruts de `../_generated/server`
