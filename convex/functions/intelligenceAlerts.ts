/**
 * Alertes du module Renseignement souverain.
 *
 * Deux objets :
 *   1. `intelligenceAlertRules` — règles déclaratives évaluées par cron
 *      (ou trigger événementiel) qui produisent des alertes.
 *   2. `intelligenceAlerts` — alertes générées, avec inbox/ack/dismiss.
 *
 * Cloisonnement : toutes les fonctions exigent
 *   - assertCallerIsIntelAgency (org type intelligence_agency)
 *   - intelligence.* task code approprié
 */

import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { internalMutation } from "../_generated/server";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import { assertCallerIsIntelAgency } from "../lib/intelligenceAgencyVisibility";
import { logIntelAccess } from "../lib/intelligenceAudit";

const severityValidator = v.union(
	v.literal("low"),
	v.literal("medium"),
	v.literal("high"),
	v.literal("critical"),
);

const ruleTypeValidator = v.union(
	v.literal("watchlist_match"),
	v.literal("note_severity"),
	v.literal("profile_sector"),
	v.literal("link_added"),
	v.literal("custom"),
);

const alertTargetTypeValidator = v.union(
	v.literal("profile"),
	v.literal("child_profile"),
	v.literal("diplomatic_target"),
	v.literal("agent"),
	v.literal("case"),
	v.literal("note"),
	v.literal("watchlist_item"),
);

// ─── ALERT RULES ────────────────────────────────────────────────────

export const listRules = authQuery({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(
			ctx,
			ctx.user,
			membership,
			"intelligence.watchlists.view",
		);

		return await ctx.db
			.query("intelligenceAlertRules")
			.withIndex("by_org_active", (q) => q.eq("orgId", args.orgId))
			.collect();
	},
});

export const createRule = authMutation({
	args: {
		orgId: v.id("orgs"),
		name: v.string(),
		description: v.optional(v.string()),
		ruleType: ruleTypeValidator,
		params: v.any(),
		notifyMembershipIds: v.array(v.id("memberships")),
		severity: severityValidator,
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(
			ctx,
			ctx.user,
			membership,
			"intelligence.watchlists.manage",
		);

		const ruleId = await ctx.db.insert("intelligenceAlertRules", {
			orgId: args.orgId,
			createdBy: ctx.user._id,
			name: args.name,
			description: args.description,
			ruleType: args.ruleType,
			params: args.params,
			notifyMembershipIds: args.notifyMembershipIds,
			severity: args.severity,
			isActive: true,
			updatedAt: Date.now(),
		});

		await logIntelAccess(ctx, {
			orgId: args.orgId,
			actorId: ctx.user._id,
			actorMembershipId: membership?._id,
			action: "alertRules.create",
			targetType: "alertRule",
			targetId: ruleId,
			metadata: { ruleType: args.ruleType, name: args.name },
			outcome: "success",
		});

		return ruleId;
	},
});

export const setRuleActive = authMutation({
	args: {
		orgId: v.id("orgs"),
		ruleId: v.id("intelligenceAlertRules"),
		isActive: v.boolean(),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(
			ctx,
			ctx.user,
			membership,
			"intelligence.watchlists.manage",
		);

		const rule = await ctx.db.get(args.ruleId);
		if (!rule || rule.orgId !== args.orgId) {
			throw error(ErrorCode.NOT_FOUND);
		}

		await ctx.db.patch(args.ruleId, {
			isActive: args.isActive,
			updatedAt: Date.now(),
		});

		await logIntelAccess(ctx, {
			orgId: args.orgId,
			actorId: ctx.user._id,
			action: "alertRules.toggle",
			targetType: "alertRule",
			targetId: args.ruleId,
			metadata: { isActive: args.isActive },
			outcome: "success",
		});

		return args.ruleId;
	},
});

// ─── ALERTS (inbox) ─────────────────────────────────────────────────

export const listAlerts = authQuery({
	args: {
		orgId: v.id("orgs"),
		status: v.optional(
			v.union(
				v.literal("new"),
				v.literal("acknowledged"),
				v.literal("dismissed"),
			),
		),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(
			ctx,
			ctx.user,
			membership,
			"intelligence.watchlists.view",
		);

		const limit = Math.min(args.limit ?? 50, 200);

		if (args.status) {
			return await ctx.db
				.query("intelligenceAlerts")
				.withIndex("by_org_status", (q) =>
					q.eq("orgId", args.orgId).eq("status", args.status!),
				)
				.order("desc")
				.take(limit);
		}

		return await ctx.db
			.query("intelligenceAlerts")
			.withIndex("by_org_created", (q) => q.eq("orgId", args.orgId))
			.order("desc")
			.take(limit);
	},
});

