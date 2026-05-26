/**
 * Convex functions — Programmes Auto-Emploi PNPE.
 *
 * Couvre l'inscription au programme, le suivi BMC (Business Model Canvas),
 * l'élaboration du business plan et les passerelles Ediandza / ANPI-Gabon.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "../../_generated/server";
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

// ─── Intégrations externes (Phase 7.6) ─────────────────────────

/**
 * Persiste l'ID du parcours Ediandza retourné par l'action `enrollDemandeurInBmcSession`
 * (ou par le webhook côté Ediandza). Met aussi à jour l'objet `formationBMC`
 * pour cohérence d'affichage côté D.E et conseiller.
 *
 * Internal mutation : invoquée depuis l'action Node `ediandzaEnrollment`
 * (qui ne peut pas patcher la table directement) et depuis le webhook HTTP
 * `/integrations/ediandza/webhook`.
 */
export const setEdiandzaParcoursId = internalMutation({
  args: {
    programmeId: v.id("programmesAutoEmploi"),
    ediandzaParcoursId: v.string(),
    formationBMC: v.optional(
      v.object({
        sessionId: v.string(),
        dateDebut: v.number(),
        dateFin: v.number(),
        statutSuivi: v.union(
          v.literal("INSCRIT"),
          v.literal("EN_COURS"),
          v.literal("TERMINE"),
          v.literal("ABANDON"),
        ),
        note: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const programme = await ctx.db.get(args.programmeId);
    if (!programme) throw new Error("PROGRAMME_NOT_FOUND");
    const patch: Record<string, unknown> = {
      ediandzaParcoursId: args.ediandzaParcoursId,
    };
    if (args.formationBMC) {
      patch.formationBMC = {
        ...args.formationBMC,
        attestationStorageId: programme.formationBMC?.attestationStorageId,
      };
    }
    await ctx.db.patch(args.programmeId, patch);
    return { ok: true };
  },
});

/**
 * Persiste l'ID du dossier ANPI-Gabon (formalisation) après l'action
 * `createFormalisationDossier` ou un webhook ANPI. Avance le programme
 * à l'étape LANCEMENT si le dossier est validé.
 */
export const setAnpiDossierId = internalMutation({
  args: {
    programmeId: v.id("programmesAutoEmploi"),
    anpiDossierId: v.string(),
    /** Si true, passe le programme en étape LANCEMENT. */
    avancerEnLancement: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const programme = await ctx.db.get(args.programmeId);
    if (!programme) throw new Error("PROGRAMME_NOT_FOUND");
    const patch: Record<string, unknown> = {
      anpiDossierId: args.anpiDossierId,
    };
    if (args.avancerEnLancement) {
      patch.etape = "LANCEMENT";
      patch.dateEtape = Date.now();
    }
    await ctx.db.patch(args.programmeId, patch);
    return { ok: true };
  },
});

/**
 * Internal query : récupère un programme par ediandzaParcoursId.
 * Utilisé par le webhook Ediandza pour résoudre le programme cible.
 */
export const getByEdiandzaParcoursId = internalQuery({
  args: { ediandzaParcoursId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("programmesAutoEmploi").collect();
    return (
      all.find((p) => p.ediandzaParcoursId === args.ediandzaParcoursId) ?? null
    );
  },
});

/**
 * Internal query : récupère un programme par anpiDossierId.
 * Utilisé par le webhook ANPI-Gabon.
 */
export const getByAnpiDossierId = internalQuery({
  args: { anpiDossierId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("programmesAutoEmploi").collect();
    return all.find((p) => p.anpiDossierId === args.anpiDossierId) ?? null;
  },
});
