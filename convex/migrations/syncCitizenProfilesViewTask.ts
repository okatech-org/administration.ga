/**
 * One-shot migration : ajoute la task `citizen_profiles.view` (et `.manage`
 * pour les postes de commandement) aux positions existantes qui utilisent
 * encore le champ legacy `tasks[]`.
 *
 * Les positions qui utilisent `moduleAccess` résolvent automatiquement leurs
 * tasks depuis `MODULE_ACCESS_TASKS` (déjà mis à jour) — pas besoin de
 * migration pour elles.
 *
 * Règles (legacy tasks uniquement) :
 *   - grade "chief" ou "deputy_chief" → ajoute .view ET .manage
 *   - grade "counselor" ou "agent"    → ajoute .view uniquement
 *   - grade "external"                → ignorée (pas d'accès citoyens)
 *   - Task déjà présente              → skip (idempotent)
 *
 * À invoquer depuis le dashboard Convex ou via CLI :
 *   bunx convex run migrations/syncCitizenProfilesViewTask:run
 */
import { internalMutation } from "../_generated/server";
import { TaskCode } from "../lib/taskCodes";
import { logCortexAction } from "../lib/neocortex";
import { SIGNAL_TYPES, CATEGORIES_ACTION } from "../lib/types";

export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		const startTime = Date.now();
		let updatedView = 0;
		let updatedManage = 0;
		let skippedExternal = 0;
		let skippedModuleAccess = 0;
		let skippedAlreadyHas = 0;
		let totalCount = 0;

		try {
			const positions = await ctx.db.query("positions").collect();
			totalCount = positions.length;

			for (const position of positions) {
				const grade = (position as { grade?: string }).grade;

				if (grade === "external") {
					skippedExternal++;
					continue;
				}

				const legacyTasks = (position as { tasks?: string[] }).tasks;

				// Pas de tasks legacy → la position utilise moduleAccess,
				// la task est déjà résolue via MODULE_ACCESS_TASKS.
				if (!legacyTasks) {
					skippedModuleAccess++;
					continue;
				}

				const hasView = legacyTasks.includes(TaskCode.citizen_profiles.view);
				const hasManage = legacyTasks.includes(
					TaskCode.citizen_profiles.manage,
				);

				const shouldAddManage =
					(grade === "chief" || grade === "deputy_chief") && !hasManage;
				const shouldAddView = !hasView;

				if (!shouldAddView && !shouldAddManage) {
					skippedAlreadyHas++;
					continue;
				}

				const newTasks = [...legacyTasks];
				if (shouldAddView) {
					newTasks.push(TaskCode.citizen_profiles.view);
					updatedView++;
				}
				if (shouldAddManage) {
					newTasks.push(TaskCode.citizen_profiles.manage);
					updatedManage++;
				}

				await ctx.db.patch(position._id, { tasks: newTasks } as never);
			}

			const duration = Date.now() - startTime;
			await logCortexAction(ctx, {
				action: "MIGRATION_SYNC_CITIZEN_PROFILES_VIEW",
				categorie: CATEGORIES_ACTION.SYSTEME,
				entiteType: "migrations",
				entiteId: "syncCitizenProfilesViewTask",
				userId: undefined,
				apres: {
					total: totalCount,
					updatedView,
					updatedManage,
					skippedExternal,
					skippedModuleAccess,
					skippedAlreadyHas,
					durationMs: duration,
				},
				signalType: SIGNAL_TYPES.SYSTEM_CRON_SUCCESS,
			});

			return {
				total: totalCount,
				updatedView,
				updatedManage,
				skippedExternal,
				skippedModuleAccess,
				skippedAlreadyHas,
			};
		} catch (err) {
			const duration = Date.now() - startTime;
			const errorMessage = err instanceof Error ? err.message : String(err);
			await logCortexAction(ctx, {
				action: "MIGRATION_SYNC_CITIZEN_PROFILES_VIEW_ERROR",
				categorie: CATEGORIES_ACTION.SYSTEME,
				entiteType: "migrations",
				entiteId: "syncCitizenProfilesViewTask",
				userId: undefined,
				apres: {
					error: errorMessage,
					partial: { total: totalCount, updatedView, updatedManage },
					durationMs: duration,
				},
				signalType: SIGNAL_TYPES.SYSTEM_CRON_ERROR,
			});
			throw err;
		}
	},
});
