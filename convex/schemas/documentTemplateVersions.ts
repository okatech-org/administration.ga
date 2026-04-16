import { defineTable } from "convex/server";
import { v } from "convex/values";
import { localizedStringValidator } from "../lib/validators";

/**
 * Full version history for document templates.
 *
 * Every meaningful edit to a `documentTemplates` row (content or publication
 * flags) archives the PREVIOUS state here before patching the live record.
 * This lets an agent restore an older version and audit who changed what.
 *
 * Generated documents store the `templateVersion` they were produced from and
 * a full content snapshot so that changes to the live template never alter
 * already-issued PDFs retroactively.
 */
export const documentTemplateVersionsTable = defineTable({
	templateId: v.id("documentTemplates"),
	version: v.number(),

	// Snapshot of the template state at this version
	content: v.any(), // Tiptap JSON
	contentHtml: v.optional(v.string()),
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
				path: v.optional(v.string()),
			})
		)
	),
	name: localizedStringValidator,
	description: v.optional(localizedStringValidator),
	paperSize: v.optional(v.union(v.literal("A4"), v.literal("LETTER"))),
	orientation: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),
	autoPublishToCitizen: v.optional(v.boolean()),
	requireSignature: v.optional(v.boolean()),
	allowedSignerPositions: v.optional(v.array(v.string())),

	// Bookkeeping
	createdAt: v.number(),
	createdBy: v.optional(v.id("users")),
	changeNote: v.optional(v.string()),
})
	.index("by_template_version", ["templateId", "version"])
	.index("by_template_createdAt", ["templateId", "createdAt"]);
