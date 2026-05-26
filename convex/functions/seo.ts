import { query } from "../_generated/server";
import { PostStatus } from "../lib/constants";
import { isIntelligenceAgency } from "../lib/intelligenceAgencyVisibility";

/**
 * Public query returning all indexable slugs for the citizen-web sitemap.
 * Returns minimal data (slug + updatedAt) for each indexable entity.
 * No auth required — used by the public sitemap.xml endpoint.
 */
export const getSitemapEntries = query({
  args: {},
  handler: async (ctx) => {
    const [services, posts, orgs, tutorials] = await Promise.all([
      ctx.db
        .query("services")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .take(500),
      ctx.db
        .query("posts")
        .withIndex("by_published", (q) =>
          q.eq("status", PostStatus.Published),
        )
        .take(500),
      ctx.db
        .query("orgs")
        .withIndex("by_active_notDeleted", (q) =>
          q.eq("isActive", true).eq("deletedAt", undefined),
        )
        .take(500),
      ctx.db
        .query("tutorials")
        .withIndex("by_published", (q) =>
          q.eq("status", PostStatus.Published),
        )
        .take(500),
    ]);

    return {
      services: services
        .filter((s) => !!s.slug)
        .map((s) => ({
          slug: s.slug,
          updatedAt: s._creationTime,
        })),
      posts: await Promise.all(
        posts
          .filter((p) => !!p.slug)
          .map(async (p) => ({
            slug: p.slug,
            updatedAt: p.publishedAt ?? p._creationTime,
            coverImageUrl: p.coverImageStorageId
              ? await ctx.storage.getUrl(p.coverImageStorageId)
              : null,
          })),
      ),
      orgs: orgs
        .filter((o) => !!o.slug && !isIntelligenceAgency(o))
        .map((o) => ({
          slug: o.slug as string,
          updatedAt: o._creationTime,
        })),
      tutorials: tutorials
        .filter((t) => !!t.slug)
        .map((t) => ({
          slug: t.slug,
          updatedAt: t.publishedAt ?? t._creationTime,
        })),
    };
  },
});
