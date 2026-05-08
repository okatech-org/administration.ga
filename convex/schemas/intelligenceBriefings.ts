import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Briefings IA générés pour le module Renseignement souverain.
 *
 * Un briefing est une synthèse markdown produite par Gemini à partir
 * d'une cible (profil, dossier d'investigation, agent) et de son contexte
 * (notes, liens, watchlists). Stocké tel quel pour traçabilité — ne pas
 * regénérer à chaque consultation.
 *
 * Cloisonné — accessible uniquement via les fonctions du module.
 */
export const intelligenceBriefingsTable = defineTable({
	orgId: v.id("orgs"),
	generatedBy: v.id("users"),

	// Cible du briefing
	targetType: v.union(
		v.literal("profile"),
		v.literal("child_profile"),
		v.literal("diplomatic_target"),
		v.literal("agent"),
		v.literal("case"),
	),
	targetId: v.string(),

	title: v.string(),
	// Contenu markdown — watermark "RESTREINT" injecté dans l'entête.
	content: v.string(),

	// Méta IA
	model: v.string(), // ex: "gemini-2.5-flash"
	promptVersion: v.string(), // ex: "profile-v1"
	tokensIn: v.optional(v.number()),
	tokensOut: v.optional(v.number()),
	costMicroCents: v.optional(v.number()),
	latencyMs: v.optional(v.number()),

	// Classification héritée de la cible la plus restrictive
	classification: v.union(
		v.literal("internal"),
		v.literal("restricted"),
		v.literal("secret"),
		v.literal("top_secret"),
	),

	generatedAt: v.number(),
	deletedAt: v.optional(v.number()),
})
	.index("by_org_target", ["orgId", "targetType", "targetId"])
	.index("by_org_generated", ["orgId", "generatedAt"]);
