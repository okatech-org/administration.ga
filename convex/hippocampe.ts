import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { backofficeQuery } from "./lib/customFunctions";
import { internal } from "./_generated/api";

export const loguerAction = internalMutation({
  args: {
    action: v.string(),
    categorie: v.string(),
    entiteType: v.string(),
    entiteId: v.string(),
    userId: v.optional(v.string()), // Or ID type depending on how auth works
    details: v.object({
      avant: v.any(),
      apres: v.any(),
    }),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("historiqueActions", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const calculerMetriques = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Example: count total actions today
    const now = Date.now();
    const oneDayAgo = now - 1000 * 60 * 60 * 24;

    const actions = await ctx.db
      .query("historiqueActions")
      .withIndex("by_timestamp", (q) => q.gt("timestamp", oneDayAgo))
      .collect();

    await ctx.db.insert("metriques", {
      nom: "actions_per_day",
      valeur: actions.length,
      unite: "count",
      periode: "1d",
      timestamp: now,
    });
  },
});

export const listerHistorique = backofficeQuery({
  args: {
    entiteType: v.optional(v.string()),
    entiteId: v.optional(v.string()),
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q: any = ctx.db.query("historiqueActions");

    if (args.entiteType && args.entiteId) {
      q = q.withIndex("by_entite", (q: any) =>
        q.eq("entiteType", args.entiteType!).eq("entiteId", args.entiteId!)
      );
    } else if (args.userId) {
      q = q.withIndex("by_user", (q: any) => q.eq("userId", args.userId!));
    } else {
      q = q.withIndex("by_timestamp");
    }

    return await q.order("desc").take(args.limit ?? 50);
  },
});

export const rechercherActions = backofficeQuery({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    // Convex full text search would be ideal here by defining a search index.
    // Assuming simple filter for now.
    const recent = await ctx.db.query("historiqueActions").order("desc").take(100);
    return recent.filter((r) => 
      r.action.toLowerCase().includes(args.searchTerm.toLowerCase()) || 
      r.categorie.toLowerCase().includes(args.searchTerm.toLowerCase())
    );
  },
});
