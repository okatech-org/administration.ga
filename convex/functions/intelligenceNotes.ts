/**
 * Notes du module Renseignement.
 *
 * Cloisonnement strict : chaque opération exige une task `intelligence.notes.*`,
 * laquelle est elle-même reverse-mappée vers le module `intelligence` via
 * `MODULE_ACCESS_TASKS`. Un agent dont l'org n'a pas le module activé sera
 * automatiquement bloqué par `assertCanDoTask`.
 *
 * Toutes les écritures et lectures critiques laissent une trace dans
 * `auditLog` (table=intelligenceNotes, operation=read|insert|update|delete).
 * Les notes ne sont jamais purgées : on utilise `deletedAt`/`deletedBy`
 * (tombstone) pour garder la traçabilité.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask, canDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { assertCallerIsIntelAgency } from "../lib/intelligenceAgencyVisibility";
import { logIntelAccess } from "../lib/intelligenceAudit";

const targetTypeValidator = v.union(
  v.literal("profile"),
  v.literal("child_profile"),
  v.literal("diplomatic_target"),
  v.literal("agent"),
);

const categoryValidator = v.union(
  v.literal("observation"),
  v.literal("risk"),
  v.literal("flag"),
  v.literal("lead"),
);

const severityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("critical"),
);

const sourceValidator = v.union(
  v.literal("humint"),
  v.literal("osint"),
  v.literal("internal"),
  v.literal("tip"),
  v.literal("other"),
);

const classificationValidator = v.union(
  v.literal("internal"),
  v.literal("restricted"),
  v.literal("secret"),
  v.literal("top_secret"),
);

const verifiedStatusValidator = v.union(
  v.literal("unverified"),
  v.literal("confirmed"),
  v.literal("disputed"),
);

async function logAudit(
  ctx: { db: { insert: (...args: any[]) => any } },
  args: {
    operation: "read" | "insert" | "update" | "delete";
    docId: string;
    actorId: Id<"users">;
    changes?: unknown;
  },
): Promise<void> {
  await ctx.db.insert("auditLog", {
    table: "intelligenceNotes",
    docId: args.docId,
    operation: args.operation,
    actorId: args.actorId,
    changes: args.changes,
    timestamp: Date.now(),
  });
}

export const listByTarget = authQuery({
  args: {
    targetType: targetTypeValidator,
    targetId: v.string(),
    orgId: v.id("orgs"),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.notes.view",
    );

    const notes = await ctx.db
      .query("intelligenceNotes")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId),
      )
      .order("desc")
      .collect();

    const filtered = args.includeDeleted
      ? notes
      : notes.filter((n) => n.deletedAt === undefined);

    return await Promise.all(
      filtered.map(async (note) => {
        const author = await ctx.db.get(note.authorId);
        return {
          ...note,
          author: author
            ? {
                _id: author._id,
                firstName: author.firstName,
                lastName: author.lastName,
              }
            : null,
        };
      }),
    );
  },
});

export const create = authMutation({
  args: {
    targetType: targetTypeValidator,
    targetId: v.string(),
    orgId: v.id("orgs"),
    content: v.string(),
    category: categoryValidator,
    severity: severityValidator,
    source: v.optional(sourceValidator),
    classification: v.optional(classificationValidator),
    verified: v.optional(verifiedStatusValidator),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const content = args.content.trim();
    if (!content) {
      throw error(ErrorCode.INVALID_ARGUMENT);
    }

    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.notes.create",
    );

    const now = Date.now();
    const noteId = await ctx.db.insert("intelligenceNotes", {
      targetType: args.targetType,
      targetId: args.targetId,
      orgId: args.orgId,
      authorId: ctx.user._id,
      content,
      category: args.category,
      severity: args.severity,
      source: args.source,
      classification: args.classification,
      verified: args.verified ?? "unverified",
      expiresAt: args.expiresAt,
      updatedAt: now,
    });

    await logAudit(ctx, {
      operation: "insert",
      docId: noteId,
      actorId: ctx.user._id,
      changes: {
        targetType: args.targetType,
        targetId: args.targetId,
        category: args.category,
        severity: args.severity,
      },
    });

    await logIntelAccess(ctx, {
      orgId: args.orgId,
      actorId: ctx.user._id,
      actorMembershipId: membership?._id,
      action: "notes.create",
      targetType: "note",
      targetId: noteId,
      classification: args.classification,
      metadata: {
        targetType: args.targetType,
        targetId: args.targetId,
        category: args.category,
        severity: args.severity,
      },
      outcome: "success",
    });

    return noteId;
  },
});

export const update = authMutation({
  args: {
    noteId: v.id("intelligenceNotes"),
    orgId: v.id("orgs"),
    content: v.optional(v.string()),
    category: v.optional(categoryValidator),
    severity: v.optional(severityValidator),
    source: v.optional(sourceValidator),
    classification: v.optional(classificationValidator),
    verified: v.optional(verifiedStatusValidator),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note || note.deletedAt !== undefined) {
      throw error(ErrorCode.NOT_FOUND);
    }
    if (note.orgId !== args.orgId) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.notes.create",
    );

    if (note.authorId !== ctx.user._id) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.content !== undefined) {
      const trimmed = args.content.trim();
      if (!trimmed) throw error(ErrorCode.INVALID_ARGUMENT);
      patch.content = trimmed;
    }
    if (args.category !== undefined) patch.category = args.category;
    if (args.severity !== undefined) patch.severity = args.severity;
    if (args.source !== undefined) patch.source = args.source;
    if (args.classification !== undefined) {
      patch.classification = args.classification;
    }
    if (args.verified !== undefined) patch.verified = args.verified;
    if (args.expiresAt !== undefined) patch.expiresAt = args.expiresAt;

    await ctx.db.patch(args.noteId, patch);

    await logAudit(ctx, {
      operation: "update",
      docId: args.noteId,
      actorId: ctx.user._id,
      changes: patch,
    });

    await logIntelAccess(ctx, {
      orgId: args.orgId,
      actorId: ctx.user._id,
      action: "notes.update",
      targetType: "note",
      targetId: args.noteId,
      classification: args.classification ?? note.classification,
      metadata: { changedFields: Object.keys(patch) },
      outcome: "success",
    });

    return args.noteId;
  },
});

export const remove = authMutation({
  args: {
    noteId: v.id("intelligenceNotes"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note || note.deletedAt !== undefined) {
      throw error(ErrorCode.NOT_FOUND);
    }
    if (note.orgId !== args.orgId) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);

    const isAuthor = note.authorId === ctx.user._id;
    const taskRequired = isAuthor
      ? "intelligence.notes.delete_own"
      : "intelligence.notes.delete_any";

    const allowed = await canDoTask(ctx, ctx.user, membership, taskRequired);
    if (!allowed) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
    }

    const now = Date.now();
    await ctx.db.patch(args.noteId, {
      deletedAt: now,
      deletedBy: ctx.user._id,
      updatedAt: now,
    });

    await logAudit(ctx, {
      operation: "delete",
      docId: args.noteId,
      actorId: ctx.user._id,
      changes: { byAuthor: isAuthor },
    });

    await logIntelAccess(ctx, {
      orgId: args.orgId,
      actorId: ctx.user._id,
      action: "notes.delete",
      targetType: "note",
      targetId: args.noteId,
      classification: note.classification,
      metadata: { byAuthor: isAuthor },
      outcome: "success",
    });

    return args.noteId;
  },
});

/**
 * Liste les notes critiques (severity = high|critical) sur l'ensemble du
 * périmètre du ministère. Utilisée par le dashboard Intelligence.
 */
export const listCritical = authQuery({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.notes.view",
    );

    const limit = Math.min(args.limit ?? 20, 100);

    const [highs, criticals] = await Promise.all([
      ctx.db
        .query("intelligenceNotes")
        .withIndex("by_org_severity", (q) =>
          q.eq("orgId", args.orgId).eq("severity", "high"),
        )
        .order("desc")
        .take(limit),
      ctx.db
        .query("intelligenceNotes")
        .withIndex("by_org_severity", (q) =>
          q.eq("orgId", args.orgId).eq("severity", "critical"),
        )
        .order("desc")
        .take(limit),
    ]);

    return [...criticals, ...highs]
      .filter((n) => n.deletedAt === undefined)
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, limit);
  },
});
