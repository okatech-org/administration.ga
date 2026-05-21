import type { Doc } from "@convex/_generated/dataModel";
import { PermissionEffect, UserRole } from "@convex/lib/constants";
import type { TaskCodeValue } from "@convex/lib/taskCodes";
import type { ReactNode } from "react";

// ============================================
// Types
// ============================================

/**
 * A single dynamic permission entry, as stored in the `permissions` table.
 */
export type DynamicPermission = {
	permission: string;
	effect: string; // "grant" | "deny"
};

/**
 * Context needed for permission checks.
 * `resolvedTasks` must be populated from the `getMyTasks` query.
 */
type PermissionContext = {
	user: Doc<"users">;
	membership?: Doc<"memberships">;
	/** Pre-resolved task codes from the backend (via getMyTasks) */
	resolvedTasks?: Set<string>;
	/** Dynamic permissions fetched from the DB for this membership */
	dynamicPermissions?: DynamicPermission[];
};

// ============================================
// Core Permission Checks
// ============================================

function isSuperAdmin(user: Doc<"users">): boolean {
	return user.isSuperadmin === true || user.role === UserRole.SuperAdmin;
}

/**
 * Look up a specific permission key in dynamic permissions.
 * Returns the effect ("grant" | "deny") or null if not found.
 */
function checkDynamic(
	dynamicPermissions: DynamicPermission[] | undefined,
	key: string,
): string | null {
	if (!dynamicPermissions?.length) return null;
	const entry = dynamicPermissions.find((p) => p.permission === key);
	return entry?.effect ?? null;
}

/**
 * Client-side permission check using task codes.
 *
 * Check order (mirrors backend):
 * 1. SuperAdmin bypass
 * 2. Dynamic deny → blocked
 * 3. Dynamic grant → allowed
 * 4. resolvedTasks.has(taskCode) → allowed/blocked
 *
 * No fallback. If resolvedTasks is empty/undefined → denied (except SuperAdmin).
 */
export function hasPermission(
	ctx: PermissionContext | null | undefined,
	taskCode: TaskCodeValue,
): boolean {
	if (!ctx?.user) return false;

	// 1. Superadmin bypass
	if (isSuperAdmin(ctx.user)) return true;

	// 2-3. Dynamic permissions (deny takes precedence)
	const dynamicEffect = checkDynamic(ctx.dynamicPermissions, taskCode);
	if (dynamicEffect === PermissionEffect.Deny) return false;
	if (dynamicEffect === PermissionEffect.Grant) return true;

	// 4. Check resolved tasks from position → modules
	if (!ctx.resolvedTasks) return false;
	return ctx.resolvedTasks.has(taskCode);
}

/**
 * Client-side feature permission check.
 * Features require an explicit "grant" in dynamic permissions;
 * there is no fallback.
 */
export function hasFeature(
	ctx: PermissionContext | null | undefined,
	feature: string,
): boolean {
	if (!ctx?.user) return false;
	if (isSuperAdmin(ctx.user)) return true;

	const effect = checkDynamic(ctx.dynamicPermissions, `feature.${feature}`);
	return effect === PermissionEffect.Grant;
}

/**
 * Check if user has platform-level role
 */
export function hasRole(
	user: Doc<"users"> | null | undefined,
	roles: UserRole[],
): boolean {
	if (!user) return false;
	if (isSuperAdmin(user)) return true;
	return user.role ? roles.includes(user.role as UserRole) : false;
}

// ============================================
// Permission Guard - Task-based permissions
// ============================================

type PermissionGuardProps = {
	ctx: PermissionContext | null | undefined;
	taskCode: TaskCodeValue;
	children: ReactNode;
	fallback?: ReactNode;
};

export function PermissionGuard({
	ctx,
	taskCode,
	children,
	fallback = null,
}: Readonly<PermissionGuardProps>): ReactNode {
	if (!hasPermission(ctx, taskCode)) {
		return fallback;
	}
	return children;
}

// ============================================
// Role Guard - Platform-level roles
// ============================================

type RoleGuardProps = {
	user: Doc<"users"> | null | undefined;
	roles: UserRole[];
	children: ReactNode;
	fallback?: ReactNode;
};

export function RoleGuard({
	user,
	roles,
	children,
	fallback = null,
}: Readonly<RoleGuardProps>): ReactNode {
	if (!hasRole(user, roles)) {
		return fallback;
	}
	return children;
}

// ============================================
// Feature Guard - Dynamic feature access
// ============================================

type FeatureGuardProps = {
	ctx: PermissionContext | null | undefined;
	feature: string;
	children: ReactNode;
	fallback?: ReactNode;
};

export function FeatureGuard({
	ctx,
	feature,
	children,
	fallback = null,
}: Readonly<FeatureGuardProps>): ReactNode {
	if (!hasFeature(ctx, feature)) {
		return fallback;
	}
	return children;
}

// ============================================
// Super Admin Guard
// ============================================

type SuperAdminGuardProps = {
	user: Doc<"users"> | null | undefined;
	children: ReactNode;
	fallback?: ReactNode;
};

export function SuperAdminGuard({
	user,
	children,
	fallback = null,
}: Readonly<SuperAdminGuardProps>): ReactNode {
	if (!user || !isSuperAdmin(user)) {
		return fallback;
	}
	return children;
}
