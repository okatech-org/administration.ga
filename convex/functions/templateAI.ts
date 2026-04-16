/**
 * AI-powered template generation.
 *
 * Action `generateFromDocument` accepts a source document (uploaded PDF/image)
 * and/or a free-form prompt, asks Gemini to produce a Tiptap JSON document
 * that fits our shared schema, validates the result with Zod, and returns
 * `{ document, placeholders, suggestedName?, suggestedDescription? }` ready
 * to be applied via `editor.commands.setContent`.
 *
 * Gated by the `documents.ai_generation` task code. The action does identity
 * verification + delegates the permission check to a dedicated
 * `internalQuery` (`checkAiPermission`) since `authAction` does not expose
 * `ctx.db` / membership lookup directly.
 */

import { v } from "convex/values";
import { z } from "zod";
import type { Doc } from "../_generated/dataModel";
import { authAction } from "../lib/customFunctions";
import { extractJSON, multimodalGenerate } from "../lib/ai/gemini";
import { error, ErrorCode } from "../lib/errors";
import { internal } from "../_generated/api";
import { internalQuery } from "../_generated/server";
import { canDoTask } from "../lib/permissions";
import { TaskCode } from "../lib/taskCodes";

// ─── Allowed Tiptap output schema (whitelist) ────────────────────────────
//
// Gemini will hallucinate node types (`section`, `image-block`, etc.) unless
// we both (a) describe the schema in the prompt and (b) validate the response.
// The Zod tree below is the SOURCE OF TRUTH that gates what's accepted; the
// prompt embeds the same list as a string.

const PlaceholderSourceSchema = z.enum([
	"user",
	"profile",
	"request",
	"formData",
	"org",
	"system",
]);

type TiptapNodeAst = {
	type: string;
	attrs?: Record<string, unknown>;
	content?: TiptapNodeAst[];
	marks?: { type: string; attrs?: Record<string, unknown> }[];
	text?: string;
};
const MarkSchema = z.object({
	type: z.enum(["bold", "italic", "underline", "strike", "textStyle"]),
	attrs: z.record(z.unknown()).optional(),
});
const TiptapNodeSchema: z.ZodType<TiptapNodeAst> = z.lazy(() =>
	z.object({
		type: z.enum([
			"doc",
			"paragraph",
			"heading",
			"bulletList",
			"orderedList",
			"listItem",
			"blockquote",
			"horizontalRule",
			"hardBreak",
			"table",
			"tableRow",
			"tableCell",
			"tableHeader",
			"image",
			"imagePlaceholder",
			"signaturePlaceholder",
			"placeholder",
			"text",
		]),
		attrs: z.record(z.unknown()).optional(),
		content: z.array(TiptapNodeSchema).optional(),
		marks: z.array(MarkSchema).optional(),
		text: z.string().optional(),
	}),
);

const TiptapDocumentSchema = TiptapNodeSchema.refine(
	(doc): doc is TiptapNodeAst & { type: "doc" } => doc.type === "doc",
	{ message: "Document root must be of type 'doc'" },
);

const PlaceholderDescriptorSchema = z.object({
	key: z.string().min(1),
	label: z.record(z.string()).default({ fr: "" }),
	source: PlaceholderSourceSchema,
	path: z.string().optional(),
});

const ResponseSchema = z.object({
	document: TiptapDocumentSchema,
	placeholders: z.array(PlaceholderDescriptorSchema).default([]),
	suggestedName: z.string().optional(),
	suggestedDescription: z.string().optional(),
});

// ─── Permission gate ────────────────────────────────────────────────────

/**
 * Verifies the calling identity has `documents.ai_generation`. Either:
 *  - super-admin → always allowed
 *  - org context provided → membership in that org with the task
 *  - no org context → at least one membership grants the task
 *
 * Returns `true` on success, throws on failure (so the action can call this
 * inline with `await ctx.runQuery(...)` and treat any return as approved).
 */
export const checkAiPermission = internalQuery({
	args: { orgId: v.optional(v.id("orgs")) },
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw error(ErrorCode.NOT_AUTHENTICATED, "Authentification requise");
		}
		const user = await ctx.db
			.query("users")
			.withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
			.first();
		if (!user) {
			throw error(ErrorCode.USER_NOT_FOUND, "Utilisateur inconnu");
		}

		// Find the membership to gate against. With orgId → exact lookup;
		// without → scan all memberships and accept the first that grants the
		// task (super-admin short-circuits inside `canDoTask`).
		let membership: Doc<"memberships"> | null = null;
		if (args.orgId) {
			const orgId = args.orgId;
			membership = await ctx.db
				.query("memberships")
				.withIndex("by_user_org", (q) =>
					q.eq("userId", user._id).eq("orgId", orgId),
				)
				.first();
		} else {
			// Use by_user_org index with the prefix (userId only) to scan.
			const memberships = await ctx.db
				.query("memberships")
				.withIndex("by_user_org", (q) => q.eq("userId", user._id))
				.collect();
			for (const m of memberships) {
				const allowed = await canDoTask(
					ctx,
					user,
					m,
					TaskCode.documents.ai_generation,
				);
				if (allowed) {
					return { ok: true as const };
				}
			}
		}

		const allowed = await canDoTask(
			ctx,
			user,
			membership,
			TaskCode.documents.ai_generation,
		);
		if (!allowed) {
			throw error(
				ErrorCode.INSUFFICIENT_PERMISSIONS,
				"Permission requise : documents.ai_generation",
			);
		}
		return { ok: true as const };
	},
});

