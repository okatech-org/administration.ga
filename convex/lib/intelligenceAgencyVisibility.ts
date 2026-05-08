/**
 * Visibilité des organismes de type "intelligence_agency".
 *
 * Les agences de renseignement sont totalement invisibles des autres
 * organismes (consulats, ambassades, ministères). Aucune trace dans les
 * listes, annuaires, recherches inter-organismes. Seuls les agents
 * appartenant à un `intelligence_agency` peuvent voir d'autres
 * `intelligence_agency` ou y accéder.
 *
 * Helpers à appliquer dans toutes les queries qui retournent des organismes
 * ou des agents (memberships) consommables hors-périmètre.
 */

import type { GenericQueryCtx } from "convex/server";
import type { DataModel, Doc, Id } from "../_generated/dataModel";
import { OrganizationType } from "./constants";
import { error, ErrorCode } from "./errors";
import { isSuperAdmin } from "./permissions";

type Ctx = GenericQueryCtx<DataModel>;

/** Type d'organisme = intelligence_agency. */
export function isIntelligenceAgency(
  org: Pick<Doc<"orgs">, "type"> | null | undefined,
): boolean {
  if (!org) return false;
  return org.type === OrganizationType.IntelligenceAgency;
}

/**
 * Indique si l'utilisateur courant a au moins une membership active dans
 * un organisme de type `intelligence_agency`. Si `orgId` est fourni, le
 * check est limité à cet organisme — utile pour valider qu'un appel passe
 * bien sur le bon organisme.
 */
export async function isCallerIntelAgency(
  ctx: Ctx,
  userId: Id<"users">,
  orgId?: Id<"orgs">,
): Promise<boolean> {
  if (orgId) {
    const org = await ctx.db.get(orgId);
    if (!isIntelligenceAgency(org)) return false;
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_org_deletedAt", (q) =>
        q.eq("userId", userId).eq("orgId", orgId).eq("deletedAt", undefined),
      )
      .unique();
    return membership != null;
  }

  const memberships = await ctx.db
    .query("memberships")
    .withIndex("by_user_org", (q) => q.eq("userId", userId))
    .collect();

  for (const m of memberships) {
    if (m.deletedAt) continue;
    const org = await ctx.db.get(m.orgId);
    if (isIntelligenceAgency(org)) return true;
  }
  return false;
}

/**
 * Visibilité d'une intel agency : un appelant peut consulter une org de
 * type `intelligence_agency` s'il est super-admin OU s'il est lui-même
 * membre d'une agence de renseignement.
 *
 * À utiliser exclusivement dans les queries de **lecture** (list, getById,
 * getBySlug, getDetailedById, listChildren). Les mutations destructrices
 * sur le module renseignement doivent garder la sémantique stricte
 * `assertCallerIsIntelAgency` / `isCallerIntelAgency`.
 */
export async function canSeeIntelAgencies(
  ctx: Ctx,
  user: Doc<"users"> | null,
): Promise<boolean> {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  return isCallerIntelAgency(ctx, user._id);
}

/**
 * Garde stricte pour les fonctions du module renseignement : refuse l'accès
 * si l'utilisateur n'appartient pas à un organisme `intelligence_agency`.
 * À combiner avec un `assertCanDoTask("intelligence.*")` pour la granularité
 * des permissions internes à l'agence.
 */
export async function assertCallerIsIntelAgency(
  ctx: Ctx,
  userId: Id<"users">,
  orgId: Id<"orgs">,
): Promise<void> {
  const ok = await isCallerIntelAgency(ctx, userId, orgId);
  if (!ok) {
    throw error(
      ErrorCode.INSUFFICIENT_PERMISSIONS,
      "Accès réservé aux organismes de renseignement souverain",
    );
  }
}

/**
 * Filtre une liste d'organismes pour masquer les agences de renseignement
 * aux appelants qui ne sont pas eux-mêmes membres d'une agence. Si l'appelant
 * appartient à un `intelligence_agency`, la liste est retournée telle quelle.
 */
export function filterOutIntelAgencies<T extends Pick<Doc<"orgs">, "type">>(
  orgs: T[],
  callerIsIntelAgency: boolean,
): T[] {
  if (callerIsIntelAgency) return orgs;
  return orgs.filter((o) => !isIntelligenceAgency(o));
}

/**
 * Variante mono-organisme : retourne null si l'organisme est une agence de
 * renseignement et que l'appelant n'en fait pas partie.
 */
export function hideIntelAgencyOrg<T extends Pick<Doc<"orgs">, "type"> | null>(
  org: T,
  callerIsIntelAgency: boolean,
): T | null {
  if (!org) return org;
  if (callerIsIntelAgency) return org;
  return isIntelligenceAgency(org) ? null : org;
}
