import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";
import {
  iAstedPersonaValidator,
  iAstedToolsPolicyValidator,
  iAstedLanguagesValidator,
  iAstedAvailabilityValidator,
  iAstedEscalationValidator,
  iAstedMemoryValidator,
  iAstedQuotasValidator,
  iAstedLocalIssueValidator,
  iAstedMacroValidator,
} from "../schemas/orgIAstedConfig";

/**
 * iAsted Config — Queries et mutations pour la config chatbot par org
 *
 * Cardinalité 1:1 avec `orgs` → on crée le document à la volée si inexistant
 * via `upsert`. Pattern similaire à orgCalendar.
 *
 * Permission : settings.manage pour modifier (settings.view pour lire).
 */

// Valeurs par défaut utilisées à l'initialisation d'une config
const DEFAULT_PERSONA = {
  name: "Astedia",
  tone: "professionnel" as const,
};

const DEFAULT_TOOLS_POLICY = {
  mode: "all" as const,
  enabledTools: [],
  disabledTools: [],
  citizenOnlyTools: [],
  agentOnlyTools: [],
};

const DEFAULT_LANGUAGES = {
  supported: ["fr", "en"],
  default: "fr",
  autoDetect: true,
};

const DEFAULT_AVAILABILITY = {
  mode: "always" as const,
};

const DEFAULT_ESCALATION = {
  triggerKeywords: ["urgence", "plainte", "réclamation"],
  triggerSentiment: "negative_only" as const,
  maxTurnsBeforeSuggestHandoff: 8,
  handoffTarget: {
    type: "chat_standard" as const,
  },
  handoffMessage:
    "Je vous propose de parler directement avec un de nos agents. Un instant s'il vous plaît…",
};

const DEFAULT_MEMORY = {
  conversationRetentionDays: 90,
  learnFromConversations: false,
  shareAnalyticsWithPlatform: true,
};

// ─── Queries ──────────────────────────────────────────────

/**
 * Récupère la configuration iAsted d'une org.
 * Retourne null si jamais configurée (l'UI propose alors d'initialiser).
 */
export const getByOrgId = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    return config;
  },
});

/**
 * Version internal pour usage depuis actions (chat.ts).
 * N'applique pas d'auth — appelante doit vérifier l'accès.
 */
export const getByOrgIdInternal = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
  },
});

// ─── Mutations ────────────────────────────────────────────

/**
 * Upsert complet de la configuration iAsted (remplace intégralement).
 */
export const upsert = authMutation({
  args: {
    orgId: v.id("orgs"),
    persona: iAstedPersonaValidator,
    systemPromptSuffix: v.string(),
    customProcedures: v.optional(v.string()),
    priorityServices: v.optional(v.array(v.id("orgServices"))),
    knownLocalIssues: v.optional(v.array(iAstedLocalIssueValidator)),
    toolsPolicy: iAstedToolsPolicyValidator,
    languages: iAstedLanguagesValidator,
    availability: iAstedAvailabilityValidator,
    escalation: iAstedEscalationValidator,
    memory: iAstedMemoryValidator,
    quotas: v.optional(iAstedQuotasValidator),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const existing = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const payload = {
      orgId: args.orgId,
      persona: args.persona,
      systemPromptSuffix: args.systemPromptSuffix,
      customProcedures: args.customProcedures,
      priorityServices: args.priorityServices,
      knownLocalIssues: args.knownLocalIssues,
      toolsPolicy: args.toolsPolicy,
      languages: args.languages,
      availability: args.availability,
      escalation: args.escalation,
      memory: args.memory,
      quotas: args.quotas,
      isActive: args.isActive,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    };

    let configId;
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      configId = existing._id;
    } else {
      configId = await ctx.db.insert("orgIAstedConfig", payload);
    }

    await logCortexAction(ctx, {
      action: "UPSERT_IASTED_CONFIG",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgIAstedConfig",
      entiteId: configId,
      userId: ctx.user._id,
      apres: { orgId: args.orgId, personaName: args.persona.name },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    });

    return configId;
  },
});

/**
 * Initialise la config iAsted avec les valeurs par défaut.
 * Appelée au premier accès si aucune config n'existe encore.
 */
