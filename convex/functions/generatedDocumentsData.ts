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
import {
	buildSystemBucket,
	describeResolution,
	resolvePlaceholders,
} from "../lib/placeholderResolver";
import { fieldMappingValidator } from "../schemas/orgServices";
import { collectPlaceholderKeys } from "@workspace/document-rendering/placeholder-utils";
import { canDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";
import {
	assertCanPublishDocuments,
	assertCanSignDocuments,
	assertPositionAllowedToSign,
} from "../lib/documentPermissions";
import { isSuperAdmin } from "../lib/permissions";
import { NotificationType } from "../lib/constants";

// ============================================================================
// INTERNAL — load generation context (template + request + user + profile + org)
// ============================================================================

export const loadGenerationContext = internalQuery({
	args: {
		templateId: v.id("documentTemplates"),
		requestId: v.id("requests"),
		// Per-placeholder mapping override applied during resolution. When a
		// key matches an entry, (source, path) override the descriptor, or
		// `literal` short-circuits the resolution with a free-text value.
		fieldMappingOverride: v.optional(fieldMappingValidator),
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

		// Resolve placeholders. Merge declared descriptors with placeholders
		// referenced inline in the Tiptap content (same logic as the preview
		// query) — otherwise an inline `{{key}}` without a descriptor would
		// throw `PlaceholderResolutionError` from substitutePlaceholders.
		const declared = template.placeholders ?? [];
		const inlineKeys = template.content
			? collectPlaceholderKeys(template.content as never)
			: new Set<string>();
		const declaredKeys = new Set(declared.map((p) => p.key));
		const placeholders: Array<{
			key: string;
			source: "user" | "profile" | "request" | "formData" | "org" | "system";
			path?: string;
			label?: Record<string, string>;
		}> = [...declared];
		for (const key of inlineKeys) {
			if (!declaredKeys.has(key)) {
				placeholders.push({ key, source: "formData", path: key });
			}
		}
		const system = buildSystemBucket({
			requestReference: request.reference,
			documentNumber: "", // assigned at persist time
			orgName: org.name,
			// Branding de la rep : surcharge la ville, le signataire et son
			// titre dans les placeholders `system`. Absent ⇒ fallbacks
			// appliqués par `buildSystemBucket`.
			cityName: org.branding?.cityName,
			signerName: org.branding?.signerName,
			signerTitle: org.branding?.signerTitle,
		});
		const resolved = resolvePlaceholders(
			placeholders,
			{
				user: user as unknown as Record<string, unknown>,
				profile,
				request: {
					...(request as unknown as Record<string, unknown>),
					serviceName,
				},
				org: org as unknown as Record<string, unknown>,
				formData: request.formData as Record<string, unknown> | undefined,
				system,
			},
			{ mappingOverride: args.fieldMappingOverride },
		);

		// Les 3 facettes (`headerFooter`, `typography`, `voice`) sont
		// incluses dans le document `template` lui-même — plus besoin
		// de charger des tables séparées.
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

/**
 * Read-only preview of placeholder resolution against a request, plus the
 * template's Tiptap content and the catalogue of available bucket paths for
 * the manual-mapping autocomplete. Powers the 2-stage "Aperçu / Mapping"
 * UI in `OfficialDocumentsSection > GenerateDialog`.
 *
 * Returns:
 *  - `placeholders`: per-key status (`resolved` / `empty` / `error`) — never
 *     throws on missing values, so the UI can render a banner.
 *  - `templateContent`: Tiptap JSON of the template body for the visual preview.
 *  - `availablePaths`: flat list of `(source, path, sampleValue)` triples
 *     covering ~3 levels of each bucket — feeds the path autocomplete.
 *
 * Permission: `documents.generate` on the request's org (gated like the
 * generation action itself; super-admin bypasses).
 */
export const previewResolvedPlaceholders = authQuery({
	args: {
		requestId: v.id("requests"),
		templateId: v.id("documentTemplates"),
		fieldMappingOverride: v.optional(fieldMappingValidator),
	},
	handler: async (ctx, args) => {
		const template = await ctx.db.get(args.templateId);
		if (!template) throw new Error("Template introuvable");
		const request = await ctx.db.get(args.requestId);
		if (!request) throw new Error("Demande introuvable");

		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user_org", (q) =>
				q.eq("userId", ctx.user._id).eq("orgId", request.orgId),
			)
			.first();
		// Reuse `documents.generate` as the gate — the same permission that
		// controls running the generation itself.
		const allowed = await canDoTask(ctx, ctx.user, membership, "documents.generate");
		if (!allowed) {
			throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
		}

		const user = await ctx.db.get(request.userId);
		const org = await ctx.db.get(request.orgId);
		if (!user || !org) throw new Error("Contexte incomplet");

		let profile: Record<string, unknown> | undefined;
		if (request.profileId) {
			const fetched = await ctx.db.get(request.profileId);
			if (fetched) profile = fetched as unknown as Record<string, unknown>;
		}

		const orgService = await ctx.db.get(request.orgServiceId);
		const service = orgService ? await ctx.db.get(orgService.serviceId) : null;
		const serviceName = service ? pickLocalized(service.name as unknown) : undefined;
		const system = buildSystemBucket({
			requestReference: request.reference,
			documentNumber: "",
			orgName: org.name,
			cityName: org.branding?.cityName,
			signerName: org.branding?.signerName,
			signerTitle: org.branding?.signerTitle,
		});

		const buckets = {
			user: user as unknown as Record<string, unknown>,
			profile,
			request: {
				...(request as unknown as Record<string, unknown>),
				serviceName,
			},
			org: org as unknown as Record<string, unknown>,
			formData: request.formData as Record<string, unknown> | undefined,
			system,
		} satisfies Record<string, Record<string, unknown> | undefined>;

		const declared = (template.placeholders ?? []) as Parameters<
			typeof describeResolution
		>[0];

		// Merge the descriptor array with placeholders found INLINE in the
		// Tiptap content. A `{{key}}` node in the body without a matching
		// descriptor would silently fail at generation time — surface it in
		// the preview so the agent can see (and remap) it. For inline-only
		// keys we default to source="formData" + path=key, mirroring the
		// resolver's expectations.
		const inlineKeys = template.content
			? collectPlaceholderKeys(template.content as never)
			: new Set<string>();
		const declaredKeys = new Set(declared.map((p) => p.key));
		const merged = [...declared];
		for (const key of inlineKeys) {
			if (!declaredKeys.has(key)) {
				merged.push({ key, source: "formData", path: key });
			}
		}

		const placeholderEntries = describeResolution(merged, buckets, {
			mappingOverride: args.fieldMappingOverride,
		});

		const formSchema = (service?.formSchema ?? null) as FormSchemaShape | null;
		const availablePaths = buildAvailablePaths(buckets, formSchema);

		return {
			placeholders: placeholderEntries,
			templateContent: template.content,
			availablePaths,
		};
	},
});

/**
 * Build the catalogue of fields the agent can map to in the manual mapping UI.
 *
 * Curated whitelist per source, NOT a recursive walker — agents shouldn't see
 * `actionsRequired`, `documents`, validation timestamps, etc. Each entry has
 * a human-readable `label` (the form field's localized label, or a hard-coded
 * French label for meta/system fields), the technical `path`, and a short
 * `sampleValue` from the actual request data.
 */
const SOURCES = ["user", "profile", "request", "formData", "org", "system"] as const;
type SourceName = (typeof SOURCES)[number];

interface AvailablePathEntry {
	source: SourceName;
	path: string;
	label: string;
	sampleValue: string;
}

interface FormSchemaShape {
	sections?: Array<{
		id: string;
		title?: { fr?: string; en?: string };
		fields?: Array<{
			id: string;
			label?: { fr?: string; en?: string };
		}>;
	}>;
}

function buildAvailablePaths(
	buckets: Record<SourceName, Record<string, unknown> | undefined>,
	formSchema: FormSchemaShape | null,
): AvailablePathEntry[] {
	const out: AvailablePathEntry[] = [];

	const push = (
		source: SourceName,
		path: string,
		label: string,
	) => {
		const value = readPathLocal(buckets[source], path);
		out.push({ source, path, label, sampleValue: formatSample(value) });
	};

	// — user — identité du compte courant (pas la cible du document)
	push("user", "firstName", "Prénom du compte");
	push("user", "lastName", "Nom du compte");
	push("user", "email", "Email du compte");
	push("user", "phone", "Téléphone du compte");

	// — profile — bénéficiaire du document
	push("profile", "identity.firstName", "Prénom");
	push("profile", "identity.lastName", "Nom");
	push("profile", "identity.birthDate", "Date de naissance");
	push("profile", "identity.birthPlace", "Lieu de naissance");
	push("profile", "identity.birthCountry", "Pays de naissance");
	push("profile", "identity.nationality", "Nationalité");
	push("profile", "identity.gender", "Genre");
	push("profile", "contactInfo.email", "Email du bénéficiaire");
	push("profile", "contactInfo.phone", "Téléphone du bénéficiaire");
	push("profile", "contactInfo.street", "Adresse — rue");
	push("profile", "contactInfo.city", "Adresse — ville");
	push("profile", "contactInfo.postalCode", "Adresse — code postal");
	push("profile", "contactInfo.country", "Adresse — pays");

	// — request — méta-info de la demande (whitelist serrée, pas le dump)
	push("request", "reference", "Référence de la demande");
	push("request", "status", "Statut");
	push("request", "priority", "Priorité");
	push("request", "submittedAt", "Date de soumission (timestamp)");
	push("request", "updatedAt", "Date de mise à jour (timestamp)");
	push("request", "serviceName", "Nom du service");

	// — formData — dérivé du formSchema du service, pour avoir des labels
	if (formSchema?.sections) {
		for (const section of formSchema.sections) {
			const sectionTitle = pickLoc(section.title);
			for (const field of section.fields ?? []) {
				const path = `${section.id}.${field.id}`;
				const baseLabel = pickLoc(field.label) ?? field.id;
				const fullLabel = sectionTitle
					? `${sectionTitle} — ${baseLabel}`
					: baseLabel;
				push("formData", path, fullLabel);
			}
		}
	}

	// — org — branding officiel
	push("org", "name", "Nom de l'organisme");
	push("org", "branding.cityName", "Ville (pied de page)");
	push("org", "branding.signerName", "Nom du signataire");
	push("org", "branding.signerTitle", "Titre du signataire");

	// — system — placeholders calculés au moment de la génération
	push("system", "today", "Date du jour");
	push("system", "todayIso", "Date du jour (ISO)");
	push("system", "submissionDate", "Date de soumission");
	push("system", "requestReference", "Référence de la demande");
	push("system", "documentNumber", "Numéro du document");
	push("system", "orgName", "Nom de l'organisme");
	push("system", "city", "Ville");
	push("system", "signerName", "Nom du signataire");
	push("system", "signerTitle", "Titre du signataire");

	return out;
}

function readPathLocal(
	bucket: Record<string, unknown> | undefined,
	path: string,
): unknown {
	if (!bucket) return undefined;
	const parts = path.split(".").filter(Boolean);
	let cursor: unknown = bucket;
	for (const part of parts) {
		if (cursor === null || cursor === undefined) return undefined;
		if (typeof cursor !== "object") return undefined;
		cursor = (cursor as Record<string, unknown>)[part];
	}
	return cursor;
}

function pickLoc(v: unknown): string | undefined {
	if (!v || typeof v !== "object") return undefined;
	const obj = v as Record<string, unknown>;
	if (typeof obj.fr === "string" && obj.fr.length > 0) return obj.fr;
	if (typeof obj.en === "string" && obj.en.length > 0) return obj.en;
	return undefined;
}

function formatSample(v: unknown): string {
	if (v === null || v === undefined) return "";
	if (typeof v === "object") {
		const obj = v as Record<string, unknown>;
		if (typeof obj.fr === "string") return formatSample(obj.fr);
		if (typeof obj.en === "string") return formatSample(obj.en);
		if (Array.isArray(v)) return `${v.length} élément(s)`;
		return "";
	}
	const s = String(v);
	return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

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
// INTERNAL — Signature helpers (called by `signDocument` action)
// ============================================================================

/**
 * Gather everything the signDocument action needs to overlay the signature
 * and gate it by permissions. Runs as a query (no side-effects) — the
 * action carries the returned storageIds across to Node.
 *
 * Returns extra context for the multi-signer flow (PR2):
 *  - `templatePlaceholders` : ids of every `signaturePlaceholder` node in the
 *     template, with their optional `signerRole`. The caller picks the slot.
 *  - `existingSigners` : signatures already recorded on this document.
 *  - `contentSnapshot` + layout options : enough to re-render the PDF with
 *     the new signature substituted.
 *  - `signerPositionCode` : the position code of the calling agent (used to
 *     match `signerRole` to placeholders).
 */
export const prepareSignature = internalQuery({
	args: { documentId: v.id("generatedDocuments") },
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.documentId);
		if (!doc) throw new Error("Document introuvable");
		if (doc.signatureStatus === "signed") {
			throw error(ErrorCode.VALIDATION_ERROR, "Document déjà signé");
		}
		const template = await ctx.db.get(doc.templateId);
		if (!template) throw new Error("Template introuvable");

		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw error(ErrorCode.NOT_AUTHENTICATED, "Authentification requise");
		const user = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
			.first();
		if (!user) throw error(ErrorCode.USER_NOT_FOUND, "Utilisateur inconnu");

		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_user_org", (q) =>
				q.eq("userId", user._id).eq("orgId", doc.orgId),
			)
			.first();
		await assertCanSignDocuments(ctx, user, membership);
		if (!membership) {
			throw error(ErrorCode.FORBIDDEN, "Adhésion introuvable");
		}
		await assertPositionAllowedToSign(ctx, membership, template);

		const sig = membership.diplomaticProfile?.officialSignature;
		if (!sig?.imageStorageId) {
			throw error(
				ErrorCode.VALIDATION_ERROR,
				"Aucune signature configurée — charge une image PNG avant de signer",
			);
		}

		// Walk the template's canonical Tiptap content for signaturePlaceholder
		// nodes. We keep a flat list { id, signerRole } for the caller to
		// match against `signerPositionCode`.
		const templatePlaceholders = collectSignaturePlaceholderSlots(
			template.content,
		);

		// Resolve the membership's position code (used by the caller to match
		// signerRole on a placeholder). May be undefined for legacy memberships.
		let signerPositionCode: string | undefined;
		if (membership.positionId) {
			const pos = await ctx.db.get(membership.positionId);
			signerPositionCode = pos?.code;
		}

		return {
			originalStorageId: doc.storageId,
			signatureStorageId: sig.imageStorageId,
			documentNumber: doc.documentNumber,
			title: sig.title ?? null,
			displayName:
				sig.displayName ??
				([user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
					user.name),
			signerId: user._id,
			signerPositionCode,
			// Multi-signer context (empty if legacy template).
			templatePlaceholders,
			existingSigners: doc.signers ?? [],
			contentSnapshot: doc.contentSnapshot,
			templatePaperSize: template.paperSize,
			templateOrientation: template.orientation,
			templateMargins: {
				top: template.marginTop,
				right: template.marginRight,
				bottom: template.marginBottom,
				left: template.marginLeft,
			},
			templateAutoPublish: template.autoPublishToCitizen === true,
		};
	},
});

/** Lightweight walker — returns `{id, signerRole}` for every signaturePlaceholder. */
function collectSignaturePlaceholderSlots(
	root: unknown,
): Array<{ id: string; signerRole?: string }> {
	const out: Array<{ id: string; signerRole?: string }> = [];
	function visit(n: unknown): void {
		if (!n || typeof n !== "object") return;
		const node = n as Record<string, unknown>;
		if (node.type === "signaturePlaceholder") {
			const attrs = (node.attrs ?? {}) as Record<string, unknown>;
			const id = typeof attrs.id === "string" ? attrs.id : undefined;
			if (id) {
				out.push({
					id,
					signerRole:
						typeof attrs.signerRole === "string" ? attrs.signerRole : undefined,
				});
			}
		}
		const content = node.content;
		if (Array.isArray(content)) {
			for (const child of content) visit(child);
		}
	}
	visit(root);
	return out;
}

/**
 * Persist the result of a successful (legacy single-signer) signing operation.
 * Used when the template has NO `signaturePlaceholder` nodes — falls back to
 * the bottom-right pdf-lib overlay. Patches the record and enqueues the
 * citizen notification if the template auto-publishes on signature.
 */
export const finalizeSignature = internalMutation({
	args: {
		documentId: v.id("generatedDocuments"),
		storageId: v.id("_storage"),
		pdfSha256: v.string(),
		signedBy: v.id("users"),
		signatureImageStorageId: v.id("_storage"),
	},
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.documentId);
		if (!doc) throw new Error("Document introuvable");
		const template = await ctx.db.get(doc.templateId);

		const now = Date.now();
		const shouldPublish =
			template?.autoPublishToCitizen === true && !doc.publishedToCitizen;

		await ctx.db.patch(args.documentId, {
			storageId: args.storageId,
			pdfSha256: args.pdfSha256,
			signatureStatus: "signed",
			signedBy: args.signedBy,
			signedAt: now,
			signatureImageStorageId: args.signatureImageStorageId,
			...(shouldPublish
				? {
						publishedToCitizen: true,
						publishedAt: now,
						publishedBy: args.signedBy,
						unpublishedAt: undefined,
					}
				: {}),
		});

		if (shouldPublish) {
			await enqueueCitizenPublicationNotice(ctx, args.documentId);
		}
		return args.documentId;
	},
});

