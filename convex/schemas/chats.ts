import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Chats table — Threads de messagerie peer-to-peer.
 *
 * Chaque thread lie exactement 2 utilisateurs (1:1).
 * Les IDs sont triés lexicographiquement pour garantir l'unicité :
 *   participantA = min(userA, userB)
 *   participantB = max(userA, userB)
 *
 * Restriction métier :
 *   - Seuls les agents (Catégorie A) peuvent initier un thread
 *   - Les citoyens (Catégorie B) peuvent répondre mais pas initier
 */
export const chatsTable = defineTable({
  // Participants (triés pour unicité)
  participantA: v.id("users"),
  participantB: v.id("users"),

  // Qui a initié la conversation
  initiatedBy: v.id("users"),

  // Contexte optionnel
  orgId: v.optional(v.id("orgs")),
  requestId: v.optional(v.id("requests")),

  // Dernier message (pour l'aperçu dans la liste)
  lastMessageText: v.optional(v.string()),
  lastMessageAt: v.optional(v.number()),
  lastMessageBy: v.optional(v.id("users")),

  // Type de thread : p2p (agent↔citoyen classique) ou standard (Mr Ray / Standard)
  type: v.optional(v.union(v.literal("p2p"), v.literal("standard"))),

  // Pour les threads standard : agent humain qui a pris en charge
  claimedBy: v.optional(v.id("users")),

  // Statut
  status: v.union(v.literal("active"), v.literal("archived")),

  // Timestamps
  createdAt: v.number(),
})
  .index("by_participantA_B", ["participantA", "participantB"])
  .index("by_participantA", ["participantA"])
  .index("by_participantB", ["participantB"])
  .index("by_org_type", ["orgId", "type"]);
