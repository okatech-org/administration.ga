import { v } from "convex/values";
import {
  authQuery,
  authMutation,
  superadminMutation,
  backofficeQuery,
} from "../lib/customFunctions";
import { permissionEffectValidator } from "../lib/validators";
import { getMembership } from "../lib/auth";
import { getTasksForMembership, isSuperAdmin, assertCanDoTask } from "../lib/permissions";
import { MODULE_ACCESS_TASKS, ALL_MODULE_CODES, type ModuleCodeValue } from "../lib/moduleCodes";
import { ALL_TASK_CODES, taskCodeValidator } from "../lib/taskCodes";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the current user's resolved task codes for an org.
 * Returns an array of task code strings like ["requests.view", "requests.process", ...].
 * Used by the frontend `useCanDoTask` hook.
 */
export const getMyTasks = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // Superadmin gets all tasks
    if (isSuperAdmin(ctx.user)) {
      return [...ALL_TASK_CODES];
    }

    // Find user's membership in this org
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", ctx.user._id).eq("orgId", args.orgId)
      )
      .first();

    if (!membership || membership.deletedAt) {
      return [];
    }

    const tasks = await getTasksForMembership(ctx, membership);
    return Array.from(tasks);
  },
});

/**
 * List special permissions for a member in an org (Org Admin)
 */
export const listByOrgMember = authQuery({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, callerMembership, "settings.manage");

    // Verify membership belongs to this org
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.orgId !== args.orgId || membership.deletedAt) {
      return [];
    }

    return membership.specialPermissions ?? [];
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Set (create or update) a special permission for a member in an org (Org Admin)
 */
export const setForOrgMember = authMutation({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.id("memberships"),
    taskCode: taskCodeValidator,
    effect: permissionEffectValidator,
  },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, callerMembership, "settings.manage");

    // Verify membership belongs to this org
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.orgId !== args.orgId || membership.deletedAt) {
      throw new Error("Membership not found in this organization");
    }

    const current = membership.specialPermissions ?? [];
    const updated = current.filter((p) => p.taskCode !== args.taskCode);
    updated.push({ taskCode: args.taskCode, effect: args.effect });

    await ctx.db.patch(args.membershipId, { specialPermissions: updated });
    return args.membershipId;
  },
});

/**
 * Set a special permission (SuperAdmin)
 */
export const set = superadminMutation({
  args: {
    membershipId: v.id("memberships"),
    taskCode: taskCodeValidator,
    effect: permissionEffectValidator,
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.deletedAt) {
      throw new Error("Membership not found");
    }

    const current = membership.specialPermissions ?? [];
    const updated = current.filter((p) => p.taskCode !== args.taskCode);
    updated.push({ taskCode: args.taskCode, effect: args.effect });

    await ctx.db.patch(args.membershipId, { specialPermissions: updated });
    return args.membershipId;
  },
});

/**
 * Remove a specific permission override for an org member (Org Admin)
 */
export const removeForOrgMember = authMutation({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.id("memberships"),
    taskCode: taskCodeValidator,
  },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, callerMembership, "settings.manage");

    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.orgId !== args.orgId || membership.deletedAt) {
      throw new Error("Membership not found in this organization");
    }

    const current = membership.specialPermissions ?? [];
    const updated = current.filter((p) => p.taskCode !== args.taskCode);

    await ctx.db.patch(args.membershipId, { specialPermissions: updated });
    return args.membershipId;
  },
});

/**
 * Reset all special permissions for a member (Org Admin)
 */
export const resetAllForOrgMember = authMutation({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const callerMembership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, callerMembership, "settings.manage");

    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.orgId !== args.orgId || membership.deletedAt) {
      throw new Error("Membership not found in this organization");
    }

    await ctx.db.patch(args.membershipId, { specialPermissions: [] });
    return args.membershipId;
  },
});

/**
 * Reset all special permissions for a membership (SuperAdmin)
 */
