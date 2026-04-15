---
name: diplomatic-strategic-plan
description: "Expert en Plans Strategiques Diplomatiques selon la methodologie OkaTech Phase 0 adaptee au contexte diplomatique gabonais. S'active automatiquement pour tout plan strategique, strategie d'approche diplomatique, analyse de cible, diagnostic sectoriel, benchmark international, cadre de partenariat, preparation de reunion diplomatique, ou negociation avec un operateur economique. Couvre les 4 etapes R1-R4 : Diagnostic Sectoriel, Points Aveugles, Analyse Operateur, Cadre de Partenariat."
---

# Skill : Plan Strategique Diplomatique (OkaTech Phase 0)

## Activation Automatique

Ce skill s'active quand la requete contient :
- `plan strategique`, `strategie diplomatique`, `analyse cible`
- `diagnostic sectoriel`, `benchmark international`
- `cadre de partenariat`, `modele de financement`
- `negociation`, `argumentaire`, `points de negociation`
- `preparation reunion`, `agenda diplomatique`
- `approche operateur`, `analyse operateur`
- `COFIDES`, `operateur economique`, `cible diplomatique`
- `priorites gabonaises`, `politique economique gabon`
- `R1`, `R2`, `R3`, `R4`, `recherche strategique`

## Reference Principale

Lire IMPERATIVEMENT avant toute action :
1. `.Codex/skills/diplomatic-pipeline/PROMPT_PLAN_STRATEGIQUE_ET_PROJET.md` — Partie 1 (Plan Strategique Complet)
2. `convex/schemas/diplomaticAffairs.ts` — Tables et validators existants
3. `convex/ai/diplomaticAI.ts` — Actions IA Gemini actuelles

## Contexte du Pipeline

Le module **Affaires Diplomatiques** de consulat.ga gere un pipeline en 5 phases :

```
CIBLES → PLAN STRATEGIQUE → LETTRES (Contact) → RAPPORTS → PROJET
```

Le Plan Strategique est la **Phase 2** du pipeline. Il transforme une cible brute en un document de travail diplomatique actionnable.

## Methodologie R1-R4 Adaptee a la Diplomatie

### R1 — Diagnostic Sectoriel

Objectif : Comprendre le secteur de la cible dans le contexte gabonais.

