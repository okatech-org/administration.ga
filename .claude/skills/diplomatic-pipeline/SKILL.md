---
name: diplomatic-pipeline
description: "Expert du Pipeline Affaires Diplomatiques complet de consulat.ga. S'active automatiquement pour tout travail sur le module diplomatique : ciblage d'operateurs economiques, avancement de pipeline, transition de phases, gestion des priorites diplomatiques, tableau de bord diplomatique, KPI diplomatiques, state machine du pipeline, integration IA Gemini pour la diplomatie, ou architecture globale du module. Skill orchestrateur qui reference les 3 skills specialises (diplomatic-strategic-plan, diplomatic-project, diplomatic-document-generation)."
---

# Skill : Pipeline Affaires Diplomatiques (Orchestrateur)

## Activation Automatique

Ce skill s'active quand la requete contient :
- `affaires diplomatiques`, `module diplomatique`, `pipeline diplomatique`
- `ciblage`, `cible operateur`, `decouvrir cible`, `enrichir cible`
- `avancer phase`, `transition pipeline`, `phase pipeline`
- `priorites diplomatiques`, `axe prioritaire`
- `tableau de bord diplomatique`, `dashboard diplomatie`
- `KPI diplomatique`, `indicateurs diplomatie`
- `lettre diplomatique`, `courrier officiel`
- `rapport reunion`, `compte-rendu reunion`
- `dossier operateur`, `dossier cible`

## Skills Specialises

Ce skill est l'**orchestrateur** qui coordonne 3 skills specialises :

| Skill | Perimetre | Quand l'utiliser |
|-------|-----------|-----------------|
| `diplomatic-strategic-plan` | Plans strategiques R1-R4 | Quand on travaille sur l'analyse et la strategie d'approche |
| `diplomatic-project` | Projets de cooperation | Quand on structure ou enrichit un projet |
| `diplomatic-document-generation` | Generation DOCX/PPTX/ZIP | Quand on genere ou exporte des documents |

**Regle :** Si la requete porte sur un sujet couvert par un skill specialise, lire d'abord CE skill specialise puis revenir ici pour le contexte global.

## Reference Principale

Lire IMPERATIVEMENT avant toute action :
1. `convex/_generated/ai/guidelines.md` — Regles Convex (CRITIQUE)
2. `convex/schemas/diplomaticAffairs.ts` — Schema complet
3. `convex/functions/diplomaticAffairs.ts` — Fonctions CRUD
4. `convex/ai/diplomaticAI.ts` — Actions IA Gemini

## Architecture du Module

### Tables Convex (6 + 2 nouvelles)

**Tables existantes :**
| Table | Role |
|-------|------|
| `diplomaticTargets` | Cibles identifiees (operateurs economiques) |
| `diplomaticPlans` | Plans strategiques lies a une cible |
| `diplomaticLetters` | Lettres diplomatiques (invitation, proposition, etc.) |
| `diplomaticReports` | Rapports de reunion et comptes-rendus |
| `diplomaticProjects` | Projets de cooperation structures |
| `diplomaticPriorities` | Axes prioritaires de la politique gabonaise |

**Tables a ajouter :**
| Table | Role |
|-------|------|
| `diplomaticFolders` | Dossiers virtuels (arborescence par secteur/cible) |
| `diplomaticDocuments` | Documents generes (DOCX, PPTX, PDF) avec storageId |

### Pipeline en 5 Phases

```
targeting → strategy → outreach → reporting → project
```

**Matrice de transition :**
```typescript
const transitionMatrix = {
  targeting: ["strategy"],           // Cible → Plan
  strategy: ["outreach", "targeting"], // Plan → Lettres (ou retour ciblage)
  outreach: ["reporting", "strategy"], // Lettres → Rapports (ou retour strategie)
  reporting: ["project", "outreach"],  // Rapports → Projet (ou retour contact)
  project: [],                        // Phase finale
};
```

**Regles de transition :**
- On ne peut avancer que vers les phases autorisees dans la matrice
- Le retour en arriere est possible (strategy → targeting, outreach → strategy, etc.)
- La phase `project` est terminale
- Chaque transition est loguee dans `historiqueEtapes`

### State Machine des Statuts

