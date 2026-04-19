/**
 * AI Suggestions Schema
 *
 * Stocke les suggestions proactives generees par l'agent IA.
 * Une suggestion = une intervention pertinente proposee a un agent
 * pour une cible (request, document, courrier, dossier, etc.).
 *
 * Lifecycle :
 *   pending -> accepted | dismissed | expired | auto_applied
 *
 * Toutes les suggestions sont scopees par orgId (isolation tenant)
 * et membershipId (visible uniquement par l'agent destinataire).
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

/** Action proposee par l'IA — declenche une mutation Convex existante. */
export const proposedActionValidator = v.object({
  /** Label affiche dans l'UI (ex: "Appliquer ce statut") */
  label: v.string(),
  /** Type d'action : determine le rendu UI et la mutation a appeler */
  kind: v.union(
    v.literal("update_status"),
    v.literal("add_comment"),
    v.literal("create_document"),
    v.literal("update_field"),
    v.literal("send_notification"),
    v.literal("navigate"),
    v.literal("custom"),
  ),
  /** Mutation Convex a appeler (path complet, ex: "functions.requests:updateStatus") */
  mutationPath: v.optional(v.string()),
  /** Arguments serialises a passer a la mutation */
  mutationArgs: v.optional(v.any()),
  /** Severite visuelle pour UI (primary/secondary/destructive) */
  variant: v.optional(v.union(
    v.literal("primary"),
    v.literal("secondary"),
    v.literal("destructive"),
  )),
});

export const aiSuggestionsTable = defineTable({
  // ─── Scope ───────────────────────────────────────────────
  orgId: v.id("orgs"),
  membershipId: v.id("memberships"),
  userId: v.id("users"),

  // ─── Source IA ───────────────────────────────────────────
  /** Code de la capability qui a genere la suggestion */
  capabilityCode: v.string(),
  /** Modele LLM utilise (gemini-2.5-flash, claude-sonnet-4.6, etc.) */
  model: v.string(),

  // ─── Contenu ─────────────────────────────────────────────
  /** Priorite (impact UX : urgent = toast immediat, low = panel only) */
  priority: v.union(
    v.literal("low"),
    v.literal("medium"),
    v.literal("high"),
    v.literal("urgent"),
  ),
  title: v.string(),
  body: v.string(),
  /** Contenu structure additionnel (diff, JSON, etc.) */
  metadata: v.optional(v.any()),

  // ─── Cible (entite concernee) ────────────────────────────
  /** Type de l'entite cible (request, document, correspondance, etc.) */
  targetType: v.string(),
  /** ID Convex de la cible (sous forme string pour generaliser) */
  targetId: v.optional(v.string()),
  /** Route deep-link vers la cible (ex: /requests/abc123) */
  targetRoute: v.optional(v.string()),

  // ─── Actions proposees ───────────────────────────────────
  proposedActions: v.array(proposedActionValidator),

  // ─── Statut ──────────────────────────────────────────────
  status: v.union(
    v.literal("pending"),
    v.literal("accepted"),
    v.literal("dismissed"),
    v.literal("expired"),
    v.literal("auto_applied"),
    v.literal("error"),
  ),
  /** Timestamp d'expiration (auto-expire via cron) */
  expiresAt: v.number(),
  /** Timestamp de resolution (acceptation/rejet/auto-apply) */
  resolvedAt: v.optional(v.number()),
  /** Action specifiquement choisie (index dans proposedActions) */
  resolvedActionIndex: v.optional(v.number()),

  createdAt: v.number(),
})
  .index("by_membership_status", ["membershipId", "status"])
  .index("by_membership_target", ["membershipId", "targetType", "targetId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_org_priority", ["orgId", "priority"])
  .index("by_target", ["targetType", "targetId"])
  .index("by_capability", ["capabilityCode"])
  .index("by_expires", ["expiresAt"]);
