/**
 * Query : retourne la liste réelle des comptes de la base, groupés par surface,
 * pour synchroniser les `NEXT_PUBLIC_DEV_ACCOUNTS` des `.env.local` des apps.
 *
 * Une seule source de vérité = la DB. Plus de liste statique divergente.
 *
 * Usage :
 *   bunx convex run seeds/listDevAccounts:listDevAccounts > /tmp/dev-accounts.json
 */

import { internalQuery } from "../_generated/server";

interface DevAccount {
	label: string;
	email: string;
	group: string;
	role?: string;
}

interface Output {
	citizen: DevAccount[];
	agent: DevAccount[];
	backoffice: DevAccount[];
}

export const listDevAccounts = internalQuery({
	args: {},
	handler: async (ctx): Promise<Output> => {
		const users = await ctx.db.query("users").collect();

		const out: Output = { citizen: [], agent: [], backoffice: [] };

		for (const user of users) {
			if (!user.email || !user.isActive) continue;

			const label = user.name || `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
			const isSuper = user.isSuperadmin === true || user.role === "super_admin";

			// 1. Profil citoyen → citizen-web
			const profile = await ctx.db
				.query("profiles")
				.withIndex("by_user", (q) => q.eq("userId", user._id))
				.unique();

			if (profile) {
				const country = profile.countryOfResidence;
				const userType = profile.userType;
				let group = "Citoyens gabonais";
				if (userType === "long_stay") {
					if (country === "FR") group = "Citoyens gabonais (France)";
					else if (country === "ES") group = "Citoyens gabonais (Espagne)";
					else if (country === "CA") group = "Citoyens gabonais (Canada)";
				} else if (
					userType === "visa_tourism" ||
					userType === "visa_business" ||
					userType === "visa_long_stay" ||
					userType === "admin_services"
				) {
					group = "Ressortissants étrangers";
				}
				out.citizen.push({
					label,
					email: user.email,
					group,
					role: userType,
				});
			}

			// 2. Memberships → agent-web (groupés par org)
			const memberships = await ctx.db
				.query("memberships")
				.withIndex("by_user_org", (q) => q.eq("userId", user._id))
				.collect();

			for (const m of memberships) {
				if (m.deletedAt) continue;
				const org = await ctx.db.get(m.orgId);
				if (!org) continue;

				// Récupérer le code de position pour le rôle
				let positionLabel = "";
				if (m.positionId) {
					const position = await ctx.db.get(m.positionId);
					if (position) {
						positionLabel = (position as any).code ?? (position as any).label ?? "";
					}
				}

				const group = org.name ?? "Organisation";
				const displayLabel = positionLabel
					? `${label} (${positionLabel.replace(/_/g, " ")})`
					: label;
				out.agent.push({
					label: displayLabel,
					email: user.email,
					group,
					role: positionLabel || "agent",
				});
			}

			// 3. Superadmin / admin → backoffice-web
			if (isSuper) {
				out.backoffice.push({
					label,
					email: user.email,
					group: "Superadmin",
					role: "super_admin",
				});
			} else if (
				user.role === "admin" ||
				user.role === "admin_system" ||
				user.role === "sous_admin"
			) {
				out.backoffice.push({
					label,
					email: user.email,
					group: "Admin Back-office",
					role: user.role,
				});
			}

			// Comptes admin "dev" sans role officiel → quand même utiles côté backoffice
			if (
				!isSuper &&
				!user.role &&
				(user.email.includes("admin@") || user.email.includes("admin+"))
			) {
				out.backoffice.push({
					label,
					email: user.email,
					group: "Admin Back-office",
					role: "admin",
				});
			}
		}

		// Trier par group puis label
		const sortFn = (a: DevAccount, b: DevAccount) =>
			a.group.localeCompare(b.group, "fr") || a.label.localeCompare(b.label, "fr");
		out.citizen.sort(sortFn);
		out.agent.sort(sortFn);
		out.backoffice.sort(sortFn);

		return out;
	},
});
