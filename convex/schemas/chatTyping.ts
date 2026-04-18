import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Chat Typing — indicateurs "en train d'écrire".
 *
 * Row éphémère : le client ping cette table toutes les ~3s quand l'utilisateur
 * tape. Les queries côté lecteur filtrent sur `expiresAt > Date.now()` pour
 * n'afficher que les indicateurs frais. Un cron (ou un filtrage côté query)
 * purge les rows expirées pour éviter l'accumulation.
 *
 * Indexé par `chatId + userId` (un seul row par couple) : un UPSERT simple
 * suffit à la mutation `setTyping`.
 */
export const chatTypingTable = defineTable({
  chatId: v.id("chats"),
  userId: v.id("users"),
  /** Timestamp d'expiration. Par défaut 6s après le dernier `setTyping`. */
  expiresAt: v.number(),
})
  .index("by_chat", ["chatId"])
  .index("by_chat_user", ["chatId", "userId"])
  .index("by_expires", ["expiresAt"]);
