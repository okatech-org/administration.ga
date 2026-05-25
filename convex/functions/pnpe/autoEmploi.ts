/**
 * Convex functions — Programmes Auto-Emploi PNPE.
 *
 * Couvre l'inscription au programme, le suivi BMC (Business Model Canvas),
 * l'élaboration du business plan et les passerelles Ediandza / ANPI-Gabon.
 */
import { v } from "convex/values";
import { authQuery, authMutation } from "../../lib/customFunctions";
import {
  codeNAFGabonValidator,
  etapeAutoEmploiValidator,
} from "../../lib/validators/pnpe";

/** Récupère le parcours Auto-Emploi du D.E connecté. */
export const getMine = authQuery({
  args: {},
  handler: async (ctx) => {
    const demandeur = await ctx.db
      .query("demandeursEmploi")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (!demandeur) return null;
    return await ctx.db
      .query("programmesAutoEmploi")
      .withIndex("by_demandeur", (q) => q.eq("demandeurId", demandeur._id))
      .first();
  },
});

/** Inscrit le D.E au programme Auto-Emploi (étape EVALUATION). */
export const enroll = authMutation({
  args: {
    demandeurId: v.id("demandeursEmploi"),
    secteurProjet: codeNAFGabonValidator,
    descriptionProjet: v.string(),
    provinceProjet: v.optional(v.string()),
    conseillerReferentId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const demandeur = await ctx.db.get(args.demandeurId);
    if (!demandeur) throw new Error("DEMANDEUR_NOT_FOUND");
    if (demandeur.userId !== ctx.user._id) {
      throw new Error("FORBIDDEN");
    }
    // Vérif : pas déjà inscrit
    const existing = await ctx.db
      .query("programmesAutoEmploi")
      .withIndex("by_demandeur", (q) => q.eq("demandeurId", args.demandeurId))
      .first();
    if (existing) {
      throw new Error("ALREADY_ENROLLED");
    }
    return await ctx.db.insert("programmesAutoEmploi", {
      demandeurId: args.demandeurId,
      secteurProjet: args.secteurProjet,
      descriptionProjet: args.descriptionProjet,
      provinceProjet: args.provinceProjet,
      conseillerReferentId: args.conseillerReferentId,
      etape: "EVALUATION",
      dateEtape: Date.now(),
      createdByUserId: ctx.user._id,
    });
  },
});

/** Passe à l'étape suivante du parcours. */
export const advanceEtape = authMutation({
  args: {
    programmeId: v.id("programmesAutoEmploi"),
    nouvelleEtape: etapeAutoEmploiValidator,
  },
  handler: async (ctx, args) => {
    const programme = await ctx.db.get(args.programmeId);
    if (!programme) throw new Error("PROGRAMME_NOT_FOUND");
    // TODO Phase 7 : restreindre les transitions aux conseillers/mentors.
    await ctx.db.patch(args.programmeId, {
      etape: args.nouvelleEtape,
      dateEtape: Date.now(),
    });
    return { ok: true };
  },
});

/** Met à jour le business plan (Tiptap JSON snapshot). */
export const updateBusinessPlan = authMutation({
  args: {
    programmeId: v.id("programmesAutoEmploi"),
    contenuJson: v.any(),
  },
  handler: async (ctx, args) => {
    const programme = await ctx.db.get(args.programmeId);
    if (!programme) throw new Error("PROGRAMME_NOT_FOUND");
    const demandeur = await ctx.db.get(programme.demandeurId);
    if (!demandeur || demandeur.userId !== ctx.user._id) {
      throw new Error("FORBIDDEN");
    }
    const prev = programme.businessPlan ?? { version: 0 };
    await ctx.db.patch(args.programmeId, {
      businessPlan: {
        ...prev,
        version: prev.version + 1,
        contenuJson: args.contenuJson,
      },
    });
    return { ok: true };
  },
});
