/**
 * iastedConversations — Persistance unifiée vocal ↔ texte (Sprint 7).
 *
 * API publique :
 *   - `appendMessage` : ajoute un message dans la conversation courante du
 *     user (créé si absent). Cap à 50 messages (truncate des plus anciens).
 *   - `getMyRecentConversation` : lecture client (iChat reprend où le vocal
 *     s'est arrêté, et vice-versa).
 *   - `archiveMyConversation` : ferme la conversation courante (UI Réglages).
 *
 * API internal :
 *   - `getRecentForPromptInternal` : utilisé par `iastedRealtimePrompt.buildPrompt`
 *     pour injecter les N derniers messages d'une conversation < 1h dans le
 *     bloc dynamique du prompt (continuité < 1h).
 */

import { ConvexError, v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

const MAX_MESSAGES = 50;
const MAX_CONTENT_LEN = 4_000;
const RECENT_WINDOW_MS = 60 * 60 * 1_000; // 1h
const PROMPT_RECENT_MESSAGES = 8;

// ─────────────────────────────────────────────────────────────
// Mutation publique — appendMessage (client vocal OU client texte)
// ─────────────────────────────────────────────────────────────

const SURFACE = v.union(
	v.literal("agent"),
	v.literal("backoffice"),
	v.literal("citizen"),
);
const MODE = v.union(v.literal("voice"), v.literal("text"));

export const appendMessage = mutation({
	args: {
		role: v.union(v.literal("user"), v.literal("assistant")),
		content: v.string(),
		mode: MODE,
		surface: SURFACE,
		orgId: v.optional(v.id("orgs")),
	},
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const content = args.content.trim();
		if (!content) throw new ConvexError("Message vide.");
		const clamped =
			content.length > MAX_CONTENT_LEN
				? content.slice(0, MAX_CONTENT_LEN) + "…"
				: content;
		const now = Date.now();

		// Reprise : si une conversation < 1h existe pour ce user, on l'allonge.
		// Sinon on en crée une nouvelle.
		const recent = await ctx.db
			.query("iastedConversations")
			.withIndex("by_user_activity", (q) => q.eq("userId", user._id))
			.order("desc")
			.first();

		const isReusable =
			recent !== null &&
			now - recent.lastActivityAt < RECENT_WINDOW_MS;

		if (isReusable && recent) {
			const messages = [
				...recent.messages,
				{ role: args.role, content: clamped, mode: args.mode, ts: now },
			];
			// Cap dur 50 — truncate les plus anciens si dépassement.
			const truncated =
				messages.length > MAX_MESSAGES
					? messages.slice(messages.length - MAX_MESSAGES)
					: messages;
			const newLastMode: "voice" | "text" | "mixed" =
				recent.lastMode === args.mode ? args.mode : "mixed";
			await ctx.db.patch(recent._id, {
				messages: truncated,
				lastActivityAt: now,
				lastMode: newLastMode,
			});
			return recent._id;
		}

		return await ctx.db.insert("iastedConversations", {
			userId: user._id,
			lastMode: args.mode,
			messages: [
				{ role: args.role, content: clamped, mode: args.mode, ts: now },
			],
			surface: args.surface,
			orgId: args.orgId,
			createdAt: now,
			lastActivityAt: now,
		});
	},
});

// ─────────────────────────────────────────────────────────────
// Query publique — UI iChat lit la conversation courante
// ─────────────────────────────────────────────────────────────

/** Retourne la conversation < 1h ou null. */
export const getMyRecentConversation = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireAuth(ctx);
		const recent = await ctx.db
			.query("iastedConversations")
			.withIndex("by_user_activity", (q) => q.eq("userId", user._id))
			.order("desc")
			.first();
		if (!recent) return null;
		const now = Date.now();
		if (now - recent.lastActivityAt > RECENT_WINDOW_MS) return null;
		return recent;
	},
});

/** Archive la conversation courante (l'utilisateur clique « nouvelle conv »). */
export const archiveMyConversation = mutation({
	args: { id: v.id("iastedConversations") },
	handler: async (ctx, { id }) => {
		const user = await requireAuth(ctx);
		const row = await ctx.db.get(id);
		if (!row) throw new ConvexError("Conversation introuvable.");
		if (row.userId !== user._id) {
			throw new ConvexError("Vous ne pouvez archiver que vos propres conversations.");
		}
		// Soft archive : on patch lastActivityAt à 0 pour la sortir de la
		// fenêtre de reprise. La row reste lisible via une query dédiée.
		await ctx.db.patch(id, { lastActivityAt: 0 });
	},
});

// ─────────────────────────────────────────────────────────────
// Internal — prompt builder lit les N derniers messages
// ─────────────────────────────────────────────────────────────

/**
 * Récupère les derniers messages de la conversation < 1h pour injection
 * dans le prompt vocal. Retourne tableau vide si pas de conversation récente.
 */
export const getRecentForPromptInternal = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		const recent = await ctx.db
			.query("iastedConversations")
			.withIndex("by_user_activity", (q) => q.eq("userId", userId))
			.order("desc")
			.first();
		if (!recent) return null;
		const now = Date.now();
		if (now - recent.lastActivityAt > RECENT_WINDOW_MS) return null;
		const tailMessages = recent.messages.slice(-PROMPT_RECENT_MESSAGES);
		return {
			messages: tailMessages,
			lastMode: recent.lastMode,
			lastActivityAt: recent.lastActivityAt,
		};
	},
});
