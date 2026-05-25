import { defineTable } from "convex/server";
import { v } from "convex/values";
import { addressValidator } from "../../lib/validators";
import {
  codeNAFGabonValidator,
  codeProvinceGaValidator,
  niveauEtudesValidator,
  statutOffreValidator,
  typeContratValidator,
} from "../../lib/validators/pnpe";

/**
 * Offres d'emploi publiées sur la plateforme PNPE.
 *
 * Workflow :
 *   BROUILLON -> EN_VALIDATION -> (par conseiller PNPE)
 *             -> PUBLIEE -> (visible sur le portail public)
 *             -> POURVUE (marquage employeur post-embauche)
 *             -> EXPIREE (auto à dateExpiration)
 *             -> RETIREE (employeur retire avant expiration)
 *
 * Référence unique par employeur : `OE/YYYY/<SLUG_EMPLOYEUR>/<SEQ>` (générée
 * côté mutation `pnpe.offres.create`).
 */
export const offresEmploiTable = defineTable({
  /** Employeur émetteur de l'offre. */
  employeurId: v.id("employeurs"),

  /** Référence officielle PNPE — `OE/YYYY/<slug>/<seq>`. Unique. */
  reference: v.string(),

  // ─── Contenu de l'offre ──────────────────────────────────────
  titre: v.string(),
  description: v.string(),
  missions: v.optional(v.array(v.string())),
  profilRecherche: v.optional(v.string()),
  competencesRequises: v.optional(v.array(v.string())),
  niveauEtudesRequis: v.optional(niveauEtudesValidator),
  experienceRequiseAnnees: v.optional(v.number()),

  // ─── Conditions ──────────────────────────────────────────────
  typeContrat: typeContratValidator,
  /** Durée pour CDD/STAGE/ALTERNANCE (en mois). */
  dureeMois: v.optional(v.number()),
  secteurActivite: v.optional(codeNAFGabonValidator),

  // ─── Lieu ────────────────────────────────────────────────────
  lieuTravail: v.object({
    province: codeProvinceGaValidator,
    ville: v.string(),
    adresse: v.optional(addressValidator),
    teletravail: v.optional(
      v.union(
        v.literal("NON"),
        v.literal("PARTIEL"),
        v.literal("TOTAL"),
      ),
    ),
  }),

  // ─── Rémunération ────────────────────────────────────────────
  salaire: v.optional(
    v.object({
      min: v.number(),
      max: v.number(),
      devise: v.string(), // "XAF" par défaut
      periodicite: v.union(
        v.literal("HORAIRE"),
        v.literal("MENSUEL"),
        v.literal("ANNUEL"),
      ),
    }),
  ),
  avantages: v.optional(v.array(v.string())),

  // ─── Dates ───────────────────────────────────────────────────
  /** Date d'embauche prévue. */
  dateDebut: v.optional(v.number()),
  /** Date limite de candidature (auto-bascule en EXPIREE). */
  dateExpiration: v.number(),
  datePublication: v.optional(v.number()),

  // ─── Workflow et modération ──────────────────────────────────
  statut: statutOffreValidator,
  /** Conseiller PNPE qui a validé la publication. */
  validateurUserId: v.optional(v.id("users")),
  dateValidation: v.optional(v.number()),
  /** Motif de rejet si applicable. */
  motifRejet: v.optional(v.string()),

  // ─── Statistiques ────────────────────────────────────────────
  nbVues: v.optional(v.number()),
  nbCandidatures: v.optional(v.number()),

  metadata: v.optional(v.any()),
  createdByUserId: v.id("users"),
})
  .index("by_reference", ["reference"])
  .index("by_employeur_statut", ["employeurId", "statut"])
  .index("by_statut", ["statut"])
  .index("by_secteur_statut", ["secteurActivite", "statut"])
  .index("by_type_contrat_statut", ["typeContrat", "statut"])
  .index("by_publication", ["datePublication"])
  .index("by_expiration", ["dateExpiration"]);
