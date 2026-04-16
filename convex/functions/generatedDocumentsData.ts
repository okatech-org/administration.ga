/**
 * Non-Node helpers for `generatedDocuments`.
 *
 * Kept in a separate file because queries / mutations cannot sit alongside
 * `"use node"` actions in Convex. The action in `generatedDocuments.ts`
 * references these via `internal.functions.generatedDocumentsData.*`.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	query,
} from "../_generated/server";
import { authQuery } from "../lib/customFunctions";
import { buildSystemBucket, resolvePlaceholders } from "../lib/placeholderResolver";
import { error, ErrorCode } from "../lib/errors";
import { isSuperAdmin } from "../lib/permissions";

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
	},
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template) throw new Error("Template introuvable");

		const now = Date.now();
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
			publishedToCitizen: template.autoPublishToCitizen === true && template.requireSignature !== true,
			publishedAt: template.autoPublishToCitizen === true && template.requireSignature !== true ? now : undefined,
			publishedBy: template.autoPublishToCitizen === true && template.requireSignature !== true ? args.generatedBy : undefined,
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

		return docId;
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

function pickLocalized(v: unknown): string | undefined {
	if (!v || typeof v !== "object") return undefined;
	const obj = v as Record<string, unknown>;
	if (typeof obj.fr === "string" && obj.fr.length > 0) return obj.fr;
	if (typeof obj.en === "string" && obj.en.length > 0) return obj.en;
	return undefined;
}
