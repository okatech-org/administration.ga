import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";
import { localizedStringValidator } from "../lib/validators";
import { canManageGlobalTemplates } from "../lib/documentPermissions";
import {
	assertBlockPermission,
	assertCanCreateBlock,
	clearExistingDefault,
} from "../lib/templateBlockHelpers";

/**
 * CRUD pour la brique « Entête / Pied de page » — réutilisable entre
 * plusieurs `documentTemplates`. Permissions : super-admin pour les blocs
 * globaux, `documents.manage_templates` pour les blocs d'une organisation.
 */

const templateTypesValidator = v.array(
	v.union(
		v.literal("certificate"),
		v.literal("attestation"),
		v.literal("receipt"),
		v.literal("letter"),
		v.literal("custom"),
	),
);

const headerValidator = v.object({
	logoStorageId: v.optional(v.id("_storage")),
	logoAlignment: v.union(
		v.literal("left"),
		v.literal("center"),
		v.literal("right"),
	),
	height: v.optional(v.number()),
	content: v.any(),
});

const footerValidator = v.object({
	height: v.optional(v.number()),
	content: v.any(),
	showPageNumbers: v.optional(v.boolean()),
});

// ============================================================================
// QUERIES
// ============================================================================

/** Blocs globaux — visibles au super-admin. */
export const listGlobal = authQuery({
	args: {},
	handler: async (ctx) => {
		if (!canManageGlobalTemplates(ctx.user)) return [];
		return await ctx.db
			.query("templateHeaderFooterBlocks")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();
	},
});

/** Blocs de l'organisation + blocs globaux (lecture seule côté org). */
export const listForOrg = authQuery({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		const orgBlocks = await ctx.db
			.query("templateHeaderFooterBlocks")
			.withIndex("by_org", (q) =>
				q.eq("orgId", args.orgId).eq("isActive", true),
			)
			.collect();
		const globals = await ctx.db
			.query("templateHeaderFooterBlocks")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();
		return [...orgBlocks, ...globals];
	},
});

export const getById = authQuery({
	args: { blockId: v.id("templateHeaderFooterBlocks") },
	handler: async (ctx, args) => ctx.db.get(args.blockId),
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = authMutation({
	args: {
		name: localizedStringValidator,
		description: v.optional(localizedStringValidator),
		applicableTemplateTypes: v.optional(templateTypesValidator),
		header: headerValidator,
		footer: footerValidator,
		orgId: v.optional(v.id("orgs")),
		isGlobal: v.boolean(),
		isDefault: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		await assertCanCreateBlock(ctx, { isGlobal: args.isGlobal, orgId: args.orgId });
		if (args.isDefault) {
			await clearExistingDefault(ctx, "templateHeaderFooterBlocks", {
				isGlobal: args.isGlobal,
				orgId: args.orgId,
			});
		}
		return await ctx.db.insert("templateHeaderFooterBlocks", {
			...args,
			createdBy: ctx.user._id,
			isActive: true,
			version: 1,
			updatedAt: Date.now(),
		});
	},
});

export const update = authMutation({
	args: {
		blockId: v.id("templateHeaderFooterBlocks"),
		name: v.optional(localizedStringValidator),
		description: v.optional(localizedStringValidator),
		applicableTemplateTypes: v.optional(templateTypesValidator),
		header: v.optional(headerValidator),
		footer: v.optional(footerValidator),
		isDefault: v.optional(v.boolean()),
		isActive: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const { blockId, ...updates } = args;
		const block = await ctx.db.get(blockId);
		if (!block) throw new Error("Bloc introuvable");
		await assertBlockPermission(ctx, block);

		if (updates.isDefault === true) {
			await clearExistingDefault(ctx, "templateHeaderFooterBlocks", {
				isGlobal: block.isGlobal,
				orgId: block.orgId,
			});
		}

		const cleanUpdates = Object.fromEntries(
			Object.entries(updates).filter(([, value]) => value !== undefined),
		);
		await ctx.db.patch(blockId, {
			...cleanUpdates,
			version: (block.version ?? 1) + 1,
			updatedAt: Date.now(),
		});
		return blockId;
	},
});

export const remove = authMutation({
	args: { blockId: v.id("templateHeaderFooterBlocks") },
	handler: async (ctx, args) => {
		const block = await ctx.db.get(args.blockId);
		if (!block) return false;
		await assertBlockPermission(ctx, block);
		await ctx.db.patch(args.blockId, { isActive: false, updatedAt: Date.now() });
		return true;
	},
});
