/**
 * Schema — Deliberations du conseil municipal (mairie.ga).
 * Stub minimal pour debloquer le codegen Convex.
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const deliberationsTable = defineTable({
  orgId: v.id("orgs"),
  numero: v.string(),
  objet: v.string(),
  contenu: v.optional(v.string()),
  dateSeance: v.optional(v.number()),
  statut: v.optional(
    v.union(v.literal("PROPOSEE"), v.literal("VOTEE"), v.literal("REJETEE")),
  ),
  createdByUserId: v.optional(v.id("users")),
})
  .index("by_orgId", ["orgId"])
  .index("by_numero", ["numero"])
  .index("by_statut", ["statut"]);
