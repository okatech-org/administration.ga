import { defineTable } from "convex/server";
import { v } from "convex/values";
import { localizedStringValidator } from "../lib/validators";

/**
 * Brique 3 — Style rédactionnel / argumentaire.
 *
 * MÉTIER IA UNIQUEMENT — n'est PAS rendu dans le PDF/HTML final.
 *
 * Cette brique guide la génération et la régénération de contenu par l'IA
 * (`templateAI.generateFromDocument`). Elle encode :
 *   - le ton et le registre (formel, neutre, solennel...)
 *   - les formules types d'ouverture et de clôture
 *   - les règles linguistiques (personne, vouvoiement, politesse)
 *   - les directives d'argumentaire propres au rédacteur / à l'institution
 *   - les préférences lexicales (à éviter / à préférer)
 *
 * Le Tiptap JSON du template reste la source de vérité du texte final ; ce
 * bloc n'est qu'un « prompt système » stocké et versionné.
 */
export const templateVoiceBlocksTable = defineTable({
	// Identité
	name: localizedStringValidator,
	description: v.optional(localizedStringValidator),

	// ─── Ton & registre ──────────────────────────────────────────────────
	// Libellé libre décrivant le ton (affiché dans l'UI et injecté dans le
	// prompt IA). Ex. « Formel et institutionnel », « Cordial mais sobre ».
	tone: v.string(),
	register: v.union(
		v.literal("administratif"),
		v.literal("juridique"),
		v.literal("commercial"),
		v.literal("diplomatique"),
		v.literal("neutre"),
	),

	// ─── Formules types ──────────────────────────────────────────────────
	// Chaque formule peut être restreinte à certains `templateType` ou rester
	// générique (`templateType` absent).
	openingFormulas: v.optional(
		v.array(
			v.object({
				text: v.string(),
				templateType: v.optional(
					v.union(
						v.literal("certificate"),
						v.literal("attestation"),
						v.literal("receipt"),
						v.literal("letter"),
						v.literal("custom"),
					),
				),
			}),
		),
	),
	closingFormulas: v.optional(
		v.array(
			v.object({
				text: v.string(),
				templateType: v.optional(
					v.union(
						v.literal("certificate"),
						v.literal("attestation"),
						v.literal("receipt"),
						v.literal("letter"),
						v.literal("custom"),
					),
				),
			}),
		),
	),
	signatureFormulas: v.optional(v.array(v.string())),

	// ─── Règles linguistiques ────────────────────────────────────────────
	personPronoun: v.union(
		v.literal("je"),
		v.literal("nous"),
		v.literal("le_consulat"),
		v.literal("impersonnel"),
	),
	useFormalAddress: v.optional(v.boolean()), // vouvoiement
	politenessLevel: v.union(
		v.literal("neutre"),
		v.literal("courtois"),
		v.literal("solennel"),
	),

	// ─── Argumentaire ────────────────────────────────────────────────────
	// Directive libre injectée dans le prompt IA (Markdown toléré).
	argumentationGuidelines: v.optional(v.string()),

	// Préférences lexicales : couples « préférer X, éviter Y, Z ».
	vocabularyPreferences: v.optional(
		v.array(
			v.object({
				prefer: v.string(),
				avoid: v.optional(v.array(v.string())),
			}),
		),
	),

	// ─── Ownership / scope ───────────────────────────────────────────────
	orgId: v.optional(v.id("orgs")),
	createdBy: v.optional(v.id("users")),
	isGlobal: v.boolean(),
	isActive: v.boolean(),
	isDefault: v.optional(v.boolean()),

	version: v.optional(v.number()),
	updatedAt: v.optional(v.number()),
})
	.index("by_org", ["orgId", "isActive"])
	.index("by_global", ["isGlobal", "isActive"])
	.index("by_default", ["isDefault", "isActive"]);
