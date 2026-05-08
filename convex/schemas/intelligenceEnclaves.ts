import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Snapshots GEOINT — clusters de profils diaspora détectés par DBSCAN
 * sur les coordonnées GPS de résidence.
 *
 * Recalculés périodiquement (cron `recompute-intelligence-enclaves`).
 * Chaque ligne représente UN cluster identifié à un moment donné — pour
 * un nouvel snapshot, on insère N lignes (une par cluster) tagguées avec
 * le même `snapshotId`.
 */
export const intelligenceEnclavesTable = defineTable({
	orgId: v.id("orgs"),
	snapshotId: v.string(), // ID du snapshot (timestamp + nonce)

	// Filtrage utilisé pour ce snapshot
	country: v.optional(v.string()),
	sector: v.optional(v.string()),

	// Identifiant logique du cluster dans le snapshot
	clusterIndex: v.number(),

	// Statistiques du cluster
	size: v.number(), // nb de points
	centroid: v.object({ lat: v.number(), lng: v.number() }),
	bbox: v.object({
		minLat: v.number(),
		maxLat: v.number(),
		minLng: v.number(),
		maxLng: v.number(),
	}),

	// Score de silhouette (qualité du clustering, ∈ [-1, 1])
	silhouette: v.optional(v.number()),

	// Sample des points (max 100) pour debug / tooltip
	samplePoints: v.optional(
		v.array(v.object({ lat: v.number(), lng: v.number() })),
	),

	// Paramètres DBSCAN utilisés
	params: v.object({
		epsilonKm: v.number(),
		minPts: v.number(),
		algo: v.literal("dbscan"),
	}),

	createdAt: v.number(),
})
	.index("by_org_snapshot", ["orgId", "snapshotId"])
	.index("by_org_created", ["orgId", "createdAt"]);
