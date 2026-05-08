/**
 * Watchlists du module Renseignement.
 *
 * Liste de surveillance regroupant plusieurs cibles (profils, contacts,
 * agents, mineurs) autour d'un thème ou d'un dossier.
 */

import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";

const targetTypeValidator = v.union(
  v.literal("profile"),
  v.literal("child_profile"),
  v.literal("diplomatic_target"),
  v.literal("agent"),
);

const visibilityValidator = v.union(
  v.literal("private"),
  v.literal("shared"),
  v.literal("directorate"),
);

const themeValidator = v.union(
  v.literal("economic"),
  v.literal("political"),
  v.literal("security"),
  v.literal("diaspora"),
  v.literal("event"),
  v.literal("operational"),
  v.literal("other"),
);

export const list = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.watchlists.view",
    );

    const all = await ctx.db
      .query("intelligenceWatchlists")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();

    // Filtrage côté serveur : on retourne les watchlists partagées de l'org
    // + celles dont l'utilisateur est propriétaire.
    const visible = all.filter(
      (w) =>
        w.archivedAt === undefined &&
        (w.visibility === "shared" ||
          w.visibility === "directorate" ||
          w.ownerId === ctx.user._id),
    );

    // Compter les items pour chaque watchlist
    return await Promise.all(
      visible.map(async (w) => {
        const items = await ctx.db
          .query("intelligenceWatchlistItems")
          .withIndex("by_watchlist", (q) => q.eq("watchlistId", w._id))
          .collect();
        return {
          ...w,
          itemCount: items.length,
          isOwner: w.ownerId === ctx.user._id,
        };
      }),
    );
  },
});

export const get = authQuery({
  args: {
    watchlistId: v.id("intelligenceWatchlists"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.watchlists.view",
    );

    const watchlist = await ctx.db.get(args.watchlistId);
    if (!watchlist || watchlist.orgId !== args.orgId) {
      throw error(ErrorCode.NOT_FOUND);
    }
    if (
      watchlist.visibility === "private" &&
      watchlist.ownerId !== ctx.user._id
    ) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const items = await ctx.db
      .query("intelligenceWatchlistItems")
      .withIndex("by_watchlist", (q) => q.eq("watchlistId", args.watchlistId))
      .collect();

    // Hydrater chaque item avec un label de la cible
    const hydrated = await Promise.all(
      items.map(async (it) => {
        let label = "(cible inconnue)";
        let sublabel: string | undefined;
        try {
          const target = await ctx.db.get(it.targetId as never);
          if (target) {
            const t = target as any;
            switch (it.targetType) {
              case "profile": {
                label = `${t.identity?.firstName ?? ""} ${t.identity?.lastName ?? ""}`.trim() || "(sans nom)";
                sublabel = t.matricule ?? t.countryOfResidence ?? undefined;
                break;
              }
              case "child_profile":
                label = `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim() || "(sans nom)";
                break;
              case "diplomatic_target":
                label = t.name ?? "(sans nom)";
                sublabel = t.country ?? t.sector;
                break;
              case "agent":
                label = `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim() || t.email || "(agent)";
                sublabel = t.email;
                break;
            }
          }
        } catch {
          // Cible supprimée ou type non résolvable — on garde le label par défaut
        }
        return { ...it, label, sublabel };
      }),
    );

    return {
      ...watchlist,
      items: hydrated,
      isOwner: watchlist.ownerId === ctx.user._id,
    };
  },
});

export const create = authMutation({
  args: {
    orgId: v.id("orgs"),
    name: v.string(),
    description: v.optional(v.string()),
    visibility: visibilityValidator,
    theme: v.optional(themeValidator),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) throw error(ErrorCode.INVALID_ARGUMENT);

    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.watchlists.manage",
    );

    return await ctx.db.insert("intelligenceWatchlists", {
      orgId: args.orgId,
      ownerId: ctx.user._id,
      name,
      description: args.description?.trim() || undefined,
      visibility: args.visibility,
      theme: args.theme,
      color: args.color,
      icon: args.icon,
      updatedAt: Date.now(),
    });
  },
});

