/**
 * Seed orchestrateur — Réseau administratif de la 5e République gabonaise.
 *
 * Appelle dans l'ordre les 5 seeds spécialisés :
 *  1. seedInstitutionsSouveraines — Présidence + Parlement + Juridictions
 *     suprêmes + Institutions consultatives (tutelleLevel: 0)
 *  2. seedMinistries              — 28 ministères + ministère délégué Budget
 *     (tutelleLevel: 1)
 *  3. seedDirectionsGenerales     — DG sous tutelle des ministères
 *     (tutelleLevel: 2)
 *  4. seedEtablissementsPublics   — EP, agences, entreprises sous tutelle
 *     (tutelleLevel: 2)
 *  5. seedAAI                     — 10 Autorités Administratives Indépendantes
 *     (tutelleLevel: 0)
 *
 * L'ordre est important : les DG/EP référencent leur ministère parent via
 * `parentSlug`, lequel est résolu en `parentOrgId` à l'insertion. Les
 * ministères doivent donc exister AVANT les DG/EP, sinon la résolution
 * échoue et l'entité est rejetée avec une erreur explicite.
 *
 * Chaque sous-seed est idempotent : appeler ce seed plusieurs fois ne
 * crée jamais de doublon.
 *
 * Utilisation :
 *   npx convex run seeds/administration_network_dev:seedAdministrationNetworkDev
 */
import { mutation } from "../_generated/server";
import { api } from "../_generated/api";

// Type partagé retourné par chaque sous-seed (signature stable).
interface SubSeedResult {
  created: number;
  skipped: number;
  errors: string[];
}

interface OrchestratorResult {
  totals: SubSeedResult;
  breakdown: {
    institutionsSouveraines: SubSeedResult;
    ministries: SubSeedResult;
    directionsGenerales: SubSeedResult;
    etablissementsPublics: SubSeedResult;
    aai: SubSeedResult;
  };
}

export const seedAdministrationNetworkDev = mutation({
  args: {},
  // Annotation explicite du handler pour éviter l'erreur TS7022 sur
  // l'inférence circulaire (mutation qui appelle d'autres mutations via api).
  handler: async (ctx): Promise<OrchestratorResult> => {
    const institutionsSouveraines: SubSeedResult = await ctx.runMutation(
      api.seeds.seedInstitutionsSouveraines.run,
      {},
    );

    const ministries: SubSeedResult = await ctx.runMutation(
      api.seeds.seedMinistries.run,
      {},
    );

    const directionsGenerales: SubSeedResult = await ctx.runMutation(
      api.seeds.seedDirectionsGenerales.run,
      {},
    );

    const etablissementsPublics: SubSeedResult = await ctx.runMutation(
      api.seeds.seedEtablissementsPublics.run,
      {},
    );

    const aai: SubSeedResult = await ctx.runMutation(
      api.seeds.seedAAI.run,
      {},
    );

    // Agrégation pour rapport global.
    const totals: SubSeedResult = {
      created:
        institutionsSouveraines.created +
        ministries.created +
        directionsGenerales.created +
        etablissementsPublics.created +
        aai.created,
      skipped:
        institutionsSouveraines.skipped +
        ministries.skipped +
        directionsGenerales.skipped +
        etablissementsPublics.skipped +
        aai.skipped,
      errors: [
        ...institutionsSouveraines.errors,
        ...ministries.errors,
        ...directionsGenerales.errors,
        ...etablissementsPublics.errors,
        ...aai.errors,
      ],
    };

    return {
      totals,
      breakdown: {
        institutionsSouveraines,
        ministries,
        directionsGenerales,
        etablissementsPublics,
        aai,
      },
    };
  },
});
