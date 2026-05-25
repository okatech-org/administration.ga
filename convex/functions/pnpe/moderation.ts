/**
 * Convex functions — Moderation PNPE (signalements offres).
 *
 * Couvre le workflow de moderation des offres signalees par la
 * communaute (majoritairement les offres PARTICULIER pour eviter
 * le travail dissimule et les arnaques).
 *
 * Flux :
 *   1) utilisateur signale -> `offresPubliques.signaler` incremente le
 *      compteur ; au seuil 3, flaggedForReview = true
 *   2) conseiller PNPE consulte la file dans /conseiller/moderation
 *   3) conseiller peut soit :
 *      - rejeter les signalements -> resetSignalements (offre reste PUBLIEE)
 *      - suspendre l'offre        -> suspendOffre (statut = RETIREE)
 *      - supprimer l'offre        -> hardDeleteOffre (PARTICULIER seul)
 */
import { v } from "convex/values";
import { authMutation } from "../../lib/customFunctions";
import { query } from "../../_generated/server";

/**
 * Liste les offres signalees au moins une fois (compteur > 0), triees
 * par flaggedForReview puis par lastSignaledAt desc. Les flagged
 * apparaissent en haut.
 */
export const listSignalees = query({
  args: {
    onlyFlagged: v.optional(v.boolean()),
    typeEmployeur: v.optional(
      v.union(
        v.literal("ENTREPRISE"),
        v.literal("ADMINISTRATION"),
        v.literal("PARTICULIER"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    // Scope par typeEmployeur si filtre, sinon toutes les offres ayant
    // signalements non-null avec count >= 1.
    const offres = args.typeEmployeur
      ? await ctx.db
          .query("offresEmploi")
          .withIndex("by_type_statut", (q) =>
            q.eq("typeEmployeur", args.typeEmployeur!),
          )
          .order("desc")
          .take(500)
      : await ctx.db.query("offresEmploi").order("desc").take(500);

    const filtered = offres.filter((o) => {
      const sig = o.signalements;
      if (!sig || sig.count < 1) return false;
      if (args.onlyFlagged && !sig.flaggedForReview) return false;
      return true;
    });

    // Tri : flagged d'abord, puis lastSignaledAt desc
    filtered.sort((a, b) => {
      const af = a.signalements?.flaggedForReview ? 1 : 0;
      const bf = b.signalements?.flaggedForReview ? 1 : 0;
      if (af !== bf) return bf - af;
      const ad = a.signalements?.lastSignaledAt ?? 0;
      const bd = b.signalements?.lastSignaledAt ?? 0;
      return bd - ad;
    });

    // Enrichit avec les motifs (stockes dans metadata.signalementsMotifs)
    return filtered.slice(0, limit).map((o) => {
      const motifs =
        ((o.metadata as { signalementsMotifs?: string[] } | undefined)
          ?.signalementsMotifs) ?? [];
      return {
        _id: o._id,
        reference: o.reference,
        titre: o.titre,
        typeEmployeur: o.typeEmployeur,
        statut: o.statut,
        _creationTime: o._creationTime,
        ville: o.lieuTravail.ville,
        signalements: o.signalements ?? { count: 0, flaggedForReview: false },
        motifs,
        particulierInfo: o.particulierInfo
          ? {
              nom: o.particulierInfo.nom,
              prenoms: o.particulierInfo.prenoms,
              email: o.particulierInfo.email,
              telephone: o.particulierInfo.telephone,
            }
          : null,
      };
    });
  },
});

/**
 * Reset les signalements d'une offre (le conseiller a juge que les
 * signalements ne sont pas justifies). L'offre reste publiee.
 */
export const resetSignalements = authMutation({
  args: {
    offreId: v.id("offresEmploi"),
    commentaireModeration: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const offre = await ctx.db.get(args.offreId);
    if (!offre) throw new Error("OFFRE_NOT_FOUND");

    const prevMotifs =
      ((offre.metadata as { signalementsMotifs?: string[] } | undefined)
        ?.signalementsMotifs) ?? [];

    await ctx.db.patch(args.offreId, {
      signalements: {
        count: 0,
        flaggedForReview: false,
        lastSignaledAt: offre.signalements?.lastSignaledAt,
      },
      metadata: {
        ...(offre.metadata as object | undefined),
        signalementsMotifs: [], // reset
        signalementsHistorique: [
          ...(((offre.metadata as { signalementsHistorique?: string[] })
            ?.signalementsHistorique) ?? []),
          `${new Date().toISOString()} — ${prevMotifs.length} signalement(s) rejete(s) par ${ctx.user._id}${
            args.commentaireModeration ? ` — ${args.commentaireModeration}` : ""
          }`,
        ],
      },
    });
    return { ok: true };
  },
});

/**
 * Suspend l'offre (statut -> RETIREE). Le conseiller a juge que les
 * signalements sont fondes mais l'offre n'est pas a supprimer (anomalie
 * legere : informations incompletes, ambiguites).
 */
export const suspendOffre = authMutation({
  args: {
    offreId: v.id("offresEmploi"),
    motifRetrait: v.string(),
  },
  handler: async (ctx, args) => {
    const offre = await ctx.db.get(args.offreId);
    if (!offre) throw new Error("OFFRE_NOT_FOUND");

    await ctx.db.patch(args.offreId, {
      statut: "RETIREE",
      motifRejet: args.motifRetrait,
      signalements: {
        count: offre.signalements?.count ?? 0,
        flaggedForReview: false, // sort de la file de moderation
        lastSignaledAt: offre.signalements?.lastSignaledAt,
      },
      metadata: {
        ...(offre.metadata as object | undefined),
        signalementsHistorique: [
          ...(((offre.metadata as { signalementsHistorique?: string[] })
            ?.signalementsHistorique) ?? []),
          `${new Date().toISOString()} — Suspendue par ${ctx.user._id} — ${args.motifRetrait}`,
        ],
      },
    });
    return { ok: true };
  },
});

/**
 * Supprime une offre PARTICULIER suspecte (arnaque, fraude, contenu
 * illegal). Reserve aux offres PARTICULIER. Les offres ENTREPRISE et
 * ADMINISTRATION passent toujours par suspendOffre puis investigation
 * formelle.
 */
export const hardDeleteOffre = authMutation({
  args: {
    offreId: v.id("offresEmploi"),
    motifSuppression: v.string(),
  },
  handler: async (ctx, args) => {
    const offre = await ctx.db.get(args.offreId);
    if (!offre) throw new Error("OFFRE_NOT_FOUND");
    if (offre.typeEmployeur !== "PARTICULIER") {
      throw new Error(
        "FORBIDDEN: seules les offres PARTICULIER peuvent etre supprimees. Utiliser suspendOffre pour les autres types.",
      );
    }

    // Audit avant suppression
    const motif = args.motifSuppression;
    console.warn(
      `[Moderation] Suppression offre ${offre.reference} par ${ctx.user._id}: ${motif}`,
    );

    // Cascade : supprimer aussi les candidatures liees
    const candidatures = await ctx.db
      .query("candidatures")
      .withIndex("by_offre_applicant", (q) => q.eq("offreId", args.offreId))
      .collect();
    for (const c of candidatures) {
      await ctx.db.delete(c._id);
    }

    await ctx.db.delete(args.offreId);
    return { ok: true, candidaturesSupprimees: candidatures.length };
  },
});

/**
 * Stats moderation : compteurs par etat pour le widget dashboard.
 */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    // Approche simple : scan limite a 500 dernieres offres avec signalements.
    // En prod a forte volumetrie, un aggregate dedie serait preferable.
    const offres = await ctx.db
      .query("offresEmploi")
      .order("desc")
      .take(1000);

    const withSignalements = offres.filter(
      (o) => (o.signalements?.count ?? 0) > 0,
    );
    const flagged = withSignalements.filter(
      (o) => o.signalements?.flaggedForReview,
    );
    const byType = {
      ENTREPRISE: flagged.filter((o) => o.typeEmployeur === "ENTREPRISE")
        .length,
      ADMINISTRATION: flagged.filter(
        (o) => o.typeEmployeur === "ADMINISTRATION",
      ).length,
      PARTICULIER: flagged.filter((o) => o.typeEmployeur === "PARTICULIER")
        .length,
    };

    return {
      totalSignalees: withSignalements.length,
      flaggedForReview: flagged.length,
      byTypeFlagged: byType,
    };
  },
});
