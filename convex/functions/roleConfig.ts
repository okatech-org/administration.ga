import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { requireAuth, getMembership } from "../lib/auth";
import { isSuperAdmin, assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { localizedStringValidator } from "../lib/validators";
import {
  POSITION_GRADES,
  POSITION_TASK_PRESETS,
  ORGANIZATION_TEMPLATES,
  getOrgTemplate,
  getPresetTasks,
  type OrgTemplateType,
} from "../lib/roles";
import { ALL_TASK_CODES, TASK_RISK, type TaskCodeValue, type TaskCategory, taskCodeValidator } from "../lib/taskCodes";
import { moduleCodeValidator, accessLevelValidator, type ModuleCodeValue, CORE_MODULE_CODES, MODULE_REGISTRY, getDefaultCapabilities } from "../lib/moduleCodes";

// ═══════════════════════════════════════════════════════════════
// QUERIES — Static catalogs
// ═══════════════════════════════════════════════════════════════

/**
 * Get the full task catalog (static, from code)
 */
export const getTaskCatalog = query({
  args: {},
  handler: async () => {
    return ALL_TASK_CODES.map((code) => ({
      code,
      category: code.split(".")[0] as TaskCategory,
      risk: TASK_RISK[code as TaskCodeValue],
    }));
  },
});

/**
 * Get all available organization templates (static)
 */
export const getOrgTemplates = query({
  args: {},
  handler: async () => {
    return ORGANIZATION_TEMPLATES;
  },
});

/**
 * Get default system role modules (static)
 */
export const getSystemRoleModules = query({
  args: {},
  handler: async () => {
    return POSITION_TASK_PRESETS;
  },
});


/**
 * Get all positions for an organization
 */
export const getOrgPositions = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query("positions")
      .withIndex("by_org", (q) => q.eq("orgId", orgId).eq("isActive", true))
      .collect();
  },
});

/**
 * List all positions across all organizations (superadmin)
 */
export const listAllPositions = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    if (!isSuperAdmin(user)) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const positions = await ctx.db.query("positions").take(500);
    // Enrich with org info
    const enriched = await Promise.all(
      positions.map(async (p) => {
        const org = await ctx.db.get(p.orgId);
        return {
          ...p,
          orgName: org?.name ?? "",
          orgSlug: org?.slug ?? "",
        };
      }),
    );
    return enriched;
  },
});

/**
 * Get full role configuration for an organization
 * (positions + ministry groups + system presets from code)
 */
