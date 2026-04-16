/**
 * One-shot migration : rattache automatiquement chaque profil citoyen à
 * l'organisation qui gère les affaires consulaires pour son pays de résidence.
 *
 * Règles (via `resolveProfileAttachment`) :
 *   - residence.country = FR → managedByOrgId = org qui a FR dans ses
 *     jurisdictionCountries ET possède un module consulaire.
 *   - Priorité aux consulats généraux > hautes commissions > ambassades.
 *   - Skip les profils déjà rattachés (managedByOrgId défini) — idempotent.
 *   - Skip les profils sans pays de résidence.
 *   - Skip les pays sans org consulaire disponible.
 *
 * À invoquer depuis le dashboard Convex ou via CLI :
 *   bunx convex run migrations/backfillProfileAttachment:run
 */
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { resolveProfileAttachment } from "../lib/territoriality";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";

import { v } from "convex/values";
export const run = internalMutation({
	args: {
		cursor: v.optional(v.union(v.string(), v.null())),
		counts: v.optional(
			v.object({
				attached: v.number(),
				signaled: v.number(),
				skippedAlreadyAttached: v.number(),
				skippedNoCountry: v.number(),
				skippedNoOrg: v.number(),
				total: v.number(),
			})
		),
	},
	handler: async (ctx, args) => {
		const BATCH_SIZE = 50;
		const startTime = Date.now();
		
		let counts = args.counts ?? {
			attached: 0,
			signaled: 0,
			skippedAlreadyAttached: 0,
			skippedNoCountry: 0,
			skippedNoOrg: 0,
			total: 0,
		};

		try {
			const cursorObj = args.cursor ? args.cursor : null;
			const paginatedProfiles = await ctx.db
				.query("profiles")
				.paginate({ numItems: BATCH_SIZE, cursor: cursorObj });

			const profiles = paginatedProfiles.page;
			counts.total += profiles.length;

			for (const profile of profiles) {
				// Un rattachement existant n'est valide que si l'org pointée existe
				// et n'est pas soft-deleted/inactive. Sinon on re-calcule.
				if (profile.managedByOrgId) {
					const managingOrg = await ctx.db.get(profile.managedByOrgId);
					const isValid =
						managingOrg &&
						managingOrg.isActive === true &&
						!managingOrg.deletedAt;
					if (isValid) {
						counts.skippedAlreadyAttached++;
						continue;
					}
					// Rattachement stale (org supprimée/inactive) → on recalcule
				}

				const residenceCountry =
					profile.countryOfResidence ??
					profile.addresses?.residence?.country;
				if (!residenceCountry) {
					counts.skippedNoCountry++;
					continue;
				}

				const currentLocation = profile.currentLocation ?? residenceCountry;
				const attachment = await resolveProfileAttachment(ctx, {
					residenceCountry,
					currentLocation,
					stayDuration: 0,
				});

				if (!attachment.managedByOrgId && !attachment.signaledToOrgId) {
					counts.skippedNoOrg++;
					continue;
				}

				await ctx.db.patch(profile._id, {
					managedByOrgId: attachment.managedByOrgId,
					signaledToOrgId: attachment.signaledToOrgId,
				});

				if (attachment.managedByOrgId) counts.attached++;
				if (attachment.signaledToOrgId) counts.signaled++;
			}

			if (!paginatedProfiles.isDone) {
				// We schedule the next batch
				await ctx.scheduler.runAfter(0, internal.migrations.backfillProfileAttachment.run, {
					cursor: paginatedProfiles.continueCursor,
					counts,
				});
				return { message: "Scheduling next batch...", currentCounts: counts };
			}

			const duration = Date.now() - startTime;
			await logCortexAction(ctx, {
				action: "MIGRATION_BACKFILL_PROFILE_ATTACHMENT",
				categorie: CATEGORIES_ACTION.SYSTEME,
				entiteType: "migrations",
				entiteId: "backfillProfileAttachment",
				userId: undefined,
				apres: {
					total: counts.total,
					attached: counts.attached,
					signaled: counts.signaled,
					skippedAlreadyAttached: counts.skippedAlreadyAttached,
					skippedNoCountry: counts.skippedNoCountry,
					skippedNoOrg: counts.skippedNoOrg,
					durationMs: duration,
				},
				signalType: SIGNAL_TYPES.SYSTEM_CRON_SUCCESS,
			});

			return counts;
		} catch (err) {
			const duration = Date.now() - startTime;
			const errorMessage = err instanceof Error ? err.message : String(err);
			await logCortexAction(ctx, {
				action: "MIGRATION_BACKFILL_PROFILE_ATTACHMENT_ERROR",
				categorie: CATEGORIES_ACTION.SYSTEME,
				entiteType: "migrations",
				entiteId: "backfillProfileAttachment",
				userId: undefined,
				apres: {
					error: errorMessage,
					partial: counts,
					durationMs: duration,
				},
				signalType: SIGNAL_TYPES.SYSTEM_CRON_ERROR,
			});
			throw err;
		}
	},
});
