import { defineTable } from "convex/server";
import { v } from "convex/values";
import { memberRoleValidator } from "../../lib/validators";

/**
 * Affectations métier des agents PNPE.
 *
 * Complète la table `memberships` (membership minimale userId+orgId pour
 * autoriser l'accès à l'app) avec les attributs PNPE-spécifiques :
 *  - rôle PNPE (parmi les 7 rôles de la verticale emploi)
 *  - antenne de rattachement (sauf direction nationale / admin ministère)
 *  - modules métier accessibles (cf. PNPE_MODULES_BY_ROLE)
 *  - fonction affichée (libellé public dans les pages conseiller / portail)
 *
 * Cette table reste isolée du schema memberships partagé entre 10+ apps
 * pour éviter d'y mélanger des concepts spécifiques au domaine emploi.
 *
 * Source de vérité : le seed `staffAccountsPnpe.ts` la peuple à partir des
 * 23 comptes démo PNPE (DG + admin ministère + 7 chefs d'antenne + 14
 * conseillers).
 */
export const pnpeStaffAssignmentsTable = defineTable({
  userId: v.id("users"),
  membershipId: v.id("memberships"),

  /** Rôle PNPE (cf. MemberRole côté types, 7 valeurs Phase 7). */
  pnpeRole: memberRoleValidator,

  /** Antenne de rattachement (null pour DG national et admin ministère). */
  antenneId: v.optional(v.id("antennesPnpe")),

  /** Modules métier accessibles (codes PNPE_MODULES). */
  modules: v.array(v.string()),

  /** Libellé affiché dans l'UI (ex: "Chef d'antenne — Libreville"). */
  fonctionAffichee: v.string(),

  /** Identité officielle pour les listings (ex: pour le footer d'un mail). */
  nom: v.string(),
  prenoms: v.string(),

  /** Activé ? Permet de désactiver sans supprimer. */
  isActive: v.boolean(),

  metadata: v.optional(v.any()),
  createdByUserId: v.id("users"),
})
  .index("by_userId", ["userId"])
  .index("by_membership", ["membershipId"])
  .index("by_antenne", ["antenneId"])
  .index("by_role", ["pnpeRole"])
  .index("by_role_active", ["pnpeRole", "isActive"]);
