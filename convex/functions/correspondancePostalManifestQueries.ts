/**
 * iCorrespondance — Queries pour le bordereau postal
 *
 * Fichier séparé du générateur PDF (qui est en `"use node"`) car les queries
 * doivent tourner dans le runtime V8 standard de Convex.
 */

import { v } from "convex/values";
import { authQuery } from "../lib/customFunctions";

/**
 * Retourne une URL signée temporaire pour télécharger un fichier stocké
 * (utilisé pour récupérer le PDF du bordereau après génération).
 */
export const getStorageUrl = authQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
