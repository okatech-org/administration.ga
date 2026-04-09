---
name: diplomatic-project
description: "Expert en structuration de Projets de Cooperation diplomatique avec cadre logique, budget, calendrier, cadre juridique et suivi-evaluation. S'active automatiquement pour tout projet de cooperation, cadre logique, budget previsionnel, calendrier projet, montage juridique, convention de partenariat, suivi-evaluation, enrichissement projet, ou retours terrain. Couvre le cycle complet : pre-structuration depuis le plan strategique, enrichissement iteratif via les rapports de reunion, et finalisation du projet."
---

# Skill : Projet de Cooperation Diplomatique

## Activation Automatique

Ce skill s'active quand la requete contient :
- `projet de cooperation`, `structurer un projet`, `cadre logique`
- `budget previsionnel`, `calendrier projet`, `plan de financement`
- `cadre juridique`, `convention`, `accord de partenariat`
- `suivi-evaluation`, `indicateurs`, `KPI projet`
- `enrichir le projet`, `retours terrain`, `rapport de reunion`
- `montage projet`, `faisabilite`, `impact projet`
- `risques projet`, `mitigation`, `matrice des risques`
- `pre-structuration`, `projet depuis plan`

## Reference Principale

Lire IMPERATIVEMENT avant toute action :
1. `PROMPT_PLAN_STRATEGIQUE_ET_PROJET.md` — Partie 2 (Projet de Cooperation)
2. `convex/schemas/diplomaticAffairs.ts` — `diplomaticProjectsTable` et validators
3. `convex/ai/diplomaticAI.ts` — Action `structureProject`

## Cycle de Vie du Projet

```
Plan Strategique (R4 scenarios) 
    ↓ PRE-STRUCTURATION AUTOMATIQUE
Projet v1 (squelette)
    ↓ Contact (Lettres) + Reunions
Rapport de Reunion → enrichit le projet
    ↓ ENRICHISSEMENT ITERATIF
Projet v2 (enrichi des retours terrain)
    ↓ Validation interne
Projet FINAL (document complet)
```

### Phase 1 : Pre-structuration

Quand un Plan Strategique est valide (statut `approuve`), le systeme cree automatiquement un Projet v1 en extrayant :
- Le scenario `realiste` du cadre de partenariat → objectifs et budget initial
- Les benefices mutuels → resultats attendus
- Les risques identifies → matrice des risques initiale
- La chronologie d'approche → calendrier indicatif

### Phase 2 : Enrichissement Iteratif

Chaque Rapport de Reunion peut enrichir le projet via l'action `structureProject` qui accepte :
- `compteRenduReunions` — Textes des comptes-rendus de reunion
- `retoursTerrain` — Observations et retours d'experience

L'IA fusionne ces retours avec le projet existant pour produire une version enrichie.

### Phase 3 : Finalisation

Le projet passe en statut `en_revue` puis `approuve` apres validation par le diplomate responsable.

## Schema du Projet — projectFrameworkValidator

**Fichier :** `convex/schemas/diplomaticAffairs.ts`

Le projet enrichi utilise le validator `projectFrameworkValidator` avec ces composantes :

### Cadre Logique

Structure hierarchique standard :
```
Objectif global
  ├── Objectif specifique 1
  │     ├── Resultat 1.1 (indicateur + source de verification)
  │     └── Resultat 1.2
  └── Objectif specifique 2
        ├── Resultat 2.1
        └── Resultat 2.2
```

Chaque niveau contient :
- `description` — Description de l'objectif/resultat
- `indicateurs` — Indicateurs mesurables
- `sourcesVerification` — Comment on mesure (enquetes, rapports, statistiques)
- `hypotheses` — Conditions necessaires pour que ca fonctionne

### Budget Detaille

Structure en categories :
- `investissement` — CAPEX (infrastructure, equipement, technologie)
- `fonctionnement` — OPEX (personnel, deplacement, logistique)
- `assistanceTechnique` — Expertise, formation, transfert de competences
- `imprevus` — Reserve de contingence (10-15% du total)

Chaque ligne budgetaire : description, montant estime, source de financement, devise (FCFA prioritaire)

