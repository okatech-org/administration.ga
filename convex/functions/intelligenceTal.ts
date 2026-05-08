/**
 * Technology Alert List (TAL) — queries d'analyse cohorte par secteur
 * stratégique pour le module Renseignement souverain.
 *
 * Le mapping métier → secteurs est calculé à la volée via
 * `inferSectorsFromProfession` (cf. lib/strategicSectors.ts). Aucune
 * dénormalisation côté DB pour Phase 1.3 — on accepte la passe linéaire
 * sur les profils du pays demandé (limite à 1000 profils par requête).
 */

import { v } from "convex/values";
import { authQuery } from "../lib/customFunctions";
import { getMembership } from "../lib/auth";
import { assertCanDoTask } from "../lib/permissions";
import { assertCallerIsIntelAgency } from "../lib/intelligenceAgencyVisibility";
import {
	ALL_STRATEGIC_SECTORS,
	inferSectorsFromProfession,
	type StrategicSectorValue,
} from "../lib/strategicSectors";

// Limite de profils scannés en une passe — la table profiles peut être
// volumineuse, on cap à 1000 pour éviter une lecture trop longue.
const SCAN_LIMIT = 1000;

export const listProfilesBySector = authQuery({
	args: {
		orgId: v.id("orgs"),
		sector: v.string(),
		country: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(
			ctx,
			ctx.user,
			membership,
			"intelligence.profiles.search",
		);

		const limit = Math.min(args.limit ?? 100, 200);

		const profiles = args.country
			? await ctx.db
					.query("profiles")
					.withIndex("by_country_of_residence", (q) =>
						q.eq("countryOfResidence", args.country as never),
					)
					.take(SCAN_LIMIT)
			: await ctx.db.query("profiles").take(SCAN_LIMIT);

		const matched: Array<{
			profileId: string;
			fullName: string;
			country?: string;
			professionTitle?: string;
			sectors: StrategicSectorValue[];
		}> = [];

		for (const p of profiles) {
			const sectors = inferSectorsFromProfession(p.profession);
			if (!sectors.includes(args.sector as StrategicSectorValue)) continue;

			const fn = p.identity?.firstName ?? "";
			const ln = p.identity?.lastName ?? "";
			matched.push({
				profileId: p._id,
				fullName: `${fn} ${ln}`.trim(),
				country: p.countryOfResidence,
				professionTitle: p.profession?.title,
				sectors,
			});
			if (matched.length >= limit) break;
		}

		return matched;
	},
});

export const getSectorStats = authQuery({
	args: {
		orgId: v.id("orgs"),
		country: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await assertCallerIsIntelAgency(ctx, ctx.user._id, args.orgId);
		const membership = await getMembership(ctx, ctx.user._id, args.orgId);
		await assertCanDoTask(
			ctx,
			ctx.user,
			membership,
			"intelligence.profiles.search",
		);

		const profiles = args.country
			? await ctx.db
					.query("profiles")
					.withIndex("by_country_of_residence", (q) =>
						q.eq("countryOfResidence", args.country as never),
					)
					.take(SCAN_LIMIT)
			: await ctx.db.query("profiles").take(SCAN_LIMIT);

		const counts: Record<string, number> = {};
		for (const s of ALL_STRATEGIC_SECTORS) counts[s] = 0;

		let scannedCount = 0;
		let matchedCount = 0;
		for (const p of profiles) {
			scannedCount += 1;
			const sectors = inferSectorsFromProfession(p.profession);
			if (sectors.length > 0) matchedCount += 1;
			for (const s of sectors) counts[s] = (counts[s] ?? 0) + 1;
		}

		return {
			totalScanned: scannedCount,
			totalMatched: matchedCount,
			byCountry: args.country,
			perSector: counts,
		};
	},
});
