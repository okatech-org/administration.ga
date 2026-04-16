import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { authMutation, authQuery } from "../lib/customFunctions";
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

		// Global templates — filter by allowedOrgTypes.
		const globalTemplates = await ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();
		const visibleGlobals = globalTemplates.filter((t) =>
			orgTypeAllowed(t.allowedOrgTypes, orgType),
		);

		// Merge and deduplicate (an org template won't overlap a global by _id).
		const allTemplates = [...orgTemplates, ...visibleGlobals];

		let filtered = allTemplates;
		if (args.category) {
			filtered = filtered.filter((t) => t.category === args.category);
		}
		if (args.templateType) {
			filtered = filtered.filter((t) => t.templateType === args.templateType);
		}
		return filtered;
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
		return all.filter((t) => orgTypeAllowed(t.allowedOrgTypes, org.type));
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
			orgTypeAllowed(t.allowedOrgTypes, org.type),
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
			if (!orgTypeAllowed(source.allowedOrgTypes, org.type)) {
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
			paperSize: source.paperSize,
			orientation: source.orientation,
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
			? globalTemplates.filter((t) => orgTypeAllowed(t.allowedOrgTypes, orgType))
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
			(t) => !t.isGlobal || orgTypeAllowed(t.allowedOrgTypes, orgType),
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
		paperSize: v.optional(v.union(v.literal("A4"), v.literal("LETTER"))),
		orientation: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),
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
		paperSize: v.optional(v.union(v.literal("A4"), v.literal("LETTER"))),
		orientation: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),
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
		if (!orgTypeAllowed(source.allowedOrgTypes, org.type)) {
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
			paperSize: source.paperSize,
			orientation: source.orientation,
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
			paperSize: source.paperSize,
			orientation: source.orientation,
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
		let query = ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true));
		const all = await query.collect();
		return args.category ? all.filter((t) => t.category === args.category) : all;
	},
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Returns true when a global template is accessible to the given org type.
 *  - Unrestricted (`allowedOrgTypes` undefined/empty) → always true.
 *  - Restricted → the org type must be explicitly listed.
 *  - Missing org type (should not happen in practice) → denied.
 */
function orgTypeAllowed(
	allowed: string[] | undefined,
	orgType: string | undefined,
): boolean {
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

/**
 * Seeds a single French-language "Récépissé de Dépôt" template as a global
 * template. More templates can be added through the backoffice UI once the
 * editor ships. This seed is idempotent — safe to re-run.
 */
export const seedDefaultTemplates = internalMutation({
	args: {},
	handler: async (ctx) => {
		const template = {
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
					{ type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "République Gabonaise" }] },
					para([
						"Le Consulat Général du Gabon accuse réception de la demande suivante :",
					]),
					para(
						[
							"Référence : ",
							{ placeholder: "requestReference", source: "request", label: "Référence" },
						],
					),
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
						{ placeholder: "submissionDate", source: "system", label: "Date de dépôt" },
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
				{ key: "requestReference", label: { fr: "Référence", en: "Reference" }, source: "request" as const },
				{ key: "serviceName", label: { fr: "Service", en: "Service" }, source: "request" as const, path: "serviceName" },
				{ key: "firstName", label: { fr: "Prénom", en: "First Name" }, source: "user" as const, path: "firstName" },
				{ key: "lastName", label: { fr: "Nom", en: "Last Name" }, source: "user" as const, path: "lastName" },
				{ key: "submissionDate", label: { fr: "Date de dépôt", en: "Submission Date" }, source: "system" as const },
				{ key: "today", label: { fr: "Date du jour", en: "Today's date" }, source: "system" as const },
			],
			isGlobal: true,
			isActive: true,
			autoPublishToCitizen: true,
			requireSignature: false,
			paperSize: "A4" as const,
			orientation: "portrait" as const,
		};

		const existing = await ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.filter((q) => q.eq(q.field("templateType"), "receipt"))
			.first();

		if (existing) {
			return { seeded: 0, skipped: 1, templateId: existing._id };
		}

		const templateId = await ctx.db.insert("documentTemplates", {
			...template,
			version: 1,
			updatedAt: Date.now(),
		});

		return { seeded: 1, skipped: 0, templateId };
	},
});
