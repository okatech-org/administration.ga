/**
 * backfillTutelleLevel — Phase 1 administration.ga
 *
 * Calcule et persiste `tutelleLevel` (0/1/2/3) pour toutes les orgs
 * existantes, déduit de leur type et de leur chaîne parentOrgId.
 *
 * RÈGLES DE DÉDUCTION
 *   - Types souverains (sans tutelle hiérarchique) → niveau 0 :
 *       presidency, vice_presidency, government, parliament_chamber,
 *       supreme_court, consultative_institution, independent_authority,
 *       intelligence_agency (cloisonné, traité comme souverain)
 *   - Types diplomatiques sans parentOrgId → niveau 0 (organisme racine
 *     du monorepo diplomatique, ex: ministère MAE)
 *   - Type "ministry" / "delegated_ministry" → niveau 1
 *   - Type "directorate_general" / "public_establishment" / "national_agency"
 *     / "local_authority" → niveau 2 (rattachés à un ministère)
 *   - Tout autre type AVEC parentOrgId → niveau du parent + 1
 *   - Tout autre type SANS parentOrgId et non listé souverain → niveau 0
 *
 * IDEMPOTENCE
 *   - Re-exécutable sans dommage : ne touche pas les orgs dont le
 *     `tutelleLevel` est déjà cohérent avec le calcul actuel.
 *   - Compte séparément les `updated` (nouveau ou changé) et `skipped`
 *     (déjà à la bonne valeur).
 *
 * INVOCATION MANUELLE (dashboard Convex)
 *   internal.migrations.backfillTutelleLevel.run
 *
 * INVOCATION DRY-RUN
 *   internal.migrations.backfillTutelleLevel.run { dryRun: true }
 *   → ne modifie rien, retourne le décompte par niveau qui serait appliqué.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

/**
 * Types d'organisation considérés comme "souverains" : niveau 0 par défaut,
 * sans parent obligatoire. Les agences de renseignement sont incluses car
 * cloisonnées du reste du graphe.
 */
const SOVEREIGN_ORG_TYPES = new Set<string>([
  "presidency",
  "vice_presidency",
  "government",
  "parliament_chamber",
  "supreme_court",
  "consultative_institution",
  "independent_authority",
  "intelligence_agency",
]);

/**
 * Types qui, par construction, occupent le niveau 1 (rattachés à la
 * Présidence ou autonomes ministériels).
 */
const MINISTRY_LEVEL_TYPES = new Set<string>([
  "ministry",
  "delegated_ministry",
]);

/**
 * Types qui, par construction, occupent le niveau 2 (rattachés à un ministère
 * ou à une institution souveraine).
 */
const LEVEL_TWO_TYPES = new Set<string>([
  "directorate_general",
  "public_establishment",
  "national_agency",
  "local_authority",
]);

/**
 * Types diplomatiques historiques. Quand ils sont rattachés à un ministère
 * (typiquement le MAE), ils sont au niveau 2. Sans parent, on les considère
 * comme niveau 0 (héritage avant introduction de la tutelle ministérielle).
 */
const DIPLOMATIC_TYPES = new Set<string>([
  "embassy",
  "high_representation",
  "general_consulate",
  "consulate",
  "honorary_consulate",
  "high_commission",
  "permanent_mission",
  "third_party",
]);

/**
 * Calcule le niveau hiérarchique d'une org en fonction de son type et
 * de son parent. La résolution récursive est bornée par un compteur
 * de sécurité pour éviter toute boucle infinie sur des données corrompues.
 */
function computeTutelleLevel(
  org: Doc<"orgs">,
  orgsById: Map<Id<"orgs">, Doc<"orgs">>,
  depth = 0,
): number {
  // Garde-fou anti-cycle (la hiérarchie réelle ne dépasse pas 4 niveaux).
  if (depth > 10) return 0;

  // 1. Types souverains : toujours niveau 0.
  if (SOVEREIGN_ORG_TYPES.has(org.type)) return 0;

  // 2. Si l'org a un parent, son niveau = parent + 1.
  if (org.parentOrgId) {
    const parent = orgsById.get(org.parentOrgId);
    if (parent) {
      // Si le parent a déjà un tutelleLevel persisté, on le prend ;
      // sinon on le recalcule récursivement.
      const parentLevel =
        typeof parent.tutelleLevel === "number"
          ? parent.tutelleLevel
          : computeTutelleLevel(parent, orgsById, depth + 1);
      return parentLevel + 1;
    }
    // Parent référencé mais introuvable (donnée corrompue) :
    // fallback sur les règles statiques par type.
  }

  // 3. Pas de parent : règles statiques par type.
  if (MINISTRY_LEVEL_TYPES.has(org.type)) return 1;
  if (LEVEL_TWO_TYPES.has(org.type)) return 2;
  if (DIPLOMATIC_TYPES.has(org.type)) return 0;

  // 4. Fallback par défaut.
  return 0;
}

export const run = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun === true;
    const startedAt = Date.now();

    // Collecte de toutes les orgs (actives ET archivées : on backfille
    // sur l'ensemble du référentiel pour cohérence).
    const orgs = await ctx.db.query("orgs").collect();
    const orgsById = new Map<Id<"orgs">, Doc<"orgs">>();
    for (const org of orgs) {
      orgsById.set(org._id, org);
    }

    let updated = 0;
    let skipped = 0;
    const byLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };

    for (const org of orgs) {
      const computed = computeTutelleLevel(org, orgsById);

      // Idempotence : skip si la valeur est déjà correcte.
      if (org.tutelleLevel === computed) {
        skipped++;
        byLevel[computed] = (byLevel[computed] ?? 0) + 1;
        continue;
      }

      if (!dryRun) {
        await ctx.db.patch(org._id, { tutelleLevel: computed });
      }
      updated++;
      byLevel[computed] = (byLevel[computed] ?? 0) + 1;
    }

    return {
      status: dryRun ? "dry_run" : "applied",
      total: orgs.length,
      updated,
      skipped,
      byLevel,
      durationMs: Date.now() - startedAt,
    };
  },
});
