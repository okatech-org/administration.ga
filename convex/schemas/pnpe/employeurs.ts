import { defineTable } from "convex/server";
import { v } from "convex/values";
import { addressValidator } from "../../lib/validators";
import {
  codeNAFGabonValidator,
  codeProvinceGaValidator,
  tailleEntrepriseValidator,
  verificationEmployeurValidator,
} from "../../lib/validators/pnpe";

/**
 * Employeurs inscrits au PNPE.
 *
 * Une entité juridique gabonaise (entreprise, association, administration)
 * habilitée à publier des offres d'emploi. Chaque employeur a un représentant
 * RH (userId) qui pilote le compte, mais une même entreprise peut être
 * référencée à plusieurs reprises dans `companies` (table existante).
 *
 * Le statut de vérification s'appuie sur des contrôles :
 *  - DGI : situation fiscale à jour (immatriculation NIF, déclarations)
 *  - CNSS : attestation de situation sociale
 *  - RCCM : Registre du Commerce et du Crédit Mobilier
 *
 * Sécurité : seuls les employeurs `VERIFIE` peuvent publier des offres
 * (workflow appliqué côté mutations).
 */
export const employeursTable = defineTable({
  /** Représentant RH qui pilote le compte employeur. */
  userId: v.id("users"),

  /**
   * Lien optionnel vers une entreprise déjà référencée dans la table
   * `companies` (annuaire global). Si renseigné, plusieurs métadonnées
   * (raison sociale, secteur, taille) peuvent être héritées de cette source.
   */
  companyId: v.optional(v.id("companies")),

  // ─── Identité légale ─────────────────────────────────────────
  raisonSociale: v.string(),
  /** Numéro d'Identification Fiscal (DGI). Unique par employeur. */
  nif: v.string(),
  /** Registre du Commerce et du Crédit Mobilier (optionnel). */
  rccm: v.optional(v.string()),

  // ─── Activité ────────────────────────────────────────────────
  secteurActivite: codeNAFGabonValidator,
  tailleEntreprise: tailleEntrepriseValidator,
  /** Effectif déclaré au moment de l'inscription. */
  effectif: v.optional(v.number()),

  // ─── Adresse siège ───────────────────────────────────────────
  adresseSiege: addressValidator,
  provinceSiege: codeProvinceGaValidator,

  // ─── Représentant légal & contact RH ─────────────────────────
  representantLegal: v.object({
    nom: v.string(),
    prenoms: v.string(),
    fonction: v.string(),
    email: v.string(),
    telephone: v.string(),
  }),
  /** Contact RH dédié si différent du représentant légal. */
  contactRH: v.optional(
    v.object({
      nom: v.string(),
      email: v.string(),
      telephone: v.string(),
    }),
  ),

  // ─── Vérification ────────────────────────────────────────────
  statutVerification: verificationEmployeurValidator,
  /** Date de la dernière vérification DGI/CNSS validée. */
  dateVerification: v.optional(v.number()),
  /** Auteur de la vérification (conseiller PNPE). */
  verifieParUserId: v.optional(v.id("users")),
  /**
   * Documents justificatifs uploadés (immatriculation DGI, attestation CNSS,
   * RCCM, etc.). `v.any()` pour rester flexible en MVP — sera structuré
   * en Phase ultérieure.
   */
  documentsVerification: v.optional(v.array(v.any())),

  // ─── Modules activés ─────────────────────────────────────────
  /** Fonctionnalités premium activées (vivier, IA matching, etc.). */
  modulesActives: v.optional(v.array(v.string())),

  metadata: v.optional(v.any()),
  createdByUserId: v.id("users"),
})
  .index("by_userId", ["userId"])
  .index("by_nif", ["nif"])
  .index("by_company", ["companyId"])
  .index("by_statut_verification", ["statutVerification"])
  .index("by_secteur", ["secteurActivite"])
  .index("by_province", ["provinceSiege"]);
