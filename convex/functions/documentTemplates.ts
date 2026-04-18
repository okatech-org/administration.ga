import { v } from "convex/values";
import {
	internalAction,
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { authMutation, authQuery } from "../lib/customFunctions";
import {
	SCEAU_GABON_BASE64,
	SCEAU_GABON_MIME_TYPE,
} from "../assets/sceauGabonBase64";
import {
	serviceCategoryValidator,
	localizedStringValidator,
	orgTypeValidator,
} from "../lib/validators";
import { ServiceCategory } from "../lib/constants";
import {
	assertCanManageGlobalTemplates,
	assertCanManageTemplates,
	canManageGlobalTemplates,
} from "../lib/documentPermissions";
import { error, ErrorCode } from "../lib/errors";
import type { Doc, Id } from "../_generated/dataModel";
import { DIPLOMATIC_TEMPLATES } from "../migrations/seedDiplomaticTemplatesData";

// ============================================================================
// VALIDATEURS LOCAUX DES 3 FACETTES INLINE
// ============================================================================
//
// Les 3 facettes (`headerFooter`, `typography`, `voice`) sont des objets
// inline dans `documentTemplates`. Leurs validateurs sont définis ici pour
// être réutilisés dans `create` / `update`.

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

const headerFooterValidator = v.object({
	header: v.object({
		logoStorageId: v.optional(v.id("_storage")),
		logoAlignment: v.union(
			v.literal("left"),
			v.literal("center"),
			v.literal("right"),
		),
		height: v.optional(v.number()),
		content: v.any(),
	}),
	footer: v.object({
		height: v.optional(v.number()),
		content: v.any(),
		showPageNumbers: v.optional(v.boolean()),
	}),
});

const typographyValidator = v.object({
	fontFamily: v.string(),
	fontSizeBase: v.number(),
	lineHeight: v.number(),
	defaultAlignment: alignmentValidator,
	headingStyles: v.object({
		h1: headingStyleValidator,
		h2: headingStyleValidator,
		h3: headingStyleValidator,
	}),
	paragraphSpacingBefore: v.optional(v.number()),
	paragraphSpacingAfter: v.optional(v.number()),
	paragraphFirstLineIndent: v.optional(v.number()),
	pageBreakBefore: v.optional(
		v.array(v.union(v.literal("h1"), v.literal("h2"), v.literal("h3"))),
	),
	widowOrphanControl: v.optional(v.boolean()),
	keepHeadingsWithNext: v.optional(v.boolean()),
});

const formulaValidator = v.object({
	text: v.string(),
	templateType: v.optional(
		v.union(
			v.literal("certificate"),
			v.literal("attestation"),
			v.literal("receipt"),
			v.literal("letter"),
			v.literal("custom"),
		),
	),
});

const voiceValidator = v.object({
	tone: v.string(),
	register: v.union(
		v.literal("administratif"),
		v.literal("juridique"),
		v.literal("commercial"),
		v.literal("diplomatique"),
		v.literal("neutre"),
	),
	openingFormulas: v.optional(v.array(formulaValidator)),
	closingFormulas: v.optional(v.array(formulaValidator)),
	signatureFormulas: v.optional(v.array(v.string())),
	personPronoun: v.union(
		v.literal("je"),
		v.literal("nous"),
		v.literal("le_consulat"),
		v.literal("impersonnel"),
	),
	useFormalAddress: v.optional(v.boolean()),
	politenessLevel: v.union(
		v.literal("neutre"),
		v.literal("courtois"),
		v.literal("solennel"),
	),
	argumentationGuidelines: v.optional(v.string()),
	vocabularyPreferences: v.optional(
		v.array(
			v.object({
				prefer: v.string(),
				avoid: v.optional(v.array(v.string())),
			}),
		),
	),
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List document templates available to an organization — returns the union
 * of its own templates plus global templates whose `allowedOrgTypes` matches
 * the org's type (or is unrestricted).
 */
export const listByOrg = authQuery({
	args: {
		orgId: v.id("orgs"),
		category: v.optional(serviceCategoryValidator),
		templateType: v.optional(
			v.union(
				v.literal("certificate"),
				v.literal("attestation"),
				v.literal("receipt"),
				v.literal("letter"),
				v.literal("custom")
			)
		),
	},
	handler: async (ctx, args) => {
		const org = await ctx.db.get(args.orgId);
		const orgType = org?.type;

		// Org-specific templates are always fully visible to the org.
		const orgTemplates = await ctx.db
			.query("documentTemplates")
			.withIndex("by_org", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
			.collect();

		// Global templates — filter by applicability / allowedOrgTypes.
		const globalTemplates = await ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();
		const visibleGlobals = globalTemplates.filter((t) =>
			orgTypeAllowed(t.allowedOrgTypes, orgType, t),
		);

		// Templates explicitement attribués à cette rep (union avec
		// l'applicabilité globale). Certains peuvent être déjà dans
		// `visibleGlobals` — on déduplique plus bas.
		const explicitIds = org?.assignedTemplateIds ?? [];
		const explicitTemplates = (
			await Promise.all(explicitIds.map((id) => ctx.db.get(id)))
		).filter(
			(t): t is NonNullable<typeof t> => t !== null && t.isActive === true,
		);

		// Union déduplique par `_id`.
		const byId = new Map<string, (typeof globalTemplates)[number]>();
		for (const t of [...orgTemplates, ...visibleGlobals, ...explicitTemplates]) {
			byId.set(t._id as unknown as string, t);
		}
		let filtered = Array.from(byId.values());
		if (args.category) {
			filtered = filtered.filter((t) => t.category === args.category);
		}
		if (args.templateType) {
			filtered = filtered.filter((t) => t.templateType === args.templateType);
		}

		// Résoudre les logoStorageIds en URLs (dédupliqué pour minimiser les appels storage).
		const uniqueStorageIds = [
			...new Set(
				filtered
					.map((t) => t.headerFooter?.header?.logoStorageId)
					.filter((id): id is Id<"_storage"> => Boolean(id)),
			),
		];
		const logoUrlMap = new Map<string, string | null>();
		for (const sid of uniqueStorageIds) {
			logoUrlMap.set(sid as string, await ctx.storage.getUrl(sid));
		}
		return filtered.map((t) => ({
			...t,
			logoUrl: t.headerFooter?.header?.logoStorageId
				? (logoUrlMap.get(t.headerFooter.header.logoStorageId as string) ?? null)
				: null,
		}));
	},
});

/**
 * List global templates that a given org type can clone or use.
 * Used by the agent "clone from global" picker.
 */
export const listGlobalForOrg = authQuery({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		const org = await ctx.db.get(args.orgId);
		if (!org) return [];
		const all = await ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();
		return all.filter((t) => orgTypeAllowed(t.allowedOrgTypes, org.type, t));
	},
});

/**
 * List templates belonging ONLY to an organization (no globals).
 * Used by the agent templates management page where globals should not
 * clutter the list — they are exposed separately as a source for cloning.
 */
export const listOrgTemplates = authQuery({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("documentTemplates")
			.withIndex("by_org", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
			.collect();
	},
});

/**
 * List every template usable as a CLONE SOURCE for an org : its own
 * templates + every global template accessible to its type. Returned items
 * carry an `isGlobal` flag so the picker can distinguish them.
 */
export const listCloneSources = authQuery({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		const org = await ctx.db.get(args.orgId);
		if (!org) return [];
		const orgTemplates = await ctx.db
			.query("documentTemplates")
			.withIndex("by_org", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
			.collect();
		const globals = await ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();
		const accessibleGlobals = globals.filter((t) =>
			orgTypeAllowed(t.allowedOrgTypes, org.type, t),
		);
		return [...orgTemplates, ...accessibleGlobals];
	},
});

/**
 * Clone ANY template (org or global) into the same organisation.
 * - A global source → standard clone-from-global (tracks clonedFromTemplateId).
 * - An org source already owned by this org → duplicate as a fresh org template.
 *
 * Superset of `cloneFromGlobal`. The existing `cloneFromGlobal` remains for
 * backward compatibility but internally delegates here.
 */
export const cloneTemplate = authMutation({
	args: {
		sourceTemplateId: v.id("documentTemplates"),
		orgId: v.id("orgs"),
	},
	handler: async (ctx, args) => {
		const source = await ctx.db.get(args.sourceTemplateId);
		if (!source) throw new Error("Modèle source introuvable");
		if (!source.isActive) {
			throw error(ErrorCode.VALIDATION_ERROR, "Modèle source inactif");
		}

		const org = await ctx.db.get(args.orgId);
		if (!org) throw new Error("Organisation introuvable");

		// Authorization : source global must be allowed for this org type ;
		// source org must be the same organisation.
		if (source.isGlobal) {
			if (!orgTypeAllowed(source.allowedOrgTypes, org.type, source)) {
				throw error(
					ErrorCode.FORBIDDEN,
					"Ce modèle n'est pas accessible à ce type d'organisation",
				);
			}
		} else {
			if (source.orgId !== args.orgId) {
				throw error(
					ErrorCode.FORBIDDEN,
					"Impossible de cloner un modèle d'une autre organisation",
				);
			}
		}

		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user_org", (q) =>
				q.eq("userId", ctx.user._id).eq("orgId", args.orgId),
			)
			.first();
		await assertCanManageTemplates(ctx, ctx.user, membership);

		const now = Date.now();
		return await ctx.db.insert("documentTemplates", {
			name: source.name,
			description: source.description,
			category: source.category,
			serviceId: source.serviceId,
			templateType: source.templateType,
			content: source.content,
			contentHtml: source.contentHtml,
			placeholders: source.placeholders,
			orgId: args.orgId,
			createdBy: ctx.user._id,
			isGlobal: false,
			isActive: true,
			autoPublishToCitizen: source.autoPublishToCitizen,
			requireSignature: source.requireSignature,
			allowedSignerPositions: source.allowedSignerPositions,
			// Les 3 facettes inline sont copiées telles quelles — un clone
			// peut les éditer indépendamment sans impacter la source.
			headerFooter: source.headerFooter,
			typography: source.typography,
			voice: source.voice,
			paperSize: source.paperSize,
			orientation: source.orientation,
			marginTop: source.marginTop,
			marginRight: source.marginRight,
			marginBottom: source.marginBottom,
			marginLeft: source.marginLeft,
			version: 1,
			updatedAt: now,
			// On ne marque clonedFromTemplateId QUE pour un clone depuis un
			// source global — un clone depuis un autre org template n'a pas
			// de « mise à jour disponible » à propager.
			clonedFromTemplateId: source.isGlobal ? args.sourceTemplateId : undefined,
			clonedFromVersion: source.isGlobal ? source.version ?? 1 : undefined,
		});
	},
});

/**
 * Get a single template by ID
 */
export const getById = authQuery({
	args: { templateId: v.id("documentTemplates") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.templateId);
	},
});

/**
 * Résout le logo (sceau) de l'entête d'un modèle en URL signée pour
 * affichage côté client. Retourne `null` si le modèle n'a pas d'entête
 * ou pas de logo.
 *
 * Utilisé par l'éditeur `/config/templates/[id]` pour afficher un aperçu
 * non-éditable du sceau au-dessus du canvas Tiptap.
 */
export const getTemplateLogoUrl = authQuery({
	args: { templateId: v.id("documentTemplates") },
	handler: async (ctx, args): Promise<string | null> => {
		const template = await ctx.db.get(args.templateId);
		const storageId = template?.headerFooter?.header?.logoStorageId;
		if (!storageId) return null;
		return await ctx.storage.getUrl(storageId);
	},
});

/**
 * List templates available for a specific service
 */
export const listForService = authQuery({
	args: {
		serviceId: v.id("services"),
		orgId: v.optional(v.id("orgs")),
	},
	handler: async (ctx, args) => {
		const org = args.orgId ? await ctx.db.get(args.orgId) : null;
		const orgType = org?.type;

		// Templates linked directly to the service.
		const serviceTemplates = await ctx.db
			.query("documentTemplates")
			.withIndex("by_service", (q) => q.eq("serviceId", args.serviceId).eq("isActive", true))
			.collect();

		// Global templates — filter by org type if we have one.
		const globalTemplates = await ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();
		const visibleGlobals = orgType
			? globalTemplates.filter((t) => orgTypeAllowed(t.allowedOrgTypes, orgType, t))
			: globalTemplates;

		// Org-specific templates.
		let orgTemplates: Doc<"documentTemplates">[] = [];
		if (args.orgId) {
			orgTemplates = await ctx.db
				.query("documentTemplates")
				.withIndex("by_org", (q) => q.eq("orgId", args.orgId as Id<"orgs">).eq("isActive", true))
				.collect();
		}

		const all = [...serviceTemplates, ...visibleGlobals, ...orgTemplates];
		const unique = Array.from(
			new Map(all.map((t) => [t._id, t])).values(),
		);

		// Also make sure service-linked templates respect allowedOrgTypes when they are global.
		return unique.filter(
			(t) => !t.isGlobal || orgTypeAllowed(t.allowedOrgTypes, orgType, t),
		);
	},
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new document template (Tiptap JSON content).
 *
 * Permission: super admin for global templates; `documents.manage_templates`
 * for org templates. See `assertTemplatePermissionForCreate`.
 */
export const create = authMutation({
	args: {
		name: localizedStringValidator,
		description: v.optional(localizedStringValidator),
		category: v.optional(serviceCategoryValidator),
		serviceId: v.optional(v.id("services")),
		templateType: v.union(
			v.literal("certificate"),
			v.literal("attestation"),
			v.literal("receipt"),
			v.literal("letter"),
			v.literal("custom")
		),
		content: v.any(), // Tiptap JSON — validated at runtime
		contentHtml: v.optional(v.string()),
		placeholders: v.optional(v.array(v.any())),
		orgId: v.optional(v.id("orgs")),
		isGlobal: v.boolean(),
		autoPublishToCitizen: v.optional(v.boolean()),
		requireSignature: v.optional(v.boolean()),
		allowedSignerPositions: v.optional(v.array(v.string())),
		allowedOrgTypes: v.optional(v.array(orgTypeValidator)),
		applicability: v.optional(
			v.union(v.literal("all"), v.literal("specificOrgTypes")),
		),
		applicableOrgTypes: v.optional(v.array(orgTypeValidator)),
		// 3 facettes inline du modèle. Toutes optionnelles ; valeurs par
		// défaut appliquées au rendu si absentes.
		headerFooter: v.optional(headerFooterValidator),
		typography: v.optional(typographyValidator),
		voice: v.optional(voiceValidator),
		paperSize: v.optional(v.union(v.literal("A4"), v.literal("LETTER"))),
		orientation: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),
		marginTop: v.optional(v.number()),
		marginRight: v.optional(v.number()),
		marginBottom: v.optional(v.number()),
		marginLeft: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		if (args.isGlobal) {
			assertCanManageGlobalTemplates(ctx.user);
		} else if (args.orgId) {
			const membership = await ctx.db
				.query("memberships")
				.withIndex("by_user_org", (q) =>
					q.eq("userId", ctx.user._id).eq("orgId", args.orgId as Id<"orgs">),
				)
				.first();
			await assertCanManageTemplates(ctx, ctx.user, membership);
		} else {
			throw error(ErrorCode.VALIDATION_ERROR, "orgId requis pour un template non global");
		}

		const userId = ctx.user._id;
		return await ctx.db.insert("documentTemplates", {
			...args,
			createdBy: userId,
			isActive: true,
			version: 1,
			updatedAt: Date.now(),
		});
	},
});

/**
 * Update an existing template.
 *
 * If the content changes (or any publication flags), the CURRENT state is
 * snapshotted into `documentTemplateVersions` before the live record is
 * patched. This preserves history and ensures previously generated documents
 * can always be traced back to the exact template version that produced them.
 *
 * Permission: super admin for global templates, `documents.manage_templates`
 * for org templates.
 */
export const update = authMutation({
	args: {
		templateId: v.id("documentTemplates"),
		name: v.optional(localizedStringValidator),
		description: v.optional(localizedStringValidator),
		category: v.optional(serviceCategoryValidator),
		serviceId: v.optional(v.id("services")),
		templateType: v.optional(
			v.union(
				v.literal("certificate"),
				v.literal("attestation"),
				v.literal("receipt"),
				v.literal("letter"),
				v.literal("custom")
			)
		),
		content: v.optional(v.any()),
		contentHtml: v.optional(v.string()),
		placeholders: v.optional(v.array(v.any())),
		isGlobal: v.optional(v.boolean()),
		isActive: v.optional(v.boolean()),
		autoPublishToCitizen: v.optional(v.boolean()),
		requireSignature: v.optional(v.boolean()),
		allowedSignerPositions: v.optional(v.array(v.string())),
		allowedOrgTypes: v.optional(v.array(orgTypeValidator)),
		applicability: v.optional(
			v.union(v.literal("all"), v.literal("specificOrgTypes")),
		),
		applicableOrgTypes: v.optional(v.array(orgTypeValidator)),
		// 3 facettes inline (patch partiel supporté — chaque facette passe
		// par `v.optional(...)` au niveau supérieur).
		headerFooter: v.optional(headerFooterValidator),
		typography: v.optional(typographyValidator),
		voice: v.optional(voiceValidator),
		paperSize: v.optional(v.union(v.literal("A4"), v.literal("LETTER"))),
		orientation: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),
		marginTop: v.optional(v.number()),
		marginRight: v.optional(v.number()),
		marginBottom: v.optional(v.number()),
		marginLeft: v.optional(v.number()),
		changeNote: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { templateId, changeNote, ...updates } = args;

		const template = await ctx.db.get(templateId);
		if (!template) {
			throw new Error("Template not found");
		}

		await assertTemplatePermission(ctx, template);

		const cleanUpdates = Object.fromEntries(
			Object.entries(updates).filter(([_, value]) => value !== undefined),
		);

		// Bump version when the canonical content or publication policy changes.
		const structuralChange =
			updates.content !== undefined ||
			updates.placeholders !== undefined ||
			updates.autoPublishToCitizen !== undefined ||
			updates.requireSignature !== undefined ||
			updates.allowedSignerPositions !== undefined;

		if (structuralChange) {
			await archiveCurrentTemplateVersion(ctx, template, changeNote);
		}

		const version = structuralChange ? (template.version || 1) + 1 : template.version;

		await ctx.db.patch(templateId, {
			...cleanUpdates,
			version,
			updatedAt: Date.now(),
		});

		return templateId;
	},
});

/**
 * Clone a GLOBAL template into an organization. The new copy belongs to the
 * org and can be edited by agents with `documents.manage_templates`.
 * The global source is untouched.
 */
export const cloneFromGlobal = authMutation({
	args: {
		globalTemplateId: v.id("documentTemplates"),
		orgId: v.id("orgs"),
	},
	handler: async (ctx, args) => {
		const source = await ctx.db.get(args.globalTemplateId);
		if (!source) throw new Error("Template source introuvable");
		if (!source.isGlobal) {
			throw error(ErrorCode.FORBIDDEN, "Seuls les modèles globaux peuvent être clonés");
		}

		const org = await ctx.db.get(args.orgId);
		if (!org) throw new Error("Organisation introuvable");
		if (!orgTypeAllowed(source.allowedOrgTypes, org.type, source)) {
			throw error(
				ErrorCode.FORBIDDEN,
				"Ce modèle n'est pas accessible à ce type d'organisation",
			);
		}

		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user_org", (q) =>
				q.eq("userId", ctx.user._id).eq("orgId", args.orgId),
			)
			.first();
		await assertCanManageTemplates(ctx, ctx.user, membership);

		const now = Date.now();
		const newId = await ctx.db.insert("documentTemplates", {
			name: source.name,
			description: source.description,
			category: source.category,
			serviceId: source.serviceId,
			templateType: source.templateType,
			content: source.content,
			contentHtml: source.contentHtml,
			placeholders: source.placeholders,
			orgId: args.orgId,
			createdBy: ctx.user._id,
			isGlobal: false,
			isActive: true,
			autoPublishToCitizen: source.autoPublishToCitizen,
			requireSignature: source.requireSignature,
			allowedSignerPositions: source.allowedSignerPositions,
			headerFooter: source.headerFooter,
			typography: source.typography,
			voice: source.voice,
			paperSize: source.paperSize,
			orientation: source.orientation,
			marginTop: source.marginTop,
			marginRight: source.marginRight,
			marginBottom: source.marginBottom,
			marginLeft: source.marginLeft,
			version: 1,
			updatedAt: now,
			clonedFromTemplateId: args.globalTemplateId,
			clonedFromVersion: source.version ?? 1,
		});
		return newId;
	},
});