export const initializeDefaults = authMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const existing = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (existing) return existing._id;

    const org = await ctx.db.get(args.orgId);
    const personaName = org ? `Astedia ${org.shortName ?? org.name}` : "Astedia";

    return await ctx.db.insert("orgIAstedConfig", {
      orgId: args.orgId,
      persona: {
        ...DEFAULT_PERSONA,
        name: personaName,
      },
      systemPromptSuffix: `Tu es l'assistant IA de ${org?.name ?? "cette représentation diplomatique du Gabon"}. Tu aides les citoyens gabonais à l'étranger avec leurs démarches consulaires.`,
      toolsPolicy: DEFAULT_TOOLS_POLICY,
      languages: DEFAULT_LANGUAGES,
      availability: DEFAULT_AVAILABILITY,
      escalation: DEFAULT_ESCALATION,
      memory: DEFAULT_MEMORY,
      isActive: true,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });
  },
});

/**
 * Mutation granulaire : met à jour uniquement la persona.
 */
export const updatePersona = authMutation({
  args: {
    orgId: v.id("orgs"),
    persona: iAstedPersonaValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const config = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!config) {
      throw error(
        ErrorCode.NOT_FOUND,
        "Configuration iAsted non initialisée. Appelez initializeDefaults d'abord.",
      );
    }

    await ctx.db.patch(config._id, {
      persona: args.persona,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });

    return config._id;
  },
});

/**
 * Mutation granulaire : met à jour uniquement le prompt.
 */
export const updatePrompt = authMutation({
  args: {
    orgId: v.id("orgs"),
    systemPromptSuffix: v.string(),
    customProcedures: v.optional(v.string()),
    priorityServices: v.optional(v.array(v.id("orgServices"))),
    knownLocalIssues: v.optional(v.array(iAstedLocalIssueValidator)),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const config = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!config) {
      throw error(ErrorCode.NOT_FOUND, "Configuration iAsted non initialisée");
    }

    await ctx.db.patch(config._id, {
      systemPromptSuffix: args.systemPromptSuffix,
      customProcedures: args.customProcedures,
      priorityServices: args.priorityServices,
      knownLocalIssues: args.knownLocalIssues,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });

    return config._id;
  },
});

/**
 * Mutation granulaire : met à jour uniquement les tools.
 */
export const updateToolsPolicy = authMutation({
  args: {
    orgId: v.id("orgs"),
    toolsPolicy: iAstedToolsPolicyValidator,
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const config = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!config) {
      throw error(ErrorCode.NOT_FOUND, "Configuration iAsted non initialisée");
    }

    await ctx.db.patch(config._id, {
      toolsPolicy: args.toolsPolicy,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });

    return config._id;
  },
});

/**
 * Mutation granulaire : met à jour disponibilité + escalation + mémoire + quotas.
 */
export const updateBehavior = authMutation({
  args: {
    orgId: v.id("orgs"),
    languages: iAstedLanguagesValidator,
    availability: iAstedAvailabilityValidator,
    escalation: iAstedEscalationValidator,
    memory: iAstedMemoryValidator,
    quotas: v.optional(iAstedQuotasValidator),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const config = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!config) {
      throw error(ErrorCode.NOT_FOUND, "Configuration iAsted non initialisée");
    }

    await ctx.db.patch(config._id, {
      languages: args.languages,
      availability: args.availability,
      escalation: args.escalation,
      memory: args.memory,
      quotas: args.quotas,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });

    return config._id;
  },
});

/**
 * Active/désactive iAsted pour cette org.
 */
export const setActive = authMutation({
  args: {
    orgId: v.id("orgs"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const config = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!config) {
      throw error(ErrorCode.NOT_FOUND, "Configuration iAsted non initialisée");
    }

    await ctx.db.patch(config._id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });

    return config._id;
  },
});

// ─── Macros / réponses rapides (Plan Phase γ) ─────────────────────

/**
 * Liste les macros configurées pour l'org. Lecture — permission view.
 */
export const listMacros = authQuery({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    return config?.macros ?? [];
  },
});

/**
 * Remplace la liste complète des macros d'une org.
 * Permission : settings.manage.
 */
