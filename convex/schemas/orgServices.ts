import { defineTable } from "convex/server";
import { v } from "convex/values";
import { pricingValidator, requestStatusValidator } from "../lib/validators";
import { accessLevelValidator } from "../lib/moduleCodes";

/**
 * Per-placeholder mapping override applied at generation time. Keyed by the
 * template's `placeholder.key`. Each entry tells the resolver to pull the
 * value from `(source, path)` instead of relying on the descriptor's defaults.
 *
 * - `source` is one of the standard buckets (`user`, `profile`, `request`,
 *    `formData`, `org`, `system`).
 * - `path` is a JSONPath-like dotted access against that bucket. Defaults
 *    to the placeholder key when omitted.
 *
 * When a placeholder key is absent from the mapping, the resolver falls
 * back to the descriptor's `(source, path)` — back-compat for existing rules.
 */
const placeholderSourceValidator = v.union(
  v.literal("user"),
  v.literal("profile"),
  v.literal("request"),
  v.literal("formData"),
  v.literal("org"),
  v.literal("system"),
);
export const fieldMappingValidator = v.record(
  v.string(),
  v.object({
    source: placeholderSourceValidator,
    path: v.optional(v.string()),
  }),
);

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
  /** Optional per-placeholder mapping — overrides the descriptor defaults. */
  fieldMapping: v.optional(fieldMappingValidator),
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

  // When true, citizen bookings land as "pending" and must be confirmed by an agent
  // before the appointment is considered active. Default: false (auto-confirmed).
  requireAgentValidation: v.optional(v.boolean()),

  // Allowed modes for this service (defaults to in-person only)
  allowedAppointmentModes: v.optional(v.array(v.union(
    v.literal("in_person"),
    v.literal("remote"),
    v.literal("phone"),
  ))),

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
