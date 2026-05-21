/**
 * iCorrespondance — Résolution de destinataire
 *
 * Permet de résoudre un destinataire de courrier à partir d'un couple
 * (orgSlug, roleSlug) — par exemple parce qu'une démarche citoyenne ou
 * une correspondance externe pointe vers "mairie-libreville / directeur-etat-civil".
 *
 * Stratégie de résolution :
 *   1. Recherche de l'organisme par son slug (index `orgs.by_slug`).
 *   2. Si roleSlug fourni : recherche d'un membre dont la position match
 *      le roleSlug (comparaison casse-insensible sur position.code, fallback
 *      sur position.title.fr).
 *   3. Si trouvé → renvoie `kind: "user"` avec userId, membershipId, orgId.
 *   4. Sinon (ou si roleSlug omis) → fallback `kind: "org"` qui pointe sur
 *      le secrétariat / bureau d'ordre de l'organisme.
 *   5. Si l'org elle-même n'existe pas → `kind: "not_found"`.
 *
 * Authentification : `authQuery` — la résolution révèle qui occupe une
 * fonction donnée dans une administration, ce qui constitue une info
 * sensible (vie privée des agents) et doit être réservée aux utilisateurs
 * authentifiés.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { authQuery } from "../lib/customFunctions";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RecipientResolution =
  | {
      kind: "user";
      userId: Id<"users">;
      membershipId: Id<"memberships">;
      orgId: Id<"orgs">;
      orgName: string;
      roleLabel?: string;
    }
  | {
      kind: "org";
      orgId: Id<"orgs">;
      orgName: string;
      entryPoint: "secretariat" | "bureau_ordre" | "accueil";
    }
  | { kind: "not_found"; reason: string };

// ─── Query ───────────────────────────────────────────────────────────────────

/**
 * Résout un destinataire à partir d'un slug d'organisme et, optionnellement,
 * d'un slug de rôle (position).
 *
 * @example
 *   resolveRecipient({ orgSlug: "ministere-justice", roleSlug: "ministre" })
 *   → { kind: "user", userId, membershipId, orgId, orgName, roleLabel: "Ministre" }
 *
 *   resolveRecipient({ orgSlug: "mairie-libreville" })
 *   → { kind: "org", orgId, orgName, entryPoint: "secretariat" }
 *
 *   resolveRecipient({ orgSlug: "inexistant" })
 *   → { kind: "not_found", reason: "Organisme introuvable" }
 */
export const resolveRecipient = authQuery({
  args: {
    orgSlug: v.string(),
    roleSlug: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<RecipientResolution> => {
    // 1. Trouver l'organisme par slug
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_slug", (q) => q.eq("slug", args.orgSlug))
      .first();

    if (!org) {
      return {
        kind: "not_found",
        reason: `Organisme introuvable (slug: "${args.orgSlug}")`,
      };
    }

    // 2. Si pas de rôle demandé → fallback org directement
    if (!args.roleSlug) {
      return {
        kind: "org",
        orgId: org._id,
        orgName: org.name,
        entryPoint: "secretariat",
      };
    }

    // 3. Normaliser le roleSlug pour comparaison casse-insensible
    const targetSlug = normalizeSlug(args.roleSlug);

    // 4. Charger les memberships actifs de l'org
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org_deletedAt", (q) =>
        q.eq("orgId", org._id).eq("deletedAt", undefined),
      )
      .collect();

    // 5. Parcourir les memberships pour trouver une position matchante
    //    Priorité : position.code, fallback : position.title.fr / position.title.en
    for (const membership of memberships) {
      if (!membership.positionId) continue;

      const position = await ctx.db.get(membership.positionId);
      if (!position || position.deletedAt !== undefined || !position.isActive) {
        continue;
      }

      // Matching priorité 1 : position.code
      if (normalizeSlug(position.code) === targetSlug) {
        return {
          kind: "user",
          userId: membership.userId,
          membershipId: membership._id,
          orgId: org._id,
          orgName: org.name,
          roleLabel: position.title?.fr ?? position.title?.en ?? position.code,
        };
      }

      // Matching priorité 2 : position.title (fr puis en)
      const titleFr = position.title?.fr;
      const titleEn = position.title?.en;
      if (
        (titleFr && normalizeSlug(titleFr) === targetSlug) ||
        (titleEn && normalizeSlug(titleEn) === targetSlug)
      ) {
        return {
          kind: "user",
          userId: membership.userId,
          membershipId: membership._id,
          orgId: org._id,
          orgName: org.name,
          roleLabel: titleFr ?? titleEn ?? position.code,
        };
      }
    }

    // 6. Aucun match : fallback sur l'org (secrétariat)
    return {
      kind: "org",
      orgId: org._id,
      orgName: org.name,
      entryPoint: "secretariat",
    };
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalise une chaîne pour comparaison slug : minuscules, espaces et
 * underscores convertis en tirets, suppression des diacritiques.
 *
 * Exemples :
 *   "Directeur Général" → "directeur-general"
 *   "directeur_general" → "directeur-general"
 *   "DIRECTEUR-GENERAL" → "directeur-general"
 */
function normalizeSlug(input: string): string {
  return input
    .normalize("NFD")
    // Suppression des diacritiques combinants (range Unicode U+0300..U+036F)
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}
