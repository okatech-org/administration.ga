import { v } from "convex/values";
import { authQuery } from "../lib/customFunctions";
import { eventTargetTypeValidator } from "../lib/validators";

/**
 * Get event history for a target
 */
export const getHistory = authQuery({
  args: {
    targetType: eventTargetTypeValidator,
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_target", (q) =>
        q.eq("targetType", args.targetType).eq("targetId", args.targetId)
      )
      .order("desc")
      .collect();

    // Batch fetch actors
    const actorIds = [
      ...new Set(events.filter((e) => e.actorId).map((e) => e.actorId!)),
    ];
    const actors = await Promise.all(actorIds.map((id) => ctx.db.get(id)));
    const actorMap = new Map(
      actors.filter(Boolean).map((a) => [a!._id, a!])
    );

    return events.map((event) => ({
      ...event,
      actor: event.actorId ? actorMap.get(event.actorId) : null,
    }));
  },
});

/**
 * Get recent activity for current user
 */
export const getMyActivity = authQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_actor", (q) => q.eq("actorId", ctx.user._id))
      .order("desc")
      .take(args.limit ?? 20);

    return events;
  },
});

/**
 * Get notes for a request (filtered from events)
 */
export const getNotesForRequest = authQuery({
  args: {
    requestId: v.string(),
    includeInternal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_target", (q) =>
        q.eq("targetType", "request").eq("targetId", args.requestId)
      )
      .filter((q) => q.eq(q.field("type"), "note_added"))
      .order("desc")
      .collect();

    // Filter internal notes if not requested
    const filtered = args.includeInternal
      ? events
      : events.filter((e) => !e.data?.isInternal);

    // Batch fetch actors
    const actorIds = [
      ...new Set(filtered.filter((e) => e.actorId).map((e) => e.actorId!)),
    ];
    const actors = await Promise.all(actorIds.map((id) => ctx.db.get(id)));
    const actorMap = new Map(
      actors.filter(Boolean).map((a) => [a!._id, a!])
    );

    return filtered.map((event) => ({
      _id: event._id,
      _creationTime: event._creationTime,
      content: event.data?.content,
      isInternal: event.data?.isInternal ?? false,
      author: event.actorId ? actorMap.get(event.actorId) : null,
    }));
  },
});