/**
 * For a cloned org template, check whether its source has been updated since
 * the clone was made. Returns the current source version or null if the clone
 * is up-to-date (or not cloned from anything).
 */
export const getSourceUpdateStatus = authQuery({
	args: { templateId: v.id("documentTemplates") },
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template?.clonedFromTemplateId) return null;
		const source = await ctx.db.get(template.clonedFromTemplateId);
		if (!source || !source.isActive) return null;
		const sourceVersion = source.version ?? 1;
		const cloneVersion = template.clonedFromVersion ?? 0;
		if (sourceVersion <= cloneVersion) return null;
		return {
			sourceTemplateId: source._id,
			sourceVersion,
			cloneVersion,
			sourceName: source.name,
			sourceUpdatedAt: source.updatedAt,
		};
	},
});

/**
 * Re-synchronise a cloned org template with the latest source content.
 * Archives the current state before applying the source content + flags,
 * bumps the version, and marks the new `clonedFromVersion`.
 */
export const syncFromSource = authMutation({
	args: { templateId: v.id("documentTemplates") },
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template) throw new Error("Template introuvable");
		if (!template.clonedFromTemplateId) {
			throw error(ErrorCode.VALIDATION_ERROR, "Ce modèle n'est pas un clone");
		}
		await assertTemplatePermission(ctx, template);

		const source = await ctx.db.get(template.clonedFromTemplateId);
		if (!source) throw new Error("Modèle source introuvable");

		await archiveCurrentTemplateVersion(
			ctx,
			template,
			`Synchronisation depuis la source (v${template.clonedFromVersion ?? 1} → v${source.version ?? 1})`,
		);

		await ctx.db.patch(args.templateId, {
			content: source.content,
			contentHtml: source.contentHtml,
			placeholders: source.placeholders,
			autoPublishToCitizen: source.autoPublishToCitizen,
			requireSignature: source.requireSignature,
			allowedSignerPositions: source.allowedSignerPositions,
			headerFooter: source.headerFooter,
			typography: source.typography,
			voice: source.voice,
			paperSize: source.paperSize,
			orientation: source.orientation,
			marginTop: source.marginTop,
			marginRight: source.marginRight,
			marginBottom: source.marginBottom,
			marginLeft: source.marginLeft,
			version: (template.version ?? 1) + 1,
			clonedFromVersion: source.version ?? 1,
			updatedAt: Date.now(),
		});
		return args.templateId;
	},
});