**Donnees a produire :**
- `contexteMacro` — Analyse macro du secteur au Gabon (PIB, emploi, enjeux)
- `forcesGabon` — Atouts du Gabon pour ce secteur (ressources naturelles, position geographique, accords existants)
- `contraintesGabon` — Faiblesses (infrastructure, capital humain, bureaucratie)
- `partiesPrenantes` — Cartographie des acteurs cles (ministeres, agences, secteur prive) avec niveau d'influence
- `benchmark` — 3 a 5 references internationales (comment d'autres pays ont reussi des partenariats similaires)

**Pays de benchmark prioritaires :** Rwanda, Kenya, Maroc, Cote d'Ivoire, Senegal, Estonie, Singapour

### R2 — Points Aveugles

Objectif : Identifier ce qui pourrait faire echouer le partenariat.

**Donnees a produire :**
- `economiePolitique` — Rapports de force, monopoles, lobbies qui pourraient s'opposer
- `risquesGeopolitiques` — Tensions diplomatiques, sanctions, dependances
- `facteursSociaux` — Acceptation sociale, impact emploi, perception publique
- `contraintesTerrain` — Realites operationnelles (acces, logistique, telecommunications, electricite)

### R3 — Analyse Operateur

Objectif : Dresser le profil complet de l'operateur economique cible.

**Donnees a produire :**
- `profilComplet` — Description enrichie (historique, taille, CA, actionnariat)
- `capacitesCles` — Competences et moyens techniques/financiers
- `realisationsMarquantes` — Projets passes avec pays, montants et resultats
- `presenceAfrique` — Experience sur le continent africain (si existante)
- `alignementPriorites` — Comment l'operateur s'aligne sur les priorites gabonaises

**Sources a consulter :** Site officiel, rapports annuels, articles presse, bases de donnees OCDE/FMI, partenariats existants en Afrique

### R4 — Cadre de Partenariat

Objectif : Definir le "Business Case" du partenariat.

**Donnees a produire :**

1. **Besoins du Gabon** — Liste des besoins precis par secteur avec urgence et estimation budgetaire
2. **Offre de l'operateur** — Ce que l'operateur peut apporter (type d'instrument : PPP, IDE, AT, pret, etc.)
3. **Benefices mutuels** — Valeur ajoutee pour les deux parties
4. **Modeles de financement** — Mecanismes financiers possibles (PPP, credit export, fonds dev, etc.)
5. **3 Scenarios de partenariat** :
   - `ambitieux` — Partenariat maximal, investissement eleve, impact structurant
   - `realiste` — Partenariat cible, investissement modere, resultats tangibles a 2-3 ans
   - `minimal` — Projet pilote, faible investissement, test de faisabilite

### Strategie d'Approche Diplomatique

Au-dela du R4, le plan inclut :

- `argumentaire` — Points cles pour convaincre l'operateur
- `negotiationPoints` — Points de negociation (ce que le Gabon demande)
- `concessions` — Ce que le Gabon peut offrir en retour
- `lignesRouges` — Limites non-negociables (souverainete, emploi local, transfert technologique)
- `chronologieApproche` — Timeline d'engagement (etapes, actions, responsables, delais)

### Preparation Reunion

- `agenda` — Points a l'ordre du jour avec duree et objectif par point
- `dossiersAFournir` — Documents a preparer en amont
- `questionsStrategiques` — Questions ouvertes a poser a l'operateur
- `profilsAInviter` — Qui doit etre present cote gabonais (par titre/fonction)

### Risques et Mitigations

Pour chaque risque :
- Description du risque
- Probabilite (faible/moyenne/elevee)
- Impact (faible/moyen/eleve)
- Mesure de mitigation

## Schema Convex — Validator

Le plan enrichi utilise le validator `strategicAnalysisValidator` defini dans `convex/schemas/diplomaticAffairs.ts`.

**Regle critique :** Le champ `aiGeneratedContent` existant (simple) est CONSERVE pour la retrocompatibilite. Le nouveau champ `strategicAnalysis` est AJOUTE en `v.optional()`.

## Action IA — generateStrategy

**Fichier :** `convex/ai/diplomaticAI.ts`

L'action `generateStrategy` accepte un parametre `depth`:
- `"standard"` — Produit le `aiGeneratedContent` simple (comportement actuel)
- `"complet"` — Produit le `strategicAnalysis` enrichi (nouveau comportement)

**Modele IA :** Google Gemini 2.5 Flash (via `@google/generative-ai`)
**Format de sortie :** JSON structure conforme au `strategicAnalysisValidator`

## Priorites du Gabon (Contexte Permanent)

Les plans strategiques doivent TOUJOURS s'aligner sur ces priorites :

1. **Diversification economique** — Sortir de la dependance au petrole
2. **Industrialisation** — Transformation locale des matieres premieres
3. **Emploi des jeunes** — Transfert de competences, formation, emploi local
4. **Souverainete** — Le Gabon reste maitre des decisions strategiques
5. **Developpement durable** — Preservation de la foret tropicale, economie verte
6. **Integration regionale** — Renforcement de la position dans la CEMAC
7. **Numerique** — Digitalisation des services publics et privés

## Rappels Critiques

1. **Mobile-first** — Les interfaces d'affichage du plan doivent fonctionner sur mobile 3G
2. **Francais gabonais** — Pas de jargon technique, pas de francais juridique parisien
3. **Schema-first** — Le schema Convex est le contrat. Tout en decoule
4. **Retrocompatibilite** — Ne jamais casser les plans existants
5. **Gemini 2.5 Flash** — Toujours utiliser ce modele, jamais OpenAI
6. **customFunctions** — Utiliser authAction, authQuery, authMutation (jamais les fonctions Convex brutes)
7. **Soft delete** — Champ `deletedAt` + filtre, jamais de suppression physique
