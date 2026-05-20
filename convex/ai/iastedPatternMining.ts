/**
 * iastedPatternMining — Détection de patterns d'usage iAsted (Sprint 6.5 — B3).
 *
 * Cron quotidien qui scan les tool calls vocaux récents de chaque utilisateur
 * et écrit des suggestions sous forme de `iastedMemories.preference` avec
 * `metadata.suggestion=true`. Le prompt builder peut alors les surfacer en
 * début de session (« J'ai remarqué que vous lancez souvent X. Voulez-vous
 * un raccourci ? »).
 *
 * Algorithme MVP (volontairement simple, à raffiner Sprint 4.5+) :
 *   1. Scan `aiActivityLog` des 30 derniers jours.
 *   2. Group by (userId, capabilityCode) sur les `voice.*` calls.
 *   3. Si count ≥ SEUIL_SUGGESTION (5), créer une `iastedMemories.preference`
 *      avec contenu « Utilise souvent X (N fois ces 30 derniers jours) ».
 *   4. Idempotent : si la suggestion existe déjà (même content), juste boost
 *      confidence + lastAccessedAt (via writeMemoryInternal qui dédupe).
 *
 * Coût : scan d'audit log borné (LIMIT_USERS users × 30 jours d'activity).
 * Run quotidien (4h Paris ≈ 3h UTC) après le RAG refresh.
 */

import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

const PATTERN_WINDOW_DAYS = 30;
const SUGGESTION_THRESHOLD = 5;
// Borne de sécurité — pour éviter un scan trop long si la table grossit
// beaucoup. À retirer quand on aura un index dédié `by_user_created`.
const MAX_AUDIT_ROWS = 50_000;

// Capabilities qu'on considère pour les suggestions. On exclut les
// `voice.open_*` (navigation) qui sont trop génériques. Focus sur les
// actions à valeur ajoutée (orchestration, traitement, lecture).
const SUGGESTION_RELEVANT_PREFIXES = [
	"voice.launch_call",
	"voice.create_instant_meeting",
	"voice.schedule_meeting",
	"voice.send_quick_message",
	"voice.draft_correspondence",
	"voice.generate_document",
	"voice.approve_request",
	"voice.advance_correspondance_status",
	"voice.archive_correspondance",
	"voice.find_post_holder",
	"voice.find_orgs_by_country",
	"voice.query_platform_knowledge",
];

function isRelevant(capabilityCode: string): boolean {
	return SUGGESTION_RELEVANT_PREFIXES.some((p) =>
		capabilityCode.startsWith(p),
	);
}

function humanLabelForCapability(capabilityCode: string): string {
	// voice.launch_call_with_contact → "lancer un appel"
	// voice.draft_correspondence → "rédiger une correspondance"
	const tool = capabilityCode.replace(/^voice\./, "");
	const labels: Record<string, string> = {
		launch_call_with_contact: "lancer un appel à un contact",
		create_instant_meeting: "créer une réunion instantanée",
		schedule_meeting: "planifier une réunion",
		send_quick_message: "envoyer un message rapide",
		draft_correspondence: "rédiger une correspondance officielle",
		generate_document: "générer un document",
		approve_request: "approuver un dossier",
		advance_correspondance_status: "faire avancer un courrier",
		archive_correspondance: "archiver un courrier",
		find_post_holder: "chercher un titulaire de poste diplomatique",
		find_orgs_by_country: "explorer les organisations par pays",
		query_platform_knowledge: "interroger la base de connaissances",
	};
	return labels[tool] ?? tool.replaceAll("_", " ");
}

export const minePatternsInternal = internalMutation({
	args: {},
	handler: async (ctx) => {
		const since = Date.now() - PATTERN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
		// Scan large — pas d'index ts dédié sur aiActivityLog à ce stade.
		// Si la table dépasse MAX_AUDIT_ROWS, on s'arrête (à raffiner).
		const rows = await ctx.db
			.query("aiActivityLog")
			.collect()
			.catch(() => []);
		if (rows.length === 0) {
			return { scanned: 0, suggestionsWritten: 0 };
		}
		const truncated = rows.length > MAX_AUDIT_ROWS;
		const effective = truncated ? rows.slice(-MAX_AUDIT_ROWS) : rows;

		// Group by (userId, capabilityCode) — uniquement les succès récents
		// d'actions relevantes.
		type Counter = { userId: any; capabilityCode: string; count: number };
		const counterMap = new Map<string, Counter>();
		for (const r of effective) {
			const anyR = r as any;
			if (!anyR.userId) continue;
			if (!anyR.capabilityCode) continue;
			if (anyR.createdAt && anyR.createdAt < since) continue;
			if (anyR.action !== "auto_applied" && anyR.action !== "applied") continue;
			if (!isRelevant(anyR.capabilityCode)) continue;
			const key = `${anyR.userId}::${anyR.capabilityCode}`;
			const cur = counterMap.get(key);
			if (cur) {
				cur.count++;
			} else {
				counterMap.set(key, {
					userId: anyR.userId,
					capabilityCode: anyR.capabilityCode,
					count: 1,
				});
			}
		}

		let suggestionsWritten = 0;
		for (const c of counterMap.values()) {
			if (c.count < SUGGESTION_THRESHOLD) continue;
			const label = humanLabelForCapability(c.capabilityCode);
			const content = `Utilise souvent « ${label} » (${c.count} fois sur les ${PATTERN_WINDOW_DAYS} derniers jours). Propose-lui éventuellement un raccourci si pertinent.`;
			try {
				await ctx.runMutation(
					internal.ai.iastedMemories.writeMemoryInternal,
					{
						userId: c.userId,
						category: "preference",
						content,
						confidence: 0.5,
						metadata: {
							suggestion: true,
							capabilityCode: c.capabilityCode,
							count: c.count,
							window_days: PATTERN_WINDOW_DAYS,
						},
					},
				);
				suggestionsWritten++;
			} catch (e) {
				console.warn("[iastedPatternMining] writeMemory failed:", e);
			}
		}

		console.log(
			"[iastedPatternMining]",
			JSON.stringify({
				rowsTotal: rows.length,
				rowsScanned: effective.length,
				truncated,
				uniqueUserToolPairs: counterMap.size,
				suggestionsWritten,
			}),
		);

		return {
			scanned: effective.length,
			truncated,
			suggestionsWritten,
		};
	},
});
