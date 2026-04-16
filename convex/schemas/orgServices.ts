import { defineTable } from "convex/server";
import { v } from "convex/values";
import { pricingValidator, requestStatusValidator } from "../lib/validators";
import { accessLevelValidator } from "../lib/moduleCodes";

/**
 * Auto-generation rule: which templates should be produced automatically
 * when a request reaches a given state (or on first submission) for this
 * service. Multiple rules may fire together — the scheduler runs them in
 * parallel via `scheduler.runAfter(0, ...)`.
 */
export const autoGenerationRuleValidator = v.object({
  /** `on_submission` fires when a citizen submits a new request; `on_status_transition`
   * fires when an agent patches a request from `fromStatus` to `toStatus`. */
  trigger: v.union(
    v.literal("on_submission"),
    v.literal("on_status_transition"),
  ),
  /** Source status (`on_status_transition` only — ignored otherwise). Omit to
   * match any source status. */
  fromStatus: v.optional(requestStatusValidator),
  /** Target status (`on_status_transition` only). Required for that trigger. */
  toStatus: v.optional(requestStatusValidator),
  /** Template to generate. Must exist and be active. */
  templateId: v.id("documentTemplates"),
  /** Attempt to sign automatically (Phase 3 signature flow). */
  autoSign: v.boolean(),
  /** Publish to the citizen immediately after generation (or signature). */
  autoPublish: v.boolean(),
});

/**
 * OrgServices table - service configuration per org
 * Links services catalog to organizations with custom pricing/config
 *
 * Note: formSchema and joinedDocuments are now managed at the service level
 * by the super admin. Org admins only configure pricing, appointments, and instructions.
 */
export const orgServicesTable = defineTable({
  orgId: v.id("orgs"),
  serviceId: v.id("services"),

  // Pricing
  pricing: pricingValidator,
  estimatedDays: v.optional(v.number()), // Override service default

  // Custom content instructions based on appointment type
  depositInstructions: v.optional(v.string()),
  pickupInstructions: v.optional(v.string()),

  // Availability & Appointments
  isActive: v.boolean(),
  requiresAppointment: v.optional(v.boolean()), // Appointment for document submission
  requiresAppointmentForPickup: v.optional(v.boolean()), // Appointment for document pickup
  availableSlots: v.optional(v.number()), // Limit if needed

  // Appointment scheduling configuration
  appointmentDurationMinutes: v.optional(v.number()), // Default slot duration: 5, 10, 15, 20, 30, 45, 60
  appointmentBreakMinutes: v.optional(v.number()),    // Break between slots: 0, 5, 10
  appointmentCapacity: v.optional(v.number()),        // Max concurrent appointments per slot

  // Pickup appointment configuration (separate from deposit)
  pickupAppointmentDurationMinutes: v.optional(v.number()), // Pickup slot duration
  pickupAppointmentBreakMinutes: v.optional(v.number()),    // Break between pickup slots

  // Contrôle d'accès par poste pour ce service (optionnel)
  // Si absent : hérite du niveau d'accès du module "requests" sur le poste
  // Si présent : seuls les postes listés ont accès au niveau spécifié
  serviceAccess: v.optional(v.array(v.object({
    positionId: v.id("positions"),
    accessLevel: accessLevelValidator, // "reader" | "editor" | "admin"
  }))),

  // Règles de génération automatique de documents officiels — déclenchées
  // par la soumission citoyen ou une transition de statut agent.
  autoGenerationRules: v.optional(v.array(autoGenerationRuleValidator)),

  updatedAt: v.optional(v.number()),
})
  // Note: by_org_service can be used for "by_org" queries via prefix matching
  .index("by_org_service", ["orgId", "serviceId"])
  .index("by_org_active", ["orgId", "isActive"])
  .index("by_service_active", ["serviceId", "isActive"]);
