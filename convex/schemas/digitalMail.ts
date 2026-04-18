/**
 * Digital Mail Schema
 *
 * Internal messaging system (iBoîte) for letters and emails.
 * All messages stay within the app — no real email delivery.
 *
 * Ownership model:
 *  - userId: the human author (always a user — the person who pressed "Send")
 *  - ownerId: the entity whose mailbox this belongs to (profile or org)
 *  - ownerType: the kind of entity (profile, organization, association, company)
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";
import {
  mailTypeValidator,
  mailFolderValidator,
  mailOwnerIdValidator,
  mailOwnerTypeValidator,
  mailSenderValidator,
  mailRecipientValidator,
  mailAttachmentValidator,
  letterTypeValidator,
  stampColorValidator,
} from "../lib/validators";

export const digitalMailTable = defineTable({
  // Author (always a human user)
  userId: v.id("users"),

  // Mailbox owner (polymorphic: profile or org)
  ownerId: mailOwnerIdValidator,
  ownerType: mailOwnerTypeValidator,

  // Mail classification
  type: mailTypeValidator,
  folder: mailFolderValidator,

  // Sender & recipient
  sender: mailSenderValidator,
  recipient: v.optional(mailRecipientValidator),

  // Content
  subject: v.string(),
  preview: v.optional(v.string()),
  content: v.string(),
  attachments: v.optional(v.array(mailAttachmentValidator)),

  // Status
  isRead: v.boolean(),
  isStarred: v.boolean(),

  // Letter-specific fields
  stampColor: v.optional(stampColorValidator),
  letterType: v.optional(letterTypeValidator),
  dueDate: v.optional(v.number()),

  // Threading
  threadId: v.optional(v.string()),
  inReplyTo: v.optional(v.id("digitalMail")),

  // Cross-module link : si cette entrée est une notification
  // d'une correspondance officielle reçue, on stocke l'itemId cible pour
  // que le clic en iBoîte redirige vers /icorrespondance/<itemId> au lieu
  // d'ouvrir le viewer mail classique.
  linkedCorrespondanceItemId: v.optional(v.id("correspondanceItems")),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner", ["ownerId"])
  .index("by_owner_folder", ["ownerId", "folder"])
  .index("by_owner_unread", ["ownerId", "isRead"])
  .index("by_user", ["userId"])
  .index("by_thread", ["threadId"]);
