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
    },
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text);
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

    // Insérer les cibles en base
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
  },
  handler: async (ctx, args): Promise<{ planId: Id<"diplomaticPlans">; title: string; category: string; summary: string; aiGeneratedContent: Record<string, string[]>; objectives: Array<{ title: string; description?: string; status: string }> }> => {
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
          .map((p: { title: string; sector: string }) => `- ${p.title} (${p.sector})`)
          .join("\n")
      : "Développement économique général";

    // Contexte des documents sources (base de connaissances)
    const knowledgeBase = priorities?.sourceDocuments?.length
      ? `\nBASE DE CONNAISSANCES:\n${priorities.sourceDocuments.filter((d: { aiSummary?: string }) => d.aiSummary).map((d: { filename: string; aiSummary?: string }) => `- ${d.filename}: ${d.aiSummary}`).join("\n")}\n`
      : "";

    const prompt = `Tu es un conseiller diplomatique de haut niveau spécialisé dans les partenariats internationaux africains.

CIBLE:
- Nom: ${target.name}
- Type: ${target.type}
- Secteur: ${target.sector ?? "Non spécifié"}
- Pays: ${target.country ?? "Non spécifié"}
- Description: ${target.description ?? "Non disponible"}
${target.matchReason ? `- Raison du ciblage: ${target.matchReason}` : ""}

PRIORITÉS DU GABON:
${priorityContext}
${knowledgeBase}
MISSION:
Élabore un plan stratégique de partenariat complet entre le Gabon et ${target.name}.
Ce plan doit préparer l'ambassadeur pour une réunion d'affaires productive.

Retourne un objet JSON avec :
- title: titre du plan stratégique
- category: "bilateral" | "economic" | "cultural" | "security" | "multilateral" | "other"
- summary: résumé exécutif (3-5 phrases)
- aiGeneratedContent: {
    countryNeeds: besoins du Gabon que ce partenaire peut adresser (5-7 items),
    operatorCapabilities: capacités et forces de ${target.name} (5-7 items),
    mutualBenefits: bénéfices mutuels du partenariat (4-6 items),
    negotiationPoints: points clés de négociation pour l'ambassadeur (4-6 items),
    meetingAgenda: agenda proposé pour la première réunion (5-8 points),
    risks: risques identifiés et moyens de mitigation (3-5 items)
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

    // Créer le plan en base
    const validCategories = [
      "bilateral", "economic", "cultural", "security", "multilateral", "other",
    ];
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
        aiGeneratedContent: result.aiGeneratedContent,
      },
    );

    // Avancer la phase de la cible
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
