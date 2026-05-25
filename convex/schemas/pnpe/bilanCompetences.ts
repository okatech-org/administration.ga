import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Bilans de compétences réalisés par les conseillers PNPE sur les D.E.
 *
 * Un bilan évalue les compétences techniques, transversales et le potentiel
 * d'employabilité d'un D.E à un instant donné. Sert à orienter vers le bon
 * programme (Emploi Salarié, Auto-Emploi, Formation) et à proposer un plan
 * d'action individualisé.
 *
 * Plusieurs bilans peuvent exister par D.E (initial, mi-parcours, post-suivi).
 */
export const bilanCompetencesTable = defineTable({
  demandeurId: v.id("demandeursEmploi"),
  /** Conseiller PNPE qui a réalisé le bilan. */
  conseillerId: v.id("users"),

  // ─── Identification ─────────────────────────────────────────
  /** Type de bilan dans le parcours du D.E. */
  typeBilan: v.union(
    v.literal("INITIAL"), // À l'inscription
    v.literal("MI_PARCOURS"), // En cours d'accompagnement
    v.literal("POST_FORMATION"), // Après formation BMC ou autre
    v.literal("POST_PLACEMENT"), // Après placement (employabilité long terme)
  ),
  dateBilan: v.number(),

  // ─── Évaluation par catégorie ───────────────────────────────
  /** Compétences techniques métier (notées /5 ou commentées). */
  competencesTechniques: v.optional(
    v.array(
      v.object({
        nom: v.string(),
        niveau: v.union(
          v.literal("DEBUTANT"),
          v.literal("INTERMEDIAIRE"),
          v.literal("AVANCE"),
          v.literal("EXPERT"),
        ),
        commentaire: v.optional(v.string()),
      }),
    ),
  ),
  /** Compétences transversales (communication, leadership, etc.). */
  competencesTransversales: v.optional(
    v.array(
      v.object({
        nom: v.string(),
        niveau: v.union(
          v.literal("DEBUTANT"),
          v.literal("INTERMEDIAIRE"),
          v.literal("AVANCE"),
          v.literal("EXPERT"),
        ),
        commentaire: v.optional(v.string()),
      }),
    ),
  ),

  // ─── Forces & axes de progrès ──────────────────────────────
  pointsForts: v.optional(v.array(v.string())),
  axesProgression: v.optional(v.array(v.string())),

  // ─── Recommandations ───────────────────────────────────────
  /** Orientation recommandée à l'issue du bilan. */
  orientationRecommandee: v.optional(
    v.union(
      v.literal("EMPLOI_SALARIE_DIRECT"),
      v.literal("FORMATION_QUALIFIANTE"),
      v.literal("APPRENTISSAGE"),
      v.literal("AUTO_EMPLOI"),
      v.literal("BILAN_APPROFONDI"),
    ),
  ),
  /** Plan d'action individualisé (Tiptap-friendly). */
  planAction: v.optional(v.string()),
  /** Formations recommandées (slugs Ediandza ou similaires). */
  formationsRecommandees: v.optional(v.array(v.string())),

  // ─── Score global d'employabilité ──────────────────────────
  /** Indice composite calculé ou estimé par le conseiller (/100). */
  scoreEmployabilite: v.optional(v.number()),

  // ─── Document généré ───────────────────────────────────────
  /** PDF du bilan signé par le conseiller. */
  pdfStorageId: v.optional(v.id("_storage")),

  metadata: v.optional(v.any()),
  createdByUserId: v.id("users"),
})
  .index("by_demandeur", ["demandeurId"])
  .index("by_conseiller", ["conseillerId"])
  .index("by_demandeur_type", ["demandeurId", "typeBilan"])
  .index("by_date", ["dateBilan"]);
