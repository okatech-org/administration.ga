/**
 * Convex functions — Employeurs PNPE.
 *
 * Gestion de l'inscription, de la vérification DGI/CNSS et du suivi de
 * l'employeur. Couvre les besoins Phase 3 (espace employeur) + Phase 5
 * (modération par conseiller PNPE).
 */
import { v } from "convex/values";
import { authQuery, authMutation } from "../../lib/customFunctions";
import {
  PNPE_STAFF_ROLES,
  PNPE_VALIDATION_ROLES,
  requirePnpeRole,
} from "../../lib/pnpeAuth";
import { addressValidator } from "../../lib/validators";
import {
  codeNAFGabonValidator,
  codeProvinceGaValidator,
  tailleEntrepriseValidator,
  verificationEmployeurValidator,
} from "../../lib/validators/pnpe";

/** Récupère le profil employeur de l'utilisateur connecté. */
export const getMine = authQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("employeurs")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .unique();
  },
});

/** Crée le profil employeur (inscription initiale). */
export const create = authMutation({
  args: {
    raisonSociale: v.string(),
    nif: v.string(),
    rccm: v.optional(v.string()),
    secteurActivite: codeNAFGabonValidator,
    tailleEntreprise: tailleEntrepriseValidator,
    effectif: v.optional(v.number()),
    adresseSiege: addressValidator,
    provinceSiege: codeProvinceGaValidator,
    representantLegal: v.object({
      nom: v.string(),
      prenoms: v.string(),
      fonction: v.string(),
      email: v.string(),
      telephone: v.string(),
    }),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("employeurs")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (existing) {
      throw new Error("EMPLOYEUR_ALREADY_REGISTERED");
    }
    const nifExists = await ctx.db
      .query("employeurs")
      .withIndex("by_nif", (q) => q.eq("nif", args.nif))
      .unique();
    if (nifExists) {
      throw new Error("NIF_ALREADY_USED");
    }
    return await ctx.db.insert("employeurs", {
      userId: ctx.user._id,
      statutVerification: "NON_VERIFIE",
      createdByUserId: ctx.user._id,
      ...args,
    });
  },
});

/** Soumet la demande de vérification (NON_VERIFIE → EN_COURS). */
export const requestVerification = authMutation({
  args: {
    employeurId: v.id("employeurs"),
    documents: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const employeur = await ctx.db.get(args.employeurId);
    if (!employeur) throw new Error("EMPLOYEUR_NOT_FOUND");
    if (employeur.userId !== ctx.user._id) {
      throw new Error("FORBIDDEN");
    }
    await ctx.db.patch(args.employeurId, {
      statutVerification: "EN_COURS",
      documentsVerification: args.documents,
    });
    return { ok: true };
  },
});

/**
 * Action conseiller : valider l'employeur (EN_COURS → VERIFIE).
 * Permet ensuite à l'employeur de publier des offres.
 */
export const validate = authMutation({
  args: {
    employeurId: v.id("employeurs"),
    nouveauStatut: verificationEmployeurValidator,
  },
  handler: async (ctx, args) => {
    await requirePnpeRole(ctx, ctx.user, PNPE_VALIDATION_ROLES);
    const employeur = await ctx.db.get(args.employeurId);
    if (!employeur) throw new Error("EMPLOYEUR_NOT_FOUND");
    await ctx.db.patch(args.employeurId, {
      statutVerification: args.nouveauStatut,
      dateVerification: Date.now(),
      verifieParUserId: ctx.user._id,
    });
    return { ok: true };
  },
});

/** Liste des employeurs en attente de vérification (Phase 5). */
export const listByStatut = authQuery({
  args: { statut: verificationEmployeurValidator },
  handler: async (ctx, args) => {
    await requirePnpeRole(ctx, ctx.user, PNPE_STAFF_ROLES);
    return await ctx.db
      .query("employeurs")
      .withIndex("by_statut_verification", (q) =>
        q.eq("statutVerification", args.statut),
      )
      .collect();
  },
});

// ─── Offres côté employeur ─────────────────────────────────────

