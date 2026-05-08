/**
 * Helper d'audit pour le module Renseignement souverain.
 *
 * Tout accès (lecture sensible, mutation, refus) doit produire une ligne
 * dans `intelligenceAuditLog`. La table est cloisonnée — aucune query
 * hors-périmètre ne la lit.
 *
 * Usage type :
 *   await logIntelAccess(ctx, {
 *     orgId,
 *     actorId: user._id,
 *     action: "profiles.search",
 *     metadata: { query: args.query, types: args.types },
 *     outcome: "success",
 *   });
 *
 * Pour les refus (assertCallerIsIntelAgency throw, etc.), on n'écrit pas
 * — la garde court-circuite avant. Si on veut tracer les tentatives
 * refusées (recommandé pour la détection d'abus), wrap l'appel avec
 * try/catch + `logIntelAccess(..., { outcome: "denied" })`.
 */

import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type WriteCtx = GenericMutationCtx<DataModel>;
type ReadCtx = GenericQueryCtx<DataModel>;

export type IntelTargetType =
	| "profile"
	| "child_profile"
	| "diplomatic_target"
	| "agent"
	| "case"
	| "note"
	| "watchlist"
	| "link"
	| "alert"
	| "alertRule"
	| "query";

export type IntelClassification =
	| "internal"
	| "restricted"
	| "secret"
	| "top_secret";

export type IntelOutcome = "success" | "denied" | "error";

export interface LogIntelAccessArgs {
	orgId: Id<"orgs">;
	actorId: Id<"users">;
	actorMembershipId?: Id<"memberships">;
	action: string; // ex: "profiles.search", "notes.create"
	targetType?: IntelTargetType;
	targetId?: string;
	caseId?: string;
	classification?: IntelClassification;
	metadata?: unknown;
	outcome: IntelOutcome;
	errorMessage?: string;
}

/**
 * Écrit une ligne d'audit. Mutation only — un Convex query ne peut pas
 * écrire. Pour tracer les lectures, on appelle ce helper depuis une
 * mutation appariée (ex: `searchProfilesAndAudit` qui logue puis lit),
 * ou on accepte la limitation : seules les écritures sont auditées en
 * dur, et les requêtes sensibles passent par une mutation `track*`
 * appelée explicitement par le client avant la query.
 *
 * Pour la Phase 1, on instrumente uniquement les mutations (notes,
 * watchlists, links, cases, alerts). Les lectures restent dans
 * l'auditLog Convex global.
 */
export async function logIntelAccess(
	ctx: WriteCtx,
	args: LogIntelAccessArgs,
): Promise<Id<"intelligenceAuditLog">> {
	return await ctx.db.insert("intelligenceAuditLog", {
		orgId: args.orgId,
		action: args.action,
		actorId: args.actorId,
		actorMembershipId: args.actorMembershipId,
		targetType: args.targetType,
		targetId: args.targetId,
		caseId: args.caseId,
		classification: args.classification,
		metadata: args.metadata,
		outcome: args.outcome,
		errorMessage: args.errorMessage,
		timestamp: Date.now(),
	});
}

/**
 * Lit le journal d'audit pour un org donné, avec pagination.
 * À utiliser exclusivement depuis le module renseignement (assertions
 * appliquées côté handler appelant).
 */
export async function listIntelAuditLog(
	ctx: ReadCtx,
	orgId: Id<"orgs">,
	limit = 100,
) {
	return await ctx.db
		.query("intelligenceAuditLog")
		.withIndex("by_org_timestamp", (q) => q.eq("orgId", orgId))
		.order("desc")
		.take(limit);
}
