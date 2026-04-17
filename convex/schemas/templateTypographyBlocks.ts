import { defineTable } from "convex/server";
import { v } from "convex/values";
import { localizedStringValidator } from "../lib/validators";

/**
 * Brique 2 — Typographie / Structure des textes.
 *
 * Définit la mise en forme typographique appliquée au contenu Tiptap :
 * police, tailles, interlignage, alignement, règles de saut de page,
 * styles de titres. Traduit en CSS à l'injection dans le rendu HTML/PDF.
 *
 * Partageable entre N templates → changer la police d'une charte graphique
 * se fait en 1 édition propagée à tous les templates qui réfèrent ce bloc.
 */
export const templateTypographyBlocksTable = defineTable({
	// Identité
	name: localizedStringValidator,
	description: v.optional(localizedStringValidator),

	// ─── Corps de texte ──────────────────────────────────────────────────
	// Police. CSS font-family (avec fallbacks). Le rendu PDF mappe sur les
	// polices embarquées ou fallback Noto Serif.
	fontFamily: v.string(),
	fontSizeBase: v.number(), // points (pt)
	lineHeight: v.number(), // multiplicateur (1.15, 1.5, 2)
	defaultAlignment: v.union(
		v.literal("left"),
		v.literal("center"),
		v.literal("right"),
		v.literal("justify"),
	),

	// ─── Styles de titres (h1, h2, h3) ───────────────────────────────────
	headingStyles: v.object({
		h1: v.object({
			fontSize: v.number(), // pt
			bold: v.boolean(),
			uppercase: v.boolean(),
			spacingBefore: v.optional(v.number()), // mm
			spacingAfter: v.optional(v.number()),
			alignment: v.optional(
				v.union(
					v.literal("left"),
					v.literal("center"),
					v.literal("right"),
					v.literal("justify"),
				),
			),
		}),
		h2: v.object({
			fontSize: v.number(),
			bold: v.boolean(),
			uppercase: v.boolean(),
			spacingBefore: v.optional(v.number()),
			spacingAfter: v.optional(v.number()),
			alignment: v.optional(
				v.union(
					v.literal("left"),
					v.literal("center"),
					v.literal("right"),
					v.literal("justify"),
				),
			),
		}),
		h3: v.object({
			fontSize: v.number(),
			bold: v.boolean(),
			uppercase: v.boolean(),
			spacingBefore: v.optional(v.number()),
			spacingAfter: v.optional(v.number()),
			alignment: v.optional(
				v.union(
					v.literal("left"),
					v.literal("center"),
					v.literal("right"),
					v.literal("justify"),
				),
			),
		}),
	}),

	// ─── Paragraphes ─────────────────────────────────────────────────────
	paragraphSpacingBefore: v.optional(v.number()), // mm
	paragraphSpacingAfter: v.optional(v.number()),
	paragraphFirstLineIndent: v.optional(v.number()), // mm

	// ─── Règles de saut de page & flow ───────────────────────────────────
	// Types de bloc qui forcent un saut de page avant leur rendu.
	pageBreakBefore: v.optional(
		v.array(v.union(v.literal("h1"), v.literal("h2"), v.literal("h3"))),
	),
	widowOrphanControl: v.optional(v.boolean()),
	keepHeadingsWithNext: v.optional(v.boolean()),

	// ─── Ownership / scope ───────────────────────────────────────────────
	orgId: v.optional(v.id("orgs")),
	createdBy: v.optional(v.id("users")),
	isGlobal: v.boolean(),
	isActive: v.boolean(),
	isDefault: v.optional(v.boolean()),

	version: v.optional(v.number()),
	updatedAt: v.optional(v.number()),
})
	.index("by_org", ["orgId", "isActive"])
	.index("by_global", ["isGlobal", "isActive"])
	.index("by_default", ["isDefault", "isActive"]);
