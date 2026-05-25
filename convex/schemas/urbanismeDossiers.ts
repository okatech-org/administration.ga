/**
 * Schema — Dossiers d'urbanisme (mairie.ga).
 * Stub minimal pour debloquer le codegen Convex.
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const urbanismeDossiersTable = defineTable({
  orgId: v.id("orgs"),
  reference: v.string(),
  type: v.union(
    v.literal("PERMIS_CONSTRUIRE"),
    v.literal("PERMIS_AMENAGER"),
    v.literal("PERMIS_DEMOLIR"),
    v.literal("DECLARATION_PREALABLE"),
    v.literal("CERTIFICAT_URBANISME"),
  ),
  demandeurUserId: v.optional(v.id("users")),
  statut: v.optional(
    v.union(
      v.literal("DEPOSE"),
      v.literal("EN_INSTRUCTION"),
      v.literal("ACCORDE"),
      v.literal("REFUSE"),
    ),
  ),
  createdByUserId: v.optional(v.id("users")),
})
  .index("by_orgId", ["orgId"])
  .index("by_reference", ["reference"])
  .index("by_statut", ["statut"]);
