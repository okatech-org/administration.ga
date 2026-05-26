/**
 * Convex functions — Candidatures D.E sur offres PNPE.
 *
 * D.E candidate à une offre PUBLIEE (workflow ENVOYEE → VUE → PRESELECTIONNEE
 * → ENTRETIEN → RETENUE | NON_RETENUE). Unicité par (offreId, demandeurId).
 */
import { v } from "convex/values";
import { authQuery, authMutation } from "../../lib/customFunctions";
import { statutCandidatureValidator } from "../../lib/validators/pnpe";

/** Crée une candidature (D.E → offre). */
export const create = authMutation({
  args: {
    offreId: v.id("offresEmploi"),
    demandeurId: v.id("demandeursEmploi"),
    cvStorageId: v.id("_storage"),
    lettreMotivation: v.optional(v.string()),
    documentsJoints: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    // Vérif : le D.E est bien le profil de l'utilisateur connecté
    const demandeur = await ctx.db.get(args.demandeurId);
    if (!demandeur) throw new Error("DEMANDEUR_NOT_FOUND");
    if (demandeur.userId !== ctx.user._id) {
      throw new Error("FORBIDDEN");
    }
    if (demandeur.statutCompte !== "ACTIF") {
      throw new Error("DEMANDEUR_NOT_ACTIVE");
    }
    // Vérif : offre publiée
    const offre = await ctx.db.get(args.offreId);
    if (!offre) throw new Error("OFFRE_NOT_FOUND");
    if (offre.statut !== "PUBLIEE") {
      throw new Error("OFFRE_NOT_AVAILABLE");
    }
    // Vérif : pas déjà candidaté
    const existing = await ctx.db
      .query("candidatures")
      .withIndex("by_offre_demandeur", (q) =>
        q.eq("offreId", args.offreId).eq("demandeurId", args.demandeurId),
      )
      .unique();
    if (existing) {
      throw new Error("ALREADY_APPLIED");
    }
    const id = await ctx.db.insert("candidatures", {
      typeCandidature: "DEMANDEUR_INSCRIT",
      offreId: args.offreId,
      demandeurId: args.demandeurId,
      cvStorageId: args.cvStorageId,
      lettreMotivation: args.lettreMotivation,
      documentsJoints: args.documentsJoints,
      statut: "ENVOYEE",
      historiqueStatuts: [
        {
          statut: "ENVOYEE",
          date: Date.now(),
          auteurUserId: ctx.user._id,
        },
      ],
      createdByUserId: ctx.user._id,
    });
    // Incrémente le compteur de candidatures sur l'offre
    await ctx.db.patch(args.offreId, {
      nbCandidatures: (offre.nbCandidatures ?? 0) + 1,
    });
    return id;
  },
});

/** Liste mes candidatures (D.E connecté). */
export const listMine = authQuery({
  args: {},
  handler: async (ctx) => {
    const demandeur = await ctx.db
      .query("demandeursEmploi")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .unique();
    if (!demandeur) return [];
    const candidatures = await ctx.db
      .query("candidatures")
      .withIndex("by_demandeur", (q) => q.eq("demandeurId", demandeur._id))
      .order("desc")
      .collect();
    // Enrichit avec l'offre liée
    return Promise.all(
      candidatures.map(async (c) => ({
        ...c,
        offre: await ctx.db.get(c.offreId),
      })),
    );
  },
});

/** Liste des candidatures sur une offre (employeur Phase 3). */
export const listByOffre = authQuery({
  args: {
    offreId: v.id("offresEmploi"),
    statut: v.optional(statutCandidatureValidator),
  },
  handler: async (ctx, args) => {
    // TODO Phase 7 : vérifier que ctx.user est l'employeur émetteur de l'offre.
    if (args.statut) {
      const statut = args.statut;
      return await ctx.db
        .query("candidatures")
        .withIndex("by_offre_statut", (q) =>
          q.eq("offreId", args.offreId).eq("statut", statut),
        )
        .collect();
    }
    return await ctx.db
      .query("candidatures")
      .withIndex("by_offre", (q) => q.eq("offreId", args.offreId))
      .collect();
  },
});

/** Met à jour le statut d'une candidature (action employeur). */
export const updateStatus = authMutation({
  args: {
    candidatureId: v.id("candidatures"),
    nouveauStatut: statutCandidatureValidator,
    commentaire: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const candidature = await ctx.db.get(args.candidatureId);
    if (!candidature) throw new Error("CANDIDATURE_NOT_FOUND");
    // TODO Phase 7 : vérifier rôle employeur (propriétaire de l'offre)
    // ou conseiller_pnpe (intermédiation).
    const history = candidature.historiqueStatuts ?? [];
    await ctx.db.patch(args.candidatureId, {
      statut: args.nouveauStatut,
      historiqueStatuts: [
        ...history,
        {
          statut: args.nouveauStatut,
          date: Date.now(),
          auteurUserId: ctx.user._id,
          commentaire: args.commentaire,
        },
      ],
    });
    return { ok: true };
  },
});

/** Retire sa propre candidature (D.E). */
export const withdraw = authMutation({
  args: { candidatureId: v.id("candidatures") },
  handler: async (ctx, args) => {
    const candidature = await ctx.db.get(args.candidatureId);
    if (!candidature) throw new Error("CANDIDATURE_NOT_FOUND");
    if (!candidature.demandeurId) {
      // Candidature CITOYEN_ORDINAIRE — pas de D.E à retirer côté PNPE.
      throw new Error("CANDIDATURE_NOT_DEMANDEUR_INSCRIT");
    }
    const demandeur = await ctx.db.get(candidature.demandeurId);
    if (!demandeur || demandeur.userId !== ctx.user._id) {
      throw new Error("FORBIDDEN");
    }
    await ctx.db.patch(args.candidatureId, {
      statut: "RETIREE",
      issueFinale: "ABANDON",
      dateIssueFinale: Date.now(),
    });
    return { ok: true };
  },
});
