# Prompt d'implémentation — Plan Stratégique Complet & Projet de Coopération

> **Module :** Affaires Diplomatiques — Pipeline IA  
> **Cible de référence :** COFIDES S.A. (Compañía Española de Financiación del Desarrollo)  
> **Méthodologie :** OkaTech Phase 0 (Recherche Stratégique) adaptée au contexte diplomatique  
> **Prérequis :** Lire `convex/_generated/ai/guidelines.md` + `METHODOLOGIE_OKATECH.md`

---

## Vision d'ensemble

Le pipeline **Affaires Diplomatiques** est :

```
CIBLES → PLAN STRATÉGIQUE → CONTACT (Lettres) → RAPPORTS → PROJET
```

Actuellement, le `generateStrategy` dans `convex/ai/diplomaticAI.ts` produit un plan IA basique (6 champs : countryNeeds, operatorCapabilities, mutualBenefits, negotiationPoints, meetingAgenda, risks). C'est un squelette.

**L'objectif est de transformer ce squelette en un système complet** où :

1. Le **Plan Stratégique** est un vrai document de travail diplomatique structuré selon la méthodologie OkaTech (Recherche Stratégique → Architecture → Livrables)
2. Le **Projet de Coopération** est pré-structuré dès le plan, puis enrichi par les retours terrain (réunions, lettres, rapports)
3. Le tout génère des documents exportables (DOCX, PPTX, PDF) dans le dossier opérateur

---

## Partie 1 — Plan Stratégique Complet

### 1.1 Problème actuel

Le champ `aiGeneratedContent` du plan est trop superficiel :

```typescript
// ACTUEL — convex/schemas/diplomaticAffairs.ts ligne ~155
aiGeneratedContent: v.optional(v.object({
  countryNeeds: v.array(v.string()),         // Simple liste
  operatorCapabilities: v.array(v.string()), // Simple liste
  mutualBenefits: v.array(v.string()),       // Simple liste
  negotiationPoints: v.array(v.string()),    // Simple liste
  meetingAgenda: v.array(v.string()),        // Simple liste
  risks: v.array(v.string()),               // Simple liste
})),
```

### 1.2 Nouveau schema du Plan Stratégique

**Fichier : `convex/schemas/diplomaticAffairs.ts`**

Remplacer le validator `aiGeneratedContent` dans `diplomaticPlansTable` par une structure enrichie inspirée de la méthodologie OkaTech Phase 0 :

```typescript
// ─── Nouveau validator pour le contenu IA enrichi du plan ──────────────────

export const strategicAnalysisValidator = v.object({
  // R1 — Diagnostic sectoriel (OkaTech Phase 0)
  diagnosticSectoriel: v.object({
    contexteMacro: v.string(),              // Analyse macro du secteur de la cible
    forcesGabon: v.array(v.string()),       // Atouts du Gabon dans ce secteur
    contraintesGabon: v.array(v.string()),  // Faiblesses/contraintes
    partiesPrenantes: v.array(v.object({    // Cartographie des acteurs
      nom: v.string(),
      role: v.string(),
      influence: v.union(v.literal("forte"), v.literal("moyenne"), v.literal("faible")),
    })),
    benchmark: v.array(v.object({           // Références internationales
      pays: v.string(),
      description: v.string(),
      leconsApprises: v.string(),
    })),
  }),

  // R2 — Points aveugles
  pointsAveugles: v.object({
    economiePolitique: v.string(),           // Analyse des rapports de force
    risquesGeopolitiques: v.string(),        // Risques liés au partenariat
    facteursSociaux: v.string(),             // Impact social au Gabon
    contraintesTerrain: v.array(v.string()), // Réalités opérationnelles
  }),

  // R3 — Analyse opérateur (adapté du R3 OkaTech)
  analyseOperateur: v.object({
    profilComplet: v.string(),              // Description enrichie de l'opérateur
    capacitesCles: v.array(v.string()),     // Compétences et moyens
    realisationsMarquantes: v.array(v.object({
      projet: v.string(),
      pays: v.string(),
      resultat: v.string(),
    })),
    presenceAfrique: v.optional(v.string()),  // Expérience en Afrique
    alignementPriorites: v.string(),          // Comment s'aligne sur les priorités
  }),

  // R4 — Cadre du partenariat (adapté du Business Case)
  cadrePartenariat: v.object({
    besoinsGabon: v.array(v.object({        // Besoins précis avec chiffrage
      besoin: v.string(),
      secteur: v.string(),
      urgence: v.union(v.literal("immediate"), v.literal("court_terme"), v.literal("moyen_terme")),
      estimationBudget: v.optional(v.string()),
    })),
    offreOperateur: v.array(v.object({      // Ce que l'opérateur peut apporter
      capacite: v.string(),
      instrument: v.string(),               // PPP, IDE, AT, prêt, etc.
      conditions: v.optional(v.string()),
    })),
    beneficesMutuels: v.array(v.string()),
    modelesFinancement: v.array(v.object({  // Mécanismes financiers possibles
      type: v.string(),                     // PPP, crédit export, fonds dev, etc.
      description: v.string(),
      montantEstime: v.optional(v.string()),
    })),
    scenariosPartenariat: v.array(v.object({ // 3 scénarios (OkaTech)
      scenario: v.union(v.literal("ambitieux"), v.literal("realiste"), v.literal("minimal")),
      description: v.string(),
      investissementEstime: v.optional(v.string()),
      delaiMiseEnOeuvre: v.optional(v.string()),
    })),
  }),

  // Stratégie d'approche diplomatique
  strategieApproche: v.object({
    argumentaire: v.array(v.string()),        // Points clés pour convaincre
    negotiationPoints: v.array(v.string()),   // Points de négociation
    concessions: v.array(v.string()),         // Concessions possibles du Gabon
    lignesRouges: v.array(v.string()),        // Limites non-négociables
    chronologieApproche: v.array(v.object({   // Timeline d'engagement
      etape: v.string(),
      action: v.string(),
      responsable: v.string(),
      delai: v.string(),
    })),
  }),

  // Préparation réunion
  preparationReunion: v.object({
    agenda: v.array(v.object({
      point: v.string(),
      duree: v.string(),
      objectif: v.string(),
    })),
    dossiersAFournir: v.array(v.string()),   // Documents à préparer
    questionsStrategiques: v.array(v.string()), // Questions à poser
    profilsAInviter: v.array(v.string()),    // Qui doit être présent côté gabonais
  }),

  // Risques et mitigations
  risques: v.array(v.object({
    risque: v.string(),
    probabilite: v.union(v.literal("faible"), v.literal("moyenne"), v.literal("elevee")),
    impact: v.union(v.literal("faible"), v.literal("moyen"), v.literal("eleve")),
    mitigation: v.string(),
  })),
});
```

