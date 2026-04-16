/**
 * Non-Node helpers for `generatedDocuments`.
 *
 * Kept in a separate file because queries / mutations cannot sit alongside
 * `"use node"` actions in Convex. The action in `generatedDocuments.ts`
 * references these via `internal.functions.generatedDocumentsData.*`.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "../_generated/server";
import { authMutation, authQuery } from "../lib/customFunctions";
import { buildSystemBucket, resolvePlaceholders } from "../lib/placeholderResolver";
import { error, ErrorCode } from "../lib/errors";
import { assertCanPublishDocuments } from "../lib/documentPermissions";
import { isSuperAdmin } from "../lib/permissions";
import { NotificationType } from "../lib/constants";

// ============================================================================
// INTERNAL — load generation context (template + request + user + profile + org)
// ============================================================================

export const loadGenerationContext = internalQuery({
	args: {
		templateId: v.id("documentTemplates"),
		requestId: v.id("requests"),
	},
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template) throw new Error("Template introuvable");
		const request = await ctx.db.get(args.requestId);
		if (!request) throw new Error("Demande introuvable");
		const user = await ctx.db.get(request.userId);
		if (!user) throw new Error("Utilisateur introuvable");
		const org = await ctx.db.get(request.orgId);
		if (!org) throw new Error("Organisation introuvable");

		// Beneficiary profile (the "about whom" — falls back to the user's profile).
		let profileId: Id<"profiles"> | Id<"childProfiles"> | undefined = request.profileId;
		let profile: Record<string, unknown> | undefined;
		if (profileId) {
			const fetched = await ctx.db.get(profileId);
			if (fetched) profile = fetched as unknown as Record<string, unknown>;
		}
		if (!profile) {
			const userProfile = await ctx.db
				.query("profiles")
				.withIndex("by_user", (q) => q.eq("userId", user._id))
				.first();
			if (userProfile) {
				profile = userProfile as unknown as Record<string, unknown>;
				profileId = userProfile._id;
			}
		}
		if (!profileId) {
			throw error(ErrorCode.VALIDATION_ERROR, "Aucun profil associé à cette demande");
		}

		const orgService = await ctx.db.get(request.orgServiceId);
		const service = orgService ? await ctx.db.get(orgService.serviceId) : null;
		const serviceName = service ? pickLocalized(service.name as unknown) : undefined;

		// Resolve placeholders.
		const placeholders = template.placeholders ?? [];
		const system = buildSystemBucket({
			requestReference: request.reference,
			documentNumber: "", // assigned at persist time
			orgName: org.name,
		});
		const resolved = resolvePlaceholders(placeholders, {
			user: user as unknown as Record<string, unknown>,
			profile,
			request: {
				...(request as unknown as Record<string, unknown>),
				serviceName,
			},
			org: org as unknown as Record<string, unknown>,
			formData: request.formData as Record<string, unknown> | undefined,
			system,
		});

		return {
			template,
			request,
			user,
			org,
			profileId: profileId as Id<"profiles">,
			profile,
			resolvedPlaceholders: resolved,
			serviceName,
		};
	},
});

// ============================================================================
// INTERNAL — persist a generated document record
// ============================================================================

export const persistGenerated = internalMutation({
	args: {
		templateId: v.id("documentTemplates"),
		templateVersion: v.number(),
		requestId: v.id("requests"),
		orgId: v.id("orgs"),
		ownerProfileId: v.id("profiles"),
		storageId: v.id("_storage"),
		pdfSha256: v.string(),
		contentSnapshot: v.any(),
		htmlSnapshot: v.optional(v.string()),
		generatedBy: v.id("users"),
		trigger: v.union(
			v.literal("manual"),
			v.literal("status_transition"),
			v.literal("on_submission"),
			v.literal("bulk"),
		),
		documentNumber: v.string(),
		label: v.optional(v.string()),
		/** Override the template's auto-publish flag — auto-triggers use this to
		 * pin publication on/off per rule regardless of the template default. */
		autoPublishOverride: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template) throw new Error("Template introuvable");

		const now = Date.now();
		// Decide whether this document should be visible to the citizen immediately.
		// A template requiring signature always waits for the signature to flip to published.
		const wantsPublish =
			template.requireSignature !== true &&
			(args.autoPublishOverride ?? template.autoPublishToCitizen === true);

		const docId = await ctx.db.insert("generatedDocuments", {
			orgId: args.orgId,
			templateId: args.templateId,
			templateVersion: args.templateVersion,
			requestId: args.requestId,
			ownerProfileId: args.ownerProfileId,
			storageId: args.storageId,
			pdfSha256: args.pdfSha256,
			contentSnapshot: args.contentSnapshot,
			htmlSnapshot: args.htmlSnapshot,
			signatureStatus: "unsigned",
			publishedToCitizen: wantsPublish,
			publishedAt: wantsPublish ? now : undefined,
			publishedBy: wantsPublish ? args.generatedBy : undefined,
			generatedBy: args.generatedBy,
			generatedAt: now,
			generationTrigger: args.trigger,
			documentNumber: args.documentNumber,
			label: args.label,
		});

		// Flip `hasGeneratedDocuments` on the template on first generation.
		if (!template.hasGeneratedDocuments) {
			await ctx.db.patch(args.templateId, {
				hasGeneratedDocuments: true,
				lockedForEditing: true,
			});
		}

		// If the doc went live immediately, emit a notification to the citizen.
		if (wantsPublish) {
			await enqueueCitizenPublicationNotice(ctx, docId);
		}

		return docId;
	},
});

