/**
 * One-shot migration — distribute `documents` module to every org + grant
 * `admin` level access on the documents module to every active position at
 * hierarchy level 1 (chief) or 2 (deputy_chief).
 *
 * Idempotent : running twice is a no-op once the state converges. Reports
 * how many orgs / positions were patched for observability.
 *
 * Invoke via CLI :
 *   bunx convex run migrations/grantDocumentsAdminToHighRanks:run
 */

import { internalMutation } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { ModuleCode } from "../lib/moduleCodes";

type ModuleAccessEntry = NonNullable<Doc<"positions">["moduleAccess"]>[number];

export const run = internalMutation({
	args: {},
	handler: async (ctx) => {
		let orgsPatched = 0;
		let positionsPatched = 0;
		let positionsAlreadyAdmin = 0;

		// ── 1. Ensure every active org has `documents` in its modules array.
		const allOrgs = await ctx.db.query("orgs").collect();
		for (const org of allOrgs) {
			const modules = org.modules ?? [];
			if (modules.includes(ModuleCode.documents)) continue;
			await ctx.db.patch(org._id, {
				modules: [...modules, ModuleCode.documents],
			});
			orgsPatched += 1;
		}

		// ── 2. Promote documents access to `admin` on every active position
		//       with level 1 or 2 (chief / deputy_chief).
		const positions = await ctx.db
			.query("positions")
			.collect();

		for (const position of positions) {
			if (position.deletedAt) continue;
			if (!position.isActive) continue;
			if (position.level !== 1 && position.level !== 2) continue;

			const current = position.moduleAccess ?? [];
			const existing = current.find((m) => m.moduleCode === ModuleCode.documents);

			if (existing?.accessLevel === "admin") {
				positionsAlreadyAdmin += 1;
				continue;
			}

			const next: ModuleAccessEntry[] = existing
				? current.map((m) =>
						m.moduleCode === ModuleCode.documents
							? { ...m, accessLevel: "admin" }
							: m,
					)
				: [...current, { moduleCode: ModuleCode.documents, accessLevel: "admin" }];

			await ctx.db.patch(position._id, {
				moduleAccess: next,
				updatedAt: Date.now(),
			});
			positionsPatched += 1;
		}

		return {
			orgs: {
				total: allOrgs.length,
				patched: orgsPatched,
			},
			positions: {
				total: positions.length,
				patched: positionsPatched,
				alreadyAdmin: positionsAlreadyAdmin,
			},
		};
	},
});
