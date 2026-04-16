import { defineTable } from "convex/server";
import { v } from "convex/values";
import { serviceCategoryValidator, localizedStringValidator } from "../lib/validators";

/**
 * Document Templates - PDF templates for generating official documents
 * Templates can be organization-specific or global
 */
export const documentTemplatesTable = defineTable({
	// Basic info
	name: localizedStringValidator,
	description: v.optional(localizedStringValidator),

	// Category - matches service categories
	category: v.optional(serviceCategoryValidator),

	// Link to specific service (optional)
	serviceId: v.optional(v.id("services")),

	// Template type
	templateType: v.union(
		v.literal("certificate"), // Certificats (vie, nationalité, etc.)
		v.literal("attestation"), // Attestations
		v.literal("receipt"), // Reçus/Récépissés
		v.literal("letter"), // Lettres officielles
		v.literal("custom") // Personnalisé
	),

	// Template content - flexible to support both:
	// 1. Structured PDF templates: { header, body, footer }
	// 2. Tiptap editor JSON: { type: "doc", content: [...] }
	// Runtime validation is handled in mutation handlers.
	content: v.any(),

	// Available placeholders - auto-detected from request data
	placeholders: v.optional(
		v.array(
			v.object({
				key: v.string(), // e.g., "firstName", "dateOfBirth"
				label: localizedStringValidator,
				source: v.union(
					v.literal("user"), // From user profile
					v.literal("profile"), // From citizen profile data
					v.literal("request"), // From request data
					v.literal("formData"), // From dynamic form submission
					v.literal("org"), // From organization
					v.literal("system") // Generated (date, reference, etc.)
				),
				path: v.optional(v.string()), // JSONPath to value, e.g., "formData.identity.firstName"
			})
		)
	),

	// Ownership
	orgId: v.optional(v.id("orgs")), // null = global template
	createdBy: v.optional(v.id("users")),

	// Visibility
	isGlobal: v.boolean(), // Available to all orgs
	isActive: v.boolean(),

	// Paper settings
	paperSize: v.optional(v.union(v.literal("A4"), v.literal("LETTER"))),
	orientation: v.optional(v.union(v.literal("portrait"), v.literal("landscape"))),

	// Template editor extras
	contentHtml: v.optional(v.string()), // HTML preview of Tiptap content
	requireSignature: v.optional(v.boolean()), // Requires official signature
	autoPublishToCitizen: v.optional(v.boolean()), // Auto-publish generated doc to citizen

	// Cloning lineage
	clonedFromTemplateId: v.optional(v.id("documentTemplates")),
	clonedFromVersion: v.optional(v.number()),

	// Metadata
	version: v.optional(v.number()),
	updatedAt: v.optional(v.number()),
})
	.index("by_org", ["orgId", "isActive"])
	.index("by_category", ["category", "isActive"])
	.index("by_service", ["serviceId", "isActive"])
	.index("by_global", ["isGlobal", "isActive"])
	.index("by_type", ["templateType", "isActive"]);
