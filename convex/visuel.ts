import { v } from "convex/values";
import { internal } from "./_generated/api";
import { authQuery, authMutation } from "./lib/customFunctions";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "./lib/types";

// ============================================================================
// CORTEX VISUEL — Gestion des médias avec signaux NEOCORTEX
//
// Chaque opération sur les fichiers émet un signal vers le limbique
// pour traçabilité et potentiel traitement downstream (OCR, etc.)
// ============================================================================

/**
 * Générer une URL d'upload vers le storage Convex.
 */
export const genererUrlUpload = authMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Récupérer l'URL publique d'un fichier stocké.
 */
export const recupererDossierMedia = authQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Supprimer un fichier du storage avec signal NEOCORTEX.
 */
export const supprimerMedia = authMutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);

    // Signal : fichier supprimé
    await ctx.scheduler.runAfter(0, internal.limbique.emettreSignal, {
      type: SIGNAL_TYPES.DOCUMENT_SUPPRIME,
      source: "VISUEL",
      entiteType: "_storage",
      entiteId: args.storageId,
      payload: { storageId: args.storageId },
      confiance: 1,
      priorite: "LOW" as const,
      correlationId: crypto.randomUUID(),
    });
  },
});

/**
 * Enregistrer un upload réussi et émettre le signal correspondant.
 * Appelé par le frontend après un upload storage réussi.
 */
export const enregistrerUpload = authMutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    entiteType: v.optional(v.string()),
    entiteId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Signal : nouveau fichier uploadé
    await ctx.scheduler.runAfter(0, internal.limbique.emettreSignal, {
      type: SIGNAL_TYPES.DOCUMENT_UPLOADE,
      source: "VISUEL",
      entiteType: args.entiteType ?? "_storage",
      entiteId: args.entiteId ?? args.storageId,
      payload: {
        storageId: args.storageId,
        filename: args.filename,
        mimeType: args.mimeType,
      },
      confiance: 1,
      priorite: "NORMAL" as const,
      correlationId: crypto.randomUUID(),
    });

    // Hippocampe : tracer l'action
    await ctx.scheduler.runAfter(0, internal.hippocampe.loguerAction, {
      action: "DOCUMENT_UPLOADE",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: args.entiteType ?? "_storage",
      entiteId: args.entiteId ?? args.storageId,
      details: {
        avant: null,
        apres: {
          storageId: args.storageId,
          filename: args.filename,
          mimeType: args.mimeType,
        },
      },
    });

    return { storageId: args.storageId };
  },
});
