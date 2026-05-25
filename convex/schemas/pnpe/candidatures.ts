import { defineTable } from "convex/server";
import { v } from "convex/values";
import { statutCandidatureValidator } from "../../lib/validators/pnpe";

/**
 * Candidatures sur offres d'emploi PNPE / TRAVAIL.GA.
 *
 * Deux profils de candidat supportés :
 *  - **D.E PNPE** (inscrit, validé) : `demandeurId` renseigné.
 *    Workflow complet : CV PDF + lettre + suivi conseiller.
 *  - **Citoyen ordinaire** (sans inscription D.E préalable) :
 *    `applicantUserId` + `applicantContact` renseignés.
 *    Workflow simplifié : contact direct entre l'employeur et le candidat,
 *    avec invitation à compléter une inscription D.E si plusieurs candidatures.
 *
 * Statut workflow piloté par l'employeur (et parfois le conseiller PNPE).
 *
 * Contrainte : un candidat ne peut postuler qu'une fois par offre (vérifié
 * côté mutation via `by_offre_demandeur` ou `by_offre_applicant`).
 */
export const candidaturesTable = defineTable({
  offreId: v.id("offresEmploi"),

  /**
   * Type de candidature. Détermine si on consulte le profil D.E ou le
   * contact simplifié.
   */
  typeCandidature: v.union(
    v.literal("DEMANDEUR_INSCRIT"),
    v.literal("CITOYEN_ORDINAIRE"),
  ),

  /** Lien D.E si typeCandidature=DEMANDEUR_INSCRIT. */
  demandeurId: v.optional(v.id("demandeursEmploi")),

  /** Lien user Better Auth si typeCandidature=CITOYEN_ORDINAIRE. */
  applicantUserId: v.optional(v.id("users")),

  /**
   * Contact direct pour les candidats CITOYEN_ORDINAIRE (sans profil D.E).
   * Permet à l'employeur de contacter le candidat.
   */
  applicantContact: v.optional(
    v.object({
      nom: v.string(),
      prenoms: v.string(),
      email: v.string(),
      telephone: v.string(),
      niveauEtudes: v.optional(v.string()),
      experienceText: v.optional(v.string()),
    }),
  ),

  // ─── Pièces jointes ─────────────────────────────────────────
  /** CV PDF storage (optionnel pour citoyens ordinaires). */
  cvStorageId: v.optional(v.id("_storage")),
  lettreMotivation: v.optional(v.string()),
  documentsJoints: v.optional(v.array(v.id("_storage"))),

  // ─── Statut et historique ───────────────────────────────────
  statut: statutCandidatureValidator,
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
  tagsEmployeur: v.optional(v.array(v.string())),

  // ─── Issue finale ───────────────────────────────────────────
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
  .index("by_applicant_user", ["applicantUserId"])
  .index("by_offre_statut", ["offreId", "statut"])
  .index("by_demandeur_statut", ["demandeurId", "statut"])
  .index("by_offre_demandeur", ["offreId", "demandeurId"])
  .index("by_offre_applicant", ["offreId", "applicantUserId"]);
