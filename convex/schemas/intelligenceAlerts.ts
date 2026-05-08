import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Règles d'alerte du module Renseignement souverain.
 *
 * Une règle décrit une condition que le système évalue périodiquement
 * (cron) ou en réaction à un événement (mutation). Quand la condition
 * est satisfaite, une `intelligenceAlerts` est générée et notifiée aux
 * agents listés dans `notifyMembershipIds`.
 *
 * Exemples :
 *   - "Nouvelle inscription consulaire dans la watchlist X"
 *   - "Note critique créée sur une cible suivie"
 *   - "Profil avec métier dans secteur stratégique défense ajouté"
 */
export const intelligenceAlertRulesTable = defineTable({
	orgId: v.id("orgs"),
	createdBy: v.id("users"),

	name: v.string(),
	description: v.optional(v.string()),

	// Type de règle — détermine quel évaluateur s'applique
	ruleType: v.union(
		v.literal("watchlist_match"), // nouvelle entrée matchant une watchlist
		v.literal("note_severity"), // note de sévérité >= seuil
		v.literal("profile_sector"), // profil dans secteur stratégique
		v.literal("link_added"), // lien ajouté sur une cible suivie
		v.literal("custom"), // règle ad-hoc (metadata libre)
	),

	// Paramètres de la règle (forme dépend de ruleType)
	params: v.any(),

	// Cibles de notification (memberships dans la même intelligence_agency)
	notifyMembershipIds: v.array(v.id("memberships")),

	// Sévérité de l'alerte produite (héritée par défaut)
	severity: v.union(
		v.literal("low"),
		v.literal("medium"),
		v.literal("high"),
		v.literal("critical"),
	),

	isActive: v.boolean(),
	lastEvaluatedAt: v.optional(v.number()),
	lastTriggeredAt: v.optional(v.number()),

	updatedAt: v.number(),
	deletedAt: v.optional(v.number()),
})
	.index("by_org_active", ["orgId", "isActive"])
	.index("by_type", ["ruleType"]);

/**
 * Alertes générées par les règles ci-dessus.
 *
 * Chaque alerte pointe vers une cible précise (profile, case, note, etc.)
 * et porte un statut de traitement (new, acknowledged, dismissed).
 */
export const intelligenceAlertsTable = defineTable({
	orgId: v.id("orgs"),
	ruleId: v.id("intelligenceAlertRules"),

	// Cible de l'alerte
	targetType: v.union(
		v.literal("profile"),
		v.literal("child_profile"),
		v.literal("diplomatic_target"),
		v.literal("agent"),
		v.literal("case"),
		v.literal("note"),
		v.literal("watchlist_item"),
	),
	targetId: v.string(),

	title: v.string(),
	summary: v.optional(v.string()),

	severity: v.union(
		v.literal("low"),
		v.literal("medium"),
		v.literal("high"),
		v.literal("critical"),
	),

	status: v.union(
		v.literal("new"),
		v.literal("acknowledged"),
		v.literal("dismissed"),
	),

	// Memberships notifiés à la création (snapshot — la règle peut changer)
	notifyMembershipIds: v.array(v.id("memberships")),

	acknowledgedBy: v.optional(v.id("users")),
	acknowledgedAt: v.optional(v.number()),
	dismissedBy: v.optional(v.id("users")),
	dismissedAt: v.optional(v.number()),
	dismissReason: v.optional(v.string()),

	// Métadonnées (snapshot des conditions au moment du déclenchement)
	metadata: v.optional(v.any()),

	createdAt: v.number(),
})
	.index("by_org_status", ["orgId", "status"])
	.index("by_org_created", ["orgId", "createdAt"])
	.index("by_rule", ["ruleId"])
	.index("by_target", ["targetType", "targetId"]);
