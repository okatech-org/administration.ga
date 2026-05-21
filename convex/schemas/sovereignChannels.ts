import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Interconnexion souveraine — Canaux de communication entre institutions
 * (Phase 7 administration.ga).
 *
 * Un canal = lien de communication formel entre deux orgs, avec :
 *  - classification autorisée (`public | interne | confidentiel | secret`)
 *  - accusé réception automatique
 *  - horodatage qualifié
 *  - traçabilité complète (envoi/réception/ouverture/acquittement)
 *
 * Canaux symétriques : A↔B est identique à B↔A. La résolution
 * `getChannelBetween(orgAId, orgBId)` accepte les deux ordres ; la migration
 * de seed insère systématiquement dans un ordre lexicographique stable du
 * slug pour faciliter l'idempotence sur `by_slug`.
 *
 * Périmètre MVP (Phase 7) : pas d'UI dédiée. Les canaux sont consommés en
 * lecture/écriture par les modules iCorrespondance et iBoîte pour matérialiser
 * les flux entre Présidence, Vice-Présidence, Ministères, etc.
 */
export const sovereignChannelsTable = defineTable({
  // ─── Identité du canal ──────────────────────────────────────────
  /** Slug stable, lexicographique sur les deux endpoints (ordre A < B). */
  slug: v.string(),
  /** Libellé lisible (ex: "Présidence ↔ Vice-Présidence du Gouvernement"). */
  label: v.string(),

  // ─── Endpoints (deux organisations) ─────────────────────────────
  orgAId: v.id("orgs"),
  orgBId: v.id("orgs"),

  // ─── Classifications autorisées sur ce canal ────────────────────
  /**
   * Niveaux de confidentialité que ce canal peut transporter. Le sender
   * doit choisir une valeur ∈ cette liste lors de l'envoi.
   */
  allowedClassifications: v.array(
    v.union(
      v.literal("public"),
      v.literal("interne"),
      v.literal("confidentiel"),
      v.literal("secret"),
    ),
  ),

  // ─── Options ────────────────────────────────────────────────────
  /** Accusé réception obligatoire (acknowledged event après opened). */
  requiresAcknowledgment: v.boolean(),
  /**
   * Signature électronique du chef de poste requise sur les pièces transmises
   * via ce canal. Optionnel — défaut `false`.
   */
  signatureRequired: v.optional(v.boolean()),
  /** Horodatage qualifié (timestamping certifié) requis sur chaque event. */
  timestampRequired: v.boolean(),

  // ─── Métadonnées ────────────────────────────────────────────────
  description: v.optional(v.string()),
  createdAt: v.number(),
  isActive: v.boolean(),
})
  .index("by_slug", ["slug"])
  .index("by_orgA", ["orgAId"])
  .index("by_orgB", ["orgBId"])
  .index("by_active", ["isActive"]);

/**
 * Journal des évènements sur un canal (envoi, réception, ouverture, accusé,
 * erreur). Sert de piste d'audit immuable.
 *
 * `correspondanceId` est optionnel car un canal peut aussi transporter des
 * pings (heartbeat, test) sans courrier réel. Stocké en string pour ne pas
 * coupler à une table — l'item référencé peut être un correspondanceItem,
 * un iBoiteMessage, un document, etc.
 */
export const sovereignChannelEventsTable = defineTable({
  channelId: v.id("sovereignChannels"),
  /** ID de l'item de référence (correspondance, message, etc.) si applicable. */
  correspondanceId: v.optional(v.string()),

  eventType: v.union(
    v.literal("sent"),
    v.literal("received"),
    v.literal("opened"),
    v.literal("acknowledged"),
    v.literal("error"),
  ),

  // ─── Routage ────────────────────────────────────────────────────
  fromOrgId: v.id("orgs"),
  toOrgId: v.id("orgs"),
  byUserId: v.optional(v.id("users")),
  byMembershipId: v.optional(v.id("memberships")),

  // ─── Classification effective du message ────────────────────────
  classification: v.union(
    v.literal("public"),
    v.literal("interne"),
    v.literal("confidentiel"),
    v.literal("secret"),
  ),

  // ─── Horodatage et détails ──────────────────────────────────────
  timestamp: v.number(),
  detail: v.optional(v.string()),
  /** Métadonnées libres pour audit (raison d'erreur, contexte, etc.). */
  metadata: v.optional(v.any()),
})
  .index("by_channel_timestamp", ["channelId", "timestamp"])
  .index("by_correspondance", ["correspondanceId"]);
