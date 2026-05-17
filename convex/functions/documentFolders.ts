/**
 * Helpers transverses pour la table `documentFolders`.
 *
 * Aujourd'hui, la table est manipulée principalement par `diplomaticFolders.ts`
 * (scope diplomatie). Ce fichier expose des helpers généraux réutilisables
 * par d'autres modules (iAsted, etc.) qui ont besoin de dossiers virtuels
 * dans iDocument.
 */

import { v } from "convex/values";
import { internalMutation as rawInternalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/** Nom canonique du dossier système qui collecte les documents générés par iAsted. */
export const IASTED_DOCUMENTS_FOLDER_NAME = "iAsted Documents";

/**
 * Crée (ou retourne s'il existe) le dossier système « iAsted Documents »
 * d'une org. Idempotent.
 *
 * Note : utilise `rawInternalMutation` car appelé depuis l'action
 * `realtimeToolExecutor.executeRealtimeTool` (déjà authentifiée en amont,
 * pas besoin de re-vérifier l'identité ici).
 */
export const ensureIAstedDocumentsFolder = rawInternalMutation({
  args: {
    orgId: v.id("orgs"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Id<"documentFolders">> => {
    const existing = await ctx.db
      .query("documentFolders")
      .withIndex("by_org_name", (q) =>
        q.eq("orgId", args.orgId).eq("name", IASTED_DOCUMENTS_FOLDER_NAME),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .first();
    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("documentFolders", {
      orgId: args.orgId,
      name: IASTED_DOCUMENTS_FOLDER_NAME,
      tags: ["system", "iasted"],
      createdBy: args.userId,
      isSystem: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});
