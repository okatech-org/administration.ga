/**
 * Briefings IA — actions Gemini (runtime Node).
 *
 * Les helpers (chargement contexte, persistance) vivent dans
 * `convex/functions/intelligenceBriefings.ts` (V8). Ce fichier ne contient
 * que les actions qui appellent Gemini.
 *
 * Cloisonnement déléguée à la mutation `_saveBriefing` qui rejette les
 * écritures hors-périmètre via assertCallerIsIntelAgency. Les actions
 * elles-mêmes refusent de tourner pour un appelant non-intel via une
 * vérification additionnelle.
 */

"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { callGemini } from "../ai/providers/gemini";

const profileTargetTypeValidator = v.union(
	v.literal("profile"),
	v.literal("child_profile"),
	v.literal("diplomatic_target"),
	v.literal("agent"),
);

const PROMPT_VERSION_PROFILE = "profile-v1";
const PROMPT_VERSION_CASE = "case-v1";

const SYSTEM_PROMPT = `Tu es un analyste senior d'une agence de renseignement souveraine.
Tu produis des fiches de synthèse RESTREINT pour aider à la prise de décision.

Règles strictes :
- Reste factuel : pas de spéculation gratuite, sépare clairement faits et hypothèses.
- Le ton est sobre, technique, sans dramatisation.
- Si une information manque, écris explicitement "Donnée non disponible".
- Pas de jugement de valeur sur les personnes — uniquement éléments d'analyse.
- Markdown structuré avec sections explicites (## Identité, ## Risque, etc.).
- Toujours commencer par une bannière de classification.`;

export const generateProfileBriefing = action({
	args: {
		orgId: v.id("orgs"),
		targetType: profileTargetTypeValidator,
		targetId: v.string(),
	},
	handler: async (
		ctx,
		args,
	): Promise<{ briefingId: Id<"intelligenceBriefings"> }> => {
		const ctxData = await ctx.runQuery(
			internal.functions.intelligenceBriefings._loadProfileContext,
			{
				orgId: args.orgId,
				targetType: args.targetType,
				targetId: args.targetId,
			},
		);

		const prompt = buildProfilePrompt(ctxData);

		const result = await callGemini<string>(prompt, {
			model: "gemini-2.5-flash",
			systemPrompt: SYSTEM_PROMPT,
			jsonMode: false,
			temperature: 0.3,
			maxOutputTokens: 3000,
		});

		const watermarked = `> **CLASSIFICATION : ${ctxData.classification.toUpperCase()}**
> Briefing généré le ${new Date().toLocaleString("fr-FR")} — usage strictement interne à l'agence.

${result.output}`;

		const briefingId = await ctx.runMutation(
			internal.functions.intelligenceBriefings._saveBriefing,
			{
				orgId: args.orgId,
				generatedBy: ctxData.generatedBy,
				targetType: args.targetType,
				targetId: args.targetId,
				title: ctxData.label
					? `Briefing — ${ctxData.label}`
					: "Briefing renseignement",
				content: watermarked,
				model: result.model,
				promptVersion: PROMPT_VERSION_PROFILE,
				tokensIn: result.tokensIn,
				tokensOut: result.tokensOut,
				costMicroCents: result.costMicroCents,
				latencyMs: result.latencyMs,
				classification: ctxData.classification,
			},
		);

		return { briefingId };
	},
});

export const generateCaseBriefing = action({
	args: {
		orgId: v.id("orgs"),
		caseId: v.id("intelligenceCases"),
	},
	handler: async (
		ctx,
		args,
	): Promise<{ briefingId: Id<"intelligenceBriefings"> }> => {
		const ctxData = await ctx.runQuery(
			internal.functions.intelligenceBriefings._loadCaseContext,
			{ orgId: args.orgId, caseId: args.caseId },
		);

		const prompt = buildCasePrompt(ctxData);

		const result = await callGemini<string>(prompt, {
			model: "gemini-2.5-flash",
			systemPrompt: SYSTEM_PROMPT,
			jsonMode: false,
			temperature: 0.3,
			maxOutputTokens: 4000,
		});

		const watermarked = `> **CLASSIFICATION : ${ctxData.classification.toUpperCase()}**
> Briefing dossier généré le ${new Date().toLocaleString("fr-FR")} — usage strictement interne.

${result.output}`;

		const briefingId = await ctx.runMutation(
			internal.functions.intelligenceBriefings._saveBriefing,
			{
				orgId: args.orgId,
				generatedBy: ctxData.generatedBy,
				targetType: "case",
				targetId: args.caseId,
				title: `Briefing dossier — ${ctxData.title}`,
				content: watermarked,
				model: result.model,
				promptVersion: PROMPT_VERSION_CASE,
				tokensIn: result.tokensIn,
				tokensOut: result.tokensOut,
				costMicroCents: result.costMicroCents,
				latencyMs: result.latencyMs,
				classification: ctxData.classification,
			},
		);

		return { briefingId };
	},
});