Chaque entite a son propre cycle de statuts :

**Cible (Target) :**
```
identifie → en_analyse → qualifie → contacte → en_negociation → partenaire → archive → rejete
```

**Plan Strategique :**
```
brouillon → en_revue → approuve → archive
```

**Lettre :**
```
brouillon → en_revue → approuvee → envoyee → reponse_recue → archive
```

**Rapport :**
```
brouillon → en_revue → valide → archive
```

**Projet :**
```
identification → formulation → en_revue → approuve → en_cours → termine → archive
```

### Actions IA (Gemini 2.5 Flash)

6 actions dans `convex/ai/diplomaticAI.ts` :

| Action | Role | Declencheur |
|--------|------|-------------|
| `discoverTargets` | Decouvrir des cibles potentielles | Bouton "Decouvrir" sur le dashboard |
| `enrichTarget` | Enrichir une cible avec des donnees publiques | Bouton "Enrichir" sur la fiche cible |
| `generateStrategy` | Generer un plan strategique (standard ou complet) | Bouton "Generer strategie" |
| `draftLetter` | Rediger un projet de lettre diplomatique | Bouton "Rediger lettre" |
| `compileReport` | Compiler un rapport depuis des notes | Bouton "Compiler rapport" |
| `structureProject` | Structurer ou enrichir un projet | Bouton "Structurer projet" |

**Pattern commun :**
```typescript
export const actionName = authAction({
  args: { orgId: v.id("orgs"), targetId: v.id("diplomaticTargets"), ... },
  handler: async (ctx, args) => {
    // 1. Recuperer les donnees necessaires
    // 2. Construire le prompt Gemini
    // 3. Appeler Gemini via generateJSON() ou generateText()
    // 4. Sauvegarder le resultat via ctx.runMutation(...)
    // 5. Retourner le resultat
  }
});
```

## Auth et Custom Functions

**CRITIQUE — Ne JAMAIS utiliser les fonctions Convex brutes.**

```typescript
// ✅ CORRECT
import { authQuery, authMutation, authAction } from "../lib/customFunctions";
import { rawInternalMutation, rawInternalQuery, rawInternalAction } from "../_generated/server";

// ❌ INTERDIT
import { query, mutation, action } from "../_generated/server";
```

**Pour les fonctions internes (hooks, schedulers) :**
```typescript
import { rawInternalMutation as internalMutation } from "../_generated/server";
```

## Priorites Diplomatiques du Gabon

Les 7 axes prioritaires qui guident TOUT le pipeline :

1. **Diversification economique** — Sortir de la dependance petroliere
2. **Industrialisation** — Transformation locale des matieres premieres (bois, manganese, fer)
3. **Emploi des jeunes** — Chaque partenariat doit creer des emplois et former
4. **Souverainete** — Le Gabon decide, le Gabon controle, le Gabon beneficie
5. **Developpement durable** — 88% de foret tropicale = actif strategique
6. **Integration CEMAC** — Renforcer le leadership regional
7. **Numerique** — Digitalisation des services (consulat.ga en est la preuve)

**Ces priorites sont stockees dans la table `diplomaticPriorities`** et chaque cible/plan/projet est evalue par rapport a elles.

## Flux de Donnees Inter-Entites

```
                    ┌─────────────────────────┐
                    │   diplomaticPriorities   │
                    │   (axes prioritaires)    │
                    └──────────┬──────────────┘
                               │ aligne
                    ┌──────────▼──────────────┐
      discoverTargets │   diplomaticTargets    │
      enrichTarget    │   (cibles operateurs)  │
                    └──────────┬──────────────┘
                               │ targetId
                    ┌──────────▼──────────────┐
      generateStrategy│   diplomaticPlans     │
                    │   (plans strategiques)  │
                    └──────────┬──────────────┘
                               │ targetId + planId
                    ┌──────────▼──────────────┐
      draftLetter     │   diplomaticLetters   │
                    │   (lettres officielles) │
                    └──────────┬──────────────┘
                               │ targetId
                    ┌──────────▼──────────────┐
      compileReport   │   diplomaticReports   │
                    │   (rapports reunion)    │
                    └──────────┬──────────────┘
                               │ targetId + reportIds
                    ┌──────────▼──────────────┐
      structureProject│   diplomaticProjects  │
                    │   (projets cooperation) │
                    └──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
      diplomaticFolders  diplomaticDocuments  [Export ZIP]
```

