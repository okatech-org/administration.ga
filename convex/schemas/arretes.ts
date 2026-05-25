/**
 * Schema — Arretes municipaux (mairie.ga).
 *
 * Stub minimal pour debloquer le codegen Convex. La structure complete
 * est specifiee dans `apps/mairie_ga/` et sera enrichie quand le module
 * mairie sera reactive.
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const arretesTable = defineTable({
  orgId: v.id("orgs"),
  numero: v.string(),
  titre: v.string(),
  contenu: v.optional(v.string()),
  dateSignature: v.optional(v.number()),
  statut: v.optional(
    v.union(v.literal("BROUILLON"), v.literal("PUBLIE"), v.literal("ARCHIVE")),
  ),
  createdByUserId: v.optional(v.id("users")),
})
  .index("by_orgId", ["orgId"])
  .index("by_numero", ["numero"])
  .index("by_statut", ["statut"]);
