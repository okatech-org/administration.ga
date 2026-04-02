/**
 * Migration: Normalize phone numbers + sync to BetterAuth.
 *
 * Uses CHAINED PAGINATION to handle large tables safely.
 *
 * Usage:
 *   npx convex run migrations/normalizePhones:run
 */
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { components } from "../_generated/api";
import { normalizePhone } from "../lib/phone";

const BATCH_SIZE = 100;

/** Public kickoff — call this once */
export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		console.log(" Starting phone normalization + BetterAuth sync...");
		await ctx.scheduler.runAfter(0, internal.migrations.normalizePhones.processBatch, {});
	},
});

/** @internal — processes one page, then schedules itself */
export const processBatch = internalMutation({
	args: { cursor: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const page = await ctx.db.query("users").paginate({
			cursor: args.cursor ?? null,
			numItems: BATCH_SIZE,
		});

		let synced = 0;
		let normalized = 0;
		let skipped = 0;

		for (const user of page.page) {
			if (!user.phone || !user.authId) continue;

			const cleanPhone = normalizePhone(user.phone) ?? user.phone;

			// Normalize in app users table
			if (cleanPhone !== user.phone) {
				await ctx.db.patch(user._id, { phone: cleanPhone });
				normalized++;
			}

			// Sync to BetterAuth
			try {
				await ctx.runMutation(components.betterAuth.adapter.updateOne, {
					input: {
						model: "user",
						where: [{ field: "_id", value: user.authId }],
						update: { phoneNumber: cleanPhone },
					},
				});
				synced++;
			} catch {
				skipped++;
			}
		}

		console.log(
			` Phones: synced=${synced}, normalized=${normalized}, skipped=${skipped}, batch=${page.page.length}`,
		);

		if (!page.isDone) {
			await ctx.scheduler.runAfter(0, internal.migrations.normalizePhones.processBatch, {
				cursor: page.continueCursor,
			});
		} else {
			console.log(" Phone normalization complete!");
		}
	},
});
