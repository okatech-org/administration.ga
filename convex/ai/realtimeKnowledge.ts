/**
 * realtimeKnowledge — Queries de connaissance exposées à l'agent vocal iAsted.
 *
 * Permettent au modèle de répondre à des questions du type :
 *   « Qui est l'ambassadeur du Gabon en Espagne ? »
 *   « Quels sont les agents du consulat à Paris ? »
 *   « Quelles représentations avons-nous en France ? »
 *   « Quels postes existent à l'ambassade en Espagne ? »
 *
 * Ces queries résolvent les orgs par juridiction/nom, croisent les positions
 * et memberships, et retournent des résumés enrichis. Les RBAC sont relâchés
 * (read-only sur l'annuaire diplomatique) — les emails/téléphones internes
 * restent filtrés à `isPublicContact === true` quand le caller n'a pas
 * `team.view` sur l'org concerné.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { authQuery } from "../lib/customFunctions";

// ─────────────────────────────────────────────────────────────
// Helpers — normalisation rôle / pays
// ─────────────────────────────────────────────────────────────

const ROLE_SYNONYMS: Record<string, string[]> = {
	ambassador: ["ambassador", "ambassadeur", "ambassade", "chef de mission", "head of mission"],
	consul_general: ["consul_general", "consul général", "consul general"],
	consul: ["consul", "consulat"],
	deputy_chief: ["deputy", "premier conseiller", "first counselor", "deputy_chief", "deputy chief"],
	counselor: ["conseiller", "counselor", "counsellor"],
	attache: ["attaché", "attache", "attache_"],
	high_commissioner: ["haut-commissaire", "haut commissaire", "high commissioner", "high_commissioner"],
	permanent_representative: ["représentant permanent", "permanent representative", "permanent_representative"],
	chief: ["chief", "chef"],
	first_secretary: ["premier secrétaire", "first secretary", "first_secretary"],
	second_secretary: ["second secrétaire", "second secretary", "second_secretary"],
	third_secretary: ["troisième secrétaire", "third secretary", "third_secretary"],
};

/** Retourne les mots-clés normalisés correspondant à une requête de rôle utilisateur. */
function expandRoleKeywords(input: string): string[] {
	const normalized = input.trim().toLowerCase();
	if (!normalized) return [];
	const matches: string[] = [normalized];
	for (const [, syns] of Object.entries(ROLE_SYNONYMS)) {
		if (syns.some((s) => normalized.includes(s) || s.includes(normalized))) {
			matches.push(...syns);
		}
	}
	return Array.from(new Set(matches));
}

/** Vérifie si une position (code + title.fr) correspond aux mots-clés rôle. */
function positionMatchesRole(
	position: { code?: string; title?: { fr?: string; en?: string } | string },
	keywords: string[],
): boolean {
	if (keywords.length === 0) return false;
	const code = (position.code ?? "").toLowerCase();
	const title =
		typeof position.title === "string"
			? position.title
			: position.title?.fr ?? position.title?.en ?? "";
	const hay = `${code} ${title}`.toLowerCase();
	return keywords.some((k) => hay.includes(k));
}

/** Tente d'extraire un code pays ISO 2 lettres depuis une chaîne libre. */
function extractCountryCode(input: string): string | null {
	const trimmed = input.trim();
	if (trimmed.length === 2) return trimmed.toUpperCase();
	const lc = trimmed.toLowerCase();
	const COUNTRY_NAMES: Record<string, string> = {
		france: "FR",
		espagne: "ES",
		spain: "ES",
		belgique: "BE",
		belgium: "BE",
		suisse: "CH",
		switzerland: "CH",
		italie: "IT",
		italy: "IT",
		allemagne: "DE",
		germany: "DE",
		royaume_uni: "GB",
		royaume: "GB",
		"royaume-uni": "GB",
		"united kingdom": "GB",
		uk: "GB",
		"états-unis": "US",
		etats_unis: "US",
		"united states": "US",
		usa: "US",
		canada: "CA",
		maroc: "MA",
		morocco: "MA",
		sénégal: "SN",
		senegal: "SN",
		cameroun: "CM",
		cameroon: "CM",
		"côte d'ivoire": "CI",
		cote_d_ivoire: "CI",
		ivory: "CI",
		chine: "CN",
		china: "CN",
		japon: "JP",
		japan: "JP",
		"afrique du sud": "ZA",
		"south africa": "ZA",
		brésil: "BR",
		bresil: "BR",
		brazil: "BR",
		gabon: "GA",
	};
	return COUNTRY_NAMES[lc] ?? null;
}

