/**
 * Graphe de relations — exploration multi-sauts pour le module
 * Renseignement souverain.
 *
 * `traverseGraph` : BFS depuis une racine, profondeur limitée à 4 et
 * maximum 200 nœuds retournés. Plein scan des liens de l'org en mémoire
 * (acceptable jusqu'à ~10 000 liens). Pour aller au-delà, prévoir un
 * index `(orgId, fromTargetType, fromTargetId)`.
 *
 * `findShortestPath` : Dijkstra pondéré par strength (strong=1, medium=2,
 * weak=4). Retourne la séquence de nœuds + arêtes traversées.
 */

import { v } from "convex/values";
import { authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { assertCallerIsIntelAgency } from "../lib/intelligenceAgencyVisibility";

const targetTypeValidator = v.union(
	v.literal("profile"),
	v.literal("child_profile"),
	v.literal("diplomatic_target"),
	v.literal("agent"),
);

const MAX_DEPTH = 4;
const MAX_NODES = 200;

const STRENGTH_WEIGHT: Record<string, number> = {
	strong: 1,
	medium: 2,
	weak: 4,
};

interface GraphLink {
	_id: string;
	fromTargetType: string;
	fromTargetId: string;
	toTargetType: string;
	toTargetId: string;
	relationship: string;
	strength?: string;
	verified?: string;
}

interface GraphNode {
	type: string;
	id: string;
	depth: number;
}

interface GraphEdge {
	linkId: string;
	from: { type: string; id: string };
	to: { type: string; id: string };
	relationship: string;
	strength?: string;
	verified?: string;
}

function nodeKey(type: string, id: string): string {
	return `${type}#${id}`;
}

async function loadOrgLinks(ctx: { db: any }, orgId: string): Promise<GraphLink[]> {
	const links = await ctx.db
		.query("intelligenceLinks")
		.withIndex("by_org", (q: any) => q.eq("orgId", orgId))
		.take(5000);
	return links
		.filter((l: any) => l.deletedAt === undefined)
		.map((l: any) => ({
			_id: l._id,
			fromTargetType: l.fromTargetType,
			fromTargetId: l.fromTargetId,
			toTargetType: l.toTargetType,
			toTargetId: l.toTargetId,
			relationship: l.relationship,
			strength: l.strength,
			verified: l.verified,
		}));
}

export const traverseGraph = authQuery({
	args: {
		orgId: v.id("orgs"),
		rootType: targetTypeValidator,
		rootId: v.string(),
		depth: v.optional(v.number()),
		relationshipFilter: v.optional(
			v.array(
				v.union(
					v.literal("family"),
					v.literal("business"),
					v.literal("friendship"),
					v.literal("mentor"),
					v.literal("suspect"),
					v.literal("accomplice"),
					v.literal("contact"),
					v.literal("other"),
				),
			),
		),
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

		const depth = Math.min(args.depth ?? 2, MAX_DEPTH);
		const links = await loadOrgLinks(ctx, args.orgId);
		const filterSet = args.relationshipFilter
			? new Set(args.relationshipFilter)
			: null;

		// Index lookup : nodeKey -> liens incidents
		const adjacency = new Map<string, GraphLink[]>();
		for (const l of links) {
			if (filterSet && !filterSet.has(l.relationship as never)) continue;
			const a = nodeKey(l.fromTargetType, l.fromTargetId);
			const b = nodeKey(l.toTargetType, l.toTargetId);
			if (!adjacency.has(a)) adjacency.set(a, []);
			if (!adjacency.has(b)) adjacency.set(b, []);
			adjacency.get(a)!.push(l);
			adjacency.get(b)!.push(l);
		}

		// BFS
		const rootKey = nodeKey(args.rootType, args.rootId);
		const visited = new Set<string>([rootKey]);
		const nodes: GraphNode[] = [
			{ type: args.rootType, id: args.rootId, depth: 0 },
		];
		const edges: GraphEdge[] = [];
		const queue: Array<{ key: string; depth: number }> = [
			{ key: rootKey, depth: 0 },
		];

		while (queue.length > 0 && nodes.length < MAX_NODES) {
			const cur = queue.shift()!;
			if (cur.depth >= depth) continue;

			const incident = adjacency.get(cur.key) ?? [];
			for (const l of incident) {
				const aKey = nodeKey(l.fromTargetType, l.fromTargetId);
				const bKey = nodeKey(l.toTargetType, l.toTargetId);
				const otherKey = aKey === cur.key ? bKey : aKey;
				const other =
					aKey === cur.key
						? { type: l.toTargetType, id: l.toTargetId }
						: { type: l.fromTargetType, id: l.fromTargetId };

				edges.push({
					linkId: l._id,
					from: { type: l.fromTargetType, id: l.fromTargetId },
					to: { type: l.toTargetType, id: l.toTargetId },
					relationship: l.relationship,
					strength: l.strength,
					verified: l.verified,
				});

				if (!visited.has(otherKey)) {
					visited.add(otherKey);
					nodes.push({ ...other, depth: cur.depth + 1 });
					queue.push({ key: otherKey, depth: cur.depth + 1 });
					if (nodes.length >= MAX_NODES) break;
				}
			}
		}

		return {
			rootKey,
			depth,
			nodeCount: nodes.length,
			edgeCount: edges.length,
			truncated: nodes.length >= MAX_NODES,
			nodes,
			edges,
		};
	},
});

export const findShortestPath = authQuery({
	args: {
		orgId: v.id("orgs"),
		fromType: targetTypeValidator,
		fromId: v.string(),
		toType: targetTypeValidator,
		toId: v.string(),
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

		const links = await loadOrgLinks(ctx, args.orgId);

		// Construire le graphe pondéré
		const adjacency = new Map<
			string,
			Array<{ neighborKey: string; weight: number; link: GraphLink }>
		>();
		for (const l of links) {
			const w = STRENGTH_WEIGHT[l.strength ?? "medium"] ?? 2;
			const a = nodeKey(l.fromTargetType, l.fromTargetId);
			const b = nodeKey(l.toTargetType, l.toTargetId);
			if (!adjacency.has(a)) adjacency.set(a, []);
			if (!adjacency.has(b)) adjacency.set(b, []);
			adjacency.get(a)!.push({ neighborKey: b, weight: w, link: l });
			adjacency.get(b)!.push({ neighborKey: a, weight: w, link: l });
		}

		const fromKey = nodeKey(args.fromType, args.fromId);
		const toKey = nodeKey(args.toType, args.toId);

		if (fromKey === toKey) {
			return { found: true, path: [], totalWeight: 0 };
		}
		if (!adjacency.has(fromKey) || !adjacency.has(toKey)) {
			return { found: false, path: [], totalWeight: 0 };
		}

		// Dijkstra simple (priority queue naïve — suffisant ≤ 5000 nœuds)
		const dist = new Map<string, number>();
		const prev = new Map<string, { key: string; link: GraphLink } | null>();
		dist.set(fromKey, 0);
		prev.set(fromKey, null);

		const queue = new Set<string>([fromKey]);

		while (queue.size > 0) {
			let bestKey: string | null = null;
			let bestDist = Number.POSITIVE_INFINITY;
			for (const k of queue) {
				const d = dist.get(k) ?? Number.POSITIVE_INFINITY;
				if (d < bestDist) {
					bestDist = d;
					bestKey = k;
				}
			}
			if (!bestKey) break;
			queue.delete(bestKey);
			if (bestKey === toKey) break;

			const neighbors = adjacency.get(bestKey) ?? [];
			for (const { neighborKey, weight, link } of neighbors) {
				const alt = bestDist + weight;
				const cur = dist.get(neighborKey) ?? Number.POSITIVE_INFINITY;
				if (alt < cur) {
					dist.set(neighborKey, alt);
					prev.set(neighborKey, { key: bestKey, link });
					queue.add(neighborKey);
				}
			}
		}

		if (!dist.has(toKey)) {
			return { found: false, path: [], totalWeight: 0 };
		}

		// Reconstruction du chemin
		const path: Array<{
			node: { type: string; id: string };
			incomingLinkId?: string;
			incomingRelationship?: string;
			incomingStrength?: string;
		}> = [];
		let cursor: string | null = toKey;
		while (cursor) {
			const [type, id] = cursor.split("#");
			const p = prev.get(cursor);
			path.unshift({
				node: { type, id },
				incomingLinkId: p?.link._id,
				incomingRelationship: p?.link.relationship,
				incomingStrength: p?.link.strength,
			});
			cursor = p?.key ?? null;
		}

		return {
			found: true,
			path,
			totalWeight: dist.get(toKey) ?? 0,
		};
	},
});
