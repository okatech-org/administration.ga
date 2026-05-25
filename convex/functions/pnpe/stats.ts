/**
 * Convex functions — Statistiques PNPE.
 *
 * Aggregates simples (count) pour les dashboards Backoffice et Direction.
 * En Phase 7+, à migrer vers `@convex-dev/aggregate` pour des comptages
 * incrémentaux performants.
 */
import { query } from "../../_generated/server";

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
