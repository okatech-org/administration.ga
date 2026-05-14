import { query } from "../_generated/server";
import { PostCategory, PostStatus, OrganizationType } from "../lib/constants";

/**
 * Statistiques publiques pour la page Actualités.
 * Toutes les valeurs sont dérivées de la base — aucune valeur fictive.
 */
export const newsStats = query({
  args: {},
  handler: async (ctx) => {
    // Représentations actives (ambassades + consulats + missions)
    const orgs = await ctx.db
      .query("orgs")
      .withIndex("by_active_notDeleted", (q) =>
        q.eq("isActive", true).eq("deletedAt", undefined),
      )
      .collect();
    const consularTypes: string[] = [
      OrganizationType.Embassy,
      OrganizationType.HighRepresentation,
      OrganizationType.GeneralConsulate,
      OrganizationType.HighCommission,
      OrganizationType.PermanentMission,
    ];
    const representationsCount = orgs.filter((o) =>
      consularTypes.includes(o.type),
    ).length;

    // Posts par catégorie (status published)
    const published = await ctx.db
      .query("posts")
      .withIndex("by_published", (q) => q.eq("status", PostStatus.Published))
      .collect();

    const newsCount = published.filter(
      (p) => p.category === PostCategory.News,
    ).length;
    const announcementsCount = published.filter(
      (p) => p.category === PostCategory.Announcement,
    ).length;

    const now = Date.now();
    const upcomingEventsCount = published.filter(
      (p) =>
        p.category === PostCategory.Event &&
        typeof p.eventStartAt === "number" &&
        p.eventStartAt >= now,
    ).length;

    return {
      representations: representationsCount,
      news: newsCount,
      announcements: announcementsCount,
      upcomingEvents: upcomingEventsCount,
    };
  },
});
