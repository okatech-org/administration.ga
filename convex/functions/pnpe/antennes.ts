/**
 * Convex functions — Antennes PNPE.
 *
 * Lecture publique de l'annuaire des antennes régionales (inscription D.E
 * + portail public). CRUD restreint au backoffice ministère du Travail
 * et à la direction PNPE (Phase 6).
 */
import { v } from "convex/values";
import { query } from "../../_generated/server";
import { authMutation } from "../../lib/customFunctions";
import { PNPE_ADMIN_ROLES, requirePnpeRole } from "../../lib/pnpeAuth";
import { addressValidator } from "../../lib/validators";
import {
  codeProvinceGaValidator,
  statutAntenneValidator,
} from "../../lib/validators/pnpe";

/** Annuaire public des antennes (utilisé sur landing + inscription D.E). */
export const list = query({
  args: {
    province: v.optional(codeProvinceGaValidator),
    statut: v.optional(statutAntenneValidator),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("antennesPnpe");
    if (args.province) {
      const province = args.province;
      q = q.withIndex("by_province", (qb) => qb.eq("province", province)) as typeof q;
    }
    const all = await q.collect();
    return args.statut ? all.filter((a) => a.statut === args.statut) : all;
  },
});

/** Détail d'une antenne par slug (page portail). */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("antennesPnpe")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/** Création d'une antenne — réservé direction PNPE / admin Ministère. */
export const create = authMutation({
  args: {
    slug: v.string(),
    nom: v.string(),
    province: codeProvinceGaValidator,
    ville: v.string(),
    adresse: addressValidator,
    telephone: v.optional(v.string()),
    email: v.optional(v.string()),
    statut: statutAntenneValidator,
    dateOuverture: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePnpeRole(ctx, ctx.user, PNPE_ADMIN_ROLES);
    const existing = await ctx.db
      .query("antennesPnpe")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new Error(`ANTENNE_ALREADY_EXISTS: ${args.slug}`);
    }
    return await ctx.db.insert("antennesPnpe", {
      ...args,
      createdByUserId: ctx.user._id,
    });
  },
});