// ============================================================================
// PUBLIC MUTATIONS — Publish / unpublish a generated document
// ============================================================================

/**
 * Manually publish a generated document to the citizen. Requires the caller
 * to be an agent of the document's org with `documents.publish`, and the
 * template-level gating on signature to be satisfied.
 */
export const publishToCitizen = authMutation({
	args: { documentId: v.id("generatedDocuments") },
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.documentId);
		if (!doc) throw new Error("Document introuvable");

		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user_org", (q) =>
				q.eq("userId", ctx.user._id).eq("orgId", doc.orgId),
			)
			.first();
		await assertCanPublishDocuments(ctx, ctx.user, membership);

		const template = await ctx.db.get(doc.templateId);
		if (template?.requireSignature && doc.signatureStatus !== "signed") {
			throw error(
				ErrorCode.VALIDATION_ERROR,
				"Ce modèle exige une signature avant publication",
			);
		}

		if (doc.publishedToCitizen) return args.documentId;

		const now = Date.now();
		await ctx.db.patch(args.documentId, {
			publishedToCitizen: true,
			publishedAt: now,
			publishedBy: ctx.user._id,
			unpublishedAt: undefined,
		});

		await enqueueCitizenPublicationNotice(ctx, args.documentId);
		return args.documentId;
	},
});

/**
 * Withdraw a previously published document from the citizen view — typical
 * use-case is a correction after the document was released too early.
 */
export const unpublish = authMutation({
	args: { documentId: v.id("generatedDocuments") },
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.documentId);
		if (!doc) throw new Error("Document introuvable");

		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user_org", (q) =>
				q.eq("userId", ctx.user._id).eq("orgId", doc.orgId),
			)
			.first();
		await assertCanPublishDocuments(ctx, ctx.user, membership);

		if (!doc.publishedToCitizen) return args.documentId;
		await ctx.db.patch(args.documentId, {
			publishedToCitizen: false,
			unpublishedAt: Date.now(),
		});
		return args.documentId;
	},
});

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/** List generated documents for a given request (agent view — all statuses). */
export const listForRequest = authQuery({
	args: { requestId: v.id("requests") },
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.requestId);
		if (!request) return [];
		// Scope: only agents in the request's org (or super admin) see every status.
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user_org", (q) =>
				q.eq("userId", ctx.user._id).eq("orgId", request.orgId),
			)
			.first();
		const isAgent = membership != null;
		const isOwner = request.userId === ctx.user._id;
		if (!isAgent && !isOwner && !isSuperAdmin(ctx.user)) return [];

		const docs = await ctx.db
			.query("generatedDocuments")
			.withIndex("by_request", (q) => q.eq("requestId", args.requestId))
			.collect();

		// Citizens only see published documents.
		if (!isAgent && !isSuperAdmin(ctx.user)) {
			return docs.filter((d) => d.publishedToCitizen);
		}
		return docs;
	},
});

