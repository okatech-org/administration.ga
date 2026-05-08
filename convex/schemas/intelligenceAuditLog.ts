import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Audit log dédié au module Renseignement souverain.
 *
 * Pourquoi une table séparée de `auditLog` global ?
 *   - **Cloisonnement** : aucune query hors-périmètre ne lit cette table.
 *     Même un super-admin doit passer par les fonctions du module.
 *   - **Rétention longue** : les logs renseignement ne sont jamais purgés
 *     par les jobs de nettoyage standard (audit RGPD vs audit souverain).
 *   - **Indexes spécifiques** : par cas d'investigation, par cible, par
 *     classification — pour les revues de conformité internes.
 *
 * Toute query / mutation du module appelle `logIntelAccess(...)` AVANT
 * de retourner. Les lectures sensibles (ex: searchProfiles, getMapData)
 * sont également tracées.
 */
export const intelligenceAuditLogTable = defineTable({
	orgId: v.id("orgs"), // L'organisme intelligence_agency concerné

	// Action effectuée — verbe du module (pas la table SQL).
	action: v.string(), // ex: "profiles.search", "notes.create", "case.open"

	// Acteur
	actorId: v.id("users"),
	actorMembershipId: v.optional(v.id("memberships")),

	// Cible(s) — entités impactées par l'action
	targetType: v.optional(
		v.union(
			v.literal("profile"),
			v.literal("child_profile"),
			v.literal("diplomatic_target"),
			v.literal("agent"),
			v.literal("case"),
			v.literal("note"),
			v.literal("watchlist"),
			v.literal("link"),
			v.literal("alert"),
			v.literal("alertRule"),
			v.literal("query"), // recherches sans cible précise
		),
	),
	targetId: v.optional(v.string()),

	// Pour les actions liées à un dossier d'investigation. Stocké comme
	// string plutôt que v.id pour découpler la table Cases (peut être
	// indisponible avant l'activation de Phase 1.1).
	caseId: v.optional(v.string()),

	// Classification de l'opération (héritée de la note/dossier le cas échéant)
	classification: v.optional(
		v.union(
			v.literal("internal"),
			v.literal("restricted"),
			v.literal("secret"),
			v.literal("top_secret"),
		),
	),

	// Métadonnées libres (filtres de recherche, args query, etc.)
	metadata: v.optional(v.any()),

	// Résultat — pour différencier consultations réussies / refusées
	outcome: v.union(
		v.literal("success"),
		v.literal("denied"),
		v.literal("error"),
	),
	errorMessage: v.optional(v.string()),

	timestamp: v.number(),
})
	.index("by_org_timestamp", ["orgId", "timestamp"])
	.index("by_actor", ["actorId"])
	.index("by_target", ["targetType", "targetId"])
	.index("by_case", ["caseId"])
	.index("by_action", ["action"]);
