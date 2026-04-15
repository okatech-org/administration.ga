import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Table callNotes — notes agent post-appel attachées à un meeting.
 *
 * Plan Intelligence iAsted × Sprint 6 — Phase ζ (post-call intelligence).
 *
 * Une note par (meeting, agent). L'agent peut l'éditer après l'appel pour
 * documenter la conversation. Future évolution : génération draft via Gemini
 * en mode "summary only" (non inclus dans ce schema — pure UI/stockage ici).
 */
export const callNotesTable = defineTable({
	meetingId: v.id("meetings"),
	orgId: v.id("orgs"),
	agentUserId: v.id("users"),
	content: v.string(),
	// Optionnel : éléments structurés (action items, sentiment, etc.)
	actionItems: v.optional(v.array(v.string())),
	sentiment: v.optional(
		v.union(
			v.literal("satisfied"),
			v.literal("neutral"),
			v.literal("frustrated"),
			v.literal("angry"),
		),
	),
	// Flag "auto-draft" : note initiale générée automatiquement (vs éditée par l'agent).
	isAutoDraft: v.optional(v.boolean()),
	updatedAt: v.number(),
})
	.index("by_meeting", ["meetingId"])
	.index("by_agent", ["agentUserId"])
	.index("by_org_updated", ["orgId", "updatedAt"]);