/** List past versions for a template (for history view). */
export const listVersions = authQuery({
	args: { templateId: v.id("documentTemplates") },
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template) return [];
		// Same permission model as editing — only authorized users see history.
		if (template.isGlobal) {
			if (!canManageGlobalTemplates(ctx.user)) return [];
		} else {
			const membership = template.orgId
				? await ctx.db
						.query("memberships")
						.withIndex("by_user_org", (q) =>
							q.eq("userId", ctx.user._id).eq("orgId", template.orgId as Id<"orgs">),
						)
						.first()
				: null;
			await assertCanManageTemplates(ctx, ctx.user, membership);
		}
		return await ctx.db
			.query("documentTemplateVersions")
			.withIndex("by_template_createdAt", (q) => q.eq("templateId", args.templateId))
			.order("desc")
			.collect();
	},
});

/**
 * Restore a previous version. Archives the current state, then replaces the
 * live record's content with the snapshot. Version counter increments.
 */
export const restoreVersion = authMutation({
	args: {
		templateId: v.id("documentTemplates"),
		version: v.number(),
	},
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template) throw new Error("Template introuvable");
		await assertTemplatePermission(ctx, template);

		const snapshot = await ctx.db
			.query("documentTemplateVersions")
			.withIndex("by_template_version", (q) =>
				q.eq("templateId", args.templateId).eq("version", args.version),
			)
			.first();
		if (!snapshot) throw new Error(`Version ${args.version} introuvable`);

		await archiveCurrentTemplateVersion(ctx, template, `Restauration version ${args.version}`);
		const nextVersion = (template.version || 1) + 1;
		await ctx.db.patch(args.templateId, {
			content: snapshot.content,
			contentHtml: snapshot.contentHtml,
			placeholders: snapshot.placeholders,
			name: snapshot.name,
			description: snapshot.description,
			paperSize: snapshot.paperSize,
			orientation: snapshot.orientation,
			autoPublishToCitizen: snapshot.autoPublishToCitizen,
			requireSignature: snapshot.requireSignature,
			allowedSignerPositions: snapshot.allowedSignerPositions,
			version: nextVersion,
			updatedAt: Date.now(),
		});
		return nextVersion;
	},
});

