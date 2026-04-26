import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Streaming Chats — buffer réactif pour les réponses LLM streamées.
 *
 * Pattern : l'action `chat` crée une row au démarrage, écrit les chunks
 * Gemini en append côté `content`, puis le frontend subscribe via useQuery
 * → re-render incrémental jusqu'à `status: "done"`.
 *
 * Une fois la conversation finalisée et saved dans `conversations`, la row
 * peut être supprimée (le client garde déjà les messages localement).
 * Une rétention courte (~5 min) sert de fallback en cas de déconnexion.
 */
export const streamingChatsTable = defineTable({
	userId: v.id("users"),
	conversationId: v.optional(v.id("conversations")),
	/** Texte cumulatif appendé par chunks. */
	content: v.string(),
	/** "streaming" pendant la génération, "done" à la fin, "error" si fail. */
	status: v.union(
		v.literal("streaming"),
		v.literal("done"),
		v.literal("error"),
	),
	/** Erreur éventuelle (si status="error"). */
	error: v.optional(v.string()),
	/** Actions IA accumulées (navigateTo, executePageAction, etc.) — set à la fin. */
	actions: v.optional(v.array(v.any())),
	createdAt: v.number(),
	updatedAt: v.number(),
})
	.index("by_user", ["userId"])
	.index("by_user_createdAt", ["userId", "createdAt"]);
