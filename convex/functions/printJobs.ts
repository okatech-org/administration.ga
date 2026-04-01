import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { authMutation, authQuery } from "../lib/customFunctions";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List print jobs for an organization, optionally filtered by status.
 * Returns most recent first.
 */
export const listByOrg = authQuery({
	args: {
		orgId: v.id("orgs"),
		status: v.optional(
			v.union(
				v.literal("queued"),
				v.literal("printing"),
				v.literal("completed"),
				v.literal("failed"),
				v.literal("cancelled"),
			),
		),
	},
	handler: async (ctx, args) => {
		if (args.status) {
			return await ctx.db
				.query("printJobs")
				.withIndex("by_org_status", (q) =>
					q.eq("orgId", args.orgId).eq("status", args.status!),
				)
				.order("desc")
				.take(200);
		}
		return await ctx.db
			.query("printJobs")
			.withIndex("by_org_queued", (q) => q.eq("orgId", args.orgId))
			.order("desc")
			.take(200);
	},
});

/**
 * Get queue stats for the dashboard badge
 */
export const queueStats = authQuery({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		const queued = await ctx.db
			.query("printJobs")
			.withIndex("by_org_status", (q) =>
				q.eq("orgId", args.orgId).eq("status", "queued"),
			)
			.collect();
		const printing = await ctx.db
			.query("printJobs")
			.withIndex("by_org_status", (q) =>
				q.eq("orgId", args.orgId).eq("status", "printing"),
			)
			.collect();
		const failed = await ctx.db
			.query("printJobs")
			.withIndex("by_org_status", (q) =>
				q.eq("orgId", args.orgId).eq("status", "failed"),
			)
			.collect();

		return {
			queued: queued.length,
			printing: printing.length,
			failed: failed.length,
			total: queued.length + printing.length,
		};
	},
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a single print job
 */
export const create = authMutation({
	args: {
		designId: v.id("cardDesigns"),
		designName: v.string(),
		designVersion: v.number(),
		profileId: v.optional(v.id("profiles")),
		profileName: v.optional(v.string()),
		fieldValues: v.optional(v.any()),
		copies: v.number(),
		printDuplex: v.boolean(),
		priority: v.union(v.literal("normal"), v.literal("high"), v.literal("urgent")),
		orgId: v.id("orgs"),
		batchId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("printJobs", {
			...args,
			status: "queued",
			createdBy: ctx.user._id,
			queuedAt: Date.now(),
		});
	},
});

/**
 * Create a batch of print jobs (one per profile)
 */
export const createBatch = authMutation({
	args: {
		designId: v.id("cardDesigns"),
		designName: v.string(),
		designVersion: v.number(),
		jobs: v.array(
			v.object({
				profileId: v.optional(v.id("profiles")),
				childProfileId: v.optional(v.id("childProfiles")),
				profileName: v.string(),
				fieldValues: v.any(),
			}),
		),
		copies: v.number(),
		printDuplex: v.boolean(),
		priority: v.union(v.literal("normal"), v.literal("high"), v.literal("urgent")),
		orgId: v.id("orgs"),
	},
	handler: async (ctx, args) => {
		const batchId = `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
		const jobIds = [];

		for (const job of args.jobs) {
			const id = await ctx.db.insert("printJobs", {
				designId: args.designId,
				designName: args.designName,
				designVersion: args.designVersion,
				profileId: job.profileId,
				childProfileId: job.childProfileId,
				profileName: job.profileName,
				fieldValues: job.fieldValues,
				copies: args.copies,
				printDuplex: args.printDuplex,
				priority: args.priority,
				orgId: args.orgId,
				batchId,
				status: "queued",
				createdBy: ctx.user._id,
				queuedAt: Date.now(),
			});
			jobIds.push(id);
		}

		return { batchId, count: jobIds.length };
	},
});

/**
 * Update job status (called by the print engine)
 */
export const updateStatus = authMutation({
	args: {
		jobId: v.id("printJobs"),
		status: v.union(
			v.literal("printing"),
			v.literal("completed"),
			v.literal("failed"),
			v.literal("cancelled"),
		),
		errorMessage: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job) throw new Error("Print job not found");

		const updates: Record<string, unknown> = { status: args.status };

		if (args.status === "printing") {
			updates.startedAt = Date.now();
		}
		if (args.status === "completed" || args.status === "failed") {
			updates.completedAt = Date.now();
		}
		if (args.errorMessage) {
			updates.errorMessage = args.errorMessage;
		}

		await ctx.db.patch(args.jobId, updates);

		// When completed, mark the linked consular registration as printed
		const regIdStr = (job as any).fieldValues?._registrationId || (job as any).registrationId;
		if (args.status === "completed" && regIdStr) {
			try {
				const regId = regIdStr as Id<"consularRegistrations">;
				const registration = await ctx.db.get(regId);
				if (registration && !(registration as any).printedAt) {
					await ctx.db.patch(regId, { printedAt: Date.now() } as any);
				}
			} catch {
				// Ignore if registration not found
			}
		}

		return args.jobId;
	},
});

/**
 * Cancel a queued job
 */
export const cancel = authMutation({
	args: { jobId: v.id("printJobs") },
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job) throw new Error("Print job not found");
		if (job.status !== "queued") {
			throw new Error("Only queued jobs can be cancelled");
		}
		await ctx.db.patch(args.jobId, {
			status: "cancelled",
			completedAt: Date.now(),
		});
		return true;
	},
});

/**
 * Retry a failed job (re-queue it)
 */
export const retry = authMutation({
	args: { jobId: v.id("printJobs") },
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job) throw new Error("Print job not found");
		if (job.status !== "failed") {
			throw new Error("Only failed jobs can be retried");
		}
		await ctx.db.patch(args.jobId, {
			status: "queued",
			errorMessage: undefined,
			startedAt: undefined,
			completedAt: undefined,
			queuedAt: Date.now(),
		});
		return true;
	},
});

/**
 * Delete completed/cancelled/failed jobs (cleanup)
 */
export const remove = authMutation({
	args: { jobId: v.id("printJobs") },
	handler: async (ctx, args) => {
		const job = await ctx.db.get(args.jobId);
		if (!job) throw new Error("Print job not found");
		if (job.status === "printing") {
			throw new Error("Cannot delete a job that is currently printing");
		}
		await ctx.db.delete(args.jobId);
		return true;
	},
});