/** List global templates (super admin library). */
export const listGlobal = authQuery({
	args: {
		category: v.optional(serviceCategoryValidator),
	},
	handler: async (ctx, args) => {
		if (!canManageGlobalTemplates(ctx.user)) return [];
		const query = ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true));
		const all = await query.collect();
		const filtered = args.category ? all.filter((t) => t.category === args.category) : all;

		// Résoudre les logoStorageIds en URLs (dédupliqué — les 25 modèles diplomatiques partagent le même logo).
		const uniqueStorageIds = [
			...new Set(
				filtered
					.map((t) => t.headerFooter?.header?.logoStorageId)
					.filter((id): id is Id<"_storage"> => Boolean(id)),
			),
		];
		const logoUrlMap = new Map<string, string | null>();
		for (const sid of uniqueStorageIds) {
			logoUrlMap.set(sid as string, await ctx.storage.getUrl(sid));
		}
		return filtered.map((t) => ({
			...t,
			logoUrl: t.headerFooter?.header?.logoStorageId
				? (logoUrlMap.get(t.headerFooter.header.logoStorageId as string) ?? null)
				: null,
		}));
	},
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Returns true when a global template is accessible to the given org type.
 *
 * Lit `applicability` + `applicableOrgTypes` en priorité (nouveau format v1),
 * avec fallback sur `allowedOrgTypes` (legacy) pour les templates qui n'ont
 * pas encore été migrés. Signature conservée pour ne rien casser côté appelant.
 */
