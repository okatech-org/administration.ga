import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { authMutation, authQuery } from "../lib/customFunctions";
import { requireBackOfficeAccess, isBackOfficeUser } from "../lib/auth";
import { error, ErrorCode } from "../lib/errors";
import {
  TicketStatus,
  TicketPriority,
} from "../lib/constants";
import {
  ticketCategoryValidator,
  ticketStatusValidator,
} from "../lib/validators";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";

// Helper function to generate ticket reference
function generateTicketReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().replace(/-/g, "").substring(0, 4).toUpperCase();
  return `TCK-${timestamp}-${random}`;
}

/**
 * CITIZEN FUNCTIONS
 */

export const create = authMutation({
  args: {
    subject: v.string(),
    description: v.string(),
    category: ticketCategoryValidator,
    attachments: v.optional(v.array(v.id("documents"))),
  },
  handler: async (ctx, args) => {
    const ticketId = await ctx.db.insert("tickets", {
      reference: generateTicketReference(),
      userId: ctx.user._id,
      subject: args.subject,
      description: args.description,
      category: args.category,
      status: TicketStatus.Open,
      priority: TicketPriority.Medium, // Default priority
      attachments: args.attachments,
      messages: [],
      updatedAt: Date.now(),
    });

    await logCortexAction(ctx, {
      action: "CREATE_TICKET",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "tickets",
      entiteId: ticketId,
      userId: ctx.user._id,
      apres: { subject: args.subject, category: args.category, status: TicketStatus.Open },
      signalType: SIGNAL_TYPES.TICKET_CREE,
    });

    return ticketId;
  },
});

export const listMine = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tickets")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const get = authQuery({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw error(ErrorCode.NOT_FOUND, "Ticket non trouvé");

    // Only the ticket owner OR a back-office user can view it
    const isOwner = ticket.userId === ctx.user._id;
    const isBackOffice = isBackOfficeUser(ctx.user);

    if (!isOwner && !isBackOffice) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Non autorisé à voir ce ticket");
    }

    return ticket;
  },
});

export const addMessage = authMutation({
  args: {
    ticketId: v.id("tickets"),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw error(ErrorCode.NOT_FOUND, "Ticket non trouvé");

    const isOwner = ticket.userId === ctx.user._id;
    const isBackOffice = isBackOfficeUser(ctx.user);

    if (!isOwner && !isBackOffice) {
      throw error(ErrorCode.INSUFFICIENT_PERMISSIONS, "Non autorisé à modifier ce ticket");
    }

    const newMessage = {
      id: crypto.randomUUID(),
      senderId: ctx.user._id,
      isStaff: !!isBackOffice && !isOwner,
      content: args.content,
      createdAt: Date.now(),
      attachments: args.attachments,
    };

    const messages = ticket.messages || [];
    messages.push(newMessage);

    // If an admin replies, status might stay open or change to WaitingForUser (not changing it automatically here to avoid overriding)
    // If a user replies, we change the status back to Open or InProgress if it was WaitingForUser
    let newStatus = ticket.status;
    if (isOwner && ticket.status === TicketStatus.WaitingForUser) {
      newStatus = TicketStatus.InProgress;
    }

    await ctx.db.patch(args.ticketId, {
      messages,
      status: newStatus,
      updatedAt: Date.now(),
    });

    await logCortexAction(ctx, {
      action: "REPLY_TICKET",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "tickets",
      entiteId: args.ticketId,
      userId: ctx.user._id,
      apres: { messageId: newMessage.id, isStaff: newMessage.isStaff, status: newStatus },
      signalType: SIGNAL_TYPES.TICKET_REPONDU,
    });

    return newMessage.id;
  },
});

/**
 * ADMIN FUNCTIONS
 */

export const listAll = authQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(ticketStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireBackOfficeAccess(ctx);

    if (args.status) {
      return await ctx.db
        .query("tickets")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    
    return await ctx.db.query("tickets").order("desc").paginate(args.paginationOpts);
  },
});

export const updateStatus = authMutation({
  args: {
    ticketId: v.id("tickets"),
    status: ticketStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireBackOfficeAccess(ctx);

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw error(ErrorCode.NOT_FOUND, "Ticket non trouvé");

    const patch: any = { status: args.status, updatedAt: Date.now() };

    if (args.status === TicketStatus.Resolved) {
      patch.resolvedAt = Date.now();
    } else if (args.status === TicketStatus.Closed) {
      patch.closedAt = Date.now();
    }

    await ctx.db.patch(args.ticketId, patch);

    await logCortexAction(ctx, {
      action: "CLOSE_TICKET",
      categorie: CATEGORIES_ACTION.METIER,
      entiteType: "tickets",
      entiteId: args.ticketId,
      userId: ctx.user._id,
      avant: { status: ticket.status },
      apres: { status: args.status },
      signalType: SIGNAL_TYPES.TICKET_FERME,
    });
  },
});

export const assignTicket = authMutation({
  args: {
    ticketId: v.id("tickets"),
    assignedTo: v.optional(v.id("users")), // Pass null/undefined to unassign
  },
  handler: async (ctx, args) => {
    await requireBackOfficeAccess(ctx);

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw error(ErrorCode.NOT_FOUND, "Ticket non trouvé");

    await ctx.db.patch(args.ticketId, {
      assignedTo: args.assignedTo,
      status: ticket.status === TicketStatus.Open ? TicketStatus.InProgress : ticket.status,
      updatedAt: Date.now(),
    });
  },
});
