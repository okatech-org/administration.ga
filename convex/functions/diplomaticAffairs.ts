/**
 * Affaires Diplomatiques — Fonctions Convex
 *
 * CRUD pour les 4 volets : Cibles, Lettres, Plans, Rapports.
 */

import { v } from "convex/values";
import { authMutation, authQuery } from "../lib/customFunctions";

// ═════════════════════════════════════════════════════════════════════════════
// CIBLES
// ═════════════════════════════════════════════════════════════════════════════

export const listTargets = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticTargets")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const createTarget = authMutation({
  args: {
    orgId: v.id("orgs"),
    name: v.string(),
    type: v.union(
      v.literal("enterprise"), v.literal("government"), v.literal("ngo"),
      v.literal("international_org"), v.literal("academic"), v.literal("media"), v.literal("other"),
    ),
    sector: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactTitle: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("diplomaticTargets", {
      ...args,
      tags: args.tags ?? [],
      status: "identified",
      notes: undefined,
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTarget = authMutation({
  args: {
    targetId: v.id("diplomaticTargets"),
    name: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("identified"), v.literal("contacted"), v.literal("in_discussion"),
      v.literal("partnership"), v.literal("inactive"),
    )),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"))),
    notes: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { targetId, ...updates } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, val] of Object.entries(updates)) {
      if (val !== undefined) patch[k] = val;
    }
    await ctx.db.patch(targetId, patch);
  },
});

export const deleteTarget = authMutation({
  args: { targetId: v.id("diplomaticTargets") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.targetId, { deletedAt: Date.now(), updatedAt: Date.now() });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// LETTRES DE CONTACT
// ═════════════════════════════════════════════════════════════════════════════

export const listLetters = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticLetters")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const createLetter = authMutation({
  args: {
    orgId: v.id("orgs"),
    targetId: v.optional(v.id("diplomaticTargets")),
    subject: v.string(),
    type: v.union(
      v.literal("introduction"), v.literal("follow_up"), v.literal("invitation"),
      v.literal("proposal"), v.literal("thank_you"), v.literal("other"),
    ),
    recipientName: v.string(),
    recipientTitle: v.optional(v.string()),
    recipientOrg: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const year = new Date().getFullYear();
    const n = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
    const reference = `LD/${year}/${n}`;

    return await ctx.db.insert("diplomaticLetters", {
      ...args,
      reference,
      status: "draft",
      attachments: [],
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateLetterStatus = authMutation({
  args: {
    letterId: v.id("diplomaticLetters"),
    status: v.union(
      v.literal("draft"), v.literal("pending_approval"), v.literal("approved"),
      v.literal("sent"), v.literal("responded"), v.literal("archived"),
    ),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status, updatedAt: Date.now() };
    if (args.status === "sent") patch.sentAt = Date.now();
    if (args.status === "responded") patch.respondedAt = Date.now();
    await ctx.db.patch(args.letterId, patch);
  },
});

export const deleteLetter = authMutation({
  args: { letterId: v.id("diplomaticLetters") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.letterId, { deletedAt: Date.now(), updatedAt: Date.now() });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// PLANS STRATÉGIQUES
// ═════════════════════════════════════════════════════════════════════════════

export const listPlans = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticPlans")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const createPlan = authMutation({
  args: {
    orgId: v.id("orgs"),
    title: v.string(),
    period: v.optional(v.string()),
    category: v.union(
      v.literal("bilateral"), v.literal("economic"), v.literal("cultural"),
      v.literal("security"), v.literal("multilateral"), v.literal("other"),
    ),
    summary: v.optional(v.string()),
    objectives: v.optional(v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      status: v.union(v.literal("planned"), v.literal("in_progress"), v.literal("completed"), v.literal("cancelled")),
      deadline: v.optional(v.number()),
    }))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("diplomaticPlans", {
      ...args,
      objectives: args.objectives ?? [],
      status: "draft",
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deletePlan = authMutation({
  args: { planId: v.id("diplomaticPlans") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.planId, { deletedAt: Date.now(), updatedAt: Date.now() });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// RAPPORTS
// ═════════════════════════════════════════════════════════════════════════════

export const listReports = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diplomaticReports")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});

export const createReport = authMutation({
  args: {
    orgId: v.id("orgs"),
    title: v.string(),
    type: v.union(
      v.literal("activity"), v.literal("situation"), v.literal("mission"),
      v.literal("economic"), v.literal("security"), v.literal("annual"), v.literal("other"),
    ),
    recipient: v.union(
      v.literal("president"), v.literal("minister"), v.literal("secretary_general"),
      v.literal("direction"), v.literal("other"),
    ),
    summary: v.optional(v.string()),
    content: v.optional(v.string()),
    period: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("diplomaticReports", {
      ...args,
      status: "draft",
      attachments: [],
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateReportStatus = authMutation({
  args: {
    reportId: v.id("diplomaticReports"),
    status: v.union(
      v.literal("draft"), v.literal("pending_review"), v.literal("approved"),
      v.literal("submitted"), v.literal("archived"),
    ),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { status: args.status, updatedAt: Date.now() };
    if (args.status === "submitted") patch.submittedAt = Date.now();
    await ctx.db.patch(args.reportId, patch);
  },
});

export const deleteReport = authMutation({
  args: { reportId: v.id("diplomaticReports") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, { deletedAt: Date.now(), updatedAt: Date.now() });
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// STATISTIQUES
// ═════════════════════════════════════════════════════════════════════════════

export const getDashboardStats = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const targets = await ctx.db.query("diplomaticTargets")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const letters = await ctx.db.query("diplomaticLetters")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const plans = await ctx.db.query("diplomaticPlans")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const reports = await ctx.db.query("diplomaticReports")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    return {
      targets: { total: targets.length, byStatus: groupBy(targets, "status"), byPriority: groupBy(targets, "priority") },
      letters: { total: letters.length, byStatus: groupBy(letters, "status") },
      plans: { total: plans.length, active: plans.filter((p) => p.status === "active").length },
      reports: { total: reports.length, pending: reports.filter((r) => r.status === "pending_review").length },
    };
  },
});

function groupBy<T extends Record<string, any>>(items: T[], key: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const val = item[key] as string;
    result[val] = (result[val] ?? 0) + 1;
  }
  return result;
}
