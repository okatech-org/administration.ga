/**
 * Recherche intelligente de contacts — Cross-org, segmentée, unifiée.
 *
 * Combine : membres de toutes les orgs + profils citoyens + admins plateforme
 * Filtres : pays, continent, type d'org, grade, texte libre
 * Segments : "team" (mon org), "network" (autres orgs), "citizens" (ressortissants),
 *            "administration" (admins plateforme — scope backoffice uniquement)
 *
 * Scopes (paramètre optionnel, absence = comportement historique) :
 * - "org"            → Comportement historique : team/network/citizens limités à myOrgId
 * - "jurisdiction"   → Citoyens gérés par myOrgId OU résidant dans un pays de juridiction
 * - "all-diplomatic" → Tous les agents de toutes les orgs diplomatiques (indépendamment des filtres)
 * - "backoffice"     → Tous les comptes (citoyens + agents + admins plateforme), gardé par RBAC
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { authQuery } from "../lib/customFunctions";
import { getMembership, isBackOfficeUser } from "../lib/auth";
import { error, ErrorCode } from "../lib/errors";
import { UserRole } from "../lib/constants";
import { canViewCitizenContacts } from "../lib/permissions";

// Types d'organisations considérés comme « diplomatiques » pour le scope all-diplomatic
const DIPLOMATIC_ORG_TYPES = new Set<string>([
	"embassy",
	"general_consulate",
	"high_commission",
	"permanent_mission",
	"high_representation",
]);

// Rôles plateforme exposés comme contacts « administration »
const PLATFORM_ADMIN_ROLES = new Set<string>([
	UserRole.SuperAdmin,
	UserRole.AdminSystem,
	UserRole.Admin,
	UserRole.SousAdmin,
]);

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
	source: "team" | "network" | "citizen" | "administration";
}

type ContactScope = "org" | "jurisdiction" | "all-diplomatic" | "backoffice";

// ────────────────────────────────────────────────────────────────────────────
// Helpers internes
// ────────────────────────────────────────────────────────────────────────────

/**
 * Charge les orgs actives (non soft-deleted) via l'index dédié.
 */
async function loadActiveOrgs(ctx: QueryCtx): Promise<Doc<"orgs">[]> {
	return await ctx.db
		.query("orgs")
		.withIndex("by_active_notDeleted", (q) =>
			q.eq("isActive", true).eq("deletedAt", undefined),
		)
		.collect();
}

/**
 * Charge en parallèle les membres actifs des orgs spécifiées.
 * Optimisation : une Promise.all par org pour éviter N+1 séquentiel.
 */
async function loadOrgMembers(
	ctx: QueryCtx,
	orgIds: Id<"orgs">[],
	opts: { positionGrade?: string },
): Promise<Array<{
	membership: Doc<"memberships">;
	position: Doc<"positions"> | null;
	user: Doc<"users">;
}>> {
	const tasks = orgIds.map(async (orgId) => {
		const [memberships, positions] = await Promise.all([
			ctx.db
				.query("memberships")
				.withIndex("by_org_deletedAt", (q) =>
					q.eq("orgId", orgId).eq("deletedAt", undefined),
				)
				.collect(),
			ctx.db
				.query("positions")
				.withIndex("by_org", (q: any) =>
					q.eq("orgId", orgId).eq("isActive", true),
				)
				.collect(),
		]);

		const posById = new Map(positions.map((p) => [p._id as string, p]));
		const filteredMemberships = opts.positionGrade
			? memberships.filter((m) => {
					const pos = m.positionId ? posById.get(m.positionId as string) : undefined;
					return pos && (pos as any).grade === opts.positionGrade;
				})
			: memberships;

		const users = await Promise.all(
			filteredMemberships.map((m) => ctx.db.get(m.userId)),
		);

		return filteredMemberships
			.map((m, i) => ({
				membership: m,
				position: m.positionId
					? (posById.get(m.positionId as string) ?? null)
					: null,
				user: users[i],
			}))
			.filter(
				(x): x is {
					membership: Doc<"memberships">;
					position: Doc<"positions"> | null;
					user: Doc<"users">;
				} => !!x.user && x.user.isActive === true && !x.user.deletedAt,
			);
	});

	return (await Promise.all(tasks)).flat();
}

/**
 * Charge les profils citoyens selon le scope.
 */