**IMPORTANT — Rétrocompatibilité :** Le champ `aiGeneratedContent` existant reste en place. On ajoute un NOUVEAU champ `strategicAnalysis` au plan :

```typescript
// Dans diplomaticPlansTable, AJOUTER (ne pas remplacer aiGeneratedContent) :
strategicAnalysis: v.optional(strategicAnalysisValidator),
```

Cela permet aux plans existants de continuer à fonctionner. Les nouveaux plans auront les deux : le `aiGeneratedContent` simplifié (pour la vue carte/résumé) ET le `strategicAnalysis` complet.

### 1.3 Nouveau prompt Gemini pour `generateStrategy`

**Fichier : `convex/ai/diplomaticAI.ts`**

Réécrire l'action `generateStrategy` (ligne ~288) pour produire le format enrichi.

Le prompt doit s'adapter au contexte de la cible. Voici le template pour COFIDES (finance/développement) :

```typescript
export const generateStrategy = action({
  args: {
    orgId: v.id("orgs"),
    targetId: v.id("diplomaticTargets"),
    depth: v.optional(v.union(
      v.literal("standard"),    // Version actuelle (quick)
      v.literal("complet"),     // Nouvelle version enrichie
    )),
  },
  handler: async (ctx, args) => {
    const depth = args.depth ?? "complet";
    const target = await ctx.runQuery(api.functions.diplomaticAffairs.getTarget, {
      targetId: args.targetId,
    });
    if (!target) throw new Error("Cible introuvable");

    const priorities = await ctx.runQuery(api.functions.diplomaticAffairs.getPriorities, {
      orgId: args.orgId,
    });

    // Si "standard" → garder le comportement actuel (rétrocompatibilité)
    if (depth === "standard") {
      // ... code existant inchangé ...
    }

    // ═══ MODE COMPLET — Méthodologie OkaTech Phase 0 ═══

    const priorityContext = priorities
      ? priorities.priorities.map(p => `- ${p.title} (${p.sector})`).join("\n")
      : "Développement économique général";

    const knowledgeBase = priorities?.sourceDocuments?.length
      ? `\nBASE DE CONNAISSANCES:\n${priorities.sourceDocuments
          .filter(d => d.aiSummary)
          .map(d => `- ${d.filename}: ${d.aiSummary}`)
          .join("\n")}\n`
      : "";

    const prompt = `Tu es un conseiller diplomatique et économique de haut niveau, 