/**
 * Plafond pour les scans cross-org d'un super-admin avec de nombreuses orgs.
 * Au-delà, on retourne un avertissement demandant de filtrer par pays.
 */
const MAX_ORGS_SCANNED = 10;

const CONSULATE_TYPES = new Set([
	"embassy",
	"consulate",
	"general_consulate",
	"permanent_mission",
	"high_commission",
	"honorary_consulate",
]);

function isPubliclyVisibleOrgType(type: string | undefined): boolean {
	return !!type && CONSULATE_TYPES.has(type) && type !== "intelligence_agency";
}

// ─────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────

/**
 * findPostHolder — Identifie le titulaire d'un poste à un org/pays donné.
 * Ex : « Qui est l'ambassadeur du Gabon en Espagne ? »
 */
export const findPostHolder = authQuery({
	args: {
		role: v.string(),
		country: v.optional(v.string()),
		orgQuery: v.optional(v.string()),
		orgId: v.optional(v.id("orgs")),
	},
	handler: async (ctx, args) => {
		// 1. Résolution des orgs candidates
		let orgs: Doc<"orgs">[] = [];
		if (args.orgId) {
			const org = await ctx.db.get(args.orgId);
			if (org && !org.deletedAt) orgs = [org];
		} else if (args.country) {
			const code = extractCountryCode(args.country);
			if (code) {
				const byCountry = await ctx.db
					.query("orgs")
					.withIndex("by_country", (q) => q.eq("country", code as any))
					.collect();
				orgs.push(...byCountry.filter((o) => !o.deletedAt && o.isActive));
				const all = await ctx.db
					.query("orgs")
					.withIndex("by_active_notDeleted", (q) =>
						q.eq("isActive", true).eq("deletedAt", undefined),
					)
					.take(500);
				for (const o of all) {
					if (
						o.jurisdictionCountries?.includes(code as any) &&
						!orgs.some((x) => x._id === o._id)
					) {
						orgs.push(o);
					}
				}
			}
		} else if (args.orgQuery) {
			const q = args.orgQuery.toLowerCase();
			const all = await ctx.db
				.query("orgs")
				.withIndex("by_active_notDeleted", (q2) =>
					q2.eq("isActive", true).eq("deletedAt", undefined),
				)
				.take(500);
			orgs = all.filter(
				(o) => !o.deletedAt && o.name.toLowerCase().includes(q),
			);
		}

		// Filtrer aux types diplomatiques utiles + exclure intel
		orgs = orgs.filter((o) => isPubliclyVisibleOrgType(o.type));

		// Cap explicite — au-delà, on demande au modèle de filtrer.
		const totalMatched = orgs.length;
		const capped = totalMatched > MAX_ORGS_SCANNED;
		if (capped) {
			orgs = orgs.slice(0, MAX_ORGS_SCANNED);
		}

		if (orgs.length === 0) return { results: [] };

		const keywords = expandRoleKeywords(args.role);
		if (keywords.length === 0) return { results: [] };

		// 2. Pour chaque org, croiser positions / memberships
		const results: Array<{
			org: { _id: Id<"orgs">; name: string; country?: string; type?: string };
			position: { code: string; titleFr?: string; level: number; grade?: string };
			user: {
				_id: Id<"users">;
				firstName?: string;
				lastName?: string;
				email?: string;
			};
		}> = [];

		for (const org of orgs) {
			const positions = await ctx.db
				.query("positions")
				.withIndex("by_org", (q) =>
					q.eq("orgId", org._id).eq("isActive", true),
				)
				.collect();
			const matching = positions.filter(
				(p) => !p.deletedAt && positionMatchesRole(p, keywords),
			);
			if (matching.length === 0) continue;

			const memberships = await ctx.db
				.query("memberships")
				.withIndex("by_org_deletedAt", (q) =>
					q.eq("orgId", org._id).eq("deletedAt", undefined),
				)
				.collect();

			for (const pos of matching) {
				const occupants = memberships.filter(
					(m) => m.positionId === pos._id,
				);
				for (const m of occupants) {
					const u = await ctx.db.get(m.userId);
					if (!u) continue;
					const titleFr =
						typeof pos.title === "string"
							? pos.title
							: pos.title?.fr ?? pos.title?.en;
					results.push({
						org: {
							_id: org._id,
							name: org.name,
							country: org.country,
							type: org.type,
						},
						position: {
							code: pos.code,
							titleFr,
							level: pos.level,
							grade: pos.grade,
						},
						user: {
							_id: u._id,
							firstName: (u as any).firstName,
							lastName: (u as any).lastName,
							email: u.email,
						},
					});
				}
			}
		}

		// Trier par level position croissant (1 = chef de mission)
		results.sort((a, b) => a.position.level - b.position.level);
		return {
			results,
			cappedScan: capped,
			totalOrgsCandidates: totalMatched,
		};
	},
});

