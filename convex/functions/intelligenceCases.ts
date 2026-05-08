/**
 * Dossiers d'investigation du module Renseignement souverain.
 *
 * Cloisonnement strict :
 *   - assertCallerIsIntelAgency sur chaque handler
 *   - tasks `intelligence.cases.*` (cf. moduleCodes)
 *   - logIntelAccess pour chaque mutation
 */

import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { assertCallerIsIntelAgency } from "../lib/intelligenceAgencyVisibility";
import { logIntelAccess } from "../lib/intelligenceAudit";

const targetTypeValidator = v.union(
	v.literal("profile"),
	v.literal("child_profile"),
	v.literal("diplomatic_target"),
	v.literal("agent"),
);

const statusValidator = v.union(
	v.literal("open"),
	v.literal("monitoring"),
	v.literal("closed"),
	v.literal("archived"),
);

const priorityValidator = v.union(
	v.literal("low"),
	v.literal("medium"),
	v.literal("high"),
	v.literal("critical"),
);

const classificationValidator = v.union(
	v.literal("internal"),
	v.literal("restricted"),
	v.literal("secret"),
	v.literal("top_secret"),
);

// ─── QUERIES ────────────────────────────────────────────────────────

export const list = authQuery({
	args: {
		orgId: v.id("orgs"),
		status: v.optional(statusValidator),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(ctx, ctx.user, membership, "intelligence.cases.view");

		let cases;
		if (args.status) {
			cases = await ctx.db
				.query("intelligenceCases")
				.withIndex("by_org_status", (q) =>
					q.eq("orgId", args.orgId).eq("status", args.status!),
				)
				.collect();
		} else {
			cases = await ctx.db
				.query("intelligenceCases")
				.withIndex("by_org_status", (q) => q.eq("orgId", args.orgId))
				.collect();
		}

		return cases.filter((c) => c.deletedAt === undefined);
	},
});

export const getDetail = authQuery({
	args: {
		orgId: v.id("orgs"),
		caseId: v.id("intelligenceCases"),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(ctx, ctx.user, membership, "intelligence.cases.view");

		const c = await ctx.db.get(args.caseId);
		if (!c || c.orgId !== args.orgId || c.deletedAt) {
			throw error(ErrorCode.NOT_FOUND);
		}

		const [entities, events] = await Promise.all([
			ctx.db
				.query("intelligenceCaseEntities")
				.withIndex("by_case", (q) => q.eq("caseId", args.caseId))
				.collect(),
			ctx.db
				.query("intelligenceCaseEvents")
				.withIndex("by_case_timestamp", (q) => q.eq("caseId", args.caseId))
				.order("desc")
				.take(50),
		]);

		return {
			case: c,
			entities: entities.filter((e) => e.removedAt === undefined),
			events,
		};
	},
});

// ─── MUTATIONS ──────────────────────────────────────────────────────

export const create = authMutation({
	args: {
		orgId: v.id("orgs"),
		title: v.string(),
		summary: v.optional(v.string()),
		priority: priorityValidator,
		classification: classificationValidator,
		leadAgentId: v.optional(v.id("users")),
		tags: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const title = args.title.trim();
		if (!title) throw error(ErrorCode.INVALID_ARGUMENT);

		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(
			ctx,
			ctx.user,
			membership,
			"intelligence.cases.create",
		);

		const now = Date.now();
		const caseId = await ctx.db.insert("intelligenceCases", {
			orgId: args.orgId,
			leadAgentId: args.leadAgentId ?? ctx.user._id,
			createdBy: ctx.user._id,
			title,
			summary: args.summary,
			status: "open",
			priority: args.priority,
			classification: args.classification,
			tags: args.tags,
			openedAt: now,
			updatedAt: now,
		});

		await ctx.db.insert("intelligenceCaseEvents", {
			caseId,
			orgId: args.orgId,
			actorId: ctx.user._id,
			eventType: "opened",
			payload: { title, priority: args.priority },
			timestamp: now,
		});

		await logIntelAccess(ctx, {
			orgId: args.orgId,
			actorId: ctx.user._id,
			actorMembershipId: membership?._id,
			action: "cases.create",
			targetType: "case",
			targetId: caseId,
			caseId,
			classification: args.classification,
			metadata: { priority: args.priority, title },
			outcome: "success",
		});

		return caseId;
	},
});

