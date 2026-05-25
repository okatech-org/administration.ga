/**
 * Convex functions — Candidatures D.E sur offres PNPE.
 *
 * D.E candidate à une offre PUBLIEE (workflow ENVOYEE → VUE → PRESELECTIONNEE
 * → ENTRETIEN → RETENUE | NON_RETENUE). Unicité par (offreId, demandeurId).
 */
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { authQuery, authMutation } from "../../lib/customFunctions";
import { statutCandidatureValidator } from "../../lib/validators/pnpe";

/**
 * Helper : schedule la notification "Candidature recue" a l'employeur.
 * Resout le destinataire selon typeEmployeur (ENTREPRISE / PARTICULIER /
 * ADMINISTRATION). Silencieux si pas d'email valide trouve.
 */
async function scheduleNotifyCandidatureRecue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  params: {
    offre: {
      _id: unknown;
      reference: string;
      titre: string;
      typeEmployeur: "ENTREPRISE" | "ADMINISTRATION" | "PARTICULIER";
      employeurId?: unknown;
      orgId?: unknown;
      particulierInfo?: { email?: string; prenoms?: string; nom?: string } | null;
      createdByUserId: unknown;
    };
    candidatPrenoms: string;
    candidatNom: string;
    typeCandidature: "DEMANDEUR_INSCRIT" | "CITOYEN_ORDINAIRE";
  },
) {
  let recipientEmail: string | undefined;
  let employeurNom: string | undefined;
  const { offre } = params;

  if (offre.typeEmployeur === "ENTREPRISE" && offre.employeurId) {
    const emp = await ctx.db.get(offre.employeurId);
    if (emp?.contact?.email) {
      recipientEmail = emp.contact.email;
      employeurNom = emp.raisonSociale;
    }
  } else if (offre.typeEmployeur === "PARTICULIER" && offre.particulierInfo) {
    recipientEmail = offre.particulierInfo.email;
    employeurNom = `${offre.particulierInfo.prenoms} ${offre.particulierInfo.nom}`;
  } else if (offre.typeEmployeur === "ADMINISTRATION") {
    const creator = await ctx.db.get(offre.createdByUserId);
    if (creator?.email) {
      recipientEmail = creator.email;
      employeurNom = creator.firstName;
    }
  }

  if (!recipientEmail) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (internal.functions as any).pnpe?.notifications
    ?.notifyCandidatureRecue;
  if (!fn) return;
  await ctx.scheduler.runAfter(0, fn, {
    to: recipientEmail,
    offreReference: offre.reference,
    offreTitre: offre.titre,
    candidatPrenoms: params.candidatPrenoms,
    candidatNom: params.candidatNom,
    typeCandidature: params.typeCandidature,
    employeurNom,
  });
}

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
      offreId: args.offreId,
      typeCandidature: "DEMANDEUR_INSCRIT" as const,
      demandeurId: args.demandeurId,
      applicantUserId: ctx.user._id,
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

    // Notification email employeur (D.E inscrit)
    await scheduleNotifyCandidatureRecue(ctx, {
      offre: {
        _id: offre._id,
        reference: offre.reference,
        titre: offre.titre,
        typeEmployeur: offre.typeEmployeur,
        employeurId: offre.employeurId,
        orgId: offre.orgId,
        particulierInfo: offre.particulierInfo,
        createdByUserId: offre.createdByUserId,
      },
      candidatPrenoms: demandeur.prenoms,
      candidatNom: demandeur.nom,
      typeCandidature: "DEMANDEUR_INSCRIT",
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
    if (!candidature.demandeurId) throw new Error("CANDIDATURE_NOT_OWNED");
    const demandeur = await ctx.db.get(candidature.demandeurId);
    if (!demandeur || !("userId" in demandeur) || demandeur.userId !== ctx.user._id) {
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
