import { defineTable } from "convex/server";
import { v } from "convex/values";
import { localizedStringValidator } from "../lib/validators";

/**
 * Brique 1 — Entête / Pied de page réutilisable.
 *
 * Contient le logo, l'en-tête institutionnel et le pied de page. Une même
 * brique peut être partagée entre N `documentTemplates`. Un bloc peut être
 * restreint à certains `templateType` (ex. entête « Attestation » vs.
 * « Récépissé ») ou rester générique (applicable à tous).
 *
 * `content` (entête + pied) est du Tiptap JSON — permet images, placeholders
 * et mise en forme riche. Les champs `height` cadrent la zone réservée sur
 * la page au rendu PDF/HTML.
 */
export const templateHeaderFooterBlocksTable = defineTable({
	// Identité
	name: localizedStringValidator,
	description: v.optional(localizedStringValidator),

	// Binding au type de document. Vide / undefined ⇒ applicable à tous.
	applicableTemplateTypes: v.optional(
		v.array(
			v.union(
				v.literal("certificate"),
				v.literal("attestation"),
				v.literal("receipt"),
				v.literal("letter"),
				v.literal("custom"),
			),
		),
	),

	// ─── Entête ──────────────────────────────────────────────────────────
	header: v.object({
		// Logo stocké dans `_storage`. Rendu à l'alignement demandé.
		logoStorageId: v.optional(v.id("_storage")),
		logoAlignment: v.union(
			v.literal("left"),
			v.literal("center"),
			v.literal("right"),
		),
		// Hauteur réservée à la bande d'en-tête (mm). Fallback : 30 mm.
		height: v.optional(v.number()),
		// Contenu riche (Tiptap JSON) : titre, adresse, devise, etc.
		content: v.any(),
	}),

	// ─── Pied de page ────────────────────────────────────────────────────
	footer: v.object({
		height: v.optional(v.number()),
		content: v.any(),
		showPageNumbers: v.optional(v.boolean()),
	}),

	// ─── Ownership / scope ───────────────────────────────────────────────
	orgId: v.optional(v.id("orgs")), // null ⇒ global
	createdBy: v.optional(v.id("users")),
	isGlobal: v.boolean(),
	isActive: v.boolean(),

	// Bloc par défaut — sélectionné automatiquement dans le wizard si aucun
	// bloc n'est choisi explicitement. Un seul par scope (global ou par org).
	isDefault: v.optional(v.boolean()),

	// Versioning minimal (pas d'historique complet — les briques sont
	// référencées par id, pas copiées comme un document).
	version: v.optional(v.number()),
	updatedAt: v.optional(v.number()),
})
	.index("by_org", ["orgId", "isActive"])
	.index("by_global", ["isGlobal", "isActive"])
	.index("by_default", ["isDefault", "isActive"]);
