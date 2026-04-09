/**
 * Cron — Verification quotidienne des retentions d'archivage.
 * Detecte les documents proches de l'expiration et ceux expires.
 */

import { internalMutation } from "../_generated/server";
import { getArchiveStatus } from "../lib/archiveHelpers";
import { NotificationType } from "../lib/constants";

/**
 * Scan les documents archives avec une date d'expiration.
 * Envoie une notification aux admins de l'org si des documents expirent bientot.
 */
export const checkArchiveExpiration = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Recuperer tous les orgs
    const orgs = await ctx.db.query("orgs").take(200);

    for (const org of orgs) {
      const docs = await ctx.db
        .query("documents")
        .withIndex("by_owner_and_archivedAt", (q) => q.eq("ownerId", org._id))
        .take(500);

      const archived = docs.filter(
        (d) =>
          d.archivedAt !== undefined &&
          d.deletedAt === undefined &&
          d.retentionExpiresAt !== undefined,
      );

      let expiringCount = 0;
      let expiredCount = 0;

      for (const doc of archived) {
        const status = getArchiveStatus(doc.retentionExpiresAt);
        if (status === "expiring") expiringCount++;
        if (status === "expired") expiredCount++;
      }

      if (expiringCount > 0 || expiredCount > 0) {
        // Notifier les membres actifs de l'org (pas de filtre role — permission geree cote frontend)
        const members = await ctx.db
          .query("memberships")
          .withIndex("by_org", (q) => q.eq("orgId", org._id))
          .take(20);

        const activeMembers = members.filter((m) => m.deletedAt === undefined);

        const title = expiringCount > 0
          ? `${expiringCount} document(s) en fin de rétention`
          : `${expiredCount} document(s) dont la rétention a expiré`;
        const body = `Vérifiez les archives de ${org.name ?? "votre organisation"} dans iArchive.`;

        // Limiter les notifications aux 5 premiers membres pour eviter le spam
        for (const member of activeMembers.slice(0, 5)) {
          await ctx.db.insert("notifications", {
            userId: member.userId,
            type: NotificationType.ArchiveExpiration,
            title,
            body,
            link: "/iarchive",
            isRead: false,
            createdAt: now,
          });
        }
      }
    }
  },
});
