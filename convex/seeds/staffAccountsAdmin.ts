/**
 * Seed des memberships admin.ga (administration nationale gabonaise).
 *
 * Mappe les comptes dev admin.ga (ministre.justice@admin.ga, dg.dgdi@admin.ga,
 * agent.dgdi@admin.ga, etc.) sur leurs institutions cibles (min-justice, dgdi,
 * dgi, min-sante, min-numerique).
 *
 * Les users doivent déjà exister via `seedDevAuthUsers`. Les orgs doivent déjà
 * exister via `seedMinistries` + `seedDirectionsGenerales`.
 *
 * Le positionCode est facultatif : si la position n'existe pas pour l'org,
 * la membership est créée sans positionId (le DEV button n'en a pas besoin).
 *
 * Usage :
 *   npx convex run seeds/staffAccountsAdmin:seedStaffAccountsAdmin
 */
import { mutation } from "../_generated/server";

interface AdminStaffEntry {
	email: string;
	firstName: string;
	lastName: string;
	positionCode?: string;
}

const STAFF_BY_ADMIN_ORG: Record<string, AdminStaffEntry[]> = {
	// ─── Ministère de la Justice ───────────────────────────────
	"min-justice": [
		{
			email: "ministre.justice@admin.ga",
			firstName: "Augustin",
			lastName: "EMANE",
			positionCode: "minister",
		},
	],

	// ─── Ministère de la Santé ─────────────────────────────────
	"min-sante": [
		{
			email: "ministre.sante@admin.ga",
			firstName: "Elsa",
			lastName: "AYO épouse BIVIGOU",
			positionCode: "minister",
		},
	],

	// ─── Ministère de l'Économie Numérique ─────────────────────
	"min-numerique": [
		{
			email: "ministre.numerique@admin.ga",
			firstName: "Mark-Alexandre",
			lastName: "DOUMBA",
			positionCode: "minister",
		},
	],

	// ─── DGDI (DG de la Documentation et de l'Immigration) ─────
	dgdi: [
		{
			email: "dg.dgdi@admin.ga",
			firstName: "Directeur Général",
			lastName: "DGDI",
			positionCode: "director_general",
		},
		{
			email: "agent.dgdi@admin.ga",
			firstName: "Agent",
			lastName: "Guichet DGDI",
			positionCode: "agent",
		},
	],

	// ─── DGI (DG des Impôts) ───────────────────────────────────
	dgi: [
		{
			email: "dg.dgi@admin.ga",
			firstName: "Directeur Général",
			lastName: "DGI",
			positionCode: "director_general",
		},
		{
			email: "agent.dgi@admin.ga",
			firstName: "Agent",
			lastName: "Traitement DGI",
			positionCode: "agent",
		},
	],
};

/**
 * Pour chaque org admin.ga → liste de comptes :
 *   1. Résout l'org via slug
 *   2. Trouve l'user par email (créé via seedDevAuthUsers)
 *   3. Crée/met à jour la membership (positionId optionnel)
 */
export const seedStaffAccountsAdmin = mutation({
	args: {},
	handler: async (ctx) => {
		const results = {
			orgsProcessed: 0,
			orgsNotFound: 0,
			usersFound: 0,
			usersNotFound: 0,
			membershipsCreated: 0,
			membershipsUpdated: 0,
			positionsAssigned: 0,
			errors: [] as string[],
		};

		const now = Date.now();

		for (const [slug, accounts] of Object.entries(STAFF_BY_ADMIN_ORG)) {
			const org = await ctx.db
				.query("orgs")
				.withIndex("by_slug", (q) => q.eq("slug", slug))
				.first();

			if (!org) {
				results.orgsNotFound++;
				results.errors.push(`Org introuvable : ${slug}`);
				continue;
			}

			const positions = await ctx.db
				.query("positions")
				.withIndex("by_org", (q) =>
					q.eq("orgId", org._id).eq("isActive", true),
				)
				.collect();

			const positionByCode = new Map(positions.map((p) => [p.code, p]));

			for (const account of accounts) {
				try {
					const user = await ctx.db
						.query("users")
						.withIndex("by_email", (q) => q.eq("email", account.email))
						.unique();

					if (!user) {
						results.usersNotFound++;
						results.errors.push(
							`User introuvable : ${account.email} — lancer seedDevAuthUsers d'abord`,
						);
						continue;
					}

					results.usersFound++;

					// Mettre à jour le nom si nécessaire
					if (!user.firstName || !user.lastName) {
						await ctx.db.patch(user._id, {
							firstName: account.firstName,
							lastName: account.lastName,
							name: `${account.firstName} ${account.lastName}`,
							updatedAt: now,
						});
					}

					// Position optionnelle (peut être absente si seedOrgRoles non exécuté)
					const position = account.positionCode
						? positionByCode.get(account.positionCode)
						: undefined;
					const positionId = position?._id;
					if (positionId) results.positionsAssigned++;

					// Upsert membership
					const existingMemberships = await ctx.db
						.query("memberships")
						.withIndex("by_user_org", (q) =>
							q.eq("userId", user._id).eq("orgId", org._id),
						)
						.collect();

					const existing = existingMemberships.find((m) => !m.deletedAt);

					if (existing) {
						await ctx.db.patch(existing._id, { positionId });
						results.membershipsUpdated++;
					} else {
						await ctx.db.insert("memberships", {
							userId: user._id,
							orgId: org._id,
							positionId,
						});
						results.membershipsCreated++;
					}
				} catch (err: unknown) {
					const msg = err instanceof Error ? err.message : String(err);
					results.errors.push(`${account.email}: ${msg}`);
				}
			}

			results.orgsProcessed++;
		}

		return results;
	},
});