export const updateMacros = authMutation({
  args: {
    orgId: v.id("orgs"),
    macros: v.array(iAstedMacroValidator),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const config = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!config) {
      throw error(
        ErrorCode.NOT_FOUND,
        "Configuration iAsted non initialisée. Appelez initializeDefaults d'abord.",
      );
    }

    await ctx.db.patch(config._id, {
      macros: args.macros,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });
    return config._id;
  },
});

/**
 * Incrémente le compteur d'usage d'une macro — pour tri adaptatif (top-3).
 * Appelée côté client après insertion effective d'une macro dans le composer.
 */
export const incrementMacroUsage = authMutation({
  args: {
    orgId: v.id("orgs"),
    macroId: v.string(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();
    if (!config || !config.macros) return { updated: false };

    const updated = config.macros.map((m) =>
      m.id === args.macroId
        ? { ...m, usageCount: (m.usageCount ?? 0) + 1 }
        : m,
    );
    await ctx.db.patch(config._id, { macros: updated });
    return { updated: true };
  },
});

/**
 * Catalogue des tools disponibles dans `convex/ai/tools.ts` pour l'UI.
 * Retourne un registre statique (code + catégorie + description i18n).
 */
export const listToolsCatalog = authQuery({
  args: {},
  handler: async () => {
    return TOOLS_CATALOG;
  },
});

// Catalogue statique des tools — mis à jour en phase avec convex/ai/tools.ts
const TOOLS_CATALOG = [
  // Navigation
  {
    category: "navigation",
    categoryLabelFr: "Navigation",
    tools: [
      { code: "navigateTo", labelFr: "Naviguer vers une page" },
      { code: "openMyRequests", labelFr: "Ouvrir mes demandes" },
      { code: "openMyDocuments", labelFr: "Ouvrir mes documents" },
    ],
  },
  // Données utilisateur
  {
    category: "user_data",
    categoryLabelFr: "Données utilisateur",
    tools: [
      { code: "getMyProfile", labelFr: "Lire mon profil" },
      { code: "getMyMailboxes", labelFr: "Lire ma boîte iBoîte" },
      { code: "getMyAppointments", labelFr: "Lire mes rendez-vous" },
      { code: "getMyRequests", labelFr: "Lire mes demandes" },
      { code: "getMyConsularCard", labelFr: "Lire ma carte consulaire" },
    ],
  },
  // Services
  {
    category: "services",
    categoryLabelFr: "Services consulaires",
    tools: [
      { code: "listServices", labelFr: "Lister les services disponibles" },
      { code: "getServiceDetails", labelFr: "Détails d'un service" },
      { code: "startNewRequest", labelFr: "Démarrer une nouvelle demande" },
    ],
  },
  // RDV
  {
    category: "appointments",
    categoryLabelFr: "Rendez-vous",
    tools: [
      { code: "getAvailableSlots", labelFr: "Voir les créneaux disponibles" },
      { code: "bookAppointment", labelFr: "Réserver un rendez-vous" },
      { code: "cancelAppointment", labelFr: "Annuler un rendez-vous" },
    ],
  },
  // Documents
  {
    category: "documents",
    categoryLabelFr: "Documents",
    tools: [
      { code: "uploadDocument", labelFr: "Téléverser un document" },
      { code: "analyzeDocument", labelFr: "Analyser un document" },
      { code: "listMyDocuments", labelFr: "Lister mes documents" },
    ],
  },
  // Communication
  {
    category: "communication",
    categoryLabelFr: "Communication",
    tools: [
      { code: "sendMessage", labelFr: "Envoyer un message" },
      { code: "getRepresentationContacts", labelFr: "Liste des contacts" },
      { code: "callOrganization", labelFr: "Appeler l'organisation" },
    ],
  },
  // Agents (internes)
  {
    category: "agent_only",
    categoryLabelFr: "Réservés aux agents",
    tools: [
      { code: "searchCitizens", labelFr: "Rechercher des citoyens" },
      { code: "assignRequest", labelFr: "Assigner une demande" },
      { code: "generateReport", labelFr: "Générer un rapport" },
    ],
  },
];