/**
 * listDiplomaticCorps — Liste les membres d'un org (ou des représentations
 * d'un pays).
 * Ex : « Qui sont les agents de l'ambassade à Madrid ? »
 */
export const listDiplomaticCorps = authQuery({
	args: {
		orgId: v.optional(v.id("orgs")),
		country: v.optional(v.string()),
		orgQuery: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Résolution org(s)
		let orgs: Doc<"orgs">[] = [];
		if (args.orgId) {
			const org = await ctx.db.get(args.orgId);
			if (org && !org.deletedAt) orgs = [org];
		} else if (args.country) {
			const code = extractCountryCode(args.country);
			if (code) {
				const byCountry = await ctx.db
					.query("orgs")
					.withIndex("by_country", (q) => q.eq("country", code as any))
					.collect();
				orgs.push(...byCountry.filter((o) => !o.deletedAt && o.isActive));
				const all = await ctx.db
					.query("orgs")
					.withIndex("by_active_notDeleted", (q) =>
						q.eq("isActive", true).eq("deletedAt", undefined),
					)
					.take(500);
				for (const o of all) {
					if (
						o.jurisdictionCountries?.includes(code as any) &&
						!orgs.some((x) => x._id === o._id)
					) {
						orgs.push(o);
					}
				}
			}
		} else if (args.orgQuery) {
			const q = args.orgQuery.toLowerCase();
			const all = await ctx.db
				.query("orgs")
				.withIndex("by_active_notDeleted", (q2) =>
					q2.eq("isActive", true).eq("deletedAt", undefined),
				)
				.take(500);
			orgs = all.filter(
				(o) => !o.deletedAt && o.name.toLowerCase().includes(q),
			);
		}

		orgs = orgs.filter(
			(o) => o.type !== "intelligence_agency" && isPubliclyVisibleOrgType(o.type),
		);
		const totalMatched = orgs.length;
		const capped = totalMatched > MAX_ORGS_SCANNED;
		if (capped) {
			orgs = orgs.slice(0, MAX_ORGS_SCANNED);
		}
		if (orgs.length === 0) return { results: [], cappedScan: false, totalOrgsCandidates: 0 };

		const limit = args.limit ?? 30;
		const results: Array<{
			org: { _id: Id<"orgs">; name: string; country?: string; type?: string };
			members: Array<{
				userId: Id<"users">;
				firstName?: string;
				lastName?: string;
				email?: string;
				positionCode?: string;
				positionTitleFr?: string;
				positionLevel?: number;
				isPublicContact?: boolean;
			}>;
		}> = [];

		for (const org of orgs) {
			const memberships = await ctx.db
				.query("memberships")
				.withIndex("by_org_deletedAt", (q) =>
					q.eq("orgId", org._id).eq("deletedAt", undefined),
				)
				.collect();
			const members: Array<{
				userId: Id<"users">;
				firstName?: string;
				lastName?: string;
				email?: string;
				positionCode?: string;
				positionTitleFr?: string;
				positionLevel?: number;
				isPublicContact?: boolean;
			}> = [];
			for (const m of memberships) {
				if (!m.positionId) continue;
				const [u, p] = await Promise.all([
					ctx.db.get(m.userId),
					ctx.db.get(m.positionId),
				]);
				if (!u || !p) continue;
				const titleFr =
					typeof p.title === "string"
						? p.title
						: p.title?.fr ?? p.title?.en;
				members.push({
					userId: u._id,
					firstName: (u as any).firstName,
					lastName: (u as any).lastName,
					email: u.email,
					positionCode: p.code,
					positionTitleFr: titleFr,
					positionLevel: p.level,
					isPublicContact: m.isPublicContact,
				});
			}
			members.sort(
				(a, b) =>
					(a.positionLevel ?? 99) - (b.positionLevel ?? 99) ||
					(a.lastName ?? "").localeCompare(b.lastName ?? ""),
			);
			results.push({
				org: {
					_id: org._id,
					name: org.name,
					country: org.country,
					type: org.type,
				},
				members: members.slice(0, limit),
			});
		}
		return {
			results,
			cappedScan: capped,
			totalOrgsCandidates: totalMatched,
		};
	},
});

