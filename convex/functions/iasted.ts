/**
 * iAsted — Module Assistant IA institutionnel (Phase 5, MVP).
 *
 * iAsted est déjà largement implémenté dans `convex/ai/*` (realtimeTools,
 * realtimeToken, RAG, voice, etc.). Le rôle de ce fichier en Phase 5 est de
 * fournir au backoffice (et aux agents) une API simple pour :
 *  - `getStatus`        : connaître l'état d'activation pour l'org du caller
 *  - `recordInvocation` : journaliser une invocation dans la table
 *                         `aiActivityLog` existante (append-only).
 *
 * Le pilotage du module (persona, prompt, tools policy, …) reste
 * `orgIAstedConfig.ts`. Ce fichier ne duplique pas cette config — il
 * l'expose pour le module-gating et il ouvre un canal d'audit minimal.
 */

import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { TaskCode } from "../lib/taskCodes";

/**
 * Statut d'activation iAsted pour une org donnée. Le module est considéré
 * "activé" si :
 *   - le code "iasted" figure dans `orgs.modules`, OU
 *   - une configuration `orgIAstedConfig.isActive === true` existe pour
 *     cette org (compat héritée du dispositif diplomatique).
 *
 * `configuredAt` correspond au `updatedAt` de la config si présente,
 * `lastUsedAt` au timestamp du dernier log dans `aiActivityLog`.
 */
export const getStatus = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    // `iasted.view` est dans MODULE_ACCESS_TASKS → contrôle d'accès standard.
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.iasted.view);

    const org = await ctx.db.get(args.orgId);
    const orgEnabled =
      org?.modules?.includes("iasted") === true;

    const config = await ctx.db
      .query("orgIAstedConfig")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    const configActive = config?.isActive === true;

    // Dernier log d'activité IA pour cette org (toutes capabilities
    // confondues). Le module iAsted réutilise l'`aiActivityLog` existant.
    const lastActivity = await ctx.db
      .query("aiActivityLog")
      .withIndex("by_org_timestamp", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .first();

    return {
      enabled: orgEnabled || configActive,
      sources: {
        orgModule: orgEnabled,
        orgConfig: configActive,
      },
      configuredAt: config?.updatedAt,
      lastUsedAt: lastActivity?.timestamp,
    };
  },
});

/**
 * Journalise une invocation iAsted dans `aiActivityLog`. Append-only.
 *
 * Utilisable par les surfaces (citizen-web, agent-web, backoffice-web) après
 * un round-trip réussi avec l'assistant. Le détail des coûts/tokens reste
 * optionnel — en MVP, seul `capabilityCode` est requis (ex: "iasted.chat",
 * "iasted.voice", "iasted.rag"). Volontairement souple pour ne pas bloquer
 * la phase ultérieure d'instrumentation fine.
 */
export const recordInvocation = authMutation({
  args: {
    orgId: v.id("orgs"),
    capabilityCode: v.string(),
    model: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    costMicroCents: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const membership = await getMembership(ctx, ctx.user._id, args.orgId);
    // `iasted.invoke` est gating-équivalent à "utiliser le module".
    await assertCanDoTask(ctx, ctx.user, membership, TaskCode.iasted.invoke);

    const logId = await ctx.db.insert("aiActivityLog", {
      orgId: args.orgId,
      membershipId: membership?._id,
      userId: ctx.user._id,
      capabilityCode: args.capabilityCode,
      action: "accepted", // une invocation acceptée = succès du round-trip
      model: args.model,
      latencyMs: args.latencyMs,
      tokensIn: args.tokensIn,
      tokensOut: args.tokensOut,
      costMicroCents: args.costMicroCents,
      metadata: args.metadata,
      timestamp: Date.now(),
    });

    return { logId };
  },
});
