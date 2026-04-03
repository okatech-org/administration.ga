import { defineTable } from "convex/server";
import { v } from "convex/values";
import { requestStatusValidator, requestPriorityValidator } from "../lib/validators";

/**
 * Action required types for user follow-up
 * Note: Includes legacy types (documents, info, payment) for migration
 */
export const actionRequiredTypeValidator = v.union(
  // New types
  v.literal("upload_document"),      // Upload un document spécifique
  v.literal("complete_info"),        // Compléter des champs manquants
  v.literal("schedule_appointment"), // Prendre RDV
  v.literal("make_payment"),         // Effectuer paiement
  v.literal("confirm_info"),         // Confirmer des informations
  // Legacy types (for migration)
  v.literal("documents"),
  v.literal("info"),
  v.literal("payment")
);

/**
 * Action required response from citizen
 */
export const actionResponseValidator = v.object({
  respondedAt: v.number(),
  documentIds: v.optional(v.array(v.id("documents"))),
  formData: v.optional(v.any()),
  confirmed: v.optional(v.boolean()),
});

/**
 * Requests table - service requests from users
 * Status is denormalized from events for fast queries
 */
export const requestsTable = defineTable({
  // References
  userId: v.id("users"),
  profileId: v.optional(v.union(v.id("profiles"), v.id("childProfiles"))),
  orgId: v.id("orgs"),
  orgServiceId: v.id("orgServices"),

  // Public reference
  reference: v.string(), // "REQ-2024-ABC123"

  // State (denormalized from events)
  status: requestStatusValidator,
  priority: requestPriorityValidator,

  // Form data (validated by service formSchema)
  formData: v.optional(v.any()),

  // Documents attached to request
  documents: v.optional(v.array(v.id("documents"))),

  // Actions required from user (set by agent or AI) — multiple concurrent actions
  actionsRequired: v.optional(v.array(v.object({
    id: v.string(), // Unique ID (nanoid) for individual targeting
    type: actionRequiredTypeValidator,
    message: v.string(),
    // For upload_document — rich document type references
    documentTypes: v.optional(v.array(v.object({
      type: v.string(),
      label: v.optional(v.any()), // LocalizedString
      required: v.optional(v.boolean()),
    }))),
    // For complete_info — rich field metadata for dynamic rendering
    fields: v.optional(v.array(v.object({
      fieldPath: v.string(),          // "sectionId.fieldId"
      label: v.optional(v.any()),     // LocalizedString
      type: v.optional(v.string()),   // "text" | "date" | "select" etc.
      options: v.optional(v.any()),   // Select options if applicable
      currentValue: v.optional(v.any()), // For pre-filling
      sectionTitle: v.optional(v.any()), // LocalizedString — section header for grouping
    }))),
    infoToConfirm: v.optional(v.string()),          // For confirm_info
    deadline: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    response: v.optional(actionResponseValidator),
  }))),

  // Assignment
  assignedTo: v.optional(v.id("memberships")),

  // Denormalized timestamps
  submittedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  // Linked appointments
  depositAppointmentId: v.optional(v.id("appointments")),  // RDV dépôt
  pickupAppointmentId: v.optional(v.id("appointments")),   // RDV retrait

  // Payment
  paymentStatus: v.optional(v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("succeeded"),
    v.literal("failed"),
    v.literal("refunded")
  )),

  // Delivery mode (how the result will be delivered)
  delivery: v.optional(v.object({
    mode: v.union(
      v.literal("in_person"),
      v.literal("postal"),
      v.literal("electronic"),
      v.literal("by_proxy")
    ),
    address: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      postalCode: v.string(),
      country: v.string(),
    })),
    trackingNumber: v.optional(v.string()),
    shippedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
  })),

  // Proxy (mandataire for pickup)
  proxy: v.optional(v.object({
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    identityDocId: v.optional(v.id("documents")),
    powerOfAttorneyId: v.optional(v.id("documents")),
  })),

  updatedAt: v.optional(v.number()),

  // Per-field validation by agent (map of "sectionId.fieldId" → validation info)
  fieldValidations: v.optional(v.record(v.string(), v.object({
    validatedAt: v.number(),
    validatedBy: v.id("users"),
  }))),
})
  .index("by_reference", ["reference"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_user_status", ["userId", "status"])
  .index("by_assigned", ["assignedTo"])
  .index("by_org_deposit", ["orgId", "depositAppointmentId"]);
