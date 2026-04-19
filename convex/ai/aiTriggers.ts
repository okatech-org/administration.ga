/**
 * Trigger callbacks pour le module ai_assistant.
 *
 * Chaque fonction est enregistree dans `convex/triggers/index.ts` via
 * `triggers.register(tableName, handler)`.
 *
 * Responsabilite : filtres *rule-based* peu couteux + scheduling de
 * `internal.ai.dispatcher.dispatchEvent` via `ctx.scheduler.runAfter(0, ...)`.
 *
 * Ne PAS appeler de LLM ici directement (on est dans une mutation transactionnelle).
 * Ne PAS faire de travail lourd — juste enqueue le dispatcher.
 */

import type { MutationCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";

// Le type de change exposable par convex-helpers triggers
interface Change<T> {
  id: any;
  operation: "insert" | "update" | "delete";
  newDoc: T | null;
  oldDoc: T | null;
}

async function isAIAssistantActiveOnOrg(
  ctx: MutationCtx,
  orgId: Id<"orgs">,
): Promise<boolean> {
  const org = await ctx.db.get(orgId);
  if (!org || !org.modules) return false;
  return org.modules.includes("ai_assistant" as never);
}

// ═══════════════════════════════════════════════════════════════
// REQUESTS — triage sur nouveaux statuts, alerte sur idle
// ═══════════════════════════════════════════════════════════════

export async function onRequestChanged(
  ctx: MutationCtx,
  change: Change<Doc<"requests">>,
) {
  if (change.operation === "delete") return;
  if (!change.newDoc) return;

  const req = change.newDoc;
  if (!(await isAIAssistantActiveOnOrg(ctx, req.orgId))) return;

  const statusChanged =
    change.operation === "update" &&
    change.oldDoc &&
    change.oldDoc.status !== req.status;

  const isNew = change.operation === "insert";

  if (!statusChanged && !isNew) return;

  if (!req.assignedTo) return;
  const membership = await ctx.db.get(req.assignedTo as Id<"memberships">);
  if (!membership || (membership as any).deletedAt) return;

  const hints: string[] = [
    `status:${req.status}`,
    isNew ? "event:new_request" : `status_changed_from:${change.oldDoc?.status}`,
  ];

  const summary = `Request ${req._id} type=${(req as any).type ?? "?"} status=${req.status}`;

  await ctx.scheduler.runAfter(0, internal.ai.dispatcher.dispatchEvent, {
    orgId: req.orgId,
    membershipId: membership._id,
    userId: membership.userId,
    eventType: isNew ? "request.created" : "request.statusChanged",
    entityType: "request",
    entityId: req._id,
    entitySummary: summary,
    contextHints: hints,
  });
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENTS — analyse automatique sur upload
// ═══════════════════════════════════════════════════════════════

export async function onDocumentUploaded(
  ctx: MutationCtx,
  change: Change<Doc<"documents">>,
) {
  if (change.operation !== "insert") return;
  if (!change.newDoc) return;
  const doc = change.newDoc;

  const orgId = (doc as any).orgId as Id<"orgs"> | undefined;
  if (!orgId) return;
  if (!(await isAIAssistantActiveOnOrg(ctx, orgId))) return;

  const requestId = (doc as any).requestId as Id<"requests"> | undefined;
  if (!requestId) return;

  const request = await ctx.db.get(requestId);
  if (!request || !request.assignedTo) return;
  const membership = await ctx.db.get(request.assignedTo as Id<"memberships">);
  if (!membership || (membership as any).deletedAt) return;

  await ctx.scheduler.runAfter(0, internal.ai.dispatcher.dispatchEvent, {
    orgId,
    membershipId: membership._id,
    userId: membership.userId,
    eventType: "document.uploaded",
    entityType: "document",
    entityId: doc._id,
    entitySummary: `Document uploaded: name=${(doc as any).name ?? (doc as any).filename ?? "?"} type=${(doc as any).type ?? "?"}`,
    contextHints: [`request:${requestId}`],
    overrideCapabilityCode: "document_analysis",
  });
}

// ═══════════════════════════════════════════════════════════════
// CORRESPONDANCE — offre de brouillon sur creation
// ═══════════════════════════════════════════════════════════════

export async function onCorrespondanceCreated(
  ctx: MutationCtx,
  change: Change<Doc<"correspondanceItems">>,
) {
  if (change.operation !== "insert") return;
  if (!change.newDoc) return;
  const item = change.newDoc;

  const orgId = (item as any).orgId as Id<"orgs"> | undefined;
  if (!orgId) return;
  if (!(await isAIAssistantActiveOnOrg(ctx, orgId))) return;

  const createdByUserId = (item as any).createdByUserId as Id<"users"> | undefined;
  if (!createdByUserId) return;

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_org_deletedAt", (q) =>
      q.eq("userId", createdByUserId).eq("orgId", orgId).eq("deletedAt", undefined),
    )
    .unique();
  if (!membership) return;

  await ctx.scheduler.runAfter(0, internal.ai.dispatcher.dispatchEvent, {
    orgId,
    membershipId: membership._id,
    userId: createdByUserId,
    eventType: "correspondance.created",
    entityType: "correspondance",
    entityId: item._id,
    entitySummary: `Correspondance ${(item as any).direction ?? "?"} subject=${(item as any).subject ?? "?"} type=${(item as any).type ?? "?"}`,
    overrideCapabilityCode: "correspondance_drafting",
  });
}

// ═══════════════════════════════════════════════════════════════
// APPOINTMENTS — briefing avant reunion
// ═══════════════════════════════════════════════════════════════

export async function onAppointmentScheduled(
  ctx: MutationCtx,
  change: Change<Doc<"appointments">>,
) {
  if (change.operation === "delete") return;
  if (!change.newDoc) return;
  const appt = change.newDoc;

  const orgId = (appt as any).orgId as Id<"orgs"> | undefined;
  if (!orgId) return;
  if (!(await isAIAssistantActiveOnOrg(ctx, orgId))) return;

  const scheduledAt = (appt as any).startAt ?? (appt as any).scheduledAt;
  if (!scheduledAt) return;

  const hoursUntil = (scheduledAt - Date.now()) / 3_600_000;
  if (hoursUntil < 0 || hoursUntil > 4) return;

  const assignedTo = (appt as any).assignedTo as Id<"memberships"> | undefined;
  if (!assignedTo) return;
  const membership = await ctx.db.get(assignedTo);
  if (!membership || (membership as any).deletedAt) return;

  await ctx.scheduler.runAfter(0, internal.ai.dispatcher.dispatchEvent, {
    orgId,
    membershipId: membership._id,
    userId: membership.userId,
    eventType: "appointment.upcoming",
    entityType: "appointment",
    entityId: appt._id,
    entitySummary: `Appointment in ${hoursUntil.toFixed(1)}h title=${(appt as any).title ?? "?"}`,
  });
}

// ═══════════════════════════════════════════════════════════════
// AGENT PRESENCE — sur focus d'entite, propose aide contextuelle
// ═══════════════════════════════════════════════════════════════

export async function onContextUpdated(
  ctx: MutationCtx,
  change: Change<Doc<"aiAgentPresence">>,
) {
  // Ne pas traiter les updates a haute frequence — attend qu'une
  // entite soit consultee (entityType + entityId presents).
  if (change.operation !== "insert") return;
  if (!change.newDoc) return;

  const p = change.newDoc;
  if (!p.entityType || !p.entityId) return;
  if (!(await isAIAssistantActiveOnOrg(ctx, p.orgId))) return;

  await ctx.scheduler.runAfter(0, internal.ai.dispatcher.dispatchEvent, {
    orgId: p.orgId,
    membershipId: p.membershipId,
    userId: p.userId,
    eventType: "presence.focused",
    entityType: p.entityType,
    entityId: p.entityId,
    entitySummary: `Agent just focused on ${p.entityType} ${p.entityId} (route=${p.route})`,
    contextHints: [`focusedField:${p.focusedField ?? "-"}`, `currentAction:${p.currentAction ?? "-"}`],
  });
}
