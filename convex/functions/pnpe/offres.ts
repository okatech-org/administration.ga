/**
 * Convex functions — Offres d'emploi PNPE.
 *
 * Lecture publique des offres publiées (portail D.E + landing) + CRUD
 * employeur (Phase 3) + modération conseiller (Phase 5).
 */
import { v } from "convex/values";
import { query } from "../../_generated/server";
import { authMutation } from "../../lib/customFunctions";
import {
  codeNAFGabonValidator,
  codeProvinceGaValidator,
  statutOffreValidator,
  typeContratValidator,
} from "../../lib/validators/pnpe";

/**
 * Liste publique des offres `PUBLIEE`, avec filtres optionnels.
 * Pas d'auth — visible sur le portail public.
 */
export const listPublished = query({
  args: {
    secteur: v.optional(codeNAFGabonValidator),
    typeContrat: v.optional(typeContratValidator),
    province: v.optional(codeProvinceGaValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const all = await ctx.db
      .query("offresEmploi")
      .withIndex("by_statut", (q) => q.eq("statut", "PUBLIEE"))
      .order("desc")
      .take(limit * 2); // marge pour filtrer ensuite
    let filtered = all;
    if (args.secteur) {
      filtered = filtered.filter((o) => o.secteurActivite === args.secteur);
    }
    if (args.typeContrat) {
      filtered = filtered.filter((o) => o.typeContrat === args.typeContrat);
    }
    if (args.province) {
      filtered = filtered.filter((o) => o.lieuTravail.province === args.province);
    }
    return filtered.slice(0, limit);
  },
});

/** Détail d'une offre par référence (PNPE format OE/YYYY/...). */
export const getByReference = query({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("offresEmploi")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .unique();
  },
});

/** Détail d'une offre par ID. */
export const getById = query({
  args: { offreId: v.id("offresEmploi") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.offreId);
  },
});

/** Incrémente le compteur de vues (appelé côté page détail). */
export const incrementViews = authMutation({
  args: { offreId: v.id("offresEmploi") },
  handler: async (ctx, args) => {
    const offre = await ctx.db.get(args.offreId);
    if (!offre) return;
    await ctx.db.patch(args.offreId, {
      nbVues: (offre.nbVues ?? 0) + 1,
    });
  },
});

/**
 * Modération conseiller : valider la publication d'une offre.
 * EN_VALIDATION → PUBLIEE.
 */
export const validate = authMutation({
  args: { offreId: v.id("offresEmploi") },
  handler: async (ctx, args) => {
    const offre = await ctx.db.get(args.offreId);
    if (!offre) throw new Error("OFFRE_NOT_FOUND");
    if (offre.statut !== "EN_VALIDATION") {
      throw new Error(`INVALID_TRANSITION: ${offre.statut} → PUBLIEE`);
    }
    // TODO Phase 7 : vérifier rôle conseiller_pnpe.
    await ctx.db.patch(args.offreId, {
      statut: "PUBLIEE",
      datePublication: Date.now(),
      validateurUserId: ctx.user._id,
      dateValidation: Date.now(),
    });
    return { ok: true };
  },
});

/** Liste des offres en attente de modération (Phase 5 — conseiller). */
export const listPending = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("offresEmploi")
      .withIndex("by_statut", (q) => q.eq("statut", "EN_VALIDATION"))
      .order("desc")
      .take(args.limit ?? 100);
  },
});

/**
 * Liste des offres expirées à marquer EXPIREE (sera appelé par cron).
 * Helper, peut être appelé en Phase 8 par une internal mutation.
 */
export const _findExpired = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const published = await ctx.db
      .query("offresEmploi")
      .withIndex("by_statut", (q) => q.eq("statut", "PUBLIEE"))
      .collect();
    return published.filter((o) => o.dateExpiration < now);
  },
});

export { statutOffreValidator };
