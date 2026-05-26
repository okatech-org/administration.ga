/**
 * Delivery Packages Functions
 *
 * CRUD functions for tracking packages (colis) in iBoîte.
 */

import { v } from "convex/values";
import { authQuery } from "../lib/customFunctions";
import { internalMutation } from "../_generated/server";
import {
  packageStatusValidator,
  packageEventTypeValidator,
} from "../lib/validators";
import { PackageEventType, PackageStatus } from "../lib/constants";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List packages for the current user.
 */
export const listByUser = authQuery({
  args: {
    status: v.optional(packageStatusValidator),
  },
  handler: async (ctx, args) => {
    let results;

    if (args.status) {
      results = await ctx.db
        .query("deliveryPackages")
        .withIndex("by_status", (q) =>
          q.eq("userId", ctx.user._id).eq("status", args.status!),
        )
        .order("desc")
        .collect();
    } else {
      results = await ctx.db
        .query("deliveryPackages")
        .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
        .order("desc")
        .collect();
    }

    return results;
  },
});

/**
 * Get a single package by ID.
 */
export const getById = authQuery({
  args: { id: v.id("deliveryPackages") },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.id);
    if (!pkg || pkg.userId !== ctx.user._id) {
      return null;
    }
    return pkg;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new package (admin/system use).
 */
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.optional(v.id("orgs")),
    trackingNumber: v.string(),
    sender: v.string(),
    description: v.string(),
    status: packageStatusValidator,
    estimatedDelivery: v.optional(v.number()),
    weight: v.optional(v.number()),
    dimensions: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("deliveryPackages", {
      ...args,
      events: [
        {
          type: PackageEventType.Created,
          description: "Colis enregistré dans le système",
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update the status of a package and add an event log entry.
 */
export const updateStatus = internalMutation({
  args: {
    id: v.id("deliveryPackages"),
    status: packageStatusValidator,
    eventType: packageEventTypeValidator,
    eventDescription: v.string(),
    eventLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.id);
    if (!pkg) throw new Error("Package not found");

    const now = Date.now();
    const existingEvents = pkg.events || [];

    const updates: Record<string, unknown> = {
      status: args.status,
      events: [
        ...existingEvents,
        {
          type: args.eventType,
          description: args.eventDescription,
          location: args.eventLocation,
          timestamp: now,
        },
      ],
      updatedAt: now,
    };

    // Set deliveredAt if status is delivered or available
    if (
      (args.status === PackageStatus.Delivered ||
        args.status === PackageStatus.Available) &&
      !pkg.deliveredAt
    ) {
      updates.deliveredAt = now;
    }

    await ctx.db.patch(args.id, updates);
    return true;
  },
});

/**
 * Delete a package permanently.
 */
export const remove = internalMutation({
  args: { id: v.id("deliveryPackages") },
  handler: async (ctx, args) => {
    const pkg = await ctx.db.get(args.id);
    if (!pkg) throw new Error("Package not found");
    await ctx.db.delete(args.id);
    return true;
  },
});