export const update = authMutation({
  args: {
    watchlistId: v.id("intelligenceWatchlists"),
    orgId: v.id("orgs"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(visibilityValidator),
    theme: v.optional(themeValidator),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const watchlist = await ctx.db.get(args.watchlistId);
    if (!watchlist || watchlist.orgId !== args.orgId) {
      throw error(ErrorCode.NOT_FOUND);
    }
    if (watchlist.ownerId !== ctx.user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.watchlists.manage",
    );

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const trimmed = args.name.trim();
      if (!trimmed) throw error(ErrorCode.INVALID_ARGUMENT);
      patch.name = trimmed;
    }
    if (args.description !== undefined) {
      patch.description = args.description.trim() || undefined;
    }
    if (args.visibility !== undefined) patch.visibility = args.visibility;
    if (args.theme !== undefined) patch.theme = args.theme;
    if (args.color !== undefined) patch.color = args.color;
    if (args.icon !== undefined) patch.icon = args.icon;

    await ctx.db.patch(args.watchlistId, patch);
    return args.watchlistId;
  },
});

export const archive = authMutation({
  args: {
    watchlistId: v.id("intelligenceWatchlists"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const watchlist = await ctx.db.get(args.watchlistId);
    if (!watchlist || watchlist.orgId !== args.orgId) {
      throw error(ErrorCode.NOT_FOUND);
    }
    if (watchlist.ownerId !== ctx.user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.watchlists.manage",
    );

    const now = Date.now();
    await ctx.db.patch(args.watchlistId, {
      archivedAt: now,
      updatedAt: now,
    });
    return args.watchlistId;
  },
});

export const addItem = authMutation({
  args: {
    watchlistId: v.id("intelligenceWatchlists"),
    orgId: v.id("orgs"),
    targetType: targetTypeValidator,
    targetId: v.string(),
    comment: v.optional(v.string()),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
    ),
  },
  handler: async (ctx, args) => {
    const watchlist = await ctx.db.get(args.watchlistId);
    if (!watchlist || watchlist.orgId !== args.orgId) {
      throw error(ErrorCode.NOT_FOUND);
    }

    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.watchlists.manage",
    );

    // Empêcher les doublons (même cible déjà dans la liste)
    const existing = await ctx.db
      .query("intelligenceWatchlistItems")
      .withIndex("by_watchlist", (q) =>
        q.eq("watchlistId", args.watchlistId),
      )
      .collect();
    const dup = existing.find(
      (it) => it.targetType === args.targetType && it.targetId === args.targetId,
    );
    if (dup) return dup._id;

    const id = await ctx.db.insert("intelligenceWatchlistItems", {
      watchlistId: args.watchlistId,
      orgId: args.orgId,
      addedBy: ctx.user._id,
      targetType: args.targetType,
      targetId: args.targetId,
      comment: args.comment?.trim() || undefined,
      priority: args.priority,
    });

    await ctx.db.patch(args.watchlistId, { updatedAt: Date.now() });
    return id;
  },
});

export const removeItem = authMutation({
  args: {
    itemId: v.id("intelligenceWatchlistItems"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.orgId !== args.orgId) {
      throw error(ErrorCode.NOT_FOUND);
    }

    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.watchlists.manage",
    );

    await ctx.db.delete(args.itemId);
    await ctx.db.patch(item.watchlistId, { updatedAt: Date.now() });
    return args.itemId;
  },
});

/**
 * Retourne les watchlists qui contiennent une cible donnée.
 * Utilisé par le profil pour afficher les badges « Dans X listes ».
 */
export const listForTarget = authQuery({
  args: {
    orgId: v.id("orgs"),
    targetType: targetTypeValidator,
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.watchlists.view",
    );

    const items = await ctx.db
      .query("intelligenceWatchlistItems")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId),
      )
      .collect();

    const watchlists = await Promise.all(
      items.map(async (it) => {
        const w = await ctx.db.get(it.watchlistId);
        if (!w || w.archivedAt !== undefined) return null;
        // Filtrer par visibilité
        if (w.visibility === "private" && w.ownerId !== ctx.user._id) {
          return null;
        }
        return { ...w, itemId: it._id, comment: it.comment, priority: it.priority };
      }),
    );

    return watchlists.filter((w): w is NonNullable<typeof w> => w !== null);
  },
});
