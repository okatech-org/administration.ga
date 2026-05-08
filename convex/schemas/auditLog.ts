import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Audit Log Table
 * Records all modifications to critical tables for compliance.
 */
export const auditLogTable = defineTable({
  // Target document info
  table: v.string(), // e.g., "requests", "documents"
  docId: v.string(),
  
  // Change info
  operation: v.union(
    v.literal("insert"),
    v.literal("update"),
    v.literal("delete"),
    v.literal("read")
  ),
  
  // Actor (who made the change)
  actorId: v.optional(v.id("users")),
  actorTokenIdentifier: v.optional(v.string()), // For unauthenticated contexts
  
  // Change details
  changes: v.optional(v.any()), // { oldDoc, newDoc } or partial
  
  // Timestamp
  timestamp: v.number(),
})
  .index("by_table_doc", ["table", "docId"])
  .index("by_actor", ["actorId"])
  .index("by_timestamp", ["timestamp"]);