## Frontend — Structure des Routes

**App :** `apps/agent-web` (TanStack Router)

```
/affaires-diplomatiques
  ├── /                          → Dashboard (KPI, pipeline, carte monde)
  ├── /cibles                    → Liste des cibles (filtres, recherche)
  ├── /cibles/:id                → Fiche cible detaillee
  ├── /plans                     → Liste des plans strategiques
  ├── /plans/:id                 → Plan strategique detaille
  ├── /lettres                   → Liste des lettres
  ├── /lettres/:id               → Lettre detaillee
  ├── /rapports                  → Liste des rapports
  ├── /rapports/:id              → Rapport detaille
  ├── /projets                   → Liste des projets
  ├── /projets/:id               → Projet detaille
  ├── /dossiers                  → Explorateur de dossiers
  ├── /dossiers/:secteur/:cible  → Dossier d'un operateur
  └── /priorites                 → Gestion des axes prioritaires
```

**Composants communs :**
- `PipelineStepper.tsx` — Barre de progression des 5 phases
- `TargetPipelineCard.tsx` — Carte cible avec phase actuelle
- `AIActionPanel.tsx` — Panneau d'actions IA (boutons Gemini)
- `FolderExplorer.tsx` — Navigation dans les dossiers
- `ExportZipButton.tsx` — Export ZIP du dossier complet

## Design Charter

Suivre STRICTEMENT la charte `DESIGN_CHARTER.md` :

- **Palette achromatique** : 6 gris + 4 accents (bleu, vert, amber, rose)
- **Couleurs Gabon** (vert/jaune/bleu) = decoratif UNIQUEMENT (bandeau, tints)
- **JAMAIS** de couleurs Tailwind brutes (`blue-500`, `green-100`)
- **JAMAIS** de gradient colore pour les fonds de section
- **Ombres achromatiques** exclusivement
- **Icones** : `lucide-react` uniquement
- **Neumorphic Soft UI** : classes `.neu-*`

## Conventions de Code

### Nommage
- Tables : `camelCase` (ex: `diplomaticTargets`)
- Fonctions : `camelCase` (ex: `createTarget`, `advancePhase`)
- Validators : `camelCaseValidator` (ex: `strategicAnalysisValidator`)
- Composants : `PascalCase` (ex: `TargetPipelineCard`)
- Fichiers fonctions : `camelCase.ts` (ex: `diplomaticAffairs.ts`)
- Fichiers composants : `PascalCase.tsx` (ex: `AIActionPanel.tsx`)

### Schema
- TOUJOURS : `createdAt`, `updatedAt` (timestamps `v.number()`)
- TOUJOURS : `createdBy: v.id("users")`
- TOUJOURS : `orgId: v.id("orgs")`
- TOUJOURS : `statut` comme `v.union(v.literal(...), ...)`
- TOUJOURS : `historiqueEtapes` pour les workflows
- TOUJOURS : `deletedAt: v.optional(v.number())` pour le soft delete
- TOUJOURS : filtrer avec `.filter(q => q.eq(q.field("deletedAt"), undefined))`

### Mutations
- TOUJOURS ajouter `updatedAt: Date.now()` dans les updates
- TOUJOURS loguer dans `historiqueEtapes` les changements de statut
- TOUJOURS verifier les transitions autorisees avant un changement de phase
- TOUJOURS utiliser `ctx.scheduler.runAfter(0, ...)` pour les effets de bord (hooks)

## Rappels Critiques

1. **Convex guidelines** — Lire `convex/_generated/ai/guidelines.md` AVANT tout code
2. **customFunctions** — JAMAIS les fonctions brutes Convex
3. **Gemini 2.5 Flash** — Seul modele IA autorise
4. **Schema-first** — Le schema est le contrat
5. **Soft delete** — Jamais de suppression physique
6. **Mobile-first** — 3G, Android, 5-6 pouces
7. **Francais gabonais** — Langage clair et accessible
8. **Souverainete du code** — Le code appartient au Gabon
