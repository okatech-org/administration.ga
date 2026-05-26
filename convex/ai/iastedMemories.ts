/**
 * iAsted Memories — CRUD de la mémoire long-terme per-user (Hippocampe).
 *
 * Sprint 3 (Ronde 3) — module dédié pour la lecture/écriture des souvenirs
 * persistants de l'agent vocal. Consommé par :
 *   - `iastedRealtimePrompt.buildPrompt` : injection des mémoires récentes
 *     + callbacks dus dans le bloc dynamique du prompt.
 *   - `realtimeToolExecutor` : dispatchers `set_callback` et `remember_this`.
 *   - Client `use-iasted-host.ts` : `writeSessionContext` à la fin de chaque
 *     session pour permettre la salutation contextualisée au prochain login.
 *
 * Schema : voir `convex/schemas/iastedMemories.ts` (table `iastedMemories`).
 */

import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

// Bornes pour borner la taille du contexte injecté dans le prompt.
const MAX_CONTEXT_LEN = 400;
const MAX_RECENT_MEMORIES = 8;
const MAX_DUE_CALLBACKS_SHOWN = 5;
const MAX_USER_MEMORIES = 200; // soft cap pour éviter l'inflation

const CATEGORY = v.union(
	v.literal("context"),
	v.literal("preference"),
	v.literal("callback"),
	v.literal("relation"),
);

function clampContent(input: string, label: string): string {
	const trimmed = input.trim();
	if (!trimmed) {
		throw new ConvexError(`${label} : valeur vide non autorisée.`);
	}
	if (trimmed.length > MAX_CONTEXT_LEN) {
		throw new ConvexError(
			`${label} : longueur max ${MAX_CONTEXT_LEN} caractères dépassée.`,
		);
	}
	return trimmed;
}

// ─────────────────────────────────────────────────────────────
// Internal — utilisés par le prompt builder + tool executor
// ─────────────────────────────────────────────────────────────

/**
 * Récupère les mémoires actives (non-archivées) les plus pertinentes pour
 * la construction du prompt. Ordonné par recency + confidence.
 */
export const readRecentForPrompt = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		const rows = await ctx.db
			.query("iastedMemories")
			.withIndex("by_user_archived", (q) =>
				q.eq("userId", userId).eq("archived", false),
			)
			.collect();
		// Tri composite : confidence DESC × recency DESC.
		// (Convex ne supporte pas les ordres composites natifs, on trie en RAM.)
		rows.sort((a, b) => {
			const scoreA = a.confidence * 100 + (a.lastAccessedAt / 1e10);
			const scoreB = b.confidence * 100 + (b.lastAccessedAt / 1e10);
			return scoreB - scoreA;
		});
		// Sépare callbacks dus des autres mémoires (les callbacks dus passent
		// en priorité au prompt, peu importe leur confidence).
		const now = Date.now();
		const dueCallbacks = rows
			.filter((r) => r.category === "callback" && r.dueAt && r.dueAt <= now)
			.slice(0, MAX_DUE_CALLBACKS_SHOWN);
		const otherMemories = rows
			.filter((r) => !(r.category === "callback" && r.dueAt && r.dueAt <= now))
			.slice(0, MAX_RECENT_MEMORIES);
		return { dueCallbacks, otherMemories };
	},
});

/**
 * Écrit une mémoire (toutes catégories). Utilisé par les tool dispatchers
 * et par `writeSessionContext`. Idempotent par défaut : si une mémoire
 * identique (mêmes user+category+content) existe déjà non-archivée, on
 * la patch (lastAccessedAt + boost confidence) au lieu d'en créer une
 * nouvelle. Cap dur à `MAX_USER_MEMORIES` pour borner la DB.
 */
export const writeMemoryInternal = internalMutation({
	args: {
		userId: v.id("users"),
		category: CATEGORY,
		content: v.string(),
		dueAt: v.optional(v.number()),
		relatedUserId: v.optional(v.id("users")),
		confidence: v.optional(v.number()),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, args) => {
		const content = clampContent(args.content, "Mémoire");
		const now = Date.now();
		// Cherche un duplicate exact (idempotence).
		const dupes = await ctx.db
			.query("iastedMemories")
			.withIndex("by_user_category", (q) =>
				q.eq("userId", args.userId).eq("category", args.category),
			)
			.collect();
		const exact = dupes.find(
			(r) => !r.archived && r.content === content,
		);
		if (exact) {
			await ctx.db.patch(exact._id, {
				lastAccessedAt: now,
				confidence: Math.min(1, (exact.confidence ?? 0.5) + 0.05),
				...(args.dueAt !== undefined ? { dueAt: args.dueAt } : {}),
				...(args.metadata !== undefined ? { metadata: args.metadata } : {}),
			});
			return exact._id;
		}
		// Cap dur — supprime la plus vieille mémoire si on dépasse la limite.
		const allActive = dupes.filter((r) => !r.archived);
		if (allActive.length >= MAX_USER_MEMORIES) {
			const totalActive = await ctx.db
				.query("iastedMemories")
				.withIndex("by_user_archived", (q) =>
					q.eq("userId", args.userId).eq("archived", false),
				)
				.collect();
			totalActive.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);
			if (totalActive.length >= MAX_USER_MEMORIES && totalActive[0]) {
				await ctx.db.patch(totalActive[0]._id, { archived: true });
			}
		}
		return await ctx.db.insert("iastedMemories", {
			userId: args.userId,
			category: args.category,
			content,
			dueAt: args.dueAt,
			relatedUserId: args.relatedUserId,
			confidence: args.confidence ?? 0.7,
			metadata: args.metadata,
			createdAt: now,
			lastAccessedAt: now,
			archived: false,
		});
	},
});

