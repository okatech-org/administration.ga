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

  // Clé d'idempotence générée côté client (uuid v4) pour éviter les
  // insertions dupliquées suite à un double-clic ou un retry réseau.
  // Scopée sur `chatId` pour garder l'index performant.
  idempotencyKey: v.optional(v.string()),

  // Soft-delete (suppression par auteur dans une fenêtre courte) et édition.
  deletedAt: v.optional(v.number()),
  editedAt: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
})
  .index("by_chat_created", ["chatId", "createdAt"])
  .index("by_chat_idempotency", ["chatId", "idempotencyKey"]);