expert en partenariats internationaux africains et en financement du développement.

Tu suis la MÉTHODOLOGIE OKATECH adaptée au contexte diplomatique :
- Phase R1 : Diagnostic sectoriel (macro, forces/contraintes, parties prenantes, benchmark)
- Phase R2 : Points aveugles (économie politique, risques, facteurs sociaux)
- Phase R3 : Analyse approfondie de l'opérateur
- Phase R4 : Cadre de partenariat (besoins vs offre, scénarios, financement)

═══ CIBLE ═══
- Nom: ${target.name}
- Type: ${target.type}
- Secteur: ${target.sector ?? "Non spécifié"}
- Pays: ${target.country ?? "Non spécifié"} · ${target.city ?? ""}
- Site web: ${target.website ?? "Non disponible"}
- Contact: ${target.contactName ?? "Non identifié"} (${target.contactTitle ?? ""})
- Description: ${target.description ?? "Non disponible"}
${target.matchReason ? `- Raison du ciblage: ${target.matchReason}` : ""}
- Score d'opportunité: ${target.opportunityScore ?? "Non évalué"}%
- Tags: ${target.tags?.join(", ") ?? "Aucun"}

═══ PRIORITÉS DU GABON ═══
${priorityContext}
${knowledgeBase}

═══ CONTEXTE GABON ═══
Le Gabon est engagé dans une politique de diversification économique post-pétrole, 
de développement des infrastructures, et d'attraction des investissements étrangers.
Les axes prioritaires incluent : énergie, infrastructures, numérique, agriculture, 
tourisme, formation professionnelle, et gouvernance.

═══ MISSION ═══
Produis une analyse stratégique COMPLÈTE de partenariat entre le Gabon et ${target.name}, 
structurée selon la méthodologie OkaTech Phase 0.

Ce plan doit servir de document de travail opérationnel pour l'Ambassadeur du Gabon 
en ${target.country} et son équipe diplomatique.

Retourne un objet JSON avec EXACTEMENT cette structure :

{
  "title": "titre du plan stratégique",
  "category": "bilateral" | "economic" | "cultural" | "security" | "multilateral" | "other",
  "summary": "résumé exécutif complet (1 paragraphe de 5-7 phrases)",
  
  "strategicAnalysis": {
    "diagnosticSectoriel": {
      "contexteMacro": "analyse macro du secteur de ${target.name} et sa pertinence pour le Gabon (2-3 paragraphes)",
      "forcesGabon": ["5-7 atouts du Gabon dans ce secteur"],
      "contraintesGabon": ["4-6 contraintes/faiblesses à adresser"],
      "partiesPrenantes": [
        { "nom": "...", "role": "...", "influence": "forte|moyenne|faible" }
      ],
      "benchmark": [
        { "pays": "...", "description": "...", "leconsApprises": "..." }
      ]
    },
    "pointsAveugles": {
      "economiePolitique": "analyse des rapports de force liés à ce partenariat",
      "risquesGeopolitiques": "risques géopolitiques spécifiques",
      "facteursSociaux": "impact social et acceptabilité au Gabon",
      "contraintesTerrain": ["3-5 réalités opérationnelles à anticiper"]
    },
    "analyseOperateur": {
      "profilComplet": "profil enrichi de l'opérateur (2-3 paragraphes)",
      "capacitesCles": ["5-7 compétences et moyens de l'opérateur"],
      "realisationsMarquantes": [
        { "projet": "...", "pays": "...", "resultat": "..." }
      ],
      "presenceAfrique": "expérience en Afrique si applicable",
      "alignementPriorites": "comment l'opérateur s'aligne sur les priorités gabonaises"
    },
    "cadrePartenariat": {
      "besoinsGabon": [
        { "besoin": "...", "secteur": "...", "urgence": "immediate|court_terme|moyen_terme", "estimationBudget": "..." }
      ],
      "offreOperateur": [
        { "capacite": "...", "instrument": "PPP|IDE|AT|crédit|fonds...", "conditions": "..." }
      ],
      "beneficesMutuels": ["5-7 bénéfices mutuels"],
      "modelesFinancement": [
        { "type": "...", "description": "...", "montantEstime": "..." }
      ],
      "scenariosPartenariat": [
        { "scenario": "ambitieux", "description": "...", "investissementEstime": "...", "delaiMiseEnOeuvre": "..." },
        { "scenario": "realiste", "description": "...", "investissementEstime": "...", "delaiMiseEnOeuvre": "..." },
        { "scenario": "minimal", "description": "...", "investissementEstime": "...", "delaiMiseEnOeuvre": "..." }
      ]
    },
    "strategieApproche": {
      "argumentaire": ["5-7 arguments clés pour convaincre l'opérateur"],
      "negotiationPoints": ["5-7 points de négociation"],
      "concessions": ["3-5 concessions possibles côté gabonais"],
      "lignesRouges": ["3-5 limites non-négociables"],
      "chronologieApproche": [
        { "etape": "1", "action": "...", "responsable": "...", "delai": "..." }
      ]
    },
    "preparationReunion": {
      "agenda": [
        { "point": "...", "duree": "...", "objectif": "..." }
      ],
      "dossiersAFournir": ["5-7 documents à préparer"],
      "questionsStrategiques": ["5-7 questions à poser à l'opérateur"],
      "profilsAInviter": ["3-5 profils gabonais à avoir en réunion"]
    },
    "risques": [
      { "risque": "...", "probabilite": "faible|moyenne|elevee", "impact": "faible|moyen|eleve", "mitigation": "..." }
    ]
  },

  "aiGeneratedContent": {
    "countryNeeds": ["version simplifiée des besoins (5-7)"],
    "operatorCapabilities": ["version simplifiée des capacités (5-7)"],
    "mutualBenefits": ["version simplifiée (4-6)"],
    "negotiationPoints": ["version simplifiée (4-6)"],
    "meetingAgenda": ["version simplifiée (5-8)"],
    "risks": ["version simplifiée (3-5)"]
  },

  "objectives": [
    { "title": "...", "description": "...", "status": "planned" }
  ]
}

