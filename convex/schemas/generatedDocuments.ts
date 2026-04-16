import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Generated Documents — official PDFs produced by the document generation
 * pipeline from a template + a request (or standalone, in the future).
 *
 * This table is deliberately SEPARATE from `documents` (user-uploaded /
 * vault documents) because:
 *  - Different lifecycle (signature / publication workflow)
 *  - Different access rules (citizens see only published ones)
 *  - Different audit requirements (hash, template version snapshot)
 *
 * A generated document references both:
 *  - `templateId` + `templateVersion` — the version used (never updates)
 *  - `contentSnapshot` — the resolved Tiptap JSON actually rendered
 *  - `storageId` — the final PDF bytes
 */
export const generatedDocumentsTable = defineTable({
	// Ownership and context
	orgId: v.id("orgs"),
	templateId: v.id("documentTemplates"),
	templateVersion: v.number(),
	/** Request this document was generated for, if any. */
	requestId: v.optional(v.id("requests")),
	/** Citizen profile the document is about (beneficiary). */
	ownerProfileId: v.id("profiles"),

	// Storage
	storageId: v.id("_storage"), // final PDF (may be re-stored after signing)
	pdfSha256: v.string(),
	/** Resolved Tiptap JSON tree used to produce the PDF (audit trail). */
	contentSnapshot: v.any(),
	/** Resolved HTML snapshot — mirrors the Tiptap tree above. */
	htmlSnapshot: v.optional(v.string()),

	// Signature state
	signatureStatus: v.union(
		v.literal("unsigned"),
		v.literal("pending_signature"),
		// Multi-signer: at least one slot signed, but not all required slots.
		v.literal("partially_signed"),
		v.literal("signed")
	),
	/**
	 * Multi-signer audit log — one entry per signed slot. Each entry binds a
	 * signer to a specific `signaturePlaceholder` id from the template (see
	 * `signers[].signaturePlaceholderId`). A document is `signed` when every
	 * `signaturePlaceholder` in the template has at least one matching entry.
	 *
	 * Templates with NO `signaturePlaceholder` fall back to the legacy
	 * single-signer flow (signedBy/signedAt below) and the bottom-right
	 * overlay placement.
	 */
	signers: v.optional(
		v.array(
			v.object({
				signaturePlaceholderId: v.string(),
				signerRole: v.optional(v.string()),
				userId: v.id("users"),
				signerName: v.optional(v.string()),
				signedAt: v.number(),
				signatureImageStorageId: v.id("_storage"),
				/** SHA-256 of the PDF *before* this signature was applied. */
				priorPdfSha256: v.optional(v.string()),
			})
		)
	),
	// Legacy single-signer fields — kept for back-compat and for templates
	// without any `signaturePlaceholder` node. New documents using the
	// multi-signer flow rely on `signers[]` instead.
	signedBy: v.optional(v.id("users")),
	signedAt: v.optional(v.number()),
	signatureImageStorageId: v.optional(v.id("_storage")),
	sealStorageId: v.optional(v.id("_storage")),

	// Citizen publication state
	publishedToCitizen: v.boolean(),
	publishedAt: v.optional(v.number()),
	publishedBy: v.optional(v.id("users")),
	unpublishedAt: v.optional(v.number()),

	// Generation metadata
	generatedBy: v.id("users"),
	generatedAt: v.number(),
	generationTrigger: v.union(
		v.literal("manual"),
		v.literal("status_transition"),
		v.literal("on_submission"),
		v.literal("bulk")
	),
	/** Human-readable reference (e.g. `GAB-DOC-2026-0001`). */
	documentNumber: v.string(),

	// Optional free-form label shown in lists (defaults to the template name).
	label: v.optional(v.string()),
})
	.index("by_request", ["requestId"])
	.index("by_owner_published", ["ownerProfileId", "publishedToCitizen"])
	.index("by_org_status", ["orgId", "signatureStatus"])
	.index("by_template", ["templateId"])
	.index("by_documentNumber", ["documentNumber"]);
