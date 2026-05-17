/**
 * Affaires Diplomatiques — Actions IA
 *
 * 6 actions Gemini pour le pipeline diplomatique :
 * 1. discoverTargets — Recherche IA de cibles
 * 2. enrichTarget — Enrichissement d'une cible manuelle
 * 3. generateStrategy — Élaboration de plan stratégique
 * 4. draftLetter — Rédaction de lettre diplomatique
 * 5. compileReport — Compilation de rapport d'activité
 * 6. structureProject — Structuration de projet de coopération
 */

"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Types pour les retours de ctx.runQuery ────────────────────────────────
// Annotations explicites pour éviter la circularité TypeScript (cf. guidelines)
type TargetDoc = {
  _id: Id<"diplomaticTargets">;
  name: string;
  type: string;
  sector?: string;
  country?: string;
  city?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  website?: string;
  description?: string;
  tags: string[];
  priority: string;
  status: string;
  pipelinePhase?: string;
  opportunityScore?: number;
  matchReason?: string;
};

type PlanDoc = {
  _id: Id<"diplomaticPlans">;
  title: string;
  category: string;
  summary?: string;
  status: string;
  objectives: Array<{ title: string; description?: string; status: string }>;
  aiGeneratedContent?: {
    countryNeeds: string[];
    operatorCapabilities: string[];
    mutualBenefits: string[];
    negotiationPoints: string[];
    meetingAgenda: string[];
    risks: string[];
  };
};

type PrioritiesDoc = {
  hostCountry: string;
  priorities: Array<{ title: string; sector: string; keywords: string[] }>;
  sourceDocuments?: Array<{ filename: string; aiSummary?: string }>;
} | null;

// ─── Helpers ────────────────────────────────────────────────────────────────

const getGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY non configurée");
  return new GoogleGenerativeAI(apiKey);
};

const generateJSON = async (prompt: string): Promise<unknown> => {
  const genAI = getGemini();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 65536,
    },
  });
  const result = await model.generateContent(prompt);
  let text = result.response.text();

  // Gemini peut tronquer le JSON — tenter de reparer les fermetures manquantes
  try {
    return JSON.parse(text);
  } catch {
    // Essayer de fermer les crochets/accolades manquants
    let open = 0;
    let openArr = 0;
    for (const ch of text) {
      if (ch === "{") open++;
      else if (ch === "}") open--;
      else if (ch === "[") openArr++;
      else if (ch === "]") openArr--;
    }
    // Couper le dernier element incomplet (souvent une string tronquee)
    const lastComplete = Math.max(
      text.lastIndexOf("},"),
      text.lastIndexOf("],"),
      text.lastIndexOf('",'),
    );
    if (lastComplete > text.length * 0.7) {
      text = text.substring(0, lastComplete + 1);
      // Recompter
      open = 0;
      openArr = 0;
      for (const ch of text) {
        if (ch === "{") open++;
        else if (ch === "}") open--;
        else if (ch === "[") openArr++;
        else if (ch === "]") openArr--;
      }
    }
    text += "]".repeat(Math.max(0, openArr)) + "}".repeat(Math.max(0, open));
    console.warn(`[generateJSON] JSON repare (${open} accolades, ${openArr} crochets fermes)`);
    return JSON.parse(text);
  }
};

