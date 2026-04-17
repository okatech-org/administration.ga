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
 * CRUD pour la brique « Voix / Argumentaire » — métier IA uniquement.
 *
 * Ce bloc n'est PAS rendu dans le PDF ; il guide la génération de contenu
 * par `templateAI.generateFromDocument`.
 */

const templateTypeValidator = v.union(
	v.literal("certificate"),
	v.literal("attestation"),
	v.literal("receipt"),
	v.literal("letter"),
	v.literal("custom"),
);

const registerValidator = v.union(
	v.literal("administratif"),
	v.literal("juridique"),
	v.literal("commercial"),
	v.literal("diplomatique"),
	v.literal("neutre"),
);

const personPronounValidator = v.union(
	v.literal("je"),
	v.literal("nous"),
	v.literal("le_consulat"),
	v.literal("impersonnel"),
);

const politenessValidator = v.union(
	v.literal("neutre"),
	v.literal("courtois"),
	v.literal("solennel"),
);

const formulaValidator = v.object({
	text: v.string(),
	templateType: v.optional(templateTypeValidator),
});

const vocabularyEntryValidator = v.object({
	prefer: v.string(),
	avoid: v.optional(v.array(v.string())),
});

// ============================================================================
// QUERIES
// ============================================================================

export const listGlobal = authQuery({
	args: {},
	handler: async (ctx) => {
		if (!canManageGlobalTemplates(ctx.user)) return [];
		return await ctx.db
			.query("templateVoiceBlocks")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();
	},
});

export const listForOrg = authQuery({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		const orgBlocks = await ctx.db
			.query("templateVoiceBlocks")
			.withIndex("by_org", (q) =>
				q.eq("orgId", args.orgId).eq("isActive", true),
			)
			.collect();
		const globals = await ctx.db
			.query("templateVoiceBlocks")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();
		return [...orgBlocks, ...globals];
	},
});

export const getById = authQuery({
	args: { blockId: v.id("templateVoiceBlocks") },
	handler: async (ctx, args) => ctx.db.get(args.blockId),
});

// ============================================================================
// MUTATIONS
// ============================================================================

export const create = authMutation({
	args: {
		name: localizedStringValidator,
		description: v.optional(localizedStringValidator),
		tone: v.string(),
		register: registerValidator,
		openingFormulas: v.optional(v.array(formulaValidator)),
		closingFormulas: v.optional(v.array(formulaValidator)),
		signatureFormulas: v.optional(v.array(v.string())),
		personPronoun: personPronounValidator,
		useFormalAddress: v.optional(v.boolean()),
		politenessLevel: politenessValidator,
		argumentationGuidelines: v.optional(v.string()),
		vocabularyPreferences: v.optional(v.array(vocabularyEntryValidator)),
		orgId: v.optional(v.id("orgs")),
		isGlobal: v.boolean(),
		isDefault: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		await assertCanCreateBlock(ctx, { isGlobal: args.isGlobal, orgId: args.orgId });
		if (args.isDefault) {
			await clearExistingDefault(ctx, "templateVoiceBlocks", {
				isGlobal: args.isGlobal,
				orgId: args.orgId,
			});
		}
		return await ctx.db.insert("templateVoiceBlocks", {
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
		blockId: v.id("templateVoiceBlocks"),
		name: v.optional(localizedStringValidator),
		description: v.optional(localizedStringValidator),
		tone: v.optional(v.string()),
		register: v.optional(registerValidator),
		openingFormulas: v.optional(v.array(formulaValidator)),
		closingFormulas: v.optional(v.array(formulaValidator)),
		signatureFormulas: v.optional(v.array(v.string())),
		personPronoun: v.optional(personPronounValidator),
		useFormalAddress: v.optional(v.boolean()),
		politenessLevel: v.optional(politenessValidator),
		argumentationGuidelines: v.optional(v.string()),
		vocabularyPreferences: v.optional(v.array(vocabularyEntryValidator)),
		isDefault: v.optional(v.boolean()),
		isActive: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const { blockId, ...updates } = args;
		const block = await ctx.db.get(blockId);
		if (!block) throw new Error("Bloc introuvable");
		await assertBlockPermission(ctx, block);

		if (updates.isDefault === true) {
			await clearExistingDefault(ctx, "templateVoiceBlocks", {
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
	args: { blockId: v.id("templateVoiceBlocks") },
	handler: async (ctx, args) => {
		const block = await ctx.db.get(args.blockId);
		if (!block) return false;
		await assertBlockPermission(ctx, block);
		await ctx.db.patch(args.blockId, { isActive: false, updatedAt: Date.now() });
		return true;
	},
});
