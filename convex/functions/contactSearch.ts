/**
 * Recherche intelligente de contacts — Cross-org, segmentée, unifiée.
 *
 * Combine : membres de toutes les orgs + profils citoyens
 * Filtres : pays, continent, type d'org, grade, texte libre
 * Segments : "team" (mon org), "network" (autres orgs), "citizens" (ressortissants)
 */

import { v } from "convex/values";
import { authQuery } from "../lib/customFunctions";

export interface ContactResult {
	id: string;
	userId: string;
	lastName: string;
	firstName: string;
	name: string;
	email?: string;
	phone?: string;
	avatar?: string;
	position?: string;
	positionGrade?: string;
	orgId: string;
	orgName: string;
	orgCountry?: string;
	orgType?: string;
	source: "team" | "network" | "citizen";
}

/**
 * Recherche unifiée de contacts cross-org.
 *
 * Retourne les résultats groupés par organisation.
 */
export const searchContacts = authQuery({
	args: {
		searchTerm: v.optional(v.string()),
		myOrgId: v.optional(v.id("orgs")),
		country: v.optional(v.string()),
		orgType: v.optional(v.string()),
		positionGrade: v.optional(v.string()),
		source: v.optional(v.union(
			v.literal("team"),
			v.literal("network"),
			v.literal("citizens"),
		)),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit ?? 100;
		const results: ContactResult[] = [];

		// ── 1. Charger les orgs actives ──
		const allOrgs = await ctx.db
			.query("orgs")
			.filter((q) =>
				q.and(
					q.eq(q.field("isActive"), true),
					q.eq(q.field("deletedAt"), undefined),
				),
			)
			.collect();

		// Filtrer par pays
		let filteredOrgs = allOrgs;
		if (args.country) {
			filteredOrgs = filteredOrgs.filter((o) => o.country === args.country);
		}
		if (args.orgType) {
			filteredOrgs = filteredOrgs.filter((o) => o.type === args.orgType);
		}

		// Map orgId → org
		const orgMap = new Map(filteredOrgs.map((o) => [o._id as string, o]));

		// ── 2. Déterminer quelles orgs chercher ──
		const isTeamOnly = args.source === "team";
		const isNetworkOnly = args.source === "network";
		const isCitizensOnly = args.source === "citizens";

		// ── 3. Membres des orgs (team + network) ──
		if (!isCitizensOnly) {
			for (const org of filteredOrgs) {
				const isMyOrg = args.myOrgId && org._id === args.myOrgId;

				// Si team only, ne chercher que dans mon org
				if (isTeamOnly && !isMyOrg) continue;
				// Si network only, exclure mon org
				if (isNetworkOnly && isMyOrg) continue;

				// Charger les positions de l'org
				const positions = await ctx.db
					.query("positions")
					.withIndex("by_org", (q: any) => q.eq("orgId", org._id).eq("isActive", true))
					.collect();

				// Filtrer par grade si demandé
				const filteredPositions = args.positionGrade
					? positions.filter((p: any) => p.grade === args.positionGrade)
					: positions;

				// Charger les memberships pour ces positions
				for (const pos of filteredPositions) {
					const memberships = await ctx.db
						.query("memberships")
						.filter((q: any) =>
							q.and(
								q.eq(q.field("orgId"), org._id),
								q.eq(q.field("positionId"), pos._id),
								q.eq(q.field("deletedAt"), undefined),
							),
						)
						.collect();

					for (const m of memberships) {
						const user = await ctx.db.get(m.userId);
						if (!user || !user.isActive) continue;

						const contact: ContactResult = {
							id: `${isMyOrg ? "team" : "net"}-${user._id}`,
							userId: user._id as string,
							lastName: (user.lastName ?? user.name?.split(" ").pop() ?? "").toUpperCase(),
							firstName: user.firstName ?? user.name?.split(" ").slice(0, -1).join(" ") ?? "",
							name: user.name ?? user.email ?? "",
							email: user.email,
							avatar: user.avatarUrl ?? undefined,
							position: (pos as any).title?.fr ?? (pos as any).code,
							positionGrade: (pos as any).grade,
							orgId: org._id as string,
							orgName: org.name,
							orgCountry: org.country,
							orgType: org.type,
							source: isMyOrg ? "team" : "network",
						};

						results.push(contact);
					}
				}

				if (results.length >= limit) break;
			}
		}

		// ── 4. Profils citoyens (ressortissants) ──
		// Note: les profils ont une structure complexe (family.firstName, etc.)
		// On les charge via la table users liés aux profils pour l'instant
		if (!isTeamOnly && !isNetworkOnly && args.myOrgId) {
			try {
				const profiles = await ctx.db
					.query("profiles")
					.filter((q: any) =>
						q.eq(q.field("managedByOrgId"), args.myOrgId),
					)
					.take(Math.min(limit - results.length, 50));

				for (const p of profiles) {
					const user = await ctx.db.get(p.userId);
					if (!user) continue;

					const contact: ContactResult = {
						id: `citizen-${p._id}`,
						userId: p.userId as string,
						lastName: (user.lastName ?? user.name?.split(" ").pop() ?? "").toUpperCase(),
						firstName: user.firstName ?? user.name?.split(" ").slice(0, -1).join(" ") ?? "",
						name: user.name ?? user.email ?? "",
						email: user.email,
						phone: user.phone,
						orgId: args.myOrgId as string,
						orgName: "Ressortissants",
						orgCountry: (p as any).countryOfResidence,
						source: "citizen",
					};
					results.push(contact);
				}
			} catch {
				// Ignorer si la query échoue (pas d'index)
			}
		}

		// ── 5. Filtrer par texte libre ──
		let filtered = results;
		if (args.searchTerm) {
			const q = args.searchTerm.toLowerCase();
			filtered = results.filter((c) =>
				c.name.toLowerCase().includes(q) ||
				c.lastName.toLowerCase().includes(q) ||
				c.firstName.toLowerCase().includes(q) ||
				c.email?.toLowerCase().includes(q) ||
				c.position?.toLowerCase().includes(q) ||
				c.orgName.toLowerCase().includes(q),
			);
		}

		// ── 6. Dédoublonner par nom ──
		const unique = filtered.filter(
			(c, i, arr) => arr.findIndex((x) => x.name === c.name) === i,
		);

		// ── 7. Grouper par org pour l'affichage ──
		const grouped: Record<string, { org: { id: string; name: string; country?: string; type?: string }; contacts: ContactResult[] }> = {};

		for (const contact of unique.slice(0, limit)) {
			const key = contact.source === "citizen" ? "__citizens__" : contact.orgId;
			if (!grouped[key]) {
				grouped[key] = {
					org: contact.source === "citizen"
						? { id: "__citizens__", name: "Ressortissants", country: undefined, type: undefined }
						: { id: contact.orgId, name: contact.orgName, country: contact.orgCountry, type: contact.orgType },
					contacts: [],
				};
			}
			grouped[key].contacts.push(contact);
		}

		return {
			total: unique.length,
			groups: Object.values(grouped),
		};
	},
});

/**
 * Liste les pays disponibles (orgs actives) pour le filtre.
 */
export const getAvailableCountries = authQuery({
	args: {},
	handler: async (ctx) => {
		const orgs = await ctx.db
			.query("orgs")
			.filter((q) =>
				q.and(
					q.eq(q.field("isActive"), true),
					q.eq(q.field("deletedAt"), undefined),
				),
			)
			.collect();

		const countries = new Map<string, number>();
		for (const org of orgs) {
			if (org.country) {
				countries.set(org.country, (countries.get(org.country) ?? 0) + 1);
			}
		}

		return Array.from(countries.entries())
			.map(([code, count]) => ({ code, count }))
			.sort((a, b) => b.count - a.count);
	},
});
