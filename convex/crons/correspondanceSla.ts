/**
 * iCorrespondance — Cron SLA
 *
 * Vérifie quotidiennement les correspondances dont la date de réponse
 * attendue est dépassée et crée des workflow steps d'alerte.
 *
 * Les correspondances en statut draft, pending, approved ou received
 * avec une dateReponseAttendue passée sont signalées.
 */

import { internalMutation } from "../_generated/server";

const BATCH_SIZE = 100;

export const checkOverdueSla = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let totalOverdue = 0;
    let totalAlerted = 0;

    // Scanner les correspondances actives avec deadline
    // On utilise un scan par org pour limiter les résultats
    const orgs = await ctx.db
      .query("orgs")
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    for (const org of orgs) {
      // Vérifier si le module correspondance est activé pour cette org
      if (org.modules && !org.modules.includes("correspondence")) {
        continue;
      }

      // Récupérer les items non-clos avec deadline dépassée
      const activeStatuses = ["draft", "pending", "approved", "received"];

      for (const status of activeStatuses) {
        const items = await ctx.db
          .query("correspondanceItems")
          .withIndex("by_owner_org_status", (q: any) =>
            q.eq("copyOwnerOrgId", org._id).eq("status", status),
          )
          .filter((q) =>
            q.and(
              q.eq(q.field("deletedAt"), undefined),
              q.neq(q.field("dateReponseAttendue"), undefined),
            ),
          )
          .take(BATCH_SIZE);

        for (const item of items) {
          if (!item.dateReponseAttendue || item.dateReponseAttendue >= now) {
            continue;
          }

          totalOverdue++;

          // Vérifier si on a déjà alerté récemment (dernières 24h)
          const recentSteps = await ctx.db
            .query("correspondanceWorkflowSteps")
            .withIndex("by_item_created", (q: any) => q.eq("itemId", item._id))
            .order("desc")
            .take(5);

          const alreadyAlerted = recentSteps.some(
            (s) =>
              s.stepType === "MODIFICATION_REQUESTED" &&
              s.comment?.includes("[SLA]") &&
              s.createdAt > now - 24 * 60 * 60 * 1000,
          );

          if (alreadyAlerted) continue;

          // Calculer le retard en jours
          const delayDays = Math.ceil(
            (now - item.dateReponseAttendue) / (24 * 60 * 60 * 1000),
          );

          // Créer une alerte workflow
          await ctx.db.insert("correspondanceWorkflowSteps", {
            itemId: item._id,
            stepType: "MODIFICATION_REQUESTED",
            actorId: item.createdBy,
            actorName: "Système SLA",
            comment: `[SLA] Délai de réponse dépassé de ${delayDays} jour(s). Référence : ${item.reference}`,
            isRead: false,
            createdAt: now,
          });

          totalAlerted++;
        }
      }
    }

  },
});