// ─── PROMPT BUILDERS ───────────────────────────────────────────────

interface ProfileContext {
	label: string;
	identitySummary: string;
	country?: string;
	profession?: string;
	notes: Array<{
		severity: string;
		category: string;
		content: string;
		classification?: string;
		verified?: string;
	}>;
	watchlistItemsCount: number;
	links: Array<{
		other: { type: string; id: string };
		relation: string;
		strength: string;
		verification?: string;
	}>;
	classification: string;
}

function buildProfilePrompt(ctx: ProfileContext): string {
	const notesBlock = ctx.notes.length
		? ctx.notes
				.slice(0, 20)
				.map(
					(n, i) =>
						`${i + 1}. [${n.severity.toUpperCase()}/${n.category}${n.verified ? `/${n.verified}` : ""}] ${n.content}`,
				)
				.join("\n")
		: "Aucune note.";

	const linksBlock = ctx.links.length
		? ctx.links
				.slice(0, 15)
				.map(
					(l, i) =>
						`${i + 1}. → ${l.other.type}#${l.other.id} (${l.relation}, force ${l.strength}${l.verification ? `, ${l.verification}` : ""})`,
				)
				.join("\n")
		: "Aucun lien identifié.";

	return `Cible : ${ctx.identitySummary}
Pays de résidence : ${ctx.country ?? "Donnée non disponible"}
Métier déclaré : ${ctx.profession ?? "Donnée non disponible"}
Présent sur ${ctx.watchlistItemsCount} liste(s) de surveillance.
Classification globale dérivée des notes : ${ctx.classification}.

NOTES (${ctx.notes.length}) :
${notesBlock}

LIENS (${ctx.links.length}) :
${linksBlock}

MISSION : produire une fiche de synthèse markdown structurée avec :
1. ## Synthèse exécutive (3-4 phrases)
2. ## Identité & contexte
3. ## Éléments d'analyse (faits saillants des notes)
4. ## Réseau (relations significatives)
5. ## Évaluation du risque (niveau global + justification, basée uniquement sur les notes fournies)
6. ## Recommandations (2-4 actions concrètes pour l'agence)

Termine par une ligne "_Sources : N notes internes, M liens — voir dossier_".`;
}

interface CaseContext {
	title: string;
	summary?: string;
	status: string;
	priority: string;
	classification: string;
	tags: string[];
	openedAt: number;
	entities: Array<{
		targetType: string;
		targetId: string;
		role?: string;
		notes?: string;
	}>;
	events: Array<{
		eventType: string;
		payload?: unknown;
		timestamp: number;
	}>;
}

function buildCasePrompt(ctx: CaseContext): string {
	const entitiesBlock = ctx.entities.length
		? ctx.entities
				.map(
					(e, i) =>
						`${i + 1}. ${e.targetType}#${e.targetId}${e.role ? ` — ${e.role}` : ""}${e.notes ? ` : ${e.notes}` : ""}`,
				)
				.join("\n")
		: "Aucune entité rattachée.";

	const eventsBlock = ctx.events.length
		? ctx.events
				.slice(0, 15)
				.map(
					(e) =>
						`- ${new Date(e.timestamp).toLocaleString("fr-FR")} : ${e.eventType}`,
				)
				.join("\n")
		: "Pas d'événements.";

	return `Dossier : ${ctx.title}
Statut : ${ctx.status} · Priorité : ${ctx.priority} · Classification : ${ctx.classification}
Tags : ${ctx.tags.join(", ") || "aucun"}
Ouvert le : ${new Date(ctx.openedAt).toLocaleString("fr-FR")}

Résumé fourni : ${ctx.summary ?? "Non renseigné"}

ENTITÉS (${ctx.entities.length}) :
${entitiesBlock}

TIMELINE (${ctx.events.length}) :
${eventsBlock}

MISSION : produire un briefing de dossier markdown avec :
1. ## Contexte & objectif (rappel du fil rouge)
2. ## Acteurs identifiés (synthèse par rôle)
3. ## Chronologie (3-5 jalons clés)
4. ## Hypothèses de travail (clairement étiquetées comme hypothèses)
5. ## Recommandations opérationnelles (2-4 actions)
6. ## Risques résiduels & angles morts

Pas de spéculation gratuite — appuie chaque conclusion sur les éléments fournis.`;
}
