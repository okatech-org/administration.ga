/**
 * voicePrints — CRUD des empreintes vocales per-user (Sprint 5.5).
 *
 * Voice biometric SOFT — facteur additionnel optionnel pour actions sensibles.
 * Pas un remplacement de l'auth primaire. L'utilisateur peut toujours utiliser
 * la phrase challenge (Sprint 5.G4) si son voiceprint ne match pas ou n'est
 * pas enrollé.
 *
 * Algorithme de comparaison : cosine similarity entre deux Float32Array
 * (features MFCC-like extraits côté browser, voir
 * `packages/iasted/src/lib/voice-print.ts`). Seuil par défaut 0.7.
 *
 * Privacy : pas d'audio brut stocké, uniquement le vecteur de features
 * (irréversible). Révocable à tout moment via `revokeMyVoicePrint`.
 */

import { ConvexError, v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

const ALGORITHM_VERSION = "browser-mfcc-v1";
const MATCH_THRESHOLD = 0.7;
const MAX_PRINTS_PER_USER = 3;
const PRINT_VALIDITY_MS = 6 * 30 * 24 * 60 * 60 * 1000; // 6 mois

// ─────────────────────────────────────────────────────────────
// Décodage base64 → Float32Array (utilisé côté server pour le compare)
// ─────────────────────────────────────────────────────────────

function decodeEmbedding(b64: string): Float32Array {
	// Decode base64 → Uint8Array → Float32Array (LE — convention WebAudio).
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new Float32Array(bytes.buffer);
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
	if (a.length !== b.length || a.length === 0) return 0;
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		const ai = a[i] ?? 0;
		const bi = b[i] ?? 0;
		dot += ai * bi;
		normA += ai * ai;
		normB += bi * bi;
	}
	const denom = Math.sqrt(normA) * Math.sqrt(normB);
	return denom === 0 ? 0 : dot / denom;
}

// ─────────────────────────────────────────────────────────────
// Public — UI Réglages
// ─────────────────────────────────────────────────────────────

/** Liste les voiceprints de l'utilisateur (UI Réglages — Sécurité). */
export const listMyVoicePrints = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireAuth(ctx);
		const rows = await ctx.db
			.query("userVoicePrints")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		return rows.map((r) => ({
			_id: r._id,
			algorithm: r.algorithm,
			createdAt: r.createdAt,
			lastMatchedAt: r.lastMatchedAt,
			matchCount: r.matchCount,
			revoked: r.revoked,
			expiresAt: r.createdAt + PRINT_VALIDITY_MS,
		}));
	},
});

/**
 * Enregistre un nouveau voiceprint. Cap dur à 3 par user — au-delà, on
 * archive (revoked=true) la plus ancienne pour faire de la place. À
 * appeler après consentement explicite de l'utilisateur (modale dédiée
 * dans Réglages > Sécurité).
 */
export const enrollMyVoicePrint = mutation({
	args: {
		embeddingB64: v.string(),
	},
	handler: async (ctx, { embeddingB64 }) => {
		const user = await requireAuth(ctx);
		// Validation taille (16 floats × 4 B → base64 ~88 chars, jusqu'à 32
		// floats → ~176 chars). On accepte 60-300 chars pour absorber
		// d'éventuelles variantes d'algo.
		if (embeddingB64.length < 60 || embeddingB64.length > 600) {
			throw new ConvexError(
				`Empreinte invalide (taille ${embeddingB64.length} hors plage 60-600).`,
			);
		}
		const existing = await ctx.db
			.query("userVoicePrints")
			.withIndex("by_user_revoked", (q) =>
				q.eq("userId", user._id).eq("revoked", false),
			)
			.collect();
		if (existing.length >= MAX_PRINTS_PER_USER) {
			// Archive la plus ancienne pour libérer la place.
			existing.sort((a, b) => a.createdAt - b.createdAt);
			if (existing[0]) {
				await ctx.db.patch(existing[0]._id, { revoked: true });
			}
		}
		const now = Date.now();
		return await ctx.db.insert("userVoicePrints", {
			userId: user._id,
			embeddingB64,
			algorithm: ALGORITHM_VERSION,
			createdAt: now,
			matchCount: 0,
			revoked: false,
		});
	},
});

/**
 * Vérifie si une empreinte courante matche au moins une empreinte enrollée
 * (cosine ≥ MATCH_THRESHOLD). Retourne `{ matched, score }`.
 *
 * Note : exposé en MUTATION (pas query) car on patch `lastMatchedAt` +
 * `matchCount` du voiceprint le mieux scoré pour le monitoring.
 */
