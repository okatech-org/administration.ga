/**
 * Rollback de `grantDocumentsAdminToHighRanks` :
 *
 * La première migration a ajouté `{ documents: admin }` au `moduleAccess`
 * de chaque position level 1-2. Problème : la plupart de ces positions
 * n'avaient PAS de `moduleAccess` au départ (undefined) et s'appuyaient
 * sur `tasks[]` legacy. `getTasksForMembership` (convex/lib/permissions.ts)
 * PRIORISE `moduleAccess` non-vide sur `tasks[]` → en créant
 * `moduleAccess = [{documents, admin}]`, on a invalidé tous les autres
 * modules (iBoîte, iCorrespondance, iAgenda, Équipe, etc.) que leur
 * preset legacy leur octroyait.
 *
 * Stratégie de rollback :
 *  - Pour chaque position level 1-2 qui a aujourd'hui `moduleAccess`
 *    contenant une entrée `documents` :
 *      · on retire l'entrée `documents`
 *      · si le tableau devient vide → on remet `moduleAccess` à `undefined`
 *        pour restaurer le fallback legacy `tasks[]`
 *      · sinon → on conserve les autres entrées telles quelles
 *
 * Idempotent — ré-exécuter est sans effet.
 */

import { internalMutation } from "../_generated/server";
import { ModuleCode } from "../lib/moduleCodes";

export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		let positionsCleared = 0; // moduleAccess remis à undefined
		let positionsFiltered = 0; // documents retiré, autres entrées conservées
		let positionsUntouched = 0;

		const positions = await ctx.db.query("positions").collect();

		for (const position of positions) {
			if (position.deletedAt) continue;
			if (position.level !== 1 && position.level !== 2) continue;

			const current = position.moduleAccess;
			if (!current || current.length === 0) {
				positionsUntouched += 1;
				continue;
			}

			const withoutDocs = current.filter(
				(m) => m.moduleCode !== ModuleCode.documents,
			);

			if (withoutDocs.length === current.length) {
				// Pas d'entrée documents → rien à faire
				positionsUntouched += 1;
				continue;
			}

			if (withoutDocs.length === 0) {
				// Entrée documents seule → retour au fallback legacy
				await ctx.db.patch(position._id, {
					moduleAccess: undefined,
					updatedAt: Date.now(),
				});
				positionsCleared += 1;
			} else {
				// D'autres entrées existent → on garde uniquement celles-là
				await ctx.db.patch(position._id, {
					moduleAccess: withoutDocs,
					updatedAt: Date.now(),
				});
				positionsFiltered += 1;
			}
		}

		return {
			cleared: positionsCleared,
			filtered: positionsFiltered,
			untouched: positionsUntouched,
			total: positionsCleared + positionsFiltered + positionsUntouched,
		};
	},
});
