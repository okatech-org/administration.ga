import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Notes du module Renseignement (cloisonné, ministry-only).
 *
 * IMPORTANT — Cloisonnement strict :
 *   Cette table NE DOIT JAMAIS être jointe ou retournée par les queries des
 *   autres modules (Affaires consulaires, Affaires diplomatiques, etc.).
 *   Elle est accessible UNIQUEMENT via `convex/functions/intelligenceNotes.ts`
 *   et `convex/functions/intelligence.ts`, qui imposent les tasks
 *   `intelligence.notes.view` / `intelligence.notes.create` etc.
 *
 * Les `targetId` peuvent pointer vers plusieurs tables selon `targetType` :
 *   - "profile"           → profiles
 *   - "child_profile"     → childProfiles
 *   - "diplomatic_target" → diplomaticTargets (opérateurs / cibles diplomatiques)
 *   - "agent"             → users (membres des organismes)
 *
 * Soft-delete (tombstone) : on ne purge pas pour conserver la traçabilité.
 */
export const intelligenceNotesTable = defineTable({
  targetType: v.union(
    v.literal("profile"),
    v.literal("child_profile"),
    v.literal("diplomatic_target"),
    v.literal("agent"),
  ),
  // String pour permettre l'union des Id<...> de tables différentes ;
  // la résolution typée se fait côté handler en fonction de targetType.
  targetId: v.string(),

  orgId: v.id("orgs"),
  authorId: v.id("users"),

  content: v.string(),

  category: v.union(
    v.literal("observation"),
    v.literal("risk"),
    v.literal("flag"),
    v.literal("lead"),
  ),
  severity: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("critical"),
  ),

  // Provenance et fiabilité de l'information
  source: v.optional(
    v.union(
      v.literal("humint"),    // Source humaine
      v.literal("osint"),     // Source ouverte
      v.literal("internal"),  // Système (notif, demande, etc.)
      v.literal("tip"),       // Signalement spontané
      v.literal("other"),
    ),
  ),
  // Classification de confidentialité (doctrine renseignement)
  classification: v.optional(
    v.union(
      v.literal("internal"),     // Visible à tous les porteurs du module
      v.literal("restricted"),   // Restreint au cabinet ministériel
      v.literal("secret"),       // Secret (audit renforcé)
      v.literal("top_secret"),   // Très Secret (réservé direction)
    ),
  ),
  // Statut de vérification de l'information
  verified: v.optional(
    v.union(
      v.literal("unverified"),
      v.literal("confirmed"),
      v.literal("disputed"),
    ),
  ),

  expiresAt: v.optional(v.number()),
  updatedAt: v.number(),

  // Soft delete (tombstone)
  deletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id("users")),
})
  .index("by_target", ["targetType", "targetId"])
  .index("by_org_severity", ["orgId", "severity"])
  .index("by_author", ["authorId"]);
