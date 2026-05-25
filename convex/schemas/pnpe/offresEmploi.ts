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
 * Offres d'emploi publiées sur la plateforme TRAVAIL.GA / PNPE.
 *
 * Workflow :
 *   BROUILLON -> EN_VALIDATION -> (par conseiller PNPE)
 *             -> PUBLIEE -> (visible sur le portail public)
 *             -> POURVUE (marquage employeur post-embauche)
 *             -> EXPIREE (auto à dateExpiration)
 *             -> RETIREE (retiré avant expiration)
 *
 * Trois types d'émetteurs supportés (`typeEmployeur`) :
 *   - **ENTREPRISE** : société commerciale avec NIF/RCCM, vérifiée DGI/CNSS.
 *     Référence : OE/YYYY/<NIF_TAIL>/<SEQ>. Lien `employeurId`.
 *   - **ADMINISTRATION** : organisme public déjà référencé dans `orgs`
 *     (ministère, DG, mairie, EP). Pas de vérification supplémentaire.
 *     Référence : ADM/YYYY/<ORG_SLUG>/<SEQ>. Lien `orgId`.
 *   - **PARTICULIER** : personne physique (emploi domestique, garde
 *     d'enfants, jardinier, etc.). Pas de vérification entreprise.
 *     Modération PNPE plus stricte + signalement possible.
 *     Référence : PAR/YYYY/<USER_TAIL>/<SEQ>. Identité dans `particulierInfo`.
 */
export const offresEmploiTable = defineTable({
  /**
   * Type d'émetteur de l'offre. Détermine quels champs employeur/org/
   * particulier sont renseignés.
   */
  typeEmployeur: v.union(
    v.literal("ENTREPRISE"),
    v.literal("ADMINISTRATION"),
    v.literal("PARTICULIER"),
  ),

  /** Employeur si typeEmployeur=ENTREPRISE. */
  employeurId: v.optional(v.id("employeurs")),

  /** Org si typeEmployeur=ADMINISTRATION (lien vers `orgs` table). */
  orgId: v.optional(v.id("orgs")),

  /**
   * Identité du particulier si typeEmployeur=PARTICULIER. La création
   * d'un compte user n'est pas obligatoire — un email/téléphone suffit
   * pour le contact.
   */
  particulierInfo: v.optional(
    v.object({
      nom: v.string(),
      prenoms: v.string(),
      email: v.string(),
      telephone: v.string(),
      /** Carte d'identité (NIP optionnel pour anti-fraude). */
      nip: v.optional(v.string()),
      /** Lien vers le user Better Auth si le particulier est connecté. */
      userId: v.optional(v.id("users")),
    }),
  ),

  /** Référence officielle. Format dépend du type employeur (cf. docstring). */
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
      devise: v.string(),
      periodicite: v.union(
        v.literal("HORAIRE"),
        v.literal("MENSUEL"),
        v.literal("ANNUEL"),
      ),
    }),
  ),
  avantages: v.optional(v.array(v.string())),

  // ─── Dates ───────────────────────────────────────────────────
  dateDebut: v.optional(v.number()),
  dateExpiration: v.number(),
  datePublication: v.optional(v.number()),

  // ─── Workflow et modération ──────────────────────────────────
  statut: statutOffreValidator,
  validateurUserId: v.optional(v.id("users")),
  dateValidation: v.optional(v.number()),
  motifRejet: v.optional(v.string()),

  /**
   * Signalements communautaires (anti-fraude pour offres PARTICULIER
   * majoritairement). Voir convex/functions/pnpe/offresPubliques.signaler.
   *
   * Règles modération :
   *   - 3 signalements / 7 jours glissants → flaggedForReview = true
   *   - 5 signalements / 7 jours OU 1 motif grave → statut bascule MASQUEE
   *     (conseiller doit décider sous 48h : RETIREE ou re-PUBLIEE)
   */
  signalements: v.optional(
    v.object({
      /** Compteur total cumulé (historique). */
      count: v.number(),
      /**
       * Historique détaillé : un entrée par signalement. Sert à calculer
       * la fenêtre glissante 7j et à afficher les motifs côté conseiller.
       */
      historique: v.optional(
        v.array(
          v.object({
            date: v.number(),
            motif: v.string(),
            commentaire: v.optional(v.string()),
            reporterUserId: v.optional(v.id("users")),
          }),
        ),
      ),
      lastSignaledAt: v.optional(v.number()),
      flaggedForReview: v.boolean(),
      /** Date du masquage auto si applicable. */
      maskedAt: v.optional(v.number()),
      /** Motif qui a déclenché le masquage (grave ou seuil dépassé). */
      maskedReason: v.optional(v.string()),
    }),
  ),

  // ─── Statistiques ────────────────────────────────────────────
  nbVues: v.optional(v.number()),
  nbCandidatures: v.optional(v.number()),

  metadata: v.optional(v.any()),
  createdByUserId: v.id("users"),
})
  .index("by_reference", ["reference"])
  .index("by_employeur_statut", ["employeurId", "statut"])
  .index("by_org_statut", ["orgId", "statut"])
  .index("by_type_statut", ["typeEmployeur", "statut"])
  .index("by_statut", ["statut"])
  .index("by_secteur_statut", ["secteurActivite", "statut"])
  .index("by_type_contrat_statut", ["typeContrat", "statut"])
  .index("by_publication", ["datePublication"])
  .index("by_expiration", ["dateExpiration"]);
