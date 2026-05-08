/**
 * GEOINT — clustering géospatial de la diaspora pour le module
 * Renseignement souverain.
 *
 * Une mutation `computeEnclaves` qui :
 *   1. lit jusqu'à 5000 profils (filtrés par pays optionnel)
 *   2. extrait leurs coordonnées GPS (residence > home > capitale fallback)
 *   3. applique DBSCAN avec paramètres ajustables
 *   4. calcule le score de silhouette
 *   5. enregistre un snapshot dans `intelligenceEnclaves`
 *
 * Cron `recompute-intelligence-enclaves` (hebdo) appelle l'évaluateur
 * pour chaque org intelligence_agency. Manuel via mutation pour les
 * snapshots ad-hoc avec params custom.
 */

import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { internalMutation } from "../_generated/server";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { assertCallerIsIntelAgency } from "../lib/intelligenceAgencyVisibility";
import { logIntelAccess } from "../lib/intelligenceAudit";
import {
	dbscan,
	meanSilhouette,
	computeClusterStats,
	type GeoPoint,
} from "../lib/dbscan";
import { OrganizationType } from "../lib/constants";

const MAX_SCAN = 5000;
const MAX_SAMPLE_POINTS = 100;

// ─── QUERIES ────────────────────────────────────────────────────────

export const listLatestEnclaves = authQuery({
	args: {
		orgId: v.id("orgs"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(ctx, ctx.user, membership, "intelligence.map.view");

		const limit = Math.min(args.limit ?? 50, 200);

		// Récupère le dernier snapshot par created desc, puis tous les clusters
		// associés à ce snapshotId.
		const latest = await ctx.db
			.query("intelligenceEnclaves")
			.withIndex("by_org_created", (q) => q.eq("orgId", args.orgId))
			.order("desc")
			.first();

		if (!latest) return { snapshotId: null, clusters: [] };

		const clusters = await ctx.db
			.query("intelligenceEnclaves")
			.withIndex("by_org_snapshot", (q) =>
				q.eq("orgId", args.orgId).eq("snapshotId", latest.snapshotId),
			)
			.take(limit);

		return {
			snapshotId: latest.snapshotId,
			country: latest.country,
			createdAt: latest.createdAt,
			clusters,
		};
	},
});

// ─── MUTATIONS ──────────────────────────────────────────────────────

export const computeEnclaves = authMutation({
	args: {
		orgId: v.id("orgs"),
		country: v.optional(v.string()),
		epsilonKm: v.optional(v.number()),
		minPts: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(ctx, ctx.user, membership, "intelligence.map.view");

		const result = await runEnclaveComputation(ctx, {
			orgId: args.orgId,
			country: args.country,
			epsilonKm: args.epsilonKm ?? 2,
			minPts: args.minPts ?? 5,
		});

		await logIntelAccess(ctx, {
			orgId: args.orgId,
			actorId: ctx.user._id,
			actorMembershipId: membership?._id,
			action: "geoint.computeEnclaves",
			targetType: "query",
			metadata: {
				country: args.country,
				epsilonKm: args.epsilonKm ?? 2,
				minPts: args.minPts ?? 5,
				clustersFound: result.clustersFound,
				silhouette: result.silhouette,
			},
			outcome: "success",
		});

		return result;
	},
});

// ─── INTERNAL ──────────────────────────────────────────────────────

interface RunArgs {
	orgId: import("../_generated/dataModel").Id<"orgs">;
	country?: string;
	epsilonKm: number;
	minPts: number;
}

async function runEnclaveComputation(
	ctx: import("../_generated/server").MutationCtx,
	args: RunArgs,
) {
	// 1. Charger les profils géolocalisés
	const profiles = args.country
		? await ctx.db
				.query("profiles")
				.withIndex("by_country_of_residence", (q) =>
					q.eq("countryOfResidence", args.country as never),
				)
				.take(MAX_SCAN)
		: await ctx.db.query("profiles").take(MAX_SCAN);

	const points: GeoPoint[] = [];
	for (const p of profiles) {
		const coords = p.addresses?.residence?.coordinates;
		if (
			coords &&
			typeof coords.lat === "number" &&
			typeof coords.lng === "number"
		) {
			points.push({ lat: coords.lat, lng: coords.lng, id: p._id });
		}
	}

	if (points.length < args.minPts) {
		return {
			snapshotId: null,
			clustersFound: 0,
			points: points.length,
			silhouette: 0,
		};
	}

	// 2. DBSCAN
	const labels = dbscan(points, {
		epsilonKm: args.epsilonKm,
		minPts: args.minPts,
	});
	const stats = computeClusterStats(points, labels);
	const silhouette = meanSilhouette(points, labels);

	// 3. Persister le snapshot
	const snapshotId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const now = Date.now();

	for (const cluster of stats) {
		const sample = cluster.pointIndices
			.slice(0, MAX_SAMPLE_POINTS)
			.map((i) => ({ lat: points[i].lat, lng: points[i].lng }));

		await ctx.db.insert("intelligenceEnclaves", {
			orgId: args.orgId,
			snapshotId,
			country: args.country,
			clusterIndex: cluster.clusterIndex,
			size: cluster.size,
			centroid: cluster.centroid,
			bbox: cluster.bbox,
			silhouette,
			samplePoints: sample,
			params: {
				epsilonKm: args.epsilonKm,
				minPts: args.minPts,
				algo: "dbscan",
			},
			createdAt: now,
		});
	}

	return {
		snapshotId,
		clustersFound: stats.length,
		points: points.length,
		silhouette,
	};
}

/**
 * Cron évaluateur : recalcule les enclaves pour chaque organisme
 * intelligence_agency actif (sans filtre pays — passe globale).
 */
export const recomputeAllEnclaves = internalMutation({
	args: {},
	handler: async (ctx) => {
		const orgs = await ctx.db
			.query("orgs")
			.withIndex("by_active_notDeleted", (q) =>
				q.eq("isActive", true).eq("deletedAt", undefined),
			)
			.collect();

		const intelOrgs = orgs.filter(
			(o) => o.type === OrganizationType.IntelligenceAgency,
		);

		const results: Array<{
			orgId: string;
			snapshotId: string | null;
			clustersFound: number;
			points: number;
		}> = [];

		for (const org of intelOrgs) {
			const r = await runEnclaveComputation(ctx, {
				orgId: org._id,
				epsilonKm: 2,
				minPts: 5,
			});
			results.push({
				orgId: org._id,
				snapshotId: r.snapshotId,
				clustersFound: r.clustersFound,
				points: r.points,
			});
		}

		return { processedOrgs: intelOrgs.length, results };
	},
});
