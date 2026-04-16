import { defineTable } from "convex/server";
import { v } from "convex/values";
import { serviceCategoryValidator, localizedStringValidator } from "../lib/validators";

/**
 * Document Templates — templates for generating official PDF documents
 * (attestations, certificates, receipts, letters...).
 *
 * The `content` field is now a Tiptap JSON document (ProseMirror node tree).
 * Live preview, HTML serialization and PDF generation all walk this same tree
 * via the shared `@workspace/document-rendering` package.
 *
 * Templates are either global (managed by the platform super admin — read-only
 * for orgs) or org-specific (managed by agents with `documents.templates.manage`).
 * Every meaningful edit snapshots the current state into
 * `documentTemplateVersions`, preserving history.
 */
export const documentTemplatesTable = defineTable({
	// Basic info (localized labels)
	name: localizedStringValidator,
	description: v.optional(localizedStringValidator),

	// Category — matches service categories
	category: v.optional(serviceCategoryValidator),

	// Optional link to a specific consular service
	serviceId: v.optional(v.id("services")),

	// Template type (certificate / attestation / receipt / letter / custom)
	templateType: v.union(
		v.literal("certificate"),
		v.literal("attestation"),
		v.literal("receipt"),
		v.literal("letter"),
		v.literal("custom")
	),

	// Tiptap JSON document. Validated at runtime — schema is too recursive for
	// `v` validators to express precisely.
	content: v.any(),

	// Cached HTML rendering of `content` (regenerated on save). Allows cheap
	// listing previews without re-running the Tiptap renderer.
	contentHtml: v.optional(v.string()),

	// Placeholders declared on the template. The picker UI reads this list and
	// the resolver validates all placeholder keys encountered in `content` are
	// covered here (fail-fast at generation time).
	placeholders: v.optional(
		v.array(
			v.object({
				key: v.string(),
				label: localizedStringValidator,
				source: v.union(
					v.literal("user"),
					v.literal("profile"),
					v.literal("request"),
					v.literal("formData"),
					v.literal("org"),
					v.literal("system")
				),
				// Optional JSONPath against the source bucket (e.g. `identity.firstName`).
				path: v.optional(v.string()),
			})
		)
	),

	// Ownership
	orgId: v.optional(v.id("orgs")), // null = global template
	createdBy: v.optional(v.id("users")),

	// Visibility / lifecycle
	isGlobal: v.boolean(),
	isActive: v.boolean(),

	// Locked once a document has been generated from this template. Further
	// edits force a new version rather than mutating the live record.
	lockedForEditing: v.optional(v.boolean()),
	/** Flipped on at the first generation; purely informational. */
	hasGeneratedDocuments: v.optional(v.boolean()),

	// Generation / publication behaviour
	/** If true, generated documents are automatically visible to the citizen. */
	autoPublishToCitizen: v.optional(v.boolean()),
	/** If true, a document cannot be published to a citizen until it is signed. */
	requireSignature: v.optional(v.boolean()),
	/** Position codes allowed to sign documents produced from this template. */
	allowedSignerPositions: v.optional(v.array(v.string())),

	// Paper settings
	paperSize: v.optional(v.union(v.literal("A4"), v.literal("LETTER"))),
	orientation: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),

	// Versioning metadata (history lives in `documentTemplateVersions`)
	version: v.optional(v.number()),
	updatedAt: v.optional(v.number()),

	// ─── Clone provenance ────────────────────────────────────────────────
	// Set when this template was created via `cloneFromGlobal`. Used to
	// surface a "source has a newer version" banner and to offer a one-click
	// sync through `syncFromSource`.
	clonedFromTemplateId: v.optional(v.id("documentTemplates")),
	/** Snapshot of the source template's `version` at clone time. */
	clonedFromVersion: v.optional(v.number()),
})
	.index("by_org", ["orgId", "isActive"])
	.index("by_category", ["category", "isActive"])
	.index("by_service", ["serviceId", "isActive"])
	.index("by_global", ["isGlobal", "isActive"])
	.index("by_type", ["templateType", "isActive"]);
