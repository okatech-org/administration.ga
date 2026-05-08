/**
 * Liens entre cibles du module Renseignement.
 *
 * Permet d'établir un graphe de relations (famille, affaires, mentor,
 * suspect, etc.) pour analyser le réseau d'une cible.
 */

import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { assertCallerIsIntelAgency } from "../lib/intelligenceAgencyVisibility";

const targetTypeValidator = v.union(
  v.literal("profile"),
  v.literal("child_profile"),
  v.literal("diplomatic_target"),
  v.literal("agent"),
);

const relationshipValidator = v.union(
  v.literal("family"),
  v.literal("business"),
  v.literal("friendship"),
  v.literal("mentor"),
  v.literal("suspect"),
  v.literal("accomplice"),
  v.literal("contact"),
  v.literal("other"),
);

const strengthValidator = v.union(
  v.literal("weak"),
  v.literal("medium"),
  v.literal("strong"),
);

const verifiedValidator = v.union(
  v.literal("unverified"),
  v.literal("confirmed"),
  v.literal("disputed"),
);

/**
 * Liste tous les liens d'une cible (sortants + entrants).
 * Utilisé pour cartographier le réseau d'une cible.
 */
export const listForTarget = authQuery({
  args: {
    orgId: v.id("orgs"),
    targetType: targetTypeValidator,
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.links.view",
    );

    const [outgoing, incoming] = await Promise.all([
      ctx.db
        .query("intelligenceLinks")
        .withIndex("by_from", (q) =>
          q.eq("fromTargetType", args.targetType).eq("fromTargetId", args.targetId),
        )
        .collect(),
      ctx.db
        .query("intelligenceLinks")
        .withIndex("by_to", (q) =>
          q.eq("toTargetType", args.targetType).eq("toTargetId", args.targetId),
        )
        .collect(),
    ]);

    const all = [...outgoing, ...incoming]
      .filter((l) => l.deletedAt === undefined && l.orgId === args.orgId);

    // Hydrater les cibles pour afficher leur label
    const hydrated = await Promise.all(
      all.map(async (link) => {
        const isOutgoing =
          link.fromTargetType === args.targetType &&
          link.fromTargetId === args.targetId;
        const otherType = isOutgoing ? link.toTargetType : link.fromTargetType;
        const otherId = isOutgoing ? link.toTargetId : link.fromTargetId;

        let otherLabel = "(cible inconnue)";
        try {
          const t = await ctx.db.get(otherId as never);
          if (t) {
            const o = t as any;
            switch (otherType) {
              case "profile":
                otherLabel = `${o.identity?.firstName ?? ""} ${o.identity?.lastName ?? ""}`.trim() || "(sans nom)";
                break;
              case "child_profile":
                otherLabel = `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || "(sans nom)";
                break;
              case "diplomatic_target":
                otherLabel = o.name ?? "(sans nom)";
                break;
              case "agent":
                otherLabel = `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() || o.email || "(agent)";
                break;
            }
          }
        } catch {
          // ignore
        }

        return {
          ...link,
          direction: isOutgoing ? ("outgoing" as const) : ("incoming" as const),
          otherType,
          otherId,
          otherLabel,
        };
      }),
    );

    return hydrated;
  },
});

export const create = authMutation({
  args: {
    orgId: v.id("orgs"),
    fromTargetType: targetTypeValidator,
    fromTargetId: v.string(),
    toTargetType: targetTypeValidator,
    toTargetId: v.string(),
    relationship: relationshipValidator,
    description: v.optional(v.string()),
    strength: v.optional(strengthValidator),
    verified: v.optional(verifiedValidator),
  },
  handler: async (ctx, args) => {
    if (
      args.fromTargetType === args.toTargetType &&
      args.fromTargetId === args.toTargetId
    ) {
      throw error(ErrorCode.INVALID_ARGUMENT);
    }

    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.links.manage",
    );

    return await ctx.db.insert("intelligenceLinks", {
      orgId: args.orgId,
      createdBy: ctx.user._id,
      fromTargetType: args.fromTargetType,
      fromTargetId: args.fromTargetId,
      toTargetType: args.toTargetType,
      toTargetId: args.toTargetId,
      relationship: args.relationship,
      description: args.description?.trim() || undefined,
      strength: args.strength,
      verified: args.verified ?? "unverified",
      updatedAt: Date.now(),
    });
  },
});

export const update = authMutation({
  args: {
    linkId: v.id("intelligenceLinks"),
    orgId: v.id("orgs"),
    relationship: v.optional(relationshipValidator),
    description: v.optional(v.string()),
    strength: v.optional(strengthValidator),
    verified: v.optional(verifiedValidator),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link || link.orgId !== args.orgId || link.deletedAt !== undefined) {
      throw error(ErrorCode.NOT_FOUND);
    }

    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.links.manage",
    );

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.relationship !== undefined) patch.relationship = args.relationship;
    if (args.description !== undefined) {
      patch.description = args.description.trim() || undefined;
    }
    if (args.strength !== undefined) patch.strength = args.strength;
    if (args.verified !== undefined) patch.verified = args.verified;

    await ctx.db.patch(args.linkId, patch);
    return args.linkId;
  },
});

export const remove = authMutation({
  args: {
    linkId: v.id("intelligenceLinks"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link || link.orgId !== args.orgId || link.deletedAt !== undefined) {
      throw error(ErrorCode.NOT_FOUND);
    }

    await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    await assertCanDoTask(
      ctx,
      ctx.user,
      membership,
      "intelligence.links.manage",
    );

    await ctx.db.patch(args.linkId, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return args.linkId;
  },
});
