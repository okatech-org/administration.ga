/**
 * Ajoute la permission `chats.accessStandardThread` aux positions existantes
 * qui ont les presets `direction` ou `management`, pour faire propager le
 * fix RBAC de sécurité (PR #56 → commit 16a1f5f).
 *
 * Contexte : la permission a été ajoutée aux presets sources côté code, mais
 * les positions déjà seedées en base conservent leur `tasks[]` figé depuis
 * la création de l'org. Cette migration distribue la nouvelle task aux
 * positions concernées sans toucher au reste.
 *
 * Marqueur de détection : une position qui a `team.manage` dans ses tasks
 * provient OBLIGATOIREMENT d'un preset `direction` ou `management` (c'est
 * le seul couple qui octroie `team.manage`). Cette heuristique évite de
 * devoir inférer le preset d'origine depuis les presets actuels.
 *
 * Idempotent — ré-exécuter est sans effet une fois la permission distribuée.
 *
 * Invocation manuelle (dashboard Convex) :
 *   internal.migrations.addChatsAccessStandardThreadToHighRanks.run
 */

import { internalMutation } from "../_generated/server";
import { TaskCode, type TaskCodeValue } from "../lib/taskCodes";

const TARGET_TASK: TaskCodeValue = TaskCode.chats.accessStandardThread;
/**
 * Marqueur de preset « encadrement » : seuls `direction` et `management`
 * possèdent `team.manage` — permet d'identifier ces positions sans stocker
 * le preset d'origine.
 */
const MARKER_TASK: TaskCodeValue = TaskCode.team.manage;

export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		let granted = 0;
		let alreadyGranted = 0;
		let notEligible = 0;

		const positions = await ctx.db.query("positions").collect();

		for (const position of positions) {
			if (position.deletedAt) continue;
			if (!position.isActive) continue;

			const currentTasks = position.tasks ?? [];

			// Position hors scope (pas un rôle d'encadrement)
			if (!currentTasks.includes(MARKER_TASK)) {
				notEligible += 1;
				continue;
			}

			// Déjà couverte (migration déjà passée ou position créée après le fix)
			if (currentTasks.includes(TARGET_TASK)) {
				alreadyGranted += 1;
				continue;
			}

			await ctx.db.patch(position._id, {
				tasks: [...currentTasks, TARGET_TASK],
				updatedAt: Date.now(),
			});
			granted += 1;
		}

		return {
			granted,
			alreadyGranted,
			notEligible,
			totalScanned: positions.length,
		};
	},
});
