/**
 * Internal queries pour capability handlers.
 *
 * Chaque capability peut appeler ces queries via ctx.runQuery pour
 * recuperer une vue minimale et anonymisee d'une entite cible.
 *
 * Les donnees retournees doivent etre safe pour envoi LLM :
 *   - Pas d'emails, numeros, dates de naissance en clair
 *   - Noms propres masques via securityGuardian (quand dispo)
 *   - Seuls les champs utiles pour la capability
 */

import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

export const getRequestForTriage = internalQuery({
  args: {
    requestId: v.id("requests"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, { requestId, orgId }) => {
    const request = await ctx.db.get(requestId);
    if (!request) return null;
    if (request.orgId !== orgId) return null;

    const documentIds = (request as any).documents as
      | Array<typeof request._id>
      | undefined;
    const documentCount = Array.isArray(documentIds) ? documentIds.length : 0;

    return {
      _id: request._id,
      status: request.status,
      type: (request as any).type ?? (request as any).formTemplateCode ?? null,
      createdAt: request._creationTime,
      assignedTo: (request as any).assignedTo ?? null,
      documentCount,
      summary: (request as any).summary ?? (request as any).description ?? null,
    };
  },
});

export const getDocumentForAnalysis = internalQuery({
  args: {
    documentId: v.id("documents"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, { documentId, orgId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) return null;
    if ((doc as any).orgId && (doc as any).orgId !== orgId) return null;

    return {
      _id: doc._id,
      name: (doc as any).name ?? (doc as any).filename ?? "(sans nom)",
      type: (doc as any).type ?? (doc as any).mimeType ?? "unknown",
      size: (doc as any).size ?? 0,
      uploadedAt: doc._creationTime,
      extractedText: ((doc as any).extractedText as string | undefined)?.slice(0, 5000),
      metadata: (doc as any).metadata ?? null,
    };
  },
});

export const getCorrespondanceForDrafting = internalQuery({
  args: {
    correspondanceId: v.id("correspondanceItems"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, { correspondanceId, orgId }) => {
    const item = await ctx.db.get(correspondanceId);
    if (!item) return null;
    if ((item as any).orgId && (item as any).orgId !== orgId) return null;

    return {
      _id: item._id,
      subject: (item as any).subject ?? "(sans objet)",
      type: (item as any).type ?? "letter",
      direction: (item as any).direction ?? "outbound",
      status: (item as any).status ?? "draft",
      language: (item as any).language ?? "fr",
      body: ((item as any).body as string | undefined)?.slice(0, 3000),
    };
  },
});

export const getDiplomaticTargetForAnalysis = internalQuery({
  args: {
    targetId: v.id("diplomaticTargets"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, { targetId, orgId }) => {
    const t = await ctx.db.get(targetId);
    if (!t) return null;
    if ((t as any).orgId && (t as any).orgId !== orgId) return null;

    return {
      _id: t._id,
      name: t.name,
      type: t.type,
      country: t.country,
      status: t.status,
      pipelinePhase: t.pipelinePhase ?? null,
      description: t.description?.slice(0, 1500),
    };
  },
});

export const getDossierProcedureForNextStep = internalQuery({
  args: {
    dossierId: v.id("dossierProcedures"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, { dossierId, orgId }) => {
    const d = await ctx.db.get(dossierId);
    if (!d) return null;
    if ((d as any).orgId && (d as any).orgId !== orgId) return null;

    const transitions = await ctx.db
      .query("dossierTransitions")
      .withIndex("by_dossier", (q) => q.eq("dossierId", dossierId))
      .order("desc")
      .take(5);

    return {
      _id: d._id,
      statut: (d as any).statut ?? null,
      currentStep: (d as any).currentStep ?? null,
      typeDemarche: (d as any).typeDemarche ?? null,
      createdAt: d._creationTime,
      recentTransitions: transitions.map((t) => ({
        from: (t as any).from ?? null,
        to: (t as any).to ?? null,
        at: t._creationTime,
      })),
    };
  },
});

export const getMeetingForPrep = internalQuery({
  args: {
    meetingId: v.id("meetings"),
    orgId: v.id("orgs"),
  },
  handler: async (ctx, { meetingId, orgId }) => {
    const m = await ctx.db.get(meetingId);
    if (!m) return null;
    if ((m as any).orgId && (m as any).orgId !== orgId) return null;

    return {
      _id: m._id,
      title: (m as any).title ?? "(sans titre)",
      scheduledAt: (m as any).scheduledAt ?? null,
      description: ((m as any).description as string | undefined)?.slice(0, 2000),
      participants: (m as any).participants ?? [],
    };
  },
});
