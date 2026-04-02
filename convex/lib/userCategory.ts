/**
 * userCategory — Détecte si un utilisateur est Corps Administratif (A) ou Citoyen (B).
 *
 * Catégorie A : au moins 1 membership active (deletedAt === undefined) → agent/admin
 * Catégorie B : 0 memberships actives → ressortissant/étranger/de passage
 *
 * Utilise l'index `by_user_org_deletedAt` pour éviter les scans (Convex guideline).
 */

import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

/**
 * Vérifie si l'utilisateur est un citoyen (pas de membership active).
 * Retourne `true` pour les ressortissants, étrangers, de passage.
 * Retourne `false` pour les agents, admins, super-admins.
 *
 * Note : On ne peut pas chercher directement `deletedAt === undefined` dans
 * un index à 3 champs sans spécifier `orgId`. On utilise l'index `by_user_org`
 * (préfixe userId) puis on vérifie `deletedAt` sur les résultats bornés.
 */
export async function isPublicUser(
  ctx: Ctx,
  userId: Id<"users">,
): Promise<boolean> {
  // Récupérer les premières memberships de l'utilisateur (borné à 5)
  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user_org", (q: any) => q.eq("userId", userId))
    .take(5);

  // Si aucune membership trouvée, c'est un utilisateur public
  if (memberships.length === 0) return true;

  // Vérifier s'il y a au moins une membership active (non supprimée)
  const hasActive = memberships.some((m) => m.deletedAt === undefined);
  return !hasActive;
}

/**
 * Retourne la catégorie d'un utilisateur.
 * "A" = Corps Administratif / Agents / Back-Office
 * "B" = Ressortissants / Étrangers / De passage
 */
export async function getUserCategory(
  ctx: Ctx,
  userId: Id<"users">,
): Promise<"A" | "B"> {
  const isPublic = await isPublicUser(ctx, userId);
  return isPublic ? "B" : "A";
}
