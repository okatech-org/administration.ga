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
 * CRUD pour la brique « Typographie / Structure des textes ».
 */

const alignmentValidator = v.union(
	v.literal("left"),
	v.literal("center"),
	v.literal("right"),
	v.literal("justify"),
);

const headingStyleValidator = v.object({
	fontSize: v.number(),
	bold: v.boolean(),
	uppercase: v.boolean(),
	spacingBefore: v.optional(v.number()),
	spacingAfter: v.optional(v.number()),
	alignment: v.optional(alignmentValidator),
});

const headingStylesValidator = v.object({
	h1: headingStyleValidator,
	h2: headingStyleValidator,
	h3: headingStyleValidator,
});

// ============================================================================
// QUERIES
// ============================================================================

export const listGlobal = authQuery({
	args: {},
	handler: async (ctx) => {
		if (!canManageGlobalTemplates(ctx.user)) return [];
		return await ctx.db
			.query("templateTypographyBlocks")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();
	},
});

export const listForOrg = authQuery({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		const orgBlocks = await ctx.db
			.query("templateTypographyBlocks")
			.withIndex("by_org", (q) =>
				q.eq("orgId", args.orgId).eq("isActive", true),
			)
			.collect();
		const globals = await ctx.db
			.query("templateTypographyBlocks")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();
		return [...orgBlocks, ...globals];
	},
});

export const getById = authQuery({
	args: { blockId: v.id("templateTypographyBlocks") },
	handler: async (ctx, args) => ctx.db.get(args.blockId),
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = authMutation({
	args: {
		name: localizedStringValidator,
		description: v.optional(localizedStringValidator),
		fontFamily: v.string(),
		fontSizeBase: v.number(),
		lineHeight: v.number(),
		defaultAlignment: alignmentValidator,
		headingStyles: headingStylesValidator,
		paragraphSpacingBefore: v.optional(v.number()),
		paragraphSpacingAfter: v.optional(v.number()),
		paragraphFirstLineIndent: v.optional(v.number()),
		pageBreakBefore: v.optional(
			v.array(v.union(v.literal("h1"), v.literal("h2"), v.literal("h3"))),
		),
		widowOrphanControl: v.optional(v.boolean()),
		keepHeadingsWithNext: v.optional(v.boolean()),
		orgId: v.optional(v.id("orgs")),
		isGlobal: v.boolean(),
		isDefault: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		await assertCanCreateBlock(ctx, { isGlobal: args.isGlobal, orgId: args.orgId });
		if (args.isDefault) {
			await clearExistingDefault(ctx, "templateTypographyBlocks", {
				isGlobal: args.isGlobal,
				orgId: args.orgId,
			});
		}
		return await ctx.db.insert("templateTypographyBlocks", {
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
		blockId: v.id("templateTypographyBlocks"),
		name: v.optional(localizedStringValidator),
		description: v.optional(localizedStringValidator),
		fontFamily: v.optional(v.string()),
		fontSizeBase: v.optional(v.number()),
		lineHeight: v.optional(v.number()),
		defaultAlignment: v.optional(alignmentValidator),
		headingStyles: v.optional(headingStylesValidator),
		paragraphSpacingBefore: v.optional(v.number()),
		paragraphSpacingAfter: v.optional(v.number()),
		paragraphFirstLineIndent: v.optional(v.number()),
		pageBreakBefore: v.optional(
			v.array(v.union(v.literal("h1"), v.literal("h2"), v.literal("h3"))),
		),
		widowOrphanControl: v.optional(v.boolean()),
		keepHeadingsWithNext: v.optional(v.boolean()),
		isDefault: v.optional(v.boolean()),
		isActive: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const { blockId, ...updates } = args;
		const block = await ctx.db.get(blockId);
		if (!block) throw new Error("Bloc introuvable");
		await assertBlockPermission(ctx, block);

		if (updates.isDefault === true) {
			await clearExistingDefault(ctx, "templateTypographyBlocks", {
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
	args: { blockId: v.id("templateTypographyBlocks") },
	handler: async (ctx, args) => {
		const block = await ctx.db.get(args.blockId);
		if (!block) return false;
		await assertBlockPermission(ctx, block);
		await ctx.db.patch(args.blockId, { isActive: false, updatedAt: Date.now() });
		return true;
	},
});
