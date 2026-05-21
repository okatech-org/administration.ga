import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * iBoîte — Messagerie institutionnelle informelle (Phase 5 administration.ga,
 * MVP). Distincte de :
 *   - `messages` (notifications agent ↔ citoyen),
 *   - `chats` / `chatMessages` (chat peer-to-peer agents),
 *   - `correspondanceItems` (courriers officiels avec workflow signé).
 *
 * iBoîte est conçue pour les notes courtes informelles internes à l'org :
 *  - destinataire = autre membership de la même org (DG, chef de service, …)
 *  - support des accusés de réception (`readAt` + `acknowledgedAt`)
 *  - lien optionnel vers un item d'autre module (`relatedItemKind` / `Id`)
 *    pour pousser une notification de workflow sans dupliquer le contenu.
 *
 * Pas de workflow d'approbation ; pas de signature qualifiée — pour ces
 * besoins, utiliser iCorrespondance.
 */
export const iBoiteMessagesTable = defineTable({
  // ─── Scope ──────────────────────────────────────────────────────
  orgId: v.id("orgs"),

  // ─── Routage ────────────────────────────────────────────────────
  /** Membership expéditeur (au sein de `orgId`). */
  fromMembershipId: v.id("memberships"),
  /** Membership destinataire (au sein de `orgId`). */
  toMembershipId: v.id("memberships"),

  // ─── Contenu ────────────────────────────────────────────────────
  subject: v.string(),
  body: v.string(),
  /**
   * Pièces jointes — stockées sur Convex Storage. La taille est répétée pour
   * éviter une lookup Storage à chaque listing.
   */
  attachments: v.optional(
    v.array(
      v.object({
        name: v.string(),
        storageId: v.id("_storage"),
        sizeBytes: v.number(),
        mimeType: v.optional(v.string()),
      }),
    ),
  ),

  // ─── Cycle de vie ───────────────────────────────────────────────
  sentAt: v.number(),
  /** Timestamp première lecture par le destinataire. */
  readAt: v.optional(v.number()),
  /**
   * Timestamp accusé de réception explicite (distinct de la lecture passive).
   * Le destinataire confirme avoir pris en compte le message.
   */
  acknowledgedAt: v.optional(v.number()),
  /** Le destinataire a archivé/masqué le message de son inbox. */
  archivedByRecipient: v.optional(v.boolean()),
  /** L'expéditeur a archivé/masqué le message de sa sent box. */
  archivedBySender: v.optional(v.boolean()),

  // ─── Lien vers un autre item (optionnel) ───────────────────────
  /**
   * Permet d'attacher un message iBoîte à un item d'un autre module — par
   * exemple "Tu as une nouvelle correspondance à valider", ou "Le dossier X
   * vient d'être marqué prêt". Strings pour ne pas coupler à une table.
   */
  relatedItemKind: v.optional(v.string()),
  relatedItemId: v.optional(v.string()),
})
  .index("by_org_recipient", ["orgId", "toMembershipId"])
  .index("by_org_sender", ["orgId", "fromMembershipId"])
  // Index permettant de lister les messages non lus d'un destinataire :
  // `withIndex("by_recipient_unread", q => q.eq("toMembershipId", id).eq("readAt", undefined))`.
  .index("by_recipient_unread", ["toMembershipId", "readAt"])
  .index("by_org_sentAt", ["orgId", "sentAt"]);
