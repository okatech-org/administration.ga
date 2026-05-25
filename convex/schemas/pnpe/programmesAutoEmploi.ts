import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  codeNAFGabonValidator,
  etapeAutoEmploiValidator,
} from "../../lib/validators/pnpe";

/**
 * Programmes Auto-Emploi suivis par les D.E.
 *
 * Le parcours Auto-Emploi PNPE accompagne un D.E ayant un projet de création
 * d'activité, depuis l'évaluation jusqu'à l'installation effective :
 *
 *   EVALUATION (conseiller évalue la viabilité du projet)
 *     -> FORMATION_BMC (Business Model Canvas, présentiel agence ou Ediandza)
 *     -> ELABORATION_PLAN (D.E rédige son business plan via Tiptap)
 *     -> VALIDATION (conseiller valide le plan)
 *     -> LANCEMENT (transfert vers ANPI-Gabon pour formalisation)
 *     -> SUIVI (post-installation, 6-12 mois)
 *     -> CLOTURE (succès ou abandon)
 *
 * Les passerelles externes (Ediandza pour la formation, ANPI-Gabon pour la
 * formalisation) sont matérialisées par des champs `ediandzaParcoursId` et
 * `anpiDossierId` mis à jour via webhooks.
 */
export const programmesAutoEmploiTable = defineTable({
  demandeurId: v.id("demandeursEmploi"),

  // ─── Projet ─────────────────────────────────────────────────
  secteurProjet: codeNAFGabonValidator,
  descriptionProjet: v.string(),
  /** Localisation cible de l'activité (province). */
  provinceProjet: v.optional(v.string()),

  // ─── Pilotage ───────────────────────────────────────────────
  conseillerReferentId: v.id("users"),
  /** Mentor interne ou partenaire externe. */
  mentorId: v.optional(v.id("users")),

  // ─── Étape courante ─────────────────────────────────────────
  etape: etapeAutoEmploiValidator,
  /** Date de passage à l'étape courante. */
  dateEtape: v.optional(v.number()),

  // ─── Formation BMC ──────────────────────────────────────────
  formationBMC: v.optional(
    v.object({
      sessionId: v.string(),
      dateDebut: v.number(),
      dateFin: v.number(),
      /** Statut de suivi de la formation. */
      statutSuivi: v.union(
        v.literal("INSCRIT"),
        v.literal("EN_COURS"),
        v.literal("TERMINE"),
        v.literal("ABANDON"),
      ),
      note: v.optional(v.number()),
      /** ID de l'attestation PDF dans `_storage`. */
      attestationStorageId: v.optional(v.id("_storage")),
    }),
  ),

  // ─── Business Plan ──────────────────────────────────────────
  /** Business plan élaboré par le D.E (éditeur Tiptap, 9 blocs BMC). */
  businessPlan: v.optional(
    v.object({
      /** ID du PDF généré dans `_storage`. */
      pdfStorageId: v.optional(v.id("_storage")),
      version: v.number(),
      /** Snapshot Tiptap JSON pour reprise édition. */
      contenuJson: v.optional(v.any()),
      dateValidation: v.optional(v.number()),
      valideParUserId: v.optional(v.id("users")),
    }),
  ),

  // ─── Intégrations externes ──────────────────────────────────
  /** ID du parcours côté Ediandza (formation). */
  ediandzaParcoursId: v.optional(v.string()),
  /** ID du dossier de formalisation côté ANPI-Gabon. */
  anpiDossierId: v.optional(v.string()),
  /** ID de l'entreprise créée (si déjà immatriculée). */
  companyId: v.optional(v.id("companies")),

  // ─── Lancement et suivi post-installation ───────────────────
  /** Date effective de lancement de l'activité. */
  dateLancementActivite: v.optional(v.number()),
  /** Points de suivi post-installation par le conseiller. */
  suiviPostLancement: v.optional(
    v.array(
      v.object({
        date: v.number(),
        conseillerId: v.id("users"),
        observations: v.string(),
        statut: v.union(
          v.literal("EN_DEVELOPPEMENT"),
          v.literal("STABLE"),
          v.literal("EN_DIFFICULTE"),
          v.literal("CESSATION"),
        ),
      }),
    ),
  ),

  // ─── Clôture ────────────────────────────────────────────────
  /** Résultat final consolidé (alimente les statistiques de réussite). */
  resultatFinal: v.optional(
    v.union(
      v.literal("ACTIVITE_OPERATIONNELLE"),
      v.literal("ACTIVITE_EN_DIFFICULTE"),
      v.literal("ABANDON_PROJET"),
      v.literal("REORIENTATION_SALARIE"),
    ),
  ),
  dateCloture: v.optional(v.number()),

  metadata: v.optional(v.any()),
  createdByUserId: v.id("users"),
})
  .index("by_demandeur", ["demandeurId"])
  .index("by_conseiller", ["conseillerReferentId"])
  .index("by_mentor", ["mentorId"])
  .index("by_etape", ["etape"])
  .index("by_secteur", ["secteurProjet"]);
