/**
 * Migration légère : adapte les `documentTemplates` existants au format v1.
 *
 *   1. Convertit `allowedOrgTypes` (legacy) → `applicability` +
 *      `applicableOrgTypes` (nouveau format).
 *   2. Remplit les 3 facettes `headerFooter` / `typography` / `voice` avec des
 *      valeurs par défaut « République Gabonaise » si elles sont absentes
 *      (cohérence visuelle sans édition manuelle).
 *
 * Idempotent — les patches sont appliqués uniquement aux champs non
 * renseignés ; relancer la migration n'a aucun effet cumulatif.
 */

import { internalMutation } from "../_generated/server";

export const migrateTemplatesApplicability = internalMutation({
	args: {},
	handler: async (ctx) => {
		const stats = {
			applicabilityMigrated: 0,
			headerFooterSeeded: 0,
			typographySeeded: 0,
			voiceSeeded: 0,
		};

		const templates = await ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();

		for (const t of templates) {
			const patch: Record<string, unknown> = {};

			// ─── 1. Applicability (une seule fois) ───────────────────────
			if (t.applicability === undefined) {
				const hasLegacyRestriction =
					Array.isArray(t.allowedOrgTypes) && t.allowedOrgTypes.length > 0;
				patch.applicability = hasLegacyRestriction ? "specificOrgTypes" : "all";
				if (hasLegacyRestriction) {
					patch.applicableOrgTypes = t.allowedOrgTypes;
				}
				stats.applicabilityMigrated += 1;
			}

			// ─── 2. Facettes par défaut (si absentes) ────────────────────
			if (!t.headerFooter) {
				patch.headerFooter = defaultHeaderFooter();
				stats.headerFooterSeeded += 1;
			}
			if (!t.typography) {
				patch.typography = defaultTypography();
				stats.typographySeeded += 1;
			}
			if (!t.voice) {
				patch.voice = defaultVoice();
				stats.voiceSeeded += 1;
			}

			if (Object.keys(patch).length > 0) {
				await ctx.db.patch(t._id, patch);
			}
		}

		return stats;
	},
});

// ============================================================================
// Valeurs par défaut « République Gabonaise »
// ============================================================================

function paraDoc(lines: string[]) {
	return {
		type: "doc" as const,
		content: lines.map((line) => ({
			type: "paragraph" as const,
			attrs: { textAlign: "center" as const },
			content: line ? [{ type: "text" as const, text: line }] : undefined,
		})),
	};
}

function defaultHeaderFooter() {
	return {
		header: {
			logoAlignment: "left" as const,
			height: 30,
			content: paraDoc([
				"RÉPUBLIQUE GABONAISE",
				"Union — Travail — Justice",
				"Ministère des Affaires Étrangères",
			]),
		},
		footer: {
			height: 15,
			showPageNumbers: true,
			content: paraDoc([
				"Document officiel — ne pas reproduire sans autorisation.",
			]),
		},
	};
}

function defaultTypography() {
	return {
		fontFamily: "Times New Roman, Times, serif",
		fontSizeBase: 11,
		lineHeight: 1.4,
		defaultAlignment: "justify" as const,
		headingStyles: {
			h1: {
				fontSize: 16,
				bold: true,
				uppercase: true,
				spacingBefore: 0,
				spacingAfter: 6,
				alignment: "center" as const,
			},
			h2: {
				fontSize: 14,
				bold: true,
				uppercase: false,
				spacingBefore: 6,
				spacingAfter: 4,
				alignment: "left" as const,
			},
			h3: {
				fontSize: 12,
				bold: true,
				uppercase: false,
				spacingBefore: 4,
				spacingAfter: 2,
				alignment: "left" as const,
			},
		},
		paragraphSpacingBefore: 0,
		paragraphSpacingAfter: 3,
		paragraphFirstLineIndent: 0,
		pageBreakBefore: [],
		widowOrphanControl: true,
		keepHeadingsWithNext: true,
	};
}

function defaultVoice() {
	return {
		tone: "Formel et institutionnel",
		register: "administratif" as const,
		openingFormulas: [
			{ text: "Par la présente, il est attesté que…", templateType: "attestation" as const },
			{ text: "Le soussigné certifie que…", templateType: "certificate" as const },
			{
				text: "Le Consulat Général du Gabon accuse réception de…",
				templateType: "receipt" as const,
			},
		],
		closingFormulas: [
			{
				text: "Je vous prie d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
				templateType: "letter" as const,
			},
			{
				text: "En foi de quoi, le présent document est délivré pour servir et valoir ce que de droit.",
				templateType: "attestation" as const,
			},
		],
		signatureFormulas: ["Fait à [Lieu], le [Date]."],
		personPronoun: "le_consulat" as const,
		useFormalAddress: true,
		politenessLevel: "courtois" as const,
		argumentationGuidelines: [
			"- Toujours citer la référence du dossier en tête de document.",
			"- Rester factuel : énoncer les faits avérés, éviter les suppositions.",
			"- Conclure par une formule de politesse adaptée au destinataire.",
		].join("\n"),
		vocabularyPreferences: [
			{ prefer: "usager", avoid: ["client", "consommateur"] },
			{ prefer: "représentation", avoid: ["bureau", "agence"] },
		],
	};
}
