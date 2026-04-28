/**
 * iCorrespondance — Annotations / commentaires libres sur les dossiers.
 *
 * Permet aux agents d'ajouter des notes humaines sur un dossier (instructions
 * de traitement, remarques internes), distinctes du workflow audit trail.
 *
 * Visibilité = interne à l'org propriétaire du dossier.
 */

import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";
import {
  requireCorrespondanceAccess,
  assertConfidentialityClearance,
} from "../lib/correspondanceHelpers";
import { error, ErrorCode } from "../lib/errors";
import { isSuperAdmin } from "../lib/permissions";

const MAX_CONTENT_LENGTH = 4000;

/**
 * Lister les annotations d'un dossier (ordre chronologique ascendant).
 */
export const listAnnotations = authQuery({
  args: { itemId: v.id("correspondanceItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return [];

    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "view");
    await assertConfidentialityClearance(ctx, ctx.user, item);

    const annotations = await ctx.db
      .query("correspondanceAnnotations")
      .withIndex("by_item_created", (q) => q.eq("itemId", args.itemId))
      .order("asc")
      .collect();

    return annotations.filter((a) => !a.deletedAt);
  },
});

/**
 * Ajouter une annotation sur un dossier.
 */
export const addAnnotation = authMutation({
  args: {
    itemId: v.id("correspondanceItems"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.content.trim();
    if (!trimmed) {
      throw error(ErrorCode.VALIDATION_ERROR, "Le commentaire ne peut pas être vide.");
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        `Commentaire trop long (max ${MAX_CONTENT_LENGTH} caractères).`,
      );
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) throw error(ErrorCode.NOT_FOUND, "Correspondance introuvable");

    const orgId = item.copyOwnerOrgId ?? item.orgId;
    await requireCorrespondanceAccess(ctx, ctx.user, orgId, "view");
    await assertConfidentialityClearance(ctx, ctx.user, item);

    const now = Date.now();
    const annotationId = await ctx.db.insert("correspondanceAnnotations", {
      itemId: args.itemId,
      orgId,
      authorId: ctx.user._id,
      authorName: ctx.user.name ?? ctx.user.email,
      content: trimmed,
      createdAt: now,
    });

    return { annotationId };
  },
});

/**
 * Modifier le contenu d'une annotation (auteur uniquement).
 */
export const updateAnnotation = authMutation({
  args: {
    annotationId: v.id("correspondanceAnnotations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.content.trim();
    if (!trimmed) {
      throw error(ErrorCode.VALIDATION_ERROR, "Le commentaire ne peut pas être vide.");
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      throw error(
        ErrorCode.VALIDATION_ERROR,
        `Commentaire trop long (max ${MAX_CONTENT_LENGTH} caractères).`,
      );
    }

    const annotation = await ctx.db.get(args.annotationId);
    if (!annotation || annotation.deletedAt) {
      throw error(ErrorCode.NOT_FOUND, "Annotation introuvable");
    }

    if (annotation.authorId !== ctx.user._id && !isSuperAdmin(ctx.user)) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Seul l'auteur peut modifier son commentaire.",
      );
    }

    await ctx.db.patch(args.annotationId, {
      content: trimmed,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Supprimer (soft) une annotation.
 * L'auteur ou un admin de l'org peut supprimer.
 */
export const deleteAnnotation = authMutation({
  args: { annotationId: v.id("correspondanceAnnotations") },
  handler: async (ctx, args) => {
    const annotation = await ctx.db.get(args.annotationId);
    if (!annotation || annotation.deletedAt) return;

    const isAuthor = annotation.authorId === ctx.user._id;
    if (!isAuthor && !isSuperAdmin(ctx.user)) {
      // Les admins de l'org peuvent aussi supprimer (modération)
      await requireCorrespondanceAccess(ctx, ctx.user, annotation.orgId, "admin");
    }

    await ctx.db.patch(args.annotationId, { deletedAt: Date.now() });
  },
});
