/**
 * Briefings IA — partie Convex query/mutation (runtime V8).
 *
 * Les actions Gemini vivent dans `convex/actions/intelligenceBriefings.ts`
 * (runtime Node). Ce fichier expose :
 *   - `_loadProfileContext` / `_loadCaseContext` (internalQuery)
 *   - `_saveBriefing` (internalMutation)
 *   - `listBriefings` / `getBriefing` (authQuery publiques)
 *
 * Cloisonnement : assertCallerIsIntelAgency + intelligence.* task code.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { authQuery, authMutation } from "../lib/customFunctions";
import type { Id } from "../_generated/dataModel";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { assertCallerIsIntelAgency } from "../lib/intelligenceAgencyVisibility";

const targetTypeValidator = v.union(
	v.literal("profile"),
	v.literal("child_profile"),
	v.literal("diplomatic_target"),
	v.literal("agent"),
	v.literal("case"),
);

const profileTargetTypeValidator = v.union(
	v.literal("profile"),
	v.literal("child_profile"),
	v.literal("diplomatic_target"),
	v.literal("agent"),
);

const classificationValidator = v.union(
	v.literal("internal"),
	v.literal("restricted"),
	v.literal("secret"),
	v.literal("top_secret"),
);

// ─── PUBLIC QUERIES ────────────────────────────────────────────────

export const listBriefings = authQuery({
	args: {
		orgId: v.id("orgs"),
		targetType: v.optional(targetTypeValidator),
		targetId: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(
			ctx,
			ctx.user,
			membership,
			"intelligence.briefing.generate",
		);

		const limit = Math.min(args.limit ?? 50, 200);

		if (args.targetType && args.targetId) {
			const briefings = await ctx.db
				.query("intelligenceBriefings")
				.withIndex("by_org_target", (q) =>
					q
						.eq("orgId", args.orgId)
						.eq("targetType", args.targetType!)
						.eq("targetId", args.targetId!),
				)
				.order("desc")
				.take(limit);
			return briefings.filter((b) => b.deletedAt === undefined);
		}

		const briefings = await ctx.db
			.query("intelligenceBriefings")
			.withIndex("by_org_generated", (q) => q.eq("orgId", args.orgId))
			.order("desc")
			.take(limit);
		return briefings.filter((b) => b.deletedAt === undefined);
	},
});

export const getBriefing = authQuery({
	args: {
		orgId: v.id("orgs"),
		briefingId: v.id("intelligenceBriefings"),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(
			ctx,
			ctx.user,
			membership,
			"intelligence.briefing.generate",
		);

		const b = await ctx.db.get(args.briefingId);
		if (!b || b.orgId !== args.orgId || b.deletedAt) {
			throw error(ErrorCode.NOT_FOUND);
		}
		return b;
	},
});

/**
 * Soft-delete d'un briefing — réservé à son auteur (generatedBy).
 * L'audit trail dans intelligenceAuditLog conserve la trace.
 */
export const deleteBriefing = authMutation({
	args: {
		orgId: v.id("orgs"),
		briefingId: v.id("intelligenceBriefings"),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(
			ctx,
			ctx.user,
			membership,
			"intelligence.briefing.generate",
		);

		const b = await ctx.db.get(args.briefingId);
		if (!b || b.orgId !== args.orgId || b.deletedAt) {
			throw error(ErrorCode.NOT_FOUND);
		}
		if (b.generatedBy !== ctx.user._id) {
			throw error(
				ErrorCode.INSUFFICIENT_PERMISSIONS,
				"Seul l'auteur peut supprimer un briefing.",
			);
		}

		const now = Date.now();
		await ctx.db.patch(args.briefingId, { deletedAt: now });

		await ctx.db.insert("intelligenceAuditLog", {
			orgId: args.orgId,
			action: "briefings.delete",
			actorId: ctx.user._id,
			actorMembershipId: membership?._id,
			targetType: b.targetType === "case" ? "case" : b.targetType,
			targetId: b.targetId,
			classification: b.classification,
			metadata: { briefingId: args.briefingId, model: b.model },
			outcome: "success",
			timestamp: now,
		});

		return args.briefingId;
	},
});

// ─── INTERNAL HELPERS (consommés par l'action Node) ────────────────

