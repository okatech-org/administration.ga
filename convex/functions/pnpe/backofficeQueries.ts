/**
 * Queries de listing pour le backoffice ministère du Travail.
 *
 * Lecture seule, sans gating supplémentaire — le backoffice est déjà gated
 * au niveau auth (super_admin / admin_system uniquement) et l'accès aux
 * routes /pnpe/* impose le rôle direction PNPE ou admin Ministère.
 *
 * MVP : simples `collect()` car les volumes restent modestes (≤ 50 agents,
 * ≤ 200 contrats, ≤ 100 programmes). À paginer en Phase 7 quand on dépasse
 * ces seuils.
 */
import { query } from "../../_generated/server";

// ─── Staff PNPE (utilisateurs) ───────────────────────────────

/**
 * Liste des affectations staff PNPE (DG + admin ministère + chefs d'antenne
 * + conseillers + formateurs Auto-Emploi). Pour la page `/pnpe/utilisateurs`.
 *
 * Inclut le nom de l'antenne (join) pour affichage direct dans le tableau.
 */
export const listStaff = query({
  args: {},
  handler: async (ctx) => {
    const assignments = await ctx.db.query("pnpeStaffAssignments").collect();

    // Join avec antennes (pour afficher le nom plutôt que l'ID)
    const antennes = await ctx.db.query("antennesPnpe").collect();
    const antenneById = new Map(antennes.map((a) => [a._id, a]));

    return assignments.map((a) => {
      const antenne = a.antenneId ? antenneById.get(a.antenneId) : undefined;
      return {
        _id: a._id,
        userId: a.userId,
        nom: a.nom,
        prenoms: a.prenoms,
        pnpeRole: a.pnpeRole,
        fonctionAffichee: a.fonctionAffichee,
        modules: a.modules,
        isActive: a.isActive,
        antenneNom: antenne?.nom,
        antenneVille: antenne?.ville,
        antenneProvince: antenne?.province,
      };
    });
  },
});

// ─── Contrats suivis (apprentissage/professionnalisation/insertion) ──────

/**
 * Liste de tous les contrats suivis nationalement. Pour la page
 * `/pnpe/contrats`. Join demandeur + employeur pour affichage.
 *
 * Tri du plus récent au plus ancien (`_creationTime` décroissant).
 */
export const listContrats = query({
  args: {},
  handler: async (ctx) => {
    const contrats = await ctx.db.query("contratsSuivi").collect();

    // Join demandeurs + employeurs
    const demandeursIds = new Set(contrats.map((c) => c.demandeurId));
    const employeursIds = new Set(contrats.map((c) => c.employeurId));
    const demandeurs = await Promise.all(
      Array.from(demandeursIds).map((id) => ctx.db.get(id)),
    );
    const employeurs = await Promise.all(
      Array.from(employeursIds).map((id) => ctx.db.get(id)),
    );
    const demById = new Map(
      demandeurs.filter((d) => d !== null).map((d) => [d!._id, d!]),
    );
    const empById = new Map(
      employeurs.filter((e) => e !== null).map((e) => [e!._id, e!]),
    );

    return contrats
      .map((c) => {
        const d = demById.get(c.demandeurId);
        const e = empById.get(c.employeurId);
        return {
          _id: c._id,
          _creationTime: c._creationTime,
          type: c.type,
          referenceContrat: c.referenceContrat,
          poste: c.poste,
          dateDebut: c.dateDebut,
          dateFin: c.dateFin,
          statut: c.statut,
          remuneration: c.remuneration,
          visitesSuiviCount: c.visitesSuivi?.length ?? 0,
          demandeurNom: d ? `${d.prenoms ?? ""} ${d.nom ?? ""}`.trim() : "?",
          employeurNom: e?.raisonSociale ?? "?",
        };
      })
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});

/** KPI agrégés pour la page contrats (en-tête de page). */
export const contratsKpis = query({
  args: {},
  handler: async (ctx) => {
    const contrats = await ctx.db.query("contratsSuivi").collect();
    const byType: Record<string, number> = {};
    const byStatut: Record<string, number> = {};
    for (const c of contrats) {
      byType[c.type] = (byType[c.type] ?? 0) + 1;
      byStatut[c.statut] = (byStatut[c.statut] ?? 0) + 1;
    }
    return {
      total: contrats.length,
      byType,
      byStatut,
      enCours: byStatut.EN_COURS ?? 0,
      termines: byStatut.TERMINE ?? 0,
      rompus:
        (byStatut.ROMPU_EMPLOYEUR ?? 0) + (byStatut.ROMPU_APPRENTI ?? 0),
    };
  },
});

// ─── Programmes Auto-Emploi (pilotage) ───────────────────────

/**
 * Liste de tous les programmes Auto-Emploi pour pilotage backoffice.
 * Page `/pnpe/programmes`.
 *
 * Join demandeur pour affichage nom + province.
 */
export const listProgrammes = query({
  args: {},
  handler: async (ctx) => {
    const programmes = await ctx.db.query("programmesAutoEmploi").collect();

    const demandeursIds = new Set(programmes.map((p) => p.demandeurId));
    const demandeurs = await Promise.all(
      Array.from(demandeursIds).map((id) => ctx.db.get(id)),
    );
    const demById = new Map(
      demandeurs.filter((d) => d !== null).map((d) => [d!._id, d!]),
    );

    return programmes
      .map((p) => {
        const d = demById.get(p.demandeurId);
        return {
          _id: p._id,
          _creationTime: p._creationTime,
          demandeurNom: d ? `${d.prenoms ?? ""} ${d.nom ?? ""}`.trim() : "?",
          demandeurProvince: d?.provinceResidence,
          secteurProjet: p.secteurProjet,
          descriptionProjet: p.descriptionProjet,
          provinceProjet: p.provinceProjet,
          etape: p.etape,
          dateEtape: p.dateEtape,
          hasBusinessPlan: !!p.businessPlan,
          ediandzaParcoursId: p.ediandzaParcoursId,
          anpiDossierId: p.anpiDossierId,
        };
      })
      .sort((a, b) => b._creationTime - a._creationTime);
  },
});

/** KPI pilotage Auto-Emploi (taux de complétion par étape). */
export const programmesKpis = query({
  args: {},
  handler: async (ctx) => {
    const programmes = await ctx.db.query("programmesAutoEmploi").collect();
    const byEtape: Record<string, number> = {};
    for (const p of programmes) {
      byEtape[p.etape] = (byEtape[p.etape] ?? 0) + 1;
    }
    const tauxLancement =
      programmes.length > 0
        ? Math.round(((byEtape.LANCEMENT ?? 0) / programmes.length) * 100)
        : 0;
    return {
      total: programmes.length,
      byEtape,
      tauxLancement,
      enFormation: byEtape.FORMATION_BMC ?? 0,
      enElaboration: byEtape.ELABORATION_PLAN ?? 0,
      lances: byEtape.LANCEMENT ?? 0,
    };
  },
});