const generateText = async (prompt: string): Promise<string> => {
  const genAI = getGemini();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. DISCOVER TARGETS — Recherche IA de cibles
// ═════════════════════════════════════════════════════════════════════════════

export const discoverTargets = action({
  args: {
    orgId: v.id("orgs"),
    hostCountry: v.string(),
    priorities: v.array(
      v.object({
        title: v.string(),
        sector: v.string(),
        keywords: v.array(v.string()),
      }),
    ),
    maxResults: v.optional(v.number()),
    sourceDocumentSummaries: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const max = args.maxResults ?? 10;
    const priorityList = args.priorities
      .map((p) => `- ${p.title} (secteur: ${p.sector}, mots-clés: ${p.keywords.join(", ")})`)
      .join("\n");

    // Contexte des documents sources (base de connaissances)
    const knowledgeBase = args.sourceDocumentSummaries?.length
      ? `\nBASE DE CONNAISSANCES (documents de référence importés):\n${args.sourceDocumentSummaries.map((s) => `- ${s}`).join("\n")}\n`
      : "";

    const prompt = `Tu es un analyste économique spécialisé en diplomatie africaine et relations internationales.

CONTEXTE:
Le Gabon, par l'intermédiaire de son ambassade en ${args.hostCountry}, cherche des partenaires stratégiques pour ses priorités de développement.

PRIORITÉS DE L'EXÉCUTIF GABONAIS:
${priorityList}
${knowledgeBase}
MISSION:
Identifie ${max} entreprises, organismes ou institutions en ${args.hostCountry} qui pourraient être des partenaires stratégiques pour le Gabon dans ces secteurs prioritaires.

Pour chaque cible, fournis un objet JSON avec :
- name: nom complet de l'entreprise/organisme
- type: "enterprise" | "government" | "ngo" | "international_org" | "academic" | "media" | "other"
- sector: secteur d'activité principal
- country: "${args.hostCountry}"
- city: ville du siège
- description: description de l'activité et pourquoi c'est pertinent pour le Gabon (2-3 phrases)
- website: site web si connu
- contactName: nom du dirigeant principal si connu
- contactTitle: titre du dirigeant
- opportunityScore: score de 0 à 100 (pertinence pour les priorités gabonaises)
- matchReason: explication du match avec les priorités gabonaises (1-2 phrases)
- suggestedPriority: "low" | "medium" | "high" | "critical"
- tags: tableau de mots-clés pertinents (3-5 tags)

IMPORTANT: Privilégie les grandes entreprises et institutions reconnues. Sois réaliste et précis.

Retourne un objet JSON: { "targets": [...] }`;

    const result = (await generateJSON(prompt)) as {
      targets: Array<{
        name: string;
        type: string;
        sector: string;
        country: string;
        city?: string;
        description: string;
        website?: string;
        contactName?: string;
        contactTitle?: string;
        opportunityScore: number;
        matchReason: string;
        suggestedPriority: string;
        tags: string[];
      }>;
    };

    // Inserer les cibles en base
    const insertedIds: string[] = [];
    for (const t of result.targets) {
      const validTypes = [
        "enterprise", "government", "ngo", "international_org",
        "academic", "media", "other",
      ];
      const validPriorities = ["low", "medium", "high", "critical"];

      const id = await ctx.runMutation(
        api.functions.diplomaticAffairs.createTarget,
        {
          orgId: args.orgId,
          name: t.name,
          type: (validTypes.includes(t.type) ? t.type : "enterprise") as "enterprise",
          sector: t.sector,
          country: t.country,
          city: t.city,
          description: t.description,
          website: t.website,
          contactName: t.contactName,
          priority: (validPriorities.includes(t.suggestedPriority)
            ? t.suggestedPriority
            : "medium") as "medium",
          tags: t.tags ?? [],
          pipelinePhase: "targeting",
          opportunityScore: t.opportunityScore,
          matchReason: t.matchReason,
          aiDiscoveryData: {
            source: "ai_search",
            searchQuery: `${args.priorities.map((p) => p.title).join(", ")} en ${args.hostCountry}`,
            executivePriority: args.priorities[0]?.title ?? "Général",
            aiConfidence: (t.opportunityScore ?? 50) / 100,
            discoveredAt: Date.now(),
          },
        },
      );
      insertedIds.push(id);
    }

    return {
      count: insertedIds.length,
      targets: result.targets,
      insertedIds,
    };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. ENRICH TARGET — Enrichissement IA d'une cible manuelle
// ═════════════════════════════════════════════════════════════════════════════

export const enrichTarget = action({
  args: {
    targetId: v.id("diplomaticTargets"),
  },
  handler: async (ctx, args) => {
    const target = await ctx.runQuery(
      api.functions.diplomaticAffairs.getTarget,
      { targetId: args.targetId },
    );
    if (!target) throw new Error("Cible introuvable");

    const prompt = `Tu es un analyste économique spécialisé en diplomatie et partenariats internationaux.

CIBLE À ANALYSER:
- Nom: ${target.name}
- Type: ${target.type}
- Secteur: ${target.sector ?? "Non spécifié"}
- Pays: ${target.country ?? "Non spécifié"}
- Ville: ${target.city ?? "Non spécifiée"}
- Description actuelle: ${target.description ?? "Aucune"}

MISSION:
Enrichis cette fiche avec des informations pertinentes pour l'ambassade du Gabon.

Retourne un objet JSON avec :
- description: description enrichie et détaillée (3-5 phrases)
- opportunityScore: score 0-100 de pertinence pour le Gabon
- matchReason: pourquoi cette cible est intéressante pour le Gabon (2-3 phrases)
- website: site web officiel si connu
- sector: secteur d'activité précisé
- strengths: points forts pour un partenariat (tableau de 3-5 items)
- weaknesses: points faibles ou risques (tableau de 2-3 items)
- suggestedTags: mots-clés suggérés (tableau de 4-6 tags)`;

    const result = (await generateJSON(prompt)) as {
      description: string;
      opportunityScore: number;
      matchReason: string;
      website?: string;
      sector?: string;
      strengths: string[];
      weaknesses: string[];
      suggestedTags: string[];
    };

    // Mettre à jour la cible
    await ctx.runMutation(api.functions.diplomaticAffairs.updateTarget, {
      targetId: args.targetId,
      description: result.description,
      opportunityScore: result.opportunityScore,
      matchReason: result.matchReason,
      website: result.website ?? target.website,
      tags: [
        ...new Set([...(target.tags ?? []), ...result.suggestedTags]),
      ].slice(0, 10),
    });

    return result;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. GENERATE STRATEGY — Plan stratégique de partenariat
// ═════════════════════════════════════════════════════════════════════════════

export const generateStrategy = action({
  args: {
    orgId: v.id("orgs"),
    targetId: v.id("diplomaticTargets"),
    depth: v.optional(
      v.union(v.literal("standard"), v.literal("complet")),
    ),
  },
  handler: async (ctx, args): Promise<{
    planId: Id<"diplomaticPlans">;
    title: string;
    category: string;
    summary: string;
    aiGeneratedContent: Record<string, string[]>;
    objectives: Array<{ title: string; description?: string; status: string }>;
  }> => {
    const depth = args.depth ?? "complet";
    const target: TargetDoc | null = await ctx.runQuery(
      api.functions.diplomaticAffairs.getTarget,
      { targetId: args.targetId },
    );
    if (!target) throw new Error("Cible introuvable");

    const priorities: PrioritiesDoc = await ctx.runQuery(
      api.functions.diplomaticAffairs.getPriorities,
      { orgId: args.orgId },
    );

    const priorityContext = priorities
      ? priorities.priorities
          .map(
            (p: { title: string; sector: string }) =>
              `- ${p.title} (${p.sector})`,
          )
          .join("\n")
      : "Developpement economique general";

    const knowledgeBase = priorities?.sourceDocuments?.length
      ? `\nBASE DE CONNAISSANCES:\n${priorities.sourceDocuments
          .filter((d: { aiSummary?: string }) => d.aiSummary)
          .map(
            (d: { filename: string; aiSummary?: string }) =>
              `- ${d.filename}: ${d.aiSummary}`,
          )
          .join("\n")}\n`
      : "";

    // ─── Helpers de normalisation Gemini ───────────────────────────────────
    const toStringArray = (arr: unknown): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr.map((item) =>
        typeof item === "string" ? item : JSON.stringify(item),
      );
    };

    const toStr = (val: unknown): string =>
      typeof val === "string" ? val : val ? JSON.stringify(val) : "";

    const validCategories = [
      "bilateral",
      "economic",
      "cultural",
      "security",
      "multilateral",
      "other",
    ];

    // ═══ MODE COMPLET — Methodologie OkaTech Phase 0 ═══════════════════════
    if (depth === "complet") {
      const completPrompt = `Tu es un conseiller diplomatique et economique de haut niveau,
expert en partenariats internationaux africains et en financement du developpement.

Tu suis la METHODOLOGIE OKATECH adaptee au contexte diplomatique :
- Phase R1 : Diagnostic sectoriel (macro, forces/contraintes, parties prenantes, benchmark)
- Phase R2 : Points aveugles (economie politique, risques, facteurs sociaux)
- Phase R3 : Analyse approfondie de l'operateur
- Phase R4 : Cadre de partenariat (besoins vs offre, scenarios, financement)

═══ CIBLE ═══
- Nom: ${target.name}
- Type: ${target.type}
- Secteur: ${target.sector ?? "Non specifie"}
- Pays: ${target.country ?? "Non specifie"} · ${target.city ?? ""}
- Site web: ${target.website ?? "Non disponible"}
- Contact: ${target.contactName ?? "Non identifie"} (${target.contactTitle ?? ""})
- Description: ${target.description ?? "Non disponible"}
${target.matchReason ? `- Raison du ciblage: ${target.matchReason}` : ""}
- Score d'opportunite: ${target.opportunityScore ?? "Non evalue"}%
- Tags: ${target.tags?.join(", ") ?? "Aucun"}

═══ PRIORITES DU GABON ═══
${priorityContext}
${knowledgeBase}

═══ CONTEXTE GABON ═══
Le Gabon est engage dans une politique de diversification economique post-petrole,
de developpement des infrastructures, et d'attraction des investissements etrangers.
Les axes prioritaires incluent : energie, infrastructures, numerique, agriculture,
tourisme, formation professionnelle, et gouvernance.

═══ MISSION ═══
Produis une analyse strategique COMPLETE de partenariat entre le Gabon et ${target.name},
structuree selon la methodologie OkaTech Phase 0.

Ce plan doit servir de document de travail operationnel pour l'Ambassadeur du Gabon
en ${target.country ?? "poste"} et son equipe diplomatique.

Retourne un objet JSON avec EXACTEMENT cette structure :

{
  "title": "titre du plan strategique",
  "category": "bilateral" | "economic" | "cultural" | "security" | "multilateral" | "other",
  "summary": "resume executif complet (1 paragraphe de 5-7 phrases)",

  "strategicAnalysis": {
    "diagnosticSectoriel": {
      "contexteMacro": "analyse macro du secteur et sa pertinence pour le Gabon (2-3 paragraphes)",
      "forcesGabon": ["5-7 atouts du Gabon dans ce secteur"],
      "contraintesGabon": ["4-6 contraintes/faiblesses a adresser"],
      "partiesPrenantes": [
        { "nom": "...", "role": "...", "influence": "forte" | "moyenne" | "faible" }
      ],
      "benchmark": [
        { "pays": "...", "description": "...", "leconsApprises": "..." }
      ]
    },
    "pointsAveugles": {
      "economiePolitique": "analyse des rapports de force lies a ce partenariat",
      "risquesGeopolitiques": "risques geopolitiques specifiques",
      "facteursSociaux": "impact social et acceptabilite au Gabon",
      "contraintesTerrain": ["3-5 realites operationnelles a anticiper"]
    },
    "analyseOperateur": {
      "profilComplet": "profil enrichi de l'operateur (2-3 paragraphes)",
      "capacitesCles": ["5-7 competences et moyens de l'operateur"],
      "realisationsMarquantes": [
        { "projet": "...", "pays": "...", "resultat": "..." }
      ],
      "presenceAfrique": "experience en Afrique si applicable",
      "alignementPriorites": "comment l'operateur s'aligne sur les priorites gabonaises"
    },
    "cadrePartenariat": {
      "besoinsGabon": [
        { "besoin": "...", "secteur": "...", "urgence": "immediate" | "court_terme" | "moyen_terme", "estimationBudget": "..." }
      ],
      "offreOperateur": [
        { "capacite": "...", "instrument": "PPP, IDE, AT, credit, fonds...", "conditions": "..." }
      ],
      "beneficesMutuels": ["5-7 benefices mutuels"],
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
      "argumentaire": ["5-7 arguments cles pour convaincre l'operateur"],
      "negotiationPoints": ["5-7 points de negociation"],
      "concessions": ["3-5 concessions possibles cote gabonais"],
      "lignesRouges": ["3-5 limites non-negociables"],
      "chronologieApproche": [
        { "etape": "1", "action": "...", "responsable": "...", "delai": "..." }
      ]
    },
    "preparationReunion": {
      "agenda": [
        { "point": "...", "duree": "...", "objectif": "..." }
      ],
      "dossiersAFournir": ["5-7 documents a preparer"],
      "questionsStrategiques": ["5-7 questions a poser a l'operateur"],
      "profilsAInviter": ["3-5 profils gabonais a avoir en reunion"]
    },
    "risques": [
      { "risque": "...", "probabilite": "faible" | "moyenne" | "elevee", "impact": "faible" | "moyen" | "eleve", "mitigation": "..." }
    ]
  },

  "aiGeneratedContent": {
    "countryNeeds": ["version simplifiee des besoins (5-7)"],
    "operatorCapabilities": ["version simplifiee des capacites (5-7)"],
    "mutualBenefits": ["version simplifiee (4-6)"],
    "negotiationPoints": ["version simplifiee (4-6)"],
    "meetingAgenda": ["version simplifiee (5-8)"],
    "risks": ["version simplifiee (3-5)"]
  },

  "objectives": [
    { "title": "...", "description": "...", "status": "planned" }
  ]
}

IMPORTANT:
- Sois CONCRET et SPECIFIQUE au cas ${target.name} / Gabon
- Cite des chiffres realistes (montants, delais, volumes)
- Les scenarios doivent etre veritablement differencies
- Les risques doivent etre specifiques, pas generiques
- Les partiesPrenantes influence: EXACTEMENT "forte", "moyenne" ou "faible"
- Les urgences: EXACTEMENT "immediate", "court_terme" ou "moyen_terme"
- Les probabilites: EXACTEMENT "faible", "moyenne" ou "elevee"
- Les impacts: EXACTEMENT "faible", "moyen" ou "eleve"
- Les scenarios: EXACTEMENT "ambitieux", "realiste" ou "minimal"`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (await generateJSON(completPrompt)) as any;

      // Normaliser aiGeneratedContent
      const normalizedContent = {
        countryNeeds: toStringArray(raw.aiGeneratedContent?.countryNeeds),
        operatorCapabilities: toStringArray(raw.aiGeneratedContent?.operatorCapabilities),
        mutualBenefits: toStringArray(raw.aiGeneratedContent?.mutualBenefits),
        negotiationPoints: toStringArray(raw.aiGeneratedContent?.negotiationPoints),
        meetingAgenda: toStringArray(raw.aiGeneratedContent?.meetingAgenda),
        risks: toStringArray(raw.aiGeneratedContent?.risks),
      };

      // Normaliser strategicAnalysis avec fallbacks robustes
      const validInfluence = ["forte", "moyenne", "faible"];
      const validUrgence = ["immediate", "court_terme", "moyen_terme"];
      const validProba = ["faible", "moyenne", "elevee"];
      const validImpact = ["faible", "moyen", "eleve"];
      const validScenario = ["ambitieux", "realiste", "minimal"];

      const sa = raw.strategicAnalysis;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const normalizedAnalysis = sa ? {
        diagnosticSectoriel: {
          contexteMacro: toStr(sa.diagnosticSectoriel?.contexteMacro),
          forcesGabon: toStringArray(sa.diagnosticSectoriel?.forcesGabon),
          contraintesGabon: toStringArray(sa.diagnosticSectoriel?.contraintesGabon),
          partiesPrenantes: Array.isArray(sa.diagnosticSectoriel?.partiesPrenantes)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? sa.diagnosticSectoriel.partiesPrenantes.map((pp: any) => ({
                nom: toStr(pp.nom),
                role: toStr(pp.role),
                influence: validInfluence.includes(pp.influence) ? pp.influence : "moyenne",
              }))
            : [],
          benchmark: Array.isArray(sa.diagnosticSectoriel?.benchmark)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? sa.diagnosticSectoriel.benchmark.map((b: any) => ({
                pays: toStr(b.pays),
                description: toStr(b.description),
                leconsApprises: toStr(b.leconsApprises),
              }))
            : [],
        },
        pointsAveugles: {
          economiePolitique: toStr(sa.pointsAveugles?.economiePolitique),
          risquesGeopolitiques: toStr(sa.pointsAveugles?.risquesGeopolitiques),
          facteursSociaux: toStr(sa.pointsAveugles?.facteursSociaux),
          contraintesTerrain: toStringArray(sa.pointsAveugles?.contraintesTerrain),
        },
        analyseOperateur: {
          profilComplet: toStr(sa.analyseOperateur?.profilComplet),
          capacitesCles: toStringArray(sa.analyseOperateur?.capacitesCles),
          realisationsMarquantes: Array.isArray(sa.analyseOperateur?.realisationsMarquantes)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? sa.analyseOperateur.realisationsMarquantes.map((r: any) => ({
                projet: toStr(r.projet),
                pays: toStr(r.pays),
                resultat: toStr(r.resultat),
              }))
            : [],
          presenceAfrique: sa.analyseOperateur?.presenceAfrique
            ? toStr(sa.analyseOperateur.presenceAfrique)
            : undefined,
          alignementPriorites: toStr(sa.analyseOperateur?.alignementPriorites),
        },
        cadrePartenariat: {
          besoinsGabon: Array.isArray(sa.cadrePartenariat?.besoinsGabon)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? sa.cadrePartenariat.besoinsGabon.map((b: any) => ({
                besoin: toStr(b.besoin),
                secteur: toStr(b.secteur),
                urgence: validUrgence.includes(b.urgence) ? b.urgence : "moyen_terme",
                estimationBudget: b.estimationBudget ? toStr(b.estimationBudget) : undefined,
              }))
            : [],
          offreOperateur: Array.isArray(sa.cadrePartenariat?.offreOperateur)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? sa.cadrePartenariat.offreOperateur.map((o: any) => ({
                capacite: toStr(o.capacite),
                instrument: toStr(o.instrument),
                conditions: o.conditions ? toStr(o.conditions) : undefined,
              }))
            : [],
          beneficesMutuels: toStringArray(sa.cadrePartenariat?.beneficesMutuels),
          modelesFinancement: Array.isArray(sa.cadrePartenariat?.modelesFinancement)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? sa.cadrePartenariat.modelesFinancement.map((m: any) => ({
                type: toStr(m.type),
                description: toStr(m.description),
                montantEstime: m.montantEstime ? toStr(m.montantEstime) : undefined,
              }))
            : [],
          scenariosPartenariat: Array.isArray(sa.cadrePartenariat?.scenariosPartenariat)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? sa.cadrePartenariat.scenariosPartenariat.map((s: any) => ({
                scenario: validScenario.includes(s.scenario) ? s.scenario : "realiste",
                description: toStr(s.description),
                investissementEstime: s.investissementEstime ? toStr(s.investissementEstime) : undefined,
                delaiMiseEnOeuvre: s.delaiMiseEnOeuvre ? toStr(s.delaiMiseEnOeuvre) : undefined,
              }))
            : [],
        },
        strategieApproche: {
          argumentaire: toStringArray(sa.strategieApproche?.argumentaire),
          negotiationPoints: toStringArray(sa.strategieApproche?.negotiationPoints),
          concessions: toStringArray(sa.strategieApproche?.concessions),
          lignesRouges: toStringArray(sa.strategieApproche?.lignesRouges),
          chronologieApproche: Array.isArray(sa.strategieApproche?.chronologieApproche)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? sa.strategieApproche.chronologieApproche.map((c: any) => ({
                etape: toStr(c.etape),
                action: toStr(c.action),
                responsable: toStr(c.responsable),
                delai: toStr(c.delai),
              }))
            : [],
        },
        preparationReunion: {
          agenda: Array.isArray(sa.preparationReunion?.agenda)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? sa.preparationReunion.agenda.map((a: any) => ({
                point: toStr(a.point),
                duree: toStr(a.duree),
                objectif: toStr(a.objectif),
              }))
            : [],
          dossiersAFournir: toStringArray(sa.preparationReunion?.dossiersAFournir),
          questionsStrategiques: toStringArray(sa.preparationReunion?.questionsStrategiques),
          profilsAInviter: toStringArray(sa.preparationReunion?.profilsAInviter),
        },
        risques: Array.isArray(sa.risques)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? sa.risques.map((r: any) => ({
              risque: toStr(r.risque),
              probabilite: validProba.includes(r.probabilite) ? r.probabilite : "moyenne",
              impact: validImpact.includes(r.impact) ? r.impact : "moyen",
              mitigation: toStr(r.mitigation),
            }))
          : [],
      } : undefined;

      // Creer le plan en base avec l'analyse enrichie
      const planId: Id<"diplomaticPlans"> = await ctx.runMutation(
        api.functions.diplomaticAffairs.createPlan,
        {
          orgId: args.orgId,
          targetId: args.targetId,
          title: raw.title ?? "Plan strategique",
          category: (validCategories.includes(raw.category)
            ? raw.category
            : "economic") as "economic",
          summary: raw.summary ?? "",
          objectives: Array.isArray(raw.objectives)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? raw.objectives.map((o: any) => ({
                title: toStr(o.title),
                description: o.description ? toStr(o.description) : undefined,
                status: "planned" as const,
              }))
            : [],
          aiGeneratedContent: normalizedContent,
          strategicAnalysis: normalizedAnalysis,
        },
      );

      // Avancer la phase de la cible
      await ctx.runMutation(api.functions.diplomaticAffairs.advancePhase, {
        targetId: args.targetId,
        newPhase: "strategy",
      });

      return {
        planId,
        title: raw.title ?? "Plan strategique",
        category: raw.category ?? "economic",
        summary: raw.summary ?? "",
        aiGeneratedContent: normalizedContent,
        objectives: Array.isArray(raw.objectives) ? raw.objectives : [],
      };
    }

    // ═══ MODE STANDARD — Comportement actuel (retrocompatibilite) ═══════════
    const prompt = `Tu es un conseiller diplomatique de haut niveau specialise dans les partenariats internationaux africains.

CIBLE:
- Nom: ${target.name}
- Type: ${target.type}
- Secteur: ${target.sector ?? "Non specifie"}
- Pays: ${target.country ?? "Non specifie"}
- Description: ${target.description ?? "Non disponible"}
${target.matchReason ? `- Raison du ciblage: ${target.matchReason}` : ""}

PRIORITES DU GABON:
${priorityContext}
${knowledgeBase}
MISSION:
Elabore un plan strategique de partenariat complet entre le Gabon et ${target.name}.
Ce plan doit preparer l'ambassadeur pour une reunion d'affaires productive.

Retourne un objet JSON avec :
- title: titre du plan strategique
- category: "bilateral" | "economic" | "cultural" | "security" | "multilateral" | "other"
- summary: resume executif (3-5 phrases)
- aiGeneratedContent: {
    countryNeeds: besoins du Gabon que ce partenaire peut adresser (5-7 items),
    operatorCapabilities: capacites et forces de ${target.name} (5-7 items),
    mutualBenefits: benefices mutuels du partenariat (4-6 items),
    negotiationPoints: points cles de negociation pour l'ambassadeur (4-6 items),
    meetingAgenda: agenda propose pour la premiere reunion (5-8 points),
    risks: risques identifies et moyens de mitigation (3-5 items)
  }
- objectives: tableau d'objectifs [{ title, description, status: "planned" }] (4-6 objectifs)`;

    const result = (await generateJSON(prompt)) as {
      title: string;
      category: string;
      summary: string;
      aiGeneratedContent: {
        countryNeeds: string[];
        operatorCapabilities: string[];
        mutualBenefits: string[];
        negotiationPoints: string[];
        meetingAgenda: string[];
        risks: string[];
      };
      objectives: Array<{
        title: string;
        description?: string;
        status: string;
      }>;
    };

    const normalizedContent = {
      countryNeeds: toStringArray(result.aiGeneratedContent.countryNeeds ?? []),
      operatorCapabilities: toStringArray(result.aiGeneratedContent.operatorCapabilities ?? []),
      mutualBenefits: toStringArray(result.aiGeneratedContent.mutualBenefits ?? []),
      negotiationPoints: toStringArray(result.aiGeneratedContent.negotiationPoints ?? []),
      meetingAgenda: toStringArray(result.aiGeneratedContent.meetingAgenda ?? []),
      risks: toStringArray(result.aiGeneratedContent.risks ?? []),
    };

    const planId: Id<"diplomaticPlans"> = await ctx.runMutation(
      api.functions.diplomaticAffairs.createPlan,
      {
        orgId: args.orgId,
        targetId: args.targetId,
        title: result.title,
        category: (validCategories.includes(result.category)
          ? result.category
          : "economic") as "economic",
        summary: result.summary,
        objectives: result.objectives.map((o) => ({
          title: o.title,
          description: o.description,
          status: "planned" as const,
        })),
        aiGeneratedContent: normalizedContent,
      },
    );

    await ctx.runMutation(api.functions.diplomaticAffairs.advancePhase, {
      targetId: args.targetId,
      newPhase: "strategy",
    });

    return { planId, ...result };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. DRAFT LETTER — Rédaction de lettre diplomatique
// ═════════════════════════════════════════════════════════════════════════════

export const draftLetter = action({
  args: {
    orgId: v.id("orgs"),
    targetId: v.id("diplomaticTargets"),
    planId: v.optional(v.id("diplomaticPlans")),
    letterFormat: v.union(
      v.literal("formal_letter"),
      v.literal("email"),
      v.literal("note_verbale"),
      v.literal("invitation"),
    ),
    purpose: v.string(),
    ambassadorName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ letterId: Id<"diplomaticLetters">; subject: string; content: string; type: string; meetingDetails: Record<string, unknown> }> => {
    const target: TargetDoc | null = await ctx.runQuery(
      api.functions.diplomaticAffairs.getTarget,
      { targetId: args.targetId },
    );
    if (!target) throw new Error("Cible introuvable");

    let planContext = "";
    if (args.planId) {
      const plans: PlanDoc[] = await ctx.runQuery(
        api.functions.diplomaticAffairs.getPlansByTarget,
        { targetId: args.targetId },
      );
      const plan = plans.find((p: PlanDoc) => p._id === args.planId);
      if (plan?.aiGeneratedContent) {
        planContext = `
CONTEXTE DU PLAN STRATÉGIQUE:
- Bénéfices mutuels: ${plan.aiGeneratedContent.mutualBenefits.join(", ")}
- Points de négociation: ${plan.aiGeneratedContent.negotiationPoints.join(", ")}
- Agenda proposé: ${plan.aiGeneratedContent.meetingAgenda.join(", ")}`;
      }
    }

    const formatLabel: Record<string, string> = {
      formal_letter: "lettre officielle",
      email: "email professionnel",
      note_verbale: "note verbale diplomatique",
      invitation: "carton d'invitation officiel",
    };

    const ambassadorLabel = args.ambassadorName
      ? `l'Ambassadeur ${args.ambassadorName}`
      : "l'Ambassadeur du Gabon";

    const prompt = `Tu es un rédacteur diplomatique expert en protocole et correspondance officielle francophone.

DESTINATAIRE:
- Nom: ${target.contactName ?? target.name}
- Titre: ${target.contactTitle ?? "Directeur/Directrice"}
- Organisation: ${target.name}
- Pays: ${target.country ?? ""}
${planContext}

FORMAT: ${formatLabel[args.letterFormat] ?? "lettre officielle"}
EXPÉDITEUR: ${ambassadorLabel}
OBJET: ${args.purpose}

MISSION:
Rédige une ${formatLabel[args.letterFormat]} au nom de ${ambassadorLabel}.

La lettre doit :
- Respecter le protocole diplomatique français
- Commencer par la formule d'appel protocolaire appropriée
- Présenter le Gabon et les opportunités de partenariat
- Inviter à une rencontre avec ${ambassadorLabel}
- Proposer une visite des services de l'entreprise
- Évoquer les séances de travail pour un éventuel partenariat
- Conclure avec la formule de politesse diplomatique appropriée

Retourne un objet JSON avec :
- subject: objet de la lettre
- content: texte complet de la lettre (formaté avec sauts de ligne)
- type: "introduction" | "follow_up" | "invitation" | "proposal" | "thank_you" | "other"
- meetingDetails: {
    proposedDate: date suggérée (format texte, ex: "dans les prochaines semaines"),
    proposedLocation: lieu proposé,
    agenda: points de l'ordre du jour (3-5 items)
  }`;

    const result = (await generateJSON(prompt)) as {
      subject: string;
      content: string;
      type: string;
      meetingDetails: {
        proposedDate?: string;
        proposedLocation?: string;
        agenda?: string[];
      };
    };

    // Créer la lettre en base
    const validTypes = [
      "introduction", "follow_up", "invitation", "proposal", "thank_you", "other",
    ];
    const letterId: Id<"diplomaticLetters"> = await ctx.runMutation(
      api.functions.diplomaticAffairs.createLetter,
      {
        orgId: args.orgId,
        targetId: args.targetId,
        planId: args.planId,
        subject: result.subject,
        type: (validTypes.includes(result.type) ? result.type : "introduction") as "introduction",
        letterFormat: args.letterFormat,
        recipientName: target.contactName ?? target.name,
        recipientTitle: target.contactTitle,
        recipientOrg: target.name,
        content: result.content,
        aiDraftContent: result.content,
        meetingDetails: result.meetingDetails,
      },
    );

    // Avancer la phase
    if (target.pipelinePhase === "strategy") {
      await ctx.runMutation(api.functions.diplomaticAffairs.advancePhase, {
        targetId: args.targetId,
        newPhase: "outreach",
      });
    }

    return { letterId, ...result };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. COMPILE REPORT — Rapport d'activité diplomatique
// ═════════════════════════════════════════════════════════════════════════════

export const compileReport = action({
  args: {
    orgId: v.id("orgs"),
    recipientType: v.union(
      v.literal("president"),
      v.literal("minister"),
      v.literal("secretary_general"),
      v.literal("direction"),
      v.literal("other"),
    ),
    reportType: v.union(
      v.literal("activity"),
      v.literal("situation"),
      v.literal("mission"),
      v.literal("economic"),
      v.literal("annual"),
      v.literal("other"),
    ),
    period: v.string(),
    additionalContext: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ reportId: Id<"diplomaticReports">; title: string; summary: string; content: string; statistics: Record<string, number>; recommendations: string[] }> => {
    // Récupérer les données du pipeline
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stats: any = await ctx.runQuery(
      api.functions.diplomaticAffairs.getDashboardStats,
      { orgId: args.orgId },
    );

    const targets: TargetDoc[] = await ctx.runQuery(
      api.functions.diplomaticAffairs.listTargets,
      { orgId: args.orgId },
    );

    const plans: PlanDoc[] = await ctx.runQuery(
      api.functions.diplomaticAffairs.listPlans,
      { orgId: args.orgId },
    );

    const letters: Array<{ _id: Id<"diplomaticLetters"> }> = await ctx.runQuery(
      api.functions.diplomaticAffairs.listLetters,
      { orgId: args.orgId },
    );

    const priorities: PrioritiesDoc = await ctx.runQuery(
      api.functions.diplomaticAffairs.getPriorities,
      { orgId: args.orgId },
    );

    const recipientLabels: Record<string, string> = {
      president: "Monsieur le Président de la République",
      minister: "Monsieur le Ministre des Affaires Étrangères",
      secretary_general: "Monsieur le Secrétaire Général",
      direction: "Monsieur le Directeur",
      other: "Excellence",
    };

    const prompt = `Tu es un rédacteur diplomatique de haut niveau au service de la République Gabonaise.

DESTINATAIRE: ${recipientLabels[args.recipientType]}
TYPE DE RAPPORT: ${args.reportType}
PÉRIODE: ${args.period}
PAYS HÔTE: ${priorities?.hostCountry ?? "Non spécifié"}

DONNÉES DU PIPELINE DIPLOMATIQUE:
- Cibles identifiées: ${stats?.targets.total ?? 0}
  - Par statut: ${JSON.stringify(stats?.targets.byStatus ?? {})}
  - Par phase: ${JSON.stringify(stats?.targets.byPhase ?? {})}
- Plans stratégiques: ${stats?.plans.total ?? 0} (actifs: ${stats?.plans.active ?? 0})
- Lettres: ${stats?.letters.total ?? 0}
  - Envoyées: ${stats?.letters.byStatus?.sent ?? 0}
  - Réponses reçues: ${stats?.letters.byStatus?.responded ?? 0}
- Projets: ${stats?.projects.total ?? 0} (actifs: ${stats?.projects.active ?? 0})

CIBLES PRINCIPALES (top 5):
${targets
  ?.sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0))
  .slice(0, 5)
  .map((t) => `- ${t.name} (${t.sector ?? t.type}, score: ${t.opportunityScore ?? "N/A"}, phase: ${t.pipelinePhase ?? "ciblage"})`)
  .join("\n") ?? "Aucune"}

${priorities?.sourceDocuments?.length ? `BASE DE CONNAISSANCES:\n${priorities.sourceDocuments.filter((d: { aiSummary?: string }) => d.aiSummary).map((d: { filename: string; aiSummary?: string }) => `- ${d.filename}: ${d.aiSummary}`).join("\n")}` : ""}

${args.additionalContext ? `CONTEXTE ADDITIONNEL:\n${args.additionalContext}` : ""}

MISSION:
Rédige un rapport ${args.reportType} complet pour ${recipientLabels[args.recipientType]}.

Le rapport doit être structuré, professionnel, et adapté au niveau hiérarchique du destinataire.

Retourne un objet JSON avec :
- title: titre du rapport
- summary: résumé exécutif (1 paragraphe)
- content: corps du rapport complet (structuré avec sections, plusieurs paragraphes)
- statistics: { totalTargets, contactedTargets, meetingsHeld, projectsInitiated }
- recommendations: recommandations (tableau de 3-5 items)`;

    const result = (await generateJSON(prompt)) as {
      title: string;
      summary: string;
      content: string;
      statistics: {
        totalTargets: number;
        contactedTargets: number;
        meetingsHeld: number;
        projectsInitiated: number;
      };
      recommendations: string[];
    };

    // Créer le rapport en base
    const targetIds: Id<"diplomaticTargets">[] = targets.slice(0, 20).map((t: TargetDoc) => t._id);
    const planIds: Id<"diplomaticPlans">[] = plans.slice(0, 20).map((p: PlanDoc) => p._id);
    const letterIds: Id<"diplomaticLetters">[] = letters.slice(0, 20).map((l: { _id: Id<"diplomaticLetters"> }) => l._id);

    const reportId: Id<"diplomaticReports"> = await ctx.runMutation(
      api.functions.diplomaticAffairs.createReport,
      {
        orgId: args.orgId,
        title: result.title,
        type: args.reportType,
        recipient: args.recipientType,
        summary: result.summary,
        content: result.content,
        period: args.period,
        targetIds,
        planIds,
        letterIds,
        aiGeneratedSummary: result.summary,
        statistics: result.statistics,
      },
    );

    return { reportId, ...result };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. STRUCTURE PROJECT — Projet de coopération
// ═════════════════════════════════════════════════════════════════════════════

export const structureProject = action({
  args: {
    orgId: v.id("orgs"),
    targetId: v.id("diplomaticTargets"),
    planId: v.optional(v.id("diplomaticPlans")),
    projectType: v.union(
      v.literal("cooperation_agreement"),
      v.literal("commercial_contract"),
      v.literal("technical_assistance"),
      v.literal("cultural_exchange"),
      v.literal("infrastructure"),
      v.literal("other"),
    ),
  },
  handler: async (ctx, args): Promise<{ projectId: Id<"diplomaticProjects">; title: string; description: string; objectives: Array<{ title: string; status: string }>; stakeholders: Array<{ name: string; role: string; organization: string }>; budget: string; timeline: string; kpis: string[] }> => {
    const target: TargetDoc | null = await ctx.runQuery(
      api.functions.diplomaticAffairs.getTarget,
      { targetId: args.targetId },
    );
    if (!target) throw new Error("Cible introuvable");

    let planContext = "";
    if (args.planId) {
      const plans: PlanDoc[] = await ctx.runQuery(
        api.functions.diplomaticAffairs.getPlansByTarget,
        { targetId: args.targetId },
      );
      const plan = plans.find((p: PlanDoc) => p._id === args.planId);
      if (plan) {
        planContext = `
PLAN STRATÉGIQUE ASSOCIÉ:
- Titre: ${plan.title}
- Catégorie: ${plan.category}
- Résumé: ${plan.summary ?? ""}
${plan.aiGeneratedContent ? `- Bénéfices mutuels: ${plan.aiGeneratedContent.mutualBenefits.join(", ")}` : ""}`;
      }
    }

    const typeLabels: Record<string, string> = {
      cooperation_agreement: "accord de coopération",
      commercial_contract: "contrat commercial",
      technical_assistance: "assistance technique",
      cultural_exchange: "échange culturel",
      infrastructure: "projet d'infrastructure",
      other: "projet",
    };

    const prompt = `Tu es un expert en montage de projets de coopération internationale.

PARTENAIRE:
- Nom: ${target.name}
- Secteur: ${target.sector ?? "Non spécifié"}
- Pays: ${target.country ?? "Non spécifié"}
- Description: ${target.description ?? ""}
${planContext}

TYPE DE PROJET: ${typeLabels[args.projectType]}

MISSION:
Structure un ${typeLabels[args.projectType]} entre la République Gabonaise et ${target.name}.

Le projet doit être concret, réaliste et prêt à être soumis pour validation à la haute autorité.

Retourne un objet JSON avec :
- title: titre officiel du projet
- description: description complète (2-3 paragraphes)
- objectives: tableau d'objectifs [{ title, status: "planned" }] (5-8 objectifs SMART)
- stakeholders: parties prenantes [{ name, role, organization }] (4-6 parties)
- budget: estimation budgétaire (format texte, ex: "500 000 - 1 000 000 EUR")
- timeline: calendrier proposé (format texte, ex: "18 mois - Phase 1: 6 mois, Phase 2: 12 mois")
- kpis: indicateurs de performance (tableau de 4-6 KPI)`;

    const result = (await generateJSON(prompt)) as {
      title: string;
      description: string;
      objectives: Array<{ title: string; status: string }>;
      stakeholders: Array<{
        name: string;
        role: string;
        organization: string;
        contact?: string;
      }>;
      budget: string;
      timeline: string;
      kpis: string[];
    };

    // Créer le projet en base
    const projectId: Id<"diplomaticProjects"> = await ctx.runMutation(
      api.functions.diplomaticAffairs.createProject,
      {
        orgId: args.orgId,
        targetId: args.targetId,
        planId: args.planId,
        title: result.title,
        projectType: args.projectType,
        description: result.description,
        objectives: result.objectives.map((o) => ({
          title: o.title,
          status: "planned" as const,
        })),
        stakeholders: result.stakeholders.map((s) => ({
          name: s.name,
          role: s.role,
          organization: s.organization,
          contact: s.contact,
        })),
        budget: result.budget,
      },
    );

    // Avancer la phase
    if (
      target.pipelinePhase === "reporting" ||
      target.pipelinePhase === "outreach"
    ) {
      try {
        await ctx.runMutation(api.functions.diplomaticAffairs.advancePhase, {
          targetId: args.targetId,
          newPhase: "project",
        });
      } catch {
        // La transition peut échouer si la phase n'est pas la bonne
      }
    }

    return { projectId, ...result };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// 6bis. ENRICH PROJECT FRAMEWORK — Cadre logique bailleurs (7 sections)
// ═════════════════════════════════════════════════════════════════════════════

type ProjectDoc = {
  _id: Id<"diplomaticProjects">;
  title: string;
  reference: string;
  projectType: string;
  description?: string;
  targetId: Id<"diplomaticTargets">;
  planId?: Id<"diplomaticPlans">;
  budget?: string;
  objectives: Array<{ title: string; status: string }>;
  stakeholders: Array<{ name: string; role: string; organization: string }>;
};

export const enrichProjectFramework = action({
  args: {
    orgId: v.id("orgs"),
    projectId: v.id("diplomaticProjects"),
  },
  handler: async (ctx, args): Promise<{ projectId: Id<"diplomaticProjects"> }> => {
    const project: ProjectDoc | null = await ctx.runQuery(
      api.functions.diplomaticAffairs.getProject,
      { projectId: args.projectId },
    );
    if (!project) throw new Error("Projet introuvable");

    const target: TargetDoc | null = await ctx.runQuery(
      api.functions.diplomaticAffairs.getTarget,
      { targetId: project.targetId },
    );
    if (!target) throw new Error("Cible introuvable");

    // Charger le plan stratégique lié pour enrichir le contexte
    let planContext = "";
    if (project.planId) {
      const plans: PlanDoc[] = await ctx.runQuery(
        api.functions.diplomaticAffairs.getPlansByTarget,
        { targetId: project.targetId },
      );
      const plan = plans.find((p: PlanDoc) => p._id === project.planId);
      if (plan) {
        planContext = `
PLAN STRATÉGIQUE ASSOCIÉ:
- Titre: ${plan.title}
- Catégorie: ${plan.category}
- Résumé: ${plan.summary ?? ""}
${plan.aiGeneratedContent ? `- Besoins du Gabon: ${plan.aiGeneratedContent.countryNeeds.slice(0, 5).join("; ")}
- Bénéfices mutuels: ${plan.aiGeneratedContent.mutualBenefits.slice(0, 5).join("; ")}
- Risques identifiés: ${plan.aiGeneratedContent.risks.slice(0, 5).join("; ")}` : ""}`;
      }
    }

    const typeLabels: Record<string, string> = {
      cooperation_agreement: "accord de coopération",
      commercial_contract: "contrat commercial",
      technical_assistance: "assistance technique",
      cultural_exchange: "échange culturel",
      infrastructure: "projet d'infrastructure",
      other: "projet",
    };

    const prompt = `Tu es un expert senior en montage de projets de coopération internationale,
spécialiste du cadre logique des bailleurs de fonds (AFD, Banque Mondiale, UE, BAD).

PROJET À ENRICHIR:
- Titre: ${project.title}
- Référence: ${project.reference}
- Type: ${typeLabels[project.projectType] ?? project.projectType}
- Description: ${project.description ?? ""}
- Budget estimé: ${project.budget ?? "À définir"}
- Objectifs: ${project.objectives.map((o) => o.title).join("; ")}
- Parties prenantes initiales: ${project.stakeholders.map((s) => `${s.name} (${s.role}, ${s.organization})`).join("; ")}

PARTENAIRE:
- Nom: ${target.name}
- Secteur: ${target.sector ?? "Non spécifié"}
- Pays: ${target.country ?? "Non spécifié"}
- Description: ${target.description ?? ""}
${planContext}

MISSION:
Produis un cadre logique complet conforme aux standards des bailleurs de fonds internationaux.
Le document doit être prêt à être soumis pour validation et financement.

Retourne UNIQUEMENT un objet JSON valide STRICT avec cette structure (TOUS les champs sont obligatoires) :

{
  "cadreLogique": {
    "objectifGeneral": "objectif de développement de haut niveau (1 phrase)",
    "objectifSpecifique": "résultat direct attendu du projet (1 phrase)",
    "resultatsAttendus": [
      {
        "resultat": "résultat précis",
        "indicateurs": [
          { "indicateur": "nom de l'indicateur", "valeurCible": "ex: 500 personnes formées", "moyenVerification": "ex: rapports trimestriels" }
        ],
        "activites": ["activité 1", "activité 2"]
      }
    ] (3-5 résultats),
    "hypotheses": ["hypothèse externe 1", "hypothèse 2"] (3-5 hypothèses)
  },
  "budgetDetaille": {
    "montantTotal": "ex: 1 500 000",
    "devise": "EUR ou XAF",
    "repartition": [
      { "poste": "Investissement matériel", "montant": "500 000", "financeur": "Gabon", "pourcentage": 33 }
    ] (5-8 postes, somme des pourcentages = 100),
    "sourceFinancement": [
      { "source": "AFD", "instrument": "Subvention", "montant": "800 000", "conditions": "co-financement requis" }
    ] (2-4 sources)
  },
  "calendrier": {
    "phases": [
      {
        "phase": "Phase 1 - Préparation",
        "description": "description courte",
        "debut": "M1",
        "fin": "M3",
        "livrables": ["livrable 1", "livrable 2"],
        "jalons": ["jalon 1"]
      }
    ] (3-5 phases),
    "dureeTotal": "ex: 24 mois"
  },
  "cadreJuridique": {
    "typeAccord": "ex: Accord bilatéral de coopération",
    "baseJuridique": "ex: Convention OCDE, Accord-cadre Gabon-France de 2018",
    "autorisationsRequises": ["décret présidentiel", "approbation parlementaire"] (2-4 items),
    "clausesEssentielles": ["souveraineté gabonaise", "transfert de compétences"] (4-6 clauses)
  },
  "suiviEvaluation": {
    "mecanismeSuivi": "ex: Comité de pilotage trimestriel + audit annuel externe",
    "frequenceRapports": "trimestrielle",
    "indicateursPerformance": [
      { "kpi": "Taux de réalisation des activités", "cible": "95%", "frequenceMesure": "trimestrielle" }
    ] (4-6 KPIs),
    "evaluationFinale": "ex: Évaluation indépendante à mi-parcours et finale"
  },
  "impact": {
    "economique": ["impact économique 1", "impact 2"] (3-5 items),
    "social": ["impact social 1", "impact 2"] (3-5 items),
    "environnemental": ["impact environnemental 1"] (2-4 items),
    "emploisEstimes": "ex: 250 emplois directs + 600 indirects",
    "beneficiairesEstimes": "ex: 50 000 personnes"
  },
  "risquesProjet": [
    {
      "categorie": "politique" | "financier" | "technique" | "juridique" | "social" | "environnemental",
      "risque": "description du risque",
      "probabilite": "faible" | "moyenne" | "elevee",
      "impact": "faible" | "moyen" | "eleve",
      "mitigation": "mesure de mitigation concrète",
      "responsable": "rôle du responsable"
    }
  ] (6-10 risques, couvrir toutes les catégories)
}

CONTRAINTES STRICTES:
1. Les enums "categorie", "probabilite", "impact" doivent EXACTEMENT correspondre aux valeurs ci-dessus.
2. Les montants doivent être réalistes pour le contexte gabonais.
3. Le cadre logique doit s'aligner sur les priorités du Gabon (diversification, industrialisation, emplois jeunes, souveraineté, durabilité).
4. Pas de placeholders du type "TBD" ou "À définir" — propose des valeurs réalistes que l'utilisateur pourra ajuster.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (await generateJSON(prompt)) as any;

    // ─── Helpers de normalisation ─────────────────────────────────────────
    const toStringArray = (arr: unknown): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr
        .map((item) =>
          typeof item === "string" ? item : JSON.stringify(item),
        )
        .filter((s) => s.length > 0);
    };
    const toStr = (val: unknown): string =>
      typeof val === "string" ? val : val ? JSON.stringify(val) : "";
    const toNum = (val: unknown, fallback = 0): number => {
      const n = typeof val === "number" ? val : Number(val);
      return Number.isFinite(n) ? n : fallback;
    };

    const validCategorie = [
      "politique",
      "financier",
      "technique",
      "juridique",
      "social",
      "environnemental",
    ];
    const validProba = ["faible", "moyenne", "elevee"];
    const validImpact = ["faible", "moyen", "eleve"];

    // Normaliser la structure avec fallbacks robustes
    const framework = {
      cadreLogique: {
        objectifGeneral: toStr(raw.cadreLogique?.objectifGeneral),
        objectifSpecifique: toStr(raw.cadreLogique?.objectifSpecifique),
        resultatsAttendus: Array.isArray(raw.cadreLogique?.resultatsAttendus)
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            raw.cadreLogique.resultatsAttendus.map((r: any) => ({
              resultat: toStr(r.resultat),
              indicateurs: Array.isArray(r.indicateurs)
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  r.indicateurs.map((ind: any) => ({
                    indicateur: toStr(ind.indicateur),
                    valeurCible: toStr(ind.valeurCible),
                    moyenVerification: toStr(ind.moyenVerification),
                  }))
                : [],
              activites: toStringArray(r.activites),
            }))
          : [],
        hypotheses: toStringArray(raw.cadreLogique?.hypotheses),
      },
      budgetDetaille: {
        montantTotal: toStr(raw.budgetDetaille?.montantTotal),
        devise: toStr(raw.budgetDetaille?.devise) || "EUR",
        repartition: Array.isArray(raw.budgetDetaille?.repartition)
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            raw.budgetDetaille.repartition.map((p: any) => ({
              poste: toStr(p.poste),
              montant: toStr(p.montant),
              financeur: toStr(p.financeur),
              pourcentage: toNum(p.pourcentage, 0),
            }))
          : [],
        sourceFinancement: Array.isArray(raw.budgetDetaille?.sourceFinancement)
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            raw.budgetDetaille.sourceFinancement.map((s: any) => ({
              source: toStr(s.source),
              instrument: toStr(s.instrument),
              montant: toStr(s.montant),
              conditions: s.conditions ? toStr(s.conditions) : undefined,
            }))
          : [],
      },
      calendrier: {
        phases: Array.isArray(raw.calendrier?.phases)
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            raw.calendrier.phases.map((ph: any) => ({
              phase: toStr(ph.phase),
              description: toStr(ph.description),
              debut: toStr(ph.debut),
              fin: toStr(ph.fin),
              livrables: toStringArray(ph.livrables),
              jalons: toStringArray(ph.jalons),
            }))
          : [],
        dureeTotal: toStr(raw.calendrier?.dureeTotal),
      },
      cadreJuridique: {
        typeAccord: toStr(raw.cadreJuridique?.typeAccord),
        baseJuridique: toStr(raw.cadreJuridique?.baseJuridique),
        autorisationsRequises: toStringArray(
          raw.cadreJuridique?.autorisationsRequises,
        ),
        clausesEssentielles: toStringArray(
          raw.cadreJuridique?.clausesEssentielles,
        ),
      },
      suiviEvaluation: {
        mecanismeSuivi: toStr(raw.suiviEvaluation?.mecanismeSuivi),
        frequenceRapports: toStr(raw.suiviEvaluation?.frequenceRapports),
        indicateursPerformance: Array.isArray(
          raw.suiviEvaluation?.indicateursPerformance,
        )
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            raw.suiviEvaluation.indicateursPerformance.map((kpi: any) => ({
              kpi: toStr(kpi.kpi),
              cible: toStr(kpi.cible),
              frequenceMesure: toStr(kpi.frequenceMesure),
            }))
          : [],
        evaluationFinale: toStr(raw.suiviEvaluation?.evaluationFinale),
      },
      impact: {
        economique: toStringArray(raw.impact?.economique),
        social: toStringArray(raw.impact?.social),
        environnemental: toStringArray(raw.impact?.environnemental),
        emploisEstimes: raw.impact?.emploisEstimes
          ? toStr(raw.impact.emploisEstimes)
          : undefined,
        beneficiairesEstimes: raw.impact?.beneficiairesEstimes
          ? toStr(raw.impact.beneficiairesEstimes)
          : undefined,
      },
      risquesProjet: Array.isArray(raw.risquesProjet)
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          raw.risquesProjet.map((r: any) => ({
            categorie: (validCategorie.includes(r.categorie)
              ? r.categorie
              : "technique") as
              | "politique"
              | "financier"
              | "technique"
              | "juridique"
              | "social"
              | "environnemental",
            risque: toStr(r.risque),
            probabilite: (validProba.includes(r.probabilite)
              ? r.probabilite
              : "moyenne") as "faible" | "moyenne" | "elevee",
            impact: (validImpact.includes(r.impact)
              ? r.impact
              : "moyen") as "faible" | "moyen" | "eleve",
            mitigation: toStr(r.mitigation),
            responsable: toStr(r.responsable),
          }))
        : [],
      sourceStrategicPlanId: project.planId,
    };

    // Sauvegarder le cadre logique enrichi
    await ctx.runMutation(
      api.functions.diplomaticAffairs.enrichProjectWithFramework,
      {
        projectId: args.projectId,
        framework,
      },
    );

    return { projectId: args.projectId };
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. EXTRACT PRIORITIES FROM DOCUMENT — Import de documents
// ═════════════════════════════════════════════════════════════════════════════

export const extractPrioritiesFromDocument = action({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    priorities: Array<{
      title: string;
      sector: string;
      description: string;
      keywords: string[];
    }>;
    documentSummary: string;
    confidence: number;
  }> => {
    const blob = await ctx.storage.get(args.storageId);
    if (!blob) throw new Error("Fichier introuvable dans le stockage");

    const genAI = getGemini();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const isPDF = args.mimeType === "application/pdf";
    const isText =
      args.mimeType === "text/markdown" ||
      args.mimeType === "text/plain" ||
      args.mimeType === "application/json" ||
      args.filename.endsWith(".md") ||
      args.filename.endsWith(".json") ||
      args.filename.endsWith(".txt");

    const systemPrompt = `Tu es un analyste stratégique spécialisé en politique étrangère et coopération internationale du Gabon.

MISSION:
Analyse le document fourni et extrais les priorités stratégiques, axes de développement, secteurs clés et opportunités de coopération internationale.

RÈGLES:
- Extrais entre 3 et 15 priorités selon la richesse du document
- Chaque priorité doit avoir un titre clair et concis
- Le secteur doit être un domaine économique/stratégique précis (BTP, Énergie, Agriculture, Santé, Éducation, Mines, Numérique, Transport, etc.)
- La description doit être exploitable (2-3 phrases max)
- Les mots-clés doivent être pertinents pour la recherche de partenaires internationaux
- Génère un résumé du document en 2-3 phrases

Retourne un objet JSON avec :
- priorities: tableau de { title, sector, description, keywords: string[] }
- documentSummary: résumé du document (2-3 phrases)
- confidence: score de confiance 0-100 sur la qualité de l'extraction`;

    let result;

    if (isPDF) {
      // PDF : envoyer en base64 comme inlineData
      const arrayBuffer = await blob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64 = btoa(binary);

      result = await model.generateContent([
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64,
          },
        },
        { text: systemPrompt },
      ]);
    } else if (isText) {
      // Texte : lire le contenu et l'injecter dans le prompt
      const textContent = await blob.text();
      result = await model.generateContent(
        `${systemPrompt}\n\nDOCUMENT (${args.filename}):\n\n${textContent}`,
      );
    } else {
      // Autre format : tenter comme texte
      const textContent = await blob.text();
      result = await model.generateContent(
        `${systemPrompt}\n\nDOCUMENT (${args.filename}):\n\n${textContent}`,
      );
    }

    const text = result.response.text();
    const parsed = JSON.parse(text) as {
      priorities: Array<{
        title: string;
        sector: string;
        description: string;
        keywords: string[];
      }>;
      documentSummary: string;
      confidence: number;
    };

    return parsed;
  },
});