export const acknowledgeAlert = authMutation({
	args: {
		orgId: v.id("orgs"),
		alertId: v.id("intelligenceAlerts"),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(
			ctx,
			ctx.user,
			membership,
			"intelligence.watchlists.view",
		);

		const alert = await ctx.db.get(args.alertId);
		if (!alert || alert.orgId !== args.orgId) {
			throw error(ErrorCode.NOT_FOUND);
		}

		await ctx.db.patch(args.alertId, {
			status: "acknowledged",
			acknowledgedBy: ctx.user._id,
			acknowledgedAt: Date.now(),
		});

		await logIntelAccess(ctx, {
			orgId: args.orgId,
			actorId: ctx.user._id,
			action: "alerts.acknowledge",
			targetType: "alert",
			targetId: args.alertId,
			outcome: "success",
		});

		return args.alertId;
	},
});

export const dismissAlert = authMutation({
	args: {
		orgId: v.id("orgs"),
		alertId: v.id("intelligenceAlerts"),
		reason: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(
			ctx,
			ctx.user,
			membership,
			"intelligence.watchlists.manage",
		);

		const alert = await ctx.db.get(args.alertId);
		if (!alert || alert.orgId !== args.orgId) {
			throw error(ErrorCode.NOT_FOUND);
		}

		await ctx.db.patch(args.alertId, {
			status: "dismissed",
			dismissedBy: ctx.user._id,
			dismissedAt: Date.now(),
			dismissReason: args.reason,
		});

		await logIntelAccess(ctx, {
			orgId: args.orgId,
			actorId: ctx.user._id,
			action: "alerts.dismiss",
			targetType: "alert",
			targetId: args.alertId,
			metadata: { reason: args.reason },
			outcome: "success",
		});

		return args.alertId;
	},
});

export const countNew = authQuery({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const alerts = await ctx.db
			.query("intelligenceAlerts")
			.withIndex("by_org_status", (q) =>
				q.eq("orgId", args.orgId).eq("status", "new"),
			)
			.take(500);
		return alerts.length;
	},
});

// ─── CRON EVALUATOR ─────────────────────────────────────────────────

/**
 * Évaluation périodique des règles. Pour Phase 1, l'évaluateur ne traite
 * que `watchlist_match` (entrées récentes dans les watchlists actives) —
 * stub minimal qui crée une alerte par item ajouté depuis la dernière
 * évaluation. Les autres ruleTypes sont des extensions futures.
 *
 * Appelé via cron `evaluate-intelligence-alerts` toutes les 15 minutes.
 */
export const evaluateRules = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const rules = await ctx.db
			.query("intelligenceAlertRules")
			.withIndex("by_type", (q) => q.eq("ruleType", "watchlist_match"))
			.collect();

		const activeRules = rules.filter(
			(r) => r.isActive && r.deletedAt === undefined,
		);

		let createdCount = 0;
		for (const rule of activeRules) {
			const since = rule.lastEvaluatedAt ?? now - 15 * 60 * 1000;
			const params = (rule.params ?? {}) as { watchlistId?: string };
			if (!params.watchlistId) continue;

			const items = await ctx.db
				.query("intelligenceWatchlistItems")
				.withIndex("by_watchlist", (q) =>
					q.eq("watchlistId", params.watchlistId as never),
				)
				.collect();

			for (const item of items) {
				if (item._creationTime <= since) continue;

				await ctx.db.insert("intelligenceAlerts", {
					orgId: rule.orgId,
					ruleId: rule._id,
					targetType: "watchlist_item",
					targetId: item._id,
					title: `Nouvelle entrée dans la liste de surveillance`,
					summary: rule.description,
					severity: rule.severity,
					status: "new",
					notifyMembershipIds: rule.notifyMembershipIds,
					metadata: { itemTargetType: item.targetType, itemTargetId: item.targetId },
					createdAt: now,
				});
				createdCount += 1;
			}

			await ctx.db.patch(rule._id, {
				lastEvaluatedAt: now,
				lastTriggeredAt: createdCount > 0 ? now : rule.lastTriggeredAt,
			});
		}

		return { createdCount, evaluatedRules: activeRules.length };
	},
});
