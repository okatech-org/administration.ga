import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";
import { localizedStringValidator } from "../lib/validators";
import { taskCodeValidator } from "../lib/taskCodes";
import { moduleCodeValidator } from "../lib/moduleCodes";

/**
 * Org Role Templates — CRUD pour les templates de rôles personnalisables
 * Phase C3
 */

const gradeValidator = v.union(
  v.literal("chief"),
  v.literal("deputy_chief"),
  v.literal("counselor"),
  v.literal("agent"),
  v.literal("external"),
);

const moduleAccessValidator = v.array(
  v.object({
    moduleCode: moduleCodeValidator,
    accessLevel: v.union(
      v.literal("reader"),
      v.literal("editor"),
      v.literal("admin"),
    ),
  }),
);

// ─── Queries ──────────────────────────────────────────────

/**
 * Liste tous les templates de rôles d'une org (non supprimés).
 */
export const listByOrg = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.view");

    const templates = await ctx.db
      .query("orgRoleTemplates")
      .withIndex("by_org_active", (q) =>
        q.eq("orgId", args.orgId).eq("deletedAt", undefined),
      )
      .collect();

    return templates;
  },
});

/**
 * Récupère un template par son ID.
 */
export const getById = authQuery({
  args: { templateId: v.id("orgRoleTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) return null;

    const membership = await getMembership(ctx, ctx.user._id, template.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.view");

    return template;
  },
});

// ─── Mutations ────────────────────────────────────────────

/**
 * Créer un template de rôle pour une org.
 */
export const create = authMutation({
  args: {
    orgId: v.id("orgs"),
    code: v.string(),
    name: localizedStringValidator,
    description: v.optional(localizedStringValidator),
    grade: v.optional(gradeValidator),
    taskPresets: v.array(taskCodeValidator),
    moduleAccess: v.optional(moduleAccessValidator),
    basedOnSystemTemplate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    // Validation : pas de doublon de code
    const existing = await ctx.db
      .query("orgRoleTemplates")
      .withIndex("by_org_code", (q) =>
        q.eq("orgId", args.orgId).eq("code", args.code),
      )
      .first();
    if (existing && !existing.deletedAt) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        `Un template avec le code "${args.code}" existe déjà`,
      );
    }

    const templateId = await ctx.db.insert("orgRoleTemplates", {
      orgId: args.orgId,
      code: args.code,
      name: args.name,
      description: args.description,
      grade: args.grade,
      taskPresets: args.taskPresets,
      moduleAccess: args.moduleAccess,
      basedOnSystemTemplate: args.basedOnSystemTemplate,
      usageCount: 0,
      createdBy: ctx.user._id,
      updatedAt: Date.now(),
    });

    await logCortexAction(ctx, {
      action: "CREATE_ROLE_TEMPLATE",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "orgRoleTemplates",
      entiteId: templateId,
      userId: ctx.user._id,
      apres: { code: args.code, orgId: args.orgId },
      signalType: SIGNAL_TYPES.ORG_MODIFIEE,
    });

    return templateId;
  },
});

/**
 * Met à jour un template existant.
 */
export const update = authMutation({
  args: {
    templateId: v.id("orgRoleTemplates"),
    name: v.optional(localizedStringValidator),
    description: v.optional(localizedStringValidator),
    grade: v.optional(gradeValidator),
    taskPresets: v.optional(v.array(taskCodeValidator)),
    moduleAccess: v.optional(moduleAccessValidator),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template || template.deletedAt) {
      throw error(ErrorCode.NOT_FOUND, "Template introuvable");
    }

    const membership = await getMembership(
      ctx,
      ctx.user._id,
      template.orgId,
    );
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    const { templateId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );

    await ctx.db.patch(templateId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });

    return templateId;
  },
});

/**
 * Supprime (soft delete) un template.
 */
export const remove = authMutation({
  args: { templateId: v.id("orgRoleTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) return;

    const membership = await getMembership(
      ctx,
      ctx.user._id,
      template.orgId,
    );
    await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

    await ctx.db.patch(args.templateId, { deletedAt: Date.now() });

    return args.templateId;
  },
});

/**
 * Incrémente le compteur d'utilisation (appelée quand on crée une position
 * depuis un template).
 */
export const incrementUsage = authMutation({
  args: { templateId: v.id("orgRoleTemplates") },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) return;

    await ctx.db.patch(args.templateId, {
      usageCount: (template.usageCount ?? 0) + 1,
    });
  },
});