export const resetAll = superadminMutation({
  args: { membershipId: v.id("memberships") },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.deletedAt) {
      throw new Error("Membership not found");
    }

    await ctx.db.patch(args.membershipId, { specialPermissions: [] });
    return args.membershipId;
  },
});

// ═══════════════════════════════════════════════════════════════
// MENU PREVIEW — Résolution du menu pour un utilisateur donné
// ═══════════════════════════════════════════════════════════════

const MENU_MODULES = [
  { code: "profile", label: "iProfil", requires: null, section: "Commandes" },
  { code: "diplomatic_affairs", label: "Aff. Diplomatiques", requires: "intelligence.view", section: "Opérations" },
  { code: "consular_affairs", label: "Aff. Consulaires", requires: "requests.view", section: "Opérations" },
  { code: "news", label: "Actualités", requires: "communication.publish", section: "Opérations" },
  { code: "correspondence", label: "iCorrespondance", requires: "correspondance.view", section: "iBureau" },
  { code: "documents", label: "iDocument", requires: "documents.view", section: "iBureau" },
  { code: "calendar", label: "iAgenda", requires: "appointments.view", section: "iBureau" },
  { code: "messaging", label: "iCom", requires: null, section: "iBureau" },
  { code: "team", label: "Équipe", requires: "team.view", section: "Gestion" },
  { code: "payments", label: "Paiements", requires: "finance.view", section: "Gestion" },
  { code: "statistics", label: "Statistiques", requires: "analytics.view", section: "Gestion" },
  { code: "settings", label: "Paramètres", requires: "settings.view", section: "Administration" },
] as const;

/**
 * Calcule le menu résultant pour un utilisateur dans une org.
 * Le SuperAdmin voit tout, les autres voient selon org.modules + position.moduleAccess + specialPermissions.
 */
export const getResolvedMenuForUser = backofficeQuery({
  args: {
    userId: v.id("users"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, { userId, orgId }) => {
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org", (q) => q.eq("userId", userId).eq("orgId", orgId))
      .first();

    if (!membership || membership.deletedAt) return null;

    const org = await ctx.db.get(orgId);
    const orgModules = new Set<string>((org?.modules as string[]) ?? []);
    const hasOrgModules = orgModules.size > 0;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    if (isSuperAdmin(user)) {
      return {
        isSuperAdmin: true,
        modules: MENU_MODULES.map((m) => ({
          code: m.code, label: m.label, section: m.section,
          isVisible: true, accessLevel: "admin" as const, reason: "SuperAdmin",
        })),
      };
    }

    const resolvedTasks = await getTasksForMembership(ctx, membership);
    const specialPerms = membership.specialPermissions ?? [];
    for (const sp of specialPerms) {
      if (sp.effect === "grant") resolvedTasks.add(sp.taskCode);
      if (sp.effect === "deny") resolvedTasks.delete(sp.taskCode);
    }

    return {
      isSuperAdmin: false,
      modules: MENU_MODULES.map((m) => {
        const orgEnabled = !hasOrgModules || orgModules.has(m.code) || m.code === "profile";
        const hasTask = !m.requires || resolvedTasks.has(m.requires);
        const isVisible = orgEnabled && hasTask;

        let accessLevel: string | null = null;
        let reason = "";

        if (!orgEnabled) {
          reason = "Module désactivé";
        } else if (!hasTask) {
          reason = "Pas de permission";
        } else {
          const mapping = MODULE_ACCESS_TASKS[m.code as keyof typeof MODULE_ACCESS_TASKS];
          if (mapping) {
            for (const level of ["admin", "editor", "reader"] as const) {
              const requiredTasks = mapping[level];
              if (requiredTasks && requiredTasks.every((t: string) => resolvedTasks.has(t))) {
                accessLevel = level;
                break;
              }
            }
          }
          if (!accessLevel) accessLevel = "reader";
        }

        return { code: m.code, label: m.label, section: m.section, isVisible, accessLevel, reason };
      }),
    };
  },
});
