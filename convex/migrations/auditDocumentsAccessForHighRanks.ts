/**
 * DRY-RUN — diagnostique l'accès au module documents pour les positions
 * level 1-2, sans modifier la base.
 *
 * Objectif : savoir quelles positions ont déjà le bon niveau d'accès via
 * leur état existant (moduleAccess ou tasks[] legacy), et lesquelles
 * manquent effectivement la permission `documents.manage_templates` +
 * `documents.sign` + `documents.publish`.
 *
 * Catégorise chaque position :
 *  - fullyCovered   : a déjà les 3 tasks clés (via moduleAccess ou tasks[])
 *  - partialCoverage: a certaines tasks mais pas toutes les 3
 *  - noCoverage     : aucune des 3 tasks — c'est elle qu'il faudrait
 *                     patcher si on veut donner les droits.
 *
 * Retourne un breakdown par orgId + détail par position (code + current state)
 * pour que l'opérateur puisse décider en connaissance de cause.
 */

import { internalQuery } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { ModuleCode, MODULE_ACCESS_TASKS } from "../lib/moduleCodes";

const KEY_TASKS = [
	"documents.manage_templates",
	"documents.sign",
	"documents.publish",
] as const;

export const run = internalQuery({
	args: {},
	handler: async (ctx) => {
		const positions = await ctx.db.query("positions").collect();
		const orgs = await ctx.db.query("orgs").collect();
		const orgName = new Map<string, string>();
		for (const o of orgs) orgName.set(o._id, o.name);

		const rows: Array<{
			positionId: string;
			orgId: string;
			orgName: string;
			code: string;
			level: number;
			source: "moduleAccess" | "tasks-legacy" | "empty";
			currentDocumentsLevel: string | null;
			hasManageTemplates: boolean;
			hasSign: boolean;
			hasPublish: boolean;
			status: "fullyCovered" | "partialCoverage" | "noCoverage";
		}> = [];

		let fullyCovered = 0;
		let partialCoverage = 0;
		let noCoverage = 0;

		for (const position of positions) {
			if (position.deletedAt) continue;
			if (!position.isActive) continue;
			if (position.level !== 1 && position.level !== 2) continue;

			const effectiveTasks = resolveEffectiveTasks(position);
			const hasManageTemplates = effectiveTasks.has("documents.manage_templates");
			const hasSign = effectiveTasks.has("documents.sign");
			const hasPublish = effectiveTasks.has("documents.publish");
			const hits = [hasManageTemplates, hasSign, hasPublish].filter(Boolean).length;

			const documentsEntry = position.moduleAccess?.find(
				(m) => m.moduleCode === ModuleCode.documents,
			);
			const source: "moduleAccess" | "tasks-legacy" | "empty" =
				position.moduleAccess && position.moduleAccess.length > 0
					? "moduleAccess"
					: (position.tasks ?? []).length > 0
						? "tasks-legacy"
						: "empty";

			const status =
				hits === 3 ? "fullyCovered" : hits === 0 ? "noCoverage" : "partialCoverage";

			if (status === "fullyCovered") fullyCovered += 1;
			else if (status === "noCoverage") noCoverage += 1;
			else partialCoverage += 1;

			rows.push({
				positionId: position._id,
				orgId: position.orgId,
				orgName: orgName.get(position.orgId) ?? "?",
				code: position.code,
				level: position.level,
				source,
				currentDocumentsLevel: documentsEntry?.accessLevel ?? null,
				hasManageTemplates,
				hasSign,
				hasPublish,
				status,
			});
		}

		// Breakdown par org (combien de positions à patcher par org)
		const byOrg = new Map<string, { org: string; toPatch: number; total: number }>();
		for (const row of rows) {
			const entry = byOrg.get(row.orgId) ?? {
				org: row.orgName,
				toPatch: 0,
				total: 0,
			};
			entry.total += 1;
			if (row.status !== "fullyCovered") entry.toPatch += 1;
			byOrg.set(row.orgId, entry);
		}

		return {
			summary: {
				totalLevel1and2: rows.length,
				fullyCovered,
				partialCoverage,
				noCoverage,
			},
			byOrg: Array.from(byOrg.values()).sort((a, b) => b.toPatch - a.toPatch),
			sample: {
				// Jusqu'à 20 exemples de positions à patcher pour inspection
				toPatch: rows
					.filter((r) => r.status !== "fullyCovered")
					.slice(0, 20)
					.map((r) => ({
						org: r.orgName,
						code: r.code,
						level: r.level,
						source: r.source,
						hasManageTemplates: r.hasManageTemplates,
						hasSign: r.hasSign,
						hasPublish: r.hasPublish,
					})),
			},
		};
	},
});

/**
 * Reproduit la logique de `getTasksForMembership` — moduleAccess gagne s'il
 * est non-vide, sinon on retombe sur tasks[].
 */
function resolveEffectiveTasks(position: Doc<"positions">): Set<string> {
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
