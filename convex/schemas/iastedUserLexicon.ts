/**
 * iastedUserLexicon — Expressions personnalisées apprises par l'utilisateur.
 *
 * Permet à un utilisateur d'enseigner à iAsted des expressions dans une langue
 * NON couverte par OpenAI (ex. Téké, Fang, Punu et autres langues gabonaises).
 *
 * Mécanique :
 *   - L'utilisateur saisit l'expression source (texte), une étiquette de langue
 *     libre ("Téké", "Fang") et la traduction française.
 *   - Le bloc est injecté dans le system prompt iAsted via
 *     `iastedRealtimePrompt.buildPrompt`.
 *   - Le modèle reconnaît l'expression quand elle apparaît en TEXTE (iChat).
 *   - En vocal, Whisper ne transcrit pas correctement ces langues — l'usage
 *     reste donc textuel, OU l'utilisateur tape l'expression et iAsted répond
 *     vocalement (la prononciation par TTS est approximative).
 *
 * Cardinalité : N entrées par utilisateur, pas de doublons stricts côté serveur
 * (l'UI gère la déduplication par couple expression+language).
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

export const iastedUserLexiconTable = defineTable({
	userId: v.id("users"),
	/** Expression source telle que l'utilisateur l'écrit. Ex : "Mbote". */
	expression: v.string(),
	/** Étiquette de langue libre. Ex : "Téké", "Fang", "Punu". */
	language: v.string(),
	/** Traduction française canonique. Ex : "Bonjour". */
	frenchTranslation: v.string(),
	/** Contexte d'usage optionnel. Ex : "salutation matinale". */
	usage: v.optional(v.string()),
	createdAt: v.number(),
})
	.index("by_user", ["userId"])
	.index("by_user_language", ["userId", "language"]);
