/**
 * Backfill migration for Aggregate component.
 *
 * Uses a CHAINED PAGINATION pattern: each mutation processes a small batch
 * of rows, then schedules itself to continue from the last processed ID.
 * This avoids Convex's 16MB read limit for large tables.
 *
 * Usage:
 *   npx convex run migrations/backfillAggregates:backfillAll
 *
 * Or individually:
 *   npx convex run migrations/backfillAggregates:backfillRegistrations
 *   npx convex run migrations/backfillAggregates:backfillRequests
 *   etc.
 */
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  requestsByOrg,
  membershipsByOrg,
  orgServicesByOrg,
  globalCounts,
  registrationsByOrg,
  requestsGlobal,
  associationsGlobal,
  companiesGlobal,
  orgsGlobal,
  servicesGlobal,
  appointmentsByOrg,
  childProfilesGlobal,
} from "../lib/aggregates";

// Small batch size to stay well under 16MB read limit
const BATCH_SIZE = 50;

/**
 * Generic chained backfill: processes BATCH_SIZE rows starting after `cursor`,
 * then schedules itself to continue if there are more rows.
 */
async function chainedBackfill(
  ctx: any,
  tableName: string,
  aggregate: { insertIfDoesNotExist: (ctx: any, doc: any) => Promise<void> },
  continuationFn: any,
  cursor?: string,
) {
  const page = await ctx.db.query(tableName).paginate({
    cursor: cursor ?? null,
    numItems: BATCH_SIZE,
  });

  for (const doc of page.page) {
    await aggregate.insertIfDoesNotExist(ctx, doc);
  }

  if (!page.isDone) {
    // More rows to process — schedule continuation
    const nextCursor = page.continueCursor;
    await ctx.scheduler.runAfter(0, continuationFn, { cursor: nextCursor });
    console.log(` ${tableName}: processed ${BATCH_SIZE} rows, continuing...`);
  } else {
    console.log(` ${tableName}: done (final batch of ${page.page.length} rows)`);
  }
}

// ── Individual chained backfills ────────────────────────────────────

export const backfillRequests = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedBackfill(ctx, "requests", requestsByOrg,
      internal.migrations.backfillAggregates.backfillRequests, args.cursor);
  },
});

export const backfillMemberships = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedBackfill(ctx, "memberships", membershipsByOrg,
      internal.migrations.backfillAggregates.backfillMemberships, args.cursor);
  },
});

export const backfillOrgServices = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedBackfill(ctx, "orgServices", orgServicesByOrg,
      internal.migrations.backfillAggregates.backfillOrgServices, args.cursor);
  },
});

export const backfillUsers = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedBackfill(ctx, "users", globalCounts,
      internal.migrations.backfillAggregates.backfillUsers, args.cursor);
  },
});

export const backfillRegistrations = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedBackfill(ctx, "consularRegistrations", registrationsByOrg,
      internal.migrations.backfillAggregates.backfillRegistrations, args.cursor);
  },
});

export const backfillRequestsGlobal = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedBackfill(ctx, "requests", requestsGlobal,
      internal.migrations.backfillAggregates.backfillRequestsGlobal, args.cursor);
  },
});

export const backfillAssociations = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedBackfill(ctx, "associations", associationsGlobal,
      internal.migrations.backfillAggregates.backfillAssociations, args.cursor);
  },
});

export const backfillCompanies = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedBackfill(ctx, "companies", companiesGlobal,
      internal.migrations.backfillAggregates.backfillCompanies, args.cursor);
  },
});

export const backfillOrgs = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedBackfill(ctx, "orgs", orgsGlobal,
      internal.migrations.backfillAggregates.backfillOrgs, args.cursor);
  },
});

export const backfillServices = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedBackfill(ctx, "services", servicesGlobal,
      internal.migrations.backfillAggregates.backfillServices, args.cursor);
  },
});

export const backfillAppointments = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedBackfill(ctx, "appointments", appointmentsByOrg,
      internal.migrations.backfillAggregates.backfillAppointments, args.cursor);
  },
});

export const backfillChildProfiles = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await chainedBackfill(ctx, "childProfiles", childProfilesGlobal,
      internal.migrations.backfillAggregates.backfillChildProfiles, args.cursor);
  },
});

/**
 * Rebuild child profiles aggregate (clear + backfill).
 *   npx convex run migrations/backfillAggregates:rebuildChildProfiles
 */
export const rebuildChildProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log(" Clearing childProfilesGlobal aggregate...");
    await childProfilesGlobal.clearAll(ctx);
    console.log(" Starting backfill...");
    await ctx.scheduler.runAfter(0, internal.migrations.backfillAggregates.backfillChildProfiles, {});
  },
});

/**
 * Rebuild registrations aggregate (clear + backfill).
 * Run this after changing the sortKey (e.g. adding profileType).
 *   npx convex run migrations/backfillAggregates:rebuildRegistrations
 */
export const rebuildRegistrations = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log(" Clearing registrationsByOrg aggregate...");
    await registrationsByOrg.clearAll(ctx);
    console.log(" Starting backfill...");
    await ctx.scheduler.runAfter(0, internal.migrations.backfillAggregates.backfillRegistrations, {});
  },
});

// ── Run all (schedules each table sequentially with delays) ─────────

export const backfillAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const fns = [
      internal.migrations.backfillAggregates.backfillRequests,
      internal.migrations.backfillAggregates.backfillMemberships,
      internal.migrations.backfillAggregates.backfillOrgServices,
      internal.migrations.backfillAggregates.backfillUsers,
      internal.migrations.backfillAggregates.backfillRegistrations,
      internal.migrations.backfillAggregates.backfillRequestsGlobal,
      internal.migrations.backfillAggregates.backfillAssociations,
      internal.migrations.backfillAggregates.backfillCompanies,
      internal.migrations.backfillAggregates.backfillOrgs,
      internal.migrations.backfillAggregates.backfillServices,
      internal.migrations.backfillAggregates.backfillAppointments,
      internal.migrations.backfillAggregates.backfillChildProfiles,
    ];

    // Stagger starts by 5 seconds each to avoid concurrent batches
    for (let i = 0; i < fns.length; i++) {
      await ctx.scheduler.runAfter(i * 5000, fns[i], {});
    }
    console.log(` Scheduled ${fns.length} backfill chains`);
  },
});

// ── Clear all ───────────────────────────────────────────────────────

export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    await requestsByOrg.clearAll(ctx);
    await membershipsByOrg.clearAll(ctx);
    await orgServicesByOrg.clearAll(ctx);
    await globalCounts.clearAll(ctx);
    await registrationsByOrg.clearAll(ctx);
    await requestsGlobal.clearAll(ctx);
    await associationsGlobal.clearAll(ctx);
    await companiesGlobal.clearAll(ctx);
    await orgsGlobal.clearAll(ctx);
    await servicesGlobal.clearAll(ctx);
    await appointmentsByOrg.clearAll(ctx);
    await childProfilesGlobal.clearAll(ctx);
    console.log(" All aggregates cleared");
  },
});