/**
 * findOrgsByCountry — Liste les représentations diplomatiques en/pour un pays.
 * Inclut celles dont le pays est en juridiction (consulat couvrant plusieurs pays).
 */
export const findOrgsByCountry = authQuery({
	args: {
		country: v.string(),
		typeFilter: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const code = extractCountryCode(args.country);
		if (!code) return { results: [], normalizedCountry: null };

		const byCountry = await ctx.db
			.query("orgs")
			.withIndex("by_country", (q) => q.eq("country", code as any))
			.collect();
		const matched: Doc<"orgs">[] = byCountry.filter(
			(o) => !o.deletedAt && o.isActive && isPubliclyVisibleOrgType(o.type),
		);
		const all = await ctx.db
			.query("orgs")
			.withIndex("by_active_notDeleted", (q) =>
				q.eq("isActive", true).eq("deletedAt", undefined),
			)
			.take(500);
		for (const o of all) {
			if (
				o.jurisdictionCountries?.includes(code as any) &&
				isPubliclyVisibleOrgType(o.type) &&
				!matched.some((x) => x._id === o._id)
			) {
				matched.push(o);
			}
		}

		const filtered = args.typeFilter
			? matched.filter((o) => o.type === args.typeFilter)
			: matched;

		return {
			normalizedCountry: code,
			results: filtered.map((o) => ({
				_id: o._id,
				name: o.name,
				type: o.type,
				country: o.country,
				jurisdictionCountries: o.jurisdictionCountries,
				slug: o.slug,
			})),
		};
	},
});

/**
 * listOrgPositions — Liste les postes (occupés ou vacants) d'un org.
 * Utile pour répondre à « Quels postes existent à l'ambassade en Espagne ? »
 */
export const listOrgPositions = authQuery({
	args: { orgId: v.id("orgs") },
	handler: async (ctx, args) => {
		const org = await ctx.db.get(args.orgId);
		if (!org || org.deletedAt) return { org: null, positions: [] };

		const positions = await ctx.db
			.query("positions")
			.withIndex("by_org", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
			.collect();
		const activePositions = positions.filter((p) => !p.deletedAt);

		const memberships = await ctx.db
			.query("memberships")
			.withIndex("by_org_deletedAt", (q) =>
				q.eq("orgId", args.orgId).eq("deletedAt", undefined),
			)
			.collect();

		const enriched = await Promise.all(
			activePositions.map(async (p) => {
				const occupants = memberships.filter((m) => m.positionId === p._id);
				const occupantInfo = await Promise.all(
					occupants.map(async (m) => {
						const u = await ctx.db.get(m.userId);
						return u
							? {
									_id: u._id,
									firstName: (u as any).firstName,
									lastName: (u as any).lastName,
								}
							: null;
					}),
				);
				const titleFr =
					typeof p.title === "string"
						? p.title
						: p.title?.fr ?? p.title?.en;
				return {
					_id: p._id,
					code: p.code,
					titleFr,
					level: p.level,
					grade: p.grade,
					isRequired: p.isRequired,
					isUnique: p.isUnique,
					occupants: occupantInfo.filter(Boolean),
				};
			}),
		);

		enriched.sort((a, b) => a.level - b.level);

		return {
			org: { _id: org._id, name: org.name, type: org.type, country: org.country },
			positions: enriched,
		};
	},
});
