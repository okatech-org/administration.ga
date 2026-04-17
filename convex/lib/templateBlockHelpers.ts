/**
 * Helpers partagés par les 3 CRUD de briques composables de template.
 *
 * Les 3 tables (`templateHeaderFooterBlocks`, `templateTypographyBlocks`,
 * `templateVoiceBlocks`) ont le même cycle de vie : scope global / org,
 * permissions alignées, flag `isDefault` unique par scope. Ce module
 * centralise la logique transverse.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import {
	assertCanManageGlobalTemplates,
	assertCanManageTemplates,
} from "./documentPermissions";
import { error, ErrorCode } from "./errors";

export type TemplateBlockTable =
	| "templateHeaderFooterBlocks"
	| "templateTypographyBlocks"
	| "templateVoiceBlocks";

type AnyBlock =
	| Doc<"templateHeaderFooterBlocks">
	| Doc<"templateTypographyBlocks">
	| Doc<"templateVoiceBlocks">;

/**
 * Vérifie que l'utilisateur courant peut éditer le bloc : super-admin pour
 * un bloc global, `documents.manage_templates` pour un bloc d'organisation.
 */
export async function assertBlockPermission(
	ctx: MutationCtx & { user: Doc<"users"> },
	block: AnyBlock,
): Promise<void> {
	if (block.isGlobal) {
		assertCanManageGlobalTemplates(ctx.user);
		return;
	}
	if (!block.orgId) {
		throw error(ErrorCode.FORBIDDEN, "Bloc sans organisation");
	}
	const membership = await ctx.db
		.query("memberships")
		.withIndex("by_user_org", (q) =>
			q.eq("userId", ctx.user._id).eq("orgId", block.orgId as Id<"orgs">),
		)
		.first();
	await assertCanManageTemplates(ctx, ctx.user, membership);
}

/**
 * Vérifie les permissions pour créer un bloc dans le scope demandé. Retourne
 * l'objet prêt à être inséré avec `createdBy` enrichi.
 */
export async function assertCanCreateBlock(
	ctx: MutationCtx & { user: Doc<"users"> },
	args: { isGlobal: boolean; orgId?: Id<"orgs"> },
): Promise<void> {
	if (args.isGlobal) {
		assertCanManageGlobalTemplates(ctx.user);
		return;
	}
	if (!args.orgId) {
		throw error(ErrorCode.VALIDATION_ERROR, "orgId requis pour un bloc non global");
	}
	const membership = await ctx.db
		.query("memberships")
		.withIndex("by_user_org", (q) =>
			q.eq("userId", ctx.user._id).eq("orgId", args.orgId as Id<"orgs">),
		)
		.first();
	await assertCanManageTemplates(ctx, ctx.user, membership);
}

/**
 * Retire le flag `isDefault` des autres blocs du même scope (global ou org)
 * dans la même table. Un seul bloc par défaut à la fois.
 */
export async function clearExistingDefault(
	ctx: MutationCtx,
	table: TemplateBlockTable,
	opts: { isGlobal: boolean; orgId?: Id<"orgs"> },
): Promise<void> {
	const blocks = opts.isGlobal
		? await ctx.db
				.query(table)
				.withIndex("by_global", (q) =>
					q.eq("isGlobal", true).eq("isActive", true),
				)
				.collect()
		: opts.orgId
			? await ctx.db
					.query(table)
					.withIndex("by_org", (q) =>
						q.eq("orgId", opts.orgId as Id<"orgs">).eq("isActive", true),
					)
					.collect()
			: [];
	for (const b of blocks) {
		if (b.isDefault) {
			await ctx.db.patch(b._id, { isDefault: false });
		}
	}
}
