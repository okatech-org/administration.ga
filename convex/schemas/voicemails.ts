import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Voicemails — Sprint 6.
 *
 * Un voicemail est créé quand un appel entrant arrive au bout de son IVR
 * fallback (finalAction: "voicemail" dans orgEscalationPolicy.callcenter)
 * ET que le citoyen enregistre effectivement un message.
 *
 * Pipeline :
 *  1. Cron callCenter.processCallFallbacks détecte fallback timeout.
 *  2. livekit.startVoicemailEgress lance un TrackEgress sur le mic citoyen.
 *  3. Row voicemails créée avec status=pending, egressId défini.
 *  4. Webhook egress_ended → voicemails.completeEgress : storageId + durationMs.
 *  5. (optionnel) transcribeVoicemail via Gemini → transcript défini.
 *  6. push/email notification à l'équipe de la ligne.
 *
 * Note : pas de status enum ici — on considère qu'une row existe = pending ou
 * completed selon audioStorageId, échec = row supprimée par completeEgress.
 */
export const voicemailsTable = defineTable({
  meetingId: v.id("meetings"),
  orgId: v.id("orgs"),
  callLineId: v.optional(v.id("callLines")),
  /** Renseigné si l'appelant est authentifié. */
  citizenUserId: v.optional(v.id("users")),
  /** Fallback quand citizenUserId undefined (appel anonyme). */
  citizenPhoneOrEmail: v.optional(v.string()),
  citizenDisplayName: v.optional(v.string()),
  /** Audio mp3/ogg uploadé via webhook. Null tant que pending. */
  audioStorageId: v.optional(v.id("_storage")),
  /** Durée en ms. */
  durationMs: v.optional(v.number()),
  /** Transcription IA (optionnelle, renseignée par transcribeVoicemail). */
  transcript: v.optional(v.string()),
  transcriptConfidence: v.optional(v.number()),
  isRead: v.boolean(),
  readAt: v.optional(v.number()),
  readBy: v.optional(v.id("users")),
  createdAt: v.number(),
  /** ID de la tâche LiveKit Egress (pour corrélation webhook). */
  egressId: v.optional(v.string()),
  /** Raison d'échec si l'egress a foiré. Sinon row avec audioStorageId. */
  failureReason: v.optional(v.string()),
})
  .index("by_org_unread", ["orgId", "isRead"])
  .index("by_org_created", ["orgId", "createdAt"])
  .index("by_line", ["callLineId"])
  .index("by_meeting", ["meetingId"])
  .index("by_egress_id", ["egressId"]);