IMPORTANT:
- Sois CONCRET et SPÉCIFIQUE au cas ${target.name} / Gabon
- Cite des chiffres réalistes (montants, délais, volumes)
- Mentionne les instruments financiers précis de ${target.name} si connus
- Les scénarios doivent être véritablement différenciés
- Les risques doivent être spécifiques, pas génériques`;

    const result = await generateJSON(prompt);
    
    // Normaliser, valider, insérer en base...
    // (même pattern que l'actuel, avec le champ strategicAnalysis en plus)
  },
});
```

---

## Partie 2 — Projet de Coopération Complet

### 2.1 Problème actuel

Le projet (`diplomaticProjects`) est actuellement un squelette :

```typescript
// ACTUEL — objectives est une simple liste
objectives: v.array(v.object({
  title: v.string(),
  status: v.union(v.literal("planned"), v.literal("in_progress"), v.literal("completed"), v.literal("blocked")),
  deadline: v.optional(v.number()),
})),
stakeholders: v.array(v.object({
  name: v.string(), role: v.string(), organization: v.string(), contact: v.optional(v.string()),
})),
```

Il manque : cadre logique, indicateurs, budget détaillé, calendrier, risques, livrables, cadre juridique.

### 2.2 Nouveau schema enrichi du Projet

**Fichier : `convex/schemas/diplomaticAffairs.ts`**

Ajouter un nouveau champ `projectFramework` à la table `diplomaticProjectsTable` :

```typescript
// ─── Cadre logique du projet (framework enrichi) ───────────────────────────

export const projectFrameworkValidator = v.object({
  // Cadre logique (Logical Framework — standard bailleurs)
  cadreLogique: v.object({
    objectifGeneral: v.string(),           // Impact visé
    objectifSpecifique: v.string(),        // Effet direct du projet
    resultatsAttendus: v.array(v.object({
      resultat: v.string(),
      indicateurs: v.array(v.object({
        indicateur: v.string(),
        valeurCible: v.string(),
        moyenVerification: v.string(),
      })),
      activites: v.array(v.string()),
    })),
    hypotheses: v.array(v.string()),        // Hypothèses critiques
  }),

  // Budget détaillé
  budgetDetaille: v.object({
    montantTotal: v.string(),
    devise: v.string(),
    repartition: v.array(v.object({
      poste: v.string(),
      montant: v.string(),
      financeur: v.string(),               // "Gabon", "COFIDES", "PPP", etc.
      pourcentage: v.number(),
    })),
    sourceFinancement: v.array(v.object({
      source: v.string(),
      instrument: v.string(),              // Prêt, don, equity, garantie...
      montant: v.string(),
      conditions: v.optional(v.string()),
    })),
  }),

  // Calendrier
  calendrier: v.object({
    phases: v.array(v.object({
      phase: v.string(),
      description: v.string(),
      debut: v.string(),
      fin: v.string(),
      livrables: v.array(v.string()),
      jalons: v.array(v.string()),
    })),
    dureeTotal: v.string(),
  }),

  // Cadre juridique et institutionnel
  cadreJuridique: v.object({
    typeAccord: v.string(),                 // MoU, Convention, Contrat PPP...
    baseJuridique: v.string(),              // Lois/conventions applicables
    autorisationsRequises: v.array(v.string()),
    clausesEssentielles: v.array(v.string()),
  }),

  // Suivi et évaluation
  suiviEvaluation: v.object({
    mecanismeSuivi: v.string(),
    frequenceRapports: v.string(),
    indicateursPerformance: v.array(v.object({
      kpi: v.string(),
      cible: v.string(),
      frequenceMesure: v.string(),
    })),
    evaluationFinale: v.string(),
  }),

  // Impact attendu
  impact: v.object({
    economique: v.array(v.string()),
    social: v.array(v.string()),
    environnemental: v.array(v.string()),
    emploisEstimes: v.optional(v.string()),
    beneficiairesEstimes: v.optional(v.string()),
  }),

  // Risques projet (plus détaillé que le plan stratégique)
  risquesProjet: v.array(v.object({
    categorie: v.union(
      v.literal("politique"),
      v.literal("financier"),
      v.literal("technique"),
      v.literal("juridique"),
      v.literal("social"),
      v.literal("environnemental"),
    ),
    risque: v.string(),
    probabilite: v.union(v.literal("faible"), v.literal("moyenne"), v.literal("elevee")),
    impact: v.union(v.literal("faible"), v.literal("moyen"), v.literal("eleve")),
    mitigation: v.string(),
    responsable: v.string(),
  })),

  // Pré-structuré depuis le plan stratégique
  sourceStrategicPlanId: v.optional(v.id("diplomaticPlans")),
  scenarioRetenu: v.optional(v.union(
    v.literal("ambitieux"),
    v.literal("realiste"),
    v.literal("minimal"),
  )),
});
```

