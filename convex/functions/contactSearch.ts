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
import { UserRole, PublicUserType } from "../lib/constants";
import { canViewCitizenContacts } from "../lib/permissions";
import { membershipsByOrg } from "../lib/aggregates";

// Types de profils consulaires gabonais (ressortissants) vs étrangers.
// La distinction métier s'appuie sur `userType` (cf. PublicUserType enum).
const GABONESE_PROFILE_TYPES = new Set<string>([
	PublicUserType.LongStay,
	PublicUserType.ShortStay,
]);
const FOREIGN_PROFILE_TYPES = new Set<string>([
	PublicUserType.VisaTourism,
	PublicUserType.VisaBusiness,
	PublicUserType.VisaLongStay,
	PublicUserType.AdminServices,
]);

/**
 * Normalisation Unicode pour comparaisons de recherche tolérantes :
 * - décomposition NFD + suppression des marques diacritiques (accents)
 * - lowercase
 * - tirets/underscores remplacés par des espaces (« PELLEN-LAKOUMBA » == « pellen lakoumba »)
 * - whitespace écrasé
 * Utilisé pour aligner la recherche vocale (Whisper transcrit souvent sans
 * accents ni ponctuation) sur la frappe manuelle.
 */
function normalizeForSearch(s: string): string {
	return s
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[-_]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

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
	source: "team" | "network" | "citizen" | "foreigner" | "administration";
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
 *
 * Utilise les indexes dédiés (`by_managed_org`, `by_country_of_residence`)
 * pour éviter les scans complets de table et remonter tous les ressortissants
 * d'une juridiction (pas seulement les premiers 500 de l'ordre naturel DB).
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
		// Si l'utilisateur a restreint à une org précise (via OrgSelector),
		// on remonte UNIQUEMENT les citoyens managés par cette org OU résidant
		// dans un pays de sa juridiction — comme le fait scope="jurisdiction",
		// mais sans la garde RBAC supplémentaire (déjà passée plus haut).
		if (opts.myOrgId) {
			return await loadCitizensByOrgAndJurisdiction(ctx, {
				myOrgId: opts.myOrgId,
				jurisdictionCountries: opts.jurisdictionCountries ?? [],
				limit: opts.limit,
			});
		}
		// Vue globale backoffice (aucune org sélectionnée) : tous les profils
		// jusqu'au plafond. Moins efficace mais acceptable sur un écran admin.
		return await ctx.db.query("profiles").take(Math.min(opts.limit * 2, 10000));
	}

	if (scope === "org") {
		// Comportement historique : managedByOrgId === myOrgId via index dédié.
		if (!opts.myOrgId) return [];
		return await ctx.db
			.query("profiles")
			.withIndex("by_managed_org", (q) => q.eq("managedByOrgId", opts.myOrgId))
			.take(opts.limit);
	}

	// scope === "jurisdiction" : managedBy OU résidence ∈ jurisdictionCountries
	// Deux requêtes indexées en parallèle (une par index) puis fusion sans doublon.
	if (!opts.myOrgId) return [];
	return await loadCitizensByOrgAndJurisdiction(ctx, {
		myOrgId: opts.myOrgId,
		jurisdictionCountries: opts.jurisdictionCountries ?? [],
		limit: opts.limit,
	});
}

/**
 * Requêtes indexées parallèles : ressortissants gérés par `myOrgId` +
 * ressortissants résidant dans un des pays de juridiction + ressortissants
 * ayant signalé leur présence dans la juridiction (séjour temporaire).
 * Fusion sans doublon (priorité : managedBy > résidence > signalement).
 * Utilisé par scope="jurisdiction" ET scope="backoffice" (avec org active).
 *
 * Note : on ne filtre pas ici sur la fraîcheur du signalement
 * (`stayEndDate`) — `signaledToOrgId` n'est jamais nettoyé après expiration.
 * Cf. `apps/agent-web/todos/signalement-cleanup-a-expiration.md`.
 */
