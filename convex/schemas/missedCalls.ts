import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Table missedCalls — Journal des appels manqués nécessitant un rappel
 *
 * Créés automatiquement quand un appel meeting entrant expire (timeout) ou
 * n'est pas répondu. Permettent aux agents de rappeler les citoyens qui ont
 * essayé de joindre l'org sans succès.
 *
 * Relations :
 *   - orgId → orgs (représentation concernée)
 *   - callLineId → callLines (ligne appelée)
 *   - meetingId → meetings (appel original)
 *   - caller.userId → users (citoyen appelant, si identifié)
 *   - callbackByMembershipId → memberships (agent qui a fait le rappel)
 */

export const missedCallsTable = defineTable({
  orgId: v.id("orgs"),
  callLineId: v.optional(v.id("callLines")),
  meetingId: v.id("meetings"),

  // Identité de l'appelant
  caller: v.object({
    userId: v.optional(v.id("users")),
    profileId: v.optional(v.id("profiles")),
    phoneNumber: v.optional(v.string()), // si appel téléphonique (futur)
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
  }),

  // Chronologie
  startedAt: v.number(),
  endedAt: v.number(),
  durationSeconds: v.optional(v.number()),

  // Motif
  reason: v.union(
    v.literal("timeout"), // ring timeout dépassé
    v.literal("no_agent"), // aucun agent disponible
    v.literal("rejected"), // rejeté explicitement
    v.literal("abandoned"), // appelant a raccroché
  ),

  // Agents notifiés au moment de l'appel (pour traçabilité)
  notifiedAgentIds: v.optional(v.array(v.id("memberships"))),

  // Statut de rappel
  callbackStatus: v.union(
    v.literal("pending"), // à rappeler
    v.literal("assigned"), // assigné à un agent
    v.literal("in_progress"), // rappel en cours
    v.literal("completed"), // rappel effectué
    v.literal("ignored"), // ignoré volontairement
  ),
  callbackAssignedTo: v.optional(v.id("memberships")),
  callbackAssignedAt: v.optional(v.number()),
  callbackCompletedAt: v.optional(v.number()),
  callbackByMembershipId: v.optional(v.id("memberships")),
  callbackMeetingId: v.optional(v.id("meetings")), // lien vers le meeting de rappel
  callbackNotes: v.optional(v.string()),

  // Notification envoyée ?
  citizenNotifiedAt: v.optional(v.number()),
})
  .index("by_org_status", ["orgId", "callbackStatus"])
  .index("by_org", ["orgId"])
  .index("by_meeting", ["meetingId"])
  .index("by_callLine", ["callLineId"])
  .index("by_caller_user", ["caller.userId"])
  .index("by_assigned_to", ["callbackAssignedTo"]);