// ─────────────────────────────────────────────────────────────
// Public — exposé aux clients (UI Réglages + tools indirectement)
// ─────────────────────────────────────────────────────────────

/** Liste les mémoires de l'utilisateur courant (UI Réglages). */
export const listMyMemories = query({
	args: { includeArchived: v.optional(v.boolean()) },
	handler: async (ctx, { includeArchived }) => {
		const user = await requireAuth(ctx);
		const rows = await ctx.db
			.query("iastedMemories")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		const filtered = includeArchived === true
			? rows
			: rows.filter((r) => !r.archived);
		return filtered.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
	},
});

/** Archive une mémoire (soft delete réversible). */
export const archiveMyMemory = mutation({
	args: { id: v.id("iastedMemories") },
	handler: async (ctx, { id }) => {
		const user = await requireAuth(ctx);
		const row = await ctx.db.get(id);
		if (!row) throw new ConvexError("Mémoire introuvable.");
		if (row.userId !== user._id) {
			throw new ConvexError("Vous ne pouvez archiver que vos propres mémoires.");
		}
		await ctx.db.patch(id, { archived: true });
	},
});

/**
 * Désarchive une mémoire archivée précédemment (réversibilité du soft delete).
 */
export const restoreMyMemory = mutation({
	args: { id: v.id("iastedMemories") },
	handler: async (ctx, { id }) => {
		const user = await requireAuth(ctx);
		const row = await ctx.db.get(id);
		if (!row) throw new ConvexError("Mémoire introuvable.");
		if (row.userId !== user._id) {
			throw new ConvexError("Vous ne pouvez restaurer que vos propres mémoires.");
		}
		await ctx.db.patch(id, { archived: false, lastAccessedAt: Date.now() });
	},
});

/**
 * Écrit un context de fin de session — appelé par le client après chaque
 * session vocale. Limité à `context` ou `preference` pour la sécurité
 * (un tool `set_callback` séparé existe pour les callbacks).
 */
export const writeSessionContext = mutation({
	args: {
		content: v.string(),
		metadata: v.optional(v.any()),
	},
	handler: async (ctx, { content, metadata }) => {
		const user = await requireAuth(ctx);
		const clamped = clampContent(content, "Contexte de session");
		const now = Date.now();
		// Le client ne peut écrire qu'en `context` via ce point d'entrée.
		// Idempotence : voir writeMemoryInternal.
		const dupes = await ctx.db
			.query("iastedMemories")
			.withIndex("by_user_category", (q) =>
				q.eq("userId", user._id).eq("category", "context"),
			)
			.collect();
		const exact = dupes.find((r) => !r.archived && r.content === clamped);
		if (exact) {
			await ctx.db.patch(exact._id, {
				lastAccessedAt: now,
				confidence: Math.min(1, (exact.confidence ?? 0.5) + 0.05),
				...(metadata !== undefined ? { metadata } : {}),
			});
			return exact._id;
		}
		return await ctx.db.insert("iastedMemories", {
			userId: user._id,
			category: "context",
			content: clamped,
			confidence: 0.7,
			metadata,
			createdAt: now,
			lastAccessedAt: now,
			archived: false,
		});
	},
});

// ─────────────────────────────────────────────────────────────
// Cron — surfacing des callbacks dus
// ─────────────────────────────────────────────────────────────

/**
 * Marque les callbacks dus du jour avec un `metadata.surfaced=true`.
 * Le prompt builder peut alors les présenter en haut du bloc mémoire.
 * Pas de push notif ici — on garde une approche pull (l'utilisateur
 * verra le rappel à sa prochaine session vocale).
 */
export const sweepDueCallbacksInternal = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		// Pas d'index croisé (userId × dueAt) sur tous users — on scan large.
		// À optimiser si la table dépasse 10k rows.
		const rows = await ctx.db
			.query("iastedMemories")
			.collect();
		let surfaced = 0;
		for (const r of rows) {
			if (r.archived) continue;
			if (r.category !== "callback") continue;
			if (!r.dueAt || r.dueAt > now) continue;
			const meta = (r.metadata as Record<string, unknown> | undefined) ?? {};
			if (meta.surfaced === true) continue;
			await ctx.db.patch(r._id, {
				metadata: { ...meta, surfaced: true, surfacedAt: now },
			});
			surfaced++;
		}
		return { surfaced };
	},
});
