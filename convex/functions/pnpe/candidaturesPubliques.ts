/**
 * Convex functions — Candidatures publiques TRAVAIL.GA.
 *
 * Permet à tout citoyen connecté (D.E inscrit OU citoyen ordinaire avec
 * compte Better Auth basique) de postuler à une offre.
 *
 * Workflow :
 *  - D.E inscrit → utilise `candidatures.create` (existant) → typeCandidature
 *    DEMANDEUR_INSCRIT, CV PDF requis
 *  - Citoyen ordinaire → utilise `applyAsCitizen` (cette fonction) →
 *    typeCandidature CITOYEN_ORDINAIRE, contact direct + CV optionnel
 */
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { authMutation } from "../../lib/customFunctions";

/**
 * Postule à une offre en tant que citoyen ordinaire (sans inscription D.E
 * préalable). Le candidat fournit son contact direct ; l'employeur le
 * recontactera par email ou téléphone.
 */
export const applyAsCitizen = authMutation({
  args: {
    offreId: v.id("offresEmploi"),
    contact: v.object({
      nom: v.string(),
      prenoms: v.string(),
      email: v.string(),
      telephone: v.string(),
      niveauEtudes: v.optional(v.string()),
      experienceText: v.optional(v.string()),
    }),
    cvStorageId: v.optional(v.id("_storage")),
    lettreMotivation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const offre = await ctx.db.get(args.offreId);
    if (!offre) throw new Error("OFFRE_NOT_FOUND");
    if (offre.statut !== "PUBLIEE") {
      throw new Error("OFFRE_NOT_AVAILABLE");
    }

    // Vérif unicité : ce user a-t-il déjà postulé sur cette offre ?
    const existing = await ctx.db
      .query("candidatures")
      .withIndex("by_offre_applicant", (q) =>
        q.eq("offreId", args.offreId).eq("applicantUserId", ctx.user._id),
      )
      .unique();
    if (existing) {
      throw new Error("ALREADY_APPLIED");
    }

    const id = await ctx.db.insert("candidatures", {
      offreId: args.offreId,
      typeCandidature: "CITOYEN_ORDINAIRE",
      applicantUserId: ctx.user._id,
      applicantContact: args.contact,
      cvStorageId: args.cvStorageId,
      lettreMotivation: args.lettreMotivation,
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

    // Incrémente le compteur sur l'offre
    await ctx.db.patch(args.offreId, {
      nbCandidatures: (offre.nbCandidatures ?? 0) + 1,
    });

    // Notification email employeur (citoyen ordinaire)
    let recipientEmail: string | undefined;
    let employeurNom: string | undefined;

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
        employeurNom = creator.firstName ?? undefined;
      }
    }

    if (recipientEmail) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (ctx as any).scheduler.runAfter(
        0,
        internal.functions.pnpe.notifications.notifyCandidatureRecue,
        {
          to: recipientEmail,
          offreReference: offre.reference,
          offreTitre: offre.titre,
          candidatPrenoms: args.contact.prenoms,
          candidatNom: args.contact.nom,
          typeCandidature: "CITOYEN_ORDINAIRE",
          employeurNom,
        },
      );
    }

    return id;
  },
});
