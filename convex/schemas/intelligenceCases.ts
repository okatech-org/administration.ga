import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Dossiers d'investigation du module Renseignement souverain.
 *
 * Un dossier regroupe plusieurs entités (profils, contacts, agents) sous
 * un même fil rouge — typiquement une enquête, une cellule à surveiller,
 * un événement à suivre. Notes et liens existants peuvent être rattachés
 * via le pivot `intelligenceCaseEntities`.
 *
 * Cloisonné — accessible uniquement via les fonctions du module.
 */
export const intelligenceCasesTable = defineTable({
	orgId: v.id("orgs"),
	leadAgentId: v.id("users"),
	createdBy: v.id("users"),

	title: v.string(),
	summary: v.optional(v.string()),

	status: v.union(
		v.literal("open"),
		v.literal("monitoring"),
		v.literal("closed"),
		v.literal("archived"),
	),
	priority: v.union(
		v.literal("low"),
		v.literal("medium"),
		v.literal("high"),
		v.literal("critical"),
	),
	classification: v.union(
		v.literal("internal"),
		v.literal("restricted"),
		v.literal("secret"),
		v.literal("top_secret"),
	),

	// Tags libres pour catégoriser (ex: "défense", "technologie", "sécurité")
	tags: v.optional(v.array(v.string())),

	openedAt: v.number(),
	closedAt: v.optional(v.number()),
	updatedAt: v.number(),
	deletedAt: v.optional(v.number()),
})
	.index("by_org_status", ["orgId", "status"])
	.index("by_org_priority", ["orgId", "priority"])
	.index("by_lead", ["leadAgentId"]);

/**
 * Pivot dossier ↔ entité (profil, contact, agent, cible diplomatique).
 * Permet de rattacher plusieurs entités à un dossier sans dénormaliser.
 */
export const intelligenceCaseEntitiesTable = defineTable({
	caseId: v.id("intelligenceCases"),
	orgId: v.id("orgs"),

	targetType: v.union(
		v.literal("profile"),
		v.literal("child_profile"),
		v.literal("diplomatic_target"),
		v.literal("agent"),
	),
	targetId: v.string(),

	// Rôle dans le dossier (ex: cible principale, contact, témoin, suspect)
	role: v.optional(v.string()),
	notes: v.optional(v.string()),

	addedBy: v.id("users"),
	addedAt: v.number(),
	removedAt: v.optional(v.number()),
})
	.index("by_case", ["caseId"])
	.index("by_target", ["targetType", "targetId"])
	.index("by_org", ["orgId"]);

/**
 * Timeline d'événements d'un dossier — historique structuré des actions
 * (ouverture, ajout d'entité, note posée, transition de statut, etc.).
 *
 * Doublon délibéré avec `intelligenceAuditLog` : ce dernier trace tous
 * les accès (granularité fine, classification souveraine), tandis que
 * la timeline du dossier ne contient que les événements pertinents au
 * récit de l'enquête (lecture rapide).
 */
export const intelligenceCaseEventsTable = defineTable({
	caseId: v.id("intelligenceCases"),
	orgId: v.id("orgs"),
	actorId: v.id("users"),

	eventType: v.union(
		v.literal("opened"),
		v.literal("status_changed"),
		v.literal("priority_changed"),
		v.literal("entity_added"),
		v.literal("entity_removed"),
		v.literal("note_attached"),
		v.literal("link_attached"),
		v.literal("watchlist_attached"),
		v.literal("comment"),
		v.literal("closed"),
		v.literal("archived"),
	),
	payload: v.optional(v.any()),

	timestamp: v.number(),
})
	.index("by_case_timestamp", ["caseId", "timestamp"]);
