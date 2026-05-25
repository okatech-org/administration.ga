/**
 * Convex functions — Compte citoyen ordinaire TRAVAIL.GA.
 *
 * Pas de table dediee : le compte est juste l'utilisateur Better Auth
 * (`users`). On expose des queries pour qu'un citoyen connecte puisse
 * lister :
 *   - les candidatures qu'il a envoyees comme "citoyen ordinaire"
 *     (table `candidatures` filtre par `applicantUserId`)
 *   - les annonces qu'il a publiees comme particulier
 *     (table `offresEmploi` filtre par `particulierInfo.userId`)
 *
 * Pour devenir D.E PNPE complet, le citoyen doit s'inscrire sur PNPE.GA
 * (creation d'une entree dans `demandeursEmploi`).
 */
import { v } from "convex/values";
import { authQuery } from "../../lib/customFunctions";

/**
 * Liste les candidatures envoyees par le citoyen connecte (toutes offres
 * confondues). Inclut un resume de l'offre cible.
 */
export const listMyCandidatures = authQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("candidatures")
      .withIndex("by_applicant_user", (q) =>
        q.eq("applicantUserId", ctx.user._id),
      )
      .order("desc")
      .take(100);

    return await Promise.all(
      rows.map(async (c) => {
        const offre = await ctx.db.get(c.offreId);
        return {
          _id: c._id,
          statut: c.statut,
          _creationTime: c._creationTime,
          lettreMotivation: c.lettreMotivation,
          offre: offre
            ? {
                _id: offre._id,
                titre: offre.titre,
                reference: offre.reference,
                ville: offre.lieuTravail.ville,
                typeContrat: offre.typeContrat,
              }
            : null,
        };
      }),
    );
  },
});

/**
 * Liste les offres publiees par le citoyen connecte comme particulier.
 * Pas d'index dedie (particulierInfo.userId est dans un sous-document) :
 * on parcourt les offres typeEmployeur=PARTICULIER, ce qui reste petit
 * en volume cible (< quelques milliers pour la production attendue).
 */
export const listMyAnnonces = authQuery({
  args: {},
  handler: async (ctx) => {
    const offres = await ctx.db
      .query("offresEmploi")
      .withIndex("by_type_statut", (q) =>
        q.eq("typeEmployeur", "PARTICULIER"),
      )
      .order("desc")
      .take(500);

    return offres
      .filter((o) => o.particulierInfo?.userId === ctx.user._id)
      .map((o) => ({
        _id: o._id,
        titre: o.titre,
        reference: o.reference,
        statut: o.statut,
        _creationTime: o._creationTime,
        candidaturesCount: o.nbCandidatures ?? 0,
        ville: o.lieuTravail.ville,
        typeContrat: o.typeContrat,
      }));
  },
});

/**
 * Liste les candidatures recues sur une annonce publiee par le citoyen
 * connecte comme particulier. Verifie que `particulierInfo.userId`
 * de l'offre correspond bien au user connecte (RBAC particulier).
 */
export const listCandidaturesForMyParticulierOffre = authQuery({
  args: { offreReference: v.string() },
  handler: async (ctx, args) => {
    const offre = await ctx.db
      .query("offresEmploi")
      .withIndex("by_reference", (q) => q.eq("reference", args.offreReference))
      .unique();
    if (!offre) throw new Error("OFFRE_NOT_FOUND");
    if (offre.typeEmployeur !== "PARTICULIER") {
      throw new Error("FORBIDDEN: pas une offre PARTICULIER");
    }
    if (offre.particulierInfo?.userId !== ctx.user._id) {
      throw new Error("FORBIDDEN: pas votre annonce");
    }

    const candidatures = await ctx.db
      .query("candidatures")
      .withIndex("by_offre", (q) => q.eq("offreId", offre._id))
      .order("desc")
      .collect();

    return {
      offre: {
        _id: offre._id,
        titre: offre.titre,
        reference: offre.reference,
        statut: offre.statut,
        ville: offre.lieuTravail.ville,
        typeContrat: offre.typeContrat,
      },
      candidatures: await Promise.all(
        candidatures.map(async (c) => {
          // D.E inscrit -> on enrichit avec son profil
          let candidatProfil: {
            prenoms: string;
            nom: string;
            email?: string;
            telephone?: string;
          } | null = null;

          if (c.demandeurId) {
            const de = await ctx.db.get(c.demandeurId);
            if (de) {
              candidatProfil = {
                prenoms: de.prenoms,
                nom: de.nom,
                email: de.email,
                telephone: de.telephone,
              };
            }
          } else if (c.applicantContact) {
            candidatProfil = {
              prenoms: c.applicantContact.prenoms,
              nom: c.applicantContact.nom,
              email: c.applicantContact.email,
              telephone: c.applicantContact.telephone,
            };
          }

          return {
            _id: c._id,
            statut: c.statut,
            _creationTime: c._creationTime,
            lettreMotivation: c.lettreMotivation,
            typeCandidature: c.typeCandidature,
            candidatProfil,
          };
        }),
      ),
    };
  },
});

/**
 * Recupere les infos affichables du citoyen connecte (nom, email,
 * nombre total de candidatures et d'annonces). Utile pour le widget
 * profil du tableau de bord.
 */
export const getMyOverview = authQuery({
  args: {},
  handler: async (ctx) => {
    const candidatures = await ctx.db
      .query("candidatures")
      .withIndex("by_applicant_user", (q) =>
        q.eq("applicantUserId", ctx.user._id),
      )
      .collect();

    const offresParticulier = await ctx.db
      .query("offresEmploi")
      .withIndex("by_type_statut", (q) =>
        q.eq("typeEmployeur", "PARTICULIER"),
      )
      .collect();

    const mesAnnonces = offresParticulier.filter(
      (o) => o.particulierInfo?.userId === ctx.user._id,
    );

    return {
      user: {
        _id: ctx.user._id,
        email: ctx.user.email,
        name:
          [ctx.user.lastName, ctx.user.firstName].filter(Boolean).join(" ") ||
          ctx.user.email,
      },
      stats: {
        candidaturesCount: candidatures.length,
        annoncesCount: mesAnnonces.length,
      },
    };
  },
});