function orgTypeAllowed(
	allowed: string[] | undefined,
	orgType: string | undefined,
	template?: Doc<"documentTemplates">,
): boolean {
	// Nouveau format (v1)
	if (template) {
		const applicability = template.applicability;
		const applicableOrgTypes = template.applicableOrgTypes;
		if (applicability === "all") return true;
		if (applicability === "specificOrgTypes") {
			if (!applicableOrgTypes || applicableOrgTypes.length === 0) return true;
			if (!orgType) return false;
			return (applicableOrgTypes as string[]).includes(orgType);
		}
	}
	// Legacy fallback
	if (!allowed || allowed.length === 0) return true;
	if (!orgType) return false;
	return allowed.includes(orgType);
}

/**
 * Archive the current state of a template into `documentTemplateVersions`
 * before mutating the live record. Called from update / restore flows.
 */
async function archiveCurrentTemplateVersion(
	ctx: MutationCtx,
	template: Doc<"documentTemplates">,
	changeNote?: string,
): Promise<void> {
	await ctx.db.insert("documentTemplateVersions", {
		templateId: template._id,
		version: template.version ?? 1,
		content: template.content,
		contentHtml: template.contentHtml,
		placeholders: template.placeholders,
		name: template.name,
		description: template.description,
		paperSize: template.paperSize,
		orientation: template.orientation,
		autoPublishToCitizen: template.autoPublishToCitizen,
		requireSignature: template.requireSignature,
		allowedSignerPositions: template.allowedSignerPositions,
		createdAt: Date.now(),
		// `ctx.user` is available because every caller goes through authMutation.
		createdBy: (ctx as unknown as { user?: Doc<"users"> }).user?._id,
		changeNote,
	});
}

/** Gate edits on a template — super admin for globals, agent permission for org. */
async function assertTemplatePermission(
	ctx: MutationCtx & { user: Doc<"users"> },
	template: Doc<"documentTemplates">,
): Promise<void> {
	if (template.isGlobal) {
		assertCanManageGlobalTemplates(ctx.user);
		return;
	}
	if (!template.orgId) {
		throw error(ErrorCode.FORBIDDEN, "Template sans organisation");
	}
	const membership = await ctx.db
		.query("memberships")
		.withIndex("by_user_org", (q) =>
			q.eq("userId", ctx.user._id).eq("orgId", template.orgId as Id<"orgs">),
		)
		.first();
	await assertCanManageTemplates(ctx, ctx.user, membership);
}

/**
 * Delete (soft) a template
 */
export const remove = authMutation({
	args: { templateId: v.id("documentTemplates") },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.templateId, {
			isActive: false,
			updatedAt: Date.now(),
		});
		return true;
	},
});

// ============================================================================
// SEED - Default templates (Tiptap JSON)
// ============================================================================

/**
 * Build a Tiptap paragraph node with mixed text and placeholder atoms.
 * Helper kept local to the seed — production templates are authored via the UI.
 */
function para(
	parts: Array<
		| string
		| {
				placeholder: string;
				source: "user" | "profile" | "request" | "formData" | "org" | "system";
				label?: string;
		  }
	>,
	attrs?: { textAlign?: "left" | "center" | "right" | "justify" },
) {
	return {
		type: "paragraph",
		attrs: attrs ? { textAlign: attrs.textAlign } : undefined,
		content: parts.map((p) =>
			typeof p === "string"
				? { type: "text", text: p }
				: {
						type: "placeholder",
						attrs: { key: p.placeholder, source: p.source, label: p.label ?? null },
					},
		),
	};
}

function heading(text: string, level = 1) {
	return {
		type: "heading",
		attrs: { level, textAlign: "center" },
		content: [{ type: "text", text, marks: [{ type: "bold" }] }],
	};
}

// ─── Charte graphique diplomatique gabonaise ──────────────────────────────
// Les 25 modèles diplomatiques/consulaires générés depuis les DOCX sources
// partagent la même identité visuelle : un entête institutionnel, une
// typographie Times New Roman 11 pt/1.5 et une voix solennelle. Les 3
// facettes sont donc mutualisées ici et recopiées sur chaque modèle.
function buildDiplomaticFacettes(
	logoStorageId: Id<"_storage"> | undefined,
): {
	headerFooter: NonNullable<Doc<"documentTemplates">["headerFooter"]>;
	typography: NonNullable<Doc<"documentTemplates">["typography"]>;
	voice: NonNullable<Doc<"documentTemplates">["voice"]>;
} {
	return {
		headerFooter: {
			header: {
				logoStorageId,
				logoAlignment: "center",
				height: 42,
				content: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							attrs: { textAlign: "center" },
							content: [
								{
									type: "text",
									text: "AMBASSADE DU GABON",
									marks: [{ type: "bold" }],
								},
							],
						},
						{
							type: "paragraph",
							attrs: { textAlign: "center" },
							content: [
								{
									type: "text",
									text: "PRÈS LE ROYAUME D’ESPAGNE ET",
									marks: [{ type: "bold" }],
								},
							],
						},
						{
							type: "paragraph",
							attrs: { textAlign: "center" },
							content: [
								{
									type: "text",
									text: "REPRÉSENTATION PERMANENTE DU GABON",
									marks: [{ type: "bold" }],
								},
							],
						},
						{
							type: "paragraph",
							attrs: { textAlign: "center" },
							content: [
								{
									type: "text",
									text: "AUPRÈS DE L’ORGANISATION",
									marks: [{ type: "bold" }],
								},
							],
						},
						{
							type: "paragraph",
							attrs: { textAlign: "center" },
							content: [
								{
									type: "text",
									text: "DES NATIONS UNIES POUR LE TOURISME",
									marks: [{ type: "bold" }],
								},
							],
						},
						{
							type: "paragraph",
							attrs: { textAlign: "center" },
							content: [{ type: "text", text: "---------------" }],
						},
					],
				},
			},
			footer: {
				height: 15,
				showPageNumbers: false,
				content: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							attrs: { textAlign: "center" },
							content: [
								{
									type: "text",
									text: "CALLE ORENSE - 68 - 2° IZQ. - 28020 - MADRID – ESPAÑA",
									marks: [{ type: "italic" }],
								},
							],
						},
						{
							type: "paragraph",
							attrs: { textAlign: "center" },
							content: [
								{
									type: "text",
									text: "TEL : (+34) 914 138 211 | Email : secretariagabon@gmail.com",
									marks: [{ type: "italic" }],
								},
							],
						},
					],
				},
			},
		},
		typography: {
			fontFamily: "Times New Roman",
			fontSizeBase: 11,
			lineHeight: 1.5,
			defaultAlignment: "justify",
			headingStyles: {
				h1: {
					fontSize: 14,
					bold: true,
					uppercase: true,
					spacingBefore: 8,
					spacingAfter: 8,
					alignment: "center",
				},
				h2: {
					fontSize: 12,
					bold: true,
					uppercase: false,
					spacingBefore: 6,
					spacingAfter: 4,
					alignment: "left",
				},
				h3: {
					fontSize: 11,
					bold: true,
					uppercase: false,
					spacingBefore: 4,
					spacingAfter: 2,
					alignment: "left",
				},
			},
			paragraphSpacingBefore: 0,
			paragraphSpacingAfter: 4,
			paragraphFirstLineIndent: 0,
			widowOrphanControl: true,
			keepHeadingsWithNext: true,
		},
		voice: {
			tone: "Solennel, formel, respectueux des usages diplomatiques gabonais et des protocoles internationaux",
			register: "diplomatique",
			personPronoun: "le_consulat",
			useFormalAddress: true,
			politenessLevel: "solennel",
			openingFormulas: [
				{
					text: "L’Ambassade du Gabon près le Royaume d’Espagne présente ses compliments",
					templateType: "letter",
				},
				{ text: "Je soussigné(e),", templateType: "attestation" },
				{ text: "Il est certifié que", templateType: "certificate" },
			],
			closingFormulas: [
				{
					text: "L’Ambassade du Gabon près le Royaume d’Espagne saisit cette occasion pour renouveler […] les assurances de sa très haute considération.",
					templateType: "letter",
				},
				{
					text: "La présente attestation est établie pour servir et valoir ce que de droit.",
					templateType: "attestation",
				},
				{
					text: "En foi de quoi, le présent certificat est délivré pour servir et valoir ce que de droit.",
					templateType: "certificate",
				},
			],
			signatureFormulas: [
				"Le Conseiller chargé des Affaires Consulaires",
				"L’Ambassadeur Extraordinaire et Plénipotentiaire",
				"Le Premier Conseiller",
			],
			argumentationGuidelines:
				"Respecter l’étiquette diplomatique. Utiliser systématiquement la forme solennelle. Mentionner l’Ambassade au pluriel majestatif (« L’Ambassade … a l’honneur de »). Ne jamais employer la première personne du singulier dans une note verbale — toujours « L’Ambassade » ou « le Consulat ». Conserver les majuscules protocolaires sur les titres officiels.",
			vocabularyPreferences: [
				{ prefer: "présente ses compliments", avoid: ["salue"] },
				{ prefer: "a l’honneur de", avoid: ["souhaite", "voudrait"] },
				{ prefer: "daigner", avoid: ["vouloir bien"] },
				{ prefer: "S. E. M.", avoid: ["Monsieur le Ministre"] },
			],
		},
	};
}

