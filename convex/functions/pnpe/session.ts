/**
 * Récupération du rôle PNPE de l'utilisateur courant.
 *
 * Cherche dans cet ordre :
 *   1. Une affectation staff active dans `pnpeStaffAssignments`
 *      → rôle = `admin_ministere_travail` / `direction_pnpe` / `chef_antenne_pnpe`
 *               / `formateur_auto_emploi` / `conseiller_pnpe`
 *   2. Un profil `employeurs` actif → rôle = `employeur`
 *   3. Un profil `demandeursEmploi` actif → rôle = `demandeur_emploi`
 *
 * Utilisé par les layouts d'apps/pnpe (`/demandeur`, `/employeur`,
 * `/conseiller`, `/auto-emploi`) pour le guard RBAC côté client.
 *
 * Renvoie `null` si l'utilisateur n'a aucun profil PNPE — la page
 * appelante doit alors rediriger vers `/` ou l'inscription appropriée.
 */

import { authQuery } from "../../lib/customFunctions";

export type PnpeRoleResult = {
  role:
    | "admin_ministere_travail"
    | "direction_pnpe"
    | "chef_antenne_pnpe"
    | "formateur_auto_emploi"
    | "conseiller_pnpe"
    | "employeur"
    | "demandeur_emploi";
  antenneId?: string;
  isActive: boolean;
  /** Identifiant du document profil (demandeurEmploi, employeur, ou staff). */
  profileId: string;
};

export const getMyRole = authQuery({
  args: {},
  handler: async (ctx): Promise<PnpeRoleResult | null> => {
    const userId = ctx.user._id;

    // 1. Staff PNPE (toutes les affectations actives)
    const staffAssignments = await ctx.db
      .query("pnpeStaffAssignments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const activeStaff = staffAssignments.find((s) => s.isActive);
    if (activeStaff) {
      return {
        role: activeStaff.pnpeRole as PnpeRoleResult["role"],
        antenneId: activeStaff.antenneId as string | undefined,
        isActive: true,
        profileId: activeStaff._id,
      };
    }

    // 2. Employeur
    const employeur = await ctx.db
      .query("employeurs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (employeur) {
      return {
        role: "employeur",
        isActive: employeur.statutVerification === "VERIFIE",
        profileId: employeur._id,
      };
    }

    // 3. Demandeur d'Emploi
    const demandeur = await ctx.db
      .query("demandeursEmploi")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (demandeur) {
      return {
        role: "demandeur_emploi",
        antenneId: demandeur.antenneId as string | undefined,
        isActive: demandeur.statutCompte === "ACTIF",
        profileId: demandeur._id,
      };
    }

    return null;
  },
});
