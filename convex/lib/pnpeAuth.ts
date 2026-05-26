/**
 * Helpers RBAC PNPE.
 *
 * Vérifient qu'un utilisateur authentifié dispose d'au moins un des
 * rôles PNPE attendus via la table `memberships`. À utiliser dans toutes
 * les mutations sensibles (validation D.E, modération offres, etc.).
 */
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { MemberRole } from "./constants";

/**
 * Rôles staff PNPE — ceux qui ont des droits opérationnels dans la
 * plateforme emploi (par opposition aux usagers D.E et Employeur).
 */
export const PNPE_STAFF_ROLES = [
  MemberRole.ConseillerPnpe,
  MemberRole.ChefAntennePnpe,
  MemberRole.DirectionPnpe,
  MemberRole.FormateurAutoEmploi,
  MemberRole.AdminMinistereTravail,
] as const;

/**
 * Rôles habilités à valider les inscriptions D.E et les offres employeurs.
 * Pyramide : conseiller → chef d'antenne → direction → admin ministère.
 */
export const PNPE_VALIDATION_ROLES = [
  MemberRole.ConseillerPnpe,
  MemberRole.ChefAntennePnpe,
  MemberRole.DirectionPnpe,
  MemberRole.AdminMinistereTravail,
] as const;

/**
 * Rôles administrateurs PNPE — gèrent les antennes, les rôles, le reporting.
 */
export const PNPE_ADMIN_ROLES = [
  MemberRole.DirectionPnpe,
  MemberRole.AdminMinistereTravail,
] as const;

type Ctx = QueryCtx | MutationCtx;

/**
 * Vérifie que l'utilisateur courant a au moins un des rôles attendus.
 * Lance `FORBIDDEN_PNPE_ROLE` si aucun ne match.
 *
 * Usage :
 *   await requirePnpeRole(ctx, user, PNPE_VALIDATION_ROLES);
 */
export async function requirePnpeRole(
  ctx: Ctx,
  user: Doc<"users">,
  allowedRoles: readonly string[],
): Promise<void> {
  // Le rôle PNPE n'est pas porté par `memberships` directement (membership
  // est un schema partagé entre 10+ apps). Il vit dans la table dédiée
  // `pnpeStaffAssignments`, indexée par userId + by_role_active.
  const assignments = await ctx.db
    .query("pnpeStaffAssignments")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .collect();
  const hasRole = assignments.some(
    (a) => a.isActive && allowedRoles.includes(a.pnpeRole),
  );
  if (!hasRole) {
    throw new Error(
      `FORBIDDEN_PNPE_ROLE: requires one of [${allowedRoles.join(", ")}]`,
    );
  }
}

/**
 * Vérifie que l'utilisateur a un rôle staff PNPE quelconque (raccourci
 * pour les routes conseiller).
 */
export async function requirePnpeStaff(
  ctx: Ctx,
  user: Doc<"users">,
): Promise<void> {
  return requirePnpeRole(ctx, user, PNPE_STAFF_ROLES);
}

/**
 * Vérifie que l'utilisateur a un rôle admin PNPE (raccourci pour les
 * routes backoffice ministère).
 */
export async function requirePnpeAdmin(
  ctx: Ctx,
  user: Doc<"users">,
): Promise<void> {
  return requirePnpeRole(ctx, user, PNPE_ADMIN_ROLES);
}
