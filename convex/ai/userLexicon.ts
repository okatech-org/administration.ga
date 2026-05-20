/**
 * userLexicon — CRUD du lexique personnel iAsted.
 *
 * Permet à un utilisateur d'enseigner à iAsted des expressions dans une langue
 * non couverte par OpenAI Realtime (Téké, Fang, Punu, etc.). Les entrées sont
 * injectées dans le system prompt par `iastedRealtimePrompt.buildPrompt` sous
 * forme d'un bloc « # LEXIQUE PERSONNEL ».
 *
 * Convention : pas de validation linguistique côté serveur (étiquette de
 * langue libre). La déduplication par (expression, language) est gérée côté
 * UI ; côté serveur, deux entrées identiques sont tolérées (et toutes deux
 * injectées dans le prompt — sans conséquence fonctionnelle).
 *
 * Limite : 50 entrées maximum par utilisateur pour borner la taille du prompt.
 */

import { ConvexError, v } from "convex/values";
import { internalQuery, mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

const MAX_ENTRIES_PER_USER = 50;
const MAX_FIELD_LENGTH = 200;

// Convex masque les `Error` standards en « Server Error » côté client : on
// utilise systématiquement `ConvexError` pour que l'UI affiche le message
// précis (validation, quota, etc.) dans le toast.
function clampField(input: string, label: string): string {
	const trimmed = input.trim();
	if (!trimmed) {
		throw new ConvexError(`${label} : valeur vide non autorisée.`);
	}
	if (trimmed.length > MAX_FIELD_LENGTH) {
		throw new ConvexError(
			`${label} : longueur maximale dépassée (${MAX_FIELD_LENGTH} caractères).`,
		);
	}
	return trimmed;
}

// ─────────────────────────────────────────────────────────────
// Lecture publique
// ─────────────────────────────────────────────────────────────

export const listMyLexicon = query({
	args: {},
	handler: async (ctx) => {
		const user = await requireAuth(ctx);
		const rows = await ctx.db
			.query("iastedUserLexicon")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		return rows.sort((a, b) => b.createdAt - a.createdAt);
	},
});

// ─────────────────────────────────────────────────────────────
// Création
// ─────────────────────────────────────────────────────────────

export const addPhrase = mutation({
	args: {
		expression: v.string(),
		language: v.string(),
		frenchTranslation: v.string(),
		usage: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		console.log("[userLexicon.addPhrase] handler entry", {
			argsKeys: Object.keys(args),
			expressionLen: args.expression?.length,
			languageLen: args.language?.length,
			frenchLen: args.frenchTranslation?.length,
			hasUsage: typeof args.usage === "string" && args.usage.length > 0,
		});

		const user = await requireAuth(ctx);
		console.log("[userLexicon.addPhrase] requireAuth OK", { userId: user._id });

		const expression = clampField(args.expression, "Expression");
		const language = clampField(args.language, "Langue");
		const frenchTranslation = clampField(args.frenchTranslation, "Traduction");
		const usage = args.usage?.trim()
			? clampField(args.usage, "Contexte")
			: undefined;

		// Garde-fou taille — évite l'inflation incontrôlée du system prompt.
		const existing = await ctx.db
			.query("iastedUserLexicon")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();
		console.log("[userLexicon.addPhrase] existing count", existing.length);
		if (existing.length >= MAX_ENTRIES_PER_USER) {
			throw new ConvexError(
				`Limite atteinte : ${MAX_ENTRIES_PER_USER} expressions maximum. Supprimez-en avant d'en ajouter de nouvelles.`,
			);
		}

		// On omet entièrement `usage` quand il n'est pas défini pour éviter toute
		// ambiguïté de validation des champs optionnels côté Convex.
		const insertDoc: {
			userId: typeof user._id;
			expression: string;
			language: string;
			frenchTranslation: string;
			createdAt: number;
			usage?: string;
		} = {
			userId: user._id,
			expression,
			language,
			frenchTranslation,
			createdAt: Date.now(),
		};
		if (usage) insertDoc.usage = usage;

		const newId = await ctx.db.insert("iastedUserLexicon", insertDoc);
		console.log("[userLexicon.addPhrase] insert OK", { newId });
		return newId;
	},
});

// ─────────────────────────────────────────────────────────────
// Suppression
// ─────────────────────────────────────────────────────────────

export const deletePhrase = mutation({
	args: { id: v.id("iastedUserLexicon") },
	handler: async (ctx, { id }) => {
		const user = await requireAuth(ctx);
		const row = await ctx.db.get(id);
		if (!row) {
			throw new ConvexError("Expression introuvable.");
		}
		if (row.userId !== user._id) {
			throw new ConvexError(
				"Vous ne pouvez supprimer que vos propres expressions.",
			);
		}
		await ctx.db.delete(id);
	},
});

// ─────────────────────────────────────────────────────────────
// Internal — lecture pour le prompt builder
// ─────────────────────────────────────────────────────────────

export const getLexiconForUser = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }) => {
		const rows = await ctx.db
			.query("iastedUserLexicon")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.collect();
		return rows;
	},
});
