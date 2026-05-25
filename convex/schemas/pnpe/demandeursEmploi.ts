import { defineTable } from "convex/server";
import { v } from "convex/values";
import { addressValidator } from "../../lib/validators";
import {
  codeProvinceGaValidator,
  disponibiliteDEValidator,
  niveauEtudesValidator,
  programmeTypeValidator,
  statutDemandeurValidator,
  typeContratValidator,
} from "../../lib/validators/pnpe";

/**
 * Demandeurs d'Emploi (D.E) inscrits au PNPE.
 *
 * Le profil complet d'un citoyen gabonais en recherche d'emploi salarié,
 * d'auto-emploi ou de formation. Crée à l'inscription (statut BROUILLON),
 * validé par un conseiller PNPE (visite agence ou contact WhatsApp), puis
 * actif pour candidater.
 *
 * Sécurité : un D.E ne voit que son propre profil ; les conseillers de son
 * antenne de rattachement voient les D.E de leur portefeuille ; la direction
 * PNPE et le ministère du Travail voient tout le réseau.
 *
 * Cf. plan Phase 1 (`/Users/okatech/.claude/plans/dans-le-contexte-du-eventual-blum.md`).
 */
export const demandeursEmploiTable = defineTable({
  /** Utilisateur Better Auth qui détient le profil. */
  userId: v.id("users"),

  /**
   * Numéro d'Identification Personnel gabonais (NIP). Unique par D.E.
   * Vérifié auprès de la DGDI lors de l'activation du compte.
   */
  nip: v.string(),

  // ─── État civil ──────────────────────────────────────────────
  nom: v.string(),
  prenoms: v.string(),
  dateNaissance: v.optional(v.number()), // timestamp ms
  lieuNaissance: v.optional(v.string()),
  sexe: v.optional(v.union(v.literal("M"), v.literal("F"))),
  situationFamiliale: v.optional(
    v.union(
      v.literal("CELIBATAIRE"),
      v.literal("MARIE"),
      v.literal("DIVORCE"),
      v.literal("VEUF"),
      v.literal("CONCUBINAGE"),
    ),
  ),

  // ─── Contact ─────────────────────────────────────────────────
  email: v.string(),
  telephone: v.string(),
  /** Numéro WhatsApp utilisé pour la validation d'inscription. */
  telephoneWhatsApp: v.optional(v.string()),
  adresse: v.optional(addressValidator),

  // ─── Géographie & rattachement ───────────────────────────────
  provinceResidence: codeProvinceGaValidator,
  /** Antenne PNPE de rattachement (déterminée à l'inscription). */
  antenneId: v.id("antennesPnpe"),
  /** Conseiller PNPE attribué (assigné après validation). */
  conseillerAttribueId: v.optional(v.id("users")),

  // ─── Parcours ────────────────────────────────────────────────
  niveauEtudes: v.optional(niveauEtudesValidator),
  /** Formations diplômantes obtenues. */
  formations: v.optional(
    v.array(
      v.object({
        diplome: v.string(),
        etablissement: v.string(),
        anneeObtention: v.number(),
        specialite: v.optional(v.string()),
      }),
    ),
  ),
  /** Expériences professionnelles antérieures. */
  experiences: v.optional(
    v.array(
      v.object({
        poste: v.string(),
        entreprise: v.string(),
        dateDebut: v.number(),
        dateFin: v.optional(v.number()),
        missions: v.optional(v.string()),
      }),
    ),
  ),
  competences: v.optional(v.array(v.string())),
  /** Langues parlées (FR, EN, fang, myéné, etc.) avec niveau. */
  langues: v.optional(
    v.array(
      v.object({
        langue: v.string(),
        niveau: v.union(
          v.literal("DEBUTANT"),
          v.literal("INTERMEDIAIRE"),
          v.literal("AVANCE"),
          v.literal("BILINGUE"),
          v.literal("LANGUE_MATERNELLE"),
        ),
      }),
    ),
  ),
  /** Permis détenus (B, C, D, etc.). */
  permis: v.optional(v.array(v.string())),

  // ─── Documents ───────────────────────────────────────────────
  /** ID du CV PDF dans Convex `_storage`. */
  cvStorageId: v.optional(v.id("_storage")),
  /** ID de la photo de profil dans Convex `_storage`. */
  photoStorageId: v.optional(v.id("_storage")),

  // ─── Statut et workflow ──────────────────────────────────────
  statutCompte: statutDemandeurValidator,
  /** Date de validation par le conseiller (ms). */
  dateValidation: v.optional(v.number()),
  /** Auteur de la validation (conseiller PNPE). */
  valideParUserId: v.optional(v.id("users")),

  // ─── Préférences de recherche ────────────────────────────────
  disponibilite: v.optional(disponibiliteDEValidator),
  preferenceProgramme: v.optional(programmeTypeValidator),
  typeContratSouhaite: v.optional(v.array(typeContratValidator)),
  /** Provinces où le D.E accepte de travailler. */
  mobiliteGeographique: v.optional(v.array(codeProvinceGaValidator)),
  /** Prétentions salariales (XAF). */
  salairePretention: v.optional(
    v.object({
      min: v.number(),
      max: v.number(),
      devise: v.string(), // "XAF" par défaut
    }),
  ),
  /** Visibilité du profil dans le vivier employeur (CVthèque). */
  cvthequeVisible: v.optional(v.boolean()),

  metadata: v.optional(v.any()),
  createdByUserId: v.id("users"),
})
  .index("by_userId", ["userId"])
  .index("by_nip", ["nip"])
  .index("by_antenne_statut", ["antenneId", "statutCompte"])
  .index("by_conseiller", ["conseillerAttribueId"])
  .index("by_province_statut", ["provinceResidence", "statutCompte"])
  .index("by_statut", ["statutCompte"]);
