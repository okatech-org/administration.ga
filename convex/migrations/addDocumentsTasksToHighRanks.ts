/**
 * Ajoute les permissions documents (manage_templates + sign + publish) aux
 * positions level 1-2 sans écraser leurs accès existants.
 *
 * Stratégie additive — respecte la source de permissions de chaque position :
 *  - `source = tasks-legacy`  → append les 3 task codes manquants au tableau
 *                               `tasks[]`, sans toucher `moduleAccess`
 *                               (reste undefined, fallback legacy préservé).
 *  - `source = moduleAccess`  → ajoute ou upgrade l'entry `documents` à
 *                               `admin` dans `moduleAccess`. Les autres
 *                               entrées ne sont jamais modifiées.
 *  - Position déjà couverte   → skip.
 *
 * Idempotent — ré-exécuter est sans effet une fois tout converge.
 */

import { internalMutation } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { ModuleCode, MODULE_ACCESS_TASKS } from "../lib/moduleCodes";
import type { TaskCodeValue } from "../lib/taskCodes";

const KEY_TASKS: TaskCodeValue[] = [
	"documents.manage_templates",
	"documents.sign",
	"documents.publish",
];

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
					skipped += 1;
					continue;
				}

				let next: typeof current;
				if (existing) {
					// Upgrade l'entry existante à admin ; toutes les autres restent intactes
					next = current.map((m) =>
						m.moduleCode === ModuleCode.documents
							? { ...m, accessLevel: "admin" }
							: m,
					);
					moduleAccessUpgraded += 1;
				} else {
					// Ajoute une nouvelle entry documents=admin sans toucher les autres
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
				// Mode legacy tasks[] — on append les 3 tasks clés sans toucher au reste
				const currentTasks = position.tasks ?? [];
				const missing = KEY_TASKS.filter((t) => !currentTasks.includes(t));
				if (missing.length === 0) {
					skipped += 1;
					continue;
				}
				await ctx.db.patch(position._id, {
					tasks: [...currentTasks, ...missing],
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

/**
 * Pour debug : dérive les tasks effectives d'une position, reproduit la
 * logique de `getTasksForMembership` (moduleAccess non-vide > tasks[] legacy).
 */
function _resolveEffectiveTasks(position: Doc<"positions">): Set<string> {
	const moduleAccess = position.moduleAccess;
	if (moduleAccess && moduleAccess.length > 0) {
		const set = new Set<string>();
		for (const entry of moduleAccess) {
			const mapping = MODULE_ACCESS_TASKS[entry.moduleCode];
			if (!mapping) continue;
			for (const task of mapping[entry.accessLevel]) set.add(task);
		}
		return set;
	}
	return new Set(position.tasks ?? []);
}