export const update = authMutation({
	args: {
		orgId: v.id("orgs"),
		caseId: v.id("intelligenceCases"),
		title: v.optional(v.string()),
		summary: v.optional(v.string()),
		status: v.optional(statusValidator),
		priority: v.optional(priorityValidator),
		classification: v.optional(classificationValidator),
		leadAgentId: v.optional(v.id("users")),
		tags: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(ctx, ctx.user, membership, "intelligence.cases.edit");

		const c = await ctx.db.get(args.caseId);
		if (!c || c.orgId !== args.orgId || c.deletedAt) {
			throw error(ErrorCode.NOT_FOUND);
		}

		const patch: Record<string, unknown> = { updatedAt: Date.now() };
		if (args.title !== undefined) patch.title = args.title.trim();
		if (args.summary !== undefined) patch.summary = args.summary;
		if (args.status !== undefined) patch.status = args.status;
		if (args.priority !== undefined) patch.priority = args.priority;
		if (args.classification !== undefined) {
			patch.classification = args.classification;
		}
		if (args.leadAgentId !== undefined) patch.leadAgentId = args.leadAgentId;
		if (args.tags !== undefined) patch.tags = args.tags;
		if (args.status === "closed" || args.status === "archived") {
			patch.closedAt = Date.now();
		}

		await ctx.db.patch(args.caseId, patch);

		const now = Date.now();
		if (args.status !== undefined && args.status !== c.status) {
			await ctx.db.insert("intelligenceCaseEvents", {
				caseId: args.caseId,
				orgId: args.orgId,
				actorId: ctx.user._id,
				eventType:
					args.status === "closed"
						? "closed"
						: args.status === "archived"
							? "archived"
							: "status_changed",
				payload: { from: c.status, to: args.status },
				timestamp: now,
			});
		}
		if (args.priority !== undefined && args.priority !== c.priority) {
			await ctx.db.insert("intelligenceCaseEvents", {
				caseId: args.caseId,
				orgId: args.orgId,
				actorId: ctx.user._id,
				eventType: "priority_changed",
				payload: { from: c.priority, to: args.priority },
				timestamp: now,
			});
		}

		await logIntelAccess(ctx, {
			orgId: args.orgId,
			actorId: ctx.user._id,
			action: "cases.update",
			targetType: "case",
			targetId: args.caseId,
			caseId: args.caseId,
			classification: (args.classification ?? c.classification) as
				| "internal"
				| "restricted"
				| "secret"
				| "top_secret",
			metadata: { changedFields: Object.keys(patch) },
			outcome: "success",
		});

		return args.caseId;
	},
});

export const addEntity = authMutation({
	args: {
		orgId: v.id("orgs"),
		caseId: v.id("intelligenceCases"),
		targetType: targetTypeValidator,
		targetId: v.string(),
		role: v.optional(v.string()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(ctx, ctx.user, membership, "intelligence.cases.edit");

		const c = await ctx.db.get(args.caseId);
		if (!c || c.orgId !== args.orgId || c.deletedAt) {
			throw error(ErrorCode.NOT_FOUND);
		}

		const now = Date.now();
		const entityId = await ctx.db.insert("intelligenceCaseEntities", {
			caseId: args.caseId,
			orgId: args.orgId,
			targetType: args.targetType,
			targetId: args.targetId,
			role: args.role,
			notes: args.notes,
			addedBy: ctx.user._id,
			addedAt: now,
		});

		await ctx.db.insert("intelligenceCaseEvents", {
			caseId: args.caseId,
			orgId: args.orgId,
			actorId: ctx.user._id,
			eventType: "entity_added",
			payload: { targetType: args.targetType, targetId: args.targetId, role: args.role },
			timestamp: now,
		});

		await logIntelAccess(ctx, {
			orgId: args.orgId,
			actorId: ctx.user._id,
			action: "cases.addEntity",
			targetType: "case",
			targetId: args.caseId,
			caseId: args.caseId,
			classification: c.classification,
			metadata: { entityId, targetType: args.targetType },
			outcome: "success",
		});

		return entityId;
	},
});

export const removeEntity = authMutation({
	args: {
		orgId: v.id("orgs"),
		entityId: v.id("intelligenceCaseEntities"),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(ctx, ctx.user, membership, "intelligence.cases.edit");

		const entity = await ctx.db.get(args.entityId);
		if (!entity || entity.orgId !== args.orgId || entity.removedAt) {
			throw error(ErrorCode.NOT_FOUND);
		}

		const now = Date.now();
		await ctx.db.patch(args.entityId, { removedAt: now });
		await ctx.db.insert("intelligenceCaseEvents", {
			caseId: entity.caseId,
			orgId: args.orgId,
			actorId: ctx.user._id,
			eventType: "entity_removed",
			payload: { targetType: entity.targetType, targetId: entity.targetId },
			timestamp: now,
		});

		await logIntelAccess(ctx, {
			orgId: args.orgId,
			actorId: ctx.user._id,
			action: "cases.removeEntity",
			targetType: "case",
			targetId: entity.caseId,
			caseId: entity.caseId,
			outcome: "success",
		});

		return args.entityId;
	},
});

export const addComment = authMutation({
	args: {
		orgId: v.id("orgs"),
		caseId: v.id("intelligenceCases"),
		comment: v.string(),
	},
	handler: async (ctx, args) => {
		const text = args.comment.trim();
		if (!text) throw error(ErrorCode.INVALID_ARGUMENT);

		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(ctx, ctx.user, membership, "intelligence.cases.edit");

		const c = await ctx.db.get(args.caseId);
		if (!c || c.orgId !== args.orgId || c.deletedAt) {
			throw error(ErrorCode.NOT_FOUND);
		}

		const now = Date.now();
		const eventId = await ctx.db.insert("intelligenceCaseEvents", {
			caseId: args.caseId,
			orgId: args.orgId,
			actorId: ctx.user._id,
			eventType: "comment",
			payload: { text },
			timestamp: now,
		});

		await logIntelAccess(ctx, {
			orgId: args.orgId,
			actorId: ctx.user._id,
			action: "cases.comment",
			targetType: "case",
			targetId: args.caseId,
			caseId: args.caseId,
			outcome: "success",
		});

		return eventId;
	},
});