Ajouter à `diplomaticProjectsTable` :

```typescript
// AJOUTER dans diplomaticProjectsTable :
projectFramework: v.optional(projectFrameworkValidator),
```

### 2.3 Action IA `structureProject` enrichie

**Fichier : `convex/ai/diplomaticAI.ts`**

```typescript
export const structureProject = action({
  args: {
    orgId: v.id("orgs"),
    targetId: v.id("diplomaticTargets"),
    planId: v.optional(v.id("diplomaticPlans")),
    scenarioRetenu: v.optional(v.union(
      v.literal("ambitieux"),
      v.literal("realiste"),
      v.literal("minimal"),
    )),
    // Enrichissement optionnel depuis les réunions/rapports
    compteRenduReunions: v.optional(v.string()),
    retoursTerrain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const target = await ctx.runQuery(api.functions.diplomaticAffairs.getTarget, {
      targetId: args.targetId,
    });
    if (!target) throw new Error("Cible introuvable");

    // Récupérer le plan stratégique s'il existe
    let planContext = "";
    let strategicAnalysis = null;
    if (args.planId) {
      const plans = await ctx.runQuery(api.functions.diplomaticAffairs.getPlansByTarget, {
        targetId: args.targetId,
      });
      const plan = plans.find(p => p._id === args.planId);
      if (plan) {
        strategicAnalysis = plan.strategicAnalysis;
        const scenario = args.scenarioRetenu ?? "realiste";
        
        if (strategicAnalysis) {
          const scenarioData = strategicAnalysis.cadrePartenariat.scenariosPartenariat
            .find(s => s.scenario === scenario);
          planContext = `
═══ PLAN STRATÉGIQUE EXISTANT ═══
Titre: ${plan.title}
Résumé: ${plan.summary}

Scénario retenu: ${scenario}
${scenarioData ? `Description: ${scenarioData.description}
Investissement estimé: ${scenarioData.investissementEstime}
Délai: ${scenarioData.delaiMiseEnOeuvre}` : ""}

Besoins identifiés:
${strategicAnalysis.cadrePartenariat.besoinsGabon.map(b => `- ${b.besoin} (${b.secteur}, ${b.urgence})`).join("\n")}

Offre opérateur:
${strategicAnalysis.cadrePartenariat.offreOperateur.map(o => `- ${o.capacite} via ${o.instrument}`).join("\n")}

Modèles de financement:
${strategicAnalysis.cadrePartenariat.modelesFinancement.map(m => `- ${m.type}: ${m.description}`).join("\n")}

Risques identifiés:
${strategicAnalysis.risques.map(r => `- ${r.risque} (prob: ${r.probabilite}, impact: ${r.impact})`).join("\n")}
`;
        }
      }
    }

    // Contexte des réunions/rapports (enrichissement itératif)
    const reunionsContext = args.compteRenduReunions
      ? `\n═══ COMPTE-RENDU DES RÉUNIONS ═══\n${args.compteRenduReunions}\n`
      : "";
    const terrainContext = args.retoursTerrain
      ? `\n═══ RETOURS TERRAIN ═══\n${args.retoursTerrain}\n`
      : "";

    const prompt = `Tu es un expert en structuration de projets de coopération internationale,
