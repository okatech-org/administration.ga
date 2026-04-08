import { v } from "convex/values";
import { query } from "../_generated/server";
import { guideTypeValidator } from "../schemas/guides";

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Retourne le guide pour un type + pays, avec fallback sur "WORLD"
 */
export const getByTypeAndCountry = query({
  args: {
    type: guideTypeValidator,
    countryCode: v.string(),
  },
  handler: async (ctx, args) => {
    // Chercher le guide specifique au pays
    const specific = await ctx.db
      .query("guides")
      .withIndex("by_type_country", (q) =>
        q.eq("type", args.type).eq("countryCode", args.countryCode),
      )
      .first();

    if (specific && specific.isActive) {
      return specific;
    }

    // Fallback sur le guide generique "WORLD"
    const fallback = await ctx.db
      .query("guides")
      .withIndex("by_type_country", (q) =>
        q.eq("type", args.type).eq("countryCode", "WORLD"),
      )
      .first();

    if (fallback && fallback.isActive) {
      return fallback;
    }

    return null;
  },
});

/**
 * Retourne les 3 guides d'un pays (arrival, practical, return)
 * avec fallback "WORLD" pour chaque type manquant
 */
export const listByCountry = query({
  args: {
    countryCode: v.string(),
  },
  handler: async (ctx, args) => {
    const types = ["arrival", "practical", "return"] as const;
    const results: Record<string, any> = {};

    // Charger tous les guides actifs du pays
    const countryGuides = await ctx.db
      .query("guides")
      .withIndex("by_country", (q) => q.eq("countryCode", args.countryCode))
      .collect();

    // Charger les guides WORLD comme fallback
    const worldGuides = await ctx.db
      .query("guides")
      .withIndex("by_country", (q) => q.eq("countryCode", "WORLD"))
      .collect();

    for (const type of types) {
      const specific = countryGuides.find(
        (g) => g.type === type && g.isActive,
      );
      const fallback = worldGuides.find((g) => g.type === type && g.isActive);
      const guide = specific ?? fallback ?? null;
      results[type] = guide;
    }

    return results;
  },
});

/**
 * Liste les pays ayant au moins un guide actif
 */
export const listAvailableCountries = query({
  args: {},
  handler: async (ctx) => {
    const guides = await ctx.db
      .query("guides")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const countries = new Set(
      guides
        .map((g) => g.countryCode)
        .filter((code) => code !== "WORLD"),
    );

    return [...countries].sort();
  },
});

/**
 * Get guide by slug (pour les liens directs)
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const guide = await ctx.db
      .query("guides")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!guide || !guide.isActive) return null;
    return guide;
  },
});
