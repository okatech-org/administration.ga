/**
 * Cron job — Expiration automatique des offres d'emploi PNPE/TRAVAIL.GA.
 *
 * Toutes les offres avec statut PUBLIEE et dateExpiration <= now()
 * basculent en EXPIREE. Le cron tourne quotidiennement a 6h UTC
 * (7h Libreville).
 *
 * Internal mutation : pas d'auth ni d'utilisateur. Audit log via
 * console.info uniquement.
 */
import { internalMutation } from "../../_generated/server";

export const expireOffresInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const published = await ctx.db
      .query("offresEmploi")
      .withIndex("by_statut", (q) => q.eq("statut", "PUBLIEE"))
      .collect();

    const expired = published.filter((o) => o.dateExpiration <= now);
    let updated = 0;

    for (const offre of expired) {
      await ctx.db.patch(offre._id, {
        statut: "EXPIREE",
      });
      updated++;
    }

    console.info(
      `[expireOffres] ${updated}/${expired.length} offre(s) expiree(s) automatiquement.`,
    );

    return { ok: true, expired: updated, scanned: published.length };
  },
});
