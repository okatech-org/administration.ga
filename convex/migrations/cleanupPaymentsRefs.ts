/**
 * Nettoie toutes les références au module Paiements / TaskCode payments.view
 * dans les rangs persistés (positions, orgRoleTemplates, memberships, users,
 * orgs). Indispensable après la suppression du module — sans ça, le schema
 * Convex rejette les documents existants au prochain push.
 *
 * Cibles :
 *  - positions.tasks                    : retire "payments.view"
 *  - positions.moduleAccess             : retire l'entry { moduleCode: "payments" }
 *  - orgRoleTemplates.taskPresets       : retire "payments.view"
 *  - orgRoleTemplates.moduleAccess      : retire l'entry { moduleCode: "payments" }
 *  - memberships.specialPermissions     : retire { taskCode: "payments.view" }
 *  - users.allowedModules               : retire "payments"
 *  - orgs.modules                       : retire "payments" (champ string[] non validé)
 *
 * Idempotent — ré-exécutable sans effet une fois la convergence atteinte.
 *
 * Lancement :
 *   bunx convex run migrations/cleanupPaymentsRefs:run --prod
 */

import { internalMutation } from "../_generated/server";

// Cast en `string` — ces littéraux ne font plus partie des unions
// `taskCodeValidator` / `moduleCodeValidator` après la suppression du module
// Paiements, donc la comparaison directe avec un élément typé serait rejetée
// par TypeScript. La valeur reste détectable car les rows en base sont
// stockées sous forme de string.
const STALE_TASK: string = "payments.view";
const STALE_MODULE: string = "payments";

export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		const stats = {
			positions: { tasksCleaned: 0, moduleAccessCleaned: 0 },
			orgRoleTemplates: { taskPresetsCleaned: 0, moduleAccessCleaned: 0 },
			memberships: { specialPermissionsCleaned: 0 },
			users: { allowedModulesCleaned: 0 },
			orgs: { modulesCleaned: 0 },
		};

		// 1. positions.tasks + positions.moduleAccess
		const positions = await ctx.db.query("positions").collect();
		for (const p of positions) {
			const patch: Record<string, unknown> = {};

			const cleanedTasks = p.tasks.filter((t) => t !== STALE_TASK);
			if (cleanedTasks.length !== p.tasks.length) {
				patch.tasks = cleanedTasks;
				stats.positions.tasksCleaned += 1;
			}

			if (p.moduleAccess) {
				const cleanedAccess = p.moduleAccess.filter(
					(m) => m.moduleCode !== STALE_MODULE,
				);
				if (cleanedAccess.length !== p.moduleAccess.length) {
					patch.moduleAccess = cleanedAccess;
					stats.positions.moduleAccessCleaned += 1;
				}
			}

			if (Object.keys(patch).length > 0) {
				await ctx.db.patch(p._id, patch);
			}
		}

		// 2. orgRoleTemplates.taskPresets + orgRoleTemplates.moduleAccess
		const templates = await ctx.db.query("orgRoleTemplates").collect();
		for (const tpl of templates) {
			const patch: Record<string, unknown> = {};

			const cleanedPresets = tpl.taskPresets.filter((t) => t !== STALE_TASK);
			if (cleanedPresets.length !== tpl.taskPresets.length) {
				patch.taskPresets = cleanedPresets;
				stats.orgRoleTemplates.taskPresetsCleaned += 1;
			}

			if (tpl.moduleAccess) {
				const cleanedAccess = tpl.moduleAccess.filter(
					(m) => m.moduleCode !== STALE_MODULE,
				);
				if (cleanedAccess.length !== tpl.moduleAccess.length) {
					patch.moduleAccess = cleanedAccess;
					stats.orgRoleTemplates.moduleAccessCleaned += 1;
				}
			}

			if (Object.keys(patch).length > 0) {
				await ctx.db.patch(tpl._id, patch);
			}
		}

		// 3. memberships.specialPermissions
		const memberships = await ctx.db.query("memberships").collect();
		for (const m of memberships) {
			if (!m.specialPermissions) continue;
			const cleaned = m.specialPermissions.filter(
				(sp) => sp.taskCode !== STALE_TASK,
			);
			if (cleaned.length !== m.specialPermissions.length) {
				await ctx.db.patch(m._id, { specialPermissions: cleaned });
				stats.memberships.specialPermissionsCleaned += 1;
			}
		}

		// 4. users.allowedModules
		const users = await ctx.db.query("users").collect();
		for (const u of users) {
			if (!u.allowedModules) continue;
			const cleaned = u.allowedModules.filter((m) => m !== STALE_MODULE);
			if (cleaned.length !== u.allowedModules.length) {
				await ctx.db.patch(u._id, { allowedModules: cleaned });
				stats.users.allowedModulesCleaned += 1;
			}
		}

		// 5. orgs.modules (string[] non validé — peut contenir "payments")
		const orgs = await ctx.db.query("orgs").collect();
		for (const org of orgs) {
			const modules = (org as { modules?: string[] }).modules;
			if (!modules) continue;
			const cleaned = modules.filter((m) => m !== STALE_MODULE);
			if (cleaned.length !== modules.length) {
				await ctx.db.patch(org._id, { modules: cleaned } as Record<string, unknown>);
				stats.orgs.modulesCleaned += 1;
			}
		}

		console.log("[cleanupPaymentsRefs]", JSON.stringify(stats));
		return stats;
	},
});
