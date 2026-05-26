/**
 * Convex functions — Statistiques PNPE.
 *
 * Aggregates simples (count) pour les dashboards Backoffice et Direction.
 * En Phase 7+, à migrer vers `@convex-dev/aggregate` pour des comptages
 * incrémentaux performants.
 */
import { v } from "convex/values";
import { query } from "../../_generated/server";
import { authQuery } from "../../lib/customFunctions";

/** KPI nationaux : counts globaux pour le dashboard backoffice. */
export const nationalKpis = query({
  args: {},
  handler: async (ctx) => {
    const [demandeursAll, offresPubliees, employeursVerifies, antennes] =
      await Promise.all([
        ctx.db.query("demandeursEmploi").collect(),
        ctx.db
          .query("offresEmploi")
          .withIndex("by_statut", (q) => q.eq("statut", "PUBLIEE"))
          .collect(),
        ctx.db
          .query("employeurs")
          .withIndex("by_statut_verification", (q) =>
            q.eq("statutVerification", "VERIFIE"),
          )
          .collect(),
        ctx.db
          .query("antennesPnpe")
          .withIndex("by_statut", (q) => q.eq("statut", "OPERATIONNELLE"))
          .collect(),
      ]);

    const demandeursActifs = demandeursAll.filter(
      (d) =>
        d.statutCompte === "ACTIF" ||
        d.statutCompte === "EN_FORMATION" ||
        d.statutCompte === "EN_CONTRAT",
    );
    const demandeursPlaces = demandeursAll.filter(
      (d) => d.statutCompte === "PLACE",
    );

    return {
      demandeursInscrits: demandeursAll.length,
      demandeursActifs: demandeursActifs.length,
      demandeursPlaces: demandeursPlaces.length,
      offresPubliees: offresPubliees.length,
      employeursVerifies: employeursVerifies.length,
      antennesOperationnelles: antennes.length,
    };
  },
});

/** Répartition des D.E par province (pour graphique régional). */
export const demandeursByProvince = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("demandeursEmploi").collect();
    const map = new Map<string, number>();
    for (const d of all) {
      map.set(d.provinceResidence, (map.get(d.provinceResidence) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([province, count]) => ({
      province,
      count,
    }));
  },
});