spécialisé dans les partenariats Afrique-Europe et les instruments de financement du développement.

═══ CIBLE ═══
- Nom: ${target.name}
- Secteur: ${target.sector ?? "Finance/Développement"}
- Pays: ${target.country ?? "Espagne"}
- Description: ${target.description ?? ""}
${planContext}
${reunionsContext}
${terrainContext}

═══ MISSION ═══
Structure un PROJET DE COOPÉRATION complet entre le Gabon et ${target.name}.

Ce document doit être au standard des bailleurs de fonds internationaux 
(cadre logique, indicateurs SMART, budget détaillé, calendrier).

${args.compteRenduReunions ? "IMPORTANT: Intègre les éléments discutés en réunion dans le projet." : ""}
${args.retoursTerrain ? "IMPORTANT: Intègre les retours terrain pour affiner le projet." : ""}

Retourne un objet JSON avec EXACTEMENT cette structure :

{
  "title": "titre du projet",
  "projectType": "cooperation_agreement|commercial_contract|technical_assistance|infrastructure|other",
  "description": "description complète du projet (2-3 paragraphes)",
  
  "projectFramework": {
    "cadreLogique": {
      "objectifGeneral": "impact visé à long terme",
      "objectifSpecifique": "effet direct et mesurable du projet",
      "resultatsAttendus": [
        {
          "resultat": "résultat attendu 1",
          "indicateurs": [
            { "indicateur": "...", "valeurCible": "...", "moyenVerification": "..." }
          ],
          "activites": ["activité 1.1", "activité 1.2"]
        }
      ],
      "hypotheses": ["3-5 hypothèses critiques"]
    },
    "budgetDetaille": {
      "montantTotal": "ex: 50 000 000 EUR",
      "devise": "EUR",
      "repartition": [
        { "poste": "...", "montant": "...", "financeur": "...", "pourcentage": 0 }
      ],
      "sourceFinancement": [
        { "source": "...", "instrument": "prêt|don|equity|garantie...", "montant": "...", "conditions": "..." }
      ]
    },
    "calendrier": {
      "phases": [
        { "phase": "Phase 1", "description": "...", "debut": "...", "fin": "...", "livrables": ["..."], "jalons": ["..."] }
      ],
      "dureeTotal": "ex: 36 mois"
    },
    "cadreJuridique": {
      "typeAccord": "MoU | Convention | Contrat PPP | ...",
      "baseJuridique": "lois et conventions applicables",
      "autorisationsRequises": ["3-5 autorisations nécessaires"],
      "clausesEssentielles": ["5-7 clauses clés du contrat"]
    },
    "suiviEvaluation": {
      "mecanismeSuivi": "description du mécanisme de suivi",
      "frequenceRapports": "trimestriel | semestriel",
      "indicateursPerformance": [
        { "kpi": "...", "cible": "...", "frequenceMesure": "..." }
      ],
      "evaluationFinale": "modalités d'évaluation finale"
    },
    "impact": {
      "economique": ["3-5 impacts économiques attendus"],
      "social": ["3-5 impacts sociaux"],
      "environnemental": ["2-3 impacts environnementaux"],
      "emploisEstimes": "nombre d'emplois directs/indirects",
      "beneficiairesEstimes": "nombre de bénéficiaires"
    },
    "risquesProjet": [
      {
        "categorie": "politique|financier|technique|juridique|social|environnemental",
        "risque": "...",
        "probabilite": "faible|moyenne|elevee",
        "impact": "faible|moyen|eleve",
        "mitigation": "...",
        "responsable": "..."
      }
    ]
  },

  "objectives": [
    { "title": "...", "description": "...", "status": "planned" }
  ],
  "stakeholders": [
    { "name": "...", "role": "...", "organization": "...", "contact": "..." }
  ]
}

IMPORTANT:
- Chiffres réalistes et spécifiques au contexte Gabon/${target.name}
- Instruments financiers précis (si COFIDES : prêts concessionnels, equity, garanties CESCE)
- Cadre juridique adapté au droit gabonais et aux conventions bilatérales
- KPIs SMART (Spécifiques, Mesurables, Atteignables, Réalistes, Temporels)`;

    const result = await generateJSON(prompt);
    // ... normaliser, valider, insérer en base ...
  },
});
```

### 2.4 Le flux "Contact & Rapports enrichissent le Projet"