/** Crée une offre côté employeur (statut BROUILLON). */
export const createOffre = authMutation({
  args: {
    employeurId: v.id("employeurs"),
    titre: v.string(),
    description: v.string(),
    missions: v.optional(v.array(v.string())),
    profilRecherche: v.optional(v.string()),
    typeContrat: v.union(
      v.literal("CDI"),
      v.literal("CDD"),
      v.literal("STAGE"),
      v.literal("ALTERNANCE"),
      v.literal("INTERIM"),
      v.literal("INSERTION"),
      v.literal("INDEPENDANT"),
    ),
    dureeMois: v.optional(v.number()),
    secteurActivite: v.optional(codeNAFGabonValidator),
    lieuTravail: v.object({
      province: codeProvinceGaValidator,
      ville: v.string(),
      adresse: v.optional(addressValidator),
      teletravail: v.optional(
        v.union(v.literal("NON"), v.literal("PARTIEL"), v.literal("TOTAL")),
      ),
    }),
    salaire: v.optional(
      v.object({
        min: v.number(),
        max: v.number(),
        devise: v.string(),
        periodicite: v.union(
          v.literal("HORAIRE"),
          v.literal("MENSUEL"),
          v.literal("ANNUEL"),
        ),
      }),
    ),
    dateExpiration: v.number(),
  },
  handler: async (ctx, args) => {
    const employeur = await ctx.db.get(args.employeurId);
    if (!employeur) throw new Error("EMPLOYEUR_NOT_FOUND");
    if (employeur.userId !== ctx.user._id) {
      throw new Error("FORBIDDEN");
    }
    if (employeur.statutVerification !== "VERIFIE") {
      throw new Error("EMPLOYEUR_NOT_VERIFIED");
    }
    // Référence simple : OE/YYYY/<NIF_TAIL>/<TIMESTAMP_SHORT>
    const year = new Date().getFullYear();
    const nifTail = employeur.nif.slice(-4);
    const ts = Date.now().toString().slice(-6);
    const reference = `OE/${year}/${nifTail}/${ts}`;
    return await ctx.db.insert("offresEmploi", {
      ...args,
      typeEmployeur: "ENTREPRISE",
      reference,
      statut: "BROUILLON",
      nbVues: 0,
      nbCandidatures: 0,
      createdByUserId: ctx.user._id,
    });
  },
});

/** Soumet une offre pour modération conseiller (BROUILLON → EN_VALIDATION). */
export const submitOffre = authMutation({
  args: { offreId: v.id("offresEmploi") },
  handler: async (ctx, args) => {
    const offre = await ctx.db.get(args.offreId);
    if (!offre) throw new Error("OFFRE_NOT_FOUND");
    if (!offre.employeurId) {
      throw new Error("OFFRE_NOT_ENTREPRISE");
    }
    const employeur = await ctx.db.get(offre.employeurId);
    if (!employeur || employeur.userId !== ctx.user._id) {
      throw new Error("FORBIDDEN");
    }
    if (offre.statut !== "BROUILLON") {
      throw new Error(`INVALID_TRANSITION: ${offre.statut} → EN_VALIDATION`);
    }
    await ctx.db.patch(args.offreId, { statut: "EN_VALIDATION" });
    return { ok: true };
  },
});

/** Marque une offre comme pourvue (notification statistique). */
export const markAsFilled = authMutation({
  args: { offreId: v.id("offresEmploi") },
  handler: async (ctx, args) => {
    const offre = await ctx.db.get(args.offreId);
    if (!offre) throw new Error("OFFRE_NOT_FOUND");
    if (!offre.employeurId) {
      throw new Error("OFFRE_NOT_ENTREPRISE");
    }
    const employeur = await ctx.db.get(offre.employeurId);
    if (!employeur || employeur.userId !== ctx.user._id) {
      throw new Error("FORBIDDEN");
    }
    await ctx.db.patch(args.offreId, { statut: "POURVUE" });
    return { ok: true };
  },
});

/** Liste des offres de l'employeur connecté. */
export const listMyOffres = authQuery({
  args: {},
  handler: async (ctx) => {
    const employeur = await ctx.db
      .query("employeurs")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (!employeur) return [];
    return await ctx.db
      .query("offresEmploi")
      .withIndex("by_employeur_statut", (q) => q.eq("employeurId", employeur._id))
      .order("desc")
      .collect();
  },
});