export const getOrgFullRoleConfig = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId }) => {
    const positions = await ctx.db
      .query("positions")
      .withIndex("by_org", (q) => q.eq("orgId", orgId).eq("isActive", true))
      .collect();

    const ministryGroups = await ctx.db
      .query("ministryGroups")
      .withIndex("by_org", (q) => q.eq("orgId", orgId).eq("isActive", true))
      .collect();

    return {
      positions: positions.filter((p) => !p.deletedAt),
      ministryGroups: ministryGroups.filter((m) => !m.deletedAt),
      systemModules: POSITION_TASK_PRESETS,
    };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize organization roles from a template
 * Creates positions and optionally custom role modules
 */
export const initializeFromTemplate = mutation({
  args: {
    orgId: v.id("orgs"),
    templateType: v.string(),
  },
  handler: async (ctx, { orgId, templateType }) => {
    const user = await requireAuth(ctx);
    if (!isSuperAdmin(user)) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const template = getOrgTemplate(templateType as OrgTemplateType);
    if (!template) {
      throw error(ErrorCode.TEMPLATE_NOT_FOUND);
    }

    const now = Date.now();

    // Check if already initialized
    const existingPositions = await ctx.db
      .query("positions")
      .withIndex("by_org", (q) => q.eq("orgId", orgId).eq("isActive", true))
      .first();

    if (existingPositions) {
      throw error(ErrorCode.ROLE_CONFIG_ALREADY_INITIALIZED);
    }

    // Create ministry groups if the template has them
    const ministryGroupIds: Record<string, Id<"ministryGroups">> = {};
    if (template.ministryGroups) {
      for (const group of template.ministryGroups) {
        const id = await ctx.db.insert("ministryGroups", {
          orgId,
          code: group.code,
          label: group.label,
          description: group.description,
          icon: group.icon,
          sortOrder: group.sortOrder,
          parentCode: group.parentCode,
          isActive: true,
          createdBy: user._id,
        });
        ministryGroupIds[group.code] = id;
      }
    }

    // Create positions
    for (const pos of template.positions) {
      await ctx.db.insert("positions", {
        orgId,
        code: pos.code,
        title: pos.title,
        description: pos.description,
        level: pos.level,
        grade: pos.grade,
        ministryGroupId: pos.ministryCode
          ? ministryGroupIds[pos.ministryCode]
          : undefined,
        tasks: getPresetTasks(pos.taskPresets),
        moduleAccess: pos.moduleAccess,
        isRequired: pos.isRequired,
        isActive: true,
        createdBy: user._id,
        updatedAt: now,
      });
    }

    // Set org modules from template
    await ctx.db.patch(orgId, { modules: template.modules });

    return { success: true, positionsCreated: template.positions.length };
  },
});

/**
 * Reset organization roles and re-apply template
 */
export const resetToTemplate = mutation({
  args: {
    orgId: v.id("orgs"),
    templateType: v.string(),
  },
  handler: async (ctx, { orgId, templateType }) => {
    const user = await requireAuth(ctx);
    if (!isSuperAdmin(user)) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const template = getOrgTemplate(templateType as OrgTemplateType);
    if (!template) {
      throw error(ErrorCode.TEMPLATE_NOT_FOUND);
    }

    const now = Date.now();

    // Soft-delete existing positions
    const existingPositions = await ctx.db
      .query("positions")
      .withIndex("by_org", (q) => q.eq("orgId", orgId).eq("isActive", true))
      .collect();

    for (const pos of existingPositions) {
      await ctx.db.patch(pos._id, { isActive: false, deletedAt: now });
    }

    // Soft-delete existing ministry groups
    const existingGroups = await ctx.db
      .query("ministryGroups")
      .withIndex("by_org", (q) => q.eq("orgId", orgId).eq("isActive", true))
      .collect();

    for (const group of existingGroups) {
      await ctx.db.patch(group._id, { isActive: false, deletedAt: now });
    }

    // Re-create ministry groups
    const ministryGroupIds: Record<string, Id<"ministryGroups">> = {};
    if (template.ministryGroups) {
      for (const group of template.ministryGroups) {
        const id = await ctx.db.insert("ministryGroups", {
          orgId,
          code: group.code,
          label: group.label,
          description: group.description,
          icon: group.icon,
          sortOrder: group.sortOrder,
          parentCode: group.parentCode,
          isActive: true,
          createdBy: user._id,
        });
        ministryGroupIds[group.code] = id;
      }
    }

    // Re-create positions
    for (const pos of template.positions) {
      await ctx.db.insert("positions", {
        orgId,
        code: pos.code,
        title: pos.title,
        description: pos.description,
        level: pos.level,
        grade: pos.grade,
        ministryGroupId: pos.ministryCode
          ? ministryGroupIds[pos.ministryCode]
          : undefined,
        tasks: getPresetTasks(pos.taskPresets),
        moduleAccess: pos.moduleAccess,
        isRequired: pos.isRequired,
        isActive: true,
        createdBy: user._id,
        updatedAt: now,
      });
    }

    // Set org modules from template
    await ctx.db.patch(orgId, { modules: template.modules });

    return { success: true, positionsCreated: template.positions.length };
  },
});

// ─── Position CRUD ──────────────────────────────────────

/**
 * Create a new position in an organization.
 * Accepte moduleAccess (nouveau) ou tasks (legacy).
 */
export const createPosition = mutation({
  args: {
    orgId: v.id("orgs"),
    code: v.string(),
    title: localizedStringValidator,
    description: v.optional(localizedStringValidator),
    level: v.number(),
    grade: v.optional(v.string()),
    ministryGroupId: v.optional(v.id("ministryGroups")),
    tasks: v.array(taskCodeValidator),
    moduleAccess: v.optional(v.array(v.object({
      moduleCode: moduleCodeValidator,
      accessLevel: accessLevelValidator,
    }))),
    isRequired: v.optional(v.boolean()),
    isUnique: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const callerMembership = await getMembership(ctx, user._id, args.orgId);
    await assertCanDoTask(ctx, user, callerMembership, "settings.manage");

    // Check uniqueness of code within org
    const existing = await ctx.db
      .query("positions")
      .withIndex("by_org_code", (q) =>
        q.eq("orgId", args.orgId).eq("code", args.code),
      )
      .first();

    if (existing && !existing.deletedAt) {
      throw error(ErrorCode.POSITION_CODE_EXISTS);
    }

    const id = await ctx.db.insert("positions", {
      ...args,
      isRequired: args.isRequired ?? false,
      isUnique: args.isUnique ?? false,
      isActive: true,
      createdBy: user._id,
      updatedAt: Date.now(),
    });

    // Mark org config as customized
    // Position CRUD tracked via updatedAt
    // await _markCustomized(ctx, args.orgId, user._id);

    return id;
  },
});

/**
 * Update an existing position.
 * Accepte moduleAccess (nouveau système) ou tasks (legacy).
 * Si moduleAccess est fourni, il prend la priorité sur tasks.
 */
export const updatePosition = mutation({
  args: {
    positionId: v.id("positions"),
    title: v.optional(localizedStringValidator),
    description: v.optional(localizedStringValidator),
    level: v.optional(v.number()),
    grade: v.optional(v.string()),
    ministryGroupId: v.optional(v.id("ministryGroups")),
    tasks: v.optional(v.array(taskCodeValidator)),
    moduleAccess: v.optional(v.array(v.object({
      moduleCode: moduleCodeValidator,
      accessLevel: accessLevelValidator,
    }))),
    isRequired: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    isUnique: v.optional(v.boolean()),
  },
  handler: async (ctx, { positionId, ...updates }) => {
    const existing = await ctx.db.get(positionId);
    if (!existing || existing.deletedAt) {
      throw error(ErrorCode.POSITION_NOT_FOUND);
    }
    const user = await requireAuth(ctx);
    const callerMembership = await getMembership(ctx, user._id, existing.orgId);
    await assertCanDoTask(ctx, user, callerMembership, "settings.manage");

    await ctx.db.patch(positionId, {
      ...updates,
      updatedAt: Date.now(),
    });

    // Position CRUD tracked via updatedAt
    // await _markCustomized(ctx, existing.orgId, user._id);

    return positionId;
  },
});

/**
 * Delete a position (soft delete)
 */
export const deletePosition = mutation({
  args: { positionId: v.id("positions") },
  handler: async (ctx, { positionId }) => {
    const existing = await ctx.db.get(positionId);
    if (!existing) {
      throw error(ErrorCode.POSITION_NOT_FOUND);
    }
    const user = await requireAuth(ctx);
    const callerMembership = await getMembership(ctx, user._id, existing.orgId);
    await assertCanDoTask(ctx, user, callerMembership, "settings.manage");

    if (existing.isRequired) {
      throw error(ErrorCode.POSITION_REQUIRED);
    }

    await ctx.db.patch(positionId, {
      isActive: false,
      deletedAt: Date.now(),
    });

    // Position CRUD tracked via updatedAt
    // await _markCustomized(ctx, existing.orgId, user._id);

    return true;
  },
});

/**
 * Move a position up or down in the hierarchy
 */
export const movePositionLevel = mutation({
  args: {
    positionId: v.id("positions"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { positionId, direction }) => {
    const position = await ctx.db.get(positionId);
    if (!position || position.deletedAt) {
      throw error(ErrorCode.POSITION_NOT_FOUND);
    }
    const user = await requireAuth(ctx);
    const callerMembership = await getMembership(ctx, user._id, position.orgId);
    await assertCanDoTask(ctx, user, callerMembership, "settings.manage");

    const newLevel =
      direction === "up"
        ? Math.max(1, position.level - 1)
        : position.level + 1;

    await ctx.db.patch(positionId, {
      level: newLevel,
      updatedAt: Date.now(),
    });

    // Position CRUD tracked via updatedAt
    // await _markCustomized(ctx, position.orgId, user._id);

    return newLevel;
  },
});



/**
 * Move a position to an adjacent grade (up or down in hierarchy)
 */
export const movePositionGrade = mutation({
  args: {
    positionId: v.id("positions"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { positionId, direction }) => {
    const position = await ctx.db.get(positionId);
    if (!position || position.deletedAt) {
      throw error(ErrorCode.POSITION_NOT_FOUND);
    }
    const user = await requireAuth(ctx);
    const callerMembership = await getMembership(ctx, user._id, position.orgId);
    await assertCanDoTask(ctx, user, callerMembership, "settings.manage");

    const gradeOrder = Object.keys(POSITION_GRADES);
    const currentGrade = position.grade || "agent";
    const currentIndex = gradeOrder.indexOf(currentGrade);

    let newIndex: number;
    if (direction === "up") {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(gradeOrder.length - 1, currentIndex + 1);
    }

    if (newIndex === currentIndex) {
      return { grade: currentGrade, changed: false };
    }

    const newGrade = gradeOrder[newIndex];
    await ctx.db.patch(positionId, {
      grade: newGrade,
      updatedAt: Date.now(),
    });

    return { grade: newGrade, changed: true };
  },
});

/**
 * Change a position's grade directly (for drag-and-drop)
 */
export const changePositionGrade = mutation({
  args: {
    positionId: v.id("positions"),
    newGrade: v.string(),
  },
  handler: async (ctx, { positionId, newGrade }) => {
    const position = await ctx.db.get(positionId);
    if (!position || position.deletedAt) {
      throw error(ErrorCode.POSITION_NOT_FOUND);
    }
    const user = await requireAuth(ctx);
    const callerMembership = await getMembership(ctx, user._id, position.orgId);
    await assertCanDoTask(ctx, user, callerMembership, "settings.manage");

    // Validate grade exists
    const gradeOrder = Object.keys(POSITION_GRADES);
    if (!gradeOrder.includes(newGrade)) {
      throw new Error(`Invalid grade: ${newGrade}`);
    }

    await ctx.db.patch(positionId, {
      grade: newGrade,
      updatedAt: Date.now(),
    });

    return { grade: newGrade };
  },
});

// ─── Ministry Group CRUD ────────────────────────────────

/**
 * Create a ministry group
 */
export const createMinistryGroup = mutation({
  args: {
    orgId: v.id("orgs"),
    code: v.string(),
    label: localizedStringValidator,
    description: v.optional(localizedStringValidator),
    icon: v.optional(v.string()),
    sortOrder: v.number(),
    parentCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (!isSuperAdmin(user)) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const existing = await ctx.db
      .query("ministryGroups")
      .withIndex("by_org_code", (q) =>
        q.eq("orgId", args.orgId).eq("code", args.code),
      )
      .first();

    if (existing && !existing.deletedAt) {
      throw error(ErrorCode.MINISTRY_GROUP_EXISTS);
    }

    return await ctx.db.insert("ministryGroups", {
      ...args,
      isActive: true,
      createdBy: user._id,
    });
  },
});

/**
 * Delete a ministry group (soft delete)
 */
export const deleteMinistryGroup = mutation({
  args: { groupId: v.id("ministryGroups") },
  handler: async (ctx, { groupId }) => {
    const user = await requireAuth(ctx);
    if (!isSuperAdmin(user)) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    await ctx.db.patch(groupId, {
      isActive: false,
      deletedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Update an existing ministry group
 */
export const updateMinistryGroup = mutation({
  args: {
    groupId: v.id("ministryGroups"),
    label: v.optional(localizedStringValidator),
    description: v.optional(localizedStringValidator),
    icon: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { groupId, ...updates }) => {
    const existing = await ctx.db.get(groupId);
    if (!existing || existing.deletedAt) {
      throw new Error("Ministry group not found");
    }
    const user = await requireAuth(ctx);
    const callerMembership = await getMembership(ctx, user._id, existing.orgId);
    await assertCanDoTask(ctx, user, callerMembership, "settings.manage");

    await ctx.db.patch(groupId, updates);
    return groupId;
  },
});

// ─── Organization Module Management ────────────────────

/**
 * Update the active modules for an organization
 * Core modules cannot be disabled.
 */
export const updateOrgModules = mutation({
  args: {
    orgId: v.id("orgs"),
    modules: v.array(moduleCodeValidator),
  },
  handler: async (ctx, { orgId, modules }) => {
    const user = await requireAuth(ctx);
    const callerMembership = await getMembership(ctx, user._id, orgId);
    await assertCanDoTask(ctx, user, callerMembership, "settings.manage");

    // Ensure all core modules are present
    const moduleSet = new Set(modules);
    for (const core of CORE_MODULE_CODES) {
      moduleSet.add(core);
    }

    await ctx.db.patch(orgId, {
      modules: Array.from(moduleSet) as ModuleCodeValue[],
      updatedAt: Date.now(),
    });
    return true;
  },
});

/**
 * Update org module config (v4) — with capabilities/sous-modules.
 * Écrit orgModuleConfig ET met à jour le champ flat modules[] (backward compat).
 */
export const updateOrgModuleConfig = mutation({
  args: {
    orgId: v.id("orgs"),
    config: v.array(v.object({
      moduleCode: moduleCodeValidator,
      enabled: v.boolean(),
      capabilities: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, { orgId, config }) => {
    const user = await requireAuth(ctx);
    const callerMembership = await getMembership(ctx, user._id, orgId);
    await assertCanDoTask(ctx, user, callerMembership, "settings.manage");

    // Les core modules restent toujours enabled
    const configMap = new Map(config.map((c) => [c.moduleCode, c]));
    for (const core of CORE_MODULE_CODES) {
      if (!configMap.has(core)) {
        configMap.set(core, { moduleCode: core, enabled: true });
      } else {
        const existing = configMap.get(core)!;
        existing.enabled = true;
      }
    }

    const finalConfig = Array.from(configMap.values());

    // Backward compat : mettre à jour le champ flat modules[]
    const enabledModules = finalConfig
      .filter((c) => c.enabled)
      .map((c) => c.moduleCode) as ModuleCodeValue[];

    await ctx.db.patch(orgId, {
      orgModuleConfig: finalConfig,
      modules: enabledModules,
      updatedAt: Date.now(),
    });
    return true;
  },
});

// ═══════════════════════════════════════════════════════════════
// MIGRATION — modules[] → orgModuleConfig[]
// ═══════════════════════════════════════════════════════════════

/**
 * Migration : pour chaque org ayant modules[] mais pas orgModuleConfig[],
 * crée orgModuleConfig avec enabled=true + toutes capabilities par défaut.
 * Appeler via le dashboard Convex : `npx convex run roleConfig:migrateOrgsToModuleConfig`
 */
export const migrateOrgsToModuleConfig = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("orgs").collect();
    let migrated = 0;

    for (const org of orgs) {
      // Sauter les orgs déjà migrées
      if (org.orgModuleConfig && (org.orgModuleConfig as any[]).length > 0) continue;

      const modules = (org.modules as string[]) ?? [];
      if (modules.length === 0) continue;

      const config = Object.values(MODULE_REGISTRY).map((def) => ({
        moduleCode: def.code,
        enabled: modules.includes(def.code) || def.isCore,
        capabilities: getDefaultCapabilities(def.code as ModuleCodeValue),
      }));

      await ctx.db.patch(org._id, {
        orgModuleConfig: config,
        updatedAt: Date.now(),
      });
      migrated++;
    }

    return { migrated, total: orgs.length };
  },
});

// ═══════════════════════════════════════════════════════════════
// INTERNAL — Dev helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Clear a temp password set by the Dev Account Switcher.
 * Called by the scheduler ~30s after the temp password was created.
 */
export const clearTempPassword = internalMutation({
  args: { accountId: v.union(v.string(), v.null()) },
  handler: async (ctx, { accountId }) => {
    if (!accountId) return;
    try {
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "account",
          where: [{ field: "_id", value: accountId }],
          update: { password: null },
        },
      } as any);
    } catch (err) {
      console.error("[clearTempPassword] error:", err);
    }
  },
});
