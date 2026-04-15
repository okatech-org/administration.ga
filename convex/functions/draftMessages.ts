import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";

/**
 * Brouillons de messages chat — persistance côté serveur.
 *
 * Plan Intelligence iAsted × Sprint 6 — Phase γ.
 *
 * Un brouillon par (user, chat). Les updates remplacent via UPSERT.
 * `clearDraft` appelé après envoi effectif du message.
 */

export const saveDraft = authMutation({
	args: {
		chatId: v.id("chats"),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("draftMessages")
			.withIndex("by_user_and_chat", (q) =>
				q.eq("userId", ctx.user._id).eq("chatId", args.chatId),
			)
			.unique();

		const now = Date.now();

		// Si content vide → clear (économise de l'espace)
		if (args.content.trim().length === 0) {
			if (existing) await ctx.db.delete(existing._id);
			return { cleared: true };
		}

		if (existing) {
			await ctx.db.patch(existing._id, { content: args.content, updatedAt: now });
			return { updated: true };
		}
		await ctx.db.insert("draftMessages", {
			userId: ctx.user._id,
			chatId: args.chatId,
			content: args.content,
			updatedAt: now,
		});
		return { created: true };
	},
});

export const getDraft = authQuery({
	args: {
		chatId: v.id("chats"),
	},
	handler: async (ctx, args) => {
		const row = await ctx.db
			.query("draftMessages")
			.withIndex("by_user_and_chat", (q) =>
				q.eq("userId", ctx.user._id).eq("chatId", args.chatId),
			)
			.unique();
		return row ?? null;
	},
});

export const clearDraft = authMutation({
	args: {
		chatId: v.id("chats"),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("draftMessages")
			.withIndex("by_user_and_chat", (q) =>
				q.eq("userId", ctx.user._id).eq("chatId", args.chatId),
			)
			.unique();
		if (existing) await ctx.db.delete(existing._id);
		return { cleared: Boolean(existing) };
	},
});

/**
 * Liste tous les brouillons de l'utilisateur courant — utile pour bannière
 * de reprise globale ("Vous avez X brouillons en attente").
 */
export const listMine = authQuery({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db
			.query("draftMessages")
			.withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
			.order("desc")
			.take(50);
		return rows;
	},
});
