/**
 * Migration vers le modèle modulaire des templates.
 *
 *   1. Crée 3 briques « Défaut » globales (Entête, Typo, Voix) si elles
 *      n'existent pas déjà.
 *   2. Convertit `allowedOrgTypes` (legacy) → `applicability` +
 *      `applicableOrgTypes` (nouveau format v1) sur tous les templates
 *      globaux qui n'ont pas encore été migrés.
 *
 * Idempotent — peut être relancée sans effet cumulatif.
 */

import { internalMutation } from "../_generated/server";

export const migrateToModularTemplates = internalMutation({
	args: {},
	handler: async (ctx) => {
		const seeded = {
			headerFooter: 0,
			typography: 0,
			voice: 0,
			templatesMigrated: 0,
		};

		// ─── Bloc Entête / Pied par défaut ───────────────────────────────
		const existingHf = await ctx.db
			.query("templateHeaderFooterBlocks")
			.withIndex("by_default", (q) =>
				q.eq("isDefault", true).eq("isActive", true),
			)
			.first();
		if (!existingHf) {
			await ctx.db.insert("templateHeaderFooterBlocks", {
				name: {
					fr: "Entête officiel — Par défaut",
					en: "Default official header",
				},
				description: {
					fr: "Entête et pied de page standards — République Gabonaise.",
					en: "Standard Republic of Gabon header and footer.",
				},
				header: {
					logoAlignment: "left",
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
				isGlobal: true,
				isActive: true,
				isDefault: true,
				version: 1,
				updatedAt: Date.now(),
			});
			seeded.headerFooter = 1;
		}

		// ─── Bloc Typographie par défaut ─────────────────────────────────
		const existingTypo = await ctx.db
			.query("templateTypographyBlocks")
			.withIndex("by_default", (q) =>
				q.eq("isDefault", true).eq("isActive", true),
			)
			.first();
		if (!existingTypo) {
			await ctx.db.insert("templateTypographyBlocks", {
				name: {
					fr: "Corps officiel — Par défaut",
					en: "Default official body",
				},
				description: {
					fr: "Times 11 pt justifié, interlignage 1.4 — typographie consulaire standard.",
					en: "Times 11 pt justified, line-height 1.4 — standard consular typography.",
				},
				fontFamily: "Times New Roman, Times, serif",
				fontSizeBase: 11,
				lineHeight: 1.4,
				defaultAlignment: "justify",
				headingStyles: {
					h1: {
						fontSize: 16,
						bold: true,
						uppercase: true,
						spacingBefore: 0,
						spacingAfter: 6,
						alignment: "center",
					},
					h2: {
						fontSize: 14,
						bold: true,
						uppercase: false,
						spacingBefore: 6,
						spacingAfter: 4,
						alignment: "left",
					},
					h3: {
						fontSize: 12,
						bold: true,
						uppercase: false,
						spacingBefore: 4,
						spacingAfter: 2,
						alignment: "left",
					},
				},
				paragraphSpacingBefore: 0,
				paragraphSpacingAfter: 3,
				paragraphFirstLineIndent: 0,
				pageBreakBefore: [],
				widowOrphanControl: true,
				keepHeadingsWithNext: true,
				isGlobal: true,
				isActive: true,
				isDefault: true,
				version: 1,
				updatedAt: Date.now(),
			});
			seeded.typography = 1;
		}

		// ─── Bloc Voix / Argumentaire par défaut ─────────────────────────
		const existingVoice = await ctx.db
			.query("templateVoiceBlocks")
			.withIndex("by_default", (q) =>
				q.eq("isDefault", true).eq("isActive", true),
			)
			.first();
		if (!existingVoice) {
			await ctx.db.insert("templateVoiceBlocks", {
				name: {
					fr: "Ton consulaire — Par défaut",
					en: "Default consular voice",
				},
				description: {
					fr: "Ton formel, registre administratif, vouvoiement systématique.",
					en: "Formal tone, administrative register, systematic formal address.",
				},
				tone: "Formel et institutionnel",
				register: "administratif",
				openingFormulas: [
					{ text: "Par la présente, il est attesté que…", templateType: "attestation" },
					{ text: "Le soussigné certifie que…", templateType: "certificate" },
					{ text: "Le Consulat Général du Gabon accuse réception de…", templateType: "receipt" },
				],
				closingFormulas: [
					{
						text: "Je vous prie d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
						templateType: "letter",
					},
					{
						text: "En foi de quoi, le présent document est délivré pour servir et valoir ce que de droit.",
						templateType: "attestation",
					},
				],
				signatureFormulas: ["Fait à [Lieu], le [Date]."],
				personPronoun: "le_consulat",
				useFormalAddress: true,
				politenessLevel: "courtois",
				argumentationGuidelines: [
					"- Toujours citer la référence du dossier en tête de document.",
					"- Rester factuel : énoncer les faits avérés, éviter les suppositions.",
					"- Conclure par une formule de politesse adaptée au destinataire.",
				].join("\n"),
				vocabularyPreferences: [
					{ prefer: "usager", avoid: ["client", "consommateur"] },
					{ prefer: "représentation", avoid: ["bureau", "agence"] },
				],
				isGlobal: true,
				isActive: true,
				isDefault: true,
				version: 1,
				updatedAt: Date.now(),
			});
			seeded.voice = 1;
		}

		// ─── Migration `allowedOrgTypes` → `applicability` ───────────────
		const templates = await ctx.db
			.query("documentTemplates")
			.withIndex("by_global", (q) => q.eq("isGlobal", true).eq("isActive", true))
			.collect();
		for (const t of templates) {
			if (t.applicability !== undefined) continue; // déjà migré
			const hasLegacyRestriction =
				Array.isArray(t.allowedOrgTypes) && t.allowedOrgTypes.length > 0;
			await ctx.db.patch(t._id, {
				applicability: hasLegacyRestriction ? "specificOrgTypes" : "all",
				applicableOrgTypes: hasLegacyRestriction ? t.allowedOrgTypes : undefined,
			});
			seeded.templatesMigrated += 1;
		}

		return seeded;
	},
});

// ============================================================================
// Helpers locaux pour produire un document Tiptap minimal (évite une dépendance
// inter-packages depuis une migration qui tourne côté serveur).
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
