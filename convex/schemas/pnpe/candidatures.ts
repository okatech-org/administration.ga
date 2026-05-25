import { defineTable } from "convex/server";
import { v } from "convex/values";
import { statutCandidatureValidator } from "../../lib/validators/pnpe";

/**
 * Candidatures D.E sur offres d'emploi PNPE.
 *
 * Représente l'acte unique d'un D.E qui candidate à une offre. Le statut suit
 * un workflow piloté par l'employeur (et parfois le conseiller PNPE) :
 *
 *   ENVOYEE -> VUE -> PRESELECTIONNEE -> ENTRETIEN -> RETENUE | NON_RETENUE
 *                                                  \-> RETIREE (D.E)
 *
 * L'`issueFinale` est saisie par l'employeur (ou auto-déduite du statut)
 * à la clôture du processus pour alimenter les statistiques de placement
 * du PNPE.
 *
 * Contrainte : un D.E ne peut candidater qu'une seule fois par offre
 * (vérifié côté mutation via `by_offre_demandeur` index).
 */
export const candidaturesTable = defineTable({
  offreId: v.id("offresEmploi"),
  demandeurId: v.id("demandeursEmploi"),

  // ─── Pièces jointes ─────────────────────────────────────────
  /** Snapshot du CV au moment de la candidature. */
  cvStorageId: v.id("_storage"),
  /** Lettre de motivation (texte ou storage selon préférence). */
  lettreMotivation: v.optional(v.string()),
  /** Pièces complémentaires (portfolios, diplômes scannés…). */
  documentsJoints: v.optional(v.array(v.id("_storage"))),

  // ─── Statut et historique ───────────────────────────────────
  statut: statutCandidatureValidator,
  /** Trace des transitions de statut pour audit / dashboard D.E. */
  historiqueStatuts: v.optional(
    v.array(
      v.object({
        statut: statutCandidatureValidator,
        date: v.number(),
        auteurUserId: v.id("users"),
        commentaire: v.optional(v.string()),
      }),
    ),
  ),

  // ─── Notes & échanges ───────────────────────────────────────
  notesEmployeur: v.optional(v.string()),
  notesConseiller: v.optional(v.string()),
  /** Tags internes de l'employeur (favori, à recontacter, etc.). */
  tagsEmployeur: v.optional(v.array(v.string())),

  // ─── Issue finale ───────────────────────────────────────────
  /**
   * Résultat consolidé pour les statistiques d'insertion PNPE.
   * Marqué par l'employeur (post-embauche ou clôture) ou auto-déduit.
   */
  issueFinale: v.optional(
    v.union(
      v.literal("EMBAUCHE"),
      v.literal("NON_EMBAUCHE"),
      v.literal("ABANDON"),
    ),
  ),
  dateIssueFinale: v.optional(v.number()),

  metadata: v.optional(v.any()),
  createdByUserId: v.id("users"),
})
  .index("by_offre", ["offreId"])
  .index("by_demandeur", ["demandeurId"])
  .index("by_offre_statut", ["offreId", "statut"])
  .index("by_demandeur_statut", ["demandeurId", "statut"])
  .index("by_offre_demandeur", ["offreId", "demandeurId"]); // unicité
