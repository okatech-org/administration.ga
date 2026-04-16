/**
 * Ajoute la permission `documents.ai_generation` aux positions level 1-2
 * sans écraser leurs accès existants.
 *
 * Stratégie additive — calque de `addDocumentsTasksToHighRanks` :
 *  - `source = tasks-legacy`  → append `documents.ai_generation` au tableau
 *                               `tasks[]` si manquant.
 *  - `source = moduleAccess`  → l'entrée documents=admin couvre déjà
 *                               ai_generation via MODULE_ACCESS_TASKS, donc
 *                               aucun changement nécessaire si déjà admin.
 *                               Sinon, upgrade documents à admin.
 *  - Position déjà couverte   → skip.
 *
 * Idempotent — ré-exécuter est sans effet une fois tout converge.
 *
 * Usage :
 *   convex run migrations/addDocumentsAiGenerationToHighRanks
 */

import { internalMutation } from "../_generated/server";
import { ModuleCode } from "../lib/moduleCodes";
import type { TaskCodeValue } from "../lib/taskCodes";

const KEY_TASK: TaskCodeValue = "documents.ai_generation";

export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		let tasksAppended = 0;
		let moduleAccessUpgraded = 0;
		let moduleAccessAdded = 0;
		let skipped = 0;

		const positions = await ctx.db.query("positions").collect();

		for (const position of positions) {
			if (position.deletedAt) continue;
			if (!position.isActive) continue;
			if (position.level !== 1 && position.level !== 2) continue;

			const usesModuleAccess =
				position.moduleAccess !== undefined && position.moduleAccess.length > 0;

			if (usesModuleAccess) {
				const current = position.moduleAccess ?? [];
				const existing = current.find(
					(m) => m.moduleCode === ModuleCode.documents,
				);

				if (existing?.accessLevel === "admin") {
					// admin already includes ai_generation — nothing to do.
					skipped += 1;
					continue;
				}

				let next: typeof current;
				if (existing) {
					next = current.map((m) =>
						m.moduleCode === ModuleCode.documents
							? { ...m, accessLevel: "admin" }
							: m,
					);
					moduleAccessUpgraded += 1;
				} else {
					next = [
						...current,
						{ moduleCode: ModuleCode.documents, accessLevel: "admin" },
					];
					moduleAccessAdded += 1;
				}

				await ctx.db.patch(position._id, {
					moduleAccess: next,
					updatedAt: Date.now(),
				});
			} else {
				const currentTasks = position.tasks ?? [];
				if (currentTasks.includes(KEY_TASK)) {
					skipped += 1;
					continue;
				}
				await ctx.db.patch(position._id, {
					tasks: [...currentTasks, KEY_TASK],
					updatedAt: Date.now(),
				});
				tasksAppended += 1;
			}
		}

		return {
			tasksAppended,
			moduleAccessUpgraded,
			moduleAccessAdded,
			skipped,
			totalTouched: tasksAppended + moduleAccessUpgraded + moduleAccessAdded,
		};
	},
});