**Total avec repartition par source :** Gabon / Operateur / Bailleur tiers

### Calendrier

Phases avec jalons :
- `phase` — Nom de la phase
- `dateDebut` / `dateFin` — Dates indicatives
- `jalons` — Points de controle (milestones)
- `livrables` — Documents/produits attendus
- `responsable` — Qui pilote cette phase

### Cadre Juridique

- `typeAccord` — PPP, Convention, MoU, Accord-cadre, Contrat de service
- `baseJuridique` — Textes de reference (lois, decrets, accords bilateraux)
- `clausesCles` — Clauses essentielles (transfert techno, emploi local, propriete intellectuelle)
- `mecanismeReglement` — Arbitrage, juridiction competente
- `duree` — Duree de l'accord + conditions de renouvellement

### Suivi-Evaluation

- `indicateursPerformance` — KPI par objectif avec baseline, cible et frequence de mesure
- `mecanismesSuivi` — Comites de pilotage, rapports periodiques, audits
- `evaluationsMiParcours` — Points d'evaluation prevus
- `criteresSortie` — Conditions de succes / echec

### Impact

- `impactEconomique` — Emplois crees, CA genere, exportations, PIB
- `impactSocial` — Formation, acces aux services, reduction inegalites
- `impactEnvironnemental` — Empreinte carbone, biodiversite, economie verte
- `impactInstitutionnel` — Renforcement des capacites etatiques

### Risques du Projet

Pour chaque risque :
- `categorie` — Politique, financier, technique, operationnel, juridique
- `description` — Description detaillee
- `probabilite` / `impact` — Evaluation
- `responsable` — Qui surveille
- `mesureMitigation` — Action preventive

## Action IA — structureProject

**Fichier :** `convex/ai/diplomaticAI.ts`

L'action `structureProject` a deux modes :

### Mode Initial (pre-structuration depuis le plan)
```typescript
structureProject({
  orgId, targetId, planId,
  mode: "initial"
})
```
→ Extrait les donnees du plan strategique et genere le squelette du projet.

### Mode Enrichissement (depuis rapports)
```typescript
structureProject({
  orgId, targetId, projectId,
  mode: "enrichissement",
  compteRenduReunions: ["texte CR 1", "texte CR 2"],
  retoursTerrain: ["observation 1", "observation 2"]
})
```
→ Fusionne les retours terrain avec le projet existant, met a jour les sections impactees.

**Modele IA :** Google Gemini 2.5 Flash
**Format de sortie :** JSON conforme au `projectFrameworkValidator`

## Generation de Document — Projet DOCX

Le document Word du projet doit contenir 11 sections :
1. Page de garde (titre, parties, date, reference)
2. Resume executif
3. Contexte et justification
4. Cadre logique (tableau)
5. Description detaillee des activites
6. Budget previsionnel (tableau)
7. Calendrier d'execution (diagramme simplifie)
8. Cadre juridique et institutionnel
9. Plan de suivi-evaluation
10. Analyse des risques (matrice)
11. Annexes (TdR, cartes, references)

## Priorites du Gabon (Grille d'Evaluation)

Chaque projet doit etre evalue sur son alignement avec :
1. **Diversification economique** — Score 0-5
2. **Emploi des jeunes** — Score 0-5
3. **Transfert de competences** — Score 0-5
4. **Souverainete** — Score 0-5
5. **Developpement durable** — Score 0-5

Score minimum pour validation : **15/25**

## Rappels Critiques

1. **Retrocompatibilite** — Le champ `projectFramework` est `v.optional()`, les projets existants restent valides
2. **Enrichissement non-destructif** — Chaque enrichissement preserve l'historique (field `historiqueEtapes`)
3. **FCFA** — Montants en FCFA (francs CFA), conversion EUR/USD en annexe si besoin
4. **Francais gabonais** — Langage clair et accessible, pas de jargon consultant
5. **Schema-first** — Le validator Convex est la source de verite
6. **Soft delete** — Jamais de suppression physique
7. **customFunctions** — authAction, authMutation, authQuery uniquement
