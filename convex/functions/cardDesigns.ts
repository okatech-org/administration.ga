import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all card designs for an organization
 */
export const listByOrg = authQuery({
	args: {
		orgId: v.id("orgs"),
	},
	handler: async (ctx, args) => {
		const designs = await ctx.db
			.query("cardDesigns")
			.withIndex("by_org", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
			.collect();

		// Return elements for preview, but strip heavy base64 imageData
		return designs.map((d) => ({
			_id: d._id,
			_creationTime: d._creationTime,
			name: d.name,
			description: d.description,
			backgroundColor: d.backgroundColor,
			backgroundOpacity: d.backgroundOpacity,
			frontElements: d.frontElements.map((el: any) => ({
				...el,
				imageData: el.imageData ? "__has_image__" : null,
			})),
			backElements: d.backElements.map((el: any) => ({
				...el,
				imageData: el.imageData ? "__has_image__" : null,
			})),
			printDuplex: d.printDuplex,
			version: d.version,
			updatedAt: d.updatedAt,
			createdBy: d.createdBy,
		}));
	},
});

/**
 * Get a single card design by ID (full data for the editor)
 */
export const getById = authQuery({
	args: { designId: v.id("cardDesigns") },
	handler: async (ctx, args) => {
		const design = await ctx.db.get(args.designId);
		if (!design || !design.isActive) return null;
		return design;
	},
});

/**
 * Get the org's default card design (single-design-per-org model).
 * Resolves via org.settings.defaultCardDesignId with fallback to first active design.
 * Returns the full design (backgrounds, elements with imageData) so any client
 * can render it faithfully — same source of truth as the desktop printer.
 */
export const getByOrg = authQuery({
	args: {
		orgId: v.id("orgs"),
	},
	handler: async (ctx, args) => {
		const org = await ctx.db.get(args.orgId);
		if (!org) return null;

		// Try the configured default design first
		let design = null;
		if (org.settings?.defaultCardDesignId) {
			const d = await ctx.db.get(org.settings.defaultCardDesignId);
			if (d && d.isActive) design = d;
		}

		// Fallback: first active design for this org
		if (!design) {
			design = await ctx.db
				.query("cardDesigns")
				.withIndex("by_org", (q) =>
					q.eq("orgId", args.orgId).eq("isActive", true),
				)
				.first();
		}

		if (!design) return null;

		return design;
	},
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new card design
 */
export const create = authMutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		orgId: v.id("orgs"),
		// Template data
		backgroundColor: v.string(),
		frontBackgroundImage: v.union(v.string(), v.null()),
		backBackgroundImage: v.union(v.string(), v.null()),
		backgroundOpacity: v.number(),
		frontElements: v.any(), // validated by schema, complex nested
		backElements: v.any(),
		printDuplex: v.boolean(),
		magneticTracks: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = ctx.user._id;

		const id = await ctx.db.insert("cardDesigns", {
			...args,
			createdBy: userId,
			isActive: true,
			version: 1,
			updatedAt: Date.now(),
		});

		// Auto-set as org's default design if none configured
		const org = await ctx.db.get(args.orgId);
		if (org?.settings && !org.settings.defaultCardDesignId) {
			await ctx.db.patch(args.orgId, {
				settings: { ...org.settings, defaultCardDesignId: id },
			});
		}

		return id;
	},
});

/**
 * Update an existing card design
 */
export const update = authMutation({
	args: {
		designId: v.id("cardDesigns"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		// Template data — all optional for partial updates
		backgroundColor: v.optional(v.string()),
		frontBackgroundImage: v.optional(v.union(v.string(), v.null())),
		backBackgroundImage: v.optional(v.union(v.string(), v.null())),
		backgroundOpacity: v.optional(v.number()),
		frontElements: v.optional(v.any()),
		backElements: v.optional(v.any()),
		printDuplex: v.optional(v.boolean()),
		magneticTracks: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const { designId, ...updates } = args;

		const design = await ctx.db.get(designId);
		if (!design) {
			throw new Error("Card design not found");
		}

		const cleanUpdates = Object.fromEntries(
			Object.entries(updates).filter(([_, val]) => val !== undefined),
		);

		// Increment version if content changed (elements, backgrounds)
		const contentChanged =
			updates.frontElements !== undefined ||
			updates.backElements !== undefined ||
			updates.backgroundColor !== undefined ||
			updates.frontBackgroundImage !== undefined ||
			updates.backBackgroundImage !== undefined;

		const version = contentChanged ? (design.version || 1) + 1 : design.version;

		await ctx.db.patch(designId, {
			...cleanUpdates,
			version,
			updatedAt: Date.now(),
		});

		return designId;
	},
});

/**
 * Delete (soft) a card design
 */
export const remove = authMutation({
	args: { designId: v.id("cardDesigns") },
	handler: async (ctx, args) => {
		const design = await ctx.db.get(args.designId);
		if (!design) {
			throw new Error("Card design not found");
		}

		// Prevent deleting the org's default design
		const org = await ctx.db.get(design.orgId);
		if (org?.settings?.defaultCardDesignId === args.designId) {
			throw new Error(
				"Impossible de supprimer le design par défaut de l'organisation",
			);
		}

		await ctx.db.patch(args.designId, {
			isActive: false,
			updatedAt: Date.now(),
		});
		return true;
	},
});
