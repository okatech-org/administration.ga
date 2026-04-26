/**
 * Streaming chats — buffer réactif pour les réponses LLM streamées.
 *
 * Le frontend appelle `chat` (action) qui :
 *   1. Crée une row streamingChats avec status="streaming"
 *   2. Lance Gemini en streaming
 *   3. À chaque chunk, append le texte via une mutation interne (debouncée
 *      côté serveur par batch ~50 tokens / ~150ms)
 *   4. À la fin : status="done" + actions[] populated, écrit la conv finale
 *
 * Le frontend subscribe à la row via `getById` et re-render à chaque mutation.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export const create = internalMutation({
	args: {
		userId: v.id("users"),
		conversationId: v.optional(v.id("conversations")),
	},
	handler: async (ctx, { userId, conversationId }): Promise<Id<"streamingChats">> => {
		const now = Date.now();
		return await ctx.db.insert("streamingChats", {
			userId,
			conversationId,
			content: "",
			status: "streaming",
			createdAt: now,
			updatedAt: now,
		});
	},
});

export const appendChunk = internalMutation({
	args: {
		id: v.id("streamingChats"),
		chunk: v.string(),
	},
	handler: async (ctx, { id, chunk }) => {
		const doc = await ctx.db.get(id);
		if (!doc) return;
		await ctx.db.patch(id, {
			content: doc.content + chunk,
			updatedAt: Date.now(),
		});
	},
});

export const finalize = internalMutation({
	args: {
		id: v.id("streamingChats"),
		actions: v.array(v.any()),
	},
	handler: async (ctx, { id, actions }) => {
		await ctx.db.patch(id, {
			status: "done",
			actions,
			updatedAt: Date.now(),
		});
	},
});

export const failStream = internalMutation({
	args: {
		id: v.id("streamingChats"),
		error: v.string(),
	},
	handler: async (ctx, { id, error }) => {
		await ctx.db.patch(id, {
			status: "error",
			error,
			updatedAt: Date.now(),
		});
	},
});

/**
 * Subscription query côté frontend — réactive à chaque appendChunk.
 * Renvoie null si la row n'existe pas (cleanup) ou si l'utilisateur
 * n'est pas le propriétaire (defense in depth).
 */
export const getById = query({
	args: { id: v.id("streamingChats") },
	handler: async (ctx, { id }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return null;
		const doc = await ctx.db.get(id);
		if (!doc) return null;
		// Defense : on ne révèle pas les streams d'autres utilisateurs.
		const user = await ctx.db
			.query("users")
			.withIndex("by_authId", (q) => q.eq("authId", identity.subject))
			.unique();
		if (!user || user._id !== doc.userId) return null;
		return doc;
	},
});

/**
 * Cleanup interne — peut être appelé par un cron pour purger les rows
 * de plus de 5 minutes (safe net en cas de déconnexion frontend).
 */
export const cleanupOld = internalMutation({
	args: {},
	handler: async (ctx) => {
		const cutoff = Date.now() - 5 * 60 * 1000;
		const old = await ctx.db
			.query("streamingChats")
			.filter((q) => q.lt(q.field("updatedAt"), cutoff))
			.take(100);
		for (const row of old) {
			await ctx.db.delete(row._id);
		}
		return old.length;
	},
});

export const _internal = {
	get: internalQuery({
		args: { id: v.id("streamingChats") },
		handler: async (ctx, { id }) => ctx.db.get(id),
	}),
};
