/**
 * iastedMeetingSummariesHelpers — Helpers internes pour le tool vocal
 * `save_meeting_summary` (Sprint 8 — F2).
 *
 * Crée une entrée minimaliste dans `iastedMemories.context` (mémoire long
 * terme) avec le résumé de réunion, plutôt qu'une vraie correspondance
 * officielle (qui nécessiterait référence séquentielle, signature, etc.).
 *
 * Choix de design : on évite d'invoquer `correspondanceCore.create` depuis
 * un tool vocal car ça déclencherait des side-effects métier (compteur
 * référence, audit log spécifique iCorrespondance, validation). Pour MVP
 * F2, le résumé vit dans la mémoire iAsted et apparaît dans le prompt
 * builder à la prochaine session. L'utilisateur peut ensuite l'exporter
 * via un tool dédié si besoin (Sprint 9+).
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const persistInternal = internalMutation({
	args: {
		orgId: v.id("orgs"),
		userId: v.id("users"),
		title: v.string(),
		body: v.string(),
	},
	handler: async (
		ctx,
		args,
	): Promise<{ ok: true; itemId: string } | { ok: false; error?: string }> => {
		try {
			const id = await ctx.db.insert("iastedMemories", {
				userId: args.userId,
				category: "context",
				content: `[Réunion] ${args.title}\n\n${args.body.slice(0, 1500)}${args.body.length > 1500 ? "\n…[tronqué]" : ""}`,
				confidence: 0.9,
				metadata: {
					kind: "meeting_summary",
					orgId: args.orgId,
					title: args.title,
				},
				createdAt: Date.now(),
				lastAccessedAt: Date.now(),
				archived: false,
			});
			return { ok: true, itemId: id as unknown as string };
		} catch (e: any) {
			console.warn("[iastedMeetingSummariesHelpers] insert failed:", e);
			return { ok: false, error: e?.message };
		}
	},
});