export const _loadProfileContext = internalQuery({
	args: {
		orgId: v.id("orgs"),
		targetType: profileTargetTypeValidator,
		targetId: v.string(),
	},
	handler: async (ctx, args) => {
		let label = "Cible";
		let identitySummary = "Donnée non disponible";
		let country: string | undefined;
		let profession: string | undefined;

		if (args.targetType === "profile") {
			const p = await ctx.db.get(args.targetId as Id<"profiles">);
			if (p) {
				const fn = p.identity?.firstName ?? "";
				const ln = p.identity?.lastName ?? "";
				label = `${fn} ${ln}`.trim() || p._id;
				identitySummary = `${label}${p.matricule ? ` (matricule ${p.matricule})` : ""}`;
				country = p.countryOfResidence;
				profession = p.profession?.title;
			}
		} else if (args.targetType === "diplomatic_target") {
			const t = await ctx.db.get(args.targetId as Id<"diplomaticTargets">);
			if (t) {
				label = t.name;
				identitySummary = `${t.name}${t.sector ? ` (${t.sector})` : ""}`;
				country = t.country;
			}
		}

		const notes = await ctx.db
			.query("intelligenceNotes")
			.withIndex("by_target", (q) =>
				q.eq("targetType", args.targetType).eq("targetId", args.targetId),
			)
			.take(50);

		const activeNotes = notes
			.filter((n) => n.deletedAt === undefined && n.orgId === args.orgId)
			.map((n) => ({
				severity: n.severity,
				category: n.category,
				content: n.content,
				classification: n.classification,
				verified: n.verified,
				createdAt: n._creationTime,
			}));

		const watchlistItems = await ctx.db
			.query("intelligenceWatchlistItems")
			.withIndex("by_target", (q) =>
				q.eq("targetType", args.targetType).eq("targetId", args.targetId),
			)
			.take(20);
		const wlInOrg = watchlistItems.filter((it) => it.orgId === args.orgId);

		const linksA = await ctx.db
			.query("intelligenceLinks")
			.withIndex("by_org", (q) => q.eq("orgId", args.orgId))
			.take(500);
		const links = linksA
			.filter(
				(l) =>
					l.deletedAt === undefined &&
					((l.fromTargetType === args.targetType &&
						l.fromTargetId === args.targetId) ||
						(l.toTargetType === args.targetType &&
							l.toTargetId === args.targetId)),
			)
			.slice(0, 30);

		const classification = pickHighestClassification(
			activeNotes
				.map((n) => n.classification as string | undefined)
				.filter((c): c is string => typeof c === "string"),
		);

		const identity = await ctx.auth.getUserIdentity();
		let generatedBy: Id<"users"> | undefined;
		if (identity) {
			const user = await ctx.db
				.query("users")
				.withIndex("by_authId", (q) => q.eq("authId", identity.subject))
				.unique();
			generatedBy = user?._id;
		}
		if (!generatedBy) {
			throw new Error("Utilisateur non authentifié");
		}

		return {
			label,
			identitySummary,
			country,
			profession,
			notes: activeNotes,
			watchlistItemsCount: wlInOrg.length,
			links: links.map((l) => ({
				other:
					l.fromTargetType === args.targetType &&
					l.fromTargetId === args.targetId
						? { type: l.toTargetType, id: l.toTargetId }
						: { type: l.fromTargetType, id: l.fromTargetId },
				relation: l.relationship,
				strength: l.strength ?? "medium",
				verification: l.verified,
			})),
			classification,
			generatedBy,
		};
	},
});

export const _loadCaseContext = internalQuery({
	args: {
		orgId: v.id("orgs"),
		caseId: v.id("intelligenceCases"),
	},
	handler: async (ctx, args) => {
		const c = await ctx.db.get(args.caseId);
		if (!c || c.orgId !== args.orgId || c.deletedAt) {
			throw new Error("Dossier introuvable");
		}

		const entities = await ctx.db
			.query("intelligenceCaseEntities")
			.withIndex("by_case", (q) => q.eq("caseId", args.caseId))
			.collect();
		const activeEntities = entities.filter((e) => e.removedAt === undefined);

		const events = await ctx.db
			.query("intelligenceCaseEvents")
			.withIndex("by_case_timestamp", (q) => q.eq("caseId", args.caseId))
			.order("desc")
			.take(30);

		const identity = await ctx.auth.getUserIdentity();
		let generatedBy: Id<"users"> | undefined;
		if (identity) {
			const user = await ctx.db
				.query("users")
				.withIndex("by_authId", (q) => q.eq("authId", identity.subject))
				.unique();
			generatedBy = user?._id;
		}
		if (!generatedBy) throw new Error("Utilisateur non authentifié");

		return {
			title: c.title,
			summary: c.summary,
			status: c.status,
			priority: c.priority,
			classification: c.classification,
			tags: c.tags ?? [],
			openedAt: c.openedAt,
			entities: activeEntities.map((e) => ({
				targetType: e.targetType,
				targetId: e.targetId,
				role: e.role,
				notes: e.notes,
			})),
			events: events.map((e) => ({
				eventType: e.eventType,
				payload: e.payload,
				timestamp: e.timestamp,
			})),
			generatedBy,
		};
	},
});

export const _saveBriefing = internalMutation({
	args: {
		orgId: v.id("orgs"),
		generatedBy: v.id("users"),
		targetType: targetTypeValidator,
		targetId: v.string(),
		title: v.string(),
		content: v.string(),
		model: v.string(),
		promptVersion: v.string(),
		tokensIn: v.optional(v.number()),
		tokensOut: v.optional(v.number()),
		costMicroCents: v.optional(v.number()),
		latencyMs: v.optional(v.number()),
		classification: classificationValidator,
	},
	handler: async (ctx, args) => {
		const id = await ctx.db.insert("intelligenceBriefings", {
			...args,
			generatedAt: Date.now(),
		});

		await ctx.db.insert("intelligenceAuditLog", {
			orgId: args.orgId,
			action: "briefings.generate",
			actorId: args.generatedBy,
			targetType: args.targetType === "case" ? "case" : args.targetType,
			targetId: args.targetId,
			classification: args.classification,
			metadata: {
				briefingId: id,
				model: args.model,
				promptVersion: args.promptVersion,
				costMicroCents: args.costMicroCents,
			},
			outcome: "success",
			timestamp: Date.now(),
		});

		return id;
	},
});

function pickHighestClassification(
	values: string[],
): "internal" | "restricted" | "secret" | "top_secret" {
	const order = ["internal", "restricted", "secret", "top_secret"] as const;
	let max = 0;
	for (const v of values) {
		const idx = order.indexOf(v as (typeof order)[number]);
		if (idx > max) max = idx;
	}
	return order[max];
}
