import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Card Designs — Stores card templates designed in the desktop card designer.
 * Each design belongs to an organization and contains the full JSON of a CardTemplate
 * (elements, backgrounds, magnetic tracks, etc.) for printing consular cards.
 */

const cardElementValidator = v.object({
	id: v.string(),
	type: v.union(
		v.literal("text"),
		v.literal("image"),
		v.literal("qrCode"),
		v.literal("barcode"),
		v.literal("rectangle"),
		v.literal("circle"),
		v.literal("line"),
	),
	x: v.number(),
	y: v.number(),
	width: v.number(),
	height: v.number(),
	rotation: v.number(),
	isLocked: v.boolean(),
	isVisible: v.boolean(),
	zIndex: v.number(),
	// Text
	textContent: v.string(),
	fontName: v.string(),
	fontSize: v.number(),
	textColor: v.string(),
	textAlignment: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
	isBold: v.boolean(),
	isItalic: v.boolean(),
	// Dynamic field
	isDynamicField: v.boolean(),
	fieldKey: v.string(),
	// Image
	imageData: v.union(v.string(), v.null()),
	// Shape
	fillColor: v.string(),
	strokeColor: v.string(),
	strokeWidth: v.number(),
	cornerRadius: v.number(),
	// QR / Barcode
	codeContent: v.string(),
});

export const cardDesignsTable = defineTable({
	// Basic info
	name: v.string(),
	description: v.optional(v.string()),
	entityId: v.optional(v.string()), // Print entity (e.g., "carte-consulaire")

	// Template data — full card template content
	backgroundColor: v.string(),
	frontBackgroundImage: v.union(v.string(), v.null()),
	backBackgroundImage: v.union(v.string(), v.null()),
	backgroundOpacity: v.number(),
	frontElements: v.array(cardElementValidator),
	backElements: v.array(cardElementValidator),
	printDuplex: v.boolean(),
	magneticTracks: v.array(v.string()), // 3 tracks

	// Ownership
	orgId: v.id("orgs"),
	createdBy: v.id("users"),

	// Status
	isActive: v.boolean(),
	version: v.number(),
	updatedAt: v.number(),
})
	.index("by_org", ["orgId", "isActive"])
	.index("by_creator", ["createdBy", "isActive"]);
