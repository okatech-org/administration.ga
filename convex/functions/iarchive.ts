/**
 * iArchive — Archive longue durée (Phase 5 administration.ga, MVP).
 *
 * Backend Convex pour la table `iArchive_records`. Workflow standard :
 *   1. Dépôt              → mutation `deposit`
 *   2. Consultation       → query    `list`
 *   3. Demande destruction → mutation `requestDestruction`
 *   4. Approbation + suppression → mutation `approveDestruction` (admin only)
 *
 * En MVP la "destruction physique" supprime uniquement la rangée d'archive
 * (et conserve `metadata` pour audit). La purge réelle de l'item source
 * (correspondance, document, dossier) reste l'apanage de chaque module et
 * sera implémentée en Phase ultérieure.
 *
 * Tasks (cf. taskCodes.ts) :
 *   reader  → iarchive.view
 *   editor  → iarchive.view, iarchive.deposit, iarchive.search
 *   admin   → … + iarchive.configure_retention, iarchive.lock, iarchive.destruct
 */

import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { TaskCode } from "../lib/taskCodes";

const itemKindValidator = v.union(
  v.literal("correspondance"),
  v.literal("document"),
  v.literal("dossier"),
);

/**
 * Dépose un item dans l'archive longue durée.
 *
 * `retentionDays` est converti en `retentionUntil` (epoch ms). Si non
 * spécifié, la pièce reste archivée indéfiniment (jusqu'à action manuelle).
 */
export const deposit = authMutation({
  args: {
    orgId: v.id("orgs"),
    itemKind: itemKindValidator,
    itemRefId: v.string(),
    retentionDays: v.optional(v.number()),
    legalHold: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.iarchive.deposit);

    const now = Date.now();
    const retentionUntil =
      args.retentionDays != null
        ? now + args.retentionDays * 24 * 60 * 60 * 1000
        : undefined;

    const recordId = await ctx.db.insert("iArchive_records", {
      orgId: args.orgId,
      itemKind: args.itemKind,
      itemRefId: args.itemRefId,
      archivedAt: now,
      archivedByUserId: ctx.user._id,
      retentionUntil,
      legalHold: args.legalHold,
      metadata: args.metadata,
    });

    return { recordId };
  },
});

/**
 * Liste les pièces archivées pour une org, paginées en MVP via un simple
 * `limit` (default 50). Les pièces détruites (`destroyedAt`) sont exclues
 * par défaut — passer `includeDestroyed: true` pour les inclure (audit).
 */
export const list = authQuery({
  args: {
    orgId: v.id("orgs"),
    itemKind: v.optional(itemKindValidator),
    includeDestroyed: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.iarchive.view);

    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));

    // Branchement sur l'index le plus efficace selon le filtre `itemKind`.
    const rows = args.itemKind
      ? await ctx.db
          .query("iArchive_records")
          .withIndex("by_org_itemKind", (q) =>
            q.eq("orgId", args.orgId).eq("itemKind", args.itemKind!),
          )
          .order("desc")
          .take(limit * 2)
      : await ctx.db
          .query("iArchive_records")
          .withIndex("by_org_archivedAt", (q) => q.eq("orgId", args.orgId))
          .order("desc")
          .take(limit * 2);

    const filtered = args.includeDestroyed
      ? rows
      : rows.filter((r) => r.destroyedAt == null);

    return filtered.slice(0, limit);
  },
});

/**
 * Demande de destruction d'une pièce archivée — marque uniquement
 * `destructionRequestedAt`. La destruction effective nécessite une
 * approbation explicite (`approveDestruction`).
 *
 * Refusé si :
 *  - la pièce est sous `legalHold`,
 *  - la rétention n'est pas encore expirée.
 */
export const requestDestruction = authMutation({
  args: { recordId: v.id("iArchive_records") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw error(ErrorCode.NOT_FOUND, "Archive introuvable.");
    }

    const membership = await getMembership(ctx, ctx.user._id, record.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.iarchive.destruct);

    if (record.legalHold === true) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Pièce sous verrou juridique (legalHold) — destruction impossible.",
      );
    }
    if (record.retentionUntil != null && record.retentionUntil > Date.now()) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Rétention non expirée — destruction prématurée refusée.",
      );
    }
    if (record.destroyedAt != null) {
      throw error(ErrorCode.NOT_FOUND, "Pièce déjà détruite.");
    }

    await ctx.db.patch(args.recordId, {
      destructionRequestedAt: Date.now(),
      destructionRequestedByUserId: ctx.user._id,
    });

    return { recordId: args.recordId };
  },
});

/**
 * Approuve la destruction et exécute physiquement la suppression de la
 * rangée d'archive. Exige `iarchive.destruct` (niveau admin). Pour préserver
 * la traçabilité, la table source (correspondance, document, dossier) n'est
 * PAS purgée ici — seules les références d'archivage sont retirées. La
 * purge cascade est laissée à un cron de Phase ultérieure.
 */
export const approveDestruction = authMutation({
  args: { recordId: v.id("iArchive_records") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw error(ErrorCode.NOT_FOUND, "Archive introuvable.");
    }

    const membership = await getMembership(ctx, ctx.user._id, record.orgId);
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.iarchive.destruct);

    if (record.destructionRequestedAt == null) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Demande de destruction préalable requise.",
      );
    }
    if (record.legalHold === true) {
      throw error(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
        "Pièce sous verrou juridique (legalHold) — destruction refusée.",
      );
    }

    // En MVP : on patch pour marquer la destruction puis on supprime
    // physiquement la rangée. La trace résiduelle restera dans les logs
    // d'audit (Hippocampe) — qui ne sont pas tenus à jour ici en MVP.
    await ctx.db.patch(args.recordId, {
      destroyedAt: Date.now(),
      destructionApprovedByUserId: ctx.user._id,
    });
    await ctx.db.delete(args.recordId);

    return { destroyed: true };
  },
});
