import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Table draftMessages — brouillons de messages chat non envoyés.
 *
 * Plan Intelligence iAsted × Sprint 6 — Phase γ.
 *
 * Un brouillon par (user, chat) — UPDATE sur conflit via unique index.
 * Vidé après envoi effectif du message. Nettoyage optionnel après 30j.
 */
export const draftMessagesTable = defineTable({
	userId: v.id("users"),
	chatId: v.id("chats"),
	content: v.string(),
	updatedAt: v.number(),
})
	.index("by_user_and_chat", ["userId", "chatId"])
	.index("by_user", ["userId"]);
