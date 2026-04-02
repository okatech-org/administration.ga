import { v } from "convex/values";
import { query } from "../_generated/server";
import { authMutation, authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";

/**
 * List all form templates available to an organization
 * Includes global templates and org-specific templates
 */
export const listByOrg = authQuery({
	args: {
		orgId: v.id("orgs"),
		category: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Get global templates
		const globalTemplates = await ctx.db
			.query("formTemplates")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();

		// Get org-specific templates
		const orgTemplates = await ctx.db
			.query("formTemplates")
			.withIndex("by_org", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
			.collect();

		let templates = [...globalTemplates, ...orgTemplates];

		// Filter by category if provided
		if (args.category) {
			templates = templates.filter((t) => t.category === args.category);
		}

		return templates;
	},
});

/**
 * Get a single template by ID
 */
export const getById = query({
	args: { templateId: v.id("formTemplates") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.templateId);
	},
});

/**
 * Create a new form template
 */
export const create = authMutation({
	args: {
		orgId: v.optional(v.id("orgs")),
		name: v.object({
			fr: v.string(),
			en: v.optional(v.string()),
		}),
		description: v.optional(
			v.object({
				fr: v.string(),
				en: v.optional(v.string()),
			})
		),
		category: v.optional(v.string()),
		schema: v.any(),
		isGlobal: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		// Only org admins can create templates for an org
		if (args.orgId) {
			const membership = await getMembership(ctx, ctx.user._id, args.orgId);
			await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");
		}

		return await ctx.db.insert("formTemplates", {
			name: args.name,
			description: args.description,
			category: args.category as any,
			schema: args.schema,
			orgId: args.orgId,
			createdBy: ctx.user._id,
			isGlobal: args.isGlobal ?? false,
			isActive: true,
			usageCount: 0,
			updatedAt: Date.now(),
		});
	},
});

/**
 * Update a form template
 */
export const update = authMutation({
	args: {
		templateId: v.id("formTemplates"),
		name: v.optional(
			v.object({
				fr: v.string(),
				en: v.optional(v.string()),
			})
		),
		description: v.optional(
			v.object({
				fr: v.string(),
				en: v.optional(v.string()),
			})
		),
		category: v.optional(v.string()),
		schema: v.optional(v.any()),
		isActive: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template) {
			throw error(ErrorCode.NOT_FOUND);
		}

		// Only org admins can update org templates
		if (template.orgId) {
			const membership = await getMembership(ctx, ctx.user._id, template.orgId);
			await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");
		}

		const { templateId, ...updates } = args;
		const cleanUpdates = Object.fromEntries(
			Object.entries(updates).filter(([_, v]) => v !== undefined)
		);

		await ctx.db.patch(templateId, {
			...cleanUpdates,
			updatedAt: Date.now(),
		});

		return templateId;
	},
});

/**
 * Delete (soft) a form template
 */
export const remove = authMutation({
	args: { templateId: v.id("formTemplates") },
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template) {
			throw error(ErrorCode.NOT_FOUND);
		}

		// Only org admins can delete org templates
		if (template.orgId) {
			const membership = await getMembership(ctx, ctx.user._id, template.orgId);
			await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");
		}

		await ctx.db.patch(args.templateId, { isActive: false });
		return args.templateId;
	},
});

/**
 * Increment usage count when a template is used
 */
export const incrementUsage = authMutation({
	args: { templateId: v.id("formTemplates") },
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template) return;

		await ctx.db.patch(args.templateId, {
			usageCount: (template.usageCount || 0) + 1,
		});
	},
});

/**
 * Duplicate a template for an organization
 */
export const duplicate = authMutation({
	args: {
		templateId: v.id("formTemplates"),
		targetOrgId: v.id("orgs"),
		newName: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template) {
			throw error(ErrorCode.NOT_FOUND);
		}

		const membership = await getMembership(ctx, ctx.user._id, args.targetOrgId);
		await assertCanDoTask(ctx, ctx.user, membership, "settings.manage");

		const newName = args.newName
			? { fr: args.newName, en: args.newName }
			: { fr: `${template.name.fr} (copie)`, en: template.name.en ? `${template.name.en} (copy)` : undefined };

		return await ctx.db.insert("formTemplates", {
			name: newName,
			description: template.description,
			category: template.category,
			schema: template.schema,
			orgId: args.targetOrgId,
			createdBy: ctx.user._id,
			isGlobal: false,
			isActive: true,
			usageCount: 0,
			updatedAt: Date.now(),
		});
	},
});
