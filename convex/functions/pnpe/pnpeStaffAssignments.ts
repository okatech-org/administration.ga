/**
 * Convex functions — Affectations metier du personnel PNPE.
 *
 * Sert a charger l'assignment du user connecte (modules autorises,
 * antenne de rattachement, role PNPE, libelle public) afin de filtrer
 * dynamiquement la sidebar et les actions disponibles.
 */
import { v } from "convex/values";
import { authQuery } from "../../lib/customFunctions";
import { query } from "../../_generated/server";

/**
 * Recupere l'affectation PNPE du user connecte. Retourne null si le
 * user n'est pas membre du PNPE (utilisateur externe, citoyen).
 */
export const getMyAssignment = authQuery({
  args: {},
  handler: async (ctx) => {
    const assignment = await ctx.db
      .query("pnpeStaffAssignments")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (!assignment || !assignment.isActive) return null;

    return {
      _id: assignment._id,
      userId: assignment.userId,
      pnpeRole: assignment.pnpeRole,
      antenneId: assignment.antenneId,
      modules: assignment.modules,
      fonctionAffichee: assignment.fonctionAffichee,
      nom: assignment.nom,
      prenoms: assignment.prenoms,
      isActive: assignment.isActive,
    };
  },
});

/**
 * Liste tous les assignments pour une antenne donnee. Utile pour
 * l'admin RH et le tableau de bord chef d'antenne (effectifs).
 */
export const listByAntenne = query({
  args: { antenneId: v.id("antennesPnpe") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pnpeStaffAssignments")
      .withIndex("by_antenne", (q) => q.eq("antenneId", args.antenneId))
      .collect();
  },
});

/**
 * Liste les assignments par role PNPE. Filtree par isActive=true par
 * defaut.
 */
export const listByRole = query({
  args: {
    pnpeRole: v.string(),
    onlyActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const onlyActive = args.onlyActive ?? true;
    const rows = await ctx.db
      .query("pnpeStaffAssignments")
      .withIndex("by_role_active", (q) =>
        q.eq("pnpeRole", args.pnpeRole as never).eq("isActive", onlyActive),
      )
      .collect();
    return rows;
  },
});
