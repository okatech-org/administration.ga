import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Call recordings — Sprint 6.
 *
 * Représente un enregistrement d'appel déclenché via LiveKit RoomEgress.
 *
 * Cycle de vie :
 *  1. `pending` — egress lancé, file pas encore uploadée.
 *  2. `completed` — webhook reçu, storageId défini, audio disponible.
 *  3. `failed` — egress a échoué côté LiveKit.
 *  4. `deletedAt` défini — retention atteinte, storage supprimé.
 *
 * RGPD :
 *  - `consentBannerShown` : flag posé au moment d'afficher la modal au citoyen.
 *  - `consentAcceptedByCitizenAt` : set uniquement si accept explicite.
 *  - `retentionUntil` : auto-calculé à la création (now + CALL_RECORDING_RETENTION_DAYS).
 */
export const callRecordingStatusValidator = v.union(
  v.literal("pending"),
  v.literal("completed"),
  v.literal("failed"),
);

export const callRecordingsTable = defineTable({
  meetingId: v.id("meetings"),
  orgId: v.id("orgs"),
  /** Fichier audio uploadé après complétion de l'egress. Null tant que pending. */
  storageId: v.optional(v.id("_storage")),
  /** Durée en millisecondes, calculée à réception du webhook. */
  durationMs: v.optional(v.number()),
  startedAt: v.number(),
  endedAt: v.optional(v.number()),
  /** Consent UI flow */
  consentBannerShown: v.boolean(),
  consentAcceptedByCitizenAt: v.optional(v.number()),
  /** Date limite de rétention : si < now, le cron supprime le storage. */
  retentionUntil: v.number(),
  /** ID de la tâche LiveKit Egress (pour corrélation webhook). */
  egressId: v.optional(v.string()),
  status: callRecordingStatusValidator,
  /** Raison d'échec si status === "failed" (debug). */
  failureReason: v.optional(v.string()),
  /** Set par le cron cleanupExpired ; le row reste en base pour l'audit. */
  deletedAt: v.optional(v.number()),
  /** Utilisateur ayant déclenché le recording (audit). */
  startedBy: v.optional(v.id("users")),
})
  .index("by_meeting", ["meetingId"])
  .index("by_org_started", ["orgId", "startedAt"])
  .index("by_retention", ["retentionUntil"])
  .index("by_egress_id", ["egressId"]);