Même si les onglets Contact et Rapports ne sont pas encore pleinement développés, le projet peut évoluer grâce à eux :

```
Plan Stratégique (IA)  ──────────────────────────── Projet v1 (IA, pré-structuré)
        │                                                    │
        ▼                                                    │
  Lettre d'introduction ─── Réunion ─── Compte-rendu        │
                                           │                 │
                                           ▼                 ▼
                                   Rapport de réunion ──► Projet v2 (enrichi)
                                           │                 │
                                           ▼                 ▼
                                   Validation haute    ──► Projet FINAL
                                   autorité
```

**Mutation d'enrichissement du projet :**

```typescript
/** Enrichit un projet existant avec les retours terrain */
export const enrichProjectFromReunion = authMutation({
  args: {
    projectId: v.id("diplomaticProjects"),
    compteRenduReunion: v.string(),      // Texte libre du CR
    retoursTerrain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Projet introuvable");

    // Déclencher la re-génération IA avec le contexte enrichi
    await ctx.scheduler.runAfter(0, internal.ai.diplomaticAI.structureProject, {
      orgId: project.orgId,
      targetId: project.targetId,
      planId: project.planId,
      compteRenduReunions: args.compteRenduReunion,
      retoursTerrain: args.retoursTerrain,
      // Le projet existant est mis à jour, pas recréé
      existingProjectId: args.projectId,
    });
  },
});
```

---

## Partie 3 — Génération de documents

### 3.1 Plan Stratégique → PPTX

Le plan stratégique complet doit générer une présentation PowerPoint structurée :

```
Slide 1  — Couverture (bandeau Gabon + titre + cible + date)
Slide 2  — Résumé exécutif
Slide 3  — Diagnostic sectoriel (contexte macro + forces/contraintes)
Slide 4  — Analyse de l'opérateur (profil + capacités + réalisations)
Slide 5  — Besoins du Gabon vs Offre opérateur (tableau comparatif)
Slide 6  — Bénéfices mutuels
Slide 7  — Scénarios de partenariat (3 scénarios côte à côte)
Slide 8  — Modèles de financement
Slide 9  — Stratégie d'approche et chronologie
Slide 10 — Points de négociation et lignes rouges
Slide 11 — Préparation réunion (agenda + questions)
Slide 12 — Risques et mitigations
Slide 13 — Objectifs et prochaines étapes
```

### 3.2 Projet → DOCX

Le projet de coopération doit générer un document Word au standard bailleurs :

```
Page 1   — Couverture officielle
Page 2   — Sommaire
Section 1 — Résumé exécutif
Section 2 — Contexte et justification
Section 3 — Cadre logique (tableau)
Section 4 — Description des activités
Section 5 — Budget détaillé (tableaux)
Section 6 — Calendrier de mise en œuvre (diagramme de Gantt simplifié)
Section 7 — Cadre institutionnel et juridique
Section 8 — Parties prenantes
Section 9 — Suivi et évaluation
Section 10 — Analyse des risques
Section 11 — Impact attendu
Annexes   — Documents de référence
```

---

## Partie 4 — Modifications des fichiers existants

### Résumé des fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `convex/schemas/diplomaticAffairs.ts` | Ajouter `strategicAnalysisValidator`, `projectFrameworkValidator`, champs `strategicAnalysis` et `projectFramework` |
| `convex/schema.ts` | Aucune (les tables existent déjà) |
| `convex/ai/diplomaticAI.ts` | Réécrire `generateStrategy` avec le mode `complet`, réécrire `structureProject` |
| `convex/functions/diplomaticAffairs.ts` | Ajouter `enrichProjectFromReunion`, mettre à jour `createPlan` et `createProject` pour accepter les nouveaux champs |

### Fichiers à créer

| Fichier | Contenu |
|---------|---------|
| `convex/functions/diplomaticFolders.ts` | CRUD dossiers + actions génération PPTX/DOCX/ZIP (cf. prompt précédent) |

---

## Partie 5 — Interface utilisateur (vues à enrichir)

### 5.1 Vue Plan Stratégique enrichie

La page plan doit afficher le `strategicAnalysis` sous forme de sections dépliables :

