import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  statutContratSuiviValidator,
  typeContratSuiviValidator,
} from "../../lib/validators/pnpe";

/**
 * Contrats d'apprentissage / professionnalisation / adaptation / insertion
 * suivis par le PNPE.
 *
 * Au-delà du simple matching offre↔candidat, le PNPE accompagne les contrats
 * spécifiques nécessitant un suivi pédagogique :
 *  - APPRENTISSAGE : contrat d'apprentissage avec maître d'apprentissage
 *  - PROFESSIONNALISATION : formation alternée diplômante
 *  - ADAPTATION : période d'adaptation à un nouveau poste
 *  - INSERTION : dispositif d'insertion sociale (jeunes en difficulté)
 *
 * Le conseiller PNPE effectue des visites de suivi (3 minimum réglementaires
 * pour un apprentissage) et établit un bilan de fin de contrat.
 */
export const contratsSuiviTable = defineTable({
  type: typeContratSuiviValidator,

  // ─── Parties ────────────────────────────────────────────────
  demandeurId: v.id("demandeursEmploi"),
  employeurId: v.id("employeurs"),
  /** Lien éventuel à l'offre d'origine. */
  offreId: v.optional(v.id("offresEmploi")),

  /** Référence officielle du contrat (souvent fourni par employeur). */
  referenceContrat: v.string(),
  poste: v.string(),

  // ─── Dates ──────────────────────────────────────────────────
  dateDebut: v.number(),
  /** Date de fin prévue (peut être prolongée). */
  dateFin: v.number(),
  /** Date de fin réelle (si rupture anticipée ou prolongation). */
  dateFinReelle: v.optional(v.number()),

  // ─── Maître d'apprentissage (apprentissage uniquement) ──────
  maitreApprentissage: v.optional(
    v.object({
      nom: v.string(),
      prenoms: v.string(),
      fonction: v.string(),
      email: v.string(),
      telephone: v.optional(v.string()),
    }),
  ),

  // ─── Rémunération ───────────────────────────────────────────
  remuneration: v.optional(v.number()), // XAF mensuel

  // ─── Formation théorique associée ───────────────────────────
  formationTheorique: v.optional(
    v.object({
      etablissement: v.string(),
      programme: v.string(),
      heuresPrevues: v.optional(v.number()),
      heuresEffectuees: v.optional(v.number()),
    }),
  ),

  // ─── Suivi conseiller PNPE ──────────────────────────────────
  /** Conseiller PNPE référent du contrat. */
  conseillerReferentId: v.id("users"),
  /** Visites de suivi (3 minimum pour apprentissage). */
  visitesSuivi: v.optional(
    v.array(
      v.object({
        date: v.number(),
        conseillerId: v.id("users"),
        observations: v.string(),
        statut: v.union(
          v.literal("SATISFAISANT"),
          v.literal("A_AMELIORER"),
          v.literal("PROBLEMATIQUE"),
        ),
      }),
    ),
  ),

  // ─── Cycle de vie ───────────────────────────────────────────
  statut: statutContratSuiviValidator,
  motifRupture: v.optional(v.string()),

  // ─── Bilan final ────────────────────────────────────────────
  bilanFinal: v.optional(
    v.object({
      note: v.optional(v.number()), // /20 ou /100 selon convention
      observations: v.string(),
      recommandations: v.optional(v.string()),
      issueFinale: v.union(
        v.literal("EMBAUCHE_CDI"),
        v.literal("EMBAUCHE_CDD"),
        v.literal("AUTRE_FORMATION"),
        v.literal("RECHERCHE_EMPLOI"),
        v.literal("ABANDON"),
      ),
      dateBilan: v.number(),
    }),
  ),

  metadata: v.optional(v.any()),
  createdByUserId: v.id("users"),
})
  .index("by_demandeur", ["demandeurId"])
  .index("by_employeur", ["employeurId"])
  .index("by_offre", ["offreId"])
  .index("by_conseiller", ["conseillerReferentId"])
  .index("by_type_statut", ["type", "statut"])
  .index("by_statut", ["statut"])
  .index("by_reference", ["referenceContrat"]);
