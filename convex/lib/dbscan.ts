/**
 * Implémentation DBSCAN minimale pour le clustering géospatial.
 *
 * Pure JS — pas de dépendance externe. Limite : O(n²) sur le nombre de
 * points (suffisant pour les volumes diaspora attendus, < 50k profils
 * géolocalisés). Pour aller au-delà, prévoir un index spatial (R-tree).
 */

export interface GeoPoint {
	lat: number;
	lng: number;
	id?: string;
}

interface DBSCANOptions {
	/** Rayon de voisinage en kilomètres. */
	epsilonKm: number;
	/** Nombre minimum de points pour former un cluster. */
	minPts: number;
}

const NOISE = -1;
const UNCLASSIFIED = 0;

/**
 * Distance en km entre deux points GPS (formule de Haversine).
 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
	const R = 6371; // rayon Terre en km
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);
	const sinDLat = Math.sin(dLat / 2);
	const sinDLng = Math.sin(dLng / 2);
	const h =
		sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function regionQuery(
	points: GeoPoint[],
	pIdx: number,
	epsilonKm: number,
): number[] {
	const out: number[] = [];
	const p = points[pIdx];
	for (let i = 0; i < points.length; i++) {
		if (i === pIdx) continue;
		if (haversineKm(p, points[i]) <= epsilonKm) out.push(i);
	}
	return out;
}

/**
 * Clustering DBSCAN. Retourne un tableau de même taille que `points`,
 * où chaque entrée est l'index du cluster (≥ 1) ou -1 (bruit).
 */
export function dbscan(points: GeoPoint[], opts: DBSCANOptions): number[] {
	const labels = new Array(points.length).fill(UNCLASSIFIED) as number[];
	let clusterId = 0;

	for (let i = 0; i < points.length; i++) {
		if (labels[i] !== UNCLASSIFIED) continue;

		const neighbors = regionQuery(points, i, opts.epsilonKm);
		if (neighbors.length < opts.minPts - 1) {
			labels[i] = NOISE;
			continue;
		}

		clusterId += 1;
		labels[i] = clusterId;

		const queue = [...neighbors];
		while (queue.length > 0) {
			const j = queue.shift()!;
			if (labels[j] === NOISE) labels[j] = clusterId;
			if (labels[j] !== UNCLASSIFIED) continue;

			labels[j] = clusterId;
			const nbN = regionQuery(points, j, opts.epsilonKm);
			if (nbN.length >= opts.minPts - 1) {
				for (const k of nbN) queue.push(k);
			}
		}
	}

	return labels;
}

/**
 * Calcule le score de silhouette moyen d'un clustering. Implémentation
 * simplifiée O(n²). Retourne ∈ [-1, 1] ; > 0.5 = clustering bien défini.
 */
export function meanSilhouette(
	points: GeoPoint[],
	labels: number[],
): number {
	const n = points.length;
	if (n < 2) return 0;

	const clusters = new Map<number, number[]>();
	for (let i = 0; i < n; i++) {
		const c = labels[i];
		if (c <= 0) continue;
		if (!clusters.has(c)) clusters.set(c, []);
		clusters.get(c)!.push(i);
	}
	if (clusters.size < 2) return 0;

	const scores: number[] = [];
	for (let i = 0; i < n; i++) {
		const ci = labels[i];
		if (ci <= 0) continue;

		const sameCluster = clusters.get(ci)!;
		if (sameCluster.length < 2) continue;

		let aSum = 0;
		for (const j of sameCluster) {
			if (j === i) continue;
			aSum += haversineKm(points[i], points[j]);
		}
		const a = aSum / (sameCluster.length - 1);

		let b = Number.POSITIVE_INFINITY;
		for (const [other, members] of clusters) {
			if (other === ci) continue;
			let sum = 0;
			for (const j of members) sum += haversineKm(points[i], points[j]);
			const avg = sum / members.length;
			if (avg < b) b = avg;
		}

		const denom = Math.max(a, b);
		scores.push(denom > 0 ? (b - a) / denom : 0);
	}

	if (scores.length === 0) return 0;
	const sum = scores.reduce((acc, x) => acc + x, 0);
	return sum / scores.length;
}

export interface ClusterStats {
	clusterIndex: number;
	size: number;
	centroid: { lat: number; lng: number };
	bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
	pointIndices: number[];
}

export function computeClusterStats(
	points: GeoPoint[],
	labels: number[],
): ClusterStats[] {
	const groups = new Map<number, number[]>();
	for (let i = 0; i < points.length; i++) {
		const c = labels[i];
		if (c <= 0) continue;
		if (!groups.has(c)) groups.set(c, []);
		groups.get(c)!.push(i);
	}

	const out: ClusterStats[] = [];
	for (const [clusterIndex, indices] of groups) {
		let sumLat = 0;
		let sumLng = 0;
		let minLat = Number.POSITIVE_INFINITY;
		let maxLat = Number.NEGATIVE_INFINITY;
		let minLng = Number.POSITIVE_INFINITY;
		let maxLng = Number.NEGATIVE_INFINITY;
		for (const i of indices) {
			const p = points[i];
			sumLat += p.lat;
			sumLng += p.lng;
			if (p.lat < minLat) minLat = p.lat;
			if (p.lat > maxLat) maxLat = p.lat;
			if (p.lng < minLng) minLng = p.lng;
			if (p.lng > maxLng) maxLng = p.lng;
		}
		out.push({
			clusterIndex,
			size: indices.length,
			centroid: { lat: sumLat / indices.length, lng: sumLng / indices.length },
			bbox: { minLat, maxLat, minLng, maxLng },
			pointIndices: indices,
		});
	}

	return out;
}
