/**
 * Schema — Actes d'etat civil (mairie.ga).
 * Stub minimal pour debloquer le codegen Convex.
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const etatCivilActesTable = defineTable({
  orgId: v.id("orgs"),
  numero: v.string(),
  type: v.union(
    v.literal("NAISSANCE"),
    v.literal("MARIAGE"),
    v.literal("DECES"),
    v.literal("RECONNAISSANCE"),
  ),
  dateActe: v.optional(v.number()),
  statut: v.optional(
    v.union(v.literal("ENREGISTRE"), v.literal("CORRIGE"), v.literal("ANNULE")),
  ),
  createdByUserId: v.optional(v.id("users")),
})
  .index("by_orgId", ["orgId"])
  .index("by_numero", ["numero"])
  .index("by_type", ["type"]);
