import { useSuperAdminData } from "./use-superadmin-data";

/**
 * Role hierarchy ranks — higher = more privileged.
 * Mirrors ROLE_RANK in convex/functions/admin.ts.
 */
const ROLE_RANK: Record<string, number> = {
  user: 0,
  admin: 1,
  admin_system: 2,
  super_admin: 3,
};

/**
 * Derive the effective role string from the user data,
 * matching the backend getEffectiveRole logic.
 */
function getEffectiveRole(user: { isSuperadmin?: boolean; role?: string } | null | undefined): string {
  if (!user) return "user";
  if (user.role === "super_admin" || user.isSuperadmin) return "super_admin";
  if (user.role === "admin_system") return "admin_system";
  if (user.role === "admin") return "admin";
  return user.role || "user";
}

/**
 * Hook exposing the caller's effective admin role with permission helpers.
 *
 * Usage:
 *   const { canManageUser, canPromoteTo, isSuperAdmin } = useCurrentAdminRole();
 *   if (canManageUser(targetUserRole)) { ... }
 */
export function useCurrentAdminRole() {
  const { userData, isPending } = useSuperAdminData();

  const effectiveRole = getEffectiveRole(userData);
  const callerRank = ROLE_RANK[effectiveRole] ?? 0;

  /**
   * Whether the caller outranks the target user (can manage them).
   */
  const canManageUser = (targetRole: string): boolean => {
    const targetRank = ROLE_RANK[targetRole] ?? 0;
    return callerRank > targetRank;
  };

  /**
   * Whether the caller can promote someone TO the given role.
   * You can only assign roles strictly below your own.
   */
  const canPromoteTo = (role: string): boolean => {
    const roleRank = ROLE_RANK[role] ?? 0;
    return callerRank > roleRank;
  };

  const isSuperAdmin = effectiveRole === "super_admin";
  const isAdminSystem = effectiveRole === "admin_system";
  const isAdmin = effectiveRole === "admin";

  return {
    effectiveRole,
    callerRank,
    canManageUser,
    canPromoteTo,
    isSuperAdmin,
    isAdminSystem,
    isAdmin,
    isPending,
  };
}