async function loadCitizens(
	ctx: QueryCtx,
	scope: Exclude<ContactScope, "all-diplomatic">,
	opts: {
		myOrgId?: Id<"orgs">;
		jurisdictionCountries?: string[];
		limit: number;
	},
): Promise<Doc<"profiles">[]> {
	if (scope === "backoffice") {
		// Tous les profils actifs, pas de filtre org
		return await ctx.db.query("profiles").take(opts.limit);
	}

	if (scope === "org") {
		// Comportement historique : managedByOrgId === myOrgId
		if (!opts.myOrgId) return [];
		return await ctx.db
			.query("profiles")
			.filter((q: any) => q.eq(q.field("managedByOrgId"), opts.myOrgId))
			.take(opts.limit);
	}

	// scope === "jurisdiction" : managedBy OU résidence ∈ jurisdictionCountries
	if (!opts.myOrgId) return [];
	const juridictions = new Set(opts.jurisdictionCountries ?? []);
	const overfetchLimit = Math.min(opts.limit * 3, 500);
	const candidates = await ctx.db.query("profiles").take(overfetchLimit);

	return candidates
		.filter((p) => {
			if (p.managedByOrgId === opts.myOrgId) return true;
			const residenceCountry =
				p.countryOfResidence ?? (p.addresses as any)?.residence?.country;
			return !!residenceCountry && juridictions.has(residenceCountry);
		})
		.slice(0, opts.limit);
}

/**
 * Charge les admins plateforme (SuperAdmin, AdminSystem, Admin, SousAdmin).
 * Utilisé uniquement pour le scope "backoffice".
 */
async function loadPlatformAdmins(
	ctx: QueryCtx,
	limit: number,
): Promise<Doc<"users">[]> {
	// L'index by_deletedAt sur users pointe sur deletedAt seul ; on charge les undef (pas de soft-delete)
	const allActive = await ctx.db
		.query("users")
		.withIndex("by_deletedAt", (q) => q.eq("deletedAt", undefined))
		.take(limit * 5);

	return allActive
		.filter(
			(u) =>
				u.isActive === true &&
				(u.isSuperadmin === true ||
					(u.role != null && PLATFORM_ADMIN_ROLES.has(u.role))),
		)
		.slice(0, limit);
}

