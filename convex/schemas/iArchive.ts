import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * iArchive — Archive longue durée (Phase 5 administration.ga, MVP).
 *
 * Distinct de `archivePolicies` (qui décrit des politiques par catégorie) et
 * de `archiveAuditLog` (journal d'opérations sur le `documents` table). La
 * table `iArchive_records` enregistre les pièces archivées au sens du module
 * iArchive du noyau administratif :
 *  - une pièce peut être une `correspondance`, un `document` ou un `dossier`
 *  - on stocke l'identifiant de l'item en string (`itemRefId`) pour ne pas
 *    coupler la table à un seul type d'item (les correspondance, documents et
 *    dossiers vivent dans des tables différentes).
 *  - le legal hold (verrou juridique) empêche toute destruction, même après
 *    expiration de la rétention.
 *  - workflow de destruction en 2 temps : `destructionRequestedAt` puis
 *    `destructionApprovedByUserId` + `destroyedAt`.
 *
 * Cf. moduleCodes.ts (capacités "retention", "lock", "audit", "destruction")
 * et taskCodes.ts (iarchive.* — view, deposit, search, lock, destruct, …).
 */
export const iArchiveRecordsTable = defineTable({
  // ─── Scope ──────────────────────────────────────────────────────
  /** Organisation propriétaire de la pièce archivée. */
  orgId: v.id("orgs"),

  // ─── Item archivé ───────────────────────────────────────────────
  /** Nature de la pièce archivée — détermine la table d'origine. */
  itemKind: v.union(
    v.literal("correspondance"),
    v.literal("document"),
    v.literal("dossier"),
  ),
  /**
   * Identifiant de l'item dans sa table d'origine, sérialisé en string pour
   * tolérer les `Id<"correspondanceItems">`, `Id<"documents">`,
   * `Id<"dossierProcedures">`, etc. sans coupler le schéma.
   */
  itemRefId: v.string(),

  // ─── Dépôt ──────────────────────────────────────────────────────
  archivedAt: v.number(),
  archivedByUserId: v.id("users"),

  // ─── Rétention ──────────────────────────────────────────────────
  /**
   * Timestamp d'expiration de la rétention. Au-delà, la pièce peut entrer en
   * workflow de destruction. Optionnel : si null, la pièce reste archivée
   * indéfiniment jusqu'à action manuelle.
   */
  retentionUntil: v.optional(v.number()),
  /**
   * Verrouillage juridique : tant que `legalHold === true`, la pièce ne peut
   * pas être détruite, même après expiration de la rétention.
   */
  legalHold: v.optional(v.boolean()),

  // ─── Workflow de destruction ────────────────────────────────────
  destructionRequestedAt: v.optional(v.number()),
  destructionRequestedByUserId: v.optional(v.id("users")),
  destructionApprovedByUserId: v.optional(v.id("users")),
  destroyedAt: v.optional(v.number()),

  // ─── Métadonnées libres ─────────────────────────────────────────
  /**
   * Métadonnées additionnelles (catégorie de rétention, motif d'archivage,
   * référence dossier, etc.). `v.any()` pour rester souple en MVP — sera
   * structuré en Phase ultérieure.
   */
  metadata: v.optional(v.any()),
})
  .index("by_org_archivedAt", ["orgId", "archivedAt"])
  .index("by_org_itemKind", ["orgId", "itemKind"])
  .index("by_retentionUntil", ["retentionUntil"])
  .index("by_org_destroyedAt", ["orgId", "destroyedAt"]);