/** Fetch a specific generated document (with access control). */
export const getById = authQuery({
	args: { documentId: v.id("generatedDocuments") },
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.documentId);
		if (!doc) return null;
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user_org", (q) =>
				q.eq("userId", ctx.user._id).eq("orgId", doc.orgId),
			)
			.first();
		const isAgent = membership != null;
		if (!isAgent && !isSuperAdmin(ctx.user)) {
			// Citizens: must be the owner AND the doc must be published.
			if (!doc.publishedToCitizen) return null;
			const request = doc.requestId ? await ctx.db.get(doc.requestId) : null;
			if (request?.userId !== ctx.user._id) return null;
		}
		return doc;
	},
});

/**
 * List every published generated document belonging to the current citizen
 * across all their requests — powers the "Délivrés par le consulat" vault
 * category in the citizen iDocument page.
 */
export const listPublishedForCitizen = authQuery({
	args: {},
	handler: async (ctx) => {
		// Resolve the citizen's profile (same lookup as loadGenerationContext).
		const profile = await ctx.db
			.query("profiles")
			.withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
			.first();
		if (!profile) return [];
		const docs = await ctx.db
			.query("generatedDocuments")
			.withIndex("by_owner_published", (q) =>
				q.eq("ownerProfileId", profile._id).eq("publishedToCitizen", true),
			)
			.order("desc")
			.collect();
		return docs;
	},
});

/** Get a signed download URL for the PDF (access-controlled). */
export const getDownloadUrl = authQuery({
	args: { documentId: v.id("generatedDocuments") },
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.documentId);
		if (!doc) return null;
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user_org", (q) =>
				q.eq("userId", ctx.user._id).eq("orgId", doc.orgId),
			)
			.first();
		const isAgent = membership != null;
		if (!isAgent && !isSuperAdmin(ctx.user)) {
			if (!doc.publishedToCitizen) return null;
			const request = doc.requestId ? await ctx.db.get(doc.requestId) : null;
			if (request?.userId !== ctx.user._id) return null;
		}
		return await ctx.storage.getUrl(doc.storageId);
	},
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Enqueue an in-app notification for the citizen owning the request behind a
 * generated document. No-op when no owning user is found. Email delivery is
 * intentionally left for a later phase.
 */
async function enqueueCitizenPublicationNotice(
	ctx: MutationCtx,
	documentId: Id<"generatedDocuments">,
): Promise<void> {
	const doc = await ctx.db.get(documentId);
	if (!doc) return;
	const request = doc.requestId ? await ctx.db.get(doc.requestId) : null;
	if (!request) return;
	const label = doc.label ?? "Document officiel";
	await ctx.scheduler.runAfter(
		0,
		internal.functions.notifications.createNotification,
		{
			userId: request.userId,
			type: NotificationType.DocumentPublished,
			title: "Un document officiel est disponible",
			body: `${label} — ${doc.documentNumber}`,
			link: `/my-space/requests/${request.reference}`,
			relatedId: documentId as unknown as string,
			relatedType: "generated_document",
		},
	);
}

function pickLocalized(v: unknown): string | undefined {
	if (!v || typeof v !== "object") return undefined;
	const obj = v as Record<string, unknown>;
	if (typeof obj.fr === "string" && obj.fr.length > 0) return obj.fr;
	if (typeof obj.en === "string" && obj.en.length > 0) return obj.en;
	return undefined;
}