export const verifyMyVoicePrint = mutation({
	args: {
		candidateB64: v.string(),
	},
	handler: async (ctx, { candidateB64 }) => {
		const user = await requireAuth(ctx);
		const prints = await ctx.db
			.query("userVoicePrints")
			.withIndex("by_user_revoked", (q) =>
				q.eq("userId", user._id).eq("revoked", false),
			)
			.collect();
		if (prints.length === 0) {
			return { matched: false, score: 0, reason: "NO_ENROLLMENT" };
		}
		let candidate: Float32Array;
		try {
			candidate = decodeEmbedding(candidateB64);
		} catch {
			return { matched: false, score: 0, reason: "INVALID_CANDIDATE" };
		}
		const now = Date.now();
		let bestScore = 0;
		let bestId: typeof prints[number]["_id"] | null = null;
		for (const p of prints) {
			// Skip empreintes expirées.
			if (now > p.createdAt + PRINT_VALIDITY_MS) continue;
			try {
				const ref = decodeEmbedding(p.embeddingB64);
				const score = cosineSimilarity(candidate, ref);
				if (score > bestScore) {
					bestScore = score;
					bestId = p._id;
				}
			} catch {
				// Empreinte stockée corrompue — ignore.
			}
		}
		const matched = bestScore >= MATCH_THRESHOLD;
		if (matched && bestId) {
			const best = prints.find((p) => p._id === bestId);
			if (best) {
				await ctx.db.patch(best._id, {
					lastMatchedAt: now,
					matchCount: (best.matchCount ?? 0) + 1,
				});
			}
		}
		return {
			matched,
			score: bestScore,
			threshold: MATCH_THRESHOLD,
			reason: matched ? null : bestScore > 0 ? "BELOW_THRESHOLD" : "NO_MATCH",
		};
	},
});

/** Révoque une empreinte (l'utilisateur peut révoquer ses propres prints). */
export const revokeMyVoicePrint = mutation({
	args: { id: v.id("userVoicePrints") },
	handler: async (ctx, { id }) => {
		const user = await requireAuth(ctx);
		const row = await ctx.db.get(id);
		if (!row) throw new ConvexError("Empreinte introuvable.");
		if (row.userId !== user._id) {
			throw new ConvexError("Vous ne pouvez révoquer que vos propres empreintes.");
		}
		await ctx.db.patch(id, { revoked: true });
	},
});

// ─────────────────────────────────────────────────────────────
// Internal — utilisé par le realtimeToolExecutor pour les actions sensibles
// ─────────────────────────────────────────────────────────────

/**
 * Détecte si l'utilisateur a déjà des empreintes enrollées (pour décider
 * si on demande la vérification voiceprint en plus de la challenge phrase).
 */
export const hasEnrolledPrintsInternal = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		const prints = await ctx.db
			.query("userVoicePrints")
			.withIndex("by_user_revoked", (q) =>
				q.eq("userId", userId).eq("revoked", false),
			)
			.first();
		return prints !== null;
	},
});

/**
 * Vérifie un voiceprint candidat pour un user donné depuis un contexte
 * internal (utilisé par realtimeToolExecutor pour l'enforcement des
 * actions destructives — Sprint 5.5 wiring).
 *
 * Pas de patch DB ici (pas d'update lastMatchedAt) — c'est purement
 * read-only. L'update est laissée à la mutation publique `verifyMyVoicePrint`.
 */
export const verifyPrintForUserInternal = internalQuery({
	args: {
		userId: v.id("users"),
		candidateB64: v.string(),
	},
	handler: async (ctx, { userId, candidateB64 }) => {
		const prints = await ctx.db
			.query("userVoicePrints")
			.withIndex("by_user_revoked", (q) =>
				q.eq("userId", userId).eq("revoked", false),
			)
			.collect();
		if (prints.length === 0) {
			return { matched: false, score: 0, reason: "NO_ENROLLMENT" };
		}
		let candidate: Float32Array;
		try {
			candidate = decodeEmbedding(candidateB64);
		} catch {
			return { matched: false, score: 0, reason: "INVALID_CANDIDATE" };
		}
		const now = Date.now();
		let bestScore = 0;
		for (const p of prints) {
			if (now > p.createdAt + PRINT_VALIDITY_MS) continue;
			try {
				const ref = decodeEmbedding(p.embeddingB64);
				const score = cosineSimilarity(candidate, ref);
				if (score > bestScore) bestScore = score;
			} catch {
				/* corrompue */
			}
		}
		return {
			matched: bestScore >= MATCH_THRESHOLD,
			score: bestScore,
			threshold: MATCH_THRESHOLD,
			reason:
				bestScore >= MATCH_THRESHOLD
					? null
					: bestScore > 0
						? "BELOW_THRESHOLD"
						: "NO_MATCH",
		};
	},
});