// ─── Prompt template ─────────────────────────────────────────────────────

function buildPrompt(args: {
	templateType?: string;
	paperSize?: string;
	language?: string;
	prompt?: string;
}): string {
	const lang = args.language === "en" ? "anglais" : "français";
	const tplHint = args.templateType
		? `Type de modèle attendu : ${args.templateType}.`
		: "";
	const sizeHint = args.paperSize ? `Format papier : ${args.paperSize}.` : "";
	const userInstruction = args.prompt
		? `\n\nInstructions complémentaires de l'utilisateur :\n${args.prompt}`
		: "";

	return `Tu es un assistant expert en rédaction de documents administratifs et diplomatiques. Tu reçois un document existant (uploadé en PDF ou image) ou une description, et tu dois produire un MODÈLE Tiptap JSON réutilisable, en ${lang}, fidèle à la structure du document source.

${tplHint} ${sizeHint}${userInstruction}

CONTRAINTES STRICTES :

1. Tu retournes UNIQUEMENT un objet JSON valide, sans aucun texte avant ou après. Pas de markdown, pas d'explication.

2. La forme exacte attendue :
{
  "document": { "type": "doc", "content": [...] },
  "placeholders": [{ "key": "string", "label": { "fr": "string" }, "source": "user"|"profile"|"request"|"formData"|"org"|"system", "path": "string?" }],
  "suggestedName": "string optional",
  "suggestedDescription": "string optional"
}

3. Le champ "document" suit la spec Tiptap. Tu n'utilises QUE ces types de nodes (toute autre valeur invalide tout le résultat) :
   - "doc" (racine)
   - "paragraph", "heading" (avec attrs.level: 1, 2 ou 3)
   - "bulletList", "orderedList", "listItem"
   - "blockquote", "horizontalRule", "hardBreak"
   - "table", "tableRow", "tableCell", "tableHeader"
   - "image" (avec attrs.src) — seulement si tu as une URL image, sinon utilise "imagePlaceholder"
   - "imagePlaceholder" (avec attrs.id, attrs.key, attrs.source, attrs.label, attrs.width, attrs.height)
   - "signaturePlaceholder" (avec attrs.id, attrs.signerRole?)
   - "placeholder" (avec attrs.key, attrs.source, attrs.label) — pour les variables texte (prénom, etc.)
   - "text" (avec text: "...")

4. Les marks autorisés sur les nodes "text" : "bold", "italic", "underline", "strike", "textStyle" (avec attrs.color | attrs.fontSize | attrs.fontFamily).

5. Quand tu détectes une zone variable (nom du citoyen, date, référence, etc.), insère un node "placeholder" avec une "key" en snake_case français descriptif (ex: "nom_demandeur"). Décris-le AUSSI dans le tableau "placeholders" en haut.

6. Quand tu détectes une zone d'image (logo, photo), utilise "imagePlaceholder" avec un id UUID unique (ex: "img-${"".concat(Math.random().toString(36).slice(2))}").

7. Quand tu détectes une zone de signature, utilise "signaturePlaceholder" avec un id UUID unique et un signerRole si précisé (ex: "chef_poste").

8. Si tu hésites sur un type de node, utilise "paragraph" — JAMAIS un type non listé.

9. Le JSON doit être complet et valide à la lettre — pas de trailing commas, pas de commentaires.`;
}

// ─── Action ──────────────────────────────────────────────────────────────

export const generateFromDocument = authAction({
	args: {
		fileUrl: v.optional(v.string()),
		fileMimeType: v.optional(v.string()),
		prompt: v.optional(v.string()),
		templateType: v.optional(
			v.union(
				v.literal("certificate"),
				v.literal("attestation"),
				v.literal("receipt"),
				v.literal("letter"),
				v.literal("custom"),
			),
		),
		paperSize: v.optional(v.union(v.literal("A4"), v.literal("LETTER"))),
		language: v.optional(v.union(v.literal("fr"), v.literal("en"))),
		orgId: v.optional(v.id("orgs")),
	},
	handler: async (ctx, args) => {
		// Permission gate via internal query (authAction has no ctx.db).
		await ctx.runQuery(internal.functions.templateAI.checkAiPermission, {
			orgId: args.orgId,
		});

		if (!args.fileUrl && !args.prompt) {
			throw error(
				ErrorCode.VALIDATION_ERROR,
				"Fournis soit un fichier (fileUrl) soit une description (prompt).",
			);
		}

		const prompt = buildPrompt({
			templateType: args.templateType,
			paperSize: args.paperSize,
			language: args.language,
			prompt: args.prompt,
		});

		// Single-shot generation. Gemini occasionally returns prose around the
		// JSON — `extractJSON` tolerates that.
		const responseText = await multimodalGenerate({
			prompt,
			fileUrl: args.fileUrl,
			fileMimeType: args.fileMimeType,
		});

		let parsedRaw: unknown;
		try {
			parsedRaw = extractJSON(responseText);
		} catch (err) {
			throw error(
				ErrorCode.VALIDATION_ERROR,
				`Réponse IA invalide (JSON introuvable) : ${(err as Error).message}`,
			);
		}

		const validation = ResponseSchema.safeParse(parsedRaw);
		if (!validation.success) {
			console.error(
				"[templateAI] response validation failed",
				validation.error.format(),
			);
			throw error(
				ErrorCode.VALIDATION_ERROR,
				"Le modèle généré ne respecte pas la structure attendue.",
			);
		}

		return validation.data;
	},
});
