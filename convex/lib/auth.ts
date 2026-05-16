import {
  QueryCtx,
  MutationCtx,
  ActionCtx,
  internalQuery,
} from "../_generated/server"
import { Id } from "../_generated/dataModel"
import { v } from "convex/values"
import { error, ErrorCode } from "./errors"
import { UserRole } from "./constants"

type AuthContext = QueryCtx | MutationCtx

// ============================================
// Core Auth Functions
// ============================================

/**
 * Get user identity from auth provider
 */
export async function getIdentity(ctx: AuthContext | ActionCtx) {
  return await ctx.auth.getUserIdentity()
}

/**
 * Get the current user from database
 * Returns null if not authenticated or user not found
 */
export async function getCurrentUser(ctx: AuthContext) {
  const identity = await getIdentity(ctx)
  if (!identity) return null

  const user = await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
    .unique()

  return user
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(ctx: AuthContext) {
  const identity = await getIdentity(ctx)
  if (!identity) {
    throw error(ErrorCode.NOT_AUTHENTICATED)
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
    .unique()

  if (!user) {
    throw error(ErrorCode.USER_NOT_FOUND)
  }

  if (!user.isActive) {
    throw error(ErrorCode.USER_INACTIVE)
  }

  return user
}

/**
 * Check if user has membership in an org
 */
export async function getMembership(
  ctx: AuthContext,
  userId: Id<"users">,
  orgId: Id<"orgs">
) {
  return await ctx.db
    .query("memberships")
    .withIndex("by_user_org_deletedAt", (q) =>
      q.eq("userId", userId).eq("orgId", orgId).eq("deletedAt", undefined)
    )
    .unique()
}

// ============================================
// Permission Helpers
// ============================================

/** Back-office roles (all admin-level roles) */
const BACK_OFFICE_ROLES = [
  UserRole.SuperAdmin,
  UserRole.AdminSystem,
  UserRole.Admin,
  UserRole.SousAdmin,
] as string[]

/**
 * Get the effective role of a user (from role field or isSuperadmin flag)
 */
export function getEffectiveRole(user: {
  isSuperadmin: boolean
  role?: string
}): string {
  if (user.role === UserRole.SuperAdmin || user.isSuperadmin)
    return UserRole.SuperAdmin
  if (user.role === UserRole.AdminSystem) return UserRole.AdminSystem
  if (user.role === UserRole.Admin) return UserRole.Admin
  return user.role || UserRole.User
}

/**
 * Check if user is superadmin (platform-level)
 */
export function isSuperadminUser(user: {
  isSuperadmin: boolean
  role?: string
}) {
  return user.isSuperadmin || user.role === UserRole.SuperAdmin
}

/**
 * Check if user has back-office access (SuperAdmin, AdminSystem, or Admin)
 */
export function isBackOfficeUser(user: {
  isSuperadmin: boolean
  role?: string
}) {
  if (user.isSuperadmin) return true
  return user.role ? BACK_OFFICE_ROLES.includes(user.role) : false
}

/**
 * Require superadmin role (platform-level)
 */
export async function requireSuperadmin(ctx: AuthContext) {
  const user = await requireAuth(ctx)

  if (!isSuperadminUser(user)) {
    throw error(ErrorCode.INSUFFICIENT_PERMISSIONS)
  }

  return user
}

/**
 * Require back-office access (SuperAdmin, AdminSystem, or Admin).
 * Used for operations that any back-office user should be able to perform.
 */
export async function requireBackOfficeAccess(ctx: AuthContext) {
  const user = await requireAuth(ctx)

  if (!isBackOfficeUser(user)) {
    throw error(ErrorCode.INSUFFICIENT_PERMISSIONS)
  }

  return user
}

/**
 * Check if current user is superadmin
 */
export async function isSuperadmin(ctx: AuthContext): Promise<boolean> {
  const user = await getCurrentUser(ctx)
  return user ? isSuperadminUser(user) : false
}

// ============================================
// Internal Queries (for use in Actions via ctx.runQuery)
// ============================================

/**
 * Check if a user is superadmin by their auth subject (identity.subject).
 * Used by superadminAction since actions don't have ctx.db.
 */
export const checkSuperadminBySubject = internalQuery({
  args: { subject: v.string() },
  handler: async (ctx, { subject }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", subject))
      .unique()
    if (!user || !user.isActive) return false
    return isSuperadminUser(user)
  },
})