/**
 * Seeds :
 *   1. Le « Récépissé de Dépôt » (modèle générique, toutes représentations).
 *   2. Les 25 modèles diplomatiques/consulaires Gabon-Madrid (intégrés en
 *      dur — source de vérité : `DIPLOMATIC_TEMPLATES`).
 *
 * Les 25 modèles sont `applicability: "all"` → accessibles à TOUTES les
 * représentations sans attribution explicite. Ils partagent les 3 facettes
 * institutionnelles (entête Ambassade, typographie Times 11 pt/1.5, voix
 * solennelle).
 *
 * Idempotent :
 *   - Récépissé : recherche par `templateType === "receipt"`.
 *   - Modèles diplomatiques : recherche par `name.fr` puis patch si présent,
 *     insert sinon.
 *
 * Relançable autant de fois que nécessaire depuis le dashboard Convex.
 *
 * Argument optionnel :
 *   - `logoStorageId` : sceau gabonais pré-uploadé dans `_storage`. S'il est
 *     fourni, les 25 modèles sont patchés avec cette référence. Sinon,
 *     l'entête affiche uniquement le bloc texte institutionnel.
 */
export const seedDefaultTemplates = internalMutation({
	args: {
		logoStorageId: v.optional(v.id("_storage")),
		// Dictionnaire optionnel { seedKey -> contentHtml } pré-calculé par
		// l'action appelante (qui a accès au runtime Node pour `@tiptap/html`).
		// Si absent, le champ `contentHtml` n'est pas écrit et les vignettes
		// resteront en fallback "Aperçu vide".
		contentHtmlBySeedKey: v.optional(v.record(v.string(), v.string())),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const contentHtmlBySeedKey = args.contentHtmlBySeedKey ?? {};

		// ─── 1. Récépissé de Dépôt (modèle générique) ─────────────────────
		const receiptTemplate = {
			name: { fr: "Récépissé de Dépôt", en: "Filing Receipt" },
			description: {
				fr: "Accusé de réception pour une demande déposée",
				en: "Receipt for a submitted request",
			},
			category: ServiceCategory.Certification,
			templateType: "receipt" as const,
			content: {
				type: "doc",
				content: [
					heading("RÉCÉPISSÉ DE DÉPÔT", 1),
					{
						type: "paragraph",
						attrs: { textAlign: "center" },
						content: [{ type: "text", text: "République Gabonaise" }],
					},
					para([
						"Le Consulat Général du Gabon accuse réception de la demande suivante :",
					]),
					para([
						"Référence : ",
						{
							placeholder: "requestReference",
							source: "request",
							label: "Référence",
						},
					]),
					para([
						"Type de demande : ",
						{ placeholder: "serviceName", source: "request", label: "Service" },
					]),
					para([
						"Déposé par : ",
						{ placeholder: "firstName", source: "user", label: "Prénom" },
						" ",
						{ placeholder: "lastName", source: "user", label: "Nom" },
					]),
					para([
						"Date de dépôt : ",
						{
							placeholder: "submissionDate",
							source: "system",
							label: "Date de dépôt",
						},
					]),
					para(
						[
							"Ce récépissé ne préjuge en rien de la décision finale qui sera prise sur votre demande. Conservez-le, il vous sera demandé lors du retrait.",
						],
						{ textAlign: "justify" },
					),
					para([
						"Fait le ",
						{ placeholder: "today", source: "system", label: "Date du jour" },
						".",
					]),
				],
			},
			placeholders: [
				{
					key: "requestReference",
					label: { fr: "Référence", en: "Reference" },
					source: "request" as const,
				},
				{
					key: "serviceName",
					label: { fr: "Service", en: "Service" },
					source: "request" as const,
					path: "serviceName",
				},
				{
					key: "firstName",
					label: { fr: "Prénom", en: "First Name" },
					source: "user" as const,
					path: "firstName",
				},
				{
					key: "lastName",
					label: { fr: "Nom", en: "Last Name" },
					source: "user" as const,
					path: "lastName",
				},
				{
					key: "submissionDate",
					label: { fr: "Date de dépôt", en: "Submission Date" },
					source: "system" as const,
				},
				{
					key: "today",
					label: { fr: "Date du jour", en: "Today's date" },
					source: "system" as const,
				},
			],
			isGlobal: true as const,
			isActive: true,
			autoPublishToCitizen: true,
			requireSignature: false,
			paperSize: "A4" as const,
			orientation: "portrait" as const,
		};

		const existingReceipt = await ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) =>
				q.eq("isGlobal", true).eq("isActive", true),
			)
			.filter((q) => q.eq(q.field("templateType"), "receipt"))
			.first();

		let receiptTemplateId: Id<"documentTemplates">;
		let receiptSeeded = 0;
		let receiptSkipped = 0;
		if (existingReceipt) {
			receiptTemplateId = existingReceipt._id;
			receiptSkipped = 1;
		} else {
			receiptTemplateId = await ctx.db.insert("documentTemplates", {
				...receiptTemplate,
				version: 1,
				updatedAt: now,
			});
			receiptSeeded = 1;
		}

		// ─── 2. 25 modèles diplomatiques Gabon-Madrid ────────────────────
		// Facettes partagées. Matching stable par `seedKey` (priorité), avec
		// fallback par `name.fr` pour migrer les anciens templates seedés
		// AVANT l'introduction du champ seedKey. `applicability: "all"`
		// garantit la visibilité sur toutes les représentations.
		const facettes = buildDiplomaticFacettes(args.logoStorageId);

		const globals = await ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) =>
				q.eq("isGlobal", true).eq("isActive", true),
			)
			.collect();
		const bySeedKey = new Map<string, Id<"documentTemplates">>();
		const byNameFr = new Map<string, Id<"documentTemplates">>();
		for (const g of globals) {
			if (g.seedKey) bySeedKey.set(g.seedKey, g._id);
			const fr = (g.name as { fr?: string }).fr;
			if (fr) byNameFr.set(fr, g._id);
		}

		// Mapping des anciens noms (sans accents) → seedKey, utilisé pour
		// retrouver les 25 templates seedés AVANT l'introduction du champ
		// seedKey. Une fois patchés, le seedKey est persisté et les runs
		// suivants utilisent le matching par seedKey.
		const LEGACY_NAME_TO_SEED_KEY: Record<string, string> = {
			"Attestation d'Hebergement": "diplo_attestation_d_hebergement",
			"Attestation de Legalisation": "diplo_attestation_de_legalisation",
			"Attestation de Prise en Charge": "diplo_attestation_de_prise_en_charge",
			"Certificat de Celibat": "diplo_certificat_de_celibat",
			"Certificat de Nationalite": "diplo_certificat_de_nationalite",
			"Certificat de Residence": "diplo_certificat_de_residence",
			"Certificat de Vie": "diplo_certificat_de_vie",
			Procuration: "diplo_procuration",
			"Aide-Memoire": "diplo_aide_memoire",
			Communique: "diplo_communique",
			"Demande d'Agrement": "diplo_demande_d_agrement",
			"Note Verbale (Ministere)": "diplo_note_verbale_ministere",
			"Note Verbale (Missions Diplomatiques)":
				"diplo_note_verbale_missions_diplomatiques",
			"Bordereau d'Envoi": "diplo_bordereau_d_envoi",
			"Lettre Officielle de l'Ambassadeur":
				"diplo_lettre_officielle_de_l_ambassadeur",
			"Lettre de Felicitations": "diplo_lettre_de_felicitations",
			"Note de Condoleances": "diplo_note_de_condoleances",
			"Note de Service Interne": "diplo_note_de_service_interne",
			"Fiche d'Inscription Consulaire": "diplo_fiche_d_inscription_consulaire",
			"Formulaire de Demande de Visa": "diplo_formulaire_de_demande_de_visa",
			"Laissez-Passer": "diplo_laissez_passer",
			"Attestation sur l'Honneur": "diplo_attestation_sur_l_honneur",
			"Certificat de Capacite Matrimoniale":
				"diplo_certificat_de_capacite_matrimoniale",
			"Certificat de Coutume": "diplo_certificat_de_coutume",
			"Transcription Acte de Naissance":
				"diplo_transcription_acte_de_naissance",
		};
		for (const [legacyName, legacySeedKey] of Object.entries(
			LEGACY_NAME_TO_SEED_KEY,
		)) {
			const existingId = byNameFr.get(legacyName);
			if (existingId && !bySeedKey.has(legacySeedKey)) {
				bySeedKey.set(legacySeedKey, existingId);
			}
		}

		const diplomaticIds: Id<"documentTemplates">[] = [];
		let diplomaticCreated = 0;
		let diplomaticUpdated = 0;

		for (const tpl of DIPLOMATIC_TEMPLATES) {
			const existingId =
				bySeedKey.get(tpl.seedKey) ?? byNameFr.get(tpl.name);
			const contentHtml = contentHtmlBySeedKey[tpl.seedKey];
			const payload = {
				seedKey: tpl.seedKey,
				name: { fr: tpl.name, en: tpl.name },
				description: {
					fr: `Modèle officiel — ${tpl.subfolder}`,
					en: `Official template — ${tpl.subfolder}`,
				},
				category: tpl.category as ServiceCategory,
				templateType: tpl.templateType,
				content: tpl.content,
				...(contentHtml ? { contentHtml } : {}),
				isGlobal: true as const,
				isActive: true,
				// Toutes les représentations (ambassade, consulat, mission, etc.)
				// accèdent aux 25 modèles automatiquement — pas d'attribution
				// explicite requise.
				applicability: "all" as const,
				headerFooter: facettes.headerFooter,
				typography: facettes.typography,
				voice: facettes.voice,
				paperSize: "A4" as const,
				orientation: "portrait" as const,
				marginTop: 21,
				marginRight: 21,
				marginBottom: 21,
				marginLeft: 21,
				updatedAt: now,
			};

			if (existingId) {
				await ctx.db.patch(existingId, payload);
				diplomaticIds.push(existingId);
				diplomaticUpdated++;
			} else {
				const id = await ctx.db.insert("documentTemplates", {
					...payload,
					version: 1,
				});
				diplomaticIds.push(id);
				diplomaticCreated++;
			}
		}

		return {
			receipt: {
				seeded: receiptSeeded,
				skipped: receiptSkipped,
				templateId: receiptTemplateId,
			},
			diplomatic: {
				created: diplomaticCreated,
				updated: diplomaticUpdated,
				total: diplomaticIds.length,
				ids: diplomaticIds,
			},
		};
	},
});

