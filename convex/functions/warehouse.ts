import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { rateLimiter } from "../ai/rateLimiter";

/**
 * Tables exposed to PostHog Data Warehouse.
 * Only tables in this list can be queried via /warehouse/v1/{tableName}.
 */
export const WAREHOUSE_TABLES = [
  "users",
  "requests",
  "documents",
  "appointments",
  "auditLog",
  "orgs",
  "profiles",
  "consularRegistrations",
] as const;

export type WarehouseTableName = (typeof WAREHOUSE_TABLES)[number];

/**
 * Fields to strip from each table before sending to the warehouse.
 * These are sensitive or internal fields that should not leave the system.
 */
const SENSITIVE_FIELDS: Partial<Record<WarehouseTableName, string[]>> = {
  users: ["authId", "preferences", "pinHash", "pinLockedUntil", "pinFailedAttempts", "lastOtpVerifiedAt"],
  profiles: ["passportNumber", "nationalId", "phoneNumber", "addressLine1", "addressLine2"],
  auditLog: ["actorTokenIdentifier", "changes"],
};

/**
 * Paginated export of a single table for PostHog Data Warehouse sync.
 * Uses _creationTime as cursor for incremental sync.
 */
export const paginatedTableExport = internalQuery({
  args: {
    tableName: v.string(),
    cursor: v.union(v.number(), v.null()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const tableName = args.tableName as WarehouseTableName;
    const limit = Math.min(Math.max(args.limit, 1), 5000);

    let query = ctx.db.query(tableName as any).order("asc");

    if (args.cursor !== null) {
      query = ctx.db
        .query(tableName as any)
        .order("asc")
        .filter((q: any) => q.gt(q.field("_creationTime"), args.cursor));
    }

    const rows = await query.take(limit + 1);
    const hasMore = rows.length > limit;
    const results = hasMore ? rows.slice(0, limit) : rows;

    // Strip sensitive fields
    const fieldsToStrip = SENSITIVE_FIELDS[tableName] ?? [];
    const sanitized = results.map((row: any) => {
      const clean = { ...row };
      for (const field of fieldsToStrip) {
        delete clean[field];
      }
      return clean;
    });

    const nextCursor =
      sanitized.length > 0
        ? sanitized[sanitized.length - 1]._creationTime
        : null;

    return {
      results: sanitized,
      next: hasMore ? nextCursor : null,
    };
  },
});

/**
 * Log warehouse data access to the audit log.
 */
export const logAccess = internalMutation({
  args: {
    tableName: v.string(),
    rowCount: v.number(),
    cursor: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLog", {
      table: "warehouse_access",
      docId: args.tableName,
      operation: "read",
      actorTokenIdentifier: "posthog-warehouse",
      changes: { rowsReturned: args.rowCount, cursor: args.cursor },
      timestamp: Date.now(),
    });
  },
});

/**
 * Rate limit check wrapper for use from httpAction via ctx.runMutation.
 */
export const checkWarehouseRateLimit = internalMutation({
  args: {},
  handler: async (ctx) => {
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "warehouseSync", {
      key: "warehouse",
    });
    return { ok, retryAfter: retryAfter ?? 0 };
  },
});
