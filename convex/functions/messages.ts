import { v } from "convex/values";
import { authQuery, authMutation } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { error, ErrorCode } from "../lib/errors";

/**
 * ============================================================================
 * MESSAGES API - In-Request Messaging
 * ============================================================================
 */

/**
 * List messages for a request
 * Accessible by request owner (citizen) or org agent
 */
export const listByRequest = authQuery({
  args: {
    requestId: v.id("requests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.NOT_FOUND);
    }

    // Check access: owner or org member
    const isOwner = request.userId === ctx.user._id;
    if (!isOwner) {
      const membership = await getMembership(ctx, ctx.user._id, request.orgId);
      await assertCanDoTask(ctx, ctx.user, membership, "requests.view");
    }

    // Get messages sorted by creation time
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_request_created", (q) => q.eq("requestId", args.requestId))
      .take(500);

    // Enrich with sender info
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const senders = await Promise.all(senderIds.map((id) => ctx.db.get(id)));
    const senderMap = new Map(
      senders.filter(Boolean).map((s) => [s!._id, s!])
    );

    return messages.map((msg) => {
      const sender = senderMap.get(msg.senderId);
      return {
        ...msg,
        sender: sender
          ? {
              _id: sender._id,
              firstName: sender.firstName,
              lastName: sender.lastName,
              avatarUrl: sender.avatarUrl,
            }
          : null,
      };
    });
  },
});

/**
 * Send a message
 */
export const send = authMutation({
  args: {
    requestId: v.id("requests"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.NOT_FOUND);
    }

    // Determine sender role
    const isOwner = request.userId === ctx.user._id;
    let senderRole: "citizen" | "agent" = "citizen";

    if (!isOwner) {
      // Must be an org member to send as agent
      const membership = await getMembership(ctx, ctx.user._id, request.orgId);
      await assertCanDoTask(ctx, ctx.user, membership, "requests.process");
      senderRole = "agent";
    }

    // Validate content
    if (!args.content.trim()) {
      throw error(ErrorCode.VALIDATION_ERROR, "Message content cannot be empty");
    }

    // Create message
    const messageId = await ctx.db.insert("messages", {
      requestId: args.requestId,
      senderId: ctx.user._id,
      senderRole,
      content: args.content.trim(),
      attachments: args.attachments,
      createdAt: Date.now(),
    });

    // Create event in request timeline
    await ctx.db.insert("events", {
      targetType: "request",
      targetId: args.requestId,
      actorId: ctx.user._id,
      type: "message",
      data: {
        messageId,
        senderRole,
        preview: args.content.substring(0, 100),
      },
    });

    // Note: Email notification is now handled automatically by the messages trigger
    // See convex/triggers/index.ts

    return messageId;
  },
});

/**
 * Mark message(s) as read
 */
export const markAsRead = authMutation({
  args: {
    requestId: v.id("requests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw error(ErrorCode.NOT_FOUND);
    }

    // Determine which messages to mark as read
    const isOwner = request.userId === ctx.user._id;
    const roleToMark = isOwner ? "agent" : "citizen";

    if (!isOwner) {
      const membership = await getMembership(ctx, ctx.user._id, request.orgId);
      await assertCanDoTask(ctx, ctx.user, membership, "requests.view");
    }

    // Get unread messages from the other party
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .filter((q) =>
        q.and(
          q.eq(q.field("senderRole"), roleToMark),
          q.eq(q.field("readAt"), undefined)
        )
      )
      .take(100);

    const now = Date.now();
    for (const msg of messages) {
      await ctx.db.patch(msg._id, { readAt: now });
    }

    return { markedCount: messages.length };
  },
});

/**
 * Get unread message count for a request
 */
export const getUnreadCount = authQuery({
  args: {
    requestId: v.id("requests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return 0;
    }

    // Determine which messages are "unread" for this user
    const isOwner = request.userId === ctx.user._id;
    const roleToCount = isOwner ? "agent" : "citizen";

    if (!isOwner) {
      try {
        const membership = await getMembership(ctx, ctx.user._id, request.orgId);
        await assertCanDoTask(ctx, ctx.user, membership, "requests.view");
      } catch {
        return 0;
      }
    }

    // Count unread messages from the other party
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .filter((q) =>
        q.and(
          q.eq(q.field("senderRole"), roleToCount),
          q.eq(q.field("readAt"), undefined)
        )
      )
      .take(100);

    return unreadMessages.length;
  },
});

/**
 * Get total unread count across all requests for current user
 * Used for notification badge
 */
export const getTotalUnreadCount = authQuery({
  args: {},
  handler: async (ctx) => {
    // Get user's own requests (using by_user_status index, filter all statuses).
    // Cap raisonné : un citoyen lambda n'a pas >200 dossiers actifs en parallèle.
    const myRequests = await ctx.db
      .query("requests")
      .withIndex("by_user_status", (q) => q.eq("userId", ctx.user._id))
      .take(200);

    if (myRequests.length === 0) return 0;

    // Batch N+1 → on paralellise les N queries (même coût réseau mais 1 round-trip).
    // Idéal : un index `by_recipient_unread` dédié, mais hors-scope pour ce sprint.
    const unreadPerRequest = await Promise.all(
      myRequests.map((request) =>
        ctx.db
          .query("messages")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("senderRole"), "agent"),
              q.eq(q.field("readAt"), undefined),
            ),
          )
          .take(50),
      ),
    );

    return unreadPerRequest.reduce((acc, msgs) => acc + msgs.length, 0);
  },
});
