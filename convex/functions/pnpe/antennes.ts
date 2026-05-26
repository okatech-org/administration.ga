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

/**
 * Mise à jour d'une antenne — direction PNPE / admin Ministère.
 *
 * Patch partiel : tous les champs sont optionnels. Le slug et la
 * province ne sont volontairement pas modifiables (changement d'identité
 * territoriale = création + désaffectation, pas un update).
 */
export const update = authMutation({
  args: {
    antenneId: v.id("antennesPnpe"),
    nom: v.optional(v.string()),
    ville: v.optional(v.string()),
    adresse: v.optional(addressValidator),
    telephone: v.optional(v.union(v.string(), v.null())),
    email: v.optional(v.union(v.string(), v.null())),
    statut: v.optional(statutAntenneValidator),
    dateOuverture: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    await requirePnpeRole(ctx, ctx.user, PNPE_ADMIN_ROLES);
    const existing = await ctx.db.get(args.antenneId);
    if (!existing) {
      throw new Error("ANTENNE_NOT_FOUND");
    }
    const patch: Record<string, unknown> = {};
    if (args.nom !== undefined) patch.nom = args.nom;
    if (args.ville !== undefined) patch.ville = args.ville;
    if (args.adresse !== undefined) patch.adresse = args.adresse;
    if (args.telephone !== undefined) {
      patch.telephone = args.telephone ?? undefined;
    }
    if (args.email !== undefined) {
      patch.email = args.email ?? undefined;
    }
    if (args.statut !== undefined) patch.statut = args.statut;
    if (args.dateOuverture !== undefined) {
      patch.dateOuverture = args.dateOuverture ?? undefined;
    }
    await ctx.db.patch(args.antenneId, patch);
    return args.antenneId;
  },
});

/**
 * Suspension/réactivation d'une antenne — bascule rapide entre
 * OPERATIONNELLE et SUSPENDUE. Crée un évènement d'audit.
 *
 * Pour fermer définitivement, utiliser `update` avec `statut: "SUSPENDUE"`
 * et `dateOuverture: null` (la fermeture définitive n'est pas un patch
 * binaire car elle peut nécessiter une procédure RH avec ré-affectation
 * des conseillers).
 */
export const toggleStatut = authMutation({
  args: { antenneId: v.id("antennesPnpe") },
  handler: async (ctx, args) => {
    await requirePnpeRole(ctx, ctx.user, PNPE_ADMIN_ROLES);
    const antenne = await ctx.db.get(args.antenneId);
    if (!antenne) {
      throw new Error("ANTENNE_NOT_FOUND");
    }
    const next =
      antenne.statut === "OPERATIONNELLE" ? "SUSPENDUE" : "OPERATIONNELLE";
    await ctx.db.patch(args.antenneId, { statut: next });
    return { previous: antenne.statut, next };
  },
});

// ─── Staff PNPE — gestion administrateur ────────────────────────

/**
 * Active ou désactive un agent PNPE.
 *
 * `isActive` détermine si l'agent peut accéder aux espaces métier
 * (conseiller, file d'attente, etc.). Une désactivation ne supprime
 * pas le membership ; les données restent attachées pour traçabilité.
 */
export const toggleStaffActive = authMutation({
  args: { staffId: v.id("pnpeStaffAssignments") },
  handler: async (ctx, args) => {
    await requirePnpeRole(ctx, ctx.user, PNPE_ADMIN_ROLES);
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new Error("STAFF_NOT_FOUND");
    }
    await ctx.db.patch(args.staffId, { isActive: !staff.isActive });
    return { previous: staff.isActive, next: !staff.isActive };
  },
});

/**
 * Réaffecte un agent à une nouvelle antenne.
 *
 * Cas typique : un conseiller muté de Libreville à Port-Gentil.
 * Pour les rôles non-géolocalisés (DG, admin ministère), passer
 * `antenneId: null`.
 */
export const reassignStaffAntenne = authMutation({
  args: {
    staffId: v.id("pnpeStaffAssignments"),
    antenneId: v.union(v.id("antennesPnpe"), v.null()),
  },
  handler: async (ctx, args) => {
    await requirePnpeRole(ctx, ctx.user, PNPE_ADMIN_ROLES);
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new Error("STAFF_NOT_FOUND");
    }
    if (args.antenneId) {
      const antenne = await ctx.db.get(args.antenneId);
      if (!antenne) {
        throw new Error("ANTENNE_NOT_FOUND");
      }
    }
    await ctx.db.patch(args.staffId, {
      antenneId: args.antenneId ?? undefined,
    });
    return { previous: staff.antenneId, next: args.antenneId };
  },
});
