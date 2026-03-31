/**
 * Affaires Diplomatiques — Schema
 *
 * Tables pour la gestion des affaires diplomatiques :
 * - Cibles (entreprises, organismes partenaires potentiels)
 * - Lettres de contact (courriers formels aux cibles)
 * - Plans stratégiques (stratégie diplomatique et économique)
 * - Rapports (pour la hiérarchie : Président, Ministre)
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// ─── Cibles ─────────────────────────────────────────────────────────────────

export const diplomaticTargetsTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),

  // Identification
  name: v.string(),
  type: v.union(
    v.literal("enterprise"),
    v.literal("government"),
    v.literal("ngo"),
    v.literal("international_org"),
    v.literal("academic"),
    v.literal("media"),
    v.literal("other"),
  ),
  sector: v.optional(v.string()),
  country: v.optional(v.string()),
  city: v.optional(v.string()),

  // Contact
  contactName: v.optional(v.string()),
  contactTitle: v.optional(v.string()),
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  website: v.optional(v.string()),

  // Évaluation
  priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
  status: v.union(
    v.literal("identified"),
    v.literal("contacted"),
    v.literal("in_discussion"),
    v.literal("partnership"),
    v.literal("inactive"),
  ),
  description: v.optional(v.string()),
  notes: v.optional(v.string()),
  tags: v.array(v.string()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_org_type", ["orgId", "type"])
  .index("by_org_priority", ["orgId", "priority"])
  .searchIndex("search_name", { searchField: "name", filterFields: ["orgId"] });

// ─── Lettres de contact ─────────────────────────────────────────────────────

export const diplomaticLettersTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),
  targetId: v.optional(v.id("diplomaticTargets")),

  // Contenu
  reference: v.string(),
  subject: v.string(),
  content: v.optional(v.string()),
  type: v.union(
    v.literal("introduction"),
    v.literal("follow_up"),
    v.literal("invitation"),
    v.literal("proposal"),
    v.literal("thank_you"),
    v.literal("other"),
  ),

  // Destinataire
  recipientName: v.string(),
  recipientTitle: v.optional(v.string()),
  recipientOrg: v.optional(v.string()),

  // Statut
  status: v.union(
    v.literal("draft"),
    v.literal("pending_approval"),
    v.literal("approved"),
    v.literal("sent"),
    v.literal("responded"),
    v.literal("archived"),
  ),

  // Pièces jointes
  attachments: v.array(v.object({
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    uploadedAt: v.number(),
  })),

  sentAt: v.optional(v.number()),
  respondedAt: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_target", ["targetId"])
  .index("by_org_created", ["orgId", "createdAt"]);

// ─── Plans stratégiques ─────────────────────────────────────────────────────

export const diplomaticPlansTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),

  title: v.string(),
  period: v.optional(v.string()),
  category: v.union(
    v.literal("bilateral"),
    v.literal("economic"),
    v.literal("cultural"),
    v.literal("security"),
    v.literal("multilateral"),
    v.literal("other"),
  ),

  // Contenu structuré
  objectives: v.array(v.object({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("planned"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled")),
    deadline: v.optional(v.number()),
  })),

  summary: v.optional(v.string()),
  status: v.union(
    v.literal("draft"),
    v.literal("active"),
    v.literal("completed"),
    v.literal("archived"),
  ),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_org_category", ["orgId", "category"]);

// ─── Rapports diplomatiques ─────────────────────────────────────────────────

export const diplomaticReportsTable = defineTable({
  orgId: v.id("orgs"),
  createdBy: v.id("users"),

  title: v.string(),
  type: v.union(
    v.literal("activity"),
    v.literal("situation"),
    v.literal("mission"),
    v.literal("economic"),
    v.literal("security"),
    v.literal("annual"),
    v.literal("other"),
  ),
  recipient: v.union(
    v.literal("president"),
    v.literal("minister"),
    v.literal("secretary_general"),
    v.literal("direction"),
    v.literal("other"),
  ),

  // Contenu
  summary: v.optional(v.string()),
  content: v.optional(v.string()),
  period: v.optional(v.string()),

  // Pièces jointes
  attachments: v.array(v.object({
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    uploadedAt: v.number(),
  })),

  status: v.union(
    v.literal("draft"),
    v.literal("pending_review"),
    v.literal("approved"),
    v.literal("submitted"),
    v.literal("archived"),
  ),

  submittedAt: v.optional(v.number()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  deletedAt: v.optional(v.number()),
})
  .index("by_org", ["orgId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_org_type", ["orgId", "type"])
  .index("by_org_created", ["orgId", "createdAt"]);
