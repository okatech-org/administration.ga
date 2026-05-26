/**
 * Schema — Arretes municipaux (mairie.ga).
 * Stub minimal pour debloquer le codegen Convex.
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const arretesTable = defineTable({
  orgId: v.id("orgs"),
  numero: v.string(),
  objet: v.string(),
  dateArrete: v.optional(v.number()),
  statut: v.optional(
    v.union(v.literal("BROUILLON"), v.literal("PUBLIE"), v.literal("ABROGE")),
  ),
  createdByUserId: v.optional(v.id("users")),
})
  .index("by_orgId", ["orgId"])
  .index("by_numero", ["numero"])
  .index("by_statut", ["statut"]);