```
┌─────────────────────────────────────────────────────────────────┐
│ Plan Stratégique : Catalyser les Investissements Espagnols...  │
│ economic • draft • Score: 95%                                   │
├─────────────────────────────────────────────────────────────────┤
│ 📋 Résumé exécutif                                              │
│ COFIDES est un partenaire clé pour la mobilisation...           │
├─────────────────────────────────────────────────────────────────┤
│ ▼ 🔍 Diagnostic Sectoriel                                      │
│   Contexte macro | Forces Gabon (7) | Contraintes (5)           │
│   Parties prenantes (8) | Benchmark (3 pays)                    │
│                                                                  │
│ ▼ ⚠️ Points Aveugles                                            │
│   Économie politique | Risques géopolitiques | Facteurs sociaux  │
│                                                                  │
│ ▼ 🏢 Analyse COFIDES                                            │
│   Profil complet | Capacités (7) | Réalisations (5)             │
│   Présence Afrique | Alignement priorités                       │
│                                                                  │
│ ▼ 🤝 Cadre de Partenariat                                       │
│   Besoins vs Offre | Bénéfices mutuels                          │
│   Modèles de financement | 3 Scénarios                          │
│                                                                  │
│ ▼ 🎯 Stratégie d'Approche                                       │
│   Argumentaire | Négociation | Chronologie                      │
│                                                                  │
│ ▼ 📅 Préparation Réunion                                        │
│   Agenda détaillé | Dossiers à fournir | Questions              │
│                                                                  │
│ ▼ ⚡ Risques et Mitigations                                     │
│   Tableau avec probabilité × impact + mitigation                 │
├─────────────────────────────────────────────────────────────────┤
│ [📊 Exporter PPTX] [📄 Exporter PDF] [🔄 Régénérer avec IA]   │
│ [▶️ Créer le Projet depuis ce plan]                              │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Vue Projet enrichie

```
┌─────────────────────────────────────────────────────────────────┐
│ Projet : Coopération Gabon-COFIDES pour le Développement...     │
│ cooperation_agreement • draft • Budget: 50M EUR                  │
├─────────────────────────────────────────────────────────────────┤
│ ▼ 📋 Cadre Logique                                              │
│   Objectif général → Objectif spécifique → Résultats            │
│   Indicateurs SMART + Moyens de vérification                    │
│                                                                  │
│ ▼ 💰 Budget Détaillé                                            │
│   Tableau répartition + Sources de financement                   │
│   Diagramme circulaire des postes                                │
│                                                                  │
│ ▼ 📅 Calendrier                                                 │
│   Phases avec jalons (timeline visuelle)                         │
│                                                                  │
│ ▼ ⚖️ Cadre Juridique                                            │
│   Type d'accord | Base juridique | Autorisations                │
│                                                                  │
│ ▼ 📊 Suivi & Évaluation                                        │
│   KPIs | Fréquence | Évaluation finale                          │
│                                                                  │
│ ▼ 🌍 Impact Attendu                                             │
│   Économique | Social | Environnemental                         │
│   Emplois estimés | Bénéficiaires                                │
│                                                                  │
│ ▼ ⚡ Risques Projet                                             │
│   Matrice probabilité × impact par catégorie                     │
├─────────────────────────────────────────────────────────────────┤
│ [📄 Exporter DOCX] [📄 Exporter PDF]                           │
│ [🔄 Enrichir avec compte-rendu réunion]                          │
│ [✅ Soumettre pour validation haute autorité]                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ordre d'implémentation

| # | Tâche | Fichier(s) | Priorité |
|---|-------|------------|----------|
| 1 | Ajouter `strategicAnalysisValidator` au schema | `convex/schemas/diplomaticAffairs.ts` | P0 |
| 2 | Ajouter `projectFrameworkValidator` au schema | `convex/schemas/diplomaticAffairs.ts` | P0 |
| 3 | Réécrire `generateStrategy` (mode complet) | `convex/ai/diplomaticAI.ts` | P0 |
| 4 | Réécrire `structureProject` (mode complet) | `convex/ai/diplomaticAI.ts` | P0 |
| 5 | Ajouter `enrichProjectFromReunion` | `convex/functions/diplomaticAffairs.ts` | P1 |
| 6 | Mettre à jour `createPlan` pour `strategicAnalysis` | `convex/functions/diplomaticAffairs.ts` | P1 |
| 7 | Mettre à jour `createProject` pour `projectFramework` | `convex/functions/diplomaticAffairs.ts` | P1 |
| 8 | Générateur PPTX du plan stratégique complet | `convex/functions/diplomaticFolders.ts` | P1 |
| 9 | Générateur DOCX du projet complet | `convex/functions/diplomaticFolders.ts` | P1 |
| 10 | Vue Plan Stratégique enrichie (sections dépliables) | `apps/agent-web/` | P2 |
| 11 | Vue Projet enrichie (cadre logique, budget, calendrier) | `apps/agent-web/` | P2 |
| 12 | Bouton "Créer Projet depuis ce Plan" | `apps/agent-web/` | P2 |
| 13 | Bouton "Enrichir avec CR réunion" | `apps/agent-web/` | P2 |