/**
 * Persist the result of a multi-signer slot fill. Appends a new entry to
 * `signers[]`, patches the storage with the re-rendered PDF and recomputes
 * the global `signatureStatus` based on the slot completion ratio.
 */
export const finalizeMultiSignature = internalMutation({
	args: {
		documentId: v.id("generatedDocuments"),
		storageId: v.id("_storage"),
		pdfSha256: v.string(),
		newSigner: v.object({
			signaturePlaceholderId: v.string(),
			signerRole: v.optional(v.string()),
			userId: v.id("users"),
			signerName: v.optional(v.string()),
			signedAt: v.number(),
			signatureImageStorageId: v.id("_storage"),
			priorPdfSha256: v.optional(v.string()),
		}),
		/** Total number of `signaturePlaceholder` slots in the template. */
		totalSlots: v.number(),
	},
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.documentId);
		if (!doc) throw new Error("Document introuvable");
		const template = await ctx.db.get(doc.templateId);

		const existing = doc.signers ?? [];
		const nextSigners = [...existing, args.newSigner];

		// Filled slots = unique placeholderIds in `signers`.
		const filledIds = new Set(nextSigners.map((s) => s.signaturePlaceholderId));
		const fullySigned = filledIds.size >= args.totalSlots;

		const now = Date.now();
		const shouldPublish =
			fullySigned &&
			template?.autoPublishToCitizen === true &&
			!doc.publishedToCitizen;

		await ctx.db.patch(args.documentId, {
			storageId: args.storageId,
			pdfSha256: args.pdfSha256,
			signers: nextSigners,
			signatureStatus: fullySigned ? "signed" : "partially_signed",
			...(fullySigned
				? {
						signedBy: args.newSigner.userId,
						signedAt: args.newSigner.signedAt,
						signatureImageStorageId: args.newSigner.signatureImageStorageId,
					}
				: {}),
			...(shouldPublish
				? {
						publishedToCitizen: true,
						publishedAt: now,
						publishedBy: args.newSigner.userId,
						unpublishedAt: undefined,
					}
				: {}),
		});

		if (shouldPublish) {
			await enqueueCitizenPublicationNotice(ctx, args.documentId);
		}
		return args.documentId;
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

/**
 * Hard-delete a generated document. Removes the storage blob, then the row.
 * Gated by `documents.generate` (the same permission that produced it).
 * Refuses to delete a signed document — those are evidentiary, the agent
 * should unpublish/regenerate instead.
 */
export const deleteGenerated = authMutation({
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
		const allowed = await canDoTask(
			ctx,
			ctx.user,
			membership,
			"documents.generate",
		);
		if (!allowed) {
			throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
		}

		if (doc.signatureStatus === "signed") {
			throw error(
				ErrorCode.VALIDATION_ERROR,
				"Un document signé ne peut pas être supprimé — désindexe-le ou régénère-le à la place.",
			);
		}

		await ctx.storage.delete(doc.storageId);
		await ctx.db.delete(args.documentId);
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
