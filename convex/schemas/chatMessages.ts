import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Chat Messages table — Messages individuels dans un thread de chat.
 *
 * Chaque message appartient à un chat (thread).
 * Types spéciaux pour les événements système (appel démarré/terminé).
 */
export const chatMessagesTable = defineTable({
  // Thread parent
  chatId: v.id("chats"),

  // Expéditeur
  senderId: v.id("users"),

  // Contenu
  content: v.string(),
  attachments: v.optional(v.array(v.id("documents"))),

  // Statut de lecture
  readAt: v.optional(v.number()),

  // Type de message
  type: v.optional(
    v.union(
      v.literal("text"),
      v.literal("system"),
      v.literal("call_started"),
      v.literal("call_ended"),
    ),
  ),

  // Timestamps
  createdAt: v.number(),
})
  .index("by_chat_created", ["chatId", "createdAt"]);
