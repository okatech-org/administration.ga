import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { error, ErrorCode } from "./errors";
import { UserRole, PermissionEffect } from "./constants";
import type { TaskCodeValue } from "./taskCodes";
import { ALL_MODULE_CODES, type ModuleCodeValue, type ModuleAccessLevel, resolveTaskCodesFromModuleAccess } from "./moduleCodes";

// ============================================
// Types
// ============================================

type AuthContext = QueryCtx | MutationCtx;

// ============================================
// Core Permission Checks
// ============================================

/**
 * Check if user has platform-level superadmin access
 */
export function isSuperAdmin(user: Doc<"users">): boolean {
  return user.isSuperadmin === true || user.role === UserRole.SuperAdmin;
}

// ============================================
// Position-Based Task Resolution
// ============================================

/**
 * Resolve all task codes for a membership via:
 *   1. Si position.moduleAccess existe → dérive les tasks via MODULE_ACCESS_TASKS
 *   2. Sinon → fallback sur position.tasks[] (backward compat)
 *
 * Le point pivot : changer la résolution ici impacte TOUT le système
 * (canDoTask, useCanDoTask, sidebar, pages) automatiquement.
 */
export async function getTasksForMembership(
  ctx: AuthContext,
  membership: Doc<"memberships">,
): Promise<Set<string>> {
  if (!membership.positionId) return new Set();

  const position = await ctx.db.get(membership.positionId);
  if (!position || !position.isActive) {
    return new Set();
  }

  // Priorité 1 : moduleAccess (nouveau système structuré)
  const moduleAccess = (position as any).moduleAccess as
    Array<{ moduleCode: string; accessLevel: ModuleAccessLevel }> | undefined;

  if (moduleAccess && moduleAccess.length > 0) {
    return resolveTaskCodesFromModuleAccess(moduleAccess);
  }

  // Priorité 2 : tasks[] (legacy, backward compat)
  if (position.tasks && position.tasks.length > 0) {
    return new Set(position.tasks);
  }

  return new Set();
}

// ============================================
// Task-Based Authorization
// ============================================

/**
 * Check if a specific membership can perform a task code.
 *
 * Check order:
 * 1. SuperAdmin → always allowed
 * 2. No membership → denied
 * 3. Dynamic special permissions (deny takes precedence)
 * 4. Org-level module check (is this feature activated for the org?)
 * 5. Position → tasks
 */
export async function canDoTask(
  ctx: AuthContext,
  user: Doc<"users">,
  membership: Doc<"memberships"> | null | undefined,
  taskCode: TaskCodeValue,
): Promise<boolean> {
  // SuperAdmin always can
  if (isSuperAdmin(user)) return true;
  if (!membership) return false;

  // Check inline special permissions first (per-me mber overrides)
  const overrideEffect = checkSpecialPermission(membership, taskCode);
  if (overrideEffect === PermissionEffect.Deny) return false;
  if (overrideEffect === PermissionEffect.Grant) return true;

  // Org-level module check: is this feature activated for the org?
  // Only applies when the task code prefix maps to a known module code.
  // Task prefixes like "org" or "schedules" that don't correspond to a
  // toggleable module are skipped — access is controlled by position tasks only.
  const moduleCode = taskCode.split(".")[0];

  const org = await ctx.db.get(membership.orgId);
  if (
    org?.modules &&
    ALL_MODULE_CODES.includes(moduleCode as ModuleCodeValue) &&
    !org.modules.includes(moduleCode as any)
  ) {
    return false;
  }

  // Resolve from position → tasks
  const tasks = await getTasksForMembership(ctx, membership);
  return tasks.has(taskCode);
}

/**
 * Assert that a member can perform a task, throw if not.
 */
export async function assertCanDoTask(
  ctx: AuthContext,
  user: Doc<"users">,
  membership: Doc<"memberships"> | null | undefined,
  taskCode: TaskCodeValue,
): Promise<void> {
  const allowed = await canDoTask(ctx, user, membership, taskCode);
  if (!allowed) {
    throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
  }
}

// ============================================
// Inline Special Permissions (per-member overrides)
// ============================================

/**
 * Check if a special permission entry exists on a membership.
 * Returns the effect ("grant" | "deny") or null if no entry found.
 */
export function checkSpecialPermission(
  membership: Doc<"memberships"> | null | undefined,
  taskCode: string,
): string | null {
  if (!membership?.specialPermissions?.length) return null;
  const entry = membership.specialPermissions.find((p) => p.taskCode === taskCode);
  return entry?.effect ?? null;
}

/**
 * Check if a member has access to a specific feature.
 * Features must be explicitly granted — no fallback.
 */
export function hasFeature(
  user: Doc<"users">,
  membership: Doc<"memberships"> | null | undefined,
  feature: string,
): boolean {
  if (isSuperAdmin(user)) return true;
  if (!membership) return false;
  return checkSpecialPermission(membership, `feature.${feature}`) === PermissionEffect.Grant;
}

// ============================================
// Synchronous Permission Check (preloaded data)
// ============================================

/**
 * Check permission using preloaded task set (for frontend queries).
 * Use when you've already resolved tasks via getTasksForMembership.
 */
export function hasPermissionSync(
  user: Doc<"users">,
  resolvedTasks: Set<string>,
  taskCode: TaskCodeValue,
  specialPermissions?: Array<{ taskCode: string; effect: string }>,
): boolean {
  if (isSuperAdmin(user)) return true;

  // Check inline overrides
  if (specialPermissions?.length) {
    const entry = specialPermissions.find((p) => p.taskCode === taskCode);
    if (entry?.effect === PermissionEffect.Deny) return false;
    if (entry?.effect === PermissionEffect.Grant) return true;
  }

  return resolvedTasks.has(taskCode);
}

