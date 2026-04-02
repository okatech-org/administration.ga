/**
 * Migration : Backfill copyOwnerOrgId sur correspondanceItems.
 *
 * Les items créés avant la refonte (mécanisme copie/original) n'ont pas
 * le champ copyOwnerOrgId. Ce champ est le filtre principal de toutes
 * les requêtes d'espace (Brouillons, Envoyés, Reçus, Corbeille).
 * Sans lui, ces items sont invisibles.
 *
 * Logique :
 * - Si isCopy == true et que l'item a un orgId → copyOwnerOrgId = orgId
 * - Sinon (original ou ancien) → copyOwnerOrgId = orgId
 *
 * Usage :
 *   npx convex run migrations/backfillCopyOwnerOrgId:backfill
 */
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const BATCH_SIZE = 50;

export const backfill = internalMutation({
  args: {
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("correspondanceItems").paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });

    let updated = 0;

    for (const item of page.page) {
      // Corriger uniquement les items sans copyOwnerOrgId
      if (!item.copyOwnerOrgId) {
        await ctx.db.patch(item._id, {
          copyOwnerOrgId: item.orgId,
        });
        updated++;
      }
    }

    console.log(
      `[backfillCopyOwnerOrgId] Batch: ${page.page.length} items, ${updated} updated`,
    );

    // Continuer si la page n'est pas la dernière
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.migrations.backfillCopyOwnerOrgId.backfill,
        { cursor: page.continueCursor },
      );
    } else {
      console.log("[backfillCopyOwnerOrgId] Migration terminée");
    }
  },
});