// ============================================================================
// SEED TOUT-EN-UN : SCEAU + 25 MODÈLES DIPLOMATIQUES
// ============================================================================
//
// `seedDefaultTemplates` est une mutation : elle ne peut ni uploader de
// fichier ni lire un asset. On l'enveloppe donc dans une action qui :
//   1. Vérifie si un sceau est déjà présent sur un template (évite les
//      uploads répétés à chaque relance).
//   2. Si non, décode `SCEAU_GABON_BASE64` (bundlé avec le code Convex) et
//      l'upload dans `_storage` via `ctx.storage.store`.
//   3. Déclenche `seedDefaultTemplates` avec le `logoStorageId` obtenu.
//
// Appel depuis le dashboard Convex :
//     functions/documentTemplates:seedDiplomaticDefaultsWithSceau
// (sans argument — tout est autoporté).

/**
 * Récupère le premier `logoStorageId` référencé par les modèles globaux
 * déjà en base. Sert de court-circuit d'idempotence pour l'action
 * `seedDiplomaticDefaultsWithSceau` : inutile de ré-uploader le sceau si
 * un run précédent l'a déjà stocké.
 */
export const getExistingDiplomaticLogoStorageId = internalQuery({
	args: {},
	handler: async (ctx): Promise<Id<"_storage"> | null> => {
		const globals = await ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) =>
				q.eq("isGlobal", true).eq("isActive", true),
			)
			.collect();
		for (const tpl of globals) {
			const id = tpl.headerFooter?.header?.logoStorageId;
			if (id) return id;
		}
		return null;
	},
});