// ────────────────────────────────────────────────────────────────────────────
// Query principale
// ────────────────────────────────────────────────────────────────────────────

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
		source: v.optional(
			v.union(
				v.literal("team"),
				v.literal("network"),
				v.literal("citizens"),
				v.literal("administration"),
			),
		),
		scope: v.optional(
			v.union(
				v.literal("org"),
				v.literal("jurisdiction"),
				v.literal("all-diplomatic"),
				v.literal("backoffice"),
			),
		),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const scope: ContactScope = args.scope ?? "org";
		const limit = args.limit ?? 100;

		// ── Garde RBAC ──
		// Seuls les utilisateurs back-office peuvent invoquer le scope "backoffice".
		// La source "administration" est silencieusement ignorée hors scope backoffice.
		if (scope === "backoffice" && !isBackOfficeUser(ctx.user)) {
			throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
		}

		const isTeamOnly = args.source === "team";
		const isNetworkOnly = args.source === "network";
		const isCitizensOnly = args.source === "citizens";
		const isAdministrationOnly = args.source === "administration";

		// ── 1. Charger les orgs actives ──
		const allOrgs = await loadActiveOrgs(ctx);
		const orgMap = new Map<string, Doc<"orgs">>(
			allOrgs.map((o) => [o._id as string, o]),
		);

		// ── 2. Déterminer le périmètre d'orgs selon le scope ──
		let orgScope: Doc<"orgs">[];
		if (scope === "all-diplomatic") {
			// Tous les agents de toutes les orgs diplomatiques, indépendamment des filtres pays/type
			orgScope = allOrgs.filter((o) => DIPLOMATIC_ORG_TYPES.has(o.type));
		} else if (scope === "backoffice") {
			// Toutes orgs actives, filtres pays/type appliqués en option
			orgScope = allOrgs;
			if (args.country) orgScope = orgScope.filter((o) => o.country === args.country);
			if (args.orgType) orgScope = orgScope.filter((o) => o.type === args.orgType);
		} else {
			// scope "org" ou "jurisdiction" — filtres classiques
			orgScope = allOrgs;
			if (args.country) orgScope = orgScope.filter((o) => o.country === args.country);
			if (args.orgType) orgScope = orgScope.filter((o) => o.type === args.orgType);
		}

		const results: ContactResult[] = [];

		// ── 3. Membres des orgs (team + network) ──
		const shouldLoadMembers =
			!isCitizensOnly && !isAdministrationOnly && orgScope.length > 0;
		if (shouldLoadMembers) {
			const orgScopeIds = orgScope.map((o) => o._id as Id<"orgs">);
			const members = await loadOrgMembers(ctx, orgScopeIds, {
				positionGrade: args.positionGrade,
			});

			for (const { membership, position, user } of members) {
				const org = orgMap.get(membership.orgId as string);
				if (!org) continue;

				const isMyOrg = args.myOrgId && org._id === args.myOrgId;

				// Appliquer les filtres de source
				if (isTeamOnly && !isMyOrg) continue;
				if (isNetworkOnly && isMyOrg) continue;

				// Respect de l'opt-out "réseau public" pour les sources network / all-diplomatic
				// (les collègues directs en "team" restent toujours visibles)
				const isPublicNetwork =
					scope === "all-diplomatic" || (args.source === "network" && !isMyOrg);
				if (isPublicNetwork && membership.isPublicContact === false) continue;

				const nameLower = user.name ?? user.email ?? "";
				const lastName = (
					user.lastName ?? nameLower.split(" ").pop() ?? ""
				).toUpperCase();
				const firstName =
					user.firstName ?? nameLower.split(" ").slice(0, -1).join(" ") ?? "";

				results.push({
					id: `${isMyOrg ? "team" : "net"}-${user._id}`,
					userId: user._id as string,
					lastName,
					firstName,
					name: nameLower,
					email: user.email,
					phone: user.phone,
					avatar: user.avatarUrl ?? undefined,
					position: (position as any)?.title?.fr ?? (position as any)?.code,
					positionGrade: (position as any)?.grade,
					orgId: org._id as string,
					orgName: org.name,
					orgCountry: org.country,
					orgType: org.type,
					source: isMyOrg ? "team" : "network",
				});

				if (results.length >= limit * 2) break; // over-fetch pour le search filter ultérieur
			}
		}

		// ── 4. Profils citoyens (ressortissants) ──
		// Scope "all-diplomatic" = uniquement le corps diplomatique → pas de citoyens.
		const shouldLoadCitizens =
			!isTeamOnly &&
			!isNetworkOnly &&
			!isAdministrationOnly &&
			scope !== "all-diplomatic";

		if (shouldLoadCitizens) {
			const myOrg = args.myOrgId ? orgMap.get(args.myOrgId as string) : undefined;
			// À ce stade, `shouldLoadCitizens` garantit scope !== "all-diplomatic"
			const citizenScope = scope as Exclude<ContactScope, "all-diplomatic">;

			// ── Gate RBAC : accès aux contacts citoyens ──
			// Le scope "backoffice" bypasse (déjà gardé par isBackOfficeUser plus haut).
			// Sinon, vérifier que l'org gère les affaires consulaires (ou a opté
			// pour citizen_profiles) ET que la position/membership a la task
			// citizen_profiles.view. Si pas autorisé, on n'inclut simplement pas
			// la section citoyens — pas d'erreur (les autres sources restent).
			let canSeeCitizens = true;
			if (citizenScope !== "backoffice") {
				if (!args.myOrgId || !myOrg) {
					canSeeCitizens = false;
				} else {
					const myMembership = await getMembership(
						ctx,
						ctx.user._id,
						args.myOrgId,
					);
					canSeeCitizens = await canViewCitizenContacts(
						ctx,
						ctx.user,
						myMembership,
						myOrg,
					);
				}
			}

			const jurisdictionCountries = canSeeCitizens
				? myOrg?.jurisdictionCountries ??
					((myOrg?.jurisdiction as any)?.primaryCountries as
						| string[]
						| undefined)
				: undefined;

			const profiles = canSeeCitizens
				? await loadCitizens(ctx, citizenScope, {
						myOrgId: args.myOrgId,
						jurisdictionCountries,
						limit: Math.min(limit, 200),
					})
				: [];

			const profileUsers = await Promise.all(
				profiles.map((p) => ctx.db.get(p.userId)),
			);

			for (let i = 0; i < profiles.length; i++) {
				const p = profiles[i];
				const user = profileUsers[i];
				if (!user || user.isActive === false || user.deletedAt) continue;

				const residenceCountry =
					p.countryOfResidence ?? (p.addresses as any)?.residence?.country;

				const nameLower = user.name ?? user.email ?? "";
				const lastName = (
					user.lastName ??
					(p.identity as any)?.lastName ??
					nameLower.split(" ").pop() ??
					""
				).toUpperCase();
				const firstName =
					user.firstName ??
					(p.identity as any)?.firstName ??
					nameLower.split(" ").slice(0, -1).join(" ") ??
					"";

				// Pour backoffice, rattacher le citoyen à son org gestionnaire (si connue) sinon bucket "Ressortissants"
				const managedOrg = p.managedByOrgId
					? orgMap.get(p.managedByOrgId as string)
					: undefined;

				results.push({
					id: `citizen-${p._id}`,
					userId: p.userId as string,
					lastName,
					firstName,
					name: nameLower,
					email: user.email ?? (p.contacts as any)?.email,
					phone: user.phone ?? (p.contacts as any)?.phone,
					avatar: user.avatarUrl ?? undefined,
					orgId: managedOrg ? (managedOrg._id as string) : "__citizens__",
					orgName: managedOrg ? managedOrg.name : "Ressortissants",
					orgCountry: residenceCountry,
					orgType: managedOrg?.type,
					source: "citizen",
				});
			}
		}

		// ── 5. Admins plateforme (scope backoffice uniquement) ──
		const shouldLoadAdmins =
			scope === "backoffice" &&
			!isTeamOnly &&
			!isNetworkOnly &&
			!isCitizensOnly;

		if (shouldLoadAdmins) {
			const admins = await loadPlatformAdmins(ctx, Math.min(limit, 100));
			for (const u of admins) {
				const nameLower = u.name ?? u.email ?? "";
				const lastName = (
					u.lastName ?? nameLower.split(" ").pop() ?? ""
				).toUpperCase();
				const firstName =
					u.firstName ?? nameLower.split(" ").slice(0, -1).join(" ") ?? "";

				results.push({
					id: `admin-${u._id}`,
					userId: u._id as string,
					lastName,
					firstName,
					name: nameLower,
					email: u.email,
					phone: u.phone,
					avatar: u.avatarUrl ?? undefined,
					positionGrade: u.role,
					orgId: "__admins__",
					orgName: "Administration plateforme",
					source: "administration",
				});
			}
		}

		// ── 6. Filtrer par texte libre ──
		let filtered = results;
		if (args.searchTerm) {
			const q = args.searchTerm.toLowerCase();
			filtered = results.filter(
				(c) =>
					c.name.toLowerCase().includes(q) ||
					c.lastName.toLowerCase().includes(q) ||
					c.firstName.toLowerCase().includes(q) ||
					c.email?.toLowerCase().includes(q) ||
					c.phone?.toLowerCase().includes(q) ||
					c.position?.toLowerCase().includes(q) ||
					c.orgName.toLowerCase().includes(q),
			);
		}

		// ── 7. Dédupliquer par userId (priorité "administration" en scope backoffice) ──
		const sourceRank: Record<ContactResult["source"], number> = {
			administration: 0,
			team: 1,
			network: 2,
			citizen: 3,
		};

		const byUserId = new Map<string, ContactResult>();
		for (const c of filtered) {
			const existing = byUserId.get(c.userId);
			if (!existing) {
				byUserId.set(c.userId, c);
				continue;
			}
			// Conserver le contact avec la meilleure priorité de source
			const preferAdminBucket = scope === "backoffice";
			const currentRank = sourceRank[c.source];
			const existingRank = sourceRank[existing.source];
			if (preferAdminBucket && currentRank < existingRank) {
				byUserId.set(c.userId, c);
			} else if (!preferAdminBucket) {
				// Hors backoffice : team > network > citizen (inverser administration qui n'existe pas ici)
				const rank = (s: ContactResult["source"]) =>
					s === "team" ? 0 : s === "network" ? 1 : s === "citizen" ? 2 : 3;
				if (rank(c.source) < rank(existing.source)) {
					byUserId.set(c.userId, c);
				}
			}
		}

		const deduplicated = Array.from(byUserId.values()).slice(0, limit);

		// ── 8. Grouper par org pour l'affichage ──
		const grouped: Record<
			string,
			{
				org: {
					id: string;
					name: string;
					country?: string;
					type?: string;
				};
				contacts: ContactResult[];
			}
		> = {};

		for (const contact of deduplicated) {
			let key: string;
			if (contact.source === "citizen" && contact.orgId === "__citizens__") {
				key = "__citizens__";
			} else if (contact.source === "administration") {
				key = "__admins__";
			} else {
				key = contact.orgId;
			}

			if (!grouped[key]) {
				if (key === "__citizens__") {
					grouped[key] = {
						org: { id: "__citizens__", name: "Ressortissants" },
						contacts: [],
					};
				} else if (key === "__admins__") {
					grouped[key] = {
						org: { id: "__admins__", name: "Administration plateforme" },
						contacts: [],
					};
				} else {
					grouped[key] = {
						org: {
							id: contact.orgId,
							name: contact.orgName,
							country: contact.orgCountry,
							type: contact.orgType,
						},
						contacts: [],
					};
				}
			}
			grouped[key].contacts.push(contact);
		}

		return {
			total: deduplicated.length,
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
			.withIndex("by_active_notDeleted", (q) =>
				q.eq("isActive", true).eq("deletedAt", undefined),
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
