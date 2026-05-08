import { internalMutation } from "../_generated/server";

/**
 * Clear ALL data from ALL tables.
 *   DEV ONLY — run via: npx convex run seeds/clearAll:clearAll
 */
export const clearAll = internalMutation({
	args: {},
	handler: async (ctx) => {
		const tables = [
			"users",
			"orgs",
			"memberships",
			"services",
			"orgServices",
			"profiles",
			"requests",
			"events",
			"documents",
			"posts",
			"conversations",
			"formTemplates",
			"appointments",
			"agentSchedules",
			"messages",
			"documentTemplates",
			"documentVerifications",
			"agentNotes",
			"consularRegistrations",
			"consularNotifications",
			"cv",
			"childProfiles",
			"auditLog",
			"notifications",
			"tutorials",
			"communityEvents",
			"digitalMail",
			"deliveryPackages",
			"associations",
			"associationMembers",
			"associationClaims",
			"companies",
			"companyMembers",
			"positions",
			"ministryGroups",
			"securityPolicies",
			"maintenanceConfig",
			"tickets",
		] as const;

		const results: Record<string, number> = {};

		for (const table of tables) {
			try {
				const docs = await ctx.db.query(table as any).collect();
				for (const doc of docs) {
					await ctx.db.delete(doc._id);
				}
				results[table] = docs.length;
			} catch {
				results[table] = -1; // table doesn't exist or error
			}
		}

		return results;
	},
});