/**
 * Décode une chaîne base64 en `Uint8Array` côté Convex action.
 *
 * `atob` est disponible dans l'environnement V8 des actions, mais renvoie
 * une string "binaire" ; on en extrait les octets via `charCodeAt`.
 */
/**
 * Rendu HTML minimaliste d'un document Tiptap JSON — utilisé pour pré-
 * calculer le `contentHtml` des 25 templates diplomatiques lors du seed,
 * sans dépendre de `@tiptap/html` qui exige un env browser.
 *
 * Supporte uniquement ce dont les 25 templates ont besoin :
 *   - doc / paragraph / heading / text / hardBreak
 *   - table / tableRow / tableCell
 *   - marks : bold / italic / underline / textStyle(fontFamily,fontSize)
 *
 * Ignore silencieusement les nodes / marks inconnus.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderTiptapToHtml(node: any): string {
	if (!node || typeof node !== "object") return "";
	const children = Array.isArray(node.content)
		? node.content.map(renderTiptapToHtml).join("")
		: "";

	switch (node.type) {
		case "doc":
			return children;
		case "paragraph": {
			const align = node.attrs?.textAlign;
			const style = align ? ` style="text-align:${align}"` : "";
			return `<p${style}>${children || "&nbsp;"}</p>`;
		}
		case "heading": {
			const level = Math.min(Math.max(node.attrs?.level ?? 1, 1), 6);
			const align = node.attrs?.textAlign;
			const style = align ? ` style="text-align:${align}"` : "";
			return `<h${level}${style}>${children}</h${level}>`;
		}
		case "hardBreak":
			return "<br/>";
		case "table":
			return `<table>${children}</table>`;
		case "tableRow":
			return `<tr>${children}</tr>`;
		case "tableCell":
		case "tableHeader":
			return `<td>${children}</td>`;
		case "text": {
			let html = escapeHtml(String(node.text ?? ""));
			const marks: Array<{ type: string; attrs?: Record<string, unknown> }> =
				Array.isArray(node.marks) ? node.marks : [];
			for (const mark of marks) {
				switch (mark.type) {
					case "bold":
						html = `<strong>${html}</strong>`;
						break;
					case "italic":
						html = `<em>${html}</em>`;
						break;
					case "underline":
						html = `<u>${html}</u>`;
						break;
					case "textStyle": {
						const attrs = (mark.attrs ?? {}) as {
							fontFamily?: string;
							fontSize?: number | string;
							color?: string;
						};
						const styles: string[] = [];
						if (attrs.fontFamily)
							styles.push(`font-family:'${escapeCss(attrs.fontFamily)}'`);
						if (attrs.fontSize) styles.push(`font-size:${attrs.fontSize}pt`);
						if (attrs.color) styles.push(`color:${escapeCss(attrs.color)}`);
						if (styles.length > 0) {
							html = `<span style="${styles.join(";")}">${html}</span>`;
						}
						break;
					}
				}
			}
			return html;
		}
		default:
			return children;
	}
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function escapeCss(s: string): string {
	// Supprime les caractères qui pourraient briser l'attribut style
	return s.replace(/["'<>;]/g, "");
}

function base64ToBytes(b64: string): Uint8Array {
	const bin = atob(b64);
	const len = bin.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

/**
 * Seed complet : sceau + récépissé + 25 modèles diplomatiques.
 *
 * Idempotent sur tous les plans :
 *   - Le sceau est réutilisé s'il existe déjà dans `_storage` (via lookup
 *     sur les templates).
 *   - `seedDefaultTemplates` patche les modèles par `name.fr` au lieu de
 *     dupliquer.
 *
 * À appeler une seule fois depuis le dashboard Convex ; peut être rejouée
 * sans effet de bord.
 */
type SeedDiplomaticResult = {
	logoStorageId: Id<"_storage">;
	logoUploaded: boolean;
	receipt: {
		seeded: number;
		skipped: number;
		templateId: Id<"documentTemplates">;
	};
	diplomatic: {
		created: number;
		updated: number;
		total: number;
		ids: Id<"documentTemplates">[];
	};
};

export const seedDiplomaticDefaultsWithSceau = internalAction({
	args: {},
	handler: async (ctx): Promise<SeedDiplomaticResult> => {
		// 1. Réutiliser un sceau déjà uploadé si possible
		const existingLogoStorageId: Id<"_storage"> | null = await ctx.runQuery(
			internal.functions.documentTemplates.getExistingDiplomaticLogoStorageId,
			{},
		);
		let logoStorageId: Id<"_storage"> | undefined =
			existingLogoStorageId ?? undefined;

		// 2. Sinon, décoder le base64 bundlé et uploader
		let logoUploaded = false;
		if (!logoStorageId) {
			const bytes = base64ToBytes(SCEAU_GABON_BASE64);
			const blob = new Blob([bytes.buffer as ArrayBuffer], {
				type: SCEAU_GABON_MIME_TYPE,
			});
			logoStorageId = await ctx.storage.store(blob);
			logoUploaded = true;
		}

		// 3. Pré-calcul du `contentHtml` pour chaque modèle diplomatique —
		//    alimente le cache d'aperçu des vignettes `TemplateThumbnailCard`.
		//    Rendu minimaliste écrit à la main (pas de dépendance Tiptap
		//    côté serveur : `@tiptap/html` exige un env browser).
		const contentHtmlBySeedKey: Record<string, string> = {};
		for (const tpl of DIPLOMATIC_TEMPLATES) {
			contentHtmlBySeedKey[tpl.seedKey] = renderTiptapToHtml(tpl.content);
		}

		// 4. Déléguer à la mutation de seed (récépissé + 25 diplomatiques)
		const result = await ctx.runMutation(
			internal.functions.documentTemplates.seedDefaultTemplates,
			{ logoStorageId, contentHtmlBySeedKey },
		);

		return {
			logoStorageId,
			logoUploaded,
			receipt: result.receipt,
			diplomatic: result.diplomatic,
		};
	},
});
