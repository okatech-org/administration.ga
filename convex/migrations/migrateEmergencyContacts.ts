/**
 * Migration: Convert legacy emergencyResidence/emergencyHomeland fields
 * to the new emergencyContacts array format with country.
 *
 * Uses CHAINED PAGINATION to handle large tables safely.
 *
 * Usage:
 *   npx convex run migrations/migrateEmergencyContacts:run
 */
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { CountryCode } from "../lib/countryCodeValidator";

const BATCH_SIZE = 100;

/** Public kickoff — call this once */
export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		console.log("Starting emergency contacts migration...");
		await ctx.scheduler.runAfter(
			0,
			internal.migrations.migrateEmergencyContacts.processBatch,
			{},
		);
	},
});

/** @internal — processes one page, then schedules itself */
export const processBatch = internalMutation({
	args: { cursor: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const page = await ctx.db.query("profiles").paginate({
			cursor: args.cursor ?? null,
			numItems: BATCH_SIZE,
		});

		let migrated = 0;
		let skipped = 0;

		for (const profile of page.page) {
			// Skip if already migrated
			if (
				profile.contacts.emergencyContacts &&
				profile.contacts.emergencyContacts.length > 0
			) {
				skipped++;
				continue;
			}

			const emergencyContacts: NonNullable<
				typeof profile.contacts.emergencyContacts
			> = [];

			// Convert emergencyResidence → entry with countryOfResidence
			const res = profile.contacts.emergencyResidence;
			if (res && res.firstName && res.phone) {
				emergencyContacts.push({
					...res,
					country: profile.countryOfResidence ?? undefined,
				});
			}

			// Convert emergencyHomeland → entry with nationality or GA
			const home = profile.contacts.emergencyHomeland;
			if (home && home.firstName && home.phone) {
				emergencyContacts.push({
					...home,
					country: profile.identity?.nationality ?? CountryCode.GA,
				});
			}

			if (emergencyContacts.length > 0) {
				await ctx.db.patch(profile._id, {
					contacts: {
						...profile.contacts,
						emergencyContacts,
					},
				});
				migrated++;
			} else {
				skipped++;
			}
		}

		console.log(
			`Emergency contacts: migrated=${migrated}, skipped=${skipped}, batch=${page.page.length}`,
		);

		if (!page.isDone) {
			await ctx.scheduler.runAfter(
				0,
				internal.migrations.migrateEmergencyContacts.processBatch,
				{
					cursor: page.continueCursor,
				},
			);
		} else {
			console.log("Emergency contacts migration complete!");
		}
	},
});

// ── Migrate request formData: legacy → emergency_contacts array ──

/** Kickoff for request formData migration */
export const migrateRequestFormData = internalMutation({
	args: {},
	handler: async (ctx) => {
		console.log("Starting request formData emergency contacts migration...");
		await ctx.scheduler.runAfter(
			0,
			internal.migrations.migrateEmergencyContacts.processRequestBatch,
			{},
		);
	},
});

/** Process one batch of requests */
export const processRequestBatch = internalMutation({
	args: { cursor: v.optional(v.string()) },
	handler: async (ctx, args) => {
		const page = await ctx.db.query("requests").paginate({
			cursor: args.cursor ?? null,
			numItems: BATCH_SIZE,
		});

		let migrated = 0;
		let skipped = 0;

		for (const request of page.page) {
			const formData = request.formData as Record<string, any> | undefined;
			if (!formData) {
				skipped++;
				continue;
			}

			// Already has emergency_contacts array → skip
			if (Array.isArray(formData.emergency_contacts) && formData.emergency_contacts.length > 0) {
				// Clean up old fields if they still exist
				if (formData.emergency_residence || formData.emergency_homeland) {
					const { emergency_residence, emergency_homeland, ...rest } = formData;
					await ctx.db.patch(request._id, { formData: rest });
					migrated++;
				} else {
					skipped++;
				}
				continue;
			}

			// Convert legacy emergency_residence/emergency_homeland → emergency_contacts array
			const contacts: Array<Record<string, unknown>> = [];

			const res = formData.emergency_residence;
			if (res && typeof res === "object") {
				const c: Record<string, unknown> = {};
				if (res.emergency_residence_last_name) c.last_name = res.emergency_residence_last_name;
				if (res.emergency_residence_first_name) c.first_name = res.emergency_residence_first_name;
				if (res.emergency_residence_phone) c.phone = res.emergency_residence_phone;
				if (res.emergency_residence_email) c.email = res.emergency_residence_email;
				// Try to get country from residence address
				if (formData.residence_address?.residence_country) {
					c.country = formData.residence_address.residence_country;
				}
				if (Object.keys(c).length > 0) contacts.push(c);
			}

			const home = formData.emergency_homeland;
			if (home && typeof home === "object") {
				const c: Record<string, unknown> = {};
				if (home.emergency_homeland_last_name) c.last_name = home.emergency_homeland_last_name;
				if (home.emergency_homeland_first_name) c.first_name = home.emergency_homeland_first_name;
				if (home.emergency_homeland_phone) c.phone = home.emergency_homeland_phone;
				if (home.emergency_homeland_email) c.email = home.emergency_homeland_email;
				// Try to get country from homeland address or default to GA
				if (formData.homeland_address?.homeland_country) {
					c.country = formData.homeland_address.homeland_country;
				} else if (formData.basic_info?.nationality) {
					c.country = formData.basic_info.nationality;
				}
				if (Object.keys(c).length > 0) contacts.push(c);
			}

			if (contacts.length > 0) {
				const { emergency_residence: _r, emergency_homeland: _h, ...rest } = formData;
				await ctx.db.patch(request._id, {
					formData: { ...rest, emergency_contacts: contacts },
				});
				migrated++;
			} else {
				skipped++;
			}
		}

		console.log(
			`Request formData: migrated=${migrated}, skipped=${skipped}, batch=${page.page.length}`,
		);

		if (!page.isDone) {
			await ctx.scheduler.runAfter(
				0,
				internal.migrations.migrateEmergencyContacts.processRequestBatch,
				{ cursor: page.continueCursor },
			);
		} else {
			console.log("Request formData migration complete!");
		}
	},
});