/** Top secteurs d'offres publiées. */
export const offresBySector = query({
  args: {},
  handler: async (ctx) => {
    const offres = await ctx.db
      .query("offresEmploi")
      .withIndex("by_statut", (q) => q.eq("statut", "PUBLIEE"))
      .collect();
    const map = new Map<string, number>();
    for (const o of offres) {
      const s = o.secteurActivite ?? "AUTRES";
      map.set(s, (map.get(s) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([secteur, count]) => ({ secteur, count }))
      .sort((a, b) => b.count - a.count);
  },
});

/**
 * KPI d'une antenne provinciale (pour Chef d'antenne).
 *
 * Renvoie les compteurs des D.E rattachés à l'antenne, ainsi qu'un comptage
 * des candidatures associées (jointure côté serveur via index by_demandeur).
 */
export const antenneKpis = query({
  args: { antenneId: v.id("antennesPnpe") },
  handler: async (ctx, { antenneId }) => {
    const [demandeursAntenne, antenne] = await Promise.all([
      ctx.db
        .query("demandeursEmploi")
        .withIndex("by_antenne_statut", (q) => q.eq("antenneId", antenneId))
        .collect(),
      ctx.db.get(antenneId),
    ]);

    const byStatut = new Map<string, number>();
    for (const d of demandeursAntenne) {
      byStatut.set(d.statutCompte, (byStatut.get(d.statutCompte) ?? 0) + 1);
    }

    // Compte des conseillers actifs rattachés à l'antenne
    const staff = await ctx.db
      .query("pnpeStaffAssignments")
      .withIndex("by_antenne", (q) => q.eq("antenneId", antenneId))
      .collect();
    const conseillersActifs = staff.filter(
      (s) => s.isActive && s.pnpeRole === "conseiller_pnpe",
    ).length;

    // Comptage des candidatures par statut sur les D.E de l'antenne
    let candidaturesTotal = 0;
    let candidaturesActives = 0;
    for (const d of demandeursAntenne) {
      const cs = await ctx.db
        .query("candidatures")
        .withIndex("by_demandeur", (q) => q.eq("demandeurId", d._id))
        .collect();
      candidaturesTotal += cs.length;
      candidaturesActives += cs.filter(
        (c) =>
          c.statut === "ENVOYEE" ||
          c.statut === "VUE" ||
          c.statut === "PRESELECTIONNEE" ||
          c.statut === "ENTRETIEN",
      ).length;
    }

    return {
      antenneNom: antenne?.nom ?? "Antenne inconnue",
      antenneVille: antenne?.ville ?? "",
      demandeursTotal: demandeursAntenne.length,
      demandeursEnValidation: byStatut.get("EN_VALIDATION") ?? 0,
      demandeursActifs: byStatut.get("ACTIF") ?? 0,
      demandeursPlaces: byStatut.get("PLACE") ?? 0,
      demandeursEnContrat: byStatut.get("EN_CONTRAT") ?? 0,
      conseillersActifs,
      candidaturesTotal,
      candidaturesActives,
    };
  },
});

/**
 * KPI personnels du conseiller connecté (portefeuille).
 *
 * Récupère l'antenne du conseiller via son `pnpeStaffAssignments` actif,
 * puis compte les D.E qu'il a en charge + la file d'attente de son antenne.
 */
export const myPortfolioKpis = authQuery({
  args: {},
  handler: async (ctx) => {
    const userId = ctx.user._id;
    const staff = await ctx.db
      .query("pnpeStaffAssignments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const activeAssignment = staff.find((s) => s.isActive);
    if (!activeAssignment || !activeAssignment.antenneId) {
      return null;
    }
    const antenneId = activeAssignment.antenneId;

    const [mesDemandeurs, fileAttente, antenne] = await Promise.all([
      ctx.db
        .query("demandeursEmploi")
        .withIndex("by_conseiller", (q) => q.eq("conseillerAttribueId", userId))
        .collect(),
      ctx.db
        .query("demandeursEmploi")
        .withIndex("by_antenne_statut", (q) =>
          q.eq("antenneId", antenneId).eq("statutCompte", "EN_VALIDATION"),
        )
        .collect(),
      ctx.db.get(antenneId),
    ]);

    const mesDemandeursActifs = mesDemandeurs.filter(
      (d) =>
        d.statutCompte === "ACTIF" ||
        d.statutCompte === "EN_FORMATION" ||
        d.statutCompte === "EN_CONTRAT",
    ).length;

    // Comptage des candidatures sur les D.E du portefeuille
    let candidaturesEntretien = 0;
    for (const d of mesDemandeurs) {
      const cs = await ctx.db
        .query("candidatures")
        .withIndex("by_demandeur_statut", (q) =>
          q.eq("demandeurId", d._id).eq("statut", "ENTRETIEN"),
        )
        .collect();
      candidaturesEntretien += cs.length;
    }

    return {
      antenneNom: antenne?.nom ?? "Antenne",
      antenneId,
      mesDemandeursTotal: mesDemandeurs.length,
      mesDemandeursActifs,
      fileAttenteTotal: fileAttente.length,
      candidaturesEntretien,
    };
  },
});

/** Offres récemment publiées (pour widget Dashboard). */
export const recentOffres = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = Math.min(limit ?? 5, 20);
    const offres = await ctx.db
      .query("offresEmploi")
      .withIndex("by_publication")
      .order("desc")
      .take(max);
    return offres
      .filter((o) => o.statut === "PUBLIEE")
      .map((o) => ({
        _id: o._id,
        titre: o.titre,
        reference: o.reference,
        typeContrat: o.typeContrat,
        ville: o.lieuTravail.ville,
        province: o.lieuTravail.province,
        datePublication: o.datePublication,
        nbCandidatures: o.nbCandidatures ?? 0,
      }));
  },
});

/** D.E récemment inscrits (pour widget Dashboard). */
export const recentDemandeurs = query({
  args: { antenneId: v.optional(v.id("antennesPnpe")), limit: v.optional(v.number()) },
  handler: async (ctx, { antenneId, limit }) => {
    const max = Math.min(limit ?? 5, 20);
    const all = antenneId
      ? await ctx.db
          .query("demandeursEmploi")
          .withIndex("by_antenne_statut", (q) => q.eq("antenneId", antenneId))
          .order("desc")
          .take(max)
      : await ctx.db
          .query("demandeursEmploi")
          .order("desc")
          .take(max);
    return all.map((d) => ({
      _id: d._id,
      nom: d.nom,
      prenoms: d.prenoms,
      provinceResidence: d.provinceResidence,
      statutCompte: d.statutCompte,
      _creationTime: d._creationTime,
    }));
  },
});
