/**
 * Thin permission helpers for the document template / generation / signature
 * pipeline.
 *
 * Each helper delegates to `canDoTask` using a specific task code, but the
 * named wrappers make call-sites more readable and centralize the policy.
 * Super admins always pass every check (handled inside `canDoTask`).
 */

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { canDoTask, isSuperAdmin } from "./permissions";
import { TaskCode } from "./taskCodes";
import { error, ErrorCode } from "./errors";

type AuthContext = QueryCtx | MutationCtx;

/** Can this user edit templates for their organization? */
export function canManageTemplates(
	ctx: AuthContext,
	user: Doc<"users">,
	membership: Doc<"memberships"> | null | undefined,
): Promise<boolean> {
	return canDoTask(ctx, user, membership, TaskCode.documents.manage_templates);
}

/** Only platform super admins can touch the global template library. */
export function canManageGlobalTemplates(user: Doc<"users">): boolean {
	return isSuperAdmin(user);
}

/** Can this user sign officially a generated document? */
export function canSignDocuments(
	ctx: AuthContext,
	user: Doc<"users">,
	membership: Doc<"memberships"> | null | undefined,
): Promise<boolean> {
	return canDoTask(ctx, user, membership, TaskCode.documents.sign);
}

/** Can this user publish a generated document to the citizen? */
export function canPublishDocuments(
	ctx: AuthContext,
	user: Doc<"users">,
	membership: Doc<"memberships"> | null | undefined,
): Promise<boolean> {
	return canDoTask(ctx, user, membership, TaskCode.documents.publish);
}

/** Can this user trigger PDF generation from a template (existing task code)? */
export function canGenerateDocuments(
	ctx: AuthContext,
	user: Doc<"users">,
	membership: Doc<"memberships"> | null | undefined,
): Promise<boolean> {
	return canDoTask(ctx, user, membership, TaskCode.documents.generate);
}

/** Throw a Forbidden error unless `canManageTemplates` resolves to true. */
export async function assertCanManageTemplates(
	ctx: AuthContext,
	user: Doc<"users">,
	membership: Doc<"memberships"> | null | undefined,
): Promise<void> {
	if (!(await canManageTemplates(ctx, user, membership))) {
		throw error(ErrorCode.FORBIDDEN, "Gestion des modèles de documents refusée");
	}
}

/** Throw unless the user is a platform super admin (global library ops). */
export function assertCanManageGlobalTemplates(user: Doc<"users">): void {
	if (!canManageGlobalTemplates(user)) {
		throw error(ErrorCode.FORBIDDEN, "Super-admin requis pour la bibliothèque globale");
	}
}

/** Throw unless the user can sign. */
export async function assertCanSignDocuments(
	ctx: AuthContext,
	user: Doc<"users">,
	membership: Doc<"memberships"> | null | undefined,
): Promise<void> {
	if (!(await canSignDocuments(ctx, user, membership))) {
		throw error(ErrorCode.FORBIDDEN, "Signature de document non autorisée");
	}
}

/** Throw unless the user can publish. */
export async function assertCanPublishDocuments(
	ctx: AuthContext,
	user: Doc<"users">,
	membership: Doc<"memberships"> | null | undefined,
): Promise<void> {
	if (!(await canPublishDocuments(ctx, user, membership))) {
		throw error(ErrorCode.FORBIDDEN, "Publication de document non autorisée");
	}
}

/** Throw unless the user can generate documents. */
export async function assertCanGenerateDocuments(
	ctx: AuthContext,
	user: Doc<"users">,
	membership: Doc<"memberships"> | null | undefined,
): Promise<void> {
	if (!(await canGenerateDocuments(ctx, user, membership))) {
		throw error(ErrorCode.FORBIDDEN, "Génération de document non autorisée");
	}
}

/**
 * For a template being signed, check that the user's current position is in
 * the template's `allowedSignerPositions` whitelist (when that list is set).
 */
export async function assertPositionAllowedToSign(
	ctx: AuthContext,
	membership: Doc<"memberships">,
	template: Doc<"documentTemplates">,
): Promise<void> {
	const allowed = template.allowedSignerPositions;
	if (!allowed || allowed.length === 0) return; // no restriction
	if (!membership.positionId) {
		throw error(ErrorCode.FORBIDDEN, "Aucune position assignée pour signer");
	}
	const position = await ctx.db.get(membership.positionId);
	if (!position || !position.isActive) {
		throw error(ErrorCode.FORBIDDEN, "Position inactive ou introuvable");
	}
	const code = (position as unknown as { code?: string }).code;
	if (!code || !allowed.includes(code)) {
		throw error(ErrorCode.FORBIDDEN, "Votre position n'est pas habilitée à signer ce modèle");
	}
}