async function loadCitizensByOrgAndJurisdiction(
	ctx: QueryCtx,
	opts: {
		myOrgId: Id<"orgs">;
		jurisdictionCountries: string[];
		limit: number;
	},
): Promise<Doc<"profiles">[]> {
	const managedByPromise = ctx.db
		.query("profiles")
		.withIndex("by_managed_org", (q) => q.eq("managedByOrgId", opts.myOrgId))
		.take(opts.limit);

	const signaledToPromise = ctx.db
		.query("profiles")
		.withIndex("by_signaled_org", (q) => q.eq("signaledToOrgId", opts.myOrgId))
		.take(opts.limit);

	// Pour chaque pays de juridiction, on charge via l'index country_of_residence.
	// On prend `opts.limit` par pays pour laisser de la marge à la déduplication.
	const byCountryPromises = opts.jurisdictionCountries.map((country) =>
		ctx.db
			.query("profiles")
			.withIndex("by_country_of_residence", (q) =>
				q.eq("countryOfResidence", country as any),
			)
			.take(opts.limit),
	);

	const [managedBy, signaledTo, ...byCountryResults] = await Promise.all([
		managedByPromise,
		signaledToPromise,
		...byCountryPromises,
	]);

	const seen = new Set<string>();
	const merged: Doc<"profiles">[] = [];
	for (const p of managedBy) {
		if (seen.has(p._id as string)) continue;
		seen.add(p._id as string);
		merged.push(p);
	}
	for (const list of byCountryResults) {
		for (const p of list) {
			if (seen.has(p._id as string)) continue;
			seen.add(p._id as string);
			merged.push(p);
		}
	}
	for (const p of signaledTo) {
		if (seen.has(p._id as string)) continue;
		seen.add(p._id as string);
		merged.push(p);
	}

	return merged.slice(0, opts.limit);
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
				v.literal("foreigners"),
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
		// Plafond de sécurité Convex (`.collect()` / `.take()` ont un hard-cap
		// interne proche de 16 384). Par défaut on remonte TOUT le périmètre —
		// pas de pagination côté client.
		const limit = args.limit ?? 10000;

		// ── Garde RBAC ──
		// Seuls les utilisateurs back-office peuvent invoquer le scope "backoffice".
		// La source "administration" est silencieusement ignorée hors scope backoffice.
		if (scope === "backoffice" && !isBackOfficeUser(ctx.user)) {
			throw error(ErrorCode.INSUFFICIENT_PERMISSIONS);
		}

		const isTeamOnly = args.source === "team";
		const isNetworkOnly = args.source === "network";
		const isCitizensOnly = args.source === "citizens";
		const isForeignersOnly = args.source === "foreigners";
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
			!isCitizensOnly &&
			!isForeignersOnly &&
			!isAdministrationOnly &&
			orgScope.length > 0;
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

				// Safety stop si on atteint le plafond de sécurité Convex.
				if (results.length >= limit) break;
			}
		}

		// ── 4. Profils consulaires (ressortissants gabonais + étrangers) ──
		// Scope "all-diplomatic" = uniquement le corps diplomatique → pas de profils.
		// Les deux sources `citizens` et `foreigners` tirent depuis la même table
		// `profiles`, distinguées ensuite via `userType` (Gabonese vs Foreign).
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
						// Respecte le `limit` demandé par le client. Le hard cap global
						// (4000) est appliqué plus bas sur `results` pour éviter les
						// scans trop gourmands. Historiquement on capait à 200 ici,
						// ce qui masquait la majorité des ressortissants d'une
						// juridiction avec 2 000+ profils (ex. Consulat Gabon France).
						limit,
					})
				: [];

			const profileUsers = await Promise.all(
				profiles.map((p) => ctx.db.get(p.userId)),
			);

			for (let i = 0; i < profiles.length; i++) {
				const p = profiles[i];
				const user = profileUsers[i];
				if (!user || user.isActive === false || user.deletedAt) continue;

				// Classification gabonais vs étranger via `userType` (cf. enum
				// PublicUserType). Les segments « Ressortissants » et « Étrangers »
				// sont exclusifs ; quand l'utilisateur cible explicitement l'un,
				// on saute l'autre.
				const userType = (p as any).userType as string | undefined;
				const isGaboneseProfile = userType
					? GABONESE_PROFILE_TYPES.has(userType)
					: true; // legacy : profils sans userType présumés gabonais
				const isForeignProfile = userType
					? FOREIGN_PROFILE_TYPES.has(userType)
					: false;
				if (isCitizensOnly && !isGaboneseProfile) continue;
				if (isForeignersOnly && !isForeignProfile) continue;

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

				// Pour backoffice, rattacher le profil à son org gestionnaire si connue,
				// sinon bucket dédié « Ressortissants » ou « Étrangers ».
				const managedOrg = p.managedByOrgId
					? orgMap.get(p.managedByOrgId as string)
					: undefined;
				const fallbackBucketId = isForeignProfile
					? "__foreigners__"
					: "__citizens__";
				const fallbackBucketName = isForeignProfile
					? "Étrangers"
					: "Ressortissants";

				results.push({
					id: `${isForeignProfile ? "foreigner" : "citizen"}-${p._id}`,
					userId: p.userId as string,
					lastName,
					firstName,
					name: nameLower,
					email: user.email ?? (p.contacts as any)?.email,
					phone: user.phone ?? (p.contacts as any)?.phone,
					avatar: user.avatarUrl ?? undefined,
					orgId: managedOrg ? (managedOrg._id as string) : fallbackBucketId,
					orgName: managedOrg ? managedOrg.name : fallbackBucketName,
					orgCountry: residenceCountry,
					orgType: managedOrg?.type,
					source: isForeignProfile ? "foreigner" : "citizen",
				});
			}
		}

		// ── 5. Admins plateforme (scope backoffice uniquement) ──
		// En backoffice, les admins plateforme sont remontés dans le bucket
		// « Back-Office » (source "team") aux côtés des membres de l'org. Ils
		// restent listés quand le segment "team" est sélectionné, ou en vue
		// globale ("all"). Le segment "administration" reste exposé pour la
		// rétrocompatibilité (utilisateurs internes plateforme uniquement).
		const shouldLoadAdmins =
			scope === "backoffice" &&
			!isNetworkOnly &&
			!isCitizensOnly &&
			!isForeignersOnly;

		if (shouldLoadAdmins) {
			const admins = await loadPlatformAdmins(ctx, Math.min(limit, 500));
			// En backoffice, les admins sont fusionnés dans le bucket Back-Office
			// (source "team") sauf si l'utilisateur a explicitement sélectionné
			// le segment historique "administration".
			const adminSource: ContactResult["source"] = isAdministrationOnly
				? "administration"
				: "team";
			const adminOrgId = isAdministrationOnly ? "__admins__" : "__backoffice__";
			const adminOrgName = isAdministrationOnly
				? "Administration plateforme"
				: "Back-Office";
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
					orgId: adminOrgId,
					orgName: adminOrgName,
					source: adminSource,
				});
			}
		}

		// ── 6. Filtrer par texte libre ──
		// Normalisation Unicode (NFD + suppression accents) + remplacement
		// tirets/underscores : la recherche vocale Whisper restitue souvent
		// sans accents ni ponctuation, on aligne la frappe manuelle sur la
		// voix en comparant des chaînes normalisées.
		let filtered = results;
		if (args.searchTerm) {
			const q = normalizeForSearch(args.searchTerm);
			filtered = results.filter(
				(c) =>
					normalizeForSearch(c.name).includes(q) ||
					normalizeForSearch(c.lastName).includes(q) ||
					normalizeForSearch(c.firstName).includes(q) ||
					normalizeForSearch(c.email ?? "").includes(q) ||
					normalizeForSearch(c.phone ?? "").includes(q) ||
					normalizeForSearch(c.position ?? "").includes(q) ||
					normalizeForSearch(c.orgName).includes(q),
			);
		}

		// ── 7. Dédupliquer par userId (priorité "administration" en scope backoffice) ──
		const sourceRank: Record<ContactResult["source"], number> = {
			administration: 0,
			team: 1,
			network: 2,
			citizen: 3,
			foreigner: 4,
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
				// Hors backoffice : team > network > citizen > foreigner
				// (administration n'existe pas hors backoffice)
				const rank = (s: ContactResult["source"]) =>
					s === "team"
						? 0
						: s === "network"
							? 1
							: s === "citizen"
								? 2
								: s === "foreigner"
									? 3
									: 4;
				if (rank(c.source) < rank(existing.source)) {
					byUserId.set(c.userId, c);
				}
			}
		}

		const deduplicated = Array.from(byUserId.values()).slice(0, limit);

		// ── 8. Grouper par org pour l'affichage ──
		// Cas spéciaux : quand l'utilisateur filtre explicitement sur
		// "citizens" ou "foreigners", on regroupe tous les profils ciblés
		// sous un unique bucket dédié (« Ressortissants » / « Étrangers »).
		const flattenCitizens = isCitizensOnly;
		const flattenForeigners = isForeignersOnly;

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
			if (flattenCitizens && contact.source === "citizen") {
				// Tab "Ressortissants" : un seul groupe pour tous les citoyens
				key = "__citizens__";
			} else if (flattenForeigners && contact.source === "foreigner") {
				// Tab "Étrangers" : un seul groupe pour tous les profils étrangers
				key = "__foreigners__";
			} else if (
				contact.source === "citizen" &&
				contact.orgId === "__citizens__"
			) {
				key = "__citizens__";
			} else if (
				contact.source === "foreigner" &&
				contact.orgId === "__foreigners__"
			) {
				key = "__foreigners__";
			} else if (contact.source === "administration") {
				key = "__admins__";
			} else if (contact.orgId === "__backoffice__") {
				// Admins remontés dans Back-Office (scope backoffice par défaut)
				key = "__backoffice__";
			} else {
				key = contact.orgId;
			}

			if (!grouped[key]) {
				if (key === "__citizens__") {
					grouped[key] = {
						org: { id: "__citizens__", name: "Ressortissants" },
						contacts: [],
					};
				} else if (key === "__foreigners__") {
					grouped[key] = {
						org: { id: "__foreigners__", name: "Étrangers" },
						contacts: [],
					};
				} else if (key === "__admins__") {
					grouped[key] = {
						org: { id: "__admins__", name: "Administration plateforme" },
						contacts: [],
					};
				} else if (key === "__backoffice__") {
					grouped[key] = {
						org: { id: "__backoffice__", name: "Back-Office" },
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

// ────────────────────────────────────────────────────────────────────────────
// listPriorityContacts — contacts « de travail » calculés à partir des demandes
// ────────────────────────────────────────────────────────────────────────────

/** Statuts de demande considérés comme « actifs » (non-terminaux). */
const ACTIVE_REQUEST_STATUSES = new Set<string>([
	"submitted",
	"pending",
	"under_review",
	"in_production",
	"validated",
	"appointment_scheduled",
	"ready_for_pickup",
]);

/** Poids numérique par priorité pour le tri. Plus grand = plus prioritaire. */
const PRIORITY_WEIGHT: Record<string, number> = {
	critical: 300,
	urgent: 200,
	normal: 100,
};

/** Poids par statut (les demandes en fin de cycle remontent plus haut). */
const STATUS_WEIGHT: Record<string, number> = {
	ready_for_pickup: 50,
	appointment_scheduled: 45,
	validated: 40,
	in_production: 35,
	under_review: 30,
	pending: 25,
	submitted: 20,
};

/**
 * Retourne les contacts (citoyens) ayant au moins une demande ACTIVE auprès de
 * `orgId`, triés par priorité puis par récence. C'est la liste "par défaut"
 * qu'iAsted propose dans iChat : l'agent voit d'abord les personnes qui
 * requièrent une attention (demande en cours), le reste passe par la recherche.
 *
 * Priorité combinée :
 *   score = PRIORITY_WEIGHT[priority] + STATUS_WEIGHT[status] + recencyBonus
 *
 * Les demandes les plus récentes (> urgent/critical) dominent naturellement le
 * haut de liste.
 */
export const listPriorityContacts = authQuery({
	args: {
		orgId: v.id("orgs"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit ?? 50;

		// RBAC léger : n'importe quel membre actif de l'org peut consulter.
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		if (!membership) return { contacts: [] };

		// On collecte toutes les demandes de l'org, puis on filtre en mémoire sur
		// les statuts actifs. Convex ne permet pas d'index range sur un Set.
		const requests = await ctx.db
			.query("requests")
			.withIndex("by_org_status", (q) => q.eq("orgId", args.orgId))
			.collect();

		const now = Date.now();
		// Map userId → meilleur score + meta à afficher.
		const bestByUser = new Map<
			string,
			{
				userId: string;
				score: number;
				activeCount: number;
				latestRef?: string;
				highestPriority?: string;
				lastActivity: number;
				latestStatus?: string;
			}
		>();

		for (const r of requests) {
			if (!ACTIVE_REQUEST_STATUSES.has(r.status)) continue;

			const pScore = PRIORITY_WEIGHT[r.priority] ?? 100;
			const sScore = STATUS_WEIGHT[r.status] ?? 10;
			const ts = r.updatedAt ?? r.submittedAt ?? r._creationTime ?? 0;
			// Bonus de récence : -1 point / jour, plafonné à 30 jours (60 pts).
			const ageDays = Math.max(0, (now - ts) / (1000 * 60 * 60 * 24));
			const recencyBonus = Math.max(0, 60 - Math.floor(ageDays * 2));
			const score = pScore + sScore + recencyBonus;

			const userKey = r.userId as string;
			const existing = bestByUser.get(userKey);
			if (!existing) {
				bestByUser.set(userKey, {
					userId: userKey,
					score,
					activeCount: 1,
					latestRef: r.reference,
					highestPriority: r.priority,
					lastActivity: ts,
					latestStatus: r.status,
				});
			} else {
				existing.activeCount += 1;
				if (score > existing.score) {
					existing.score = score;
					existing.highestPriority = r.priority;
					existing.latestStatus = r.status;
				}
				if (ts > existing.lastActivity) {
					existing.lastActivity = ts;
					existing.latestRef = r.reference;
				}
			}
		}

		// Tri décroissant par score, puis par activité la plus récente.
		const sorted = Array.from(bestByUser.values())
			.sort((a, b) => {
				if (b.score !== a.score) return b.score - a.score;
				return b.lastActivity - a.lastActivity;
			})
			.slice(0, limit);

		// Hydratation : users + profiles en parallèle.
		const users = await Promise.all(
			sorted.map((s) => ctx.db.get(s.userId as Id<"users">)),
		);

		const org = await ctx.db.get(args.orgId);

		const contacts = sorted
			.map((entry, i) => {
				const user = users[i];
				if (!user || user.isActive === false || user.deletedAt) return null;

				const nameLower = user.name ?? user.email ?? "";
				const lastName = (
					user.lastName ?? nameLower.split(" ").pop() ?? ""
				).toUpperCase();
				const firstName =
					user.firstName ?? nameLower.split(" ").slice(0, -1).join(" ") ?? "";

				return {
					id: `priority-${user._id}`,
					userId: user._id as string,
					lastName,
					firstName,
					name: nameLower,
					email: user.email,
					phone: user.phone,
					avatar: user.avatarUrl ?? undefined,
					orgId: args.orgId as string,
					orgName: org?.name ?? "",
					orgCountry: org?.country,
					orgType: org?.type,
					source: "citizen" as const,

					// Méta priorité (propres à cet endpoint)
					activeRequestCount: entry.activeCount,
					highestPriority: entry.highestPriority,
					latestRequestRef: entry.latestRef,
					latestStatus: entry.latestStatus,
					lastActivity: entry.lastActivity,
					priorityScore: entry.score,
				};
			})
			.filter(
				(c): c is NonNullable<typeof c> => c !== null,
			);

		return { contacts };
	},
});

// ────────────────────────────────────────────────────────────────────────────
// listOrgsForContacts — vue annuaire en lazy-load
// ────────────────────────────────────────────────────────────────────────────

/**
 * Liste les organisations visibles dans l'annuaire iCom, avec leur nombre de
 * membres (compté en O(log n) via l'agrégat `membershipsByOrg`).
 *
 * Pas de chargement des membres ici : la page iCom affiche les orgs
 * collapsées par défaut, et `listOrgMembers` est appelée lorsqu'une org est
 * dépliée. Cela permet de ne pas tirer 2 000+ contacts d'un coup.
 *
 * Filtres facultatifs : pays, type d'org, recherche par nom d'org.
 */
export const listOrgsForContacts = authQuery({
	args: {
		myOrgId: v.optional(v.id("orgs")),
		country: v.optional(v.string()),
		orgType: v.optional(v.string()),
		searchTerm: v.optional(v.string()),
		scope: v.optional(
			v.union(
				v.literal("jurisdiction"),
				v.literal("all-diplomatic"),
			),
		),
		sort: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
	},
	handler: async (ctx, args) => {
		const scope = args.scope ?? "all-diplomatic";
		const sort = args.sort ?? "asc";

		const allOrgs = await loadActiveOrgs(ctx);

		let orgs: Doc<"orgs">[] = allOrgs;
		if (scope === "all-diplomatic") {
			orgs = orgs.filter((o) => DIPLOMATIC_ORG_TYPES.has(o.type));
		}
		if (args.country) orgs = orgs.filter((o) => o.country === args.country);
		if (args.orgType) orgs = orgs.filter((o) => o.type === args.orgType);
		if (args.searchTerm) {
			const q = args.searchTerm.toLowerCase();
			orgs = orgs.filter((o) => o.name.toLowerCase().includes(q));
		}

		// Compte de membres en O(log n) par org via l'agrégat.
		const counts = await Promise.all(
			orgs.map((o) =>
				membershipsByOrg.count(ctx, { namespace: o._id as string }),
			),
		);

		const items = orgs.map((o, i) => ({
			id: o._id as string,
			name: o.name,
			country: o.country,
			type: o.type,
			memberCount: counts[i] ?? 0,
			isMine: args.myOrgId ? o._id === args.myOrgId : false,
		}));

		items.sort((a, b) => {
			// Org de l'agent en premier, puis tri alphabétique
			if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
			const cmp = a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
			return sort === "asc" ? cmp : -cmp;
		});

		return { orgs: items };
	},
});

// ────────────────────────────────────────────────────────────────────────────
// listOrgMembers — membres d'une org (lazy-load au déploiement)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Liste les membres actifs d'une org spécifique, triés alphabétiquement.
 *
 * Utilisé par le composant `<ContactOrgRow>` quand l'utilisateur déplie une
 * org. Convex met automatiquement le résultat en cache et le réutilise pour
 * les ré-ouvertures suivantes (subscription temps réel).
 *
 * Pas de pagination cursor pour l'instant : une org diplomatique a typiquement
 * 5–50 agents, ce qui tient largement dans une seule réponse. On applique un
 * plafond de sécurité.
 */
export const listOrgMembers = authQuery({
	args: {
		orgId: v.id("orgs"),
		searchTerm: v.optional(v.string()),
		positionGrade: v.optional(v.string()),
		sort: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const sort = args.sort ?? "asc";
		const limit = Math.min(args.limit ?? 200, 500);

		const org = await ctx.db.get(args.orgId);
		if (!org) return { contacts: [], total: 0 };

		const members = await loadOrgMembers(ctx, [args.orgId], {
			positionGrade: args.positionGrade,
		});

		const myMembership = await getMembership(
			ctx,
			ctx.user._id,
			args.orgId,
		).catch(() => null);
		const isMyOrg = !!myMembership;

		const results: ContactResult[] = [];
		for (const { membership, position, user } of members) {
			// Respect de l'opt-out "réseau public" pour les orgs externes.
			if (!isMyOrg && membership.isPublicContact === false) continue;

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
		}

		// Filtre texte (post-fetch — typiquement < 100 docs par org)
		let filtered = results;
		if (args.searchTerm) {
			const q = args.searchTerm.toLowerCase();
			filtered = results.filter(
				(c) =>
					c.lastName.toLowerCase().includes(q) ||
					c.firstName.toLowerCase().includes(q) ||
					c.email?.toLowerCase().includes(q) ||
					c.position?.toLowerCase().includes(q),
			);
		}

		filtered.sort((a, b) => {
			const cmp = `${a.lastName} ${a.firstName}`.localeCompare(
				`${b.lastName} ${b.firstName}`,
				"fr",
				{ sensitivity: "base" },
			);
			return sort === "asc" ? cmp : -cmp;
		});

		return {
			contacts: filtered.slice(0, limit),
			total: filtered.length,
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
