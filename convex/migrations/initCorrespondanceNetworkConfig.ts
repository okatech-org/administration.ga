/**
 * Initialise le singleton `correspondanceNetworkConfig`.
 *
 * Doit être lancé une seule fois après le déploiement du schéma. Idempotent :
 * si le document existe déjà, ne fait rien.
 *
 * Invocation manuelle (dashboard Convex) :
 *   internal.migrations.initCorrespondanceNetworkConfig.run
 *
 * Valeurs seed reprises de `STANDARD_TYPES` dans
 * `convex/functions/correspondanceConfig.ts` pour cohérence avec ce qui
 * était jusqu'ici injecté par `initializeDefaultTypes` (par-org).
 */

import { internalMutation } from "../_generated/server";

const STANDARD_TYPES = [
  {
    typeCode: "note_verbale",
    label: { fr: "Note Verbale", en: "Verbal Note" },
    description: {
      fr: "Communication diplomatique formelle entre États",
      en: "Formal diplomatic communication between States",
    },
    enabledByDefault: true,
    workflowConfig: {
      requiresApproval: true,
      approvalChain: [
        {
          ordre: 1,
          roleMinimum: "chief",
          conditionType: "if_external" as const,
        },
      ],
      autoRouteByHierarchy: true,
    },
    prioriteParDefaut: "normal",
    confidentialiteParDefaut: "standard",
  },
  {
    typeCode: "lettre_officielle",
    label: { fr: "Lettre Officielle", en: "Official Letter" },
    description: {
      fr: "Correspondance officielle signée par le chef de poste",
      en: "Official correspondence signed by the head of mission",
    },
    enabledByDefault: true,
    workflowConfig: {
      requiresApproval: true,
      approvalChain: [
        {
          ordre: 1,
          roleMinimum: "chief",
          conditionType: "always" as const,
        },
      ],
      autoRouteByHierarchy: true,
    },
    prioriteParDefaut: "normal",
    confidentialiteParDefaut: "standard",
  },
  {
    typeCode: "circulaire",
    label: { fr: "Circulaire", en: "Circular" },
    description: {
      fr: "Communication interne de diffusion générale",
      en: "Internal general distribution communication",
    },
    enabledByDefault: true,
    workflowConfig: {
      requiresApproval: false,
      approvalChain: [],
      autoRouteByHierarchy: false,
    },
    prioriteParDefaut: "normal",
    confidentialiteParDefaut: "standard",
  },
  {
    typeCode: "telegramme",
    label: { fr: "Télégramme", en: "Telegram" },
    description: {
      fr: "Communication urgente à circuit court",
      en: "Urgent short-circuit communication",
    },
    enabledByDefault: true,
    workflowConfig: {
      requiresApproval: true,
      approvalChain: [
        {
          ordre: 1,
          roleMinimum: "deputy_chief",
          conditionType: "always" as const,
        },
      ],
      autoRouteByHierarchy: false,
    },
    prioriteParDefaut: "urgent",
    confidentialiteParDefaut: "confidentiel",
  },
  {
    typeCode: "memorandum",
    label: { fr: "Mémorandum", en: "Memorandum" },
    description: {
      fr: "Note interne d'information ou de synthèse",
      en: "Internal information or summary note",
    },
    enabledByDefault: true,
    workflowConfig: {
      requiresApproval: false,
      approvalChain: [],
      autoRouteByHierarchy: false,
    },
    prioriteParDefaut: "normal",
    confidentialiteParDefaut: "standard",
  },
  {
    typeCode: "communique",
    label: { fr: "Communiqué", en: "Communiqué" },
    description: {
      fr: "Communication publique officielle",
      en: "Official public communication",
    },
    enabledByDefault: true,
    workflowConfig: {
      requiresApproval: true,
      approvalChain: [
        {
          ordre: 1,
          roleMinimum: "chief",
          conditionType: "always" as const,
        },
      ],
      autoRouteByHierarchy: false,
    },
    prioriteParDefaut: "normal",
    confidentialiteParDefaut: "standard",
  },
];

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("correspondanceNetworkConfig")
      .withIndex("by_singleton", (q) => q.eq("isSingleton", true))
      .first();

    if (existing) {
      return {
        status: "already_initialized",
        id: existing._id,
        types: existing.standardTypes.length,
      };
    }

    const id = await ctx.db.insert("correspondanceNetworkConfig", {
      isSingleton: true,
      // Format diplomatique par défaut, repris de l'existant per-org
      referencePattern: "DIPL/{YYYY}/{TYPE}/{NNNNN}",
      autoRouteByHierarchy: true,
      chiefApprovalRequired: false,
      signatureDefaults: {
        defaultLevel: 1, // simple (sceau serveur)
      },
      watermarkDefaults: {
        enabled: false,
      },
      standardTypes: STANDARD_TYPES,
      updatedAt: Date.now(),
    });

    return { status: "created", id, types: STANDARD_TYPES.length };
  },
});
