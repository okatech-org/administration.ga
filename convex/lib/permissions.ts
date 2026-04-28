import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { error, ErrorCode } from "./errors";
import { UserRole, PermissionEffect } from "./constants";
import type { TaskCodeValue } from "./taskCodes";
import { ALL_MODULE_CODES, MODULE_ACCESS_TASKS, type ModuleCodeValue, type ModuleAccessLevel, resolveTaskCodesFromModuleAccess } from "./moduleCodes";

/**
 * Reverse index : task code → canonical module code.
 * Permet de trouver le module canonique qui régit une task donnée
 * (les tasks gardent leurs préfixes legacy comme `requests.view` alors
 * que les modules ont été renommés en canonical comme `consular_affairs`).
 */
const TASK_TO_MODULE: Record<string, ModuleCodeValue> = (() => {
  const out: Record<string, ModuleCodeValue> = {};
  for (const [moduleCode, levels] of Object.entries(MODULE_ACCESS_TASKS)) {
    if (!levels) continue;
    const allTasks = new Set<string>([
      ...(levels.reader ?? []),
      ...(levels.editor ?? []),
      ...(levels.admin ?? []),
    ]);
    for (const task of allTasks) {
      out[task] = moduleCode as ModuleCodeValue;
    }
  }
  return out;
})();

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
  // Resolve the canonical module from the task via TASK_TO_MODULE
  // (les tasks gardent leurs préfixes legacy, les modules ont été renommés).
  // Tasks "org.*" / "schedules.*" sans entrée dans MODULE_ACCESS_TASKS sont
  // transversales — pas de gating module à appliquer.
  const canonicalModule = TASK_TO_MODULE[taskCode];

  const org = await ctx.db.get(membership.orgId);
  if (
    org?.modules &&
    canonicalModule &&
    ALL_MODULE_CODES.includes(canonicalModule) &&
    !(org.modules as string[]).includes(canonicalModule)
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

// ============================================
// Service-Level Access Resolution
// ============================================

/**
 * Résout le niveau d'accès effectif d'un poste pour un service spécifique.
 *
 * Si l'orgService a un serviceAccess défini → cherche le poste, retourne son niveau ou null.
 * Sinon → retourne le fallback (niveau d'accès du module "requests" sur le poste).
 */
export function resolveServiceAccessLevel(
  serviceAccess: Array<{ positionId: string; accessLevel: string }> | undefined,
  positionId: string,
  fallbackModuleLevel: string | null,
): string | null {
  // Pas de config spécifique → hériter du module
  if (!serviceAccess || serviceAccess.length === 0) {
    return fallbackModuleLevel;
  }

  // Chercher le poste dans la config spécifique
  const entry = serviceAccess.find((e) => e.positionId === positionId);
  return entry?.accessLevel ?? null;
}

// ============================================
// Service Access Authorization (Phase E.3)
// ============================================

/**
 * Hiérarchie des niveaux d'accès : admin > editor > reader.
 * Un niveau inclut tous les niveaux inférieurs.
 */
const ACCESS_LEVEL_RANK: Record<string, number> = {
  reader: 1,
  editor: 2,
  admin: 3,
};

/**
 * Vérifie si un niveau possédé couvre un niveau requis.
 * Exemple : "admin" inclut "editor" et "reader".
 */
export function accessLevelIncludes(
  owned: string | null | undefined,
  required: "reader" | "editor" | "admin",
): boolean {
  if (!owned) return false;
  const ownedRank = ACCESS_LEVEL_RANK[owned];
  const requiredRank = ACCESS_LEVEL_RANK[required];
  if (!ownedRank || !requiredRank) return false;
  return ownedRank >= requiredRank;
}

/**
 * Vérifie si un membership peut accéder à un service avec le niveau requis.
 *
 * Precedence (du plus spécifique au plus général) :
 *   1. `orgService.serviceAccess[positionId]` — override explicite au niveau service
 *   2. `position.moduleAccess["requests"]` — niveau d'accès du module
 *   3. `position.tasks[]` — fallback legacy
 *
 * Si l'utilisateur est superadmin → retourne `true`.
 */
export async function canAccessService(
  ctx: AuthContext,
  user: Doc<"users">,
  membership: Doc<"memberships"> | null | undefined,
  orgService: Doc<"orgServices">,
  requiredLevel: "reader" | "editor" | "admin",
): Promise<boolean> {
  if (isSuperAdmin(user)) return true;
  if (!membership?.positionId) return false;

  const position = await ctx.db.get(membership.positionId);
  if (!position || !position.isActive) return false;

  // 1. Override explicite au niveau service
  const explicit = (orgService as { serviceAccess?: Array<{ positionId: string; accessLevel: string }> })
    .serviceAccess?.find((entry) => entry.positionId === membership.positionId);
  if (explicit) {
    return accessLevelIncludes(explicit.accessLevel, requiredLevel);
  }

  // 2. Fallback sur moduleAccess["consular_affairs"] de la position
  const moduleAccess = (position as { moduleAccess?: Array<{ moduleCode: string; accessLevel: string }> })
    .moduleAccess?.find((m) => m.moduleCode === "consular_affairs");
  if (moduleAccess) {
    return accessLevelIncludes(moduleAccess.accessLevel, requiredLevel);
  }

  // 3. Fallback legacy : position.tasks[]
  const legacyTasks = (position as { tasks?: string[] }).tasks ?? [];
  if (requiredLevel === "reader") {
    return legacyTasks.includes("requests.view");
  }
  // editor / admin → nécessite requests.process ou plus
  return legacyTasks.includes("requests.process");
}

/**
 * Throw si le membership ne peut pas accéder au service avec le niveau requis.
 */
export async function assertCanAccessService(
  ctx: AuthContext,
  user: Doc<"users">,
  membership: Doc<"memberships"> | null | undefined,
  orgService: Doc<"orgServices">,
  requiredLevel: "reader" | "editor" | "admin",
): Promise<void> {
  const ok = await canAccessService(ctx, user, membership, orgService, requiredLevel);
  if (!ok) {
    throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
  }
}

// ============================================
// Citizen Contacts Access (Affaires consulaires)
// ============================================

/**
 * Modules qui caractérisent une représentation gérant les affaires consulaires.
 * Présence d'au moins l'un d'entre eux dans `org.modules` → l'org est consulaire
 * et a un accès "natif" aux contacts citoyens de sa juridiction.
 */
/**
 * Une org « gère les affaires consulaires » si le module `consular_affairs`
 * est activé.
 */
export function orgHandlesConsularAffairs(
  org: Doc<"orgs"> | null | undefined,
): boolean {
  const modules = org?.modules;
  if (!modules || modules.length === 0) return false;
  return (modules as string[]).includes("consular_affairs");
}

/**
 * Vérifie si un membership peut consulter les contacts citoyens rattachés
 * à son org (sa juridiction).
 *
 * Règles métier :
 *   1. SuperAdmin → toujours autorisé.
 *   2. Pas de membership → refusé.
 *   3. L'org doit soit gérer les affaires consulaires (modules consulaires),
 *      soit avoir activé explicitement le module `citizen_profiles`
 *      (cas ambassade non consulaire qui veut quand même l'annuaire).
 *   4. RBAC fin : la position/le membership doit avoir la task
 *      `citizen_profiles.view` (via moduleAccess, tasks legacy ou
 *      specialPermissions).
 *
 * Note : on n'utilise pas `canDoTask()` ici car ce dernier exigerait que
 * le module `citizen_profiles` soit activé sur l'org (étape 4 de canDoTask).
 * Or, dans le cas consulaire, on accorde l'accès même sans ce module — c'est
 * la présence d'un module consulaire spécifique qui ouvre le droit.
 */
export async function canViewCitizenContacts(
  ctx: AuthContext,
  user: Doc<"users">,
  membership: Doc<"memberships"> | null | undefined,
  org: Doc<"orgs"> | null | undefined,
): Promise<boolean> {
  // 1. SuperAdmin bypass
  if (isSuperAdmin(user)) return true;

  // 2. Membership requis
  if (!membership) return false;

  // 3. Gate org-level : module consulaire ou opt-in citizen_profiles
  const handlesConsular = orgHandlesConsularAffairs(org);
  const hasCitizenProfilesModule =
    (org?.modules as string[] | undefined)?.includes("citizen_profiles") ??
    false;
  if (!handlesConsular && !hasCitizenProfilesModule) return false;

  // 4. RBAC position/membership (sans repasser par canDoTask qui revérifierait
  // le module citizen_profiles)
  const overrideEffect = checkSpecialPermission(
    membership,
    "citizen_profiles.view",
  );
  if (overrideEffect === PermissionEffect.Deny) return false;
  if (overrideEffect === PermissionEffect.Grant) return true;

  const tasks = await getTasksForMembership(ctx, membership);
  return tasks.has("citizen_profiles.view");
}

