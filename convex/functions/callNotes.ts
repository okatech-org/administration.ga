import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";

/**
 * Notes post-appel attachées à un meeting (Plan Phase ζ).
 *
 * Une note par (meeting, agent). Upsert via index composite implicite
 * (vérification manuelle by_meeting + filter agentUserId).
 */

export const upsertCallNote = authMutation({
	args: {
		meetingId: v.id("meetings"),
		orgId: v.id("orgs"),
		content: v.string(),
		actionItems: v.optional(v.array(v.string())),
		sentiment: v.optional(
			v.union(
				v.literal("satisfied"),
				v.literal("neutral"),
				v.literal("frustrated"),
				v.literal("angry"),
			),
		),
		isAutoDraft: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const existing = await ctx.db
			.query("callNotes")
			.withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
			.filter((q) => q.eq(q.field("agentUserId"), ctx.user._id))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				content: args.content,
				actionItems: args.actionItems,
				sentiment: args.sentiment,
				isAutoDraft: args.isAutoDraft ?? false,
				updatedAt: now,
			});
			return existing._id;
		}
		return await ctx.db.insert("callNotes", {
			meetingId: args.meetingId,
			orgId: args.orgId,
			agentUserId: ctx.user._id,
			content: args.content,
			actionItems: args.actionItems,
			sentiment: args.sentiment,
			isAutoDraft: args.isAutoDraft ?? false,
			updatedAt: now,
		});
	},
});

export const getMyNoteForMeeting = authQuery({
	args: {
		meetingId: v.id("meetings"),
	},
	handler: async (ctx, args) => {
		const note = await ctx.db
			.query("callNotes")
			.withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
			.filter((q) => q.eq(q.field("agentUserId"), ctx.user._id))
			.first();
		return note ?? null;
	},
});

/**
 * Liste les notes d'une org (récemment mises à jour en premier) — utile pour
 * dashboard supervision / audit.
 */
export const listForOrg = authQuery({
	args: {
		orgId: v.id("orgs"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const rows = await ctx.db
			.query("callNotes")
			.withIndex("by_org_updated", (q) => q.eq("orgId", args.orgId))
			.order("desc")
			.take(args.limit ?? 50);
		return rows;
	},
});
