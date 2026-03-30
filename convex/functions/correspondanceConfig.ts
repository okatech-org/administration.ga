/**
 * iCorrespondance — Configuration des types par organisation
 *
 * Chaque organisation peut configurer ses types de correspondance,
 * les workflows d'approbation associés, et les modèles/templates.
 */

import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";

// ─── Standard type definitions ──────────────────────────────────────────────

const STANDARD_TYPES = [
  {
    typeCode: "note_verbale",
    label: { fr: "Note Verbale", en: "Verbal Note" },
    description: { fr: "Communication diplomatique formelle entre États", en: "Formal diplomatic communication between States" },
    workflowConfig: {
      requiresApproval: true,
      approvalChain: [{ ordre: 1, roleMinimum: "chief", conditionType: "if_external" as const }],
      autoRouteByHierarchy: true,
    },
    prioriteParDefaut: "normal",
    confidentialiteParDefaut: "standard",
  },
  {
    typeCode: "lettre_officielle",
    label: { fr: "Lettre Officielle", en: "Official Letter" },
    description: { fr: "Correspondance officielle signée par le chef de poste", en: "Official correspondence signed by the head of mission" },
    workflowConfig: {
      requiresApproval: true,
      approvalChain: [{ ordre: 1, roleMinimum: "chief", conditionType: "always" as const }],
      autoRouteByHierarchy: true,
    },
    prioriteParDefaut: "normal",
    confidentialiteParDefaut: "standard",
  },
  {
    typeCode: "circulaire",
    label: { fr: "Circulaire", en: "Circular" },
    description: { fr: "Communication interne de diffusion générale", en: "Internal general distribution communication" },
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
    description: { fr: "Communication urgente à circuit court", en: "Urgent short-circuit communication" },
    workflowConfig: {
      requiresApproval: true,
      approvalChain: [{ ordre: 1, roleMinimum: "deputy_chief", conditionType: "always" as const }],
      autoRouteByHierarchy: false,
    },
    prioriteParDefaut: "urgent",
    confidentialiteParDefaut: "confidentiel",
  },
  {
    typeCode: "memorandum",
    label: { fr: "Mémorandum", en: "Memorandum" },
    description: { fr: "Note interne d'information ou de synthèse", en: "Internal information or summary note" },
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
    description: { fr: "Communication publique officielle", en: "Official public communication" },
    workflowConfig: {
      requiresApproval: true,
      approvalChain: [{ ordre: 1, roleMinimum: "chief", conditionType: "always" as const }],
      autoRouteByHierarchy: false,
    },
    prioriteParDefaut: "normal",
    confidentialiteParDefaut: "standard",
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═════════════════════════════════════════════════════════════════════════════

/** Lister les configurations de types pour une organisation */
export const listTypeConfigs = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("correspondanceTypeConfigs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

/** Obtenir une configuration de type par ID */
export const getTypeConfig = authQuery({
  args: { configId: v.id("correspondanceTypeConfigs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.configId);
  },
});

/** Obtenir la config pour un type donné dans une org */
export const getTypeConfigByCode = authQuery({
  args: {
    orgId: v.id("orgs"),
    typeCode: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("correspondanceTypeConfigs")
      .withIndex("by_org_type", (q) =>
        q.eq("orgId", args.orgId).eq("typeCode", args.typeCode),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═════════════════════════════════════════════════════════════════════════════

/** Initialiser les types standard pour une organisation */
export const initializeDefaultTypes = authMutation({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Vérifier qu'il n'y a pas déjà de configs
    const existing = await ctx.db
      .query("correspondanceTypeConfigs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    if (existing.length > 0) {
      return { created: 0, message: "Types déjà initialisés" };
    }

    let created = 0;
    for (const type of STANDARD_TYPES) {
      await ctx.db.insert("correspondanceTypeConfigs", {
        orgId: args.orgId,
        typeCode: type.typeCode,
        label: type.label,
        description: type.description,
        isCustom: false,
        isActive: true,
        workflowConfig: type.workflowConfig,
        prioriteParDefaut: type.prioriteParDefaut,
        confidentialiteParDefaut: type.confidentialiteParDefaut,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    return { created, message: `${created} types standard créés` };
  },
});

/** Créer un type personnalisé */
export const createTypeConfig = authMutation({
  args: {
    orgId: v.id("orgs"),
    typeCode: v.string(),
    label: v.object({ fr: v.string(), en: v.optional(v.string()) }),
    description: v.optional(v.object({ fr: v.string(), en: v.optional(v.string()) })),
    workflowConfig: v.object({
      requiresApproval: v.boolean(),
      approvalChain: v.array(v.object({
        ordre: v.number(),
        roleMinimum: v.string(),
        organismeId: v.optional(v.id("orgs")),
        conditionType: v.union(
          v.literal("always"),
          v.literal("if_recipient_rank_above"),
          v.literal("if_external"),
        ),
        conditionValue: v.optional(v.string()),
      })),
      autoRouteByHierarchy: v.boolean(),
    }),
    prioriteParDefaut: v.optional(v.string()),
    confidentialiteParDefaut: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Vérifier l'unicité du typeCode dans l'org
    const existing = await ctx.db
      .query("correspondanceTypeConfigs")
      .withIndex("by_org_type", (q) =>
        q.eq("orgId", args.orgId).eq("typeCode", args.typeCode),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();

    if (existing) {
      throw new Error(`Le type "${args.typeCode}" existe déjà pour cette organisation`);
    }

    return await ctx.db.insert("correspondanceTypeConfigs", {
      orgId: args.orgId,
      typeCode: args.typeCode,
      label: args.label,
      description: args.description,
      isCustom: true,
      isActive: true,
      workflowConfig: args.workflowConfig,
      prioriteParDefaut: args.prioriteParDefaut,
      confidentialiteParDefaut: args.confidentialiteParDefaut,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Mettre à jour un type (label, workflow, template, etc.) */
export const updateTypeConfig = authMutation({
  args: {
    configId: v.id("correspondanceTypeConfigs"),
    label: v.optional(v.object({ fr: v.string(), en: v.optional(v.string()) })),
    description: v.optional(v.object({ fr: v.string(), en: v.optional(v.string()) })),
    isActive: v.optional(v.boolean()),
    templateStorageId: v.optional(v.id("_storage")),
    headerConfig: v.optional(v.object({
      logoStorageId: v.optional(v.id("_storage")),
      headerText: v.optional(v.string()),
      footerText: v.optional(v.string()),
    })),
    workflowConfig: v.optional(v.object({
      requiresApproval: v.boolean(),
      approvalChain: v.array(v.object({
        ordre: v.number(),
        roleMinimum: v.string(),
        organismeId: v.optional(v.id("orgs")),
        conditionType: v.union(
          v.literal("always"),
          v.literal("if_recipient_rank_above"),
          v.literal("if_external"),
        ),
        conditionValue: v.optional(v.string()),
      })),
      autoRouteByHierarchy: v.boolean(),
    })),
    referencePattern: v.optional(v.string()),
    prioriteParDefaut: v.optional(v.string()),
    confidentialiteParDefaut: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { configId, ...updates } = args;
    const config = await ctx.db.get(configId);
    if (!config) throw new Error("Configuration introuvable");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (updates.label !== undefined) patch.label = updates.label;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.isActive !== undefined) patch.isActive = updates.isActive;
    if (updates.templateStorageId !== undefined) patch.templateStorageId = updates.templateStorageId;
    if (updates.headerConfig !== undefined) patch.headerConfig = updates.headerConfig;
    if (updates.workflowConfig !== undefined) patch.workflowConfig = updates.workflowConfig;
    if (updates.referencePattern !== undefined) patch.referencePattern = updates.referencePattern;
    if (updates.prioriteParDefaut !== undefined) patch.prioriteParDefaut = updates.prioriteParDefaut;
    if (updates.confidentialiteParDefaut !== undefined) patch.confidentialiteParDefaut = updates.confidentialiteParDefaut;

    await ctx.db.patch(configId, patch);
  },
});

/** Désactiver un type (soft-delete) */
export const deactivateTypeConfig = authMutation({
  args: { configId: v.id("correspondanceTypeConfigs") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.configId, {
      isActive: false,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
